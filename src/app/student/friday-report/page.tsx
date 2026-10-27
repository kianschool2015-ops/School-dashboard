import { requireRole } from "@/server/auth/guard";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import { fridayReports } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { FridayReportClient } from "./friday-report-client";
import type { FridayReportRecord } from "@/types/models";
import {
  isIranFriday,
  getStudyWeekBoundaries,
  getIranTimeInfo,
  gregorianToJalali,
  toPersianDigits,
  PERSIAN_MONTHS,
} from "@/lib/jalali";

export default async function StudentFridayReportPage() {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  await ensureDatabaseBootstrap().catch(() => {});

  const rows = await db
    .select()
    .from(fridayReports)
    .where(eq(fridayReports.studentId, session.userId))
    .orderBy(desc(fridayReports.weekNumber));

  const iranTime = getIranTimeInfo(new Date());
  const isFriday = iranTime.isFriday;
  const currentWeekNumber = getStudyWeekBoundaries().jalaliWeekNumber;

  const jalali = gregorianToJalali(iranTime.year, iranTime.month, iranTime.day);
  const weekdayMap: Record<string, string> = {
    Saturday: "شنبه",
    Sunday: "یکشنبه",
    Monday: "دوشنبه",
    Tuesday: "سه‌شنبه",
    Wednesday: "چهارشنبه",
    Thursday: "پنج‌شنبه",
    Friday: "جمعه",
  };
  const persianWeekdayName = weekdayMap[iranTime.weekday] || "امروز";
  const persianMonthName = PERSIAN_MONTHS[jalali.jm - 1] || "";
  const persianDateStr = `${toPersianDigits(jalali.jd)} ${persianMonthName} ${toPersianDigits(jalali.jy)}`;

  const reports: FridayReportRecord[] = rows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentProfileId: r.studentProfileId || undefined,
    cohortId: r.cohortId || undefined,
    weekNumber: r.weekNumber,
    studyHoursCivil: r.studyHoursCivil,
    studyHoursCriminal: r.studyHoursCriminal,
    studyHoursTrade: r.studyHoursTrade,
    studyHoursProcedure: r.studyHoursProcedure,
    totalHours: r.totalHours,
    testsCount: r.testsCount,
    weakPoints: r.weakPoints || undefined,
    strengths: r.strengths || undefined,
    studentNotes: r.studentNotes || undefined,
    status: (r.status as "SUBMITTED" | "APPROVED" | "REJECTED") || "SUBMITTED",
    mentorFeedback: r.mentorFeedback || undefined,
    mentorReviewedAt: r.mentorReviewedAt || undefined,
    supervisorApproval: r.supervisorApproval,
    // Module 5: Hide supervisor notes on Friday reports from students
    supervisorNotes: session.role === "STUDENT" ? undefined : (r.supervisorNotes || undefined),
    supervisorApprovedAt: session.role === "STUDENT" ? undefined : (r.supervisorApprovedAt || undefined),
    submittedAt: r.submittedAt,
    updatedAt: r.updatedAt,
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <FridayReportClient
        initialReports={reports}
        studentName={session.fullName}
        isFriday={isFriday}
        currentWeekNumber={currentWeekNumber}
        isAdmin={session.role === "ADMIN"}
        persianWeekdayName={persianWeekdayName}
        persianDateStr={persianDateStr}
      />
    </div>
  );
}
