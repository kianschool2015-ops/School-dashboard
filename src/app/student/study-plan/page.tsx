import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import {
  studentProfiles,
  scheduleItems,
  studentSchedules,
  dailyCheckins,
  users,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getStudyWeekBoundaries,
  getPersianDayOfWeek,
  formatJalaliDate,
} from "@/lib/jalali";
import { StudyPlanClient } from "./study-plan-client";
import type { ScheduleItemRecord, DailyCheckinRecord } from "@/types/models";

export default async function StudentStudyPlanPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  let studentProfileId = session.studentProfileId;
  let student: typeof studentProfiles.$inferSelect | null = null;
  let items: ScheduleItemRecord[] = [];
  let mentorName = "پشتیبان علمی مشاهیر دانش";
  let weeklyMainGoal = "";
  let todayCheckin: DailyCheckinRecord | null = null;

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    if (studentProfileId) {
      const [found] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, studentProfileId))
        .limit(1);
      student = found || null;
    }

    if (!student) {
      const [foundByUser] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      student = foundByUser || null;
      if (student) {
        studentProfileId = student.id;
      }
    }

    if (!student) {
      const newProfileId = `profile_${session.userId}`;
      const [created] = await db
        .insert(studentProfiles)
        .values({
          id: newProfileId,
          userId: session.userId,
          mentorId: "usr_mentor1",
          employmentStatus: "UNEMPLOYED",
          isStudent: false,
          maritalStatus: "SINGLE",
          hasChildren: false,
          childrenCount: 0,
          hasFamilyCareDuty: false,
          workdayStudyHoursCap: 8,
          holidayStudyHoursCap: 12,
          bestStudyTime: "MORNING",
          previousBarExamAttempts: 0,
          currentDailyStudyHours: 6,
          masterclassGoal: "قبولی در آزمون وکالت کانون وکلای دادگستری",
          riskStatus: "GREEN",
          riskReason: "داوطلب فعال سامانه مشاهیر دانش",
          hasActiveSupport: true,
          enrolledCourseCode: "GARNET-BAR-360",
          enrolledCourseName: "دوره جامع آمادگی آزمون وکالت",
          lastContactAt: new Date(),
        })
        .returning();
      student = created;
      studentProfileId = newProfileId;
    }

    if (student) {
      // Find mentor name
      if (student.mentorId) {
        const [mentorUser] = await db
          .select({ fullName: users.fullName })
          .from(users)
          .where(eq(users.id, student.mentorId))
          .limit(1);
        if (mentorUser) {
          mentorName = mentorUser.fullName;
        }
      }

      // Find student schedule for current week or latest
      const [studentSchedule] = await db
        .select()
        .from(studentSchedules)
        .where(eq(studentSchedules.studentProfileId, student.id))
        .orderBy(desc(studentSchedules.id))
        .limit(1);

      if (studentSchedule) {
        weeklyMainGoal = studentSchedule.weeklyMainGoal || "";
        const rawItems = await db
          .select()
          .from(scheduleItems)
          .where(eq(scheduleItems.scheduleId, studentSchedule.id));

        items = rawItems.map((r) => ({
          id: r.id,
          scheduleId: r.scheduleId,
          dayOfWeek: r.dayOfWeek,
          subject: r.subject,
          activityType: r.activityType as any,
          topicDescription: r.topicDescription,
          targetVolume: r.targetVolume,
          targetDurationMinutes: r.targetDurationMinutes,
          isCatchup: r.isCatchup,
          status: r.status as any,
        }));
      }

      // Check today's checkin
      const todayDateStr = formatJalaliDate(new Date());
      const [foundCheckin] = await db
        .select()
        .from(dailyCheckins)
        .where(
          and(
            eq(dailyCheckins.studentProfileId, student.id),
            eq(dailyCheckins.checkinDate, todayDateStr)
          )
        )
        .limit(1);

      if (foundCheckin) {
        todayCheckin = {
          id: foundCheckin.id,
          studentProfileId: foundCheckin.studentProfileId,
          checkinDate: foundCheckin.checkinDate,
          calculatedExecutionPercent: foundCheckin.calculatedExecutionPercent,
          plannedHours: foundCheckin.plannedHours ?? 6,
          actualHours: foundCheckin.actualHours ?? 0,
          rootFailureCause: foundCheckin.rootFailureCause || undefined,
          helpRequested: foundCheckin.helpRequested,
          studentNotes: foundCheckin.studentNotes || undefined,
          loggedAt: foundCheckin.loggedAt,
        };
      }
    }
  } catch (err) {
    console.warn("[StudentStudyPlan] DB query error:", err);
  }

  const { weekStartDate, weekEndDate, jalaliYear, jalaliWeekNumber } = getStudyWeekBoundaries();
  const currentDayOfWeek = getPersianDayOfWeek(new Date());

  return (
    <StudyPlanClient
      studentProfileId={studentProfileId || ""}
      studentName={session.fullName}
      mentorName={mentorName}
      weekStartDate={weekStartDate}
      weekEndDate={weekEndDate}
      jalaliYear={jalaliYear}
      jalaliWeekNumber={jalaliWeekNumber}
      currentDayOfWeek={currentDayOfWeek}
      items={items}
      todayCheckin={todayCheckin}
      weeklyMainGoal={weeklyMainGoal}
    />
  );
}
