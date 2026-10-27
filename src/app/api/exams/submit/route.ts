import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import {
  studentProfiles,
  evaluationExams,
  exams,
  examQuestions,
  examSubmissions,
  users,
} from "@/server/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { enqueueExamSubmission } from "@/server/queue/exam-queue";
import type { SubjectBreakdownItem } from "@/types/models";

/**
 * Unified Exam Submission Endpoint (Phase 1: Dual-Table Engine)
 * Primary: Modern CBT engine ('exams', 'exam_questions', 'exam_submissions')
 * Fallback: Legacy Evaluation engine ('evaluationExams')
 * Zero-Trust Candidate Identity, Iranian Bar 1/3 negative marking grading,
 * and Mentor Confirmation Gate (AUTO_GRADED_PENDING_MENTOR).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "احراز هویت الزامی است." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      examId,
      studentProfileId,
      subjectScores,
      correctCount = 0,
      wrongCount = 0,
      unansweredCount = 0,
      answers = {},
      flaggedQuestions = [],
      eliminatedOptions = {},
      tabSwitchCount = 0,
      startedAt,
    } = body;

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "شناسه آزمون الزامی است." },
        { status: 400 }
      );
    }

    // Resolve student profile safely
    let targetProfileId = studentProfileId;
    let enrolledCourseCode: string | null = null;
    let assignedMentorId: string | null = null;

    if (session.role === "STUDENT") {
      const [profile] = await db
        .select({
          id: studentProfiles.id,
          mentorId: studentProfiles.mentorId,
          enrolledCourseCode: studentProfiles.enrolledCourseCode,
        })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);

      if (profile) {
        targetProfileId = profile.id;
        assignedMentorId = profile.mentorId;
        enrolledCourseCode = profile.enrolledCourseCode;
      }
    }

    // 1. PRIMARY CHECK: Modern 'exams' Table
    const [modernExam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (modernExam) {
      // Access & publication check for student
      if (session.role === "STUDENT") {
        if (!modernExam.isPublished) {
          return NextResponse.json(
            { success: false, message: "این آزمون هنوز برای داوطلبان منتشر نشده است." },
            { status: 403 }
          );
        }

        const audience = modernExam.targetAudience || "ALL";
        if (audience === "COURSE_CODE") {
          const codes = (modernExam.targetCourseCodes as string[]) || [];
          if (!enrolledCourseCode || !codes.includes(enrolledCourseCode)) {
            return NextResponse.json(
              { success: false, message: "این آزمون برای دوره آموزشی شما تخصیص نیافته است." },
              { status: 403 }
            );
          }
        } else if (audience === "SPECIFIC_STUDENTS") {
          const studentIds = (modernExam.targetStudentIds as string[]) || [];
          if (!studentIds.includes(session.userId)) {
            return NextResponse.json(
              { success: false, message: "شما در فهرست داوطلبان مجاز این آزمون قرار ندارید." },
              { status: 403 }
            );
          }
        }
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

      if (existingSub && existingSub.status !== "IN_PROGRESS") {
        return NextResponse.json(
          {
            success: false,
            message: "پاسخنامه شما قبلاً در سامانه ثبت شده است و امکان ارسال مجدد وجود ندارد.",
          },
          { status: 409 }
        );
      }

      // Timer validation with 2-minute grace period
      const effectiveStartedAt = existingSub?.startedAt || (startedAt ? new Date(startedAt) : null);
      if (effectiveStartedAt) {
        const elapsedSec = (Date.now() - new Date(effectiveStartedAt).getTime()) / 1000;
        const maxAllowedSec = modernExam.durationMinutes * 60 + 120;
        if (elapsedSec > maxAllowedSec) {
          return NextResponse.json(
            {
              success: false,
              message: "مهلت قانونی آزمون به پایان رسیده است و امکان ثبت پاسخنامه وجود ندارد.",
            },
            { status: 400 }
          );
        }
      }

      // Fetch questions to perform server-side grading
      const questions = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, examId))
        .orderBy(asc(examQuestions.questionNumber));

      let totalCorrect = 0;
      let totalIncorrect = 0;
      let totalBlank = 0;

      const subjectMap: Record<
        string,
        { total: number; correct: number; incorrect: number; unattempted: number }
      > = {};

      const answersObj = (answers as Record<string, number>) || {};

      for (const q of questions) {
        const subj = q.subject || "عمومی";
        if (!subjectMap[subj]) {
          subjectMap[subj] = { total: 0, correct: 0, incorrect: 0, unattempted: 0 };
        }
        subjectMap[subj].total += 1;

        const sel = answersObj[q.id];
        if (sel === undefined || sel === null || sel === 0) {
          totalBlank += 1;
          subjectMap[subj].unattempted += 1;
        } else if (sel === q.correctOption) {
          totalCorrect += 1;
          subjectMap[subj].correct += 1;
        } else {
          totalIncorrect += 1;
          subjectMap[subj].incorrect += 1;
        }
      }

      // Iranian Bar Exam formula: ((3C - W) / 3N) * 100 clamped >= 0
      const totalQCount = questions.length || modernExam.totalQuestions || 1;
      let netScoreNum = 0;
      if (totalQCount > 0) {
        if (modernExam.hasNegativeMarking) {
          netScoreNum = Math.max(
            0,
            ((totalCorrect * 3 - totalIncorrect) / (totalQCount * 3)) * 100
          );
        } else {
          netScoreNum = (totalCorrect / totalQCount) * 100;
        }
      }

      const rawScoreNum = totalQCount > 0 ? (totalCorrect / totalQCount) * 100 : 0;
      const finalPercentage = Number(netScoreNum.toFixed(2));
      const rawScoreFinal = Number(rawScoreNum.toFixed(2));

      const subjectBreakdown: SubjectBreakdownItem[] = Object.entries(subjectMap).map(
        ([subject, counts]) => {
          let pct = 0;
          if (counts.total > 0) {
            if (modernExam.hasNegativeMarking) {
              pct = Math.max(
                0,
                ((counts.correct * 3 - counts.incorrect) / (counts.total * 3)) * 100
              );
            } else {
              pct = (counts.correct / counts.total) * 100;
            }
          }
          return {
            subject,
            correct: counts.correct,
            incorrect: counts.incorrect,
            unattempted: counts.unattempted,
            percentage: Number(pct.toFixed(2)),
          };
        }
      );

      const subjectScoresRecord = subjectBreakdown.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.subject] = item.percentage;
          return acc;
        },
        {}
      );

      const submissionId =
        existingSub?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const mentorId = assignedMentorId || modernExam.createdById;

      const submissionPayload = {
        submittedAt: new Date(),
        studentName: session.fullName || "داوطلب مشاهیر دانش",
        mentorId,
        studentProfileId: targetProfileId || null,
        examTitle: modernExam.title,
        answers: answersObj,
        flaggedQuestions: Array.isArray(flaggedQuestions) ? flaggedQuestions : [],
        eliminatedOptions: typeof eliminatedOptions === "object" ? eliminatedOptions : {},
        tabSwitchCount: Number(tabSwitchCount) || 0,
        correctCount: totalCorrect,
        incorrectCount: totalIncorrect,
        wrongCount: totalIncorrect,
        unansweredCount: totalBlank,
        blankCount: totalBlank,
        totalPercentage: finalPercentage.toFixed(2),
        rawScore: rawScoreFinal.toFixed(2),
        netScore: finalPercentage.toFixed(2),
        scorePercent: Math.round(finalPercentage),
        subjectBreakdown,
        subjectScores: subjectScoresRecord,
        status: "AUTO_GRADED_PENDING_MENTOR" as const,
      };

      if (existingSub) {
        await db
          .update(examSubmissions)
          .set(submissionPayload)
          .where(eq(examSubmissions.id, existingSub.id));
      } else {
        await db.insert(examSubmissions).values({
          id: submissionId,
          examId: modernExam.id,
          studentId: session.userId,
          startedAt: effectiveStartedAt || new Date(),
          ...submissionPayload,
        });
      }

      return NextResponse.json({
        success: true,
        submissionId,
        trackingId: submissionId,
        status: "AUTO_GRADED_PENDING_MENTOR",
        message: "پاسخنامه شما با موفقیت ثبت و تصحیح سیستمی شد. کارنامه تحلیلی پس از بررسی و تایید پشتیبان منتشر خواهد شد.",
      });
    }

    // 2. FALLBACK CHECK: Legacy 'evaluationExams' Table
    const [evalExam] = await db
      .select()
      .from(evaluationExams)
      .where(eq(evaluationExams.id, examId))
      .limit(1);

    if (evalExam) {
      const assignedIds = (evalExam.assignedStudentIds as string[]) || [];
      if (
        session.role === "STUDENT" &&
        targetProfileId &&
        assignedIds.length > 0 &&
        !assignedIds.includes(targetProfileId)
      ) {
        return NextResponse.json(
          { success: false, message: "شما در فهرست داوطلبان مجاز برای شرکت در این آزمون قرار ندارید." },
          { status: 403 }
        );
      }

      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const totalAnswered = (correctCount || 0) + (wrongCount || 0) + (unansweredCount || 0);
      const scorePercent = totalAnswered > 0 ? Math.round(((correctCount || 0) / totalAnswered) * 100) : 0;

      const result = await enqueueExamSubmission({
        submissionId,
        examId: evalExam.id,
        examTitle: evalExam.title,
        studentId: session.userId,
        studentProfileId: targetProfileId || session.userId,
        studentName: session.fullName,
        subjectScores: subjectScores || {},
        correctCount: correctCount || 0,
        wrongCount: wrongCount || 0,
        unansweredCount: unansweredCount || 0,
        overallScorePercent: scorePercent,
        answers,
        submittedAt: new Date().toISOString(),
        clientIp: req.headers.get("x-forwarded-for") || undefined,
      });

      return NextResponse.json(
        {
          success: result.success,
          trackingId: result.trackingId,
          message: result.message,
          statusCode: result.statusCode,
        },
        { status: result.statusCode }
      );
    }

    // 3. Exam not found in either table
    return NextResponse.json(
      { success: false, message: "آزمون مورد نظر یافت نشد." },
      { status: 404 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "خطای سیستمی در پردازش پاسخنامه آزمون.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
