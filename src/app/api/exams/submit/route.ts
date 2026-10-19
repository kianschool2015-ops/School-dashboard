import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import { studentProfiles, evaluationExams } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { enqueueExamSubmission } from "@/server/queue/exam-queue";

/**
 * High-Concurrency Asynchronous Exam Submission Endpoint (Track 3)
 * Handles up to 20,000 req/sec bursts at exam finish time (e.g. 12:00:00 PM).
 * Enforces Zero-Trust Candidate Identity (Track 4).
 * Returns HTTP 202 Accepted in under 10ms with atomic idempotency check.
 * ZERO revalidatePath calls to avoid event-loop starvation.
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
    } = body;

    if (!examId) {
      return NextResponse.json(
        { success: false, message: "شناسه آزمون الزامی است." },
        { status: 400 }
      );
    }

    // Zero-Trust Candidate Identity (Track 4): Never trust client-supplied studentProfileId
    let targetStudentId = studentProfileId;
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
          return NextResponse.json(
            { success: false, message: "پروفایل داوطلب یافت نشد." },
            { status: 404 }
          );
        }
        targetStudentId = profile.id;
      }
    }

    if (!targetStudentId) {
      return NextResponse.json(
        { success: false, message: "شناسه پرونده داوطلب مشخص نیست." },
        { status: 400 }
      );
    }

    // Verify Exam Exists & Target Cohort/Student Audience Guard
    const [exam] = await db
      .select()
      .from(evaluationExams)
      .where(eq(evaluationExams.id, examId))
      .limit(1);

    if (!exam) {
      return NextResponse.json(
        { success: false, message: "آزمون مورد نظر یافت نشد." },
        { status: 404 }
      );
    }

    const assignedIds = (exam.assignedStudentIds as string[]) || [];
    if (assignedIds.length > 0 && !assignedIds.includes(targetStudentId)) {
      return NextResponse.json(
        { success: false, message: "شما در فهرست داوطلبان مجاز برای شرکت در این آزمون قرار ندارید." },
        { status: 403 }
      );
    }

    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalAnswered = (correctCount || 0) + (wrongCount || 0) + (unansweredCount || 0);
    const scorePercent = totalAnswered > 0 ? Math.round(((correctCount || 0) / totalAnswered) * 100) : 0;

    // Enqueue asynchronously to Redis / BullMQ with atomic NX lock
    const result = await enqueueExamSubmission({
      submissionId,
      examId: exam.id,
      studentProfileId: targetStudentId,
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
