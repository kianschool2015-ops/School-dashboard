import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { studentProfiles, triageCases } from "@/server/db/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Award,
  Layers,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";

export default async function SupervisorDashboardPage() {
  const session = await getSession();

  if (!session || (session.role !== "SUPERVISOR" && session.role !== "ADMIN" && session.role !== "CEO")) {
    redirect("/auth/login");
  }

  const allStudents = await db.select().from(studentProfiles);
  const allTriage = await db.select().from(triageCases);

  // 1. Cohort Health Breakdown
  const total = allStudents.length;
  const greenCount = allStudents.filter((s) => s.riskStatus === "GREEN").length;
  const yellowCount = allStudents.filter((s) => s.riskStatus === "YELLOW").length;
  const redCount = allStudents.filter((s) => s.riskStatus === "RED").length;

  const greenPct = Math.round((greenCount / total) * 100);
  const yellowPct = Math.round((yellowCount / total) * 100);
  const redPct = Math.round((redCount / total) * 100);

  // 2. Mentors Performance & SLA Compliance
  const mentors = [
    {
      id: "usr_mentor1",
      name: "استاد علی کاظمی (پشتیبان ارشد)",
      activeStudents: 25,
      resolvedInSla: 18,
      totalTriggers: 20,
      slaCompliance: 90,
      openCrisis: redCount,
    },
    {
      id: "usr_mentor2",
      name: "استاد مریم حسینی (پشتیبان حقوق خصوصی)",
      activeStudents: 22,
      resolvedInSla: 14,
      totalTriggers: 15,
      slaCompliance: 93,
      openCrisis: 1,
    },
  ];

  // 3. Top-5 Systemic Candidate Obstacles
  const topObstacles = [
    { title: "سختی درک و تطبیق مواد عقود معین (مدنی ۳ و ۶)", count: 42, pct: 68 },
    { title: "کمبود وقت در دور اول پاسخگویی به تست‌های آیین دادرسی", count: 35, pct: 56 },
    { title: "خستگی مفرط ناشی از اشتغال همزمان با آمادگی آزمون", count: 28, pct: 45 },
    { title: "عدم تسلط بر متن عربی و اصطلاحات متون فقه (لمعه)", count: 22, pct: 35 },
    { title: "اضطراب زمان‌بندی و افت انگیزه در تست‌های حقوق تجارت", count: 18, pct: 29 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            <span>داشبورد نظارت و سرپرستی آموزشی مشاهیر دانش</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            سامانه سرپرستی هدایت تحصیلی آزمون وکالت • پایش شاخص‌های عملکرد کلان موسسه مشاهیر دانش
          </p>
        </div>

        <Badge variant="yellow" className="text-xs px-3 py-1">
          کوهورت آزمون وکالت ۱۴۰۳-۱۴۰۴
        </Badge>
      </div>

      {/* 5-Level Performance Gantt for Mentors Audited by Supervisor/CEO */}
      <MultiHorizonGantt
        entityType="MENTOR"
        entityName="تیم پشتیبانان آموزشی کوهورت وکالت"
        readOnlyAuditorRole={session.role === "CEO" ? "CEO" : "SUPERVISOR"}
      />

      {/* Cohort Health Breakdown Tile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-500/30 bg-card p-5">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span>داوطلبان پایدار (وضعیت سبز)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
            %{toPersianDigits(greenPct)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 persian-nums">
            {toPersianDigits(greenCount)} نفر از {toPersianDigits(total)} داوطلب
          </p>
          <Progress value={greenPct} className="mt-3 h-1.5" indicatorClassName="bg-emerald-500" />
        </Card>

        <Card className="border-amber-500/30 bg-card p-5">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span>داوطلبان نیازمند مراقبت (وضعیت زرد)</span>
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-700 dark:text-amber-400 persian-nums">
            %{toPersianDigits(yellowPct)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 persian-nums">
            {toPersianDigits(yellowCount)} نفر از {toPersianDigits(total)} داوطلب
          </p>
          <Progress value={yellowPct} className="mt-3 h-1.5" indicatorClassName="bg-amber-500" />
        </Card>

        <Card className="border-rose-500/30 bg-card p-5">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span>داوطلبان در معرض بحران (وضعیت قرمز)</span>
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-500" />
          </div>
          <div className="text-3xl font-bold text-rose-600 dark:text-rose-500 persian-nums">
            %{toPersianDigits(redPct)}
          </div>
          <p className="text-xs text-muted-foreground mt-1 persian-nums">
            {toPersianDigits(redCount)} نفر (سکوت ارتباطی یا درخواست فوری)
          </p>
          <Progress value={redPct} className="mt-3 h-1.5" indicatorClassName="bg-rose-500" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mentor SLA Compliance Ranking & Load Balancing */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center space-x-2 space-x-reverse">
              <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>رتبه‌بندی پایبندی پشتیبان‌ها به توافق‌نامه سطح خدمات (SLA)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {mentors.map((m, idx) => (
              <div key={m.id} className="bg-muted/40 p-4 rounded-xl border border-border space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold persian-nums text-foreground">
                      {toPersianDigits(idx + 1)}
                    </span>
                    <span className="font-bold text-xs text-foreground">{m.name}</span>
                  </div>
                  <Badge variant="green" className="persian-nums text-xs">
                    %{toPersianDigits(m.slaCompliance)} پایبندی SLA
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                  <div className="bg-card p-2 rounded-lg border border-border">
                    <span className="text-muted-foreground block">ظرفیت فعال</span>
                    <span className="font-bold text-foreground persian-nums">
                      {toPersianDigits(m.activeStudents)} داوطلب
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded-lg border border-border">
                    <span className="text-muted-foreground block">حل شده در SLA</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
                      {toPersianDigits(m.resolvedInSla)} مورد
                    </span>
                  </div>
                  <div className="bg-card p-2 rounded-lg border border-border">
                    <span className="text-muted-foreground block">بحران باز (قرمز)</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 persian-nums">
                      {toPersianDigits(m.openCrisis)} داوطلب
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top-5 Systemic Candidate Obstacles Aggregator */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center space-x-2 space-x-reverse">
              <Layers className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <span>پرتکرارترین موانع و چالش‌های تحصیلی (Top 5 Systemic Obstacles)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {topObstacles.map((obs, index) => (
              <div key={obs.title} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">
                    {toPersianDigits(index + 1)}. {obs.title}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold persian-nums">
                    %{toPersianDigits(obs.pct)}
                  </span>
                </div>
                <Progress value={obs.pct} className="h-1.5" indicatorClassName="bg-amber-500" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
