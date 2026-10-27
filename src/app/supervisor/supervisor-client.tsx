"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Filter,
  FileSpreadsheet,
  ClipboardCheck,
  CalendarCheck,
  ShieldAlert,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";
import { BulkExcelImport } from "@/components/supervisor/bulk-excel-import";
import type { StudentProfileRecord } from "@/types/models";

interface SupervisorClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  initialStudents: Array<{
    id: string;
    riskStatus: "GREEN" | "YELLOW" | "RED";
    enrolledCourseName?: string | null;
    enrolledCourseCode?: string | null;
    mentorId?: string | null;
  }>;
  mentors: Array<{
    id: string;
    name: string;
    activeStudents: number;
    resolvedInSla: number;
    totalTriggers: number;
    slaCompliance: number;
    openCrisis: number;
  }>;
  mentorsList: Array<{ id: string; fullName: string }>;
  topObstacles: Array<{ title: string; count: number; pct: number }>;
}

export function SupervisorDashboardClient({
  currentUser,
  initialStudents,
  mentors,
  mentorsList,
  topObstacles,
}: SupervisorClientProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [showBulkExcel, setShowBulkExcel] = useState<boolean>(false);

  // Extract unique courses
  const uniqueCourses = Array.from(
    new Set(
      initialStudents
        .map((s) => s.enrolledCourseName)
        .filter((c): c is string => Boolean(c))
    )
  );

  // Filter students by selected course
  const filteredStudents = initialStudents.filter((s) => {
    if (selectedCourse === "ALL") return true;
    return s.enrolledCourseName === selectedCourse;
  });

  const total = filteredStudents.length || 0;
  const greenCount = filteredStudents.filter((s) => s.riskStatus === "GREEN").length;
  const yellowCount = filteredStudents.filter((s) => s.riskStatus === "YELLOW").length;
  const redCount = filteredStudents.filter((s) => s.riskStatus === "RED").length;

  const greenPct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
  const yellowPct = total > 0 ? Math.round((yellowCount / total) * 100) : 0;
  const redPct = total > 0 ? Math.round((redCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center space-x-2 space-x-reverse">
            <BarChart3 className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            <span>داشبورد نظارت آموزشی مشاهیر دانش</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            سامانه هدایت تحصیلی آزمون وکالت • پایش عملکرد مؤسسه مشاهیر دانش
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkExcel(!showBulkExcel)}
            className="flex items-center gap-1.5 text-xs h-9 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{showBulkExcel ? "بستن فرم اکسل" : "ورود داوطلبان با اکسل"}</span>
          </Button>

          <Link href="/tasks">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs h-9">
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
              <span>کارتابل تأیید وظایف</span>
            </Button>
          </Link>

          <Link href="/mentor/friday-reports">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs h-9">
              <CalendarCheck className="h-4 w-4 text-primary" />
              <span>گزارشات خودارزیابی جمعه</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Course Categorization & Filtering Dropdown (Requirement 6) */}
      <div className="bg-card border border-border p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">فیلتر بر اساس دوره آموزشی:</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground font-medium focus:ring-1 focus:ring-primary w-full sm:w-80"
          >
            <option value="ALL">همه دوره‌های آموزشی مشاهیر ({toPersianDigits(initialStudents.length)} داوطلب)</option>
            {uniqueCourses.map((cName) => {
              const count = initialStudents.filter((s) => s.enrolledCourseName === cName).length;
              return (
                <option key={cName} value={cName}>
                  {cName} ({toPersianDigits(count)} داوطلب)
                </option>
              );
            })}
          </select>
          {selectedCourse !== "ALL" && (
            <button
              onClick={() => setSelectedCourse("ALL")}
              className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
            >
              پاک‌کردن فیلتر
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Bulk Excel Ingestion (Requirement 7) */}
      {showBulkExcel && (
        <BulkExcelImport
          mentorsList={mentorsList}
          title="ورود دسته‌جمعی داوطلبان به لیست سفید سرپرستی (اکسل / CSV)"
        />
      )}

      {/* High-Level Cohort Health Matrix (Strictly 3 Separated Blocks for Green, Yellow, Red) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Green: Stable */}
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              داوطلبان سبز (پایدار)
            </span>
            <Badge variant="green" className="persian-nums">{toPersianDigits(greenPct)}%</Badge>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 persian-nums">
            {toPersianDigits(greenCount)}{" "}
            <span className="text-xs font-normal text-muted-foreground">داوطلب</span>
          </div>
          <Progress value={greenPct} className="mt-2 h-1.5" indicatorClassName="bg-emerald-500" />
        </Card>

        {/* Yellow: Attention Needed */}
        <Card className="border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              داوطلبان زرد (نیازمند توجه)
            </span>
            <Badge variant="yellow" className="persian-nums">{toPersianDigits(yellowPct)}%</Badge>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 persian-nums">
            {toPersianDigits(yellowCount)}{" "}
            <span className="text-xs font-normal text-muted-foreground">داوطلب</span>
          </div>
          <Progress value={yellowPct} className="mt-2 h-1.5" indicatorClassName="bg-amber-500" />
        </Card>

        {/* Red: Critical */}
        <Card className="border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
              داوطلبان قرمز (بحرانی)
            </span>
            <Badge variant="red" className="persian-nums">{toPersianDigits(redPct)}%</Badge>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 persian-nums">
            {toPersianDigits(redCount)}{" "}
            <span className="text-xs font-normal text-muted-foreground">داوطلب</span>
          </div>
          <Progress value={redPct} className="mt-2 h-1.5" indicatorClassName="bg-rose-500" />
        </Card>
      </div>

      {/* Multi-Horizon 5-Level Progress Gantt Chart */}
      <MultiHorizonGantt
        entityType="SUPERVISOR"
        entityName={currentUser.fullName}
      />

      {/* Grid: Mentor Performance & Systemic Obstacles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mentor Performance Matrix */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                پایش عملکرد پشتیبانان و پایبندی به زمان‌بندی پاسخگویی
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {mentors.map((mentor) => (
              <div
                key={mentor.id}
                className="p-3 rounded-xl border border-border bg-muted/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-foreground">{mentor.name}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      داوطلبان تحت سرپرستی: {toPersianDigits(mentor.activeStudents)} نفر
                    </p>
                  </div>
                  <Badge variant={mentor.slaCompliance >= 90 ? "green" : "yellow"}>
                    ٪{toPersianDigits(mentor.slaCompliance)} تعهد زمانی
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">مداخله‌های موفق</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
                      {toPersianDigits(mentor.resolvedInSla)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">کل هشدارها</span>
                    <span className="font-bold text-foreground persian-nums">
                      {toPersianDigits(mentor.totalTriggers)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] text-muted-foreground block">بحران‌های باز</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 persian-nums">
                      {toPersianDigits(mentor.openCrisis)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top-5 Systemic Obstacles */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center space-x-2 space-x-reverse">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                ۵ مانع ساختاری تکرارشونده در داوطلبان (تحلیل ریشه‌ای)
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {topObstacles.map((obstacle, index) => (
              <div key={obstacle.title} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {toPersianDigits(index + 1)}. {obstacle.title}
                  </span>
                  <span className="text-muted-foreground persian-nums text-[11px]">
                    {toPersianDigits(obstacle.count)} داوطلب ({toPersianDigits(obstacle.pct)}%)
                  </span>
                </div>
                <Progress
                  value={obstacle.pct}
                  className="h-1.5"
                  indicatorClassName={
                    index === 0
                      ? "bg-rose-500"
                      : index === 1
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
