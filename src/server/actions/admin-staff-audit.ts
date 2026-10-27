"use server";

import { requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import {
  users,
  studentProfiles,
  voipCalls,
  fridayReports,
  hierarchyTasks,
  triageCases,
  mentorCallingWindows,
} from "../db/schema";
import { eq, inArray, desc } from "drizzle-orm";

export interface SupervisorStaffAuditRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string | null;
  sipExtension: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  supervisedMentorsCount: number;
  totalStudentsInCohort: number;
  tasksAssignedCount: number;
  tasksCompletedCount: number;
  triageMonitoredCount: number;
  fridayReportsApprovedCount: number;
}

export interface MentorStaffAuditRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string | null;
  sipExtension: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignedStudentsCount: number;
  weeklyCallsCount: number;
  totalCallMinutes: number;
  fridayReportsReviewed: number;
  fridayReportsPending: number;
  slaCompliancePercent: number;
  tasksReceivedCount: number;
  tasksCompletedCount: number;
  callingWindowActive: boolean;
  callingWindowTime: string;
}

export interface StaffAuditData {
  supervisors: SupervisorStaffAuditRecord[];
  mentors: MentorStaffAuditRecord[];
}

/**
 * Fetch detailed audit metrics for executive leadership across all staff (supervisors & mentors)
 * (Requirement 13: /executive/staff-audit)
 */
export async function getStaffAuditDataAction(): Promise<StaffAuditData> {
  await requireRole(["CEO", "ADMIN"]);

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    // 1. Fetch supervisors and mentors
    const staffUsers = await db
      .select()
      .from(users)
      .where(inArray(users.role, ["SUPERVISOR", "MENTOR"]))
      .orderBy(desc(users.createdAt));

    const supervisors = staffUsers.filter((u) => u.role === "SUPERVISOR");
    const mentors = staffUsers.filter((u) => u.role === "MENTOR");

    // 2. Fetch student profiles
    const allStudents = await db.select().from(studentProfiles);

    // 3. Fetch VOIP calls
    const allCalls = await db.select().from(voipCalls);

    // 4. Fetch Friday reports
    const allReports = await db.select().from(fridayReports);

    // 5. Fetch hierarchy tasks
    const allTasks = await db.select().from(hierarchyTasks);

    // 6. Fetch triage cases
    const allTriage = await db.select().from(triageCases);

    // 7. Fetch calling windows
    const callingWindows = await db.select().from(mentorCallingWindows);
    const windowMap = new Map(callingWindows.map((w) => [w.mentorId, w]));

    // Build supervisor records
    const supervisorRecords: SupervisorStaffAuditRecord[] = supervisors.map((sup) => {
      // Tasks assigned by this supervisor
      const assignedTasks = allTasks.filter((t) => t.senderId === sup.id);
      const completedTasks = assignedTasks.filter((t) => t.status === "APPROVED");

      // Friday reports approved by this supervisor
      const approvedReports = allReports.filter(
        (r) => r.supervisorApproval === true
      );

      return {
        id: sup.id,
        fullName: sup.fullName,
        phoneNumber: sup.phoneNumber,
        nationalId: sup.nationalId,
        sipExtension: sup.sipExtension,
        isActive: sup.isActive,
        createdAt: sup.createdAt,
        updatedAt: sup.updatedAt,
        supervisedMentorsCount: mentors.length,
        totalStudentsInCohort: allStudents.length,
        tasksAssignedCount: assignedTasks.length,
        tasksCompletedCount: completedTasks.length,
        triageMonitoredCount: allTriage.length,
        fridayReportsApprovedCount: approvedReports.length,
      };
    });

    // Build mentor records
    const mentorRecords: MentorStaffAuditRecord[] = mentors.map((men) => {
      const assigned = allStudents.filter((s) => s.mentorId === men.id);
      const studentIds = new Set(assigned.map((s) => s.userId));

      const mentorCalls = allCalls.filter((c) => c.mentorId === men.id);
      const totalDurationSec = mentorCalls.reduce(
        (acc, c) => acc + (c.durationSeconds || 0),
        0
      );

      const stuReports = allReports.filter((r) => studentIds.has(r.studentId));
      const reviewedReports = stuReports.filter((r) => Boolean(r.mentorFeedback));
      const pendingReports = stuReports.filter((r) => !r.mentorFeedback);

      const menTriage = allTriage.filter((t) => t.mentorId === men.id);
      const resolvedTriage = menTriage.filter((t) => t.isResolved).length;
      const slaCompliance =
        menTriage.length > 0 ? Math.round((resolvedTriage / menTriage.length) * 100) : 100;

      const receivedTasks = allTasks.filter((t) => t.receiverId === men.id);
      const completedTasks = receivedTasks.filter((t) =>
        ["COMPLETED_BY_MENTOR", "APPROVED"].includes(t.status)
      );

      const win = windowMap.get(men.id);

      return {
        id: men.id,
        fullName: men.fullName,
        phoneNumber: men.phoneNumber,
        nationalId: men.nationalId,
        sipExtension: men.sipExtension,
        isActive: men.isActive,
        createdAt: men.createdAt,
        updatedAt: men.updatedAt,
        assignedStudentsCount: assigned.length,
        weeklyCallsCount: mentorCalls.length,
        totalCallMinutes: Math.round(totalDurationSec / 60),
        fridayReportsReviewed: reviewedReports.length,
        fridayReportsPending: pendingReports.length,
        slaCompliancePercent: slaCompliance,
        tasksReceivedCount: receivedTasks.length,
        tasksCompletedCount: completedTasks.length,
        callingWindowActive: win ? win.isActive : false,
        callingWindowTime: win ? `${win.startTime} الی ${win.endTime}` : "تنظیم نشده",
      };
    });

    return {
      supervisors: supervisorRecords,
      mentors: mentorRecords,
    };
  } catch (err) {
    console.error("[getStaffAuditDataAction] Error:", err);
    return { supervisors: [], mentors: [] };
  }
}
