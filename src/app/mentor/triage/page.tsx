import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import { triageCases, studentProfiles, users } from "@/server/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { MentorTriageClient } from "./triage-client";
import type { TriageCaseRecord, StudentProfileRecord, UserRecord } from "@/types/models";

export default async function MentorTriagePage() {
  const session = await getSession();

  if (
    !session ||
    (session.role !== "MENTOR" &&
      session.role !== "SUPERVISOR" &&
      session.role !== "ADMIN" &&
      session.role !== "CEO")
  ) {
    redirect("/auth/login");
  }

  const mentorId = session.role === "MENTOR" ? session.userId : "usr_mentor1";
  let triageList: (typeof triageCases.$inferSelect)[] = [];
  let students: (typeof studentProfiles.$inferSelect)[] = [];
  let studentUsers: (typeof users.$inferSelect)[] = [];

  try {
    await ensureDatabaseBootstrap().catch(() => {});
    triageList = await db
      .select()
      .from(triageCases)
      .where(eq(triageCases.mentorId, mentorId))
      .orderBy(desc(triageCases.createdAt));

    students = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.mentorId, mentorId));

    const studentUserIds = students.map((s) => s.userId).filter(Boolean);
    studentUsers =
      studentUserIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, studentUserIds))
        : [];
  } catch (err) {
    console.warn("[MentorTriage] DB query error:", err);
  }

  const userMap = new Map(studentUsers.map((u) => [u.id, u.fullName]));
  const studentNames: Record<string, string> = {};
  for (const s of students) {
    studentNames[s.id] = userMap.get(s.userId) || `داوطلب ${s.id}`;
  }

  // Stats & Tri-Color KPI calculation
  const activeCases = triageList.filter((c) => !c.isResolved);
  const resolvedCases = triageList.filter((c) => c.isResolved);

  const greenStudentsCount = students.filter((s) => s.riskStatus === "GREEN").length;
  const yellowStudentsCount = students.filter((s) => s.riskStatus === "YELLOW").length;
  const redStudentsCount = students.filter((s) => s.riskStatus === "RED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center space-x-2 space-x-reverse">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-500" />
              <span>سامانه شناسایی مشکلات مطالعاتی و هدایت تحصیلی</span>
            </h1>
            <Badge variant="red" className="persian-nums">
              {toPersianDigits(activeCases.length)} پرونده باز
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            داوطلبان سبز از فهرست روزانه پنهان شده‌اند تا تمرکز بر پیگیری داوطلبان نیازمند رسیدگی باشد.
          </p>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse text-xs">
          <div className="flex items-center space-x-1.5 space-x-reverse">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">حل شده:</span>
            <span className="font-bold text-foreground persian-nums">
              {toPersianDigits(resolvedCases.length)}
            </span>
          </div>
        </div>
      </div>

      {/* Tri-Color Risk Statistics (Strictly Separated Green, Yellow, Red) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Green: Stable */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">
                داوطلبان سبز (پایدار)
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 persian-nums">
                {toPersianDigits(greenStudentsCount)} <span className="text-xs font-normal">داوطلب</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                روند عادی بدون نیاز به مداخله فوری
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Yellow: Attention Needed */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 block">
                داوطلبان زرد (نیازمند توجه)
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 persian-nums">
                {toPersianDigits(yellowStudentsCount)} <span className="text-xs font-normal">داوطلب</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                افت ساعت مطالعه یا نرسیدن به سرفصل
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Red: Critical */}
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block">
                داوطلبان قرمز (بحرانی)
              </span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 persian-nums">
                {toPersianDigits(redStudentsCount)} <span className="text-xs font-normal">داوطلب</span>
              </span>
              <span className="text-[11px] text-muted-foreground block mt-1">
                بحران افت تراز، عدم پاسخگویی یا توقف برنامه
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Triage Interactive List & Workflows */}
      <MentorTriageClient
        initialCases={triageList as unknown as TriageCaseRecord[]}
        studentNames={studentNames}
      />
    </div>
  );
}
