import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { users, exams } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExamBuilderDashboard } from "./builder-dashboard";
import { getExamTargetOptionsAction } from "@/server/actions/exams";
import type { ExamRecord } from "@/types/models";

export default async function ExamBuilderPage() {
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
            شما مجوز لازم برای طراحی و بارگذاری آزمون را در سامانه ندارید.
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            طراحی آزمون نیاز به نقش پشتیبان، سرپرست یا مدیریت ارشد در سامانه دارد.
          </p>
        </div>
      </div>
    );
  }

  // Fetch target options (courses and candidate students)
  const targetOptions = await getExamTargetOptionsAction();

  // Fetch authored exams with safe database query guard
  let authoredExams: ExamRecord[] = [];
  try {
    const query = db
      .select()
      .from(exams)
      .orderBy(desc(exams.createdAt));

    const rows = await query;
    if (session.role === "MENTOR") {
      authoredExams = rows.filter((r) => r.createdById === session.userId) as unknown as ExamRecord[];
    } else {
      authoredExams = rows as unknown as ExamRecord[];
    }
  } catch (err) {
    console.error("[ExamBuilderPage] fetch error:", err);
    authoredExams = [];
  }

  return (
    <ExamBuilderDashboard
      initialExams={authoredExams}
      userRole={session.role}
      userId={session.userId}
      targetCourses={targetOptions.courses}
      targetStudents={targetOptions.students}
    />
  );
}
