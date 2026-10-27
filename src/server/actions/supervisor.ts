"use server";

import { requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import {
  users,
  studentProfiles,
  voipCalls,
  fridayReports,
  examSubmissions,
  mentorCallingWindows,
  triageCases,
} from "../db/schema";
import { eq, and, desc, inArray, count, sql } from "drizzle-orm";
import { maskPhoneNumber } from "@/lib/sanitize";

export interface MentorStudentDetail {
  studentProfileId: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  riskStatus: string;
  enrolledCourseName: string | null;
  currentDailyStudyHours: number;
}

export interface MentorEvaluationRecord {
  mentorId: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  assignedStudentsCount: number;
  assignedStudents: MentorStudentDetail[];
  callingWindow: {
    startTime: string;
    endTime: string;
    isActive: boolean;
  } | null;
  callsCountWeekly: number;
  totalCallDurationMinutes: number;
  fridayReportsCount: number;
  reviewedFridayReportsCount: number;
  pendingFridayReportsCount: number;
  gradedExamsCount: number;
  triageResolvedCount: number;
  triageTotalCount: number;
  slaCompliancePercent: number;
}

/**
 * Fetch comprehensive mentor performance metrics for Supervisor & Executive leadership
 * (Requirement 11: /supervisor/mentors)
 */
export async function getSupervisorMentorEvaluationsAction(): Promise<MentorEvaluationRecord[]> {
  const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    // 1. Fetch all active mentors
    const mentors = await db
      .select()
      .from(users)
      .where(eq(users.role, "MENTOR"))
      .orderBy(users.fullName);

    if (mentors.length === 0) {
      return [];
    }

    const mentorIds = mentors.map((m) => m.id);

    // 2. Fetch all student profiles with users
    const allStudentsWithUsers = await db
      .select({
        profile: studentProfiles,
        user: {
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id));

    // 3. Fetch calling windows
    const callingWindows = await db
      .select()
      .from(mentorCallingWindows)
      .where(inArray(mentorCallingWindows.mentorId, mentorIds));
    const windowMap = new Map(callingWindows.map((w) => [w.mentorId, w]));

    // 4. Fetch voip calls
    const allCalls = await db.select().from(voipCalls);

    // 5. Fetch Friday reports
    const allReports = await db.select().from(fridayReports);

    // 6. Fetch exam submissions
    const allSubmissions = await db.select().from(examSubmissions);

    // 7. Fetch triage cases
    const allTriage = await db.select().from(triageCases);

    const isPrivileged = session.role === "CEO" || session.role === "ADMIN";

    return mentors.map((mentor) => {
      // Assigned students
      const assigned = allStudentsWithUsers.filter(
        (s) => s.profile.mentorId === mentor.id
      );

      const assignedStudents: MentorStudentDetail[] = assigned.map((s) => ({
        studentProfileId: s.profile.id,
        userId: s.profile.userId,
        fullName: s.user?.fullName || "داوطلب آزمون وکالت",
        phoneNumber: isPrivileged
          ? s.user?.phoneNumber || ""
          : maskPhoneNumber(s.user?.phoneNumber || ""),
        riskStatus: s.profile.riskStatus || "GREEN",
        enrolledCourseName: s.profile.enrolledCourseName,
        currentDailyStudyHours: s.profile.currentDailyStudyHours || 0,
      }));

      const assignedStudentUserIds = new Set(assigned.map((s) => s.profile.userId));
      const assignedProfileIds = new Set(assigned.map((s) => s.profile.id));

      // VOIP calls by this mentor
      const mentorCalls = allCalls.filter(
        (c) => c.mentorId === mentor.id || (c.studentProfileId && assignedProfileIds.has(c.studentProfileId))
      );
      const totalDurationSec = mentorCalls.reduce(
        (sum, c) => sum + (c.durationSeconds || 0),
        0
      );

      // Friday reports of assigned students
      const studentReports = allReports.filter((r) =>
        assignedStudentUserIds.has(r.studentId)
      );
      const reviewedReports = studentReports.filter(
        (r) => r.mentorFeedback !== null && r.mentorFeedback !== undefined && r.mentorFeedback !== ""
      );
      const pendingReports = studentReports.filter(
        (r) => !r.mentorFeedback
      );

      // Exam submissions of assigned students
      const studentExams = allSubmissions.filter((sub) =>
        assignedStudentUserIds.has(sub.studentId)
      );
      const gradedExams = studentExams.filter(
        (sub) => sub.status === "COMPLETED" || sub.totalPercentage !== null
      );

      // Triage and SLA
      const mentorTriage = allTriage.filter((t) => t.mentorId === mentor.id);
      const triageResolved = mentorTriage.filter((t) => t.isResolved).length;
      const triageTotal = mentorTriage.length;
      const slaCompliance =
        triageTotal > 0 ? Math.round((triageResolved / triageTotal) * 100) : 100;

      const cWindow = windowMap.get(mentor.id);

      return {
        mentorId: mentor.id,
        fullName: mentor.fullName,
        phoneNumber: isPrivileged
          ? mentor.phoneNumber
          : maskPhoneNumber(mentor.phoneNumber),
        email: mentor.username || null,
        assignedStudentsCount: assigned.length,
        assignedStudents,
        callingWindow: cWindow
          ? {
              startTime: cWindow.startTime,
              endTime: cWindow.endTime,
              isActive: cWindow.isActive,
            }
          : null,
        callsCountWeekly: mentorCalls.length,
        totalCallDurationMinutes: Math.round(totalDurationSec / 60),
        fridayReportsCount: studentReports.length,
        reviewedFridayReportsCount: reviewedReports.length,
        pendingFridayReportsCount: pendingReports.length,
        gradedExamsCount: gradedExams.length,
        triageResolvedCount: triageResolved,
        triageTotalCount: triageTotal,
        slaCompliancePercent: slaCompliance,
      };
    });
  } catch (err) {
    console.error("[getSupervisorMentorEvaluationsAction] Error:", err);
    return [];
  }
}
