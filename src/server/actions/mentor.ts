"use server";

import { requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { revalidatePath } from "next/cache";

/**
 * Resolve a Triage Case by Mentor or Supervisor
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

  // IDOR Protection: Verify case ownership
  const targetCase = memoryRepo.triageCases.get(payload.caseId);
  if (!targetCase) {
    return {
      success: false,
      message: "پرونده پایش مورد نظر یافت نشد.",
    };
  }

  if (session.role === "MENTOR" && targetCase.mentorId !== session.userId) {
    return {
      success: false,
      message: "شما تنها مجاز به رسیدگی به پرونده‌های داوطلبان تحت سرپرستی خود هستید.",
    };
  }

  const updatedCase = memoryRepo.resolveTriageCase(
    payload.caseId,
    payload.interventionNotes
  );

  if (!updatedCase) {
    return {
      success: false,
      message: "پرونده پایش مورد نظر یافت نشد.",
    };
  }

  // Check remaining active cases for this student
  const activeCases = memoryRepo
    .getTriageCasesByMentor(session.userId, true)
    .filter((c) => c.studentProfileId === updatedCase.studentProfileId);

  // If no remaining active cases, return student risk to GREEN
  if (activeCases.length === 0) {
    memoryRepo.updateStudentRisk(
      updatedCase.studentProfileId,
      "GREEN",
      "وضعیت آموزشی پایدار و چالش‌های تحصیلی با موفقیت مرتفع شدند."
    );
  }

  revalidatePath("/mentor/triage");
  revalidatePath(`/mentor/student/${updatedCase.studentProfileId}`);

  return {
    success: true,
    message: "پرونده پایش با موفقیت مختومه شد و مداخله آموزشی در سوابق داوطلب ثبت گردید.",
  };
}

/**
 * Log phone coaching contact with student
 */
export async function logMentorContactAction(payload: {
  studentProfileId: string;
  notes: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "ADMIN", "CEO"]);

  const student = memoryRepo.getStudentProfileById(payload.studentProfileId);
  if (!student) {
    return { success: false, message: "داوطلب یافت نشد." };
  }

  // IDOR Protection: Mentor can only log contact with assigned students
  if (session.role === "MENTOR" && student.mentorId !== session.userId) {
    return {
      success: false,
      message: "شما تنها مجاز به ثبت گزارش برای داوطلبان اختصاصی خود هستید.",
    };
  }

  student.lastContactAt = new Date();
  memoryRepo.studentProfiles.set(student.id, student);

  // Automatically resolve any pending A08 (communication silence / 4-day dropout) triage alerts
  const studentCases = memoryRepo.getTriageCasesForStudent(payload.studentProfileId);
  for (const c of studentCases) {
    if (!c.isResolved && c.triggerCode === "A08") {
      memoryRepo.resolveTriageCase(c.id, `تماس برقرار شد و وضعیت داوطلب پیگیری گردید: ${payload.notes}`);
    }
  }

  // Check if all active alerts are resolved
  const remainingActive = memoryRepo
    .getTriageCasesForStudent(payload.studentProfileId)
    .filter((c) => !c.isResolved);
  if (remainingActive.length === 0) {
    memoryRepo.updateStudentRisk(
      payload.studentProfileId,
      "GREEN",
      "ارتباط تلفنی با موفقیت برقرار شد و داوطلب به روال عادی مطالعه بازگشت."
    );
  }

  revalidatePath(`/mentor/student/${payload.studentProfileId}`);
  revalidatePath("/mentor/triage");
  revalidatePath("/executive");

  return {
    success: true,
    message: "تماس تلفنی و نکات مشاوره با موفقیت در پرونده ۳۶۰ درجه ثبت شد و هشدار A08 رفع گردید.",
  };
}
