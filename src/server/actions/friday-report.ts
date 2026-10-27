"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { fridayReports, studentProfiles, users } from "../db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isIranFriday, getStudyWeekBoundaries } from "@/lib/jalali";
import { sanitizeTextContent, maskPhoneNumber, maskNationalId } from "@/lib/sanitize";

export interface SubmitFridayReportInput {
  weekNumber: number;
  studyHoursCivil: number;
  studyHoursCriminal: number;
  studyHoursTrade: number;
  studyHoursProcedure: number;
  testsCount: number;
  weakPoints?: string;
  strengths?: string;
  studentNotes?: string;
}

export interface FridayReportActionResult {
  success: boolean;
  message: string;
  reportId?: string;
}

/**
 * Submit or update weekly Friday Self-Assessment report by the candidate
 */
export async function submitFridayReportAction(
  input: SubmitFridayReportInput
): Promise<FridayReportActionResult> {
  try {
    const session = await requireRole(["STUDENT", "ADMIN"]);

    // Strict Day-of-Week & Temporal Locking:
    // Students can ONLY draft and submit Friday reports on Fridays (Asia/Tehran)
    if (session.role !== "ADMIN") {
      if (!isIranFriday()) {
        return {
          success: false,
          message: "ثبت گزارش خودارزیابی منحصراً در روزهای جمعه فعال است.",
        };
      }
    }

    const boundaries = getStudyWeekBoundaries();
    const currentWeekNumber = boundaries.jalaliWeekNumber;

    const weekNumber = Number(input.weekNumber) || 1;

    // Students CANNOT submit reports for future dates in advance
    if (weekNumber > currentWeekNumber && session.role !== "ADMIN") {
      return {
        success: false,
        message: "امکان ثبت گزارش خودارزیابی برای هفته‌های آتی وجود ندارد.",
      };
    }

    let studentProfileId = session.studentProfileId;
    let cohortId = "COHORT_1403_BAR";

    if (!studentProfileId) {
      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);

      if (profile) {
        studentProfileId = profile.id;
      }
    }

    const totalHours =
      Number(input.studyHoursCivil || 0) +
      Number(input.studyHoursCriminal || 0) +
      Number(input.studyHoursTrade || 0) +
      Number(input.studyHoursProcedure || 0);

    // Check if report already exists for this week
    const [existing] = await db
      .select()
      .from(fridayReports)
      .where(
        and(
          eq(fridayReports.studentId, session.userId),
          eq(fridayReports.weekNumber, weekNumber)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.status === "APPROVED") {
        return {
          success: false,
          message: "این گزارش توسط سرپرست تأیید نهایی شده و قفل است.",
        };
      }
      if (weekNumber < currentWeekNumber && session.role !== "ADMIN") {
        return {
          success: false,
          message: "گزارش‌های خودارزیابی پس از پایان جمعه قفل دائمی (Read-Only) شده و قابل ویرایش نیستند.",
        };
      }

      await db
        .update(fridayReports)
        .set({
          studyHoursCivil: Number(input.studyHoursCivil || 0),
          studyHoursCriminal: Number(input.studyHoursCriminal || 0),
          studyHoursTrade: Number(input.studyHoursTrade || 0),
          studyHoursProcedure: Number(input.studyHoursProcedure || 0),
          totalHours,
          testsCount: Number(input.testsCount || 0),
          weakPoints: input.weakPoints ? sanitizeTextContent(input.weakPoints) : null,
          strengths: input.strengths ? sanitizeTextContent(input.strengths) : null,
          studentNotes: input.studentNotes ? sanitizeTextContent(input.studentNotes) : null,
          status: "SUBMITTED",
          updatedAt: new Date(),
        })
        .where(eq(fridayReports.id, existing.id));

      if (studentProfileId) {
        await db
          .update(studentProfiles)
          .set({
            currentDailyStudyHours: Math.max(1, Math.round(totalHours / 7)),
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.id, studentProfileId));
      }

      revalidatePath("/student/friday-report");
      revalidatePath("/student/friday-reports");
      revalidatePath("/student/dashboard");
      revalidatePath("/student/study-plan");
      revalidatePath("/mentor/friday-reports");

      return {
        success: true,
        message: `گزارش خودارزیابی جمعه برای هفته ${weekNumber} با موفقیت به‌روزرسانی شد.`,
        reportId: existing.id,
      };
    }

    const newId = `fr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(fridayReports).values({
      id: newId,
      studentId: session.userId,
      studentProfileId: studentProfileId || null,
      cohortId,
      weekNumber,
      studyHoursCivil: Number(input.studyHoursCivil || 0),
      studyHoursCriminal: Number(input.studyHoursCriminal || 0),
      studyHoursTrade: Number(input.studyHoursTrade || 0),
      studyHoursProcedure: Number(input.studyHoursProcedure || 0),
      totalHours,
      testsCount: Number(input.testsCount || 0),
      weakPoints: input.weakPoints ? sanitizeTextContent(input.weakPoints) : null,
      strengths: input.strengths ? sanitizeTextContent(input.strengths) : null,
      studentNotes: input.studentNotes ? sanitizeTextContent(input.studentNotes) : null,
      status: "SUBMITTED",
      supervisorApproval: false,
    });

    if (studentProfileId) {
      await db
        .update(studentProfiles)
        .set({
          currentDailyStudyHours: Math.max(1, Math.round(totalHours / 7)),
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.id, studentProfileId));
    }

    revalidatePath("/student/friday-report");
    revalidatePath("/student/friday-reports");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/study-plan");
    revalidatePath("/mentor/friday-reports");

    return {
      success: true,
      message: `گزارش خودارزیابی جمعه برای هفته ${weekNumber} با موفقیت در سامانه ثبت گردید.`,
      reportId: newId,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در ثبت گزارش خودارزیابی";
    return { success: false, message: msg };
  }
}

/**
 * Fetch all Friday reports for current logged in student
 * Strips supervisorNotes on the server when session.role === "STUDENT" (Module 5)
 */
export async function getStudentFridayReportsAction() {
  const session = await requireRole(["STUDENT", "ADMIN"]);

  const reports = await db
    .select()
    .from(fridayReports)
    .where(eq(fridayReports.studentId, session.userId))
    .orderBy(desc(fridayReports.weekNumber));

  if (session.role === "STUDENT") {
    return reports.map((r) => ({
      ...r,
      supervisorNotes: null,
    }));
  }

  return reports;
}

/**
 * Fetch Friday reports for mentor / supervisor oversight
 */
export async function getMentorFridayReportsAction(filters?: {
  weekNumber?: number;
  studentId?: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  let accessibleStudentUserIds: string[] = [];

  if (session.role === "MENTOR") {
    // Mentors only see their own assigned students
    const assignedProfiles = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(eq(studentProfiles.mentorId, session.userId));

    accessibleStudentUserIds = assignedProfiles.map((p) => p.userId);
  } else {
    // Supervisors / Admin see all students
    const allProfiles = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles);

    accessibleStudentUserIds = allProfiles.map((p) => p.userId);
  }

  if (accessibleStudentUserIds.length === 0) {
    return [];
  }

  // Optimized SQL LEFT JOIN (H-21): eliminates unbounded in-memory array scans
  const rows = await db
    .select({
      report: fridayReports,
      studentUser: {
        fullName: users.fullName,
        phoneNumber: users.phoneNumber,
        nationalId: users.nationalId,
      },
      profile: {
        enrolledCourseName: studentProfiles.enrolledCourseName,
        mentorId: studentProfiles.mentorId,
      },
    })
    .from(fridayReports)
    .leftJoin(users, eq(fridayReports.studentId, users.id))
    .leftJoin(studentProfiles, eq(fridayReports.studentId, studentProfiles.userId))
    .where(inArray(fridayReports.studentId, accessibleStudentUserIds))
    .orderBy(desc(fridayReports.submittedAt));

  // Targeted query for mentor names only (zero full-table scans)
  const mentorIds = Array.from(
    new Set(rows.map((r) => r.profile?.mentorId).filter(Boolean))
  ) as string[];

  const mentorUsers =
    mentorIds.length > 0
      ? await db
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(inArray(users.id, mentorIds))
      : [];

  const mentorMap = new Map(mentorUsers.map((m) => [m.id, m.fullName]));
  const isPrivileged = session.role === "CEO" || session.role === "ADMIN";

  return rows.map(({ report, studentUser, profile }) => {
    const mentorName = profile?.mentorId ? mentorMap.get(profile.mentorId) : null;

    return {
      ...report,
      studentName: studentUser?.fullName || "داوطلب آزمون وکالت",
      studentPhone: isPrivileged
        ? studentUser?.phoneNumber || "---"
        : maskPhoneNumber(studentUser?.phoneNumber),
      nationalId: isPrivileged
        ? studentUser?.nationalId || "---"
        : maskNationalId(studentUser?.nationalId),
      mentorName: mentorName || "پشتیبان آموزشی",
      courseName: profile?.enrolledCourseName || "دوره آمادگی آزمون وکالت",
    };
  });
}

/**
 * Mentor submits educational feedback and guidance on a Friday report
 * Enforces Zero-Trust Mentor Ownership (H-05) and text sanitization (M-04)
 */
export async function submitMentorFeedbackAction(
  reportId: string,
  feedback: string
): Promise<FridayReportActionResult> {
  try {
    const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

    if (!feedback || feedback.trim().length < 5) {
      return { success: false, message: "متن بازخورد باید حداقل شامل ۵ کاراکتر باشد." };
    }

    const [report] = await db
      .select()
      .from(fridayReports)
      .where(eq(fridayReports.id, reportId))
      .limit(1);

    if (!report) {
      return { success: false, message: "گزارش خودارزیابی یافت نشد." };
    }

    // Mentor IDOR check (H-05): Mentor can only provide feedback to assigned students
    if (session.role === "MENTOR") {
      const [profile] = await db
        .select({ mentorId: studentProfiles.mentorId })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, report.studentId))
        .limit(1);

      if (!profile || profile.mentorId !== session.userId) {
        return {
          success: false,
          message: "شما تنها مجاز به ثبت بازخورد برای داوطلبان تحت نظارت مستقیم خود هستید.",
        };
      }
    }

    const cleanFeedback = sanitizeTextContent(feedback);

    await db
      .update(fridayReports)
      .set({
        mentorFeedback: cleanFeedback,
        mentorReviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fridayReports.id, reportId));

    revalidatePath("/mentor/friday-reports");
    revalidatePath("/student/friday-report");

    return { success: true, message: "بازخورد آموزشی پشتیبان با موفقیت ثبت شد." };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در ثبت بازخورد";
    return { success: false, message: msg };
  }
}

/**
 * Supervisor reviews and approves or comments on a Friday report
 */
export async function submitSupervisorApprovalAction(
  reportId: string,
  approval: boolean,
  notes?: string
): Promise<FridayReportActionResult> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    const cleanNotes = notes ? sanitizeTextContent(notes) : null;

    await db
      .update(fridayReports)
      .set({
        supervisorApproval: approval,
        supervisorNotes: cleanNotes,
        supervisorApprovedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fridayReports.id, reportId));

    revalidatePath("/mentor/friday-reports");
    revalidatePath("/student/friday-report");

    return {
      success: true,
      message: approval
        ? "تأییدیه نظارتی سرپرست با موفقیت ثبت گردید."
        : "عدم تأیید و یادداشت نظارتی سرپرست ذخیره شد.",
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در ثبت تاییدیه سرپرستی";
    return { success: false, message: msg };
  }
}

export interface ReviewFridayReportInput {
  reportId: string;
  status: "APPROVED" | "REJECTED";
  feedback?: string;
  supervisorNotes?: string;
}

/**
 * Review Friday report by Mentor or Supervisor (Approve or Reject with feedback)
 * Enforces Zero-Trust Mentor Ownership (H-05) and text sanitization (M-04)
 */
export async function reviewFridayReportAction(
  input: ReviewFridayReportInput
): Promise<FridayReportActionResult> {
  try {
    const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

    const [report] = await db
      .select()
      .from(fridayReports)
      .where(eq(fridayReports.id, input.reportId))
      .limit(1);

    if (!report) {
      return { success: false, message: "گزارش خودارزیابی یافت نشد." };
    }

    // Mentor IDOR check (H-05): Mentor can only review assigned students
    if (session.role === "MENTOR") {
      const [profile] = await db
        .select({ mentorId: studentProfiles.mentorId })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, report.studentId))
        .limit(1);

      if (!profile || profile.mentorId !== session.userId) {
        return {
          success: false,
          message: "شما تنها مجاز به بررسی گزارش داوطلبان تحت نظارت مستقیم خود هستید.",
        };
      }
    }

    const isSupervisorOrAdmin = ["SUPERVISOR", "CEO", "ADMIN"].includes(session.role);

    const updatePayload: Record<string, unknown> = {
      status: input.status,
      updatedAt: new Date(),
    };

    if (input.feedback !== undefined) {
      updatePayload.mentorFeedback = sanitizeTextContent(input.feedback) || null;
      updatePayload.mentorReviewedAt = new Date();
    }

    if (isSupervisorOrAdmin) {
      updatePayload.supervisorApproval = input.status === "APPROVED";
      if (input.supervisorNotes !== undefined) {
        updatePayload.supervisorNotes = sanitizeTextContent(input.supervisorNotes) || null;
      }
      updatePayload.supervisorApprovedAt = new Date();
    }

    await db
      .update(fridayReports)
      .set(updatePayload)
      .where(eq(fridayReports.id, input.reportId));

    revalidatePath("/mentor/friday-reports");
    revalidatePath("/student/friday-report");

    return {
      success: true,
      message:
        input.status === "APPROVED"
          ? "تأیید گزارش خودارزیابی و ثبت بازخورد آموزشی با موفقیت انجام شد."
          : "گزارش خودارزیابی رد شد و جهت بازنگری داوطلب علامت‌گذاری گردید.",
      reportId: input.reportId,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در بررسی گزارش خودارزیابی";
    return { success: false, message: msg };
  }
}

