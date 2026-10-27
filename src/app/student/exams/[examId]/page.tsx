import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { exams, examQuestions, examSubmissions, studentProfiles, users } from "@/server/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { ExamRunnerClient } from "./exam-runner-client";
import { ForensicWatermark } from "@/components/security/forensic-watermark";
import { LegalConsentModal } from "@/components/security/legal-consent-modal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { toPersianDigits } from "@/lib/jalali";
import type { ExamRecord, ExamQuestion, ExamOptionItem } from "@/types/models";

interface PageProps {
  params: Promise<{ examId: string }>;
}

export default async function StudentExamSessionPage({ params }: PageProps) {
  const { examId } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // 1. Fetch Exam and Submissions safely
  type ExamRow = typeof exams.$inferSelect;
  type ExamSubRow = typeof examSubmissions.$inferSelect;
  let examRow: ExamRow | null = null;
  let existingSub: Partial<ExamSubRow> | null = null;
  let questions: ExamQuestion[] = [];
  let currentUser: { fullName: string; nationalId: string | null; phoneNumber: string | null } | null = null;
  let acceptedLegalTermsAt: Date | null = null;

  try {
    const [u] = await db
      .select({
        fullName: users.fullName,
        nationalId: users.nationalId,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    currentUser = u || null;

    const [sp] = await db
      .select({
        acceptedLegalTermsAt: studentProfiles.acceptedLegalTermsAt,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);
    acceptedLegalTermsAt = sp?.acceptedLegalTermsAt || null;

    const [fetchedExam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    examRow = fetchedExam;

    if (examRow) {
      const [sub] = await db
        .select()
        .from(examSubmissions)
        .where(
          and(
            eq(examSubmissions.examId, examId),
            eq(examSubmissions.studentId, session.userId)
          )
        )
        .limit(1);
      existingSub = sub;

      // Auto-start exam attempt if not already recorded (H-22)
      if (!existingSub) {
        try {
          const [profile] = await db
            .select({ id: studentProfiles.id, mentorId: studentProfiles.mentorId })
            .from(studentProfiles)
            .where(eq(studentProfiles.userId, session.userId))
            .limit(1);

          const mentorId = profile?.mentorId || examRow.createdById;
          const newSubId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const now = new Date();

          await db.insert(examSubmissions).values({
            id: newSubId,
            examId: examRow.id,
            studentId: session.userId,
            studentName: session.fullName || "داوطلب مشاهیر دانش",
            mentorId,
            studentProfileId: profile?.id || null,
            examTitle: examRow.title,
            startedAt: now,
            submittedAt: null,
            answers: {},
            correctCount: 0,
            incorrectCount: 0,
            unansweredCount: examRow.totalQuestions,
            totalPercentage: "0.00",
            subjectBreakdown: [],
            subjectScores: {},
            status: "IN_PROGRESS",
            scorePercent: 0,
          });

          existingSub = {
            id: newSubId,
            startedAt: now,
            status: "IN_PROGRESS",
          };
        } catch (subErr) {
          console.error("[StudentExamSessionPage] Failed to initialize in-progress attempt:", subErr);
        }
      }

      const questionsRows = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, examId))
        .orderBy(asc(examQuestions.questionNumber));

      // Strip correctOption and explanation to protect exam answer keys (C-04)
      questions = questionsRows.map((q) => ({
        id: q.id,
        examId: q.examId,
        questionNumber: q.questionNumber,
        subject: q.subject,
        questionText: q.questionText,
        options: (q.options as ExamOptionItem[]) || [],
        coefficient: q.coefficient,
      }));
    }
  } catch (err) {
    console.error("[StudentExamSessionPage] fetch error:", err);
  }

  if (!examRow) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 max-w-md bg-card border border-border rounded-2xl space-y-3">
          <h2 className="text-base font-bold text-foreground">آزمون یافت نشد</h2>
          <p className="text-xs text-muted-foreground">شناسه آزمون نامعتبر است یا این آزمون حذف شده است.</p>
          <Link href="/student/exams">
            <Button size="sm" variant="outline" className="text-xs mt-2">
              بازگشت به فهرست آزمون‌ها
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check publication state for students
  if (!examRow.isPublished && session.role === "STUDENT") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 max-w-md bg-card border border-border rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground">آزمون هنوز فعال نشده است</h2>
          <p className="text-xs text-muted-foreground">
            این آزمون در حال حاضر در مرحله طراحی بوده و هنوز برای داوطلبان منتشر نگردیده است.
          </p>
          <Link href="/student/exams">
            <Button size="sm" variant="outline" className="text-xs mt-2">
              بازگشت به فهرست آزمون‌ها
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check target audience access control for students
  if (session.role === "STUDENT") {
    let studentCourseCode: string | null = null;
    try {
      const [profile] = await db
        .select({ enrolledCourseCode: studentProfiles.enrolledCourseCode })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      studentCourseCode = profile?.enrolledCourseCode || null;
    } catch {}

    let isAuthorized = true;
    const targetAudience = examRow.targetAudience || "ALL";

    if (targetAudience === "COURSE_CODE") {
      const targetCodes = Array.isArray(examRow.targetCourseCodes)
        ? (examRow.targetCourseCodes as string[])
        : [];
      if (!studentCourseCode || !targetCodes.includes(studentCourseCode)) {
        isAuthorized = false;
      }
    } else if (targetAudience === "SPECIFIC_STUDENTS") {
      const targetIds = Array.isArray(examRow.targetStudentIds)
        ? (examRow.targetStudentIds as string[])
        : [];
      if (!targetIds.includes(session.userId)) {
        isAuthorized = false;
      }
    }

    if (!isAuthorized) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="p-8 max-w-md bg-card border border-rose-500/30 rounded-2xl space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">عدم تخصیص آزمون</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              این آزمون برای دوره یا پرونده آموزشی شما تخصیص نیافته است.
            </p>
            <Link href="/student/exams">
              <Button size="sm" variant="outline" className="text-xs mt-2">
                بازگشت به فهرست آزمون‌ها
              </Button>
            </Link>
          </div>
        </div>
      );
    }
  }

  const exam = examRow as unknown as ExamRecord;

  // If already submitted and pending mentor review
  if (existingSub && existingSub.status === "AUTO_GRADED_PENDING_MENTOR") {
    return (
      <div className="min-h-[60vh] max-w-2xl mx-auto flex flex-col items-center justify-center p-6 text-center">
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-xl p-8 space-y-6 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-xs px-3 py-1">
              تصحیح سیستمی انجام شد • در انتظار تایید پشتیبان
            </Badge>
            <h1 className="text-lg font-bold text-foreground">
              پاسخنامه شما در آزمون «{exam.title}» ثبت گردید
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              پاسخنامه شما با موفقیت دریافت و تصحیح اولیه شده است. مطابق استانداردهای هدایت تحصیلی مشاهیر دانش، کارنامه تفکیکی و درصدهای نهایی پس از بررسی، تحلیل نقاط ضعف و ارائه نقشه راه توسط پشتیبان آموزشی شما منتشر خواهد شد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs border-y border-border py-4 max-w-sm mx-auto">
            <div>
              <span className="text-muted-foreground block text-[10px]">تعداد کل سؤالات</span>
              <strong className="text-foreground font-mono text-sm">{toPersianDigits(exam.totalQuestions)} سؤال</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">قانون نمره منفی</span>
              <strong className="text-foreground text-sm">{exam.hasNegativeMarking ? "یک‌سوم (۱/۳)" : "ندارد"}</strong>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link href="/student/exams">
              <Button size="sm" className="text-xs bg-[#004071] hover:bg-[#00335c] text-white">
                <ArrowLeft className="h-4 w-4 ml-1.5" />
                <span>بازگشت به کارتابل آزمون‌ها</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // If already published to student, redirect or show view link
  if (existingSub && existingSub.status === "PUBLISHED_TO_STUDENT") {
    redirect(`/student/exams?viewResult=${examId}`);
  }

  // Calculate remaining seconds server-side accurately (Requirement 3)
  const durationSeconds = (exam.durationMinutes || 120) * 60;
  const startedAtMs = existingSub?.startedAt ? new Date(existingSub.startedAt).getTime() : Date.now();
  const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);

  return (
    <ForensicWatermark
      userFullName={currentUser?.fullName || session.fullName}
      nationalId={currentUser?.nationalId || "••••••••••"}
      phoneNumber={currentUser?.phoneNumber || "۰۹•••••••••"}
    >
      <LegalConsentModal
        isOpen={session.role === "STUDENT" && !acceptedLegalTermsAt}
        studentName={currentUser?.fullName || session.fullName}
        nationalId={currentUser?.nationalId || ""}
      />
      <div className="max-w-5xl mx-auto space-y-6">
        <ExamRunnerClient
          exam={exam}
          questions={questions}
          userId={session.userId}
          initialStartedAt={existingSub?.startedAt ? new Date(existingSub.startedAt).toISOString() : undefined}
          initialRemainingSeconds={remainingSeconds}
        />
      </div>
    </ForensicWatermark>
  );
}
