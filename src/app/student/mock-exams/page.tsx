import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { mockExams as mockExamsTable } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { Award } from "lucide-react";
import { MockExamsClient } from "./mock-exams-client";
import type { MockExamRecord } from "@/types/models";

export default async function MockExamsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const studentProfileId = session.studentProfileId || "profile_stu_1";
  const mockExamsRows = await db
    .select()
    .from(mockExamsTable)
    .where(eq(mockExamsTable.studentProfileId, studentProfileId))
    .orderBy(desc(mockExamsTable.createdAt));
  const mockExams = mockExamsRows as unknown as MockExamRecord[];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2 space-x-reverse">
          <Award className="h-5 w-5 text-indigo-400" />
          <span>کارنامه و تحلیل آزمون‌های آزمایشی (Screen 07)</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          ثبت درصدهای آزمون کانون و مرکز وکلا و پایش هوشمند افت تراز (هشدار خودکار A06)
        </p>
      </div>

      <MockExamsClient
        studentProfileId={studentProfileId}
        initialMockExams={mockExams}
      />
    </div>
  );
}
