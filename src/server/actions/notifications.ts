"use server";

import { getSession } from "../auth/guard";
import { db } from "../db";
import { directMessages, hierarchyTasks, fridayReports } from "../db/schema";
import { count, eq, and, inArray, isNull } from "drizzle-orm";

export interface NavbarNotificationCounts {
  unreadMessagesCount: number;
  pendingTasksCount: number;
  pendingReportsCount: number;
}

/**
 * Fetch distinct, real-time notification counts for top navbar
 * Domain 6: Independent notification counters for Messages, Tasks, and Reports
 */
export async function getNavbarNotificationCounts(): Promise<NavbarNotificationCounts> {
  const session = await getSession();
  if (!session) {
    return { unreadMessagesCount: 0, pendingTasksCount: 0, pendingReportsCount: 0 };
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
      const [repRes] = await db
        .select({ count: count() })
        .from(fridayReports)
        .where(
          and(
            eq(fridayReports.status, "SUBMITTED"),
            isNull(fridayReports.mentorFeedback)
          )
        );
      pendingReportsCount = repRes ? Number(repRes.count) : 0;
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

    return {
      unreadMessagesCount,
      pendingTasksCount,
      pendingReportsCount,
    };
  } catch (err) {
    console.warn("[Navbar] Failed to fetch notification counts:", err);
    return { unreadMessagesCount: 0, pendingTasksCount: 0, pendingReportsCount: 0 };
  }
}
