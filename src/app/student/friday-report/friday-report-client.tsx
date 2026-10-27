"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Sparkles,
  HelpCircle,
  Lock,
  XCircle,
  Eye,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import {
  submitFridayReportAction,
  type SubmitFridayReportInput,
} from "@/server/actions/friday-report";
import type { FridayReportRecord } from "@/types/models";

interface FridayReportClientProps {
  initialReports: FridayReportRecord[];
  studentName: string;
  isFriday?: boolean;
  currentWeekNumber?: number;
  isAdmin?: boolean;
  persianWeekdayName?: string;
  persianDateStr?: string;
}

export function FridayReportClient({
  initialReports,
  studentName,
  isFriday = false,
  currentWeekNumber = 1,
  isAdmin = false,
  persianWeekdayName = "امروز",
  persianDateStr = "",
}: FridayReportClientProps) {
  const [reports, setReports] = useState<FridayReportRecord[]>(initialReports);
  const [activeTab, setActiveTab] = useState<"FORM" | "FEEDBACK">("FORM");
  const [weekNumber, setWeekNumber] = useState<number>(currentWeekNumber);
  const [selectedFeedbackReportId, setSelectedFeedbackReportId] = useState<string>(
    initialReports[0]?.id || ""
  );

  const [studyHoursCivil, setStudyHoursCivil] = useState<number>(12);
  const [studyHoursCriminal, setStudyHoursCriminal] = useState<number>(10);
  const [studyHoursTrade, setStudyHoursTrade] = useState<number>(8);
  const [studyHoursProcedure, setStudyHoursProcedure] = useState<number>(10);
  const [testsCount, setTestsCount] = useState<number>(180);
  const [weakPoints, setWeakPoints] = useState<string>("");
  const [strengths, setStrengths] = useState<string>("");
  const [studentNotes, setStudentNotes] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Sync form inputs when week changes
  useEffect(() => {
    const existing = reports.find((r) => r.weekNumber === weekNumber);
    if (existing) {
      setStudyHoursCivil(existing.studyHoursCivil);
      setStudyHoursCriminal(existing.studyHoursCriminal);
      setStudyHoursTrade(existing.studyHoursTrade);
      setStudyHoursProcedure(existing.studyHoursProcedure);
      setTestsCount(existing.testsCount);
      setWeakPoints(existing.weakPoints || "");
      setStrengths(existing.strengths || "");
      setStudentNotes(existing.studentNotes || "");
    }
  }, [weekNumber, reports]);

  const existingReportForSelectedWeek = reports.find((r) => r.weekNumber === weekNumber);

  // Check if form is locked:
  // 1. If not Friday (and not admin), can ONLY view, cannot submit
  // 2. If week < currentWeekNumber (past week), locked permanently at 23:59:59 Friday
  // 3. If report status is APPROVED, locked permanently
  const isPastWeekLocked = weekNumber < currentWeekNumber && !isAdmin;
  const isApprovedLocked = existingReportForSelectedWeek?.status === "APPROVED";
  const isNonFridayLocked = !isFriday && !isAdmin;
  const isFormLocked = isNonFridayLocked || isPastWeekLocked || isApprovedLocked;

  const totalCalculatedHours =
    Number(studyHoursCivil || 0) +
    Number(studyHoursCriminal || 0) +
    Number(studyHoursTrade || 0) +
    Number(studyHoursProcedure || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (isFormLocked) {
      setErrorMessage(
        isNonFridayLocked
          ? "ثبت گزارش خودارزیابی منحصراً در روزهای جمعه فعال است."
          : "این گزارش قفل شده و قابل تغییر نمی‌باشد."
      );
      return;
    }

    startTransition(async () => {
      const payload: SubmitFridayReportInput = {
        weekNumber,
        studyHoursCivil,
        studyHoursCriminal,
        studyHoursTrade,
        studyHoursProcedure,
        testsCount,
        weakPoints,
        strengths,
        studentNotes,
      };

      const res = await submitFridayReportAction(payload);
      if (res.success) {
        setStatusMessage(res.message);
        setReports((prev) => {
          const filtered = prev.filter((r) => r.weekNumber !== weekNumber);
          const newReport: FridayReportRecord = {
            id: res.reportId || `fr_${Date.now()}`,
            studentId: "self",
            weekNumber,
            studyHoursCivil,
            studyHoursCriminal,
            studyHoursTrade,
            studyHoursProcedure,
            totalHours: totalCalculatedHours,
            testsCount,
            weakPoints,
            strengths,
            studentNotes,
            status: "SUBMITTED",
            supervisorApproval: false,
            submittedAt: new Date(),
            updatedAt: new Date(),
          };
          const updated = [newReport, ...filtered].sort((a, b) => b.weekNumber - a.weekNumber);
          setSelectedFeedbackReportId(newReport.id);
          return updated;
        });
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const selectedFeedbackReport =
    reports.find((r) => r.id === selectedFeedbackReportId) || reports[0];

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-[#004071] to-[#002847] p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>پایش و ارزیابی هفتگی آمادگی آزمون وکالت</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            گزارش خودارزیابی جمعه
          </h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-xl">
            داوطلب گرامی {studentName}؛ ثبت منظم ساعات مطالعه دروس و تست‌های حل‌شده در پایان هر جمعه موجب ارزیابی دقیق پشتیبان و سرپرست، و تنظیم برنامه بهینه برای هفته آینده خواهد شد.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 text-center border border-white/10 shrink-0">
          <div className="text-xs text-blue-200">گزارش‌های ثبت‌شده شما</div>
          <div className="text-3xl font-black mt-1 text-white">
            {toPersianDigits(reports.length)} <span className="text-xs font-normal">هفته</span>
          </div>
        </div>
      </div>

      {/* Temporal Notice Alert: Friday active vs Non-Friday locked */}
      {!isFriday && !isAdmin ? (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <div className="font-bold text-sm">
              ثبت گزارش خودارزیابی منحصراً در روزهای جمعه فعال است.
            </div>
            <div>
              امروز <span className="font-bold">{persianWeekdayName}</span> {persianDateStr ? `(${persianDateStr})` : ""} است و سامانه در حالت مشاهده سوابق (Read-Only) قرار دارد. ثبت و ویرایش کارنامه خودارزیابی صرفاً در روزهای جمعه (از ساعت ۰۰:۰۰ الی ۲۳:۵۹ به وقت ایران) امکان‌پذیر است. شما می‌توانید گزارش‌های ثبت‌شده قبلی و بازخوردهای ارائه‌شده توسط پشتیبان علمی را از بخش «بازخورد و ارزیابی پشتیبان علمی» مطالعه فرمایید.
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3 text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs leading-relaxed">
            <div className="font-bold text-sm">
              درگاه ثبت خودارزیابی جمعه فعال است
            </div>
            <div>
              امروز جمعه {persianDateStr ? `(${persianDateStr})` : ""} است. لطفاً ساعات مطالعه دروس و تست‌های این هفته را به دقت وارد کرده و ثبت نهایی نمایید تا توسط پشتیبان و سرپرست آموزشی بررسی شود.
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("FORM")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "FORM"
              ? "border-[#004071] text-[#004071]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>ثبت کارنامه خودارزیابی جمعه</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("FEEDBACK")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "FEEDBACK"
              ? "border-[#004071] text-[#004071]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>بازخورد و ارزیابی پشتیبان علمی</span>
          {reports.some((r) => r.mentorFeedback) && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
          )}
        </button>
      </div>

      {/* TAB 1: FORM & HISTORY */}
      {activeTab === "FORM" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Form Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5 text-[#004071]" />
                    <span>کارنامه خودارزیابی هفته</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-muted-foreground">انتخاب هفته:</label>
                    <select
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(Number(e.target.value))}
                      className="h-8 px-2.5 rounded-lg border border-input bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-[#004071]"
                    >
                      {Array.from({ length: currentWeekNumber }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          هفته {toPersianDigits(i + 1)} {i + 1 === currentWeekNumber ? "(هفته جاری)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 pb-6 px-6">
                {isFormLocked && (
                  <div className="mb-6 rounded-xl bg-muted/60 border border-border p-3.5 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {isNonFridayLocked
                        ? "ثبت گزارش خودارزیابی منحصراً در روزهای جمعه فعال است. فرم در وضعیت فقط‌خواندنی است."
                        : isApprovedLocked
                        ? "این گزارش توسط سرپرست تأیید نهایی شده و قفل است."
                        : "گزارش این هفته پس از پایان مهلت جمعه قفل دائمی (Read-Only) شده است."}
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Subject Breakdown */}
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      ساعات مطالعه به تفکیک دروس آزمون وکالت:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Civil Law */}
                      <div className="rounded-xl border border-border p-3.5 bg-card space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-foreground">حقوق مدنی</label>
                          <span className="text-[11px] text-muted-foreground">ضریب ۳</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            disabled={isFormLocked}
                            value={studyHoursCivil}
                            onChange={(e) => setStudyHoursCivil(Number(e.target.value))}
                            className="w-full h-10 rounded-lg border border-input bg-background/50 pr-3 pl-12 text-sm font-bold text-foreground focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                            required
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                            ساعت
                          </span>
                        </div>
                      </div>

                      {/* Criminal Law */}
                      <div className="rounded-xl border border-border p-3.5 bg-card space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-foreground">حقوق جزا و آیین دادرسی کیفری</label>
                          <span className="text-[11px] text-muted-foreground">ضریب ۲</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            disabled={isFormLocked}
                            value={studyHoursCriminal}
                            onChange={(e) => setStudyHoursCriminal(Number(e.target.value))}
                            className="w-full h-10 rounded-lg border border-input bg-background/50 pr-3 pl-12 text-sm font-bold text-foreground focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                            required
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                            ساعت
                          </span>
                        </div>
                      </div>

                      {/* Trade / Commercial Law */}
                      <div className="rounded-xl border border-border p-3.5 bg-card space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-foreground">حقوق تجارت</label>
                          <span className="text-[11px] text-muted-foreground">ضریب ۲</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            disabled={isFormLocked}
                            value={studyHoursTrade}
                            onChange={(e) => setStudyHoursTrade(Number(e.target.value))}
                            className="w-full h-10 rounded-lg border border-input bg-background/50 pr-3 pl-12 text-sm font-bold text-foreground focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                            required
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                            ساعت
                          </span>
                        </div>
                      </div>

                      {/* Civil Procedure */}
                      <div className="rounded-xl border border-border p-3.5 bg-card space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-foreground">آیین دادرسی مدنی و متون فقه</label>
                          <span className="text-[11px] text-muted-foreground">ضریب ۳ و ۱</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={80}
                            disabled={isFormLocked}
                            value={studyHoursProcedure}
                            onChange={(e) => setStudyHoursProcedure(Number(e.target.value))}
                            className="w-full h-10 rounded-lg border border-input bg-background/50 pr-3 pl-12 text-sm font-bold text-foreground focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                            required
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                            ساعت
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KPI Summary Card */}
                  <div className="rounded-xl bg-muted/40 border border-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-[#004071]/10 text-[#004071] flex items-center justify-center font-bold">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">مجموع کل ساعات مطالعه هفتگی:</div>
                        <div className="text-lg font-black text-foreground">
                          {toPersianDigits(totalCalculatedHours)} ساعت مطالعه مفید
                        </div>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto">
                      <label className="text-xs font-bold text-foreground block mb-1">
                        تعداد تست‌های حل‌شده هفته:
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={2000}
                          disabled={isFormLocked}
                          value={testsCount}
                          onChange={(e) => setTestsCount(Number(e.target.value))}
                          className="w-full sm:w-36 h-10 rounded-lg border border-input bg-background pr-3 pl-12 text-sm font-black text-foreground focus:ring-2 focus:ring-[#004071] disabled:opacity-60"
                          required
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                          تست
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Qualitative Insights */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span>نقاط ضعف و مباحث دارای ابهام در آزمون‌های این هفته:</span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={isFormLocked}
                        value={weakPoints}
                        onChange={(e) => setWeakPoints(e.target.value)}
                        placeholder="مثال: در تست‌های عقد ضمان و خیارات حقوق مدنی نیازمند مرور ماده‌خوانی و تست تکمیلی هستم..."
                        className="w-full p-3 rounded-xl border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span>نقاط قوت و تسلط مبحثی این هفته:</span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={isFormLocked}
                        value={strengths}
                        onChange={(e) => setStrengths(e.target.value)}
                        placeholder="مثال: تسلط کامل بر بخش جرایم علیه اشخاص و پاسخگویی بالای ۸۰ درصد در آزمون آزمایشی..."
                        className="w-full p-3 rounded-xl border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                        <span>پیام یا درخواست ویژه از پشتیبان آموزشی:</span>
                      </label>
                      <textarea
                        rows={2}
                        disabled={isFormLocked}
                        value={studentNotes}
                        onChange={(e) => setStudentNotes(e.target.value)}
                        placeholder="یادداشت، سوال یا موضوعی که مایلید در جلسه تماس این هفته مورد تحلیل قرار گیرد..."
                        className="w-full p-3 rounded-xl border border-input bg-background/50 text-xs text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[#004071] focus:outline-hidden disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {statusMessage && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{statusMessage}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isPending || isFormLocked}
                    className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20 flex items-center justify-center gap-2 disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isFormLocked ? (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>
                          {isNonFridayLocked
                            ? "ثبت گزارش خودارزیابی منحصراً در روزهای جمعه فعال است"
                            : "گزارش این هفته قفل شده است (Read-Only)"}
                        </span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        <span>{isPending ? "در حال ثبت خودارزیابی..." : `ثبت و ارسال گزارش جمعه هفته ${toPersianDigits(weekNumber)}`}</span>
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Previous Reports History Column (1 Col) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#004071]" />
              <span>سوابق خودارزیابی و بازخوردها</span>
            </h2>

            {reports.length === 0 ? (
              <Card className="border-dashed border-2 border-border p-8 text-center text-muted-foreground rounded-2xl">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium">تاکنون گزارشی برای روزهای جمعه ثبت نشده است.</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">اولین گزارش خود را در روز جمعه ثبت نمایید.</p>
              </Card>
            ) : (
              reports.map((report) => (
                <Card
                  key={report.id}
                  className="border-border bg-card shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedFeedbackReportId(report.id);
                    setActiveTab("FEEDBACK");
                  }}
                >
                  <CardHeader className="p-3.5 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold text-xs bg-background">
                        هفته {toPersianDigits(report.weekNumber)}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {toPersianDigits(report.totalHours)} ساعت
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {report.status === "APPROVED" || report.supervisorApproval ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-1.5 py-0.5">
                          <ShieldCheck className="h-3 w-3" />
                          <span>تأیید شده</span>
                        </Badge>
                      ) : report.status === "REJECTED" ? (
                        <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0.5">
                          <XCircle className="h-3 w-3" />
                          <span>نیازمند بازنگری</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          در انتظار بررسی
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-3.5 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg">
                      <div>مدنی: <strong className="text-foreground">{toPersianDigits(report.studyHoursCivil)} س</strong></div>
                      <div>جزا: <strong className="text-foreground">{toPersianDigits(report.studyHoursCriminal)} س</strong></div>
                      <div>تجارت: <strong className="text-foreground">{toPersianDigits(report.studyHoursTrade)} س</strong></div>
                      <div>دادرسی: <strong className="text-foreground">{toPersianDigits(report.studyHoursProcedure)} س</strong></div>
                      <div className="col-span-2 pt-1 border-t border-border/50 text-[#004071] font-bold">
                        مجموع تست‌ها: {toPersianDigits(report.testsCount)} تست
                      </div>
                    </div>

                    {report.mentorFeedback ? (
                      <div className="rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-2.5 space-y-1">
                        <div className="text-[11px] font-bold text-[#004071] dark:text-blue-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>بازخورد پشتیبان علمی:</span>
                          </span>
                          <span className="text-[10px] text-blue-500 underline flex items-center gap-0.5">
                            <Eye className="h-3 w-3" />
                            <span>مشاهده</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground leading-relaxed line-clamp-2">
                          {report.mentorFeedback}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                        <HelpCircle className="h-3 w-3" />
                        <span>پشتیبان هنوز بازخورد ثبت نکرده است.</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED FEEDBACK CARD */}
      {activeTab === "FEEDBACK" && (
        <div className="space-y-6">
          {/* Week Selector Chips */}
          <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-3 rounded-2xl border border-border">
            <span className="text-xs font-bold text-muted-foreground ps-2">انتخاب گزارش هفته:</span>
            {reports.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedFeedbackReportId(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedFeedbackReport?.id === r.id
                    ? "bg-[#004071] text-white shadow-sm"
                    : "bg-background border border-border hover:border-[#004071]/50 text-foreground"
                }`}
              >
                <span>جمعه هفته {toPersianDigits(r.weekNumber)}</span>
                {r.status === "APPROVED" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                {r.status === "REJECTED" && <XCircle className="h-3 w-3 text-rose-400" />}
              </button>
            ))}
          </div>

          {selectedFeedbackReport ? (
            <Card className="border-border shadow-xl rounded-2xl overflow-hidden bg-card">
              <CardHeader className="bg-gradient-to-l from-[#004071]/10 via-[#004071]/5 to-transparent border-b border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#004071] mb-1">
                    ارزیابی و تحلیل عملکرد هفتگی داوطلب
                  </div>
                  <CardTitle className="text-lg font-black text-foreground">
                    بازخورد و ارزیابی پشتیبان علمی برای جمعه هفته {toPersianDigits(selectedFeedbackReport.weekNumber)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ثبت شده در تاریخ {new Date(selectedFeedbackReport.submittedAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedFeedbackReport.status === "APPROVED" || selectedFeedbackReport.supervisorApproval ? (
                    <Badge className="bg-emerald-600 text-white text-xs gap-1.5 px-3 py-1.5 font-bold shadow-sm">
                      <ShieldCheck className="h-4 w-4" />
                      <span>تأیید گزارش خودارزیابی</span>
                    </Badge>
                  ) : selectedFeedbackReport.status === "REJECTED" ? (
                    <Badge variant="destructive" className="text-xs gap-1.5 px-3 py-1.5 font-bold shadow-sm">
                      <XCircle className="h-4 w-4" />
                      <span>رد گزارش و نیازمند بازنگری</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 font-bold px-3 py-1.5">
                      در انتظار بررسی پشتیبان علمی
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                    <div className="text-[11px] text-muted-foreground">کل ساعت مطالعه</div>
                    <div className="text-base font-black text-foreground mt-0.5">
                      {toPersianDigits(selectedFeedbackReport.totalHours)} ساعت
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                    <div className="text-[11px] text-muted-foreground">تست‌های حل‌شده</div>
                    <div className="text-base font-black text-foreground mt-0.5">
                      {toPersianDigits(selectedFeedbackReport.testsCount)} تست
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                    <div className="text-[11px] text-muted-foreground">حقوق مدنی</div>
                    <div className="text-base font-black text-foreground mt-0.5">
                      {toPersianDigits(selectedFeedbackReport.studyHoursCivil)} ساعت
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                    <div className="text-[11px] text-muted-foreground">حقوق جزا</div>
                    <div className="text-base font-black text-foreground mt-0.5">
                      {toPersianDigits(selectedFeedbackReport.studyHoursCriminal)} ساعت
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 border border-border text-center">
                    <div className="text-[11px] text-muted-foreground">تجارت و دادرسی</div>
                    <div className="text-base font-black text-foreground mt-0.5">
                      {toPersianDigits(selectedFeedbackReport.studyHoursTrade + selectedFeedbackReport.studyHoursProcedure)} ساعت
                    </div>
                  </div>
                </div>

                {/* Mentor Feedback Written Section */}
                <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-[#004071] dark:text-blue-300 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-[#004071]" />
                      <span>رهنمود و بازخورد تفصیلی پشتیبان آموزشی</span>
                    </div>
                    {selectedFeedbackReport.mentorReviewedAt && (
                      <span className="text-[11px] text-muted-foreground">
                        تاریخ بررسی: {new Date(selectedFeedbackReport.mentorReviewedAt).toLocaleDateString("fa-IR")}
                      </span>
                    )}
                  </div>

                  {selectedFeedbackReport.mentorFeedback ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line font-medium bg-background/60 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                      {selectedFeedbackReport.mentorFeedback}
                    </p>
                  ) : (
                    <div className="text-xs text-muted-foreground italic p-4 bg-background/40 rounded-xl border border-dashed border-border flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <span>
                        گزارش این هفته در صف بررسی پشتیبان علمی قرار دارد و به محض ثبت رهنمود، نتیجه در این قسمت قابل رویت خواهد بود.
                      </span>
                    </div>
                  )}
                </div>

                {/* Supervisor Notes if available */}
                {selectedFeedbackReport.supervisorNotes && (
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 space-y-2">
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>ملاحظات نظارتی سرپرست آموزشی مؤسسه</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed bg-background/50 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      {selectedFeedbackReport.supervisorNotes}
                    </p>
                  </div>
                )}

                {/* Student's Own Notes Review */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <div className="font-bold text-muted-foreground">چالش‌ها و نقاط ضعف ثبت‌شده توسط شما:</div>
                    <p className="text-foreground leading-relaxed">
                      {selectedFeedbackReport.weakPoints || "موردی ثبت نکرده‌اید."}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-1">
                    <div className="font-bold text-muted-foreground">نقاط قوت و تسلط مبحثی این هفته:</div>
                    <p className="text-foreground leading-relaxed">
                      {selectedFeedbackReport.strengths || "موردی ثبت نکرده‌اید."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-2 border-border p-12 text-center text-muted-foreground rounded-2xl">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-bold">هیچ گزارشی جهت نمایش بازخورد ثبت نشده است.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                برای هفته جاری گزارش خود را در روز جمعه ثبت نمایید.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
