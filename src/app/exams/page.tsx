import { requireAuth } from "@/server/auth/guard";
import { db } from "@/server/db";
import { evaluationExams, examSubmissions, studentProfiles, users } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { ExamsClient } from "./exams-client";
import type { EvaluationExamRecord, ExamSubmissionRecord } from "@/types/models";

export default async function ExamsPage() {
  const session = await requireAuth();

  const examsRows = await db
    .select()
    .from(evaluationExams)
    .orderBy(desc(evaluationExams.createdAt));
  const exams = examsRows as unknown as EvaluationExamRecord[];

  let submissions: ExamSubmissionRecord[] = [];
  let studentProfileId = "";

  if (session.role === "STUDENT") {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (profile) {
      studentProfileId = profile.id;
      const subRows = await db
        .select()
        .from(examSubmissions)
        .where(eq(examSubmissions.studentProfileId, profile.id))
        .orderBy(desc(examSubmissions.submittedAt));
      submissions = subRows as unknown as ExamSubmissionRecord[];
    }
  } else {
    // Mentor, Supervisor, or CEO: view all submissions
    const subRows = await db
      .select()
      .from(examSubmissions)
      .orderBy(desc(examSubmissions.submittedAt));
    submissions = subRows as unknown as ExamSubmissionRecord[];
  }

  // Get available candidates for audience targeting
  const allProfiles = await db.select().from(studentProfiles);
  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const studentsList = allProfiles.map((st) => {
    const user = userMap.get(st.userId);
    return {
      id: st.id,
      fullName: user?.fullName || "داوطلب",
      nationalId: user?.nationalId || "",
      phone: user?.phoneNumber || "",
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" dir="rtl">
      <ExamsClient
        currentUser={{
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        }}
        studentProfileId={studentProfileId}
        exams={exams}
        submissions={submissions}
        studentsList={studentsList}
      />
    </div>
  );
}
