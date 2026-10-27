"use server";

import { cookies } from "next/headers";
import { db, ensureDatabaseBootstrap } from "../db";
import { users, studentProfiles, entitledCourses, ssoApiSettings } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { createSessionToken, registerActiveUserSession } from "../auth/jwt";
import { isCookieSecure } from "@/lib/jwt";
import { requireRole, requireAuth } from "../auth/guard";
import { toEnglishDigits } from "../auth/otp";
import {
  authenticateWithCentralMashahirSso,
  fetchGarnetUserAndCourses,
  verifyCourseSupportEntitlement,
  getActiveSsoApiSettings,
  normalizeIranianMobile,
  DEFAULT_SSO_API_SETTINGS,
  sendCentralSsoOtp,
  verifyCentralSsoOtp,
  fetchCentralUserProducts,
  type GarnetEnrolledCourse,
} from "../services/garnet";
import type { UserRole, EntitledCourseRecord, SsoApiSettingsRecord } from "@/types/models";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mashahir_session";

/**
 * Sanitize SSO settings for non-admin client consumption:
 * Masks secret API keys for users who do not have CEO or ADMIN roles.
 */
export async function sanitizeSsoSettingsForClient(
  settings: SsoApiSettingsRecord,
  userRole?: UserRole
): Promise<SsoApiSettingsRecord> {
  if (userRole === "CEO" || userRole === "ADMIN") {
    return settings;
  }
  return {
    ...settings,
    apiKeyValue: settings.apiKeyValue ? "••••••••••••••••••••••••••••••••" : "",
  };
}

/**
 * Handle SSO Authentication with Central SSO / Garnet LMS JWT Token
 */
export async function loginWithGarnetSsoAction(garnetJwt: string): Promise<{
  success: boolean;
  message?: string;
  redirectUrl?: string;
  notEntitled?: boolean;
  eligibleCourses?: EntitledCourseRecord[];
}> {
  try {
    await ensureDatabaseBootstrap().catch(() => {});

    // 1. Send JWT to SSO API to get user profile and enrolled courses
    const verification = await fetchGarnetUserAndCourses(garnetJwt);

    if (!verification.success || !verification.user) {
      return {
        success: false,
        message: verification.message || "اعتبارسنجی توکن ورود با حساب کاربری مشاهیر دانش با خطا مواجه شد.",
      };
    }

    const { user: ssoUser, courses } = verification;
    const enrolledCodes = courses.map((c) => c.code);

    // 2. Check if user is enrolled in a course with support entitlement
    const entitlement = await verifyCourseSupportEntitlement(enrolledCodes);

    if (!entitlement.isEntitled) {
      return {
        success: false,
        notEntitled: true,
        message: "داوطلب گرامی، دوره ثبت‌نامی شما فاقد بسته پشتیبانی آموزشی ۳۶۰ درجه مشاهیر دانش است.",
        redirectUrl: "/auth/no-support-access",
        eligibleCourses: entitlement.eligibleCourses,
      };
    }

    // 3. User is entitled! Provision or update user in PostgreSQL
    const cleanPhone = normalizeIranianMobile(ssoUser.phoneNumber);
    let dbUser: typeof users.$inferSelect | null = null;

    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.phoneNumber, cleanPhone),
            eq(users.garnetUserId, ssoUser.id)
          )
        )
        .limit(1);
      dbUser = existing || null;
    } catch {}

    const newUserId = dbUser?.id || `usr_${Date.now()}`;
    const matchedCourse = entitlement.matchedCourse;

    if (!dbUser) {
      const [created] = await db
        .insert(users)
        .values({
          id: newUserId,
          phoneNumber: cleanPhone,
          fullName: ssoUser.fullName,
          nationalId: ssoUser.nationalId || null,
          username: ssoUser.username || cleanPhone,
          role: "STUDENT",
          garnetUserId: ssoUser.id,
          garnetUsername: ssoUser.username || null,
          isActive: true,
        })
        .returning();
      dbUser = created;
    } else {
      await db
        .update(users)
        .set({
          fullName: ssoUser.fullName,
          garnetUserId: ssoUser.id,
          garnetUsername: ssoUser.username || dbUser.garnetUsername,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));
    }

    // Ensure student profile exists
    let studentProfileId: string = `profile_${Date.now()}`;
    try {
      const [existingProfile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, dbUser.id))
        .limit(1);

      if (existingProfile) {
        studentProfileId = existingProfile.id;
        await db
          .update(studentProfiles)
          .set({
            enrolledCourseCode: matchedCourse?.courseCode || "MASHAHIR-BAR-360",
            enrolledCourseName: matchedCourse?.courseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه",
            hasActiveSupport: true,
            externalUserId: ssoUser.id,
            initialSyncCompleted: true,
            initialSyncAt: new Date(),
            provisioningSource: "EXTERNAL_API_ONCE",
            lastEntitlementCheckAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.id, existingProfile.id));
      } else {
        await db.insert(studentProfiles).values({
          id: studentProfileId,
          userId: dbUser.id,
          mentorId: "usr_mentor1", // Default institutional mentor
          employmentStatus: "UNEMPLOYED",
          isStudent: false,
          maritalStatus: "SINGLE",
          hasChildren: false,
          childrenCount: 0,
          hasFamilyCareDuty: false,
          workdayStudyHoursCap: 8,
          holidayStudyHoursCap: 12,
          bestStudyTime: "MORNING",
          previousBarExamAttempts: 0,
          currentDailyStudyHours: 6,
          masterclassGoal: "قبولی در آزمون وکالت کانون و مرکز وکلا",
          riskStatus: "GREEN",
          riskReason: "ورود موفق از طریق حساب کاربری مشاهیر دانش با بسته پشتیبانی فعال",
          enrolledCourseCode: matchedCourse?.courseCode || "MASHAHIR-BAR-360",
          enrolledCourseName: matchedCourse?.courseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه",
          hasActiveSupport: true,
          externalUserId: ssoUser.id,
          initialSyncCompleted: true,
          initialSyncAt: new Date(),
          provisioningSource: "EXTERNAL_API_ONCE",
          isProbationary: true,
          lastEntitlementCheckAt: new Date(),
          lastContactAt: new Date(),
        });
      }
    } catch {}

    // 4. Generate Session Token & Cookie with Single-Device Concurrency (Layer 4 DRM)
    const sessionId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const token = await createSessionToken({
      userId: dbUser.id,
      phoneNumber: dbUser.phoneNumber,
      fullName: dbUser.fullName,
      role: "STUDENT" as UserRole,
      studentProfileId,
      sessionId,
    });

    await registerActiveUserSession(dbUser.id, sessionId);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return {
      success: true,
      message: `ورود با موفقیت انجام شد. خوش آمدید، ${dbUser.fullName}`,
      redirectUrl: "/student/dashboard",
    };
  } catch (error) {
    console.error("[SSO] Error processing login:", error);
    return {
      success: false,
      message: "خطای سیستمی در فرآیند احراز هویت با سامانه مرکزی مشاهیر دانش.",
    };
  }
}

/** Alias for loginWithGarnetSsoAction */
export const loginWithMashahirSsoAction = loginWithGarnetSsoAction;

/**
 * Login with Central Account (Mashahir Danesh) Credentials
 */
export async function loginWithGarnetCredentialsAction(
  identifier: string,
  pass: string
): Promise<{
  success: boolean;
  message?: string;
  redirectUrl?: string;
  notEntitled?: boolean;
  eligibleCourses?: EntitledCourseRecord[];
}> {
  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const ssoResult = await authenticateWithCentralMashahirSso(identifier, pass);

    if (!ssoResult.success || !ssoResult.user) {
      return {
        success: false,
        message: ssoResult.message || "شناسه یا کلمه عبور در حساب کاربری مشاهیر دانش نادرست است.",
      };
    }

    const { user: ssoUser, courses } = ssoResult;
    const enrolledCodes = courses.map((c) => c.code);

    // Check course support entitlement
    const entitlement = await verifyCourseSupportEntitlement(enrolledCodes);
    const config = await getActiveSsoApiSettings();

    if (!entitlement.isEntitled && !config.bypassCourseCheckIfNoEndpoint) {
      return {
        success: false,
        notEntitled: true,
        message: "داوطلب گرامی، دوره ثبت‌نامی شما فاقد بسته پشتیبانی آموزشی ۳۶۰ درجه مشاهیر دانش است.",
        redirectUrl: "/auth/no-support-access",
        eligibleCourses: entitlement.eligibleCourses,
      };
    }

    // Auto-provision user in PostgreSQL if autoCreateStudent is enabled or user exists
    const cleanPhone = normalizeIranianMobile(ssoUser.phoneNumber);
    let dbUser: typeof users.$inferSelect | null = null;

    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.phoneNumber, cleanPhone),
            eq(users.garnetUserId, ssoUser.id)
          )
        )
        .limit(1);
      dbUser = existing || null;
    } catch {}

    const newUserId = dbUser?.id || `usr_${Date.now()}`;
    const matchedCourse = entitlement.matchedCourse;

    if (!dbUser) {
      if (!config.autoCreateStudent) {
        return {
          success: false,
          message: "حساب کاربری داوطلب در سامانه پشتیبانی ثبت نشده و ایجاد خودکار غیرفعال است.",
        };
      }

      const [created] = await db
        .insert(users)
        .values({
          id: newUserId,
          phoneNumber: cleanPhone,
          fullName: ssoUser.fullName,
          nationalId: ssoUser.nationalId || null,
          username: ssoUser.username || cleanPhone,
          role: "STUDENT",
          garnetUserId: ssoUser.id,
          garnetUsername: ssoUser.username || null,
          isActive: true,
        })
        .returning();
      dbUser = created;
    } else {
      await db
        .update(users)
        .set({
          fullName: ssoUser.fullName,
          garnetUserId: ssoUser.id,
          garnetUsername: ssoUser.username || dbUser.garnetUsername,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));
    }

    // Ensure student profile exists
    let studentProfileId: string = `profile_${Date.now()}`;
    try {
      const [existingProfile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, dbUser.id))
        .limit(1);

      if (existingProfile) {
        studentProfileId = existingProfile.id;
        await db
          .update(studentProfiles)
          .set({
            enrolledCourseCode: matchedCourse?.courseCode || "MASHAHIR-BAR-360",
            enrolledCourseName: matchedCourse?.courseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه",
            hasActiveSupport: true,
            externalUserId: ssoUser.id,
            initialSyncCompleted: true,
            initialSyncAt: new Date(),
            provisioningSource: "EXTERNAL_API_ONCE",
            lastEntitlementCheckAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.id, existingProfile.id));
      } else {
        await db.insert(studentProfiles).values({
          id: studentProfileId,
          userId: dbUser.id,
          mentorId: "usr_mentor1",
          employmentStatus: "UNEMPLOYED",
          isStudent: false,
          maritalStatus: "SINGLE",
          hasChildren: false,
          childrenCount: 0,
          hasFamilyCareDuty: false,
          workdayStudyHoursCap: 8,
          holidayStudyHoursCap: 12,
          bestStudyTime: "MORNING",
          previousBarExamAttempts: 0,
          currentDailyStudyHours: 6,
          masterclassGoal: "قبولی در آزمون وکالت کانون و مرکز وکلا",
          riskStatus: "GREEN",
          riskReason: "ورود موفق از طریق حساب کاربری مشاهیر دانش با بسته پشتیبانی فعال",
          enrolledCourseCode: matchedCourse?.courseCode || "MASHAHIR-BAR-360",
          enrolledCourseName: matchedCourse?.courseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه",
          hasActiveSupport: true,
          externalUserId: ssoUser.id,
          initialSyncCompleted: true,
          initialSyncAt: new Date(),
          provisioningSource: "EXTERNAL_API_ONCE",
          isProbationary: true,
          lastEntitlementCheckAt: new Date(),
          lastContactAt: new Date(),
        });
      }
    } catch {}

    // Generate Session Token & Cookie with Single-Device Concurrency (Layer 4 DRM)
    const sessionId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const token = await createSessionToken({
      userId: dbUser.id,
      phoneNumber: dbUser.phoneNumber,
      fullName: dbUser.fullName,
      role: (dbUser.role as UserRole) || "STUDENT",
      studentProfileId,
      sessionId,
    });

    await registerActiveUserSession(dbUser.id, sessionId);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const destination =
      dbUser.role === "CEO" || dbUser.role === "ADMIN"
        ? "/executive"
        : dbUser.role === "SUPERVISOR"
        ? "/supervisor"
        : dbUser.role === "MENTOR"
        ? "/mentor/students"
        : "/student/dashboard";

    return {
      success: true,
      message: `ورود با موفقیت انجام شد. خوش آمدید، ${dbUser.fullName}`,
      redirectUrl: destination,
    };
  } catch (error) {
    console.error("[SSO Credentials] Error:", error);
    return {
      success: false,
      message: "خطای سیستمی در فرآیند احراز هویت با سامانه مشاهیر دانش.",
    };
  }
}

/** Alias for loginWithGarnetCredentialsAction */
export const loginWithMashahirCredentialsAction = loginWithGarnetCredentialsAction;

/**
 * Get List of Active Courses with Support (For upsell/explanation page)
 */
export async function getEligibleSupportCoursesAction(): Promise<EntitledCourseRecord[]> {
  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const rows = await db
      .select()
      .from(entitledCourses)
      .where(eq(entitledCourses.isActive, true));
    return (rows as unknown as EntitledCourseRecord[]).filter((c) => c.hasSupport);
  } catch {
    return [];
  }
}

/**
 * Retrieve current SSO API settings for Admin / Settings view
 */
export async function getSsoApiSettingsAction(): Promise<SsoApiSettingsRecord> {
  const session = await requireAuth();
  const settings = await getActiveSsoApiSettings();
  return sanitizeSsoSettingsForClient(settings, session.role);
}

/**
 * Update SSO API settings in PostgreSQL (CEO / ADMIN only)
 */
export async function updateSsoApiSettingsAction(
  payload: Partial<SsoApiSettingsRecord>
): Promise<{ success: boolean; message: string; settings?: SsoApiSettingsRecord }> {
  try {
    const session = await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    const current = await getActiveSsoApiSettings();

    const updatedData: SsoApiSettingsRecord = {
      ...current,
      isEnabled: payload.isEnabled !== undefined ? Boolean(payload.isEnabled) : current.isEnabled,
      serviceTitle: payload.serviceTitle?.trim() || current.serviceTitle,
      baseUrl: payload.baseUrl?.trim() || current.baseUrl,
      loginEndpoint: payload.loginEndpoint?.trim() || current.loginEndpoint,
      coursesEndpoint: payload.coursesEndpoint?.trim() || current.coursesEndpoint,
      sendOtpEndpoint:
        payload.sendOtpEndpoint !== undefined ? payload.sendOtpEndpoint.trim() : current.sendOtpEndpoint,
      verifyOtpEndpoint:
        payload.verifyOtpEndpoint !== undefined ? payload.verifyOtpEndpoint.trim() : current.verifyOtpEndpoint,
      productsEndpoint:
        payload.productsEndpoint !== undefined ? payload.productsEndpoint.trim() : current.productsEndpoint,
      codeCount:
        payload.codeCount !== undefined ? Number(payload.codeCount) : current.codeCount,
      apiKeyHeader: payload.apiKeyHeader?.trim() || current.apiKeyHeader,
      // Only update API key value if provided and not masked
      apiKeyValue:
        payload.apiKeyValue && !payload.apiKeyValue.includes("••••")
          ? payload.apiKeyValue.trim()
          : current.apiKeyValue,
      mobileFieldName: payload.mobileFieldName?.trim() || current.mobileFieldName,
      passwordFieldName: payload.passwordFieldName?.trim() || current.passwordFieldName,
      successStatusCode:
        payload.successStatusCode !== undefined
          ? Number(payload.successStatusCode)
          : current.successStatusCode,
      timeoutMs:
        payload.timeoutMs !== undefined ? Number(payload.timeoutMs) : current.timeoutMs,
      autoCreateStudent:
        payload.autoCreateStudent !== undefined
          ? Boolean(payload.autoCreateStudent)
          : current.autoCreateStudent,
      bypassCourseCheckIfNoEndpoint:
        payload.bypassCourseCheckIfNoEndpoint !== undefined
          ? Boolean(payload.bypassCourseCheckIfNoEndpoint)
          : current.bypassCourseCheckIfNoEndpoint,
      updatedAt: new Date(),
    };

    await db
      .insert(ssoApiSettings)
      .values({
        id: "default",
        isEnabled: updatedData.isEnabled,
        serviceTitle: updatedData.serviceTitle,
        baseUrl: updatedData.baseUrl,
        loginEndpoint: updatedData.loginEndpoint,
        coursesEndpoint: updatedData.coursesEndpoint,
        sendOtpEndpoint: updatedData.sendOtpEndpoint || "/users/sendVerificationCodeByMobile",
        verifyOtpEndpoint: updatedData.verifyOtpEndpoint || "/users/checkVerificationCode",
        productsEndpoint: updatedData.productsEndpoint || "/invoices/productListByUser",
        codeCount: updatedData.codeCount || 5,
        apiKeyHeader: updatedData.apiKeyHeader,
        apiKeyValue: updatedData.apiKeyValue,
        mobileFieldName: updatedData.mobileFieldName,
        passwordFieldName: updatedData.passwordFieldName,
        successStatusCode: updatedData.successStatusCode,
        timeoutMs: updatedData.timeoutMs,
        autoCreateStudent: updatedData.autoCreateStudent,
        bypassCourseCheckIfNoEndpoint: updatedData.bypassCourseCheckIfNoEndpoint,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ssoApiSettings.id,
        set: {
          isEnabled: updatedData.isEnabled,
          serviceTitle: updatedData.serviceTitle,
          baseUrl: updatedData.baseUrl,
          loginEndpoint: updatedData.loginEndpoint,
          coursesEndpoint: updatedData.coursesEndpoint,
          sendOtpEndpoint: updatedData.sendOtpEndpoint || "/users/sendVerificationCodeByMobile",
          verifyOtpEndpoint: updatedData.verifyOtpEndpoint || "/users/checkVerificationCode",
          productsEndpoint: updatedData.productsEndpoint || "/invoices/productListByUser",
          codeCount: updatedData.codeCount || 5,
          apiKeyHeader: updatedData.apiKeyHeader,
          apiKeyValue: updatedData.apiKeyValue,
          mobileFieldName: updatedData.mobileFieldName,
          passwordFieldName: updatedData.passwordFieldName,
          successStatusCode: updatedData.successStatusCode,
          timeoutMs: updatedData.timeoutMs,
          autoCreateStudent: updatedData.autoCreateStudent,
          bypassCourseCheckIfNoEndpoint: updatedData.bypassCourseCheckIfNoEndpoint,
          updatedAt: new Date(),
        },
      });

    return {
      success: true,
      message: "تنظیمات وب‌سرویس احراز هویت با موفقیت در پایگاه‌داده ذخیره شد.",
      settings: await sanitizeSsoSettingsForClient(updatedData, session.role),
    };
  } catch (err: any) {
    console.error("[SSO Settings Update Error]:", err);
    return {
      success: false,
      message: err?.message || "خطا در ذخیره‌سازی تنظیمات وب‌سرویس در پایگاه داده.",
    };
  }
}

/**
 * Built-in Live API Connection Tester for Admin Panel:
 * Tests live connection against Mashahir Danesh Central Web Service using provided/current settings
 */
export async function testMashahirSsoConnectionAction(
  testMobile: string,
  testPassword: string,
  formOverrides?: Partial<SsoApiSettingsRecord>
): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  statusCode?: number;
  extractedUser?: {
    id?: string;
    fullName?: string;
    nationalId?: string;
    mobile?: string;
    email?: string;
  };
  coursesCount?: number;
  rawPreview?: string;
}> {
  try {
    await requireRole(["CEO", "ADMIN"]);
    const cleanMobile = normalizeIranianMobile(testMobile) || testMobile.trim();

    if (!cleanMobile || !testPassword) {
      return {
        success: false,
        message: "لطفاً شماره موبایل و رمز عبور تست را وارد فرمایید.",
        latencyMs: 0,
      };
    }

    const result = await authenticateWithCentralMashahirSso(cleanMobile, testPassword, formOverrides);

    const rawPreview = result.rawResponse
      ? JSON.stringify(result.rawResponse, null, 2)
      : undefined;

    if (result.success && result.user) {
      return {
        success: true,
        message: `اتصال با موفقیت برقرار شد. (${result.message})`,
        latencyMs: result.latencyMs || 0,
        statusCode: formOverrides?.successStatusCode || 2000,
        extractedUser: {
          id: result.user.id,
          fullName: result.user.fullName,
          nationalId: result.user.nationalId,
          mobile: result.user.phoneNumber,
          email: result.user.email,
        },
        coursesCount: result.courses?.length || 0,
        rawPreview,
      };
    }

    return {
      success: false,
      message: result.message || "پاسخ ناموفق از وب‌سرویس مرکزی مشاهیر دانش دریافت شد.",
      latencyMs: result.latencyMs || 0,
      rawPreview,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "خطای غیرمنتظره در آزمایش اتصال وب‌سرویس.",
      latencyMs: 0,
    };
  }
}

/**
 * Choice 2 Stage 1: Send SMS Verification Code via Central API
 */
export async function sendSsoOtpAction(rawMobile: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const cleanMobile = normalizeIranianMobile(rawMobile);
    if (!cleanMobile) {
      return {
        success: false,
        message: "شماره موبایل نامعتبر است. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹",
      };
    }

    const result = await sendCentralSsoOtp(cleanMobile);
    return {
      success: result.success,
      message: result.message,
    };
  } catch (err: unknown) {
    console.error("[SSO Send OTP Error]:", err);
    return {
      success: false,
      message: (err as Error)?.message || "خطا در برقراری ارتباط با وب‌سرویس پیامک مشاهیر دانش.",
    };
  }
}

/**
 * Choice 2 Stage 2 & 3: Check Verification Code & Local-First Provisioning
 */
export async function verifySsoOtpAction(
  rawMobile: string,
  rawCode: string
): Promise<{
  success: boolean;
  message?: string;
  redirectUrl?: string;
  notEntitled?: boolean;
  eligibleCourses?: EntitledCourseRecord[];
}> {
  try {
    const cleanMobile = normalizeIranianMobile(rawMobile);
    const cleanCode = toEnglishDigits(rawCode).trim();

    if (!cleanMobile) {
      return {
        success: false,
        message: "شماره موبایل نامعتبر است. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹",
      };
    }

    if (!cleanCode) {
      return {
        success: false,
        message: "کد تایید پیامکی را وارد فرمایید.",
      };
    }

    // Stage 2: Check verification code with Central API
    const verifyResult = await verifyCentralSsoOtp(cleanMobile, cleanCode);
    if (!verifyResult.success) {
      return {
        success: false,
        message: verifyResult.message || "کد تایید وارد شده نامعتبر یا منقضی شده است.",
      };
    }

    // Stage 2 verified!
    await ensureDatabaseBootstrap().catch(() => {});

    // Check if user already exists in PostgreSQL
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, cleanMobile))
      .limit(1);

    if (existingUser) {
      // If user exists and is a student, check profile
      if (existingUser.role === "STUDENT") {
        const [profile] = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, existingUser.id))
          .limit(1);

        if (profile) {
          if (!profile.hasActiveSupport) {
            return {
              success: false,
              message: profile.suspensionReason
                ? `دسترسی شما به دلیل «${profile.suspensionReason}» غیرفعال شده است.`
                : "دسترسی شما به سامانه پشتیبانی مشاهیر دانش غیرفعال شده است.",
            };
          }

          if (profile.initialSyncCompleted) {
            // Path A: Authenticate 100% locally from PostgreSQL in <15ms!
            const sessionId =
              typeof globalThis.crypto?.randomUUID === "function"
                ? globalThis.crypto.randomUUID()
                : `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

            const token = await createSessionToken({
              userId: existingUser.id,
              phoneNumber: cleanMobile,
              fullName: existingUser.fullName,
              role: "STUDENT",
              studentProfileId: profile.id,
              sessionId,
            });

            await registerActiveUserSession(existingUser.id, sessionId);

            const cookieStore = await cookies();
            cookieStore.set(SESSION_COOKIE_NAME, token, {
              httpOnly: true,
              secure: isCookieSecure(),
              sameSite: "lax",
              path: "/",
              maxAge: 7 * 24 * 60 * 60,
            });

            return {
              success: true,
              message: `خوش آمدید، ${existingUser.fullName}`,
              redirectUrl: "/student/dashboard",
            };
          }
        }
      } else {
        // Staff/Admin user already in DB
        const sessionId =
          typeof globalThis.crypto?.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

        const token = await createSessionToken({
          userId: existingUser.id,
          phoneNumber: cleanMobile,
          fullName: existingUser.fullName,
          role: existingUser.role as UserRole,
          sessionId,
        });

        await registerActiveUserSession(existingUser.id, sessionId);

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, token, {
          httpOnly: true,
          secure: isCookieSecure(),
          sameSite: "lax",
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        });

        let redirectUrl = "/student/dashboard";
        if (existingUser.role === "MENTOR") redirectUrl = "/mentor/triage";
        else if (existingUser.role === "SUPERVISOR") redirectUrl = "/supervisor";
        else if (existingUser.role === "CEO" || existingUser.role === "ADMIN") redirectUrl = "/executive";

        return {
          success: true,
          message: `خوش آمدید، ${existingUser.fullName}`,
          redirectUrl,
        };
      }
    }

    // Path B: Student does NOT exist or initialSyncCompleted is false!
    // Call Stage 3: productListByUser
    const productsResult = await fetchCentralUserProducts(
      { mobile: cleanMobile, id: verifyResult.user?.id },
      verifyResult.token
    );
    const enrolledCodes = (productsResult.courses || []).map((p: GarnetEnrolledCourse) => p.code || p.title || "");

    const ssoSettings = await getActiveSsoApiSettings();
    const entitlement = await verifyCourseSupportEntitlement(enrolledCodes);

    if (!entitlement.isEntitled && !ssoSettings.bypassCourseCheckIfNoEndpoint) {
      return {
        success: false,
        notEntitled: true,
        message: "داوطلب گرامی، دوره ثبت‌نامی شما فاقد بسته پشتیبانی آموزشی ۳۶۰ درجه مشاهیر دانش است.",
        redirectUrl: "/auth/no-support-access",
        eligibleCourses: entitlement.eligibleCourses,
      };
    }

    // Entitled! Provision student locally in PostgreSQL
    const newUserId = existingUser?.id || `usr_${Date.now()}`;
    const newProfileId = `profile_${Date.now()}`;
    const candidateName = verifyResult.user?.fullName || "داوطلب آزمون وکالت";
    const candidateNatId = verifyResult.user?.nationalId || null;
    const matchedCourse = entitlement.matchedCourse;

    if (!existingUser) {
      await db.insert(users).values({
        id: newUserId,
        phoneNumber: cleanMobile,
        fullName: candidateName,
        nationalId: candidateNatId,
        username: cleanMobile,
        role: "STUDENT",
        passwordHash: "",
        mustChangePassword: true,
        isActive: true,
      });
    }

    const [existingProfile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, newUserId))
      .limit(1);

    if (existingProfile) {
      await db
        .update(studentProfiles)
        .set({
          hasActiveSupport: true,
          initialSyncCompleted: true,
          initialSyncAt: new Date(),
          provisioningSource: "EXTERNAL_API_ONCE",
          enrolledCourseCode: matchedCourse?.courseCode || "MASHAHIR-BAR-360",
          enrolledCourseName: matchedCourse?.courseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه",
          lastEntitlementCheckAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.id, existingProfile.id));
    } else {
      await db.insert(studentProfiles).values({
        id: newProfileId,
        userId: newUserId,
        mentorId: null, // UNASSIGNED: Populates Supervisor Queue & Student Waiting Room!
        employmentStatus: "UNEMPLOYED",
        isStudent: false,
        maritalStatus: "SINGLE",
        hasChildren: false,
        childrenCount: 0,
        hasFamilyCareDuty: false,
        workdayStudyHoursCap: 8,
        holidayStudyHoursCap: 12,
        bestStudyTime: "MORNING",
        previousBarExamAttempts: 0,
        currentDailyStudyHours: 6,
        masterclassGoal: "قبولی در آزمون وکالت کانون و مرکز وکلا",
        riskStatus: "GREEN",
        riskReason: "ثبت‌نام اولیه از طریق ورود پیامکی و تطبیق دوره پشتیبانی",
        enrolledCourseCode: matchedCourse?.courseCode || "MASHAHIR-BAR-360",
        enrolledCourseName: matchedCourse?.courseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه",
        hasActiveSupport: true,
        initialSyncCompleted: true,
        initialSyncAt: new Date(),
        provisioningSource: "EXTERNAL_API_ONCE",
        lastEntitlementCheckAt: new Date(),
        lastContactAt: new Date(),
      });
    }

    const sessionId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const token = await createSessionToken({
      userId: newUserId,
      phoneNumber: cleanMobile,
      fullName: candidateName,
      role: "STUDENT",
      studentProfileId: existingProfile?.id || newProfileId,
      sessionId,
    });

    await registerActiveUserSession(newUserId, sessionId);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      message: `خوش آمدید، ${candidateName}`,
      redirectUrl: "/student/dashboard",
    };
  } catch (err: unknown) {
    console.error("[SSO Verify OTP Error]:", err);
    return {
      success: false,
      message: (err as Error)?.message || "خطا در پردازش کد تایید و ورود به سامانه.",
    };
  }
}

/**
 * Test Action: Stage 1 Send OTP via Central API
 */
export async function testSendSsoOtpAction(
  testMobile: string,
  formOverrides?: Partial<SsoApiSettingsRecord>
): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  rawPreview?: string;
}> {
  try {
    await requireRole(["CEO", "ADMIN"]);
    const cleanMobile = normalizeIranianMobile(testMobile);
    if (!cleanMobile) {
      return {
        success: false,
        message: "شماره موبایل وارد شده برای تست نامعتبر است.",
        latencyMs: 0,
      };
    }

    const res = await sendCentralSsoOtp(cleanMobile, formOverrides);
    return {
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs || 0,
      rawPreview: res.rawResponse ? JSON.stringify(res.rawResponse, null, 2) : undefined,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: (err as Error)?.message || "خطا در تست ارسال پیامک",
      latencyMs: 0,
    };
  }
}

/**
 * Test Action: Stage 2 Check OTP Code via Central API
 */
export async function testVerifySsoOtpAction(
  testMobile: string,
  testCode: string,
  formOverrides?: Partial<SsoApiSettingsRecord>
): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  token?: string;
  userInfo?: unknown;
  rawPreview?: string;
}> {
  try {
    await requireRole(["CEO", "ADMIN"]);
    const cleanMobile = normalizeIranianMobile(testMobile);
    if (!cleanMobile || !testCode.trim()) {
      return {
        success: false,
        message: "شماره موبایل و کد تایید الزامی هستند.",
        latencyMs: 0,
      };
    }

    const res = await verifyCentralSsoOtp(cleanMobile, testCode.trim(), formOverrides);
    return {
      success: res.success,
      message: res.message || (res.success ? "کد تایید با موفقیت احراز شد." : "بررسی کد تایید با خطا مواجه شد."),
      latencyMs: res.latencyMs || 0,
      token: res.token,
      userInfo: res.user,
      rawPreview: res.rawResponse ? JSON.stringify(res.rawResponse, null, 2) : undefined,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: (err as Error)?.message || "خطا در تست بررسی کد تایید",
      latencyMs: 0,
    };
  }
}

/**
 * Test Action: Stage 3 Product List by User via Central API
 */
export async function testFetchUserProductsAction(
  testMobileOrUserId: string,
  formOverrides?: Partial<SsoApiSettingsRecord>
): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  productsCount: number;
  products?: unknown[];
  rawPreview?: string;
}> {
  try {
    await requireRole(["CEO", "ADMIN"]);
    const target = testMobileOrUserId.trim();
    if (!target) {
      return {
        success: false,
        message: "شماره موبایل یا شناسه کاربر الزامی است.",
        latencyMs: 0,
        productsCount: 0,
      };
    }

    const isDigitsOnly = /^\d+$/.test(target);
    const userInfoObj = isDigitsOnly && target.length >= 10
      ? { mobile: target }
      : { id: target, userId: target, mobile: target };
    const res = await fetchCentralUserProducts(userInfoObj, undefined, formOverrides);
    return {
      success: res.success,
      message: res.message || (res.success ? "استعلام دوره‌ها با موفقیت انجام شد." : "خطا در استعلام دوره‌ها."),
      latencyMs: res.latencyMs || 0,
      productsCount: res.courses?.length || 0,
      products: res.courses,
      rawPreview: res.rawResponse ? JSON.stringify(res.rawResponse, null, 2) : undefined,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: (err as Error)?.message || "خطا در تست دریافت فهرست محصولات",
      latencyMs: 0,
      productsCount: 0,
    };
  }
}
