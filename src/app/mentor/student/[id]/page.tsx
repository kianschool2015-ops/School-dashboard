import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { studentProfiles, users, mockExams, triageCases } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { CandidateDetailClient } from "./candidate-detail-client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentProfileRecord, UserRecord, MockExamRecord } from "@/types/models";

interface CandidateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidateDetailPage({ params }: CandidateDetailPageProps) {
  const session = await getSession();

  if (!session || (session.role !== "MENTOR" && session.role !== "SUPERVISOR" && session.role !== "ADMIN" && session.role !== "CEO")) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, id))
    .limit(1);

  if (!student) {
    notFound();
  }

  // IDOR Zero-Trust Guard: Mentors can strictly access ONLY their assigned students
  if (session.role === "MENTOR" && student.mentorId !== session.userId) {
    redirect("/mentor/triage");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, student.userId))
    .limit(1);

  if (!user) {
    notFound();
  }

  const studentMockExams = await db
    .select()
    .from(mockExams)
    .where(eq(mockExams.studentProfileId, student.id))
    .orderBy(desc(mockExams.createdAt));

  // Find active unresolved triage case for this student if any
  const mentorId = session.role === "MENTOR" ? session.userId : "usr_mentor1";
  const activeCases = await db
    .select()
    .from(triageCases)
    .where(and(eq(triageCases.mentorId, mentorId), eq(triageCases.isResolved, false)));
  const studentActiveCase = activeCases.find((c) => c.studentProfileId === student.id);

  return (
    <div className="space-y-6">
      {/* Navigation buttons */}
      <div className="flex items-center gap-3">
        <Link href="/mentor/students">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <ArrowRight className="h-4 w-4 ms-1.5" />
            <span>بازگشت به کارتابل داوطلبان من</span>
          </Button>
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link href="/mentor/triage">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <span>رفع مشکلات علمی</span>
          </Button>
        </Link>
      </div>

      {/* 360-Degree Candidate Profile Card */}
      <CandidateDetailClient
        student={student as unknown as StudentProfileRecord}
        user={user as unknown as UserRecord}
        mockExams={studentMockExams as unknown as MockExamRecord[]}
        activeCaseId={studentActiveCase?.id}
        activeTriggerCode={studentActiveCase?.triggerCode}
      />
    </div>
  );
}
