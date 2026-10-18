import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { WeeklyReviewClient } from "./weekly-review-client";

export default async function WeeklyReviewPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const studentProfileId = session.studentProfileId || "profile_stu_1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2 space-x-reverse">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          <span>فرم خودارزیابی و تحلیل عملکرد جمعه‌ها (Screen 06)</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          ثبت بازخورد داوطلب تا ظهر شنبه الزامی بوده و مانع از فعال شدن هشدار انضباطی A02 می‌گردد.
        </p>
      </div>

      <WeeklyReviewClient studentProfileId={studentProfileId} />
    </div>
  );
}
