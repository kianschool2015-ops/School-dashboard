import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import { triageCases, studentProfiles, users } from "@/server/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import {
  ShieldAlert,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { MentorTriageClient } from "./triage-client";
import type { TriageCaseRecord } from "@/types/models";

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
      {/* Page Inner Sub-Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2 space-x-reverse">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-500" />
              <span>سامانه شناسایی مشکلات مطالعاتی و تریاژ تحصیلی</span>
            </h2>
            <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold persian-nums">
              {toPersianDigits(activeCases.length)} پرونده باز
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            داوطلبان سبز از کارتابل روزانه تفکیک شده‌اند تا تمرکز پشتیبان بر رسیدگی به موارد بحرانی و زرد باشد.
          </p>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse text-xs">
          <div className="flex items-center space-x-1.5 space-x-reverse bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">حل شده:</span>
            <span className="font-bold text-slate-900 dark:text-white persian-nums">
              {toPersianDigits(resolvedCases.length)} پرونده
            </span>
          </div>
        </div>
      </div>

      {/* Tri-Color KPI Status Cards (Green Right, Yellow Center, Red Left in RTL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Green Card (Right in RTL) */}
        <div className="rounded-2xl p-5 border transition-all bg-[#E3F9ED] border-[#A7F3D0] text-[#065F46] dark:bg-[#0D2824]/90 dark:border-[#10B981]/50 dark:text-emerald-400 dark:shadow-[inset_0_0_25px_rgba(16,185,129,0.08)] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold block opacity-90">
              داوطلبان سبز (پایدار)
            </span>
            <div className="text-2xl font-black font-mono">
              {toPersianDigits(greenStudentsCount)} <span className="text-xs font-normal">داوطلب</span>
            </div>
            <p className="text-[11px] opacity-80">
              روند عادی بدون نیاز به مداخله فوری
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[#065F46] dark:text-emerald-300 shrink-0 shadow-xs">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* 2. Yellow Card (Center in RTL) */}
        <div className="rounded-2xl p-5 border transition-all bg-[#FEF5D8] border-[#FDE68A] text-[#92400E] dark:bg-[#2A2112]/90 dark:border-[#F59E0B]/50 dark:text-amber-400 dark:shadow-[inset_0_0_25px_rgba(245,158,11,0.08)] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold block opacity-90">
              داوطلبان زرد (هشدار)
            </span>
            <div className="text-2xl font-black font-mono">
              {toPersianDigits(yellowStudentsCount)} <span className="text-xs font-normal">داوطلب</span>
            </div>
            <p className="text-[11px] opacity-80">
              کاهش نسبی ساعات یا عدم ثبت گزارش
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[#92400E] dark:text-amber-300 shrink-0 shadow-xs">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* 3. Red Card (Left in RTL) */}
        <div className="rounded-2xl p-5 border transition-all bg-[#FCE8E8] border-[#FECACA] text-[#991B1B] dark:bg-[#2C1219]/90 dark:border-[#F43F5E]/50 dark:text-rose-400 dark:shadow-[inset_0_0_25px_rgba(244,63,94,0.08)] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-bold block opacity-90">
              داوطلبان قرمز (بحرانی)
            </span>
            <div className="text-2xl font-black font-mono">
              {toPersianDigits(redStudentsCount)} <span className="text-xs font-normal">داوطلب</span>
            </div>
            <p className="text-[11px] opacity-80">
              افت شدید، عدم پاسخگویی یا تعارض جدی
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/70 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-[#991B1B] dark:text-rose-300 shrink-0 shadow-xs">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Triage Interactive List & Workflows */}
      <MentorTriageClient
        initialCases={triageList as unknown as TriageCaseRecord[]}
        studentNames={studentNames}
      />
    </div>
  );
}
