"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { db } from "../db";
import {
  weeklyPlanTemplates,
  studentProfiles,
  studentSchedules,
  scheduleItems,
  users,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { WeeklyPlanTemplateRecord, ScheduleItemRecord } from "@/types/models";

/**
 * Create Weekly Plan Template (by Supervisor) via Drizzle ORM
 */
export async function createWeeklyPlanTemplateAction(payload: {
  title: string;
  jalaliYear: number;
  jalaliWeekNumber: number;
  targetCohort: string;
  weeklyMainGoal: string;
  items: Omit<ScheduleItemRecord, "id" | "scheduleId">[];
}) {
  const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  const tplId = `tpl_${Date.now()}`;
  const newTpl: WeeklyPlanTemplateRecord = {
    id: tplId,
    authorId: session.userId,
    authorName: session.fullName,
    title: payload.title.trim(),
    jalaliYear: payload.jalaliYear,
    jalaliWeekNumber: payload.jalaliWeekNumber,
    targetCohort: payload.targetCohort.trim(),
    weeklyMainGoal: payload.weeklyMainGoal.trim(),
    items: payload.items,
    createdAt: new Date(),
  };

  await db.insert(weeklyPlanTemplates).values({
    id: tplId,
    authorId: session.userId,
    authorName: session.fullName,
    title: payload.title.trim(),
    jalaliYear: payload.jalaliYear,
    jalaliWeekNumber: payload.jalaliWeekNumber,
    targetCohort: payload.targetCohort.trim(),
    weeklyMainGoal: payload.weeklyMainGoal.trim(),
    items: payload.items,
  });

  revalidatePath("/plans");
  revalidatePath("/supervisor");

  return {
    success: true,
    message: "تمپلیت برنامه هفتگی با موفقیت ثبت شد و در دسترس پشتیبان‌ها قرار گرفت.",
    templateId: tplId,
  };
}

/**
 * Assign and Tailor Weekly Plan to a Specific Student (by Mentor or Manager) via Drizzle ORM
 * Enforces Zero-Trust Mentor Ownership (Track 4)
 */
export async function applyTailoredPlanToStudentAction(payload: {
  studentProfileId: string;
  templateId?: string;
  weeklyMainGoal: string;
  items: Omit<ScheduleItemRecord, "id" | "scheduleId">[];
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, payload.studentProfileId))
    .limit(1);

  if (!student) {
    return { success: false, message: "داوطلب یافت نشد." };
  }

  // Track 4: Mentor can only customize for their own students
  if (session.role === "MENTOR" && student.mentorId !== session.userId) {
    return { success: false, message: "شما تنها مجاز به تنظیم برنامه داوطلبان تحت سرپرستی خود هستید." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, student.userId))
    .limit(1);

  const scheduleId = `sch_${payload.studentProfileId}_${Date.now()}`;

  await db.insert(studentSchedules).values({
    id: scheduleId,
    studentProfileId: payload.studentProfileId,
    jalaliYear: 1403,
    jalaliWeekNumber: 30,
    weekStartDate: "1403-08-01",
    weekEndDate: "1403-08-07",
    weeklyMainGoal: payload.weeklyMainGoal.trim(),
    isTemplateOverride: true,
  });

  for (const [idx, it] of payload.items.entries()) {
    await db.insert(scheduleItems).values({
      id: `item_${Date.now()}_${idx}`,
      scheduleId,
      dayOfWeek: it.dayOfWeek,
      subject: it.subject,
      activityType: it.activityType || "STUDY",
      topicDescription: it.topicDescription,
      targetVolume: it.targetVolume,
      targetDurationMinutes: it.targetDurationMinutes,
      isCatchup: it.isCatchup || false,
      status: it.status || "NOT_DONE",
    });
  }

  // Send SMS to student notifying them of new weekly plan
  if (user) {
    await sendSystemSms({
      event: "WEEKLY_PLAN_ASSIGNED",
      recipientPhone: user.phoneNumber,
      recipientName: user.fullName,
      variables: {
        name: user.fullName,
      },
    });
  }

  revalidatePath("/plans");
  revalidatePath("/student/dashboard");
  revalidatePath(`/mentor/student/${payload.studentProfileId}`);

  return {
    success: true,
    message: "برنامه هفتگی شخصی‌سازی‌شده با موفقیت برای داوطلب ثبت گردید و پیامک اطلاع‌رسانی ارسال شد.",
    scheduleId,
  };
}
