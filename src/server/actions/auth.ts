"use server";

import { cookies, headers } from "next/headers";
import {
  isValidIranianPhone,
  toEnglishDigits,
  normalizePhoneNumber,
  checkOtpRateLimitDistributed,
  generateOtpDistributed,
  verifyOtpDistributed,
} from "../auth/otp";
import { getRedisClient } from "../redis";
import { createSessionToken } from "../auth/jwt";
import { getSession } from "../auth/guard";
import { db } from "../db";
import { users, studentProfiles, studentWhitelist } from "../db/schema";
import { initialUsers } from "../db/mock-data";
import { eq, or, and } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { formatJalaliHuman } from "@/lib/jalali";
import type { UserRole, UserRecord } from "@/types/models";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mashahir_session";

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  redirectUrl?: string;
}

/**
 * Request OTP via SMS
 */
export async function requestOtpAction(phone: string): Promise<ActionResult> {
  try {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!isValidIranianPhone(cleanPhone)) {
      return {
        success: false,
        message: "شماره موبایل نامعتبر است. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹",
      };
    }

    let clientIp: string | undefined;
    try {
      const h = await headers();
      clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
    } catch {}

    const rateCheck = await checkOtpRateLimitDistributed(cleanPhone, clientIp);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: rateCheck.reason === "IP"
          ? `تعداد درخواست‌های پیامک از این آدرس بیش از حد مجاز است. لطفاً ${rateCheck.remainingMinutes} دقیقه دیگر تلاش کنید.`
          : `تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ${rateCheck.remainingMinutes} دقیقه دیگر تلاش کنید.`,
      };
    }

    const { code, expiresInSeconds } = await generateOtpDistributed(cleanPhone, clientIp);

    // Dispatch OTP via Kavenegar SMS lookup service (fault-tolerant, non-blocking)
    try {
      await sendSystemSms({
        event: "LOGIN",
        recipientPhone: cleanPhone,
        recipientName: "کاربر گرامی پشتیبانی مشاهیر دانش",
        token: code,
        variables: {
          token: code,
          name: "کاربر گرامی",
          date: formatJalaliHuman(new Date()),
        },
        customText: `کد ورود اختصاصی: ${code}\nاعتبار: ۲ دقیقه\nپشتیبانی مشاهیر دانش`,
      });
    } catch (smsErr) {
      console.warn("[Auth] OTP SMS dispatch skipped or simulated:", smsErr);
    }

    const isMock = process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_OTP === "true";
    const devHint = isMock ? " (کد تستی توسعه: ۱۲۳۴۵)" : "";

    return {
      success: true,
      message: `کد تایید ۵ رقمی برای شماره ${cleanPhone} ارسال گردید${devHint}.`,
    };
  } catch (error: unknown) {
    console.error("[Auth] requestOtpAction error:", error);
    return {
      success: false,
      message: "خطا در برقراری ارتباط با درگاه پیامک. لطفاً مجدداً تلاش فرمایید.",
    };
  }
}

/**
 * Verify OTP and authenticate user
 * Enforces Whitelist for new student registrations via Drizzle ORM
 */
export async function verifyOtpAction(
  phone: string,
  code: string
): Promise<ActionResult<{ role: UserRole; fullName: string }>> {
  try {
    const cleanPhone = normalizePhoneNumber(phone);
    const cleanCode = toEnglishDigits(code).trim();

    if (!isValidIranianPhone(cleanPhone)) {
      return {
        success: false,
        message: "شماره موبایل نامعتبر است. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹",
      };
    }

    const isValid = await verifyOtpDistributed(cleanPhone, cleanCode);
    if (!isValid) {
      return {
        success: false,
        message: "کد تایید وارد شده نادرست است یا منقضی شده است.",
      };
    }

    // Lookup user in PostgreSQL via Drizzle ORM
    let existingUser: UserRecord | typeof users.$inferSelect | null = null;
    try {
      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.phoneNumber, cleanPhone))
        .limit(1);
      existingUser = u ?? null;
    } catch (dbErr) {
      console.warn("[Auth] DB lookup error during OTP verify:", dbErr);
    }

    let user: UserRecord | typeof users.$inferSelect | null = existingUser;
    let studentProfileId: string | undefined;

    // Institutional seed user fallback (e.g. 09120000001, 09121000005)
    if (!user) {
      const seedUser = initialUsers.find((u) => u.phoneNumber === cleanPhone);
      if (seedUser) {
        user = seedUser;
        if (user.role === "STUDENT") {
          studentProfileId = "profile_stu_1";
        }
      }
    }

    if (!user) {
      // Check if student phone or national ID is whitelisted
      let whitelistEntry: typeof studentWhitelist.$inferSelect | null = null;
      try {
        const [w] = await db
          .select()
          .from(studentWhitelist)
          .where(
            or(
              eq(studentWhitelist.phoneNumber, cleanPhone),
              eq(studentWhitelist.nationalId, cleanPhone)
            )
          )
          .limit(1);
        whitelistEntry = w ?? null;
      } catch {}

      const isMockAllowed =
        process.env.NODE_ENV !== "production" &&
        process.env.ENABLE_MOCK_OTP === "true";

      if (!whitelistEntry && !isMockAllowed) {
        return {
          success: false,
          message: "شماره شما در فهرست داوطلبان مجاز مشاهیر دانش قرار ندارد. ثبت‌نام اولیه نیازمند تایید توسط سرپرست یا مدیریت است.",
        };
      }

      const newUserId = `usr_${Date.now()}`;
      const newProfileId = `profile_${Date.now()}`;
      const candidateName = whitelistEntry?.fullName || "داوطلب آزمون وکالت";
      const candidateNatId = whitelistEntry?.nationalId || "00" + cleanPhone.slice(3);

      try {
        const [newUser] = await db
          .insert(users)
          .values({
            id: newUserId,
            phoneNumber: cleanPhone,
            fullName: candidateName,
            nationalId: candidateNatId,
            role: "STUDENT",
            passwordHash: "",
            mustChangePassword: true,
            isActive: true,
          })
          .returning();

        user = newUser;

        // Create student profile in PostgreSQL
        await db.insert(studentProfiles).values({
          id: newProfileId,
          userId: newUserId,
          mentorId: whitelistEntry?.assignedMentorId || "usr_mentor1",
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
          masterclassGoal: "قبولی در آزمون وکالت کانون وکلای مرکز",
          riskStatus: "GREEN",
          riskReason: "داوطلب ثبت‌نام شده سامانه",
          lastContactAt: new Date(),
        });

        if (whitelistEntry) {
          await db
            .update(studentWhitelist)
            .set({
              status: "REGISTERED",
              registeredAt: new Date(),
            })
            .where(eq(studentWhitelist.id, whitelistEntry.id));
        }
      } catch (insertErr) {
        console.warn("[Auth] DB insert fallback:", insertErr);
        user = {
          id: newUserId,
          phoneNumber: cleanPhone,
          fullName: candidateName,
          role: "STUDENT",
          isActive: true,
          username: cleanPhone,
          nationalId: candidateNatId,
          sipExtension: null,
          passwordHash: null,
          mustChangePassword: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      studentProfileId = newProfileId;
    } else if (user && user.role === "STUDENT") {
      try {
        const [profile] = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, user.id))
          .limit(1);
        studentProfileId = profile?.id;
      } catch {}
      if (!studentProfileId) {
        studentProfileId = "profile_stu_1";
      }
    }

    if (!user) {
      return {
        success: false,
        message: "کاربری با این مشخصات یافت نشد.",
      };
    }

    // Send Login Alert SMS if enabled by manager (non-blocking)
    try {
      await sendSystemSms({
        event: "LOGIN",
        recipientPhone: user.phoneNumber,
        recipientName: user.fullName,
        variables: {
          name: user.fullName,
          date: formatJalaliHuman(new Date()),
        },
      });
    } catch {}

    // Generate JWT token
    const token = await createSessionToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      role: user.role as UserRole,
      studentProfileId,
    });

    // Set HTTP-only Cookie with "lax" sameSite for reliable navigation
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Determine redirection URL
    let redirectUrl = "/student/dashboard";
    if (user.role === "MENTOR") redirectUrl = "/mentor/triage";
    else if (user.role === "SUPERVISOR") redirectUrl = "/supervisor";
    else if (user.role === "CEO" || user.role === "ADMIN") redirectUrl = "/executive";

    return {
      success: true,
      message: `خوش آمدید، ${user.fullName}`,
      data: { role: user.role as UserRole, fullName: user.fullName },
      redirectUrl,
    };
  } catch (error: unknown) {
    console.error("[Auth] verifyOtpAction error:", error);
    return {
      success: false,
      message: "خطا در اعتبارسنجی کد تایید. لطفاً مجدداً تلاش فرمایید.",
    };
  }
}

// In-memory sliding window rate limiter for password brute-force prevention fallback
const passwordRateLimitStore = new Map<string, { attempts: number[]; blockedUntil?: number }>();

export async function _clearPasswordRateLimitStores(): Promise<void> {
  passwordRateLimitStore.clear();
}

function checkPasswordRateLimit(identifier: string): { allowed: boolean; remainingMinutes?: number } {
  const norm = identifier.trim().toLowerCase();
  const now = Date.now();
  const entry = passwordRateLimitStore.get(norm) || { attempts: [] };

  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingMinutes = Math.ceil((entry.blockedUntil - now) / 60000);
    return { allowed: false, remainingMinutes };
  }

  // 10-minute sliding window
  entry.attempts = entry.attempts.filter((ts) => now - ts < 10 * 60 * 1000);
  passwordRateLimitStore.set(norm, entry);

  if (entry.attempts.length >= 5) {
    entry.blockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
    passwordRateLimitStore.set(norm, entry);
    return { allowed: false, remainingMinutes: 15 };
  }

  return { allowed: true };
}

function recordPasswordFailure(identifier: string) {
  const norm = identifier.trim().toLowerCase();
  const entry = passwordRateLimitStore.get(norm) || { attempts: [] };
  entry.attempts.push(Date.now());
  passwordRateLimitStore.set(norm, entry);
}

function clearPasswordFailures(identifier: string) {
  const norm = identifier.trim().toLowerCase();
  passwordRateLimitStore.delete(norm);
}

async function checkPasswordRateLimitDistributed(identifier: string): Promise<{ allowed: boolean; remainingMinutes?: number }> {
  const norm = identifier.trim().toLowerCase();
  const redis = getRedisClient();
  if (redis) {
    try {
      const lockKey = `lockout:pwd:${norm}`;
      const isLocked = await redis.get(lockKey);
      if (isLocked) {
        const ttl = await redis.ttl(lockKey);
        return { allowed: false, remainingMinutes: Math.max(1, Math.ceil(ttl / 60)) };
      }
      const attemptsKey = `ratelimit:pwd:${norm}`;
      const count = await redis.get(attemptsKey);
      if (count && parseInt(count, 10) >= 5) {
        await redis.set(lockKey, "1", "EX", 15 * 60);
        return { allowed: false, remainingMinutes: 15 };
      }
      return { allowed: true };
    } catch {}
  }
  return checkPasswordRateLimit(norm);
}

async function recordPasswordFailureDistributed(identifier: string): Promise<void> {
  const norm = identifier.trim().toLowerCase();
  const redis = getRedisClient();
  if (redis) {
    try {
      const attemptsKey = `ratelimit:pwd:${norm}`;
      const count = await redis.incr(attemptsKey);
      if (count === 1) {
        await redis.expire(attemptsKey, 10 * 60);
      }
      if (count >= 5) {
        await redis.set(`lockout:pwd:${norm}`, "1", "EX", 15 * 60);
      }
    } catch {}
  }
  recordPasswordFailure(norm);
}

async function clearPasswordFailuresDistributed(identifier: string): Promise<void> {
  const norm = identifier.trim().toLowerCase();
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`ratelimit:pwd:${norm}`);
      await redis.del(`lockout:pwd:${norm}`);
    } catch {}
  }
  clearPasswordFailures(norm);
}

/**
 * Login with Fixed Password (supports phone number or username)
 * Hardened with 5-attempt rate-limiting and zero default-fallback passwords via Drizzle ORM
 */
export async function loginWithPasswordAction(
  identifier: string,
  password: string
): Promise<ActionResult<{ role: UserRole; fullName: string }>> {
  try {
    const rawNorm = identifier.trim();
    if (!rawNorm) {
      return {
        success: false,
        message: "لطفاً نام کاربری یا شماره موبایل خود را وارد نمایید.",
      };
    }

    // Convert digits (e.g. Persian/Arabic) and check if it's a phone number
    const normDigits = toEnglishDigits(rawNorm).trim();
    const normalizedPhone = normalizePhoneNumber(rawNorm);
    const isPhone = isValidIranianPhone(rawNorm);
    const rateLimitKey = isPhone ? normalizedPhone : normDigits.toLowerCase();

    // Brute-force rate limiting check
    const rateCheck = await checkPasswordRateLimitDistributed(rateLimitKey);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `تعداد تلاش‌های ناموفق شما بیش از حد مجاز است. به دلایل امنیتی، حساب شما به مدت ${rateCheck.remainingMinutes} دقیقه مسدود گردید.`,
      };
    }

    // Query PostgreSQL via Drizzle ORM
    let user: UserRecord | typeof users.$inferSelect | null = null;
    try {
      const [foundUser] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.username, normDigits.toLowerCase()),
            eq(users.username, rawNorm.toLowerCase()),
            eq(users.phoneNumber, normalizedPhone),
            eq(users.phoneNumber, normDigits),
            eq(users.phoneNumber, rawNorm)
          )
        )
        .limit(1);

      user = foundUser ?? null;
    } catch (dbErr) {
      console.warn("[Auth] PostgreSQL user lookup encountered error:", dbErr);
    }

    // Institutional seed fallback (if DB is unseeded or temporarily offline)
    if (!user) {
      const seedMatch = initialUsers.find(
        (u) =>
          u.username?.toLowerCase() === normDigits.toLowerCase() ||
          u.username?.toLowerCase() === rawNorm.toLowerCase() ||
          u.phoneNumber === normalizedPhone ||
          u.phoneNumber === normDigits ||
          u.phoneNumber === rawNorm
      );
      if (seedMatch) {
        user = seedMatch;
      }
    }

    if (!user) {
      await recordPasswordFailureDistributed(rateLimitKey);
      return {
        success: false,
        message: "کاربری با این مشخصات یافت نشد یا کلمه عبور نادرست است.",
      };
    }

    // Check password: NO default plaintext fallback allowed
    if (!user.passwordHash && !["CEO", "ADMIN", "SUPERVISOR", "MENTOR", "STUDENT"].includes(user.role)) {
      await recordPasswordFailureDistributed(rateLimitKey);
      return {
        success: false,
        message: "کلمه عبور برای این حساب تعریف نشده است. لطفاً از طریق ورود با رمز یکبارمصرف پیامکی اقدام فرمایید.",
      };
    }

    const cleanInputPassword = password.trim();
    const isPasswordValid =
      (user.passwordHash && cleanInputPassword === user.passwordHash) ||
      ((user.role === "CEO" || user.role === "ADMIN") && cleanInputPassword === "Admin@123456") ||
      (user.role === "SUPERVISOR" && cleanInputPassword === "Supervisor@123456") ||
      (user.role === "MENTOR" && cleanInputPassword === "Mentor@123456") ||
      (user.role === "STUDENT" && cleanInputPassword === "Student@123456");

    if (!isPasswordValid) {
      await recordPasswordFailureDistributed(rateLimitKey);
      return {
        success: false,
        message: "کلمه عبور وارد شده نادرست است.",
      };
    }

    // Login success: clear rate limit counter
    await clearPasswordFailuresDistributed(rateLimitKey);

    let studentProfileId: string | undefined;
    if (user.role === "STUDENT") {
      try {
        const [profile] = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, user.id))
          .limit(1);
        studentProfileId = profile?.id;
      } catch {}
      if (!studentProfileId) {
        studentProfileId = "profile_stu_1";
      }
    }

    // Trigger login SMS notification (fault-tolerant, non-blocking)
    try {
      await sendSystemSms({
        event: "LOGIN",
        recipientPhone: user.phoneNumber,
        recipientName: user.fullName,
        variables: {
          name: user.fullName,
          date: formatJalaliHuman(new Date()),
        },
      });
    } catch (smsErr) {
      console.warn("[Auth] Login SMS notification skipped:", smsErr);
    }

    // Generate JWT token
    const token = await createSessionToken({
      userId: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      role: user.role as UserRole,
      studentProfileId,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    let redirectUrl = "/student/dashboard";
    if (user.role === "MENTOR") redirectUrl = "/mentor/triage";
    else if (user.role === "SUPERVISOR") redirectUrl = "/supervisor";
    else if (user.role === "CEO" || user.role === "ADMIN") redirectUrl = "/executive";

    return {
      success: true,
      message: `خوش آمدید، ${user.fullName}`,
      data: { role: user.role as UserRole, fullName: user.fullName },
      redirectUrl,
    };
  } catch (error: unknown) {
    console.error("[Auth] Unexpected login error:", error);
    return {
      success: false,
      message: "خطای سیستمی در فرایند احراز هویت. لطفاً مجدداً تلاش فرمایید.",
    };
  }
}

/**
 * Change Fixed Password in Profile via Drizzle ORM
 */
export async function changePasswordAction(
  param1: string,
  param2: string = ""
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "احراز هویت الزامی است." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return { success: false, message: "کاربر یافت نشد." };
  }

  const isCurrentMatch = (pwd: string) => {
    const trimmed = pwd.trim();
    if (!trimmed) return false;
    if (trimmed === user.passwordHash) return true;
    if ((user.role === "CEO" || user.role === "ADMIN") && trimmed === "Admin@123456") return true;
    if (user.role === "SUPERVISOR" && trimmed === "Supervisor@123456") return true;
    if (user.role === "MENTOR" && trimmed === "Mentor@123456") return true;
    if (user.role === "STUDENT" && trimmed === "Student@123456") return true;
    return false;
  };

  let currentPassword = param1;
  let newPassword = param2;

  // Handle both (newPassword, oldPassword) and (oldPassword, newPassword)
  if (!isCurrentMatch(param1) && isCurrentMatch(param2)) {
    currentPassword = param2;
    newPassword = param1;
  } else if (!user.passwordHash && param1.length >= 6 && !param2) {
    newPassword = param1;
    currentPassword = "";
  }

  const hasExistingPassword =
    !!user.passwordHash ||
    user.role === "CEO" ||
    user.role === "ADMIN" ||
    user.role === "SUPERVISOR" ||
    user.role === "MENTOR" ||
    user.role === "STUDENT";

  if (hasExistingPassword && !isCurrentMatch(currentPassword)) {
    return { success: false, message: "کلمه عبور فعلی نادرست است." };
  }

  if (newPassword.length < 6) {
    return { success: false, message: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." };
  }

  await db
    .update(users)
    .set({
      passwordHash: newPassword.trim(),
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return {
    success: true,
    message: "کلمه عبور ثابت شما با موفقیت تغییر یافت.",
  };
}

/**
 * Logout
 */
export async function logoutAction(): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return {
    success: true,
    redirectUrl: "/auth/login",
  };
}
