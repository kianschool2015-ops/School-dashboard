import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { memoryRepo } from "@/server/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle,
  ExternalLink,
  Flame,
  AlertTriangle,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";
import { MentorTriageClient } from "./triage-client";

export default async function MentorTriagePage() {
  const session = await getSession();

  if (!session || (session.role !== "MENTOR" && session.role !== "SUPERVISOR" && session.role !== "ADMIN" && session.role !== "CEO")) {
    redirect("/auth/login");
  }

  const mentorId = session.role === "MENTOR" ? session.userId : "usr_mentor1";
  const triageCases = memoryRepo.getTriageCasesByMentor(mentorId, false);
  const students = memoryRepo.getStudentsByMentorId(mentorId);

  const studentNames: Record<string, string> = {};
  for (const s of students) {
    const user = memoryRepo.getUserById(s.userId);
    studentNames[s.id] = user ? user.fullName : `داوطلب ${s.id}`;
  }

  // Stats
  const activeCases = triageCases.filter((c) => !c.isResolved);
  const resolvedCases = triageCases.filter((c) => c.isResolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center space-x-2 space-x-reverse">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-500" />
              <span>سامانه پایش بحران‌های مطالعاتی و هدایت تحصیلی</span>
            </h1>
            <Badge variant="red" className="persian-nums">
              {toPersianDigits(activeCases.length)} پرونده باز
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            داوطلبان در وضعیت سبز به صورت هوشمند از صف روزانه مخفی شده‌اند تا حداکثر تمرکز بر نجات داوطلبان بحرانی معطوف گردد.
          </p>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse text-xs">
          <div className="bg-card px-3 py-1.5 rounded-lg border border-border text-muted-foreground">
            کل داوطلبان تحت سرپرستی:{" "}
            <span className="font-bold text-foreground persian-nums">
              {toPersianDigits(students.length)} نفر
            </span>
          </div>
        </div>
      </div>

      {/* SLA Tiers Overview Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
        <div className="bg-card p-2.5 rounded-lg border border-rose-500/20">
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">اولویت ۱ (SLA ۶h)</span>
          <span className="text-xs font-semibold text-foreground">بحران سکوت (A08)</span>
        </div>
        <div className="bg-card p-2.5 rounded-lg border border-rose-500/20">
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">اولویت ۲ (SLA ۱۲h)</span>
          <span className="text-xs font-semibold text-foreground">کمک فوری (A01)</span>
        </div>
        <div className="bg-card p-2.5 rounded-lg border border-amber-500/20">
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block">اولویت ۳ (SLA ۲۴-۴۸h)</span>
          <span className="text-xs font-semibold text-foreground">آزمون و تراز (A05/6/7)</span>
        </div>
        <div className="bg-card p-2.5 rounded-lg border border-amber-500/20">
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block">اولویت ۴ (SLA ۴۸h)</span>
          <span className="text-xs font-semibold text-foreground">انباشت جبرانی (A04)</span>
        </div>
        <div className="bg-card p-2.5 rounded-lg border border-border">
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">اولویت ۵ (SLA ۲۴h)</span>
          <span className="text-xs font-semibold text-foreground">عدم خودارزیابی (A02)</span>
        </div>
        <div className="bg-card p-2.5 rounded-lg border border-border">
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">اولویت ۶ (SLA ۷۲h)</span>
          <span className="text-xs font-semibold text-foreground">افت اجرا (A03)</span>
        </div>
      </div>

      {/* Interactive Triage List Component */}
      <MentorTriageClient
        initialCases={triageCases}
        studentNames={studentNames}
      />
    </div>
  );
}
