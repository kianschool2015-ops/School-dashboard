"use server";

import { requireAuth, requireRole, requireStudentOwnership, getSession } from "../auth/guard";
import { db } from "../db";
import {
  evaluationExams,
  exams,
  examQuestions,
  examSubmissions,
  studentProfiles,
  studentWhitelist,
  entitledCourses,
  users,
  triageCases,
  auditLogs,
  mockExams,
  systemAuditLogs,
} from "../db/schema";
import { eq, and, desc, asc, ne, isNotNull, inArray } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { isExamDeadlinePassed, parseJalaliDateTime } from "@/lib/jalali";
import { getRedisClient } from "../redis";
import { enqueueExamSubmission } from "../queue/exam-queue";
import { revalidatePath } from "next/cache";
import { evaluateStudentRisk, calculateSlaDueAt } from "../services/alert-engine";
import { sanitizeUserForClient, maskPhoneNumber } from "@/lib/sanitize";
import type {
  EvaluationExamRecord,
  ExamSubmissionRecord,
  ExamQuestionRecord,
  QuestionType,
  ExamCategory,
  ExamTargetAudience,
  ExamOptionItem,
  ExamRecord,
  ExamQuestion,
  SubjectBreakdownItem,
  ExamSubmissionStatus,
} from "@/types/models";

/**
 * Route Guard for Exam Authoring:
 * Only CEO, SUPERVISOR, ADMIN, or MENTOR (with cohort scoping)
 */
async function verifyExamAuthorPermission(session: { role: string; userId: string }) {
  if (
    session.role === "CEO" ||
    session.role === "SUPERVISOR" ||
    session.role === "ADMIN" ||
    session.role === "MENTOR"
  ) {
    return;
  }
  throw new Error("شما مجوز لازم برای طراحی و بارگذاری آزمون را ندارید.");
}

/**
 * Ensures exam record exists in PostgreSQL before submission insert (Requirement 2)
 */
async function ensureExamExists(examId: string, examTitle?: string) {
  if (!examId) return;
  try {
    const existing = await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (existing.length === 0) {
      await db
        .insert(exams)
        .values({
          id: examId,
          title: examTitle || "آزمون شبیه‌ساز وکالت",
          category: "MOCK_BAR",
          examType: "MOCK_BAR",
          passingScore: 50,
          durationMinutes: 120,
          createdById: "usr_admin1",
          isPublished: true,
          targetAudience: "ALL",
          targetType: "ALL",
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.warn("[ensureExamExists] Warning ensuring exam exists in actions:", err);
  }
}

// ============================================================================
// 1. PRODUCTION EXAM BUILDER ACTIONS
// ============================================================================

/**
 * Create a new exam header in the production exams table
 */
export async function createExamAction(payload: {
  title: string;
  courseCode?: string | null;
  category: ExamCategory;
  examType?: string;
  passingScore?: number;
  durationMinutes: number;
  hasNegativeMarking: boolean;
  targetAudience?: ExamTargetAudience;
  targetType?: string;
  targetCourseCodes?: string[];
  targetCourses?: string[];
  targetStudentIds?: string[];
  targetMentorId?: string | null;
  startDate?: string | Date | null;
  expiryDate?: string | Date | null;
}): Promise<{ success: boolean; examId?: string; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    if (!payload.title.trim()) {
      return { success: false, message: "عنوان آزمون الزامی است." };
    }

    const examId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Parse Jalali / ISO date if string
    let parsedStartDate: Date | null = null;
    if (payload.startDate) {
      if (typeof payload.startDate === "string") {
        parsedStartDate = parseJalaliDateTime(payload.startDate) || new Date(payload.startDate);
      } else {
        parsedStartDate = payload.startDate;
      }
    }

    let parsedExpiryDate: Date | null = null;
    if (payload.expiryDate) {
      if (typeof payload.expiryDate === "string") {
        parsedExpiryDate = parseJalaliDateTime(payload.expiryDate) || new Date(payload.expiryDate);
      } else {
        parsedExpiryDate = payload.expiryDate;
      }
    }

    const targetType = payload.targetType || payload.targetAudience || "ALL";
    const targetMentorId =
      payload.targetMentorId || (session.role === "MENTOR" ? session.userId : null);

    await db.insert(exams).values({
      id: examId,
      title: payload.title.trim(),
      courseCode: payload.courseCode?.trim() || "GARNET-BAR-360",
      category: payload.category,
      examType: payload.examType || "MOCK_BAR",
      passingScore: payload.passingScore ?? 50,
      durationMinutes: payload.durationMinutes || 120,
      totalQuestions: 0,
      hasNegativeMarking: payload.hasNegativeMarking ?? true,
      isPublished: false,
      targetAudience: payload.targetAudience || "ALL",
      targetType,
      targetCourseCodes: payload.targetCourseCodes || [],
      targetCourses: payload.targetCourses || [],
      targetStudentIds: payload.targetStudentIds || [],
      targetMentorId,
      startDate: parsedStartDate,
      expiryDate: parsedExpiryDate,
      createdById: session.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/exams");
    revalidatePath("/exams/builder");
    revalidatePath(`/exams/builder/${examId}`);

    return {
      success: true,
      examId,
      message: "ساختار آزمون با موفقیت ایجاد گردید. اکنون می‌توانید سؤالات را طراحی کنید.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در ایجاد آزمون.",
    };
  }
}

/**
 * Update exam header details
 */
export async function updateExamHeaderAction(payload: {
  examId: string;
  title: string;
  courseCode?: string | null;
  category: ExamCategory;
  examType?: string;
  passingScore?: number;
  durationMinutes: number;
  hasNegativeMarking: boolean;
  targetAudience?: ExamTargetAudience;
  targetType?: string;
  targetCourseCodes?: string[];
  targetCourses?: string[];
  targetStudentIds?: string[];
  targetMentorId?: string | null;
  startDate?: string | Date | null;
  expiryDate?: string | Date | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    const [existing] = await db.select().from(exams).where(eq(exams.id, payload.examId)).limit(1);
    if (!existing) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    if (session.role === "MENTOR" && existing.createdById !== session.userId) {
      return { success: false, message: "شما تنها مجاز به ویرایش آزمون‌های طراحی‌شده توسط خود هستید." };
    }

    let parsedStartDate: Date | null = existing.startDate || null;
    if (payload.startDate !== undefined) {
      if (typeof payload.startDate === "string") {
        parsedStartDate = parseJalaliDateTime(payload.startDate) || new Date(payload.startDate);
      } else {
        parsedStartDate = payload.startDate;
      }
    }

    let parsedExpiryDate: Date | null = existing.expiryDate || null;
    if (payload.expiryDate !== undefined) {
      if (typeof payload.expiryDate === "string") {
        parsedExpiryDate = parseJalaliDateTime(payload.expiryDate) || new Date(payload.expiryDate);
      } else {
        parsedExpiryDate = payload.expiryDate;
      }
    }

    await db
      .update(exams)
      .set({
        title: payload.title.trim(),
        courseCode: payload.courseCode?.trim() || null,
        category: payload.category,
        examType: payload.examType || existing.examType || "MOCK_BAR",
        passingScore: payload.passingScore ?? existing.passingScore ?? 50,
        durationMinutes: payload.durationMinutes,
        hasNegativeMarking: payload.hasNegativeMarking,
        targetAudience: payload.targetAudience || existing.targetAudience || "ALL",
        targetType: payload.targetType || existing.targetType || "ALL",
        targetCourseCodes: payload.targetCourseCodes || existing.targetCourseCodes || [],
        targetCourses: payload.targetCourses || existing.targetCourses || [],
        targetStudentIds: payload.targetStudentIds || existing.targetStudentIds || [],
        targetMentorId: payload.targetMentorId !== undefined ? payload.targetMentorId : existing.targetMentorId,
        startDate: parsedStartDate,
        expiryDate: parsedExpiryDate,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, payload.examId));

    revalidatePath("/exams");
    revalidatePath(`/exams/builder/${payload.examId}`);

    return { success: true, message: "مشخصات کلی آزمون با موفقیت به‌روزرسانی شد." };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در به‌روزرسانی آزمون.",
    };
  }
}

/**
 * Add a Question to an Exam
 */
export async function addProductionExamQuestionAction(payload: {
  examId: string;
  subject: string;
  questionText: string;
  options: ExamOptionItem[];
  correctOption: number;
  explanation?: string;
  coefficient?: number;
}): Promise<{ success: boolean; questionId?: string; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    const [exam] = await db.select().from(exams).where(eq(exams.id, payload.examId)).limit(1);
    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    if (session.role === "MENTOR" && exam.createdById !== session.userId) {
      return { success: false, message: "شما تنها مجاز به ویرایش آزمون‌های خود هستید." };
    }

    // Count existing questions to set questionNumber
    const existingQuestions = await db
      .select({ id: examQuestions.id })
      .from(examQuestions)
      .where(eq(examQuestions.examId, payload.examId));

    const questionNumber = existingQuestions.length + 1;
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(examQuestions).values({
      id: questionId,
      examId: payload.examId,
      questionNumber,
      subject: payload.subject.trim(),
      questionText: payload.questionText.trim(),
      options: payload.options,
      correctOption: payload.correctOption,
      explanation: payload.explanation?.trim() || null,
      coefficient: payload.coefficient || 1,
    });

    // Update totalQuestions count on exam
    await db
      .update(exams)
      .set({
        totalQuestions: questionNumber,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, payload.examId));

    revalidatePath(`/exams/builder/${payload.examId}`);
    revalidatePath(`/student/exams/${payload.examId}`);

    return {
      success: true,
      questionId,
      message: `سؤال شماره ${questionNumber} با موفقیت به آزمون اضافه شد.`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در ثبت سؤال.",
    };
  }
}

/**
 * Update an existing Question
 */
export async function updateProductionExamQuestionAction(payload: {
  questionId: string;
  subject: string;
  questionText: string;
  options: ExamOptionItem[];
  correctOption: number;
  explanation?: string;
  coefficient?: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    const [q] = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.id, payload.questionId))
      .limit(1);

    if (!q) {
      return { success: false, message: "سؤال مورد نظر یافت نشد." };
    }

    const [exam] = await db.select().from(exams).where(eq(exams.id, q.examId)).limit(1);
    if (session.role === "MENTOR" && exam && exam.createdById !== session.userId) {
      return { success: false, message: "شما مجاز به ویرایش سؤالات این آزمون نیستید." };
    }

    await db
      .update(examQuestions)
      .set({
        subject: payload.subject.trim(),
        questionText: payload.questionText.trim(),
        options: payload.options,
        correctOption: payload.correctOption,
        explanation: payload.explanation?.trim() || null,
        coefficient: payload.coefficient || 1,
      })
      .where(eq(examQuestions.id, payload.questionId));

    revalidatePath(`/exams/builder/${q.examId}`);
    revalidatePath(`/student/exams/${q.examId}`);

    return { success: true, message: "سؤال با موفقیت به‌روزرسانی شد." };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در به‌روزرسانی سؤال.",
    };
  }
}

/**
 * Delete a Question from Exam
 */
export async function deleteProductionExamQuestionAction(
  examId: string,
  questionId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) {
      return { success: false, message: "آزمون یافت نشد." };
    }

    if (session.role === "MENTOR" && exam.createdById !== session.userId) {
      return { success: false, message: "شما مجاز به حذف سؤالات این آزمون نیستید." };
    }

    // [M-12] Atomic transactional question deletion and re-indexing
    await db.transaction(async (tx) => {
      await tx.delete(examQuestions).where(eq(examQuestions.id, questionId));

      // Re-index remaining question numbers
      const remaining = await tx
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, examId))
        .orderBy(asc(examQuestions.questionNumber));

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].questionNumber !== i + 1) {
          await tx
            .update(examQuestions)
            .set({ questionNumber: i + 1 })
            .where(eq(examQuestions.id, remaining[i].id));
        }
      }

      await tx
        .update(exams)
        .set({
          totalQuestions: remaining.length,
          updatedAt: new Date(),
        })
        .where(eq(exams.id, examId));
    });

    revalidatePath(`/exams/builder/${examId}`);
    revalidatePath(`/student/exams/${examId}`);

    return { success: true, message: "سؤال با موفقیت حذف و شماره سؤالات بازآرایی شد." };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در حذف سؤال.",
    };
  }
}

/**
 * Reorder questions in an exam
 */
export async function reorderExamQuestionsAction(
  examId: string,
  questionIdsInOrder: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    // [M-12] Atomic transactional question reordering
    await db.transaction(async (tx) => {
      for (let i = 0; i < questionIdsInOrder.length; i++) {
        await tx
          .update(examQuestions)
          .set({ questionNumber: i + 1 })
          .where(
            and(
              eq(examQuestions.id, questionIdsInOrder[i]),
              eq(examQuestions.examId, examId)
            )
          );
      }
    });

    revalidatePath(`/exams/builder/${examId}`);
    return { success: true, message: "ترتیب سؤالات با موفقیت ذخیره گردید." };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در تغییر ترتیب سؤالات.",
    };
  }
}

/**
 * Finalize & Publish Exam
 */
export async function publishExamAction(
  examId: string,
  isPublished: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    if (session.role === "MENTOR" && exam.createdById !== session.userId) {
      return { success: false, message: "شما مجاز به تغییر وضعیت انتشار این آزمون نیستید." };
    }

    const currentQuestions = await db
      .select({ id: examQuestions.id })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId));

    if (isPublished && currentQuestions.length === 0) {
      return {
        success: false,
        message: "آزمون بدون حداقل یک سؤال طراحی‌شده قابلیت تایید و انتشار در سامانه را ندارد.",
      };
    }

    await db
      .update(exams)
      .set({
        isPublished,
        totalQuestions: currentQuestions.length,
        updatedAt: new Date(),
      })
      .where(eq(exams.id, examId));

    revalidatePath("/exams");
    revalidatePath("/student/exams");
    revalidatePath("/student/dashboard");
    revalidatePath(`/exams/builder/${examId}`);

    return {
      success: true,
      message: isPublished
        ? `آزمون با موفقیت تایید و با ${currentQuestions.length} سؤال در کارتابل داوطلبان منتشر گردید.`
        : "آزمون از حالت انتشار خارج و به وضعیت پیش‌نویس تغییر یافت.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در انتشار آزمون.",
    };
  }
}

/**
 * Delete Modern CBT Exam and its questions/submissions
 */
export async function deleteExamAction(
  examId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    if (session.role === "MENTOR" && exam.createdById !== session.userId) {
      return { success: false, message: "شما مجاز به حذف آزمون دیگران نیستید." };
    }

    // Cascade delete submissions, questions, and the exam
    await db.delete(examSubmissions).where(eq(examSubmissions.examId, examId));
    await db.delete(examQuestions).where(eq(examQuestions.examId, examId));
    await db.delete(exams).where(eq(exams.id, examId));

    revalidatePath("/exams");
    revalidatePath("/student/exams");
    revalidatePath("/student/dashboard");

    return {
      success: true,
      message: "آزمون و تمامی سؤالات آن با موفقیت حذف گردید.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در حذف آزمون.",
    };
  }
}

/**
 * Fetch Exam With All Questions
 * Implements C-04: Strip correctOption and explanation from student queries unless published
 */
export async function getExamWithQuestionsAction(examId: string) {
  try {
    const session = await requireAuth();
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) return null;

    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.questionNumber));

    const isPrivileged = !!(session?.role && ["CEO", "ADMIN", "SUPERVISOR", "MENTOR"].includes(session.role));

    return {
      ...exam,
      questions: questions.map((q) => {
        const item: ExamQuestion = {
          ...q,
          options: (q.options as ExamOptionItem[]) || [],
        };
        if (!isPrivileged) {
          delete item.correctOption;
          delete item.explanation;
        }
        return item;
      }),
    };
  } catch {
    return null;
  }
}

/**
 * List all Exams with creation info
 * Implements H-04: Filter out unpublished exams and audience-mismatched exams for students
 */
export async function listAllExamsAction() {
  try {
    const session = await requireAuth();
    const rows = await db
      .select({
        exam: exams,
        creatorName: users.fullName,
      })
      .from(exams)
      .leftJoin(users, eq(exams.createdById, users.id))
      .orderBy(desc(exams.createdAt));

    if (session?.role === "STUDENT") {
      let studentCourseCode: string | null = null;
      try {
        const [prof] = await db
          .select({ enrolledCourseCode: studentProfiles.enrolledCourseCode })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, session.userId))
          .limit(1);
        studentCourseCode = prof?.enrolledCourseCode || null;
      } catch {}

      const filtered = rows.filter((r) => {
        if (!r.exam.isPublished) return false;
        const aud = r.exam.targetAudience || "ALL";
        if (aud === "ALL") return true;
        if (aud === "COURSE_CODE") {
          const codes = Array.isArray(r.exam.targetCourseCodes)
            ? (r.exam.targetCourseCodes as string[])
            : [];
          return !!studentCourseCode && codes.includes(studentCourseCode);
        }
        if (aud === "SPECIFIC_STUDENTS") {
          const sids = Array.isArray(r.exam.targetStudentIds)
            ? (r.exam.targetStudentIds as string[])
            : [];
          return sids.includes(session.userId);
        }
        return true;
      });

      return filtered.map((r) => ({
        ...r.exam,
        creatorName: r.creatorName || "نامشخص",
      }));
    }

    return rows.map((r) => ({
      ...r.exam,
      creatorName: r.creatorName || "نامشخص",
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch available Garnet course codes and candidate students for target audience assignment
 */
export async function getExamTargetOptionsAction(): Promise<{
  success: boolean;
  courses: Array<{ code: string; name: string }>;
  students: Array<{
    id: string;
    fullName: string;
    phoneNumber: string;
    nationalId: string;
    enrolledCourseName?: string | null;
    enrolledCourseCode?: string | null;
  }>;
}> {
  try {
    const session = await requireAuth();
    await verifyExamAuthorPermission(session);

    // 1. Fetch courses from entitledCourses and studentProfiles
    let allEntitled: (typeof entitledCourses.$inferSelect)[] = [];
    let profiles: (typeof studentProfiles.$inferSelect)[] = [];
    let studentUsers: (typeof users.$inferSelect)[] = [];

    try {
      allEntitled = await db.select().from(entitledCourses);
    } catch {}
    try {
      profiles = await db.select().from(studentProfiles);
    } catch {}
    try {
      studentUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, "STUDENT"));
    } catch {}

    const courseMap = new Map<string, string>();
    // Pre-populate core default courses and cohorts
    courseMap.set("GARNET-BAR-MASTER", "دوره جامع مستر وکالت");
    courseMap.set("CRASH-BAR", "دوره ضربتی آزمون وکالت");
    courseMap.set("SAVIOR-FALL-1405", "کلاس نجات پاییز ۱۴۰۵");
    courseMap.set("GARNET-BAR-360", "دوره جامع آمادگی آزمون وکالت ۳۶۰");
    courseMap.set("DIAGNOSTIC-1405", "دوره سنجش و تعیین سطح وکالت ۱۴۰۵");
    courseMap.set("DIAGNOSTIC-1403", "دوره سنجش و تعیین سطح وکالت ۱۴۰۳");

    for (const c of allEntitled) {
      if (c.courseCode && c.courseName) {
        courseMap.set(c.courseCode, c.courseName);
      }
    }

    for (const p of profiles) {
      if (p.enrolledCourseCode && p.enrolledCourseName) {
        courseMap.set(p.enrolledCourseCode, p.enrolledCourseName);
      } else if (p.enrolledCourseCode && !courseMap.has(p.enrolledCourseCode)) {
        courseMap.set(p.enrolledCourseCode, p.enrolledCourseCode);
      }
    }

    const courses = Array.from(courseMap.entries()).map(([code, name]) => ({ code, name }));

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const filteredStudentUsers =
      session.role === "MENTOR"
        ? studentUsers.filter((u) => {
            const prof = profileMap.get(u.id);
            return prof?.mentorId === session.userId;
          })
        : studentUsers;

    const students = filteredStudentUsers.map((u) => {
      const prof = profileMap.get(u.id);
      return {
        id: u.id,
        fullName: u.fullName || u.username || "داوطلب مشاهیر",
        phoneNumber: u.phoneNumber || "---",
        nationalId: u.nationalId || "---",
        enrolledCourseName: prof?.enrolledCourseName || null,
        enrolledCourseCode: prof?.enrolledCourseCode || null,
      };
    });

    return { success: true, courses, students };
  } catch {
    return {
      success: false,
      courses: [
        { code: "GARNET-BAR-360", name: "دوره جامع آمادگی آزمون وکالت ۳۶۰" },
        { code: "CRASH-BAR", name: "دوره ضربتی و نکته و تست وکالت" },
      ],
      students: [],
    };
  }
}

// ============================================================================
// 2. STUDENT EXAM ENGINE & AUTOMATED GRADING
// ============================================================================

/**
 * Start Exam Attempt - Records IN_PROGRESS submission with server timestamp
 * Implements H-22 Server-Side Timer Validation
 */
export async function startExamAttemptAction(examId: string): Promise<{
  success: boolean;
  submissionId?: string;
  startedAt?: string;
  message?: string;
}> {
  try {
    const session = await requireAuth();
    const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    if (!exam.isPublished && session.role === "STUDENT") {
      return { success: false, message: "این آزمون هنوز منتشر نشده است." };
    }

    // Check existing submission
    const [existingSub] = await db
      .select()
      .from(examSubmissions)
      .where(
        and(
          eq(examSubmissions.examId, examId),
          eq(examSubmissions.studentId, session.userId)
        )
      )
      .limit(1);

    if (existingSub) {
      return {
        success: true,
        submissionId: existingSub.id,
        startedAt: existingSub.startedAt ? new Date(existingSub.startedAt).toISOString() : new Date().toISOString(),
      };
    }

    // Resolve student profile and mentor
    const [studentProfile] = await db
      .select({ id: studentProfiles.id, mentorId: studentProfiles.mentorId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    const mentorId = studentProfile?.mentorId || exam.createdById;
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    await ensureExamExists(exam.id, exam.title);

    await db.insert(examSubmissions).values({
      id: submissionId,
      examId: exam.id,
      studentId: session.userId,
      studentName: session.fullName || "داوطلب مشاهیر دانش",
      mentorId,
      studentProfileId: studentProfile?.id || null,
      examTitle: exam.title,
      startedAt: now,
      submittedAt: null,
      answers: {},
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: exam.totalQuestions,
      totalPercentage: "0.00",
      subjectBreakdown: [],
      subjectScores: {},
      status: "IN_PROGRESS",
      scorePercent: 0,
    });

    return {
      success: true,
      submissionId,
      startedAt: now.toISOString(),
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در شروع آزمون.",
    };
  }
}

/**
 * Submit an Exam and execute Iranian Bar Exam Grading Engine
 * Standard 1/3 negative marking penalty formula:
 * Percentage = ((Correct * 3) - Incorrect) / (TotalQuestions * 3) * 100
 * Status: AUTO_GRADED_PENDING_MENTOR (Hidden from student until mentor publishes)
 */
export async function submitExamAction(payload: {
  examId: string;
  answers: Record<string, number>; // { [questionId]: selectedOption (1 to 4) }
  flaggedQuestions?: string[];
  eliminatedOptions?: Record<string, number[]>;
  tabSwitchCount?: number;
  startedAt?: string;
}): Promise<{
  success: boolean;
  submissionId?: string;
  totalPercentage?: number;
  subjectBreakdown?: SubjectBreakdownItem[];
  status?: ExamSubmissionStatus;
  message: string;
}> {
  try {
    const session = await requireAuth();

    // 1. Fetch Exam
    const [exam] = await db.select().from(exams).where(eq(exams.id, payload.examId)).limit(1);
    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    // 2. Fetch Questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, payload.examId))
      .orderBy(asc(examQuestions.questionNumber));

    if (questions.length === 0) {
      return { success: false, message: "این آزمون فاقد سؤال است." };
    }

    // 3. Prevent duplicate submission if already submitted
    const [existingSub] = await db
      .select()
      .from(examSubmissions)
      .where(
        and(
          eq(examSubmissions.examId, payload.examId),
          eq(examSubmissions.studentId, session.userId)
        )
      )
      .limit(1);

    if (existingSub && existingSub.status !== "IN_PROGRESS") {
      return {
        success: false,
        message: "پاسخنامه شما قبلاً در سامانه ثبت شده است و امکان ارسال مجدد وجود ندارد.",
      };
    }

    // Enforce server-side timer validation with 2-minute grace period (H-22)
    const startedAtDate = existingSub?.startedAt || (payload.startedAt ? new Date(payload.startedAt) : null);
    if (startedAtDate) {
      const elapsedSeconds = (Date.now() - new Date(startedAtDate).getTime()) / 1000;
      const maxAllowedSeconds = (exam.durationMinutes * 60) + 120; // 2 minutes (120 seconds) grace period
      if (elapsedSeconds > maxAllowedSeconds) {
        return {
          success: false,
          message: "مهلت قانونی آزمون به همراه ۲ دقیقه زمان فرجه شبکه به پایان رسیده است و امکان ثبت پاسخنامه وجود ندارد.",
        };
      }
    }

    // 4. Identify Assigned Mentor & Reliably Resolve Candidate Full Name
    const [studentProfile] = await db
      .select({ id: studentProfiles.id, mentorId: studentProfiles.mentorId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    const mentorId = studentProfile?.mentorId || exam.createdById;

    const [candidateUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    let whitelistRecord: (typeof studentWhitelist.$inferSelect) | null = null;
    if (candidateUser?.phoneNumber || candidateUser?.nationalId) {
      try {
        const [wl] = await db
          .select()
          .from(studentWhitelist)
          .where(
            candidateUser.nationalId
              ? eq(studentWhitelist.nationalId, candidateUser.nationalId)
              : eq(studentWhitelist.phoneNumber, candidateUser.phoneNumber)
          )
          .limit(1);
        whitelistRecord = wl || null;
      } catch {}
    }

    const studentName =
      candidateUser?.fullName ||
      (candidateUser as { name?: string })?.name ||
      whitelistRecord?.fullName ||
      session.fullName ||
      candidateUser?.username ||
      candidateUser?.phoneNumber ||
      "داوطلب مشاهیر دانش";

    // 5. Grading Engine - Iranian Bar Exam 1/3 Negative Marking Formula
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnanswered = 0;

    // Group questions by legal subject
    const subjectMap: Record<
      string,
      {
        total: number;
        correct: number;
        incorrect: number;
        unattempted: number;
      }
    > = {};

    for (const q of questions) {
      const subj = q.subject || "عمومی";
      if (!subjectMap[subj]) {
        subjectMap[subj] = { total: 0, correct: 0, incorrect: 0, unattempted: 0 };
      }
      subjectMap[subj].total += 1;

      const selected = payload.answers[q.id];
      if (selected === undefined || selected === null || selected === 0) {
        totalUnanswered += 1;
        subjectMap[subj].unattempted += 1;
      } else if (selected === q.correctOption) {
        totalCorrect += 1;
        subjectMap[subj].correct += 1;
      } else {
        totalIncorrect += 1;
        subjectMap[subj].incorrect += 1;
      }
    }

    // Build subject breakdown with clamp >= 0
    const subjectBreakdown: SubjectBreakdownItem[] = Object.entries(subjectMap).map(
      ([subject, counts]) => {
        let percentage = 0;
        if (counts.total > 0) {
          if (exam.hasNegativeMarking) {
            percentage = Math.max(
              0,
              ((counts.correct * 3 - counts.incorrect) / (counts.total * 3)) * 100
            );
          } else {
            percentage = (counts.correct / counts.total) * 100;
          }
        }
        return {
          subject,
          correct: counts.correct,
          incorrect: counts.incorrect,
          unattempted: counts.unattempted,
          percentage: Number(percentage.toFixed(2)),
        };
      }
    );

    // Calculate overall total percentage (clamped >= 0)
    let totalPercentage = 0;
    const totalQCount = questions.length;
    if (totalQCount > 0) {
      if (exam.hasNegativeMarking) {
        totalPercentage = Math.max(
          0,
          ((totalCorrect * 3 - totalIncorrect) / (totalQCount * 3)) * 100
        );
      } else {
        totalPercentage = (totalCorrect / totalQCount) * 100;
      }
    }
    const finalPercentageNum = Number(totalPercentage.toFixed(2));
    const rawPercentageNum = totalQCount > 0 ? Number(((totalCorrect / totalQCount) * 100).toFixed(2)) : 0;

    const subjectScoresPayload = subjectBreakdown.reduce<Record<string, number>>((acc, curr) => {
      acc[curr.subject] = curr.percentage;
      return acc;
    }, {});

    const submissionId = existingSub?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const resolvedStartedAt = startedAtDate || (payload.startedAt ? new Date(payload.startedAt) : new Date(Date.now() - exam.durationMinutes * 60 * 1000));

    const submissionFields = {
      submittedAt: new Date(),
      studentName,
      mentorId,
      studentProfileId: studentProfile?.id || null,
      examTitle: exam.title,
      answers: payload.answers,
      flaggedQuestions: payload.flaggedQuestions || [],
      eliminatedOptions: payload.eliminatedOptions || {},
      tabSwitchCount: payload.tabSwitchCount || 0,
      correctCount: totalCorrect,
      incorrectCount: totalIncorrect,
      wrongCount: totalIncorrect,
      unansweredCount: totalUnanswered,
      blankCount: totalUnanswered,
      totalPercentage: finalPercentageNum.toFixed(2),
      rawScore: rawPercentageNum.toFixed(2),
      netScore: finalPercentageNum.toFixed(2),
      subjectBreakdown,
      subjectScores: subjectScoresPayload,
      status: "AUTO_GRADED_PENDING_MENTOR" as const,
      scorePercent: Math.round(finalPercentageNum),
    };

    if (existingSub) {
      await db
        .update(examSubmissions)
        .set(submissionFields)
        .where(eq(examSubmissions.id, existingSub.id));
    } else {
      await ensureExamExists(exam.id, exam.title);

      await db.insert(examSubmissions).values({
        id: submissionId,
        examId: exam.id,
        studentId: session.userId,
        startedAt: resolvedStartedAt,
        ...submissionFields,
      });
    }

    // Automated Alert Engine Evaluation on Exam Submission (E-08)
    if (studentProfile?.id) {
      try {
        const prevSubs = await db
          .select({ scorePercent: examSubmissions.scorePercent })
          .from(examSubmissions)
          .where(
            and(
              eq(examSubmissions.studentId, session.userId),
              ne(examSubmissions.id, submissionId),
              isNotNull(examSubmissions.submittedAt)
            )
          )
          .orderBy(desc(examSubmissions.submittedAt))
          .limit(1);

        if (prevSubs.length > 0 && prevSubs[0].scorePercent !== null) {
          const prevScore = Number(prevSubs[0].scorePercent);
          if (prevScore - finalPercentageNum > 15) {
            const dropAmount = Math.round(prevScore - finalPercentageNum);
            const evalResult = evaluateStudentRisk({
              studentProfileId: studentProfile.id,
              mockExamScoreDropPercent: dropAmount,
            });

            await db
              .update(studentProfiles)
              .set({
                riskStatus: evalResult.riskState,
                riskReason: evalResult.riskReason,
                updatedAt: new Date(),
              })
              .where(eq(studentProfiles.id, studentProfile.id));

            const a06 = evalResult.activeTriggers.find((t) => t.code === "A06");
            if (a06) {
              const slaDueAt = calculateSlaDueAt(a06);
              await db.insert(triageCases).values({
                id: `trg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                studentProfileId: studentProfile.id,
                mentorId,
                triggerCode: "A06",
                priorityTier: a06.tier,
                description: `افت معنادار تراز آزمون آزمایشی (${dropAmount}٪) در آزمون «${exam.title}»`,
                isResolved: false,
                slaDueAt,
              });
            }
          }
        }
      } catch (riskErr) {
        console.warn("[AlertEngine] Notice on exam submit risk evaluation:", riskErr);
      }
    }

    revalidatePath("/student/exams");
    revalidatePath(`/student/exams/${exam.id}`);
    revalidatePath("/mentor/students");

    return {
      success: true,
      submissionId,
      totalPercentage: finalPercentageNum,
      subjectBreakdown,
      status: "AUTO_GRADED_PENDING_MENTOR",
      message: "پاسخنامه شما با موفقیت ثبت و تصحیح سیستمی شد. کارنامه تحلیلی پس از بررسی و تایید پشتیبان منتشر خواهد شد.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در ثبت پاسخنامه.",
    };
  }
}

// ============================================================================
// 3. MENTOR AUDIT, COACHING NOTES & TWO-STAGE PUBLISHING
// ============================================================================

/**
 * Get detailed submission for Mentor Review & Audit
 */
export async function getSubmissionForReviewAction(submissionId: string) {
  try {
    const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

    const [sub] = await db
      .select({
        submission: examSubmissions,
        student: users,
        exam: exams,
      })
      .from(examSubmissions)
      .innerJoin(users, eq(examSubmissions.studentId, users.id))
      .innerJoin(exams, eq(examSubmissions.examId, exams.id))
      .where(eq(examSubmissions.id, submissionId))
      .limit(1);

    if (!sub) return null;

    // H-05 IDOR Guard: Mentors can strictly inspect ONLY their assigned students' submissions
    if (session.role === "MENTOR") {
      const isDirectMentor = sub.submission.mentorId === session.userId;
      let isCurrentAssignedMentor = false;
      if (!isDirectMentor && sub.submission.studentId) {
        const [prof] = await db
          .select({ mentorId: studentProfiles.mentorId })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, sub.submission.studentId))
          .limit(1);
        isCurrentAssignedMentor = prof?.mentorId === session.userId;
      }
      if (!isDirectMentor && !isCurrentAssignedMentor) {
        return null;
      }
    }

    // Fetch Questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, sub.exam.id))
      .orderBy(asc(examQuestions.questionNumber));

    return {
      submission: {
        ...sub.submission,
        answers: (sub.submission.answers as Record<string, number>) || {},
        subjectBreakdown: (sub.submission.subjectBreakdown as SubjectBreakdownItem[]) || [],
      },
      student: sanitizeUserForClient(sub.student, session.role),
      exam: sub.exam,
      questions: questions.map((q) => ({
        ...q,
        options: (q.options as ExamOptionItem[]) || [],
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Publish Exam Result To Student (Stage 2 Publishing / Mentor Confirmation Gate)
 * Bridges modern examSubmissions with legacy mock_exams for 100% multi-dashboard synchronization.
 */
export async function publishExamResultToStudentAction(
  submissionId: string,
  mentorNotes: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

    const [sub] = await db
      .select()
      .from(examSubmissions)
      .where(eq(examSubmissions.id, submissionId))
      .limit(1);

    if (!sub) {
      return { success: false, message: "پاسخنامه مورد نظر یافت نشد." };
    }

    let resolvedProfileId = sub.studentProfileId;
    if (sub.studentId) {
      const [prof] = await db
        .select({ id: studentProfiles.id, mentorId: studentProfiles.mentorId })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, sub.studentId))
        .limit(1);

      if (prof) {
        resolvedProfileId = prof.id;
      }

      if (session.role === "MENTOR") {
        const isDirectMentor = sub.mentorId === session.userId;
        const isCurrentAssignedMentor = prof?.mentorId === session.userId;
        if (!isDirectMentor && !isCurrentAssignedMentor) {
          return { success: false, message: "شما پشتیبان مستقیم این داوطلب نیستید." };
        }
      }
    }

    const now = new Date();
    const cleanNotes = mentorNotes.trim();

    // 1. Update examSubmissions
    await db
      .update(examSubmissions)
      .set({
        mentorId: session.userId,
        reviewedById: session.userId,
        status: "PUBLISHED_TO_STUDENT",
        mentorNotes: cleanNotes,
        mentorFeedback: cleanNotes,
        reviewedAt: now,
        publishedAt: now,
      })
      .where(eq(examSubmissions.id, submissionId));

    // 2. Bridge to mock_exams for instant multi-dashboard synchronization (Phase 4 & 6)
    if (resolvedProfileId) {
      try {
        const mockId = `mock_${sub.id}`;
        const scorePercent = Math.max(0, Math.round(Number(sub.netScore || sub.totalPercentage || 0)));
        const jalaliDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
          .format(now)
          .replace(/\//g, "-");

        const [existingMock] = await db
          .select({ id: mockExams.id })
          .from(mockExams)
          .where(eq(mockExams.id, mockId))
          .limit(1);

        const mockPayload = {
          studentProfileId: resolvedProfileId,
          examTitle: sub.examTitle || "آزمون شبیه‌ساز وکالت",
          examDate: jalaliDate,
          hasParticipated: true,
          isExcusedAbsence: false,
          overallScorePercent: scorePercent,
          correctCount: sub.correctCount,
          wrongCount: sub.wrongCount || sub.incorrectCount || 0,
          unansweredCount: sub.unansweredCount || sub.blankCount || 0,
          subjectScores: (sub.subjectScores as Record<string, number>) || {},
          analysisStatus: "DONE" as const,
          primaryErrorCause: cleanNotes || undefined,
        };

        if (existingMock) {
          await db.update(mockExams).set(mockPayload).where(eq(mockExams.id, mockId));
        } else {
          await db.insert(mockExams).values({
            id: mockId,
            ...mockPayload,
          });
        }
      } catch (bridgeErr) {
        console.warn("[publishExamResultToStudentAction] mock_exams sync warning:", bridgeErr);
      }
    }

    // 3. System Audit Log Entry
    try {
      await db.insert(systemAuditLogs).values({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actorId: session.userId,
        actorName: session.fullName || "پشتیبان آموزشی",
        actorRole: session.role,
        eventType: "EXAM_MANAGEMENT",
        action: "CONFIRM_AND_PUBLISH_RESULT",
        targetEntity: "exam_submissions",
        targetId: submissionId,
        details: `تایید و انتشار کارنامه آزمون «${sub.examTitle || "آزمون"}» برای داوطلب با نمره تراز ${sub.netScore || sub.totalPercentage}٪`,
      });
    } catch {}

    // 4. Revalidate all dependent dashboards and views
    revalidatePath("/student/exams");
    revalidatePath("/student/dashboard");
    revalidatePath("/exams");
    revalidatePath(`/student/exams/${sub.examId}`);
    revalidatePath("/mentor/students");
    if (resolvedProfileId) {
      revalidatePath(`/mentor/student/${resolvedProfileId}`);
    }
    revalidatePath(`/mentor/exams/review/${submissionId}`);
    revalidatePath("/supervisor");
    revalidatePath("/supervisor/mentors");
    revalidatePath("/executive");

    return {
      success: true,
      message: "کارنامه و تحلیل راهبردی با موفقیت نهایی و برای داوطلب منتشر گردید.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در انتشار کارنامه.",
    };
  }
}

/**
 * Confirm and publish exam result action (Alias for Phase 4 Mentor Confirmation Gate)
 */
export const confirmAndPublishExamResultAction = publishExamResultToStudentAction;

/**
 * Get List of Submissions Requiring Mentor Review
 */
export async function getPendingMentorReviewsAction() {
  try {
    const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

    const query = db
      .select({
        submission: examSubmissions,
        studentName: users.fullName,
        studentPhone: users.phoneNumber,
        examTitle: exams.title,
      })
      .from(examSubmissions)
      .innerJoin(users, eq(examSubmissions.studentId, users.id))
      .innerJoin(exams, eq(examSubmissions.examId, exams.id))
      .where(
        inArray(examSubmissions.status, [
          "AUTO_GRADED_PENDING_MENTOR",
          "PENDING_MENTOR_REVIEW",
        ])
      )
      .orderBy(desc(examSubmissions.submittedAt));

    const rows = await query;
    const isPrivileged = session.role === "CEO" || session.role === "ADMIN";
    const filteredRows = session.role === "MENTOR"
      ? rows.filter((r) => r.submission.mentorId === session.userId)
      : rows;

    return filteredRows.map((r) => ({
      ...r,
      studentPhone: isPrivileged ? r.studentPhone : maskPhoneNumber(r.studentPhone),
    }));
  } catch {
    return [];
  }
}

/**
 * Get List of Confirmed Exam Submissions (Published to Student)
 */
export async function getConfirmedExamSubmissionsAction() {
  try {
    const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

    const query = db
      .select({
        submission: examSubmissions,
        studentName: users.fullName,
        studentPhone: users.phoneNumber,
        examTitle: exams.title,
      })
      .from(examSubmissions)
      .innerJoin(users, eq(examSubmissions.studentId, users.id))
      .innerJoin(exams, eq(examSubmissions.examId, exams.id))
      .where(eq(examSubmissions.status, "PUBLISHED_TO_STUDENT"))
      .orderBy(desc(examSubmissions.publishedAt));

    const rows = await query;
    const isPrivileged = session.role === "CEO" || session.role === "ADMIN";
    const filteredRows = session.role === "MENTOR"
      ? rows.filter((r) => r.submission.mentorId === session.userId)
      : rows;

    return filteredRows.map((r) => ({
      ...r,
      studentPhone: isPrivileged ? r.studentPhone : maskPhoneNumber(r.studentPhone),
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// 4. STUDENT RESULTS & LONGITUDINAL TRAJECTORY
// ============================================================================

/**
 * Get Student Exam Result (Protected: Only reveals if PUBLISHED_TO_STUDENT)
 */
export async function getStudentExamResultAction(examId: string) {
  try {
    const session = await requireAuth();

    const [sub] = await db
      .select({
        submission: examSubmissions,
        exam: exams,
      })
      .from(examSubmissions)
      .innerJoin(exams, eq(examSubmissions.examId, exams.id))
      .where(
        and(
          eq(examSubmissions.examId, examId),
          eq(examSubmissions.studentId, session.userId)
        )
      )
      .limit(1);

    if (!sub) return null;

    const isPublished = sub.submission.status === "PUBLISHED_TO_STUDENT";

    // If pending mentor review, return status without detailed questions/answers
    if (!isPublished) {
      return {
        status: sub.submission.status,
        isPublished: false,
        submittedAt: sub.submission.submittedAt,
        examTitle: sub.exam.title,
        message: "پاسخنامه شما در انتظار تحلیل و تایید نهایی پشتیبان آموزشی است.",
      };
    }

    // When published, load questions with correct answers and explanations
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.questionNumber));

    return {
      status: sub.submission.status,
      isPublished: true,
      submission: {
        ...sub.submission,
        answers: (sub.submission.answers as Record<string, number>) || {},
        subjectBreakdown: (sub.submission.subjectBreakdown as SubjectBreakdownItem[]) || [],
      },
      exam: sub.exam,
      questions: questions.map((q) => ({
        ...q,
        options: (q.options as ExamOptionItem[]) || [],
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Get Longitudinal Exam History for a Student with Trajectory Deltas
 */
export async function getStudentLongitudinalHistoryAction(studentId?: string) {
  try {
    const session = await requireAuth();
    const targetUserId =
      session.role === "STUDENT" ? session.userId : studentId || session.userId;

    const history = await db
      .select({
        submission: examSubmissions,
        examTitle: exams.title,
        examCategory: exams.category,
      })
      .from(examSubmissions)
      .innerJoin(exams, eq(examSubmissions.examId, exams.id))
      .where(
        and(
          eq(examSubmissions.studentId, targetUserId),
          eq(examSubmissions.status, "PUBLISHED_TO_STUDENT")
        )
      )
      .orderBy(asc(examSubmissions.submittedAt));

    if (history.length === 0) return [];

    const baselineScore = Number(history[0].submission.totalPercentage || 0);

    return history.map((item, index) => {
      const currentScore = Number(item.submission.totalPercentage || 0);
      const prevScore =
        index > 0 ? Number(history[index - 1].submission.totalPercentage || 0) : currentScore;

      const deltaFromBaseline = Number((currentScore - baselineScore).toFixed(2));
      const deltaFromPrevious = Number((currentScore - prevScore).toFixed(2));

      return {
        submissionId: item.submission.id,
        examId: item.submission.examId,
        examTitle: item.examTitle,
        examCategory: item.examCategory,
        submittedAt: item.submission.submittedAt,
        publishedAt: item.submission.publishedAt,
        totalPercentage: currentScore,
        deltaFromBaseline,
        deltaFromPrevious,
        subjectBreakdown: (item.submission.subjectBreakdown as SubjectBreakdownItem[]) || [],
        mentorNotes: item.submission.mentorNotes,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get Student Exams Dashboard Overview
 * Fetches all published exams, candidate submissions, longitudinal trajectory, and mentor details
 */
export async function getStudentExamsOverviewAction() {
  try {
    const session = await requireAuth();

    // 1. Fetch student profile and assigned mentor
    const [profile] = await db
      .select({
        profile: studentProfiles,
        mentor: users,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.mentorId, users.id))
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    // 2. Fetch all published exams and filter by target audience
    const publishedExams = await db
      .select()
      .from(exams)
      .where(eq(exams.isPublished, true))
      .orderBy(desc(exams.createdAt));

    const studentCourseCode = profile?.profile?.enrolledCourseCode || null;

    const visiblePublishedExams = publishedExams.filter((exam) => {
      if (!exam.targetAudience || exam.targetAudience === "ALL") {
        return true;
      }

      if (exam.targetAudience === "COURSE_CODE") {
        const targetCodes = Array.isArray(exam.targetCourseCodes)
          ? (exam.targetCourseCodes as string[])
          : [];
        if (studentCourseCode && targetCodes.includes(studentCourseCode)) {
          return true;
        }
        return false;
      }

      if (exam.targetAudience === "SPECIFIC_STUDENTS") {
        const targetIds = Array.isArray(exam.targetStudentIds)
          ? (exam.targetStudentIds as string[])
          : [];
        if (targetIds.includes(session.userId)) {
          return true;
        }
        return false;
      }

      return true;
    });

    // 3. Fetch all student submissions
    const studentSubmissions = await db
      .select()
      .from(examSubmissions)
      .where(eq(examSubmissions.studentId, session.userId));

    const subMap = new Map(studentSubmissions.map((s) => [s.examId, s]));

    // 4. Map exams with submission status
    const examList = visiblePublishedExams.map((exam) => {
      const sub = subMap.get(exam.id);
      if (!sub) {
        return {
          exam,
          status: "NOT_STARTED" as const,
          submission: null,
        };
      }

      const isPublished = sub.status === "PUBLISHED_TO_STUDENT";

      return {
        exam,
        status: sub.status,
        submission: {
          id: sub.id,
          status: sub.status,
          submittedAt: sub.submittedAt,
          publishedAt: sub.publishedAt,
          scoreHidden: !isPublished,
          totalPercentage: isPublished ? Number(sub.totalPercentage || 0) : null,
          correctCount: isPublished ? sub.correctCount : null,
          incorrectCount: isPublished ? sub.incorrectCount : null,
          unansweredCount: isPublished ? sub.unansweredCount : null,
          subjectBreakdown: isPublished
            ? ((sub.subjectBreakdown as SubjectBreakdownItem[]) || [])
            : [],
          mentorNotes: isPublished ? sub.mentorNotes : null,
        },
      };
    });

    // 5. Fetch longitudinal history
    const history = await getStudentLongitudinalHistoryAction(session.userId);

    return {
      success: true,
      mentorName: profile?.mentor?.fullName || "پشتیبان تخصصی حقوقی مشاهیر",
      exams: examList,
      longitudinalHistory: history,
    };
  } catch (error: unknown) {
    return {
      success: false,
      mentorName: "پشتیبان تخصصی مشاهیر",
      exams: [],
      longitudinalHistory: [],
      message: error instanceof Error ? error.message : "خطا در دریافت اطلاعات آزمون‌ها.",
    };
  }
}

// ============================================================================
// 5. BACKWARD-COMPATIBLE EVALUATION EXAMS (LEGACY ADAPTERS)
// ============================================================================

export async function createEvaluationExamAction(payload: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
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

  await db.insert(evaluationExams).values({
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
  });

  const studentsToNotify = await db
    .select({
      phone: users.phoneNumber,
      name: users.fullName,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .limit(5);

  for (const st of studentsToNotify) {
    await sendSystemSms({
      event: "EXAM_PUBLISHED",
      recipientPhone: st.phone,
      recipientName: st.name,
      variables: {
        examTitle: newExam.title,
        endTime: newExam.endTime,
      },
    });
  }

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "آزمون ارزیابی زمان‌دار با موفقیت تعریف و منتشر گردید.",
    examId,
  };
}

export async function submitEvaluationExamAction(payload: {
  examId: string;
  studentProfileId: string;
  subjectScores: Record<string, number>;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}) {
  const session = await requireAuth();

  let targetStudentId = payload.studentProfileId;
  if (session.role === "STUDENT") {
    if (session.studentProfileId) {
      targetStudentId = session.studentProfileId;
    } else {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      if (!profile) {
        return { success: false, message: "پروفایل داوطلب یافت نشد." };
      }
      targetStudentId = profile.id;
    }
  }

  await requireStudentOwnership(targetStudentId);

  const [exam] = await db
    .select()
    .from(evaluationExams)
    .where(eq(evaluationExams.id, payload.examId))
    .limit(1);

  if (!exam) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  if (isExamDeadlinePassed(exam.endTime, 5)) {
    return { success: false, message: "مهلت رسمی شرکت در این آزمون پایان یافته است." };
  }

  const redis = getRedisClient();
  const lockKey = `submission:lock:${exam.id}:${targetStudentId}`;
  if (redis) {
    try {
      const acquired = await redis.set(lockKey, "1", "EX", 86400, "NX");
      if (!acquired) {
        return {
          success: false,
          statusCode: 409,
          message: "پاسخنامه شما پیش از این در سامانه ثبت شده است و ارسال مجدد امکان‌پذیر نیست.",
        };
      }
    } catch {}
  }

  const previousSubmissions = await db
    .select()
    .from(examSubmissions)
    .where(eq(examSubmissions.studentProfileId, targetStudentId))
    .orderBy(desc(examSubmissions.submittedAt));

  const alreadySubmitted = previousSubmissions.some((s) => s.examId === exam.id);
  if (alreadySubmitted) {
    return {
      success: false,
      statusCode: 409,
      message: "پاسخنامه شما پیش از این در سامانه ثبت شده است و ارسال مجدد امکان‌پذیر نیست.",
    };
  }

  let totalScore = 0;
  let totalWeight = 0;
  const subjectsWeight = (exam.subjectsWeight as Record<string, number>) || {};
  for (const [subj, score] of Object.entries(payload.subjectScores)) {
    const weight = subjectsWeight[subj] || 1;
    totalScore += score * weight;
    totalWeight += weight;
  }
  const scorePercent = Math.round(totalScore / (totalWeight || 1));

  const lastSub = previousSubmissions[0];
  let deltaFromPrevious = 0;
  let deltaFromBaseline = 0;

  if (lastSub) {
    deltaFromPrevious = scorePercent - (lastSub.scorePercent || 0);
  }
  if (previousSubmissions.length > 0) {
    deltaFromBaseline = scorePercent - (previousSubmissions[previousSubmissions.length - 1].scorePercent || 0);
  }

  const submissionId = `sub_${Date.now()}`;

  const queueResult = await enqueueExamSubmission({
    submissionId,
    examId: exam.id,
    studentId: session.userId,
    mentorId: exam.creatorId,
    studentProfileId: targetStudentId,
    studentName: session.fullName,
    answers: payload.subjectScores,
    subjectScores: payload.subjectScores || {},
    correctCount: payload.correctCount || 0,
    wrongCount: payload.wrongCount || 0,
    unansweredCount: payload.unansweredCount || 0,
    overallScorePercent: scorePercent,
    deltaFromPrevious,
    deltaFromBaseline,
    submittedAt: new Date().toISOString(),
  });

  return {
    success: queueResult.success,
    statusCode: queueResult.statusCode,
    trackingId: queueResult.trackingId || submissionId,
    message: queueResult.message || "پاسخنامه آزمون با موفقیت در صف پردازش ثبت شد و شاخص رشد نسبت به آزمون‌های قبلی محاسبه گردید.",
    scorePercent,
    deltaFromPrevious,
    deltaFromBaseline,
  };
}

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
  const session = await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const [exam] = await db
    .select()
    .from(evaluationExams)
    .where(eq(evaluationExams.id, payload.examId))
    .limit(1);

  if (!exam) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  if (session.role === "MENTOR" && exam.creatorId !== session.userId) {
    return { success: false, message: "پشتیبان تنها مجاز به ویرایش آزمون‌های ایجاد شده توسط خود است." };
  }

  const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const currentQuestions = (exam.questions as ExamQuestionRecord[]) || [];

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
    orderIndex: currentQuestions.length + 1,
  };

  const updatedQuestions = [...currentQuestions, newQuestion];

  await db
    .update(evaluationExams)
    .set({
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
    })
    .where(eq(evaluationExams.id, payload.examId));

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "سؤال با موفقیت به آزمون اضافه شد.",
    question: newQuestion,
  };
}

export async function deleteExamQuestionAction(examId: string, questionId: string) {
  const session = await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const [exam] = await db
    .select()
    .from(evaluationExams)
    .where(eq(evaluationExams.id, examId))
    .limit(1);

  if (!exam) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  if (session.role === "MENTOR" && exam.creatorId !== session.userId) {
    return { success: false, message: "پشتیبان تنها مجاز به ویرایش آزمون‌های ایجاد شده توسط خود است." };
  }

  const currentQuestions = (exam.questions as ExamQuestionRecord[]) || [];
  const updatedQuestions = currentQuestions.filter((q) => q.id !== questionId);

  await db
    .update(evaluationExams)
    .set({
      questions: updatedQuestions,
      totalQuestions: updatedQuestions.length,
    })
    .where(eq(evaluationExams.id, examId));

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "سؤال آزمون با موفقیت حذف گردید.",
  };
}

export async function updateExamAudienceAction(examId: string, assignedStudentIds: string[]) {
  const session = await requireRole(["SUPERVISOR", "MENTOR", "CEO", "ADMIN"]);

  const [exam] = await db
    .select()
    .from(evaluationExams)
    .where(eq(evaluationExams.id, examId))
    .limit(1);

  if (!exam) {
    return { success: false, message: "آزمون مورد نظر یافت نشد." };
  }

  if (session.role === "MENTOR" && exam.creatorId !== session.userId) {
    return { success: false, message: "پشتیبان تنها مجاز به ویرایش آزمون‌های ایجاد شده توسط خود است." };
  }

  await db
    .update(evaluationExams)
    .set({
      assignedStudentIds,
    })
    .where(eq(evaluationExams.id, examId));

  revalidatePath("/exams");
  revalidatePath("/student/exams");

  return {
    success: true,
    message: "جامعه هدف و دسترسی داوطلبان به این آزمون با موفقیت ذخیره شد.",
  };
}

/**
 * Layer 4 DRM: Report Suspicious Exam Activity (Scraping Tripwire)
 * Flags student riskStatus to 'RED', inserts security audit log and creates
 * a high-priority triage case when velocity exceeds human reading limits (>12 questions in <25s).
 */
export async function reportSuspiciousExamActivityAction(
  examId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await requireAuth();
    if (session.role !== "STUDENT") {
      return { success: true, message: "Ignored for non-student roles" };
    }

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (profile) {
      // Flag student risk as RED
      await db
        .update(studentProfiles)
        .set({
          riskStatus: "RED",
          riskReason: "شناسایی رفتار مشکوک به اسکرپینگ یا مرور فوق‌سریع سوالات در آزمون آنلاین (سپر DRM)",
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.id, profile.id));

      // Create a security triage case
      const triageId = `triage_scraping_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.insert(triageCases).values({
        id: triageId,
        studentProfileId: profile.id,
        mentorId: profile.mentorId || "usr_mentor1",
        triggerCode: "EXAM_SCRAPING_SUSPECTED",
        priorityTier: 2,
        description: `هشدار سپر ضدجاسوسی (DRM): داوطلب در آزمون شناسه ${examId} اقدام به مرور غیرعادی و سریع بیش از ۱۲ سوال در کمتر از ۲۵ ثانیه نموده است. آزمون موقتاً متوقف و پرونده جهت ارزیابی امنیتی ثبت گردید.`,
        isResolved: false,
        slaDueAt: new Date(Date.now() + 4 * 3600 * 1000),
      });

      // Insert audit log
      await db.insert(auditLogs).values({
        id: `audit_scraping_${Date.now()}`,
        actorId: session.userId,
        action: "EXAM_ANTI_SCRAPING_TRIPWIRE_TRIGGERED",
        targetEntity: "EXAM",
        targetId: examId,
        metadata: {
          userId: session.userId,
          studentProfileId: profile.id,
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return {
      success: true,
      message: "هشدار امنیتی با موفقیت ثبت شد.",
    };
  } catch (err: any) {
    console.error("[Anti-Scraping Tripwire Error]:", err);
    return { success: false, message: "خطا در ثبت هشدار امنیتی." };
  }
}

/**
 * Edit Evaluation Exam Metadata (Requirement 15: Admin Edit CRUD)
 */
export async function editEvaluationExamAction(payload: {
  examId: string;
  title: string;
  durationMinutes?: number;
  passingScore?: number;
  targetCohort?: string;
  isPublished?: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    const [exam] = await db
      .select()
      .from(evaluationExams)
      .where(eq(evaluationExams.id, payload.examId))
      .limit(1);

    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    const updates: Record<string, unknown> = {
      title: payload.title.trim(),
    };
    if (payload.durationMinutes !== undefined) {
      updates.durationMinutes = Number(payload.durationMinutes);
    }
    if (payload.passingScore !== undefined) {
      updates.passingScore = Number(payload.passingScore);
    }
    if (payload.targetCohort !== undefined) {
      updates.targetCohort = payload.targetCohort.trim();
    }
    if (payload.isPublished !== undefined) {
      updates.isPublished = payload.isPublished;
    }

    await db
      .update(evaluationExams)
      .set(updates)
      .where(eq(evaluationExams.id, payload.examId));

    revalidatePath("/exams");
    revalidatePath("/student/exams");

    return {
      success: true,
      message: "مشخصات آزمون با موفقیت ویرایش گردید.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطا در ویرایش آزمون";
    return { success: false, message: msg };
  }
}

/**
 * Delete Evaluation Exam (Requirement 15: Admin Delete CRUD)
 */
export async function deleteEvaluationExamAction(
  examId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    const [exam] = await db
      .select()
      .from(evaluationExams)
      .where(eq(evaluationExams.id, examId))
      .limit(1);

    if (!exam) {
      return { success: false, message: "آزمون مورد نظر یافت نشد." };
    }

    // Delete submissions associated with this exam first
    await db
      .delete(examSubmissions)
      .where(eq(examSubmissions.examId, examId));

    // Delete the exam
    await db
      .delete(evaluationExams)
      .where(eq(evaluationExams.id, examId));

    revalidatePath("/exams");
    revalidatePath("/student/exams");

    return {
      success: true,
      message: "آزمون و کلیه کارنامه‌های مرتبط با موفقیت حذف شدند.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطا در حذف آزمون";
    return { success: false, message: msg };
  }
}


