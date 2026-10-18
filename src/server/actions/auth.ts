"use server";

import { cookies } from "next/headers";
import { isValidIranianPhone, checkOtpRateLimit, generateOtp, verifyOtp } from "../auth/otp";
import { createSessionToken } from "../auth/jwt";
import { getSession } from "../auth/guard";
import { memoryRepo } from "../db";
import { sendSystemSms } from "../services/sms";
import { formatJalaliHuman } from "@/lib/jalali";
import type { UserRole } from "@/types/models";

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
  if (!isValidIranianPhone(phone)) {
    return {
      success: false,
      message: "شماره موبایل نامعتبر است. فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹",
    };
  }

  const rateCheck = checkOtpRateLimit(phone);
  if (!rateCheck.allowed) {
    return {
      success: false,
      message: `تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً ${rateCheck.remainingMinutes} دقیقه دیگر تلاش کنید.`,
    };
  }

  const { code, expiresInSeconds } = generateOtp(phone);

  // Dispatch OTP via Kavenegar SMS lookup service
  await sendSystemSms({
    event: "LOGIN",
    recipientPhone: phone.trim(),
    recipientName: "کاربر گرامی پشتیبانی مشاهیر دانش",
    token: code,
    variables: {
      token: code,
      name: "کاربر گرامی",
      date: formatJalaliHuman(new Date()),
    },
    customText: `کد ورود اختصاصی: ${code}\nاعتبار: ۲ دقیقه\nپشتیبانی مشاهیر دانش`,
  });

  return {
    success: true,
    message: `کد تایید ۵ رقمی برای شماره ${phone} ارسال گردید (انقضا در ${expiresInSeconds} ثانیه).`,
  };
}

/**
 * Verify OTP and authenticate user
 * Enforces Whitelist for new student registrations
 */
export async function verifyOtpAction(
  phone: string,
  code: string
): Promise<ActionResult<{ role: UserRole; fullName: string }>> {
  if (!isValidIranianPhone(phone)) {
    return {
      success: false,
      message: "شماره موبایل نامعتبر است.",
    };
  }

  const isValid = verifyOtp(phone, code);
  if (!isValid) {
    return {
      success: false,
      message: "کد تایید وارد شده نادرست است یا منقضی شده است.",
    };
  }

  // Lookup user or verify against Excel Whitelist
  let user = memoryRepo.getUserByPhone(phone);
  let studentProfileId: string | undefined;

  if (!user) {
    // Check if student phone is whitelisted
    const whitelistEntry = memoryRepo.isPhoneOrNationalIdWhitelisted(phone);
    if (!whitelistEntry) {
      return {
        success: false,
        message: "شماره شما در فهرست داوطلبان مجاز مشاهیر دانش قرار ندارد. ثبت‌نام اولیه نیازمند تایید توسط سرپرست یا مدیریت است.",
      };
    }

    const newUserId = `usr_${Date.now()}`;
    const newProfileId = `profile_${Date.now()}`;
    user = {
      id: newUserId,
      phoneNumber: phone.trim(),
      fullName: whitelistEntry.fullName,
      nationalId: whitelistEntry.nationalId,
      role: "STUDENT",
      passwordHash: "password123", // Default initial password
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryRepo.users.set(newUserId, user);

    // Create student profile
    memoryRepo.studentProfiles.set(newProfileId, {
      id: newProfileId,
      userId: newUserId,
      mentorId: whitelistEntry.assignedMentorId || "usr_mentor1",
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
      riskReason: "داوطلب تاییدشده از لیست سفید",
      lastContactAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    studentProfileId = newProfileId;

    memoryRepo.markWhitelistRegistered(phone);
  } else if (user.role === "STUDENT") {
    const profile = memoryRepo.getStudentProfileByUserId(user.id);
    studentProfileId = profile?.id;
  }

  // Send Login Alert SMS if enabled by manager (default: true)
  await sendSystemSms({
    event: "LOGIN",
    recipientPhone: user.phoneNumber,
    recipientName: user.fullName,
    variables: {
      name: user.fullName,
      date: formatJalaliHuman(new Date()),
    },
  });

  // Generate JWT token
  const token = await createSessionToken({
    userId: user.id,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    role: user.role,
    studentProfileId,
  });

  // Set HTTP-only Cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
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
    data: { role: user.role, fullName: user.fullName },
    redirectUrl,
  };
}

/**
 * Login with Fixed Password (supports phone number or username: admin, adminsupervisor, etc.)
 */
export async function loginWithPasswordAction(
  identifier: string,
  password: string
): Promise<ActionResult<{ role: UserRole; fullName: string }>> {
  const norm = identifier.trim();
  if (!norm) {
    return {
      success: false,
      message: "لطفاً نام کاربری یا شماره موبایل خود را وارد نمایید.",
    };
  }

  const user = memoryRepo.getUserByUsernameOrPhone(norm);
  if (!user) {
    return {
      success: false,
      message: "کاربری با این مشخصات یافت نشد. لطفاً نام کاربری یا شماره موبایل را بررسی فرمایید.",
    };
  }

  // Check password
  const expectedPassword = user.passwordHash || "123456";
  if (password.trim() !== expectedPassword) {
    return {
      success: false,
      message: "کلمه عبور وارد شده نادرست است.",
    };
  }

  let studentProfileId: string | undefined;
  if (user.role === "STUDENT") {
    const profile = memoryRepo.getStudentProfileByUserId(user.id);
    studentProfileId = profile?.id;
  }

  // Trigger login SMS notification
  await sendSystemSms({
    event: "LOGIN",
    recipientPhone: user.phoneNumber,
    recipientName: user.fullName,
    variables: {
      name: user.fullName,
      date: formatJalaliHuman(new Date()),
    },
  });

  // Generate JWT token
  const token = await createSessionToken({
    userId: user.id,
    phoneNumber: user.phoneNumber,
    fullName: user.fullName,
    role: user.role,
    studentProfileId,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
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
    data: { role: user.role, fullName: user.fullName },
    redirectUrl,
  };
}

/**
 * Change Fixed Password in Profile
 */
export async function changePasswordAction(
  param1: string,
  param2: string = ""
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return { success: false, message: "احراز هویت الزامی است." };
  }

  const user = memoryRepo.getUserById(session.userId);
  if (!user) {
    return { success: false, message: "کاربر یافت نشد." };
  }

  const expected = user.passwordHash || "password123";

  let currentPassword = param1;
  let newPassword = param2;

  // Handle both (currentPassword, newPassword) and (newPassword, currentPassword)
  if (param1.trim() !== expected && param2.trim() === expected) {
    currentPassword = param2;
    newPassword = param1;
  } else if (!user.passwordHash && param1.length >= 6 && !param2) {
    newPassword = param1;
    currentPassword = "";
  }

  if (user.passwordHash && currentPassword.trim() !== expected) {
    return { success: false, message: "کلمه عبور فعلی نادرست است." };
  }

  if (newPassword.length < 6) {
    return { success: false, message: "کلمه عبور جدید باید حداقل ۶ کاراکتر باشد." };
  }

  memoryRepo.updateUserPassword(user.id, newPassword.trim());

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
