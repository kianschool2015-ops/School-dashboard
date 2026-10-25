"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { triageCases, studentProfiles, voipCalls, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { maskPhoneNumber } from "../services/voip";

/**
 * Resolve a Triage Case by Mentor or Supervisor
 * Enforces Zero-Trust Mentor-to-Candidate Isolation (Track 4)
 */
export async function resolveTriageCaseAction(payload: {
  caseId: string;
  interventionNotes: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "ADMIN", "CEO"]);

  if (!payload.interventionNotes || payload.interventionNotes.trim().length < 5) {
    return {
      success: false,
      message: "ثبت شرح اقدام مداخله‌ای پشتیبان (حداقل ۵ کاراکتر) الزامی است.",
    };
  }

  // IDOR Protection: Query case from PostgreSQL via Drizzle ORM
  const [targetCase] = await db
    .select()
    .from(triageCases)
    .where(eq(triageCases.id, payload.caseId))
    .limit(1);

  if (!targetCase) {
    return {
      success: false,
      message: "پرونده پایش مورد نظر یافت نشد.",
    };
  }

  // Track 4: Mentor-to-Candidate Isolation
  if (session.role === "MENTOR" && targetCase.mentorId !== session.userId) {
    return {
      success: false,
      message: "شما تنها مجاز به رسیدگی به پرونده‌های داوطلبان تحت سرپرستی خود هستید.",
    };
  }

  // Update triage case status
  await db
    .update(triageCases)
    .set({
      isResolved: true,
      resolvedAt: new Date(),
      interventionNotes: payload.interventionNotes.trim(),
    })
    .where(eq(triageCases.id, payload.caseId));

  // Check remaining active cases for this student
  const activeCases = await db
    .select()
    .from(triageCases)
    .where(
      and(
        eq(triageCases.studentProfileId, targetCase.studentProfileId),
        eq(triageCases.isResolved, false)
      )
    );

  // If no remaining active cases, return student risk to GREEN
  if (activeCases.length === 0) {
    await db
      .update(studentProfiles)
      .set({
        riskStatus: "GREEN",
        riskReason: "وضعیت آموزشی پایدار و چالش‌های تحصیلی با موفقیت مرتفع شدند.",
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, targetCase.studentProfileId));
  }

  revalidatePath("/mentor/triage");
  revalidatePath(`/mentor/student/${targetCase.studentProfileId}`);

  return {
    success: true,
    message: "پرونده پایش با موفقیت مختومه شد و مداخله آموزشی در سوابق داوطلب ثبت گردید.",
  };
}

/**
 * Log phone coaching contact with student & persist conversation notes into VoIP call history
 * Enforces Zero-Trust Mentor-to-Candidate Isolation (Track 4)
 */
export async function logMentorContactAction(payload: {
  studentProfileId: string;
  notes: string;
  durationMinutes?: number;
  callStatus?: string;
  topic?: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "ADMIN", "CEO"]);

  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, payload.studentProfileId))
    .limit(1);

  if (!student) {
    return { success: false, message: "داوطلب یافت نشد." };
  }

  // Track 4: Mentor IDOR Protection: Mentor can only log contact with assigned students
  if (session.role === "MENTOR" && student.mentorId !== session.userId) {
    return {
      success: false,
      message: "شما تنها مجاز به ثبت گزارش برای داوطلبان اختصاصی خود هستید.",
    };
  }

  // Get student user record for student full name and masked phone
  const [studentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, student.userId))
    .limit(1);

  const studentName = studentUser?.fullName || "داوطلب آزمون وکالت";
  const maskedPhone = maskPhoneNumber(studentUser?.phoneNumber || "09120000000");

  const durationSec = Math.max(1, (payload.durationMinutes || 10) * 60);
  const callId = `call_${Date.now()}`;
  const formattedNotes = payload.topic
    ? `[موضوع: ${payload.topic.trim()}]\n${payload.notes.trim()}`
    : payload.notes.trim();

  // Persist conversation note into voip_calls
  try {
    await db.insert(voipCalls).values({
      id: callId,
      mentorId: session.userId,
      mentorName: session.fullName,
      mentorExtension: "101",
      studentProfileId: student.id,
      studentName,
      maskedPhone,
      status: payload.callStatus || "COMPLETED",
      durationSeconds: durationSec,
      callUniqueId: `manual_${Date.now()}`,
      initiatedAt: new Date(),
      notes: formattedNotes,
    });
  } catch (err) {
    console.warn("⚠️ [VoIP Note] Failed to insert into voip_calls table:", err);
  }

  // Update last contact timestamp on student profile
  await db
    .update(studentProfiles)
    .set({
      lastContactAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, student.id));

  // Automatically resolve any pending A08 (communication silence) triage alerts
  await db
    .update(triageCases)
    .set({
      isResolved: true,
      resolvedAt: new Date(),
      interventionNotes: `تماس برقرار شد و وضعیت داوطلب پیگیری گردید: ${payload.notes.trim()}`,
    })
    .where(
      and(
        eq(triageCases.studentProfileId, payload.studentProfileId),
        eq(triageCases.triggerCode, "A08"),
        eq(triageCases.isResolved, false)
      )
    );

  // Check if all active alerts are resolved
  const remainingActive = await db
    .select()
    .from(triageCases)
    .where(
      and(
        eq(triageCases.studentProfileId, payload.studentProfileId),
        eq(triageCases.isResolved, false)
      )
    );

  if (remainingActive.length === 0) {
    await db
      .update(studentProfiles)
      .set({
        riskStatus: "GREEN",
        riskReason: "ارتباط تلفنی با موفقیت برقرار شد و داوطلب به روال عادی مطالعه بازگشت.",
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, payload.studentProfileId));
  }

  revalidatePath("/mentor/students");
  revalidatePath(`/mentor/student/${payload.studentProfileId}`);
  revalidatePath("/mentor/triage");
  revalidatePath("/plans");
  revalidatePath("/executive");

  return {
    success: true,
    message: "یادداشت مشاوره و گزارش مکالمه با موفقیت ثبت شد و در سوابق داوطلب ذخیره گردید.",
    callId,
  };
}

/**
 * Retrieve consultation notes & call history for a specific candidate
 * Enforces Zero-Trust Mentor Ownership (Track 4)
 */
export async function getStudentConsultationNotesAction(studentProfileId: string) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "ADMIN", "CEO"]);

  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  if (!student) {
    return { success: false, message: "داوطلب یافت نشد.", calls: [] };
  }

  if (session.role === "MENTOR" && student.mentorId !== session.userId) {
    return {
      success: false,
      message: "عدم دسترسی: شما تنها مجاز به مشاهده سوابق داوطلبان اختصاصی خود هستید.",
      calls: [],
    };
  }

  const calls = await db
    .select()
    .from(voipCalls)
    .where(eq(voipCalls.studentProfileId, studentProfileId))
    .orderBy(desc(voipCalls.initiatedAt));

  return {
    success: true,
    calls,
  };
}

/**
 * Update an existing consultation note or add follow-up notes
 */
export async function updateConsultationNoteAction(payload: {
  callId: string;
  notes: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "ADMIN", "CEO"]);

  const [callRecord] = await db
    .select()
    .from(voipCalls)
    .where(eq(voipCalls.id, payload.callId))
    .limit(1);

  if (!callRecord) {
    return { success: false, message: "رکورد تماس یافت نشد." };
  }

  if (session.role === "MENTOR" && callRecord.mentorId !== session.userId) {
    return { success: false, message: "شما مجاز به ویرایش این یادداشت نیستید." };
  }

  await db
    .update(voipCalls)
    .set({
      notes: payload.notes.trim(),
    })
    .where(eq(voipCalls.id, payload.callId));

  revalidatePath("/mentor/students");
  revalidatePath(`/mentor/student/${callRecord.studentProfileId}`);

  return {
    success: true,
    message: "یادداشت مشاوره با موفقیت به‌روزرسانی شد.",
  };
}
