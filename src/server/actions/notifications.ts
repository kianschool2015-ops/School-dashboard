"use server";

import { getSession } from "../auth/guard";
import { db } from "../db";
import {
  directMessages,
  hierarchyTasks,
  fridayReports,
  studentProfiles,
  mentorTriageCases,
  examSubmissions,
} from "../db/schema";
import { count, eq, and, inArray, isNull } from "drizzle-orm";

export interface NavbarNotificationCounts {
  unreadMessagesCount: number;
  pendingTasksCount: number;
  pendingReportsCount: number;
  unassignedStudentsCount: number;
  openTriageCasesCount: number;
  pendingExamsCount: number;
}

/**
 * Fetch distinct, real-time notification counts for top navbar
 * Domain 6: Independent notification counters for Messages, Tasks, and Reports
 */
export async function getNavbarNotificationCounts(): Promise<NavbarNotificationCounts> {
  const session = await getSession();
  if (!session) {
    return {
      unreadMessagesCount: 0,
      pendingTasksCount: 0,
      pendingReportsCount: 0,
      unassignedStudentsCount: 0,
      openTriageCasesCount: 0,
      pendingExamsCount: 0,
    };
  }

  try {
    // 1. Unread Messages: directMessages where receiverId = session.userId and isRead = false
    const [msgRes] = await db
      .select({ count: count() })
      .from(directMessages)
      .where(
        and(
          eq(directMessages.receiverId, session.userId),
          eq(directMessages.isRead, false)
        )
      );
    const unreadMessagesCount = msgRes ? Number(msgRes.count) : 0;

    // 2. Pending Tasks:
    // - Mentor: tasks assigned to them not yet completed (PENDING, SEEN_IN_PROGRESS, IN_PROGRESS, REJECTED)
    // - Supervisor/CEO/Admin: tasks completed by mentor awaiting review/approval (COMPLETED_BY_MENTOR)
    let pendingTasksCount = 0;
    if (session.role === "MENTOR") {
      const [taskRes] = await db
        .select({ count: count() })
        .from(hierarchyTasks)
        .where(
          and(
            eq(hierarchyTasks.receiverId, session.userId),
            inArray(hierarchyTasks.status, ["PENDING", "SEEN_IN_PROGRESS", "IN_PROGRESS", "REJECTED"])
          )
        );
      pendingTasksCount = taskRes ? Number(taskRes.count) : 0;
    } else if (session.role === "SUPERVISOR" || session.role === "CEO" || session.role === "ADMIN") {
      const [taskRes] = await db
        .select({ count: count() })
        .from(hierarchyTasks)
        .where(eq(hierarchyTasks.status, "COMPLETED_BY_MENTOR"));
      pendingTasksCount = taskRes ? Number(taskRes.count) : 0;
    }

    // 3. Pending Reports:
    // - Mentor: submitted reports where mentor feedback is pending
    // - Supervisor/CEO/Admin: reports awaiting supervisor approval
    // - Student: reports returned for revision (REJECTED)
    let pendingReportsCount = 0;
    if (session.role === "MENTOR") {
      // Scoped strictly to mentor's assigned students
      const assignedProfiles = await db
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(eq(studentProfiles.mentorId, session.userId));
      const studentUserIds = assignedProfiles.map((p) => p.userId);

      if (studentUserIds.length > 0) {
        const [repRes] = await db
          .select({ count: count() })
          .from(fridayReports)
          .where(
            and(
              inArray(fridayReports.studentId, studentUserIds),
              eq(fridayReports.status, "SUBMITTED"),
              isNull(fridayReports.mentorFeedback)
            )
          );
        pendingReportsCount = repRes ? Number(repRes.count) : 0;
      } else {
        pendingReportsCount = 0;
      }
    } else if (session.role === "SUPERVISOR" || session.role === "CEO" || session.role === "ADMIN") {
      const [repRes] = await db
        .select({ count: count() })
        .from(fridayReports)
        .where(eq(fridayReports.supervisorApproval, false));
      pendingReportsCount = repRes ? Number(repRes.count) : 0;
    } else if (session.role === "STUDENT") {
      const [repRes] = await db
        .select({ count: count() })
        .from(fridayReports)
        .where(
          and(
            eq(fridayReports.studentId, session.userId),
            eq(fridayReports.status, "REJECTED")
          )
        );
      pendingReportsCount = repRes ? Number(repRes.count) : 0;
    }

    // 4. Unassigned Students (Supervisor / CEO / Admin):
    let unassignedStudentsCount = 0;
    if (session.role === "SUPERVISOR" || session.role === "CEO" || session.role === "ADMIN") {
      const [unassignedRes] = await db
        .select({ count: count() })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.hasActiveSupport, true),
            isNull(studentProfiles.mentorId)
          )
        );
      unassignedStudentsCount = unassignedRes ? Number(unassignedRes.count) : 0;
    }

    // 5. Open Triage Cases (Requirement 7: dynamic count to avoid false red dot)
    let openTriageCasesCount = 0;
    if (session.role === "MENTOR") {
      const [triageRes] = await db
        .select({ count: count() })
        .from(mentorTriageCases)
        .where(
          and(
            eq(mentorTriageCases.mentorId, session.userId),
            eq(mentorTriageCases.isResolved, false)
          )
        );
      openTriageCasesCount = triageRes ? Number(triageRes.count) : 0;
    } else if (session.role === "SUPERVISOR" || session.role === "CEO" || session.role === "ADMIN") {
      const [triageRes] = await db
        .select({ count: count() })
        .from(mentorTriageCases)
        .where(eq(mentorTriageCases.isResolved, false));
      openTriageCasesCount = triageRes ? Number(triageRes.count) : 0;
    }

    // 6. Pending Exams (Phase 4 & 6: CBT Submissions requiring mentor review/confirmation)
    let pendingExamsCount = 0;
    if (session.role === "MENTOR") {
      const [examRes] = await db
        .select({ count: count() })
        .from(examSubmissions)
        .where(
          and(
            eq(examSubmissions.mentorId, session.userId),
            inArray(examSubmissions.status, [
              "AUTO_GRADED_PENDING_MENTOR",
              "PENDING_MENTOR_REVIEW",
              "SUBMITTED",
            ])
          )
        );
      pendingExamsCount = examRes ? Number(examRes.count) : 0;
    } else if (session.role === "SUPERVISOR" || session.role === "CEO" || session.role === "ADMIN") {
      const [examRes] = await db
        .select({ count: count() })
        .from(examSubmissions)
        .where(
          inArray(examSubmissions.status, [
            "AUTO_GRADED_PENDING_MENTOR",
            "PENDING_MENTOR_REVIEW",
            "SUBMITTED",
          ])
        );
      pendingExamsCount = examRes ? Number(examRes.count) : 0;
    }

    return {
      unreadMessagesCount,
      pendingTasksCount,
      pendingReportsCount,
      unassignedStudentsCount,
      openTriageCasesCount,
      pendingExamsCount,
    };
  } catch (err) {
    console.warn("[Navbar] Failed to fetch notification counts:", err);
    return {
      unreadMessagesCount: 0,
      pendingTasksCount: 0,
      pendingReportsCount: 0,
      unassignedStudentsCount: 0,
      openTriageCasesCount: 0,
      pendingExamsCount: 0,
    };
  }
}

/**
 * Fetch unassigned students count directly for supervisor sidebar badge
 */
export async function getUnassignedStudentsCountAction(): Promise<number> {
  const session = await getSession();
  if (!session || (session.role !== "SUPERVISOR" && session.role !== "CEO" && session.role !== "ADMIN")) {
    return 0;
  }
  try {
    const [res] = await db
      .select({ count: count() })
      .from(studentProfiles)
      .where(
        and(
          eq(studentProfiles.hasActiveSupport, true),
          isNull(studentProfiles.mentorId)
        )
      );
    return res ? Number(res.count) : 0;
  } catch {
    return 0;
  }
}
