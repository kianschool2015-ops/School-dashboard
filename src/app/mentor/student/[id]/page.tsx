import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect, notFound } from "next/navigation";
import { memoryRepo } from "@/server/db";
import { CandidateDetailClient } from "./candidate-detail-client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CandidateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const session = await getSession();

  if (!session || (session.role !== "MENTOR" && session.role !== "SUPERVISOR" && session.role !== "ADMIN" && session.role !== "CEO")) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const student = memoryRepo.getStudentProfileById(id);

  if (!student) {
    notFound();
  }

  const user = memoryRepo.getUserById(student.userId);
  if (!user) {
    notFound();
  }

  const mockExams = memoryRepo.getMockExamsForStudent(student.id);

  // Find active unresolved triage case for this student if any
  const mentorId = session.role === "MENTOR" ? session.userId : "usr_mentor1";
  const activeCases = memoryRepo.getTriageCasesByMentor(mentorId, true);
  const studentActiveCase = activeCases.find((c) => c.studentProfileId === student.id);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/mentor/triage">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-white">
            <ArrowRight className="h-4 w-4 ms-1.5" />
            <span>بازگشت به پایش بحران‌های مطالعاتی</span>
          </Button>
        </Link>
      </div>

      {/* 360-Degree Candidate Profile Card */}
      <CandidateDetailClient
        student={student}
        user={user}
        mockExams={mockExams}
        activeCaseId={studentActiveCase?.id}
        activeTriggerCode={studentActiveCase?.triggerCode}
      />
    </div>
  );
}
