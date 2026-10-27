import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { exams } from "@/server/db/schema";
import { desc } from "drizzle-orm";
import { ExamsClient } from "./exams-client";
import {
  getExamTargetOptionsAction,
  getPendingMentorReviewsAction,
  getConfirmedExamSubmissionsAction,
} from "@/server/actions/exams";
import type { ExamRecord } from "@/types/models";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ExamsPage({ searchParams }: PageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  // If candidate student visits /exams, redirect to their dedicated CBT runner lobby
  if (session.role === "STUDENT") {
    redirect("/student/exams");
  }

  const { tab } = await searchParams;

  // 1. Fetch authored exams
  let authoredExams: ExamRecord[] = [];
  try {
    const rows = await db.select().from(exams).orderBy(desc(exams.createdAt));
    if (session.role === "MENTOR") {
      authoredExams = rows.filter(
        (r) => r.createdById === session.userId || r.targetMentorId === session.userId
      ) as unknown as ExamRecord[];
    } else {
      authoredExams = rows as unknown as ExamRecord[];
    }
  } catch (err) {
    console.error("[ExamsPage] Exams query error:", err);
  }

  // 2. Fetch submissions pending mentor review (AUTO_GRADED_PENDING_MENTOR)
  const pendingSubmissions = await getPendingMentorReviewsAction();

  // 3. Fetch confirmed & published submissions (PUBLISHED_TO_STUDENT)
  const confirmedSubmissions = await getConfirmedExamSubmissionsAction();

  // 4. Fetch target courses and candidate students for authoring modal
  const targetOptions = await getExamTargetOptionsAction();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6" dir="rtl">
      <ExamsClient
        currentUser={{
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        }}
        initialExams={authoredExams}
        pendingSubmissions={pendingSubmissions}
        confirmedSubmissions={confirmedSubmissions}
        targetCourses={targetOptions.courses}
        targetStudents={targetOptions.students}
        initialTab={tab}
      />
    </div>
  );
}
