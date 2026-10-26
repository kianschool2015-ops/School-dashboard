import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import {
  studentProfiles,
  users,
  voipCalls,
  triageCases,
  mockExams,
  studentSchedules,
  scheduleItems,
  examSubmissions,
} from "@/server/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { MentorStudentsClient } from "./mentor-students-client";
import { maskPhoneNumber } from "@/server/services/voip";
import { maskNationalId } from "@/lib/sanitize";
import type {
  StudentProfileRecord,
  UserRecord,
  VoipCallRecord,
  MockExamRecord,
} from "@/types/models";

export interface CandidateRosterItem {
  id: string; // student profile id
  userId: string;
  fullName: string;
  nationalId: string;
  maskedPhone: string;
  riskStatus: "GREEN" | "YELLOW" | "RED";
  riskReason?: string | null;
  enrolledCourseName: string;
  enrolledCourseCode: string;
  masterclassGoal: string;
  currentDailyStudyHours: number;
  employmentStatus: string;
  lastContactAt: string | null;
  assignedMentorId: string;
  assignedMentorName: string;
  activeTriageCaseCount: number;
  latestExam?: {
    examTitle: string;
    overallScorePercent: number;
    overallRank: number | null;
    examDate: string;
  } | null;
  scheduleItemCount: number;
  callNotesCount: number;
  pendingExamReviewCount?: number;
  latestPendingSubmissionId?: string | null;
  recentCalls: Array<{
    id: string;
    mentorName: string;
    status: string;
    durationSeconds: number;
    initiatedAt: string;
    notes: string | null;
  }>;
}

export default async function MentorStudentsPage() {
  await ensureDatabaseBootstrap().catch(() => {});
  const session = await getSession();

  if (
    !session ||
    (session.role !== "MENTOR" &&
      session.role !== "SUPERVISOR" &&
      session.role !== "CEO" &&
      session.role !== "ADMIN")
  ) {
    redirect("/auth/login");
  }

  // 1. Fetch Students with Zero-Trust Isolation
  let rawProfiles: StudentProfileRecord[] = [];
  let allUsers: (typeof users.$inferSelect)[] = [];
  let allCalls: (typeof voipCalls.$inferSelect)[] = [];
  let allTriage: (typeof triageCases.$inferSelect)[] = [];
  let allExams: (typeof mockExams.$inferSelect)[] = [];
  let allSchedules: (typeof studentSchedules.$inferSelect)[] = [];
  let allScheduleItems: (typeof scheduleItems.$inferSelect)[] = [];
  let pendingExamSubmissions: { id: string; studentId: string | null; submittedAt: Date | null }[] = [];

  try {
    if (session.role === "MENTOR") {
      const rows = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.mentorId, session.userId));
      rawProfiles = rows as unknown as StudentProfileRecord[];
    } else {
      // Supervisor or CEO/ADMIN can inspect all candidates
      const rows = await db.select().from(studentProfiles);
      rawProfiles = rows as unknown as StudentProfileRecord[];
    }

    // 2. Fetch Supporting Reference Tables (Optimized with targeted IDs - H-21)
    const studentUserIds = rawProfiles.map((p) => p.userId).filter(Boolean);
    const mentorUserIds = rawProfiles.map((p) => p.mentorId).filter(Boolean) as string[];
    const relevantUserIds = Array.from(new Set([...studentUserIds, ...mentorUserIds]));

    allUsers =
      relevantUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, relevantUserIds))
        : [];
    allCalls = await db
      .select()
      .from(voipCalls)
      .orderBy(desc(voipCalls.initiatedAt));

    allTriage = await db
      .select()
      .from(triageCases)
      .where(eq(triageCases.isResolved, false));

    allExams = await db
      .select()
      .from(mockExams)
      .orderBy(desc(mockExams.createdAt));

    allSchedules = await db.select().from(studentSchedules);
    allScheduleItems = await db.select().from(scheduleItems);

    pendingExamSubmissions = await db
      .select({
        id: examSubmissions.id,
        studentId: examSubmissions.studentId,
        submittedAt: examSubmissions.submittedAt,
      })
      .from(examSubmissions)
      .where(eq(examSubmissions.status, "AUTO_GRADED_PENDING_MENTOR"))
      .orderBy(desc(examSubmissions.submittedAt));
  } catch (err) {
    console.warn("[MentorStudentsPage] DB query error:", err);
  }

  const userMap = new Map(allUsers.map((u) => [u.id, u as unknown as UserRecord]));
  const schedMap = new Map(allSchedules.map((s) => [s.studentProfileId, s.id]));
  const isPrivileged = session.role === "CEO" || session.role === "ADMIN";

  // 3. Assemble Rich Candidate Roster
  const rosterItems: CandidateRosterItem[] = rawProfiles.map((profile) => {
    const studentUser = userMap.get(profile.userId);
    const mentorUser = profile.mentorId ? userMap.get(profile.mentorId) : null;

    const studentPendingSubs = pendingExamSubmissions.filter(
      (s) => s.studentId === profile.userId
    );

    const studentCalls = allCalls.filter(
      (c) => c.studentProfileId === profile.id
    );

    const activeTriage = allTriage.filter(
      (t) => t.studentProfileId === profile.id
    );

    const studentExams = allExams.filter(
      (e) => e.studentProfileId === profile.id
    );
    const latestExam = studentExams[0] || null;

    const schedId = schedMap.get(profile.id);
    const items = allScheduleItems.filter(
      (i) => i.scheduleId === schedId || i.scheduleId === profile.id
    );

    return {
      id: profile.id,
      userId: profile.userId,
      fullName: studentUser?.fullName || "داوطلب آزمون وکالت",
      nationalId: isPrivileged
        ? studentUser?.nationalId || "---"
        : studentUser?.nationalId
        ? maskNationalId(studentUser.nationalId)
        : "---",
      maskedPhone: studentUser?.phoneNumber
        ? maskPhoneNumber(studentUser.phoneNumber)
        : "۰۹۱۲***۰۰۰۰",
      riskStatus: profile.riskStatus as "GREEN" | "YELLOW" | "RED",
      riskReason: profile.riskReason,
      enrolledCourseName: profile.enrolledCourseName || "دوره طلایی آمادگی آزمون وکالت ۳۶۰",
      enrolledCourseCode: profile.enrolledCourseCode || "BAR-360",
      masterclassGoal: profile.masterclassGoal || "قبولی در کانون وکلای دادگستری",
      currentDailyStudyHours: profile.currentDailyStudyHours || 7,
      employmentStatus: profile.employmentStatus || "UNEMPLOYED",
      lastContactAt: profile.lastContactAt
        ? new Date(profile.lastContactAt).toISOString()
        : null,
      assignedMentorId: profile.mentorId || "usr_mentor1",
      assignedMentorName: mentorUser?.fullName || "استاد علی کاظمی (پشتیبان علمی)",
      activeTriageCaseCount: activeTriage.length,
      latestExam: latestExam
        ? {
            examTitle: latestExam.examTitle,
            overallScorePercent: latestExam.overallScorePercent || 0,
            overallRank: latestExam.overallRank || null,
            examDate: latestExam.examDate,
          }
        : null,
      scheduleItemCount: items.length,
      callNotesCount: studentCalls.length,
      pendingExamReviewCount: studentPendingSubs.length,
      latestPendingSubmissionId: studentPendingSubs[0]?.id || null,
      recentCalls: studentCalls.map((c) => ({
        id: c.id,
        mentorName: c.mentorName,
        status: c.status,
        durationSeconds: c.durationSeconds,
        initiatedAt: new Date(c.initiatedAt).toISOString(),
        notes: c.notes,
      })),
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <MentorStudentsClient
        currentUser={{
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        }}
        initialRoster={rosterItems}
      />
    </div>
  );
}
