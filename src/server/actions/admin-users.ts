"use server";

import { requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import { users, studentProfiles, studentWhitelist, mentorCallingWindows } from "../db/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { hashPassword } from "@/lib/password";
import { sanitizeTextContent } from "@/lib/sanitize";
import type { UserRole, UserRecord } from "@/types/models";

export interface SanitizedAdminUser {
  id: string;
  username: string;
  phoneNumber: string;
  nationalId?: string | null;
  fullName: string;
  role: UserRole;
  sipExtension?: string | null;
  canCreateExams: boolean;
  isActive: boolean;
  garnetUsername?: string | null;
  createdAt: Date;
  updatedAt: Date;
  mentorName?: string | null;
  // Layer 5 DRM & Security Monitor properties
  hasActiveSupport?: boolean | null;
  suspensionReason?: string | null;
  acceptedLegalTermsAt?: Date | null;
  acceptedLegalTermsIp?: string | null;
  lastCentralCheckAt?: Date | null;
  lastCentralCheckResult?: string | null;
  provisioningSource?: string | null;
}

/**
 * List all users with optional filtering and search (CEO / ADMIN Only)
 */
export async function listUsersAction(params?: {
  search?: string;
  role?: UserRole | "ALL";
  status?: "ALL" | "ACTIVE" | "INACTIVE";
}): Promise<{
  users: SanitizedAdminUser[];
  total: number;
}> {
  await requireRole(["CEO", "ADMIN"]);
  await ensureDatabaseBootstrap().catch(() => {});

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      phoneNumber: users.phoneNumber,
      nationalId: users.nationalId,
      fullName: users.fullName,
      role: users.role,
      sipExtension: users.sipExtension,
      canCreateExams: users.canCreateExams,
      isActive: users.isActive,
      garnetUsername: users.garnetUsername,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      hasActiveSupport: studentProfiles.hasActiveSupport,
      suspensionReason: studentProfiles.suspensionReason,
      acceptedLegalTermsAt: studentProfiles.acceptedLegalTermsAt,
      acceptedLegalTermsIp: studentProfiles.acceptedLegalTermsIp,
      lastCentralCheckAt: studentProfiles.lastEntitlementCheckAt,
      lastCentralCheckResult: studentProfiles.lastCentralCheckResult,
      provisioningSource: studentProfiles.provisioningSource,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .orderBy(desc(users.createdAt));

  let filtered = allUsers;

  if (params?.role && params.role !== "ALL") {
    filtered = filtered.filter((u) => u.role === params.role);
  }

  if (params?.status && params.status !== "ALL") {
    const isAct = params.status === "ACTIVE";
    filtered = filtered.filter((u) => u.isActive === isAct);
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.phoneNumber && u.phoneNumber.includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.sipExtension && u.sipExtension.includes(q))
    );
  }

  return {
    users: filtered as SanitizedAdminUser[],
    total: filtered.length,
  };
}

/**
 * Create a new user manually (CEO / ADMIN Only)
 */
export async function createUserAction(payload: {
  fullName: string;
  username: string;
  phoneNumber: string;
  nationalId?: string;
  role: UserRole;
  password?: string;
  sipExtension?: string;
  canCreateExams?: boolean;
  assignedMentorId?: string;
}): Promise<{ success: boolean; message: string; user?: SanitizedAdminUser }> {
  try {
    await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    // Normalize phone and username digits
    const cleanPhone = payload.phoneNumber
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/[\s-]/g, "")
      .trim();

    const cleanUsername = payload.username
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .trim()
      .toLowerCase();

    const cleanFullName = sanitizeTextContent(payload.fullName.trim());

    if (!cleanFullName || !cleanPhone || !cleanUsername) {
      return { success: false, message: "تکمیل نام، نام کاربری و شماره همراه الزامی است." };
    }

    // Check uniqueness
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.username, cleanUsername), eq(users.phoneNumber, cleanPhone)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, message: "کاربری با این نام کاربری یا شماره همراه قبلاً در سامانه ثبت شده است." };
    }

    const userId = `usr_${payload.role.toLowerCase()}_${Date.now()}`;
    const plainPassword = payload.password?.trim() || `${payload.role.charAt(0).toUpperCase() + payload.role.slice(1).toLowerCase()}@123456`;
    const passwordHash = hashPassword(plainPassword);

    await db.insert(users).values({
      id: userId,
      username: cleanUsername,
      phoneNumber: cleanPhone,
      nationalId: payload.nationalId?.trim() || null,
      fullName: cleanFullName,
      role: payload.role,
      passwordHash,
      sipExtension: payload.sipExtension?.trim() || null,
      canCreateExams: payload.canCreateExams ?? (payload.role === "CEO" || payload.role === "ADMIN"),
      isActive: true,
    });

    // If STUDENT, create profile and whitelist entry
    if (payload.role === "STUDENT") {
      const profileId = `profile_${userId}`;
      await db.insert(studentProfiles).values({
        id: profileId,
        userId,
        mentorId: payload.assignedMentorId || "usr_mentor1",
        employmentStatus: "UNEMPLOYED",
        isStudent: false,
        maritalStatus: "SINGLE",
        hasChildren: false,
        childrenCount: 0,
        hasFamilyCareDuty: false,
        workdayStudyHoursCap: 8,
        holidayStudyHoursCap: 11,
        bestStudyTime: "MORNING",
        primaryConstraint: "تمرکز بر آزمون وکالت",
        previousBarExamAttempts: 0,
        currentDailyStudyHours: 7,
        selfBaselineAssessment: "سطح آمادگی اولیه داوطلب",
        masterclassGoal: "قبولی در کانون وکلای دادگستری",
        riskStatus: "GREEN",
        riskReason: "داوطلب جدید",
        enrolledCourseCode: "GARNET-BAR-360",
        enrolledCourseName: "دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)",
        hasActiveSupport: true,
      });

      await db.insert(studentWhitelist).values({
        id: `wl_${userId}`,
        nationalId: payload.nationalId?.trim() || "0000000000",
        phoneNumber: cleanPhone,
        fullName: cleanFullName,
        assignedMentorId: payload.assignedMentorId || "usr_mentor1",
        status: "REGISTERED",
      });
    }

    // If MENTOR, create default calling window
    if (payload.role === "MENTOR") {
      await db.insert(mentorCallingWindows).values({
        id: `window_${userId}`,
        mentorId: userId,
        startTime: "17:00",
        endTime: "20:00",
        daysOfWeek: [0, 1, 2, 3, 4],
        dailyDurationHours: 3,
        isActive: true,
        announcement: "پاسخگویی مستقیم تلفنی به داوطلبان",
      });
    }

    revalidatePath("/executive/users");
    revalidatePath("/executive");
    revalidatePath("/mentor/students");

    return {
      success: true,
      message: `کاربر جدید «${cleanFullName}» با نقش «${payload.role}» با موفقیت ثبت گردید. (رمز عبور موقت: ${plainPassword})`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "خطا در ثبت کاربر جدید.",
    };
  }
}

/**
 * Update user profile & role (CEO / ADMIN Only)
 */
export async function updateUserAction(payload: {
  userId: string;
  fullName?: string;
  phoneNumber?: string;
  role?: UserRole;
  sipExtension?: string;
  canCreateExams?: boolean;
  isActive?: boolean;
  newPassword?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "کاربر مورد نظر یافت نشد." };
    }

    // Protection: Prevent demoting self from CEO/ADMIN
    if (targetUser.id === session.userId && payload.role && payload.role !== session.role) {
      return { success: false, message: "امکان تغییر نقش حساب کاربری خود وجود ندارد." };
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (payload.fullName) {
      updates.fullName = sanitizeTextContent(payload.fullName.trim());
    }

    if (payload.phoneNumber) {
      const cleanPhone = payload.phoneNumber
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[\s-]/g, "")
        .trim();
      updates.phoneNumber = cleanPhone;
    }

    if (payload.role) {
      updates.role = payload.role;
    }

    if (payload.sipExtension !== undefined) {
      updates.sipExtension = payload.sipExtension?.trim() || null;
    }

    if (payload.canCreateExams !== undefined) {
      updates.canCreateExams = payload.canCreateExams;
    }

    if (payload.isActive !== undefined) {
      updates.isActive = payload.isActive;
    }

    if (payload.newPassword && payload.newPassword.trim().length >= 6) {
      updates.passwordHash = hashPassword(payload.newPassword.trim());
    }

    await db.update(users).set(updates).where(eq(users.id, payload.userId));

    revalidatePath("/executive/users");
    revalidatePath("/executive");
    revalidatePath("/mentor/students");

    return {
      success: true,
      message: `اطلاعات کاربر «${payload.fullName || targetUser.fullName}» با موفقیت به‌روزرسانی شد.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "خطا در ویرایش کاربر.",
    };
  }
}

/**
 * Delete a user (CEO / ADMIN Only)
 */
export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    if (userId === session.userId) {
      return { success: false, message: "امکان حذف حساب کاربری جاری وجود ندارد." };
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "کاربر مورد نظر یافت نشد." };
    }

    // Delete cascading dependencies explicitly if needed
    await db.delete(studentProfiles).where(eq(studentProfiles.userId, userId));
    await db.delete(studentWhitelist).where(eq(studentWhitelist.phoneNumber, targetUser.phoneNumber));
    await db.delete(mentorCallingWindows).where(eq(mentorCallingWindows.mentorId, userId));
    await db.delete(users).where(eq(users.id, userId));

    revalidatePath("/executive/users");
    revalidatePath("/executive");
    revalidatePath("/mentor/students");

    return {
      success: true,
      message: `کاربر «${targetUser.fullName}» با موفقیت از سامانه حذف گردید.`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "خطا در حذف کاربر.",
    };
  }
}

/**
 * Toggle active/inactive status of a user
 */
export async function toggleUserStatusAction(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    if (userId === session.userId) {
      return { success: false, message: "امکان غیرفعال‌سازی حساب کاربری جاری وجود ندارد." };
    }

    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId));

    revalidatePath("/executive/users");

    return {
      success: true,
      message: isActive ? "حساب کاربری فعال گردید." : "حساب کاربری غیرفعال گردید.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "خطا در تغییر وضعیت کاربر.",
    };
  }
}

/**
 * Toggle Exam Authoring Privilege for Mentors
 * Strictly restricted to Admins / CEO
 */
export async function toggleMentorExamCreationAction(
  mentorId: string,
  enabled: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["CEO", "ADMIN"]);

    if (!mentorId) {
      return { success: false, message: "شناسه پشتیبان الزامی است." };
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, mentorId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "کاربر مورد نظر یافت نشد." };
    }

    await db
      .update(users)
      .set({
        canCreateExams: enabled,
        updatedAt: new Date(),
      })
      .where(eq(users.id, mentorId));

    revalidatePath("/executive");
    revalidatePath("/executive/users");
    revalidatePath("/settings");
    revalidatePath("/exams");
    revalidatePath("/exams/builder");

    return {
      success: true,
      message: enabled
        ? `مجوز طراحی و بارگذاری آزمون برای «${targetUser.fullName}» فعال گردید.`
        : `مجوز طراحی و بارگذاری آزمون از «${targetUser.fullName}» سلب گردید.`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در به‌روزرسانی دسترسی پشتیبان.",
    };
  }
}

/**
 * Layer 5 DRM: On-demand live central API entitlement check for a student
 */
export async function forceCheckStudentEntitlementAction(userId: string): Promise<{
  success: boolean;
  message: string;
  active?: boolean;
  lastCheckAt?: string;
  lastCheckResult?: string;
}> {
  try {
    await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    const { verifyStudentCourseHeartbeat } = await import("../services/garnet");
    const result = await verifyStudentCourseHeartbeat(userId);

    revalidatePath("/executive/users");

    return {
      success: true,
      message: result.active
        ? "استعلام وب‌سرویس انجام شد: سفارش و دوره فعال در حساب کاربری مشاهیر تایید گردید."
        : `استعلام وب‌سرویس انجام شد: دسترسی مسدود گردید (${result.reason || "فاقد دوره معتبر"}).`,
      active: result.active,
      lastCheckAt: new Date().toISOString(),
      lastCheckResult: result.active ? "SUCCESS_ENTITLED" : "REVOKED_NO_ACTIVE_ORDER",
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "خطا در استعلام وب‌سرویس.",
    };
  }
}

/**
 * Layer 5 DRM: Instant Account Suspension & Session Eviction
 */
export async function toggleUserSuspensionAction(
  userId: string,
  suspend: boolean,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireRole(["CEO", "ADMIN"]);
    await ensureDatabaseBootstrap().catch(() => {});

    if (userId === session.userId) {
      return { success: false, message: "امکان مسدودسازی حساب کاربری جاری وجود ندارد." };
    }

    const now = new Date();

    if (suspend) {
      await db
        .update(users)
        .set({ isActive: false, updatedAt: now })
        .where(eq(users.id, userId));

      await db
        .update(studentProfiles)
        .set({
          hasActiveSupport: false,
          suspensionReason: reason || "MANUAL_ADMIN_SUSPENSION",
          updatedAt: now,
        })
        .where(eq(studentProfiles.userId, userId));

      // Revoke all active sessions immediately
      const { revokeAllUserSessions } = await import("../auth/jwt");
      await revokeAllUserSessions(userId);

      try {
        const { auditLogs } = await import("../db/schema");
        await db.insert(auditLogs).values({
          id: `log_suspend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          actorId: session.userId,
          action: "ADMIN_SUSPEND_USER",
          targetEntity: "users",
          targetId: userId,
          metadata: { reason: reason || "MANUAL_ADMIN_SUSPENSION", targetUserId: userId },
          createdAt: now,
        });
      } catch {}

      revalidatePath("/executive/users");

      return {
        success: true,
        message: "حساب کاربری داوطلب و دسترسی به دوره‌ها فوراً مسدود و نشست‌های فعال ابطال گردید.",
      };
    } else {
      await db
        .update(users)
        .set({ isActive: true, updatedAt: now })
        .where(eq(users.id, userId));

      await db
        .update(studentProfiles)
        .set({
          hasActiveSupport: true,
          suspensionReason: null,
          updatedAt: now,
        })
        .where(eq(studentProfiles.userId, userId));

      revalidatePath("/executive/users");

      return {
        success: true,
        message: "حساب کاربری و دسترسی پشتیبانی داوطلب با موفقیت مجدداً فعال گردید.",
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "خطا در تغییر وضعیت مسدودسازی کاربر.",
    };
  }
}
