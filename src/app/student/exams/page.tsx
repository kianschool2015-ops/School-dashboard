import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { getStudentExamsOverviewAction } from "@/server/actions/exams";
import { StudentExamsClient, type StudentExamsOverviewData } from "./student-exams-client";

interface PageProps {
  searchParams: Promise<{ viewResult?: string }>;
}

export default async function StudentExamsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const { viewResult } = await searchParams;
  const overviewData = await getStudentExamsOverviewAction();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <StudentExamsClient
        initialData={overviewData as unknown as StudentExamsOverviewData}
        initialViewResultId={viewResult}
        userName={session.fullName}
      />
    </div>
  );
}
