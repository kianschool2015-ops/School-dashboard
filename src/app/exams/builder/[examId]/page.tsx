import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { users, exams, examQuestions } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";
import { QuestionDesignerClient } from "./question-designer-client";
import { getExamTargetOptionsAction } from "@/server/actions/exams";
import type { ExamRecord, ExamQuestion, ExamOptionItem } from "@/types/models";

interface PageProps {
  params: Promise<{ examId: string }>;
}

export default async function ExamQuestionBuilderPage({ params }: PageProps) {
  const { examId } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // Route Guard: CEO, SUPERVISOR, ADMIN or MENTOR (with cohort scoping)
  const isPrivileged =
    session.role === "CEO" ||
    session.role === "SUPERVISOR" ||
    session.role === "ADMIN" ||
    session.role === "MENTOR";
  const canCreate = isPrivileged;

  if (!canCreate) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 max-w-md bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400">دسترسی غیرمجاز</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            شما مجوز لازم برای طراحی و بارگذاری آزمون را ندارید.
          </p>
        </div>
      </div>
    );
  }

  // Fetch Exam and Questions safely
  type ExamRow = typeof exams.$inferSelect;
  let examRow: ExamRow | null = null;
  let questions: ExamQuestion[] = [];

  try {
    const [fetchedExam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);
    examRow = fetchedExam;

    if (examRow) {
      const questionsRows = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, examId))
        .orderBy(asc(examQuestions.questionNumber));

      questions = questionsRows.map((q) => ({
        id: q.id,
        examId: q.examId,
        questionNumber: q.questionNumber,
        subject: q.subject,
        questionText: q.questionText,
        options: (q.options as ExamOptionItem[]) || [],
        correctOption: q.correctOption,
        explanation: q.explanation,
        coefficient: q.coefficient,
      }));
    }
  } catch (err) {
    console.error("[ExamQuestionBuilderPage] fetch error:", err);
  }

  if (!examRow) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 max-w-md bg-card border border-border rounded-2xl space-y-3">
          <h2 className="text-base font-bold text-foreground">آزمون یافت نشد</h2>
          <p className="text-xs text-muted-foreground">شناسه آزمون نامعتبر است یا این آزمون حذف شده است.</p>
        </div>
      </div>
    );
  }

  // If mentor, ensure ownership
  if (session.role === "MENTOR" && examRow.createdById !== session.userId) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-6 max-w-md bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-3">
          <h2 className="text-base font-bold text-rose-600">عدم دسترسی به ویرایش آزمون دیگران</h2>
          <p className="text-xs text-muted-foreground">پشتیبانان تنها مجاز به ویرایش آزمون‌های طراحی‌شده توسط خود هستند.</p>
        </div>
      </div>
    );
  }

  const exam: ExamRecord = examRow as unknown as ExamRecord;
  const targetOptions = await getExamTargetOptionsAction();

  return (
    <QuestionDesignerClient
      exam={exam}
      initialQuestions={questions}
      userRole={session.role}
      targetCourses={targetOptions.courses}
      targetStudents={targetOptions.students}
    />
  );
}
