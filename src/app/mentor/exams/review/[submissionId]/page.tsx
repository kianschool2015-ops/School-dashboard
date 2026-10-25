import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { getSubmissionForReviewAction } from "@/server/actions/exams";
import { ExamReviewClient } from "./exam-review-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import type { ExamRecord } from "@/types/models";

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default async function MentorExamReviewPage({ params }: PageProps) {
  const { submissionId } = await params;
  const session = await getSession();

  if (
    !session ||
    (session.role !== "MENTOR" &&
      session.role !== "SUPERVISOR" &&
      session.role !== "CEO" &&
      session.role !== "ADMIN")
  ) {
    redirect("/auth/login");
  }

  const data = await getSubmissionForReviewAction(submissionId);

  if (!data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border-border bg-card p-6 space-y-4 rounded-2xl">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-foreground">پاسخنامه یافت نشد</h2>
          <p className="text-xs text-muted-foreground">
            شناسه پاسخنامه نامعتبر است یا دسترسی به این کارنامه محدود می‌باشد.
          </p>
          <Link href="/mentor/students">
            <Button size="sm" variant="outline" className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 ml-1" />
              <span>بازگشت به کارتابل داوطلبان</span>
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ExamReviewClient
        submission={data.submission}
        student={data.student}
        exam={data.exam as unknown as ExamRecord}
        questions={data.questions}
        currentUserRole={session.role}
      />
    </div>
  );
}
