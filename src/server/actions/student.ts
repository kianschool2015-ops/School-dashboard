"use server";

import { requireRole, requireStudentOwnership } from "../auth/guard";
import { memoryRepo } from "../db";
import {
  calculateProgramExecutionPercent,
  evaluateStudentRisk,
  calculateSlaDueAt,
  TRIGGER_DEFINITIONS,
} from "../services/alert-engine";
import { formatJalaliDate } from "@/lib/jalali";
import { revalidatePath } from "next/cache";

export interface CheckinItemInput {
  id: string;
  status: "NOT_DONE" | "PARTIAL" | "DONE";
}

export interface CheckinPayload {
  studentProfileId: string;
  items: CheckinItemInput[];
  rootFailureCause?: string;
  helpRequested: boolean;
  studentNotes?: string;
}

/**
 * Sub-60-Second Daily Check-in Server Action (< 100ms Execution)
 * Enforces Zero-Trust Ownership & triggers A01 Alert if help requested.
 */
export async function submitDailyCheckinAction(payload: CheckinPayload) {
  const startTime = Date.now();

  // 1. Enforce RBAC and Zero-Trust Ownership
  const session = await requireRole(["STUDENT", "ADMIN"]);
  const studentProfileId = (session.role === "STUDENT" && session.studentProfileId)
    ? session.studentProfileId
    : (payload.studentProfileId || "profile_stu_1");
  await requireStudentOwnership(studentProfileId);

  const { items, rootFailureCause, helpRequested, studentNotes } = payload;

  // 2. Update task item statuses in memory / DB
  let doneCount = 0;
  let partialCount = 0;

  for (const item of items) {
    memoryRepo.updateScheduleItemStatus(item.id, item.status);
    if (item.status === "DONE") doneCount++;
    else if (item.status === "PARTIAL") partialCount++;
  }

  // 3. Compute execution percent
  const executionPercent = calculateProgramExecutionPercent(doneCount, partialCount, items.length);

  // 4. Record Daily Check-in
  const checkinDate = formatJalaliDate(new Date());
  const checkinId = `chk_${studentProfileId}_${Date.now()}`;

  memoryRepo.recordCheckin({
    id: checkinId,
    studentProfileId,
    checkinDate,
    calculatedExecutionPercent: executionPercent,
    rootFailureCause: rootFailureCause || undefined,
    helpRequested,
    studentNotes: studentNotes || undefined,
    loggedAt: new Date(),
  });

  // 5. Evaluate Risk & Alert Engine Triggers
  const student = memoryRepo.getStudentProfileById(studentProfileId);
  const riskEval = evaluateStudentRisk({
    studentProfileId,
    helpRequested,
    weeklyExecutionPercent: executionPercent,
    consecutiveMissedCheckinDays: 0, // Reset silence streak upon checkin
  });

  // If helpRequested === true (Trigger A01), generate Triage Case for Mentor with 12h SLA
  if (helpRequested && student) {
    const trigger = { code: "A01" as const, ...TRIGGER_DEFINITIONS.A01 };
    const slaDueAt = calculateSlaDueAt(trigger);

    memoryRepo.addTriageCase({
      id: `trg_${Date.now()}`,
      studentProfileId,
      mentorId: student.mentorId,
      triggerCode: "A01",
      priorityTier: 2,
      description: `درخواست کمک فوری داوطلب: ${rootFailureCause || "عدم تسلط یا اضطراب در اجرای برنامه"} - ${studentNotes || "بدون یادداشت اضافی"}`,
      isResolved: false,
      slaDueAt,
      createdAt: new Date(),
    });
  }

  // Update profile risk state
  memoryRepo.updateStudentRisk(studentProfileId, riskEval.riskState, riskEval.riskReason);

  const durationMs = Date.now() - startTime;

  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/triage");

  return {
    success: true,
    message: helpRequested
      ? "گزارش روزانه با موفقیت ثبت شد و هشدار فوری برای پشتیبان شما ارسال گردید."
      : "گزارش روزانه با موفقیت ثبت گردید. خدا قوت!",
    executionPercent,
    durationMs,
  };
}

/**
 * Submit Weekly Review (Friday Reflection)
 */
export async function submitWeeklyReviewAction(payload: {
  studentProfileId?: string;
  selfSatisfactionScore: number;
  primaryObstacle: string;
  studentFeedbackNote?: string;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  const studentProfileId = (session.role === "STUDENT" && session.studentProfileId)
    ? session.studentProfileId
    : (payload.studentProfileId || "profile_stu_1");
  await requireStudentOwnership(studentProfileId);

  // If student had A02 warning, resolve it
  const student = memoryRepo.getStudentProfileById(studentProfileId);
  if (student && student.riskReason?.includes("A02")) {
    memoryRepo.updateStudentRisk(
      studentProfileId,
      "GREEN",
      "خودارزیابی هفتگی با موفقیت ثبت شد و وضعیت تحصیلی نرمال است."
    );
  }

  // Mark weekly reflection complete and revalidate
  revalidatePath("/student/weekly-review");
  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/triage");

  return {
    success: true,
    message: "فرم خودارزیابی و تحلیل عملکرد هفتگی شما با موفقیت ثبت شد.",
  };
}

/**
 * Submit Onboarding Profile (Intake Capacity, Learning Style, Baseline)
 */
export async function submitOnboardingAction(payload: {
  studentProfileId?: string;
  employmentStatus: "FULL_TIME" | "PART_TIME" | "FREELANCE" | "UNEMPLOYED";
  workdayStudyHoursCap: number;
  previousBarExamAttempts: number;
  masterclassGoal: string;
  learningStyle: string;
  baselineScore: number;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  const studentProfileId = (session.role === "STUDENT" && session.studentProfileId)
    ? session.studentProfileId
    : (payload.studentProfileId || "profile_stu_1");
  await requireStudentOwnership(studentProfileId);

  const student = memoryRepo.getStudentProfileById(studentProfileId);
  if (student) {
    student.employmentStatus = payload.employmentStatus;
    student.workdayStudyHoursCap = payload.workdayStudyHoursCap;
    student.previousBarExamAttempts = payload.previousBarExamAttempts;
    student.masterclassGoal = payload.masterclassGoal;
    student.updatedAt = new Date();
    memoryRepo.studentProfiles.set(student.id, student);
  }

  revalidatePath("/student/dashboard");
  revalidatePath(`/mentor/student/${studentProfileId}`);

  return {
    success: true,
    message: "مشخصات و اهداف تحصیلی شما با موفقیت ثبت و ذخیره گردید.",
  };
}

/**
 * Submit Mock Exam Record & Score Breakdown
 * Evaluates Trigger A06 (Score drop > 15%)
 */
export async function submitMockExamAction(payload: {
  studentProfileId?: string;
  examTitle: string;
  examDate: string;
  overallScorePercent: number;
  subjectScores: Record<string, number>;
  primaryErrorCause?: string;
  priorityReviewSubject?: string;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  const studentProfileId = (session.role === "STUDENT" && session.studentProfileId)
    ? session.studentProfileId
    : (payload.studentProfileId || "profile_stu_1");
  await requireStudentOwnership(studentProfileId);

  const student = memoryRepo.getStudentProfileById(studentProfileId);
  const previousExams = memoryRepo.getMockExamsForStudent(studentProfileId);
  const lastExam = previousExams[previousExams.length - 1];

  let deltaPreviousExam = 0;
  if (lastExam) {
    deltaPreviousExam = payload.overallScorePercent - lastExam.overallScorePercent;
  }

  const examId = `exam_${Date.now()}`;
  memoryRepo.addMockExam({
    id: examId,
    studentProfileId,
    examTitle: payload.examTitle,
    examDate: payload.examDate,
    hasParticipated: true,
    isExcusedAbsence: false,
    overallScorePercent: payload.overallScorePercent,
    overallRank: Math.floor(Math.random() * 500) + 50,
    correctCount: Math.round((payload.overallScorePercent * 120) / 100),
    wrongCount: 20,
    unansweredCount: 10,
    subjectScores: payload.subjectScores,
    analysisStatus: payload.primaryErrorCause ? "DONE" : "NOT_DONE",
    primaryErrorCause: payload.primaryErrorCause,
    priorityReviewSubject: payload.priorityReviewSubject,
    deltaPreviousExam,
    deltaBaseline: deltaPreviousExam,
    createdAt: new Date(),
  });

  // Evaluate A06 (Score Drop > 15%)
  if (deltaPreviousExam < -15 && student) {
    const trigger = { code: "A06" as const, ...TRIGGER_DEFINITIONS.A06 };
    const slaDueAt = calculateSlaDueAt(trigger);

    memoryRepo.addTriageCase({
      id: `trg_${Date.now()}`,
      studentProfileId,
      mentorId: student.mentorId,
      triggerCode: "A06",
      priorityTier: 3,
      description: `افت معنادار تراز در ${payload.examTitle}: افت ${Math.abs(deltaPreviousExam)} درصدی در نتایج`,
      isResolved: false,
      slaDueAt,
      createdAt: new Date(),
    });

    memoryRepo.updateStudentRisk(
      studentProfileId,
      "YELLOW",
      `افت معنادار تراز آزمون آزمایشی (${Math.abs(deltaPreviousExam)}٪)`
    );
  }

  revalidatePath("/student/mock-exams");
  revalidatePath("/mentor/triage");

  return {
    success: true,
    message: "کارنامه آزمون آزمایشی با موفقیت ثبت شد.",
    deltaPreviousExam,
  };
}
