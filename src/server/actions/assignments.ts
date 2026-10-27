"use server";

import { requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import { users, studentProfiles, studentWhitelist } from "../db/schema";
import { eq, inArray, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface SupervisorFolderItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId?: string | null;
  assignedMentorsCount: number;
  assignedStudentsTotalCount: number;
}

export interface MentorAssignmentItem {
  id: string;
  fullName: string;
  phoneNumber: string;
  supervisorId?: string | null;
  supervisorName?: string | null;
  assignedStudentsCount: number;
  maxCapacity: number;
  capacityPercentage: number;
  sipExtension?: string | null;
}

export interface StudentAssignmentItem {
  id: string; // student profile id
  userId: string;
  fullName: string;
  phoneNumber: string;
  nationalId?: string | null;
  enrolledCourseName?: string | null;
  mentorId?: string | null;
  mentorName?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  hasActiveSupport: boolean;
  riskStatus: string;
  createdAt: Date;
}

export interface AssignmentHubData {
  supervisors: SupervisorFolderItem[];
  mentors: MentorAssignmentItem[];
  students: StudentAssignmentItem[];
  unassignedStudents: StudentAssignmentItem[];
  currentUserRole: string;
  currentUserId: string;
}

/**
 * Fetch complete hierarchy and folder data for the Assignment Hub
 */
export async function getAssignmentHubDataAction(): Promise<AssignmentHubData> {
  const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);
  await ensureDatabaseBootstrap().catch(() => {});

  // 1. Fetch all supervisors
  const rawSupervisors = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phoneNumber: users.phoneNumber,
      nationalId: users.nationalId,
    })
    .from(users)
    .where(eq(users.role, "SUPERVISOR"))
    .orderBy(users.fullName);

  // 2. Fetch all mentors
  const rawMentors = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      phoneNumber: users.phoneNumber,
      supervisorId: users.supervisorId,
      sipExtension: users.sipExtension,
    })
    .from(users)
    .where(eq(users.role, "MENTOR"))
    .orderBy(users.fullName);

  // Map of supervisors
  const supervisorMap = new Map(rawSupervisors.map((s) => [s.id, s.fullName]));

  // 3. Fetch all student profiles with user details
  const rawProfiles = await db
    .select({
      profileId: studentProfiles.id,
      userId: studentProfiles.userId,
      mentorId: studentProfiles.mentorId,
      enrolledCourseName: studentProfiles.enrolledCourseName,
      hasActiveSupport: studentProfiles.hasActiveSupport,
      riskStatus: studentProfiles.riskStatus,
      createdAt: studentProfiles.createdAt,
      userFullName: users.fullName,
      userPhoneNumber: users.phoneNumber,
      userNationalId: users.nationalId,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .orderBy(desc(studentProfiles.createdAt));

  // Count students per mentor
  const studentCountPerMentor = new Map<string, number>();
  for (const p of rawProfiles) {
    if (p.mentorId) {
      const current = studentCountPerMentor.get(p.mentorId) || 0;
      studentCountPerMentor.set(p.mentorId, current + 1);
    }
  }

  // Format mentors
  const mentorMap = new Map<string, { fullName: string; supervisorId: string | null }>();
  const mentors: MentorAssignmentItem[] = rawMentors.map((m) => {
    const studentCount = studentCountPerMentor.get(m.id) || 0;
    const maxCap = 50; // Standard mentor capacity guideline
    const capPct = Math.min(100, Math.round((studentCount / maxCap) * 100));
    mentorMap.set(m.id, { fullName: m.fullName, supervisorId: m.supervisorId });

    return {
      id: m.id,
      fullName: m.fullName,
      phoneNumber: m.phoneNumber,
      supervisorId: m.supervisorId || null,
      supervisorName: m.supervisorId ? supervisorMap.get(m.supervisorId) || null : null,
      assignedStudentsCount: studentCount,
      maxCapacity: maxCap,
      capacityPercentage: capPct,
      sipExtension: m.sipExtension || null,
    };
  });

  // Calculate stats for supervisors
  const mentorsPerSupervisor = new Map<string, number>();
  const studentsPerSupervisor = new Map<string, number>();

  for (const m of mentors) {
    if (m.supervisorId) {
      const prevM = mentorsPerSupervisor.get(m.supervisorId) || 0;
      mentorsPerSupervisor.set(m.supervisorId, prevM + 1);

      const prevS = studentsPerSupervisor.get(m.supervisorId) || 0;
      studentsPerSupervisor.set(m.supervisorId, prevS + m.assignedStudentsCount);
    }
  }

  const supervisors: SupervisorFolderItem[] = rawSupervisors.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    phoneNumber: s.phoneNumber,
    nationalId: s.nationalId || null,
    assignedMentorsCount: mentorsPerSupervisor.get(s.id) || 0,
    assignedStudentsTotalCount: studentsPerSupervisor.get(s.id) || 0,
  }));

  // Build full students list
  const students: StudentAssignmentItem[] = rawProfiles.map((p) => {
    const mentorInfo = p.mentorId ? mentorMap.get(p.mentorId) : null;
    const supId = mentorInfo?.supervisorId || null;
    const supName = supId ? supervisorMap.get(supId) || null : null;

    return {
      id: p.profileId,
      userId: p.userId,
      fullName: p.userFullName,
      phoneNumber: p.userPhoneNumber,
      nationalId: p.userNationalId || null,
      enrolledCourseName: p.enrolledCourseName || "دوره وکالت مشاهیر دانش",
      mentorId: p.mentorId || null,
      mentorName: mentorInfo ? mentorInfo.fullName : null,
      supervisorId: supId,
      supervisorName: supName,
      hasActiveSupport: p.hasActiveSupport,
      riskStatus: p.riskStatus,
      createdAt: p.createdAt,
    };
  });

  // Filter unassigned students
  const unassignedStudents = students.filter((s) => !s.mentorId);

  return {
    supervisors,
    mentors,
    students,
    unassignedStudents,
    currentUserRole: session.role,
    currentUserId: session.userId,
  };
}

/**
 * Assign or reassign a Mentor to a Supervisor Folder (Admin / CEO Only)
 */
export async function assignMentorToSupervisorAction(payload: {
  mentorId: string;
  supervisorId: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["CEO", "ADMIN"]);

    if (!payload.mentorId) {
      return { success: false, message: "شناسه پشتیبان الزامی است." };
    }

    await db
      .update(users)
      .set({
        supervisorId: payload.supervisorId || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.mentorId));

    revalidatePath("/assignments");
    revalidatePath("/supervisor/mentors");
    revalidatePath("/supervisor");
    revalidatePath("/executive/staff-audit");

    return {
      success: true,
      message: payload.supervisorId
        ? "پشتیبان با موفقیت به پوشه نظارتی سرپرست اختصاص یافت."
        : "پشتیبان از پوشه سرپرست خارج و در حالت آزاد قرار گرفت.",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در انتساب پشتیبان به سرپرست.";
    return { success: false, message: msg };
  }
}

/**
 * Assign a Student to a Mentor or Unassign (Supervisor, Admin, CEO)
 */
export async function assignStudentToMentorAction(payload: {
  studentProfileId: string;
  mentorId: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    if (!payload.studentProfileId) {
      return { success: false, message: "شناسه پرونده داوطلب الزامی است." };
    }

    // Update student profile
    const [updated] = await db
      .update(studentProfiles)
      .set({
        mentorId: payload.mentorId || null,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, payload.studentProfileId))
      .returning();

    if (updated) {
      // Also update whitelist if matching
      const [u] = await db
        .select({ nationalId: users.nationalId, phoneNumber: users.phoneNumber })
        .from(users)
        .where(eq(users.id, updated.userId))
        .limit(1);

      if (u) {
        let mentorName: string | null = null;
        if (payload.mentorId) {
          const [m] = await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, payload.mentorId))
            .limit(1);
          mentorName = m?.fullName || null;
        }

        if (u.nationalId) {
          await db
            .update(studentWhitelist)
            .set({
              assignedMentorId: payload.mentorId || null,
              assignedMentorName: mentorName,
            })
            .where(eq(studentWhitelist.nationalId, u.nationalId));
        }
      }
    }

    revalidatePath("/assignments");
    revalidatePath("/supervisor");
    revalidatePath("/supervisor/unassigned-students");
    revalidatePath("/mentor/students");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: payload.mentorId
        ? "داوطلب با موفقیت به پشتیبان علمی اختصاص داده شد."
        : "داوطلب از پشتیبان فعلی سلب و به صف داوطلبان آزاد منتقل شد.",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در تخصیص داوطلب.";
    return { success: false, message: msg };
  }
}

/**
 * Transfer a student directly between two mentors (Supervisor, Admin, CEO)
 */
export async function transferStudentAction(payload: {
  studentProfileId: string;
  toMentorId: string;
  reason?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    if (!payload.studentProfileId || !payload.toMentorId) {
      return { success: false, message: "شناسه داوطلب و پشتیبان مقصد الزامی است." };
    }

    return await assignStudentToMentorAction({
      studentProfileId: payload.studentProfileId,
      mentorId: payload.toMentorId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در انتقال داوطلب.";
    return { success: false, message: msg };
  }
}

/**
 * Bulk assign multiple students to a mentor (Supervisor, Admin, CEO)
 */
export async function bulkAssignStudentsAction(payload: {
  studentProfileIds: string[];
  mentorId: string | null;
}): Promise<{ success: boolean; message: string; count: number }> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    if (!payload.studentProfileIds || payload.studentProfileIds.length === 0) {
      return { success: false, message: "هیچ داوطلبی انتخاب نشده است.", count: 0 };
    }

    await db
      .update(studentProfiles)
      .set({
        mentorId: payload.mentorId || null,
        updatedAt: new Date(),
      })
      .where(inArray(studentProfiles.id, payload.studentProfileIds));

    revalidatePath("/assignments");
    revalidatePath("/supervisor");
    revalidatePath("/supervisor/unassigned-students");
    revalidatePath("/mentor/students");

    return {
      success: true,
      message: `${payload.studentProfileIds.length} داوطلب با موفقیت تعیین تکلیف شدند.`,
      count: payload.studentProfileIds.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در تخصیص گروهی داوطلبان.";
    return { success: false, message: msg, count: 0 };
  }
}
