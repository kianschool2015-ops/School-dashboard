"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { WeeklyPlanTemplateRecord, ScheduleItemRecord } from "@/types/models";

/**
 * Create Weekly Plan Template (by Supervisor)
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

  memoryRepo.addWeeklyPlanTemplate(newTpl);

  revalidatePath("/plans");
  revalidatePath("/supervisor");

  return {
    success: true,
    message: "تمپلیت برنامه هفتگی با موفقیت ثبت شد و در دسترس پشتیبان‌ها قرار گرفت.",
    templateId: tplId,
  };
}

/**
 * Assign and Tailor Weekly Plan to a Specific Student (by Mentor or Manager)
 */
export async function applyTailoredPlanToStudentAction(payload: {
  studentProfileId: string;
  templateId?: string;
  weeklyMainGoal: string;
  items: Omit<ScheduleItemRecord, "id" | "scheduleId">[];
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const student = memoryRepo.getStudentProfileById(payload.studentProfileId);
  if (!student) {
    return { success: false, message: "داوطلب یافت نشد." };
  }

  // Mentor can only customize for their own students
  if (session.role === "MENTOR" && student.mentorId !== session.userId) {
    return { success: false, message: "شما تنها مجاز به تنظیم برنامه داوطلبان تحت سرپرستی خود هستید." };
  }

  const user = memoryRepo.getUserById(student.userId);

  // Convert to ScheduleItemRecord[]
  const scheduleId = `sch_${payload.studentProfileId}_${Date.now()}`;
  const formattedItems: ScheduleItemRecord[] = payload.items.map((it, idx) => ({
    id: `item_${Date.now()}_${idx}`,
    scheduleId,
    dayOfWeek: it.dayOfWeek,
    subject: it.subject,
    activityType: it.activityType,
    topicDescription: it.topicDescription,
    targetVolume: it.targetVolume,
    targetDurationMinutes: it.targetDurationMinutes,
    isCatchup: it.isCatchup,
    status: it.status || "NOT_DONE",
    isTemplateOverride: true,
  }));

  memoryRepo.setScheduleItemsForStudent(payload.studentProfileId, formattedItems);

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
    message: `برنامه هفتگی با موفقیت برای داوطلب (${user?.fullName || "داوطلب"}) شخصی‌سازی و فعال گردید.`,
  };
}
