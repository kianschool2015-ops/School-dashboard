"use server";

import { requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import { studentProfiles, users, studentWhitelist } from "../db/schema";
import { eq, and, isNull, inArray, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendSystemSms } from "../services/sms";

export interface UnassignedStudentRow {
  profileId: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string | null;
  enrolledCourseName: string | null;
  enrolledCourseCode: string | null;
  provisioningSource: string;
  createdAt: Date;
}

export interface MentorOption {
  id: string;
  fullName: string;
  phoneNumber: string;
  studentCount: number;
}

/**
 * Fetch all students with active support who have not been assigned a mentor yet
 */
export async function getUnassignedStudentsAction(): Promise<UnassignedStudentRow[]> {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    const rows = await db
      .select({
        profileId: studentProfiles.id,
        userId: users.id,
        fullName: users.fullName,
        phoneNumber: users.phoneNumber,
        nationalId: users.nationalId,
        enrolledCourseName: studentProfiles.enrolledCourseName,
        enrolledCourseCode: studentProfiles.enrolledCourseCode,
        provisioningSource: studentProfiles.provisioningSource,
        createdAt: studentProfiles.createdAt,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(
        and(
          eq(studentProfiles.hasActiveSupport, true),
          isNull(studentProfiles.mentorId)
        )
      )
      .orderBy(desc(studentProfiles.createdAt));

    return rows;
  } catch (err) {
    console.error("[getUnassignedStudentsAction] Error querying unassigned students:", err);
    return [];
  }
}

/**
 * Fetch all active mentors with their current assigned student count
 */
export async function getActiveMentorsAction(): Promise<MentorOption[]> {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    const mentorUsers = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(and(eq(users.role, "MENTOR"), eq(users.isActive, true)));

    const countRows = await db
      .select({
        mentorId: studentProfiles.mentorId,
        studentCount: count(),
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.hasActiveSupport, true))
      .groupBy(studentProfiles.mentorId);

    const countsMap = new Map<string, number>();
    for (const r of countRows) {
      if (r.mentorId) {
        countsMap.set(r.mentorId, Number(r.studentCount));
      }
    }

    return mentorUsers.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      phoneNumber: m.phoneNumber,
      studentCount: countsMap.get(m.id) || 0,
    }));
  } catch (err) {
    console.error("[getActiveMentorsAction] Error querying active mentors:", err);
    return [];
  }
}

/**
 * Assign a dedicated mentor to a single student profile
 */
export async function assignMentorToStudentAction(
  studentProfileId: string,
  mentorId: string
): Promise<{ success: boolean; message: string }> {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  if (!studentProfileId || !mentorId) {
    return { success: false, message: "شناسه داوطلب و شناسه پشتیبان الزامی است." };
  }

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    // Check mentor
    const [mentorUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, mentorId), eq(users.role, "MENTOR")))
      .limit(1);

    if (!mentorUser) {
      return { success: false, message: "پشتیبان آموزشی انتخاب شده در سامانه معتبر نیست." };
    }

    // Check student profile
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, studentProfileId))
      .limit(1);

    if (!profile) {
      return { success: false, message: "پرونده تحصیلی داوطلب یافت نشد." };
    }

    const [studentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, profile.userId))
      .limit(1);

    // Update studentProfiles
    await db
      .update(studentProfiles)
      .set({
        mentorId,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, studentProfileId));

    // Update whitelist record if exists
    if (studentUser) {
      await db
        .update(studentWhitelist)
        .set({
          assignedMentorId: mentorId,
          assignedMentorName: mentorUser.fullName,
        })
        .where(eq(studentWhitelist.phoneNumber, studentUser.phoneNumber));

      // Send SMS notification
      sendSystemSms({
        event: "MENTOR_ASSIGNED",
        recipientPhone: studentUser.phoneNumber,
        recipientName: studentUser.fullName,
        variables: {
          name: studentUser.fullName,
          mentor: mentorUser.fullName,
        },
      }).catch((err) => {
        console.warn(`[assignMentorToStudentAction] SMS delivery warning for ${studentUser.phoneNumber}:`, err);
      });
    }

    revalidatePath("/supervisor/unassigned-students");
    revalidatePath("/supervisor");
    revalidatePath("/settings");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: `پشتیبان «${mentorUser.fullName}» با موفقیت برای داوطلب «${studentUser?.fullName || "داوطلب"}» تعیین گردید.`,
    };
  } catch (err: unknown) {
    console.error("[assignMentorToStudentAction] Assignment error:", err);
    return {
      success: false,
      message: (err as Error)?.message || "خطا در فرآیند تعیین پشتیبان داوطلب.",
    };
  }
}

/**
 * Bulk assign a dedicated mentor to multiple student profiles simultaneously
 */
export async function bulkAssignMentorToStudentsAction(
  studentProfileIds: string[],
  mentorId: string
): Promise<{ success: boolean; message: string; count: number }> {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  if (!studentProfileIds.length || !mentorId) {
    return { success: false, message: "حداقل یک داوطلب و یک پشتیبان انتخاب نمایید.", count: 0 };
  }

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    const [mentorUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, mentorId), eq(users.role, "MENTOR")))
      .limit(1);

    if (!mentorUser) {
      return { success: false, message: "پشتیبان آموزشی انتخاب شده معتبر نیست.", count: 0 };
    }

    // Query profiles to know their user IDs for SMS & whitelist update
    const profiles = await db
      .select({
        profileId: studentProfiles.id,
        userId: studentProfiles.userId,
      })
      .from(studentProfiles)
      .where(inArray(studentProfiles.id, studentProfileIds));

    if (!profiles.length) {
      return { success: false, message: "هیچ پرونده تحصیلی متناظری یافت نشد.", count: 0 };
    }

    // Update profiles
    await db
      .update(studentProfiles)
      .set({
        mentorId,
        updatedAt: new Date(),
      })
      .where(inArray(studentProfiles.id, studentProfileIds));

    // Update whitelist and fire SMS for users
    const userIds = profiles.map((p) => p.userId);
    const candidateUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));

    for (const u of candidateUsers) {
      db.update(studentWhitelist)
        .set({
          assignedMentorId: mentorId,
          assignedMentorName: mentorUser.fullName,
        })
        .where(eq(studentWhitelist.phoneNumber, u.phoneNumber))
        .catch(() => {});

      sendSystemSms({
        event: "MENTOR_ASSIGNED",
        recipientPhone: u.phoneNumber,
        recipientName: u.fullName,
        variables: {
          name: u.fullName,
          mentor: mentorUser.fullName,
        },
      }).catch(() => {});
    }

    revalidatePath("/supervisor/unassigned-students");
    revalidatePath("/supervisor");
    revalidatePath("/settings");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: `تعداد ${studentProfileIds.length} داوطلب با موفقیت به پشتیبان «${mentorUser.fullName}» تخصیص داده شدند.`,
      count: studentProfileIds.length,
    };
  } catch (err: unknown) {
    console.error("[bulkAssignMentorToStudentsAction] Bulk assignment error:", err);
    return {
      success: false,
      message: (err as Error)?.message || "خطا در تخصیص گروهی پشتیبان به داوطلبان.",
      count: 0,
    };
  }
}
