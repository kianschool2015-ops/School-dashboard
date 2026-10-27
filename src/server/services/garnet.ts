import "server-only";
import { db, ensureDatabaseBootstrap } from "../db";
import { users, studentProfiles, entitledCourses, ssoApiSettings, triageCases, auditLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import type { EntitledCourseRecord, SsoApiSettingsRecord } from "@/types/models";
import { jwtVerify, SignJWT } from "jose";
import { revokeAllUserSessions } from "../auth/jwt";

export interface GarnetUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId?: string;
  email?: string;
  username?: string;
}

export interface GarnetEnrolledCourse {
  code: string;
  title: string;
  enrollmentDate?: string;
  status?: string;
}

export interface GarnetVerificationResult {
  success: boolean;
  user?: GarnetUser;
  courses: GarnetEnrolledCourse[];
  token?: string;
  message?: string;
  latencyMs?: number;
  rawResponse?: unknown;
}

export const DEFAULT_SSO_API_SETTINGS: SsoApiSettingsRecord = {
  id: "default",
  isEnabled: true,
  serviceTitle: "حساب کاربری مشاهیر دانش",
  baseUrl: "https://mashahiredanesh.com/GarnetAPI",
  loginEndpoint: "/auth/loginMobile",
  coursesEndpoint: "/user/courses",
  sendOtpEndpoint: "/users/sendVerificationCodeByMobile",
  verifyOtpEndpoint: "/users/checkVerificationCode",
  productsEndpoint: "/invoices/productListByUser",
  codeCount: 5,
  apiKeyHeader: "g-api-key",
  apiKeyValue: process.env.GARNET_API_KEY || "AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5",
  mobileFieldName: "mobile",
  passwordFieldName: "password",
  successStatusCode: 2000,
  timeoutMs: 8000,
  autoCreateStudent: true,
  bypassCourseCheckIfNoEndpoint: true,
  updatedAt: new Date(),
};

/**
 * Automatically upgrade any http:// URL to https:// to prevent cleartext leakage or TLS drops
 */
export function ensureHttps(url: string): string {
  if (!url) return "";
  return url.trim().replace(/^http:\/\//i, "https://");
}

/**
 * Standardize Iranian mobile numbers:
 * Converts Persian/Arabic digits, trims, and normalizes 10-digit numbers starting with 9 (e.g. 9123445103 -> 09123445103)
 */
export function normalizeIranianMobile(input: string): string {
  if (!input) return "";
  // Convert Persian and Arabic digits to English
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let clean = input.trim();
  for (let i = 0; i < 10; i++) {
    clean = clean.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  // Strip non-digit characters
  clean = clean.replace(/\D/g, "");

  if (clean.length === 10 && clean.startsWith("9")) {
    return `0${clean}`;
  }
  if (clean.length === 12 && clean.startsWith("989")) {
    return `0${clean.slice(2)}`;
  }
  if (clean.length === 14 && clean.startsWith("00989")) {
    return `0${clean.slice(4)}`;
  }
  return clean;
}

/**
 * Retrieve active SSO configuration from PostgreSQL with robust fallback to default production settings
 */
export async function getActiveSsoApiSettings(): Promise<SsoApiSettingsRecord> {
  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const [row] = await db
      .select()
      .from(ssoApiSettings)
      .where(eq(ssoApiSettings.id, "default"))
      .limit(1);

    if (row) {
      return {
        id: row.id,
        isEnabled: row.isEnabled,
        serviceTitle: row.serviceTitle,
        baseUrl: row.baseUrl,
        loginEndpoint: row.loginEndpoint,
        coursesEndpoint: row.coursesEndpoint,
        sendOtpEndpoint: row.sendOtpEndpoint || "/users/sendVerificationCodeByMobile",
        verifyOtpEndpoint: row.verifyOtpEndpoint || "/users/checkVerificationCode",
        productsEndpoint: row.productsEndpoint || "/invoices/productListByUser",
        codeCount: row.codeCount ?? 5,
        apiKeyHeader: row.apiKeyHeader,
        apiKeyValue: row.apiKeyValue,
        mobileFieldName: row.mobileFieldName,
        passwordFieldName: row.passwordFieldName,
        successStatusCode: row.successStatusCode,
        timeoutMs: row.timeoutMs,
        autoCreateStudent: row.autoCreateStudent,
        bypassCourseCheckIfNoEndpoint: row.bypassCourseCheckIfNoEndpoint,
        updatedAt: row.updatedAt,
      };
    }
  } catch (err) {
    console.warn("[SSO Settings] Failed to load from DB, using defaults:", err);
  }
  return DEFAULT_SSO_API_SETTINGS;
}

/**
 * Get effective SSO settings with optional overrides (used for runtime testing)
 */
export async function getEffectiveSsoSettings(
  overrides?: Partial<SsoApiSettingsRecord>
): Promise<SsoApiSettingsRecord> {
  const base = await getActiveSsoApiSettings();
  if (!overrides) return base;
  return { ...base, ...overrides };
}

function getGarnetSecretKey(): Uint8Array {
  const secret = process.env.GARNET_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: GARNET_JWT_SECRET or JWT_SECRET is required in production (C-06)");
    }
    return new TextEncoder().encode("garnet_shared_sso_secret_key_at_least_32_bytes_mashahir_2026");
  }
  return new TextEncoder().encode(secret.trim());
}

/**
 * Cryptographic JWT signature verification for Central SSO / Garnet LMS tokens
 */
export async function verifyGarnetToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const secretKey = getGarnetSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload as Record<string, unknown>;
  } catch (err) {
    console.warn("[SSO] JWT cryptographic signature verification failed:", err);
    return null;
  }
}

/**
 * Core Dynamic Runtime SSO Service:
 * Authenticates against Mashahir Danesh Central Account Web Service using live database settings
 */
export async function authenticateWithCentralMashahirSso(
  identifier: string,
  pass: string,
  overrideConfig?: Partial<SsoApiSettingsRecord>
): Promise<GarnetVerificationResult> {
  const dbConfig = await getActiveSsoApiSettings();
  const config: SsoApiSettingsRecord = { ...dbConfig, ...overrideConfig };

  if (!config.isEnabled) {
    return {
      success: false,
      courses: [],
      message: `وب‌سرویس ${config.serviceTitle} در حال حاضر توسط مدیر سامانه غیرفعال شده است.`,
    };
  }

  const normalizedPhone = normalizeIranianMobile(identifier);
  const baseUrl = ensureHttps(config.baseUrl.replace(/\/+$/, ""));
  const loginPath = config.loginEndpoint.replace(/^\/+/, "");
  const loginUrl = `${baseUrl}/${loginPath}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "MashahirSupportPortal/1.0",
  };
  if (config.apiKeyHeader && config.apiKeyValue) {
    headers[config.apiKeyHeader] = config.apiKeyValue;
  }

  const payload = {
    [config.mobileFieldName || "mobile"]: normalizedPhone || identifier.trim(),
    [config.passwordFieldName || "password"]: pass,
  };

  const startTime = Date.now();

  try {
    const timeoutDuration = process.env.NODE_ENV === "test" ? 300 : (config.timeoutMs || 8000);
    const response = await fetch(loginUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutDuration),
    });

    const latencyMs = Date.now() - startTime;
    let resData: Record<string, any> = {};

    try {
      resData = await response.json();
    } catch {
      return {
        success: false,
        courses: [],
        latencyMs,
        message: `پاسخ وب‌سرویس مرکزی مشاهیر دانش با قالب JSON معتبر دریافت نشد (کد وضعیت HTTP: ${response.status}).`,
      };
    }

    const resCode = resData.code ?? resData.status ?? resData.statusCode;
    const isSuccess = Number(resCode) === Number(config.successStatusCode);

    if (!isSuccess) {
      const errMsg =
        resData.message ||
        resData.msg ||
        resData.error ||
        `شناسه یا کلمه عبور در ${config.serviceTitle} نادرست است (کد خطا: ${resCode}).`;
      return {
        success: false,
        courses: [],
        latencyMs,
        rawResponse: resData,
        message: errMsg,
      };
    }

    // Extract user profile and token
    const token =
      resData.token ||
      resData.jwt ||
      resData.accessToken ||
      resData.data?.token ||
      resData.data?.jwt ||
      "";

    const userInfo =
      resData.userInfo ||
      resData.user ||
      resData.data?.userInfo ||
      resData.data?.user ||
      resData.data ||
      {};

    const rawMobile =
      userInfo.mobile ||
      userInfo.phone ||
      userInfo.phoneNumber ||
      userInfo.cellphone ||
      normalizedPhone;
    const cleanMobile = normalizeIranianMobile(String(rawMobile));

    const firstName = userInfo.first_name || userInfo.firstName || "";
    const lastName = userInfo.last_name || userInfo.lastName || "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") ||
      userInfo.fullName ||
      userInfo.name ||
      userInfo.display_name ||
      "داوطلب مشاهیر دانش";

    const nationalId =
      userInfo.national_code ||
      userInfo.nationalCode ||
      userInfo.national_id ||
      userInfo.nationalId ||
      undefined;

    const email = userInfo.email || undefined;
    const userId = String(userInfo.id || userInfo.userId || cleanMobile);

    const user: GarnetUser = {
      id: userId,
      fullName,
      phoneNumber: cleanMobile,
      nationalId,
      email,
      username: userInfo.username || cleanMobile,
    };

    // Extract or fetch enrolled courses
    let coursesList: GarnetEnrolledCourse[] = [];

    // Check if courses were directly included in the login response
    const rawCourses =
      resData.courses ||
      userInfo.courses ||
      resData.data?.courses ||
      userInfo.enrolled_courses;

    if (Array.isArray(rawCourses)) {
      coursesList = rawCourses.map((c: any) => ({
        code: typeof c === "string" ? c : c.code || c.course_code || String(c.id),
        title: typeof c === "string" ? `دوره ${c}` : c.title || c.course_name || c.name || `دوره ${c.code}`,
      }));
    }

    // If coursesEndpoint is specified and no courses yet, attempt to query courses endpoint
    if (coursesList.length === 0 && config.coursesEndpoint && token) {
      try {
        const coursesPath = config.coursesEndpoint.replace(/^\/+/, "");
        const coursesUrl = `${baseUrl}/${coursesPath}`;
        const coursesRes = await fetch(coursesUrl, {
          method: "GET",
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(
            process.env.NODE_ENV === "test" ? 300 : Math.min(config.timeoutMs || 8000, 5000)
          ),
        });

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          const items =
            coursesData.courses ||
            coursesData.data ||
            coursesData.user_courses ||
            [];
          if (Array.isArray(items)) {
            coursesList = items.map((c: any) => ({
              code: typeof c === "string" ? c : c.code || c.course_code || String(c.id),
              title: typeof c === "string" ? `دوره ${c}` : c.title || c.course_name || c.name || `دوره ${c.code}`,
            }));
          }
        }
      } catch (courseErr) {
        console.warn("[SSO] Course endpoint query non-critical error:", courseErr);
      }
    }

    // If courses list is empty, attempt querying Stage 3 products endpoint
    if (coursesList.length === 0 && config.productsEndpoint) {
      try {
        const productsRes = await fetchCentralUserProducts(user, token, config);
        if (productsRes.success && productsRes.courses.length > 0) {
          coursesList = productsRes.courses;
        }
      } catch (prodErr) {
        console.warn("[SSO] Product list query non-critical error:", prodErr);
      }
    }

    // If courses list is still empty and bypass is allowed, assign default supported course codes
    if (coursesList.length === 0 && config.bypassCourseCheckIfNoEndpoint) {
      coursesList = [
        { code: "MASHAHIR-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" },
        { code: "GARNET-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" },
      ];
    }

    return {
      success: true,
      user,
      token,
      courses: coursesList,
      latencyMs,
      rawResponse: resData,
      message: `احراز هویت موفق در ${config.serviceTitle}.`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[SSO] HTTP request to ${loginUrl} failed (${latencyMs}ms):`, err?.message || err);

    // Fallback in non-production environments when mock is enabled
    const isMockAllowed =
      process.env.NODE_ENV !== "production" && process.env.ENABLE_GARNET_MOCK === "true";

    if (isMockAllowed && identifier.trim().length >= 4 && pass.trim().length >= 4) {
      const secretKey = getGarnetSecretKey();
      const normPhone = normalizeIranianMobile(identifier) || "09123445103";
      const token = await new SignJWT({
        sub: `sso_usr_${Date.now()}`,
        name: "داوطلب آزمون وکالت مشاهیر دانش",
        phone: normPhone,
        username: identifier,
        courses: ["MASHAHIR-BAR-360", "GARNET-BAR-360"],
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(secretKey);

      return {
        success: true,
        token,
        latencyMs,
        user: {
          id: `sso_usr_${Date.now()}`,
          fullName: "داوطلب آزمون وکالت مشاهیر دانش",
          phoneNumber: normPhone,
          username: identifier,
        },
        courses: [
          { code: "MASHAHIR-BAR-360", title: "دوره جامع طلایی مشاهیر دانش ۳۶۰" },
          { code: "GARNET-BAR-360", title: "دوره جامع طلایی مشاهیر دانش ۳۶۰" },
        ],
        message: "ورود از طریق شبیه‌ساز امن توسعه با موفقیت انجام شد.",
      };
    }

    return {
      success: false,
      courses: [],
      latencyMs,
      message: `امکان برقراری ارتباط با وب‌سرویس ${config.serviceTitle} وجود ندارد. لطفا اتصال اینترنت یا آدرس سرور را بررسی فرمایید.`,
    };
  }
}

/**
 * Stage 1: Send SMS Verification Code via Central SSO Web Service
 * Endpoint: POST /users/sendVerificationCodeByMobile
 * Body: { mobile, Target, CodeCount }
 */
export async function sendCentralSsoOtp(
  rawMobile: string,
  overrideConfig?: Partial<SsoApiSettingsRecord>
): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  rawResponse?: unknown;
}> {
  const dbConfig = await getActiveSsoApiSettings();
  const config: SsoApiSettingsRecord = { ...dbConfig, ...overrideConfig };

  if (!config.isEnabled) {
    return {
      success: false,
      message: `وب‌سرویس ${config.serviceTitle} در حال حاضر غیرفعال است.`,
    };
  }

  const normalizedMobile = normalizeIranianMobile(rawMobile);
  if (!normalizedMobile) {
    return {
      success: false,
      message: "شماره موبایل وارد شده نامعتبر است.",
    };
  }

  const baseUrl = ensureHttps(config.baseUrl.replace(/\/+$/, ""));
  const endpoint = (config.sendOtpEndpoint || "/users/sendVerificationCodeByMobile").replace(/^\/+/, "");
  const url = `${baseUrl}/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "MashahirSupportPortal/1.0",
  };
  if (config.apiKeyHeader && config.apiKeyValue) {
    headers[config.apiKeyHeader] = config.apiKeyValue;
  }

  const payload = {
    mobile: normalizedMobile,
    Target: normalizedMobile,
    CodeCount: config.codeCount || 5,
  };

  const startTime = Date.now();
  try {
    const timeoutDuration = process.env.NODE_ENV === "test" ? 300 : (config.timeoutMs || 8000);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutDuration),
    });

    const latencyMs = Date.now() - startTime;
    let resData: Record<string, any> = {};
    try {
      resData = await response.json();
    } catch {
      return {
        success: false,
        latencyMs,
        message: `پاسخ وب‌سرویس ارسال پیامک در قالب JSON معتبر نیست (کد وضعیت: ${response.status}).`,
      };
    }

    const resCode = resData.code ?? resData.status ?? resData.statusCode;
    const isSuccess = Number(resCode) === Number(config.successStatusCode);

    if (isSuccess) {
      return {
        success: true,
        latencyMs,
        rawResponse: resData,
        message: resData.message || resData.msg || "کد تایید پیامکی با موفقیت ارسال شد.",
      };
    }

    return {
      success: false,
      latencyMs,
      rawResponse: resData,
      message: resData.message || resData.msg || `خطا در ارسال پیامک کد تایید (کد وضعیت: ${resCode}).`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[SSO OTP Send] Request to ${url} failed (${latencyMs}ms):`, err?.message || err);

    if (process.env.NODE_ENV !== "production" && process.env.ENABLE_GARNET_MOCK === "true") {
      return {
        success: true,
        latencyMs,
        message: "کد تایید پیامکی ارسال گردید (حالت شبیه‌ساز امن توسعه).",
      };
    }

    return {
      success: false,
      latencyMs,
      message: `امکان ارتباط با وب‌سرویس ارسال کد تایید وجود ندارد (${err?.message || "خطای ارتباط با سرور"}).`,
    };
  }
}

/**
 * Stage 2: Check SMS Verification Code via Central SSO Web Service
 * Endpoint: POST /users/checkVerificationCode
 * Body: { Target, Code, mobile, code }
 */
export async function verifyCentralSsoOtp(
  rawMobile: string,
  rawCode: string,
  overrideConfig?: Partial<SsoApiSettingsRecord>
): Promise<GarnetVerificationResult> {
  const dbConfig = await getActiveSsoApiSettings();
  const config: SsoApiSettingsRecord = { ...dbConfig, ...overrideConfig };

  if (!config.isEnabled) {
    return {
      success: false,
      courses: [],
      message: `وب‌سرویس ${config.serviceTitle} در حال حاضر غیرفعال است.`,
    };
  }

  const normalizedMobile = normalizeIranianMobile(rawMobile);
  const cleanCode = rawCode.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).trim();

  if (!normalizedMobile || !cleanCode) {
    return {
      success: false,
      courses: [],
      message: "شماره موبایل و کد تایید الزامی است.",
    };
  }

  const baseUrl = ensureHttps(config.baseUrl.replace(/\/+$/, ""));
  const endpoint = (config.verifyOtpEndpoint || "/users/checkVerificationCode").replace(/^\/+/, "");
  const url = `${baseUrl}/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "MashahirSupportPortal/1.0",
  };
  if (config.apiKeyHeader && config.apiKeyValue) {
    headers[config.apiKeyHeader] = config.apiKeyValue;
  }

  const payload = {
    Target: normalizedMobile,
    mobile: normalizedMobile,
    Code: cleanCode,
    code: cleanCode,
  };

  const startTime = Date.now();
  try {
    const timeoutDuration = process.env.NODE_ENV === "test" ? 300 : (config.timeoutMs || 8000);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutDuration),
    });

    const latencyMs = Date.now() - startTime;
    let resData: Record<string, any> = {};
    try {
      resData = await response.json();
    } catch {
      return {
        success: false,
        courses: [],
        latencyMs,
        message: `پاسخ وب‌سرویس اعتبارسنجی کد تایید در قالب JSON معتبر نیست (کد وضعیت: ${response.status}).`,
      };
    }

    const resCode = resData.code ?? resData.status ?? resData.statusCode;
    const isSuccess = Number(resCode) === Number(config.successStatusCode);

    if (!isSuccess) {
      return {
        success: false,
        courses: [],
        latencyMs,
        rawResponse: resData,
        message: resData.message || resData.msg || "کد تایید وارد شده نامعتبر است یا منقضی شده است.",
      };
    }

    // Extract user profile and token
    const token =
      resData.token ||
      resData.jwt ||
      resData.accessToken ||
      resData.data?.token ||
      resData.data?.jwt ||
      "";

    const userInfo =
      resData.userInfo ||
      resData.user ||
      resData.data?.userInfo ||
      resData.data?.user ||
      resData.data ||
      {};

    const firstName = userInfo.first_name || userInfo.firstName || "";
    const lastName = userInfo.last_name || userInfo.lastName || "";
    const fullName =
      [firstName, lastName].filter(Boolean).join(" ") ||
      userInfo.fullName ||
      userInfo.name ||
      userInfo.display_name ||
      "داوطلب مشاهیر دانش";

    const nationalId =
      userInfo.national_code ||
      userInfo.nationalCode ||
      userInfo.national_id ||
      userInfo.nationalId ||
      undefined;

    const email = userInfo.email || undefined;
    const userId = String(userInfo.id || userInfo.userId || normalizedMobile);

    const user: GarnetUser = {
      id: userId,
      fullName,
      phoneNumber: normalizedMobile,
      nationalId,
      email,
      username: userInfo.username || normalizedMobile,
    };

    return {
      success: true,
      user,
      token,
      courses: [],
      latencyMs,
      rawResponse: resData,
      message: resData.message || "کد تایید با موفقیت اعتبارسنجی شد.",
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[SSO OTP Verify] Request to ${url} failed (${latencyMs}ms):`, err?.message || err);

    if (process.env.NODE_ENV !== "production" && process.env.ENABLE_GARNET_MOCK === "true") {
      return {
        success: true,
        user: {
          id: `sso_otp_usr_${Date.now()}`,
          fullName: "داوطلب آزمایشی مشاهیر دانش",
          phoneNumber: normalizedMobile,
          username: normalizedMobile,
        },
        token: "mock_jwt_token_for_dev_stage",
        courses: [
          { code: "MASHAHIR-BAR-360", title: "دوره جامع طلایی مشاهیر دانش ۳۶۰" },
          { code: "GARNET-BAR-360", title: "دوره جامع طلایی مشاهیر دانش ۳۶۰" },
        ],
        latencyMs,
        message: "کد تایید با موفقیت تایید شد (حالت شبیه‌ساز امن توسعه).",
      };
    }

    return {
      success: false,
      courses: [],
      latencyMs,
      message: `امکان ارتباط با وب‌سرویس بررسی کد تایید وجود ندارد (${err?.message || "خطای ارتباط با سرور"}).`,
    };
  }
}

/**
 * Stage 3: Fetch Enrolled Products/Invoices via Central SSO Web Service
 * Endpoint: POST /invoices/productListByUser
 * Headers: g-api-key, Authorization: Bearer <token> (if available)
 * Body: { user_id, userId, mobile, Target }
 */
export async function fetchCentralUserProducts(
  userInfo: { id?: string | number; mobile?: string; userId?: string | number },
  token?: string,
  overrideConfig?: Partial<SsoApiSettingsRecord>
): Promise<{
  success: boolean;
  courses: GarnetEnrolledCourse[];
  latencyMs?: number;
  rawResponse?: unknown;
  message?: string;
}> {
  const dbConfig = await getActiveSsoApiSettings();
  const config: SsoApiSettingsRecord = { ...dbConfig, ...overrideConfig };

  const baseUrl = ensureHttps(config.baseUrl.replace(/\/+$/, ""));
  const endpoint = (config.productsEndpoint || "/invoices/productListByUser").replace(/^\/+/, "");
  const url = `${baseUrl}/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "MashahirSupportPortal/1.0",
  };
  if (config.apiKeyHeader && config.apiKeyValue) {
    headers[config.apiKeyHeader] = config.apiKeyValue;
  }
  if (token && token.trim()) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  const cleanMobile = normalizeIranianMobile(String(userInfo.mobile || ""));
  const uid = userInfo.id || userInfo.userId;

  const payload = {
    user_id: uid,
    userId: uid,
    mobile: cleanMobile,
    Target: cleanMobile,
  };

  const startTime = Date.now();
  try {
    const timeoutDuration = process.env.NODE_ENV === "test" ? 300 : (config.timeoutMs || 8000);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutDuration),
    });

    const latencyMs = Date.now() - startTime;
    let resData: any = null;
    try {
      resData = await response.json();
    } catch {
      return {
        success: false,
        courses: [],
        latencyMs,
        message: `پاسخ وب‌سرویس فهرست محصولات در قالب JSON معتبر نیست (کد وضعیت: ${response.status}).`,
      };
    }

    const rawItems = Array.isArray(resData)
      ? resData
      : Array.isArray(resData?.products)
      ? resData.products
      : Array.isArray(resData?.data?.products)
      ? resData.data.products
      : Array.isArray(resData?.data)
      ? resData.data
      : Array.isArray(resData?.list)
      ? resData.list
      : Array.isArray(resData?.invoices)
      ? resData.invoices
      : Array.isArray(resData?.courses)
      ? resData.courses
      : [];

    const courses: GarnetEnrolledCourse[] = rawItems.map((item: any) => {
      if (typeof item === "string" || typeof item === "number") {
        return {
          code: String(item),
          title: `دوره ${item}`,
        };
      }
      const code =
        item.course_code ||
        item.courseCode ||
        item.code ||
        item.product_id ||
        item.productId ||
        item.product_code ||
        String(item.id || "");
      const title =
        item.course_name ||
        item.courseName ||
        item.title ||
        item.name ||
        item.product_name ||
        item.productName ||
        `دوره ${code}`;
      return { code: String(code), title: String(title) };
    });

    // If courses list is empty and bypass is allowed, assign default supported course codes
    if (courses.length === 0 && config.bypassCourseCheckIfNoEndpoint) {
      courses.push(
        { code: "MASHAHIR-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" },
        { code: "GARNET-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" }
      );
    }

    return {
      success: true,
      courses,
      latencyMs,
      rawResponse: resData,
      message: `استعلام فهرست محصولات با موفقیت انجام شد (${courses.length} دوره/محصول یافت شد).`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.warn(`[SSO Products] Request to ${url} failed (${latencyMs}ms):`, err?.message || err);

    if (config.bypassCourseCheckIfNoEndpoint) {
      return {
        success: true,
        courses: [
          { code: "MASHAHIR-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" },
          { code: "GARNET-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" },
        ],
        latencyMs,
        message: "استعلام با خطای شبکه مواجه شد؛ طبق تنظیمات بای‌پاس دوره فعال منظور گردید.",
      };
    }

    return {
      success: false,
      courses: [],
      latencyMs,
      message: `امکان ارتباط با وب‌سرویس فهرست محصولات وجود ندارد (${err?.message || "خطای ارتباط با سرور"}).`,
    };
  }
}

/**
 * Backward compatible adapter for password/identifier authentication
 */
export async function authenticateWithGarnetCredentials(
  identifier: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: GarnetUser; message?: string }> {
  const result = await authenticateWithCentralMashahirSso(identifier, password);
  return {
    success: result.success,
    token: result.token,
    user: result.user,
    message: result.message,
  };
}

/**
 * Retrieve user info and enrolled courses from a JWT token or remote courses API
 */
export async function fetchGarnetUserAndCourses(
  tokenInput: string
): Promise<GarnetVerificationResult> {
  const token = tokenInput.trim();
  if (!token) {
    return {
      success: false,
      courses: [],
      message: "توکن ورود ارائه نشده است.",
    };
  }

  const config = await getActiveSsoApiSettings();
  const baseUrl = ensureHttps(config.baseUrl.replace(/\/+$/, ""));

  // Attempt remote course verification if configured
  if (config.coursesEndpoint) {
    try {
      const endpoint = `${baseUrl}/${config.coursesEndpoint.replace(/^\/+/, "")}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (config.apiKeyHeader && config.apiKeyValue) {
        headers[config.apiKeyHeader] = config.apiKeyValue;
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(process.env.NODE_ENV === "test" ? 300 : 6000),
      });

      if (response.ok) {
        const data = await response.json();
        const rawCourses = data.courses || data.data || [];
        const courses: GarnetEnrolledCourse[] = Array.isArray(rawCourses)
          ? rawCourses.map((c: any) => ({
              code: typeof c === "string" ? c : c.code || String(c.id),
              title: typeof c === "string" ? `دوره ${c}` : c.title || c.name || `دوره ${c.code}`,
            }))
          : [];

        if (data.user) {
          return {
            success: true,
            user: {
              id: String(data.user.id || data.user.userId),
              fullName:
                [data.user.first_name, data.user.last_name].filter(Boolean).join(" ") ||
                data.user.fullName ||
                data.user.name ||
                "داوطلب مشاهیر دانش",
              phoneNumber: normalizeIranianMobile(data.user.phone || data.user.mobile || ""),
              nationalId: data.user.national_code || data.user.nationalId,
              email: data.user.email,
              username: data.user.username,
            },
            courses,
          };
        }
      }
    } catch (err) {
      console.warn("[SSO] Remote course verification failed, falling back to local cryptographic verification:", err);
    }
  }

  // Parse and strictly verify signature of JWT token (C-06)
  const verifiedClaims = await verifyGarnetToken(token);
  if (!verifiedClaims) {
    return {
      success: false,
      courses: [],
      message: "امضای امنیتی توکن ورود نامعتبر است یا منقضی شده است (C-06).",
    };
  }

  const coursesList: GarnetEnrolledCourse[] = [];
  if (Array.isArray(verifiedClaims.courses)) {
    for (const c of verifiedClaims.courses) {
      if (typeof c === "string") {
        coursesList.push({ code: c, title: `دوره ${c}` });
      } else if (typeof c === "object" && c && "code" in c) {
        coursesList.push({
          code: (c as { code: string }).code,
          title:
            (c as { title?: string; name?: string; code: string }).title ||
            (c as { title?: string; name?: string; code: string }).name ||
            `دوره ${(c as { code: string }).code}`,
        });
      }
    }
  } else if (typeof verifiedClaims.courseCode === "string") {
    coursesList.push({
      code: verifiedClaims.courseCode,
      title: (verifiedClaims.courseName as string) || verifiedClaims.courseCode,
    });
  }

  // If no courses found and bypass is enabled, add defaults
  if (coursesList.length === 0 && config.bypassCourseCheckIfNoEndpoint) {
    coursesList.push(
      { code: "MASHAHIR-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" },
      { code: "GARNET-BAR-360", title: "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه" }
    );
  }

  const normMobile = normalizeIranianMobile(
    (verifiedClaims.phone as string) || (verifiedClaims.phoneNumber as string) || "09121000005"
  );

  return {
    success: true,
    user: {
      id: (verifiedClaims.sub as string) || `usr_${Date.now()}`,
      fullName:
        (verifiedClaims.name as string) ||
        (verifiedClaims.fullName as string) ||
        "داوطلب مشاهیر دانش",
      phoneNumber: normMobile,
      nationalId: (verifiedClaims.nationalId as string) || undefined,
      username: (verifiedClaims.username as string) || undefined,
    },
    courses: coursesList,
  };
}

/**
 * Match enrolled course codes against admin-configured entitled courses in PostgreSQL
 */
export async function verifyCourseSupportEntitlement(enrolledCourseCodes: string[]): Promise<{
  isEntitled: boolean;
  matchedCourse: EntitledCourseRecord | null;
  eligibleCourses: EntitledCourseRecord[];
}> {
  const activeEntitledRows = await db
    .select()
    .from(entitledCourses)
    .where(eq(entitledCourses.isActive, true));

  const eligibleCourses = activeEntitledRows as unknown as EntitledCourseRecord[];
  const normalizedEnrolled = enrolledCourseCodes.map((c) => c.trim().toUpperCase());

  const matched = eligibleCourses.find(
    (ec) =>
      ec.hasSupport &&
      (normalizedEnrolled.includes(ec.courseCode.trim().toUpperCase()) ||
        // Backward-compatibility: if user has MASHAHIR-BAR-360 and DB has GARNET-BAR-360, or vice versa
        (ec.courseCode.includes("BAR-360") &&
          normalizedEnrolled.some((code) => code.includes("BAR-360"))))
  );

  return {
    isEntitled: Boolean(matched),
    matchedCourse: matched || null,
    eligibleCourses,
  };
}

/**
 * Layer 1 Silent Background Entitlement Heartbeat:
 * Asynchronously verifies course entitlements against the central API without blocking user login.
 * If the course was refunded or cancelled, immediately revokes access, terminates active sessions,
 * and alerts supervisors.
 */
export async function verifyStudentCourseHeartbeat(userId: string): Promise<{
  active: boolean;
  revoked?: boolean;
  reason?: string;
}> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { active: false, reason: "USER_NOT_FOUND" };

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
    if (!profile) return { active: false, reason: "PROFILE_NOT_FOUND" };

    // If pre-authorized via Excel whitelist or manual admin, trust administrative approval
    if (profile.provisioningSource === "EXCEL_WHITELIST" || profile.provisioningSource === "ADMIN_MANUAL") {
      await db
        .update(studentProfiles)
        .set({ lastEntitlementCheckAt: new Date(), updatedAt: new Date() })
        .where(eq(studentProfiles.id, profile.id));
      return { active: true };
    }

    const config = await getActiveSsoApiSettings();
    if (!config.isEnabled) {
      return { active: Boolean(profile.hasActiveSupport) };
    }

    const baseUrl = ensureHttps(config.baseUrl.replace(/\/+$/, ""));
    const endpointPath = (config.productsEndpoint || "/invoices/productListByUser").replace(/^\/+/, "");
    const queryUrl = `${baseUrl}/${endpointPath}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "MashahirSupportPortal-DRM/1.0",
    };
    if (config.apiKeyHeader && config.apiKeyValue) {
      headers[config.apiKeyHeader] = config.apiKeyValue;
    }

    const payload = {
      mobile: user.phoneNumber,
      external_user_id: profile.externalUserId || user.garnetUserId || undefined,
    };

    let isRefundedOrRemoved = false;
    let failureDetail = "";

    try {
      const response = await fetch(queryUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(process.env.NODE_ENV === "test" ? 300 : 6000),
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.products || data.items || data.courses || data.data || [];

        // Check if explicit refund or cancelled status
        if (data.isRefunded === true || data.status === "REFUNDED" || data.status === "CANCELLED") {
          isRefundedOrRemoved = true;
          failureDetail = "تایید استرداد یا لغو خرید از وب‌سرویس مرکزی";
        } else if (Array.isArray(items)) {
          if (items.length === 0 && !config.bypassCourseCheckIfNoEndpoint) {
            // Student has 0 active courses in central invoices
            isRefundedOrRemoved = true;
            failureDetail = "عدم وجود فاکتور یا دوره فعال در وب‌سرویس مرکزی (استرداد یا حذف دوره)";
          } else {
            // Verify if any active item has support
            const activeCodes = items.map((it: any) =>
              typeof it === "string" ? it : it.code || it.course_code || String(it.id)
            );
            const { isEntitled } = await verifyCourseSupportEntitlement(activeCodes);
            if (!isEntitled && !config.bypassCourseCheckIfNoEndpoint) {
              isRefundedOrRemoved = true;
              failureDetail = "دوره‌های فعال کاربر فاقد بسته پشتیبانی ۳۶۰ درجه می‌باشند";
            }
          }
        }
      } else if (response.status === 404 || response.status === 403) {
        isRefundedOrRemoved = true;
        failureDetail = `پاسخ وب‌سرویس مرکزی حاکی از عدم دسترسی یا حذف کاربر است (HTTP ${response.status})`;
      }
    } catch (networkErr: any) {
      // Network timeout / transient central API error: do NOT suspend legitimate candidates
      console.warn(`[DRM Heartbeat] Network check for user ${userId} timed out or failed:`, networkErr?.message);
      return { active: Boolean(profile.hasActiveSupport) };
    }

    if (isRefundedOrRemoved) {
      console.warn(`[DRM SHIELD ALERT] Student ${userId} (${user.fullName}) course is refunded/cancelled! Revoking access...`);

      // 1. Immediately revoke active support in DB
      await db
        .update(studentProfiles)
        .set({
          hasActiveSupport: false,
          suspensionReason: "REFUNDED_OR_REMOVED_IN_CENTRAL_API",
          lastEntitlementCheckAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.id, profile.id));

      // 2. Revoke active JWT session in Redis to evict immediately
      await revokeAllUserSessions(userId);

      // 3. Dispatch high-priority security alert to Triage / Admin
      try {
        const triageId = `triage_drm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await db.insert(triageCases).values({
          id: triageId,
          studentProfileId: profile.id,
          mentorId: profile.mentorId || "usr_mentor1",
          triggerCode: "REFUND_FRAUD_PREVENTED",
          priorityTier: 1,
          description: `سپر ضدجاسوسی و استرداد (DRM): حساب داوطلب ${user.fullName} (${user.phoneNumber}) به دلیل ${failureDetail} بلافاصله مسدود و نشست‌های فعال باطل شد.`,
          isResolved: false,
          slaDueAt: new Date(Date.now() + 2 * 3600 * 1000), // 2-hour urgent SLA
        });

        await db.insert(auditLogs).values({
          id: `audit_${Date.now()}`,
          actorId: "usr_admin1",
          action: "DRM_REFUND_AUTO_SUSPEND",
          targetEntity: "STUDENT_PROFILE",
          targetId: profile.id,
          metadata: {
            userId,
            fullName: user.fullName,
            phone: user.phoneNumber,
            reason: failureDetail,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (logErr) {
        console.warn("[DRM Heartbeat] Failed to insert triage alert:", logErr);
      }

      return {
        active: false,
        revoked: true,
        reason: "REFUNDED_OR_REMOVED_IN_CENTRAL_API",
      };
    }

    // Success: mark last check timestamp
    await db
      .update(studentProfiles)
      .set({
        lastEntitlementCheckAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, profile.id));

    return { active: true };
  } catch (err: any) {
    console.error(`[DRM Heartbeat] Unexpected error checking user ${userId}:`, err);
    return { active: true }; // Fail-safe
  }
}

