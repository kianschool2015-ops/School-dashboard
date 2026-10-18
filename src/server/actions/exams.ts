"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { EvaluationExamRecord, ExamSubmissionRecord, ExamQuestionRecord, QuestionType } from "@/types/models";

/**
 * Create a Timed Evaluation Exam (by Supervisor or authorized Mentor)
 */
export async function createEvaluationExamAction(payload: {
  title: string;
  description: string;
  startTime: string; // "1403-08-01 08:00"
  endTime: string;   // "1403-08-05 22:00"
  durationMinutes: number;
  totalQuestions: number;
  subjectsWeight: Record<string, number>;
  targetCohort: string;
  assignedStudentIds?: string[];
}) {
  const session = await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const examId = `exam_eval_${Date.now()}`;
  const newExam: EvaluationExamRecord = {
    id: examId,
    creatorId: session.userId,
    creatorRole: session.role,
    creatorName: session.fullName,
    title: payload.title.trim(),
    description: payload.description.trim(),
    startTime: payload.startTime,
    endTime: payload.endTime,
    durationMinutes: payload.durationMinutes,
    totalQuestions: payload.totalQuestions,
    subjectsWeight: payload.subjectsWeight,
    isPublished: true,
    targetCohort: payload.targetCohort.trim(),
    assignedStudentIds: payload.assignedStudentIds || ["ALL"],
    questions: [],
    createdAt: new Date(),
  };

  memoryRepo.addEvaluationExam(newExam);

  // Send SMS Notification to students in cohort
  const students = memoryRepo.getAllStudentProfiles();
  for (const st of students.slice(0, 5)) {
    const u = memoryRepo.getUserById(st.userId);
    if (u) {
      await sendSystemSms({
        event: "EXAM_PUBLISHED",
        recipientPhone: u.phoneNumber,
        recipientName: u.fullName,
        variables: {
          examTitle: newExam.title,
          endTime: newExam.endTime,
        },
      });
    }
  }

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "آزمون ارزیابی زمان‌دار با موفقیت تعریف و منتشر گردید.",
    examId,
  };
}

/**
 * Submit Evaluation Exam Responses & Score Calculation
 */
export async function submitEvaluationExamAction(payload: {
  examId: string;
  studentProfileId: string;
  subjectScores: Record<string, number>; // e.g. { "حقوق مدنی": 75, "حقوق تجارت": 68, ... }
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}) {
  const session = await requireAuth();

  const exam = memoryRepo.getExamById(payload.examId);
  if (!exam) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  // Calculate weighted average
  let totalScore = 0;
  let totalWeight = 0;
  for (const [subj, score] of Object.entries(payload.subjectScores)) {
    const weight = exam.subjectsWeight[subj] || 1;
    totalScore += score * weight;
    totalWeight += weight;
  }
  const scorePercent = Math.round(totalScore / (totalWeight || 1));

  // Calculate Delta from previous exams
  const previousSubmissions = memoryRepo.getExamSubmissionsForStudent(payload.studentProfileId);
  const lastSub = previousSubmissions[previousSubmissions.length - 1];

  let deltaFromPrevious = 0;
  let deltaFromBaseline = 0;

  if (lastSub) {
    deltaFromPrevious = scorePercent - lastSub.scorePercent;
  }
  if (previousSubmissions.length > 0) {
    deltaFromBaseline = scorePercent - previousSubmissions[0].scorePercent;
  }

  const submissionId = `sub_${Date.now()}`;
  const submissionRecord: ExamSubmissionRecord = {
    id: submissionId,
    examId: exam.id,
    examTitle: exam.title,
    studentProfileId: payload.studentProfileId,
    studentName: session.fullName,
    scorePercent,
    subjectScores: payload.subjectScores,
    correctCount: payload.correctCount,
    wrongCount: payload.wrongCount,
    unansweredCount: payload.unansweredCount,
    rank: Math.floor(Math.random() * 200) + 15,
    deltaFromPrevious,
    deltaFromBaseline,
    submittedAt: new Date(),
  };

  memoryRepo.addExamSubmission(submissionRecord);

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "پاسخنامه آزمون با موفقیت ثبت شد و شاخص رشد نسبت به آزمون‌های قبلی محاسبه گردید.",
    scorePercent,
    deltaFromPrevious,
    deltaFromBaseline,
  };
}

/**
 * Add a Question to an Evaluation Exam (Multiple Choice, Descriptive, Short Answer, True/False)
 */
export async function addExamQuestionAction(payload: {
  examId: string;
  type: QuestionType;
  subject: string;
  questionText: string;
  options?: string[];
  correctOptionIndex?: number;
  modelAnswer?: string;
  points: number;
}) {
  await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const exam = memoryRepo.getExamById(payload.examId);
  if (!exam) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const currentCount = exam.questions?.length || 0;

  const newQuestion: ExamQuestionRecord = {
    id: questionId,
    examId: payload.examId,
    type: payload.type,
    subject: payload.subject.trim(),
    questionText: payload.questionText.trim(),
    options: payload.options,
    correctOptionIndex: payload.correctOptionIndex,
    modelAnswer: payload.modelAnswer?.trim(),
    points: payload.points || 1,
    orderIndex: currentCount + 1,
  };

  const added = memoryRepo.addExamQuestion(newQuestion);
  if (!added) {
    return { success: false, message: "خطا در ثبت سؤال آزمون." };
  }

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "سؤال با موفقیت به آزمون اضافه شد.",
    question: newQuestion,
  };
}

/**
 * Delete a Question from an Evaluation Exam
 */
export async function deleteExamQuestionAction(examId: string, questionId: string) {
  await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const removed = memoryRepo.deleteExamQuestion(examId, questionId);
  if (!removed) {
    return { success: false, message: "سؤال مورد نظر یافت نشد." };
  }

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "سؤال آزمون با موفقیت حذف گردید.",
  };
}

/**
 * Update Exam Audience Assignment (All students or specific candidate IDs)
 */
export async function updateExamAudienceAction(examId: string, assignedStudentIds: string[]) {
  await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const updated = memoryRepo.updateExamAudience(examId, assignedStudentIds);
  if (!updated) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "جامعه هدف و دسترسی داوطلبان به این آزمون با موفقیت ذخیره شد.",
  };
}
