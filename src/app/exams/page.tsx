import { requireAuth } from "@/server/auth/guard";
import { memoryRepo } from "@/server/db";
import { ExamsClient } from "./exams-client";
import type { EvaluationExamRecord, ExamSubmissionRecord } from "@/types/models";

export default async function ExamsPage() {
  const session = await requireAuth();

  const exams = memoryRepo.getAllEvaluationExams();

  let submissions: ExamSubmissionRecord[] = [];
  let studentProfileId = "";

  if (session.role === "STUDENT") {
    const studentProfile = memoryRepo.getStudentProfileByUserId(session.userId);
    if (studentProfile) {
      studentProfileId = studentProfile.id;
      submissions = memoryRepo.getExamSubmissionsForStudent(studentProfile.id);
    }
  } else {
    // Mentor, Supervisor, or CEO: view all submissions
    submissions = memoryRepo.getAllExamSubmissions();
  }

  // Get available candidates for audience targeting
  const studentsList = memoryRepo.getAllStudentProfiles().map((st) => {
    const user = memoryRepo.getUserById(st.userId);
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
