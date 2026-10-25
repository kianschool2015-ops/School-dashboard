"use client";

import React, { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Loader2,
  Search,
  Filter,
  User,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import {
  reviewFridayReportAction,
  submitMentorFeedbackAction,
  submitSupervisorApprovalAction,
} from "@/server/actions/friday-report";

export interface FridayReportWithStudent {
  id: string;
  studentId: string;
  studentProfileId?: string | null;
  cohortId?: string | null;
  weekNumber: number;
  studyHoursCivil: number;
  studyHoursCriminal: number;
  studyHoursTrade: number;
  studyHoursProcedure: number;
  totalHours: number;
  testsCount: number;
  weakPoints?: string | null;
  strengths?: string | null;
  studentNotes?: string | null;
  status?: "SUBMITTED" | "APPROVED" | "REJECTED" | null;
  mentorFeedback?: string | null;
  mentorReviewedAt?: Date | null;
  supervisorApproval: boolean;
  supervisorNotes?: string | null;
  supervisorApprovedAt?: Date | null;
  submittedAt: Date;
  studentName: string;
  studentPhone: string;
  nationalId: string;
  mentorName: string;
  courseName: string;
}

interface FridayReportsReviewClientProps {
  initialReports: FridayReportWithStudent[];
  userRole: string;
  currentUserId: string;
  currentUserName: string;
}

export function FridayReportsReviewClient({
  initialReports,
  userRole,
  currentUserId,
  currentUserName,
}: FridayReportsReviewClientProps) {
  const [reports, setReports] = useState<FridayReportWithStudent[]>(initialReports);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWeek, setSelectedWeek] = useState<string>("ALL");
  const [approvalFilter, setApprovalFilter] = useState<string>("ALL");

  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [supervisorNotesText, setSupervisorNotesText] = useState("");

  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isSupervisorOrAdmin = ["SUPERVISOR", "CEO", "ADMIN"].includes(userRole);

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentPhone.includes(searchQuery) ||
      r.nationalId.includes(searchQuery) ||
      r.courseName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWeek = selectedWeek === "ALL" || r.weekNumber.toString() === selectedWeek;

    const matchesApproval =
      approvalFilter === "ALL" ||
      (approvalFilter === "APPROVED" && (r.status === "APPROVED" || r.supervisorApproval)) ||
      (approvalFilter === "REJECTED" && r.status === "REJECTED") ||
      (approvalFilter === "PENDING_APPROVAL" && r.status !== "APPROVED" && !r.supervisorApproval) ||
      (approvalFilter === "NO_FEEDBACK" && !r.mentorFeedback);

    return matchesSearch && matchesWeek && matchesApproval;
  });

  const handleOpenFeedback = (report: FridayReportWithStudent) => {
    setActiveReportId(report.id);
    setFeedbackText(report.mentorFeedback || "");
    setSupervisorNotesText(report.supervisorNotes || "");
    setActionMessage("");
    setErrorMessage("");
  };

  const handleReviewReport = (reportId: string, status: "APPROVED" | "REJECTED") => {
    setErrorMessage("");
    setActionMessage("");

    startTransition(async () => {
      const res = await reviewFridayReportAction({
        reportId,
        status,
        feedback: feedbackText,
        supervisorNotes: supervisorNotesText,
      });

      if (res.success) {
        setActionMessage(res.message);
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status,
                  mentorFeedback: feedbackText || r.mentorFeedback,
                  mentorReviewedAt: new Date(),
                  supervisorApproval: status === "APPROVED",
                  supervisorNotes: supervisorNotesText || r.supervisorNotes,
                  supervisorApprovedAt: new Date(),
                }
              : r
          )
        );
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const handleSaveFeedback = (reportId: string) => {
    if (!feedbackText.trim()) return;
    setErrorMessage("");
    setActionMessage("");

    startTransition(async () => {
      const res = await submitMentorFeedbackAction(reportId, feedbackText);
      if (res.success) {
        setActionMessage(res.message);
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? { ...r, mentorFeedback: feedbackText, mentorReviewedAt: new Date() }
              : r
          )
        );
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const handleToggleSupervisorApproval = (reportId: string, currentStatus: boolean) => {
    setErrorMessage("");
    setActionMessage("");

    startTransition(async () => {
      const newStatus = !currentStatus;
      const res = await submitSupervisorApprovalAction(reportId, newStatus, supervisorNotesText);
      if (res.success) {
        setActionMessage(res.message);
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  supervisorApproval: newStatus,
                  supervisorNotes: supervisorNotesText || r.supervisorNotes,
                  supervisorApprovedAt: new Date(),
                }
              : r
          )
        );
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  // KPIs
  const totalCount = reports.length;
  const approvedCount = reports.filter((r) => r.supervisorApproval).length;
  const pendingFeedbackCount = reports.filter((r) => !r.mentorFeedback).length;
  const pendingApprovalCount = reports.filter((r) => !r.supervisorApproval).length;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-[#004071] to-[#002847] p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>نظارت، بررسی و ثبت بازخورد پشتیبانان و سرپرستان</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            کارتابل گزارشات خودارزیابی جمعه
          </h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-xl">
            بررسی عملکرد هفتگی، تحلیل ساعات مطالعه دروس پایه آزمون وکالت، ارائه توصیه‌های علمی و تأیید نظارتی روند رشد داوطلبان.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 min-w-24">
            <div className="text-[11px] text-blue-200">کل گزارش‌ها</div>
            <div className="text-2xl font-black mt-0.5 text-white">{toPersianDigits(totalCount)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 min-w-24">
            <div className="text-[11px] text-amber-200">نیازمند بازخورد</div>
            <div className="text-2xl font-black mt-0.5 text-amber-300">{toPersianDigits(pendingFeedbackCount)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-center border border-white/10 min-w-24">
            <div className="text-[11px] text-emerald-200">تأییدشده سرپرست</div>
            <div className="text-2xl font-black mt-0.5 text-emerald-300">{toPersianDigits(approvedCount)}</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="border-border shadow-xs rounded-2xl bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس نام داوطلب، شماره موبایل یا دوره..."
              className="w-full h-10 pr-10 pl-3.5 rounded-xl border border-input bg-background/50 text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[#004071] focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            {/* Week Filter */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>هفته:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-[#004071]"
              >
                <option value="ALL">همه هفته‌ها</option>
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>
                    هفته {toPersianDigits(i + 1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>وضعیت:</span>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-[#004071]"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="NO_FEEDBACK">نیازمند بازخورد پشتیبان</option>
                <option value="PENDING_APPROVAL">در انتظار بررسی</option>
                <option value="APPROVED">تأییدشده</option>
                <option value="REJECTED">ردشده / نیازمند بازنگری</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card className="border-dashed border-2 border-border p-12 text-center text-muted-foreground rounded-2xl">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-bold">هیچ گزارش خودارزیابی یافت نشد.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              با تغییر فیلترها یا جستجوی نام داوطلب مجدداً بررسی فرمایید.
            </p>
          </Card>
        ) : (
          filteredReports.map((report) => {
            const isEditing = activeReportId === report.id;

            return (
              <Card
                key={report.id}
                className="border-border bg-card shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardHeader className="p-4 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#004071]/10 text-[#004071] flex items-center justify-center font-bold shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{report.studentName}</span>
                        <Badge variant="outline" className="font-bold text-xs bg-background">
                          هفته {toPersianDigits(report.weekNumber)}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{report.studentPhone}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          <span>{report.courseName}</span>
                        </span>
                        <span>•</span>
                        <span>پشتیبان: {report.mentorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.status === "APPROVED" || report.supervisorApproval ? (
                      <Badge className="bg-emerald-600 text-white text-xs gap-1 px-2.5 py-1 font-bold">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>تأیید خودارزیابی</span>
                      </Badge>
                    ) : report.status === "REJECTED" ? (
                      <Badge variant="destructive" className="text-xs gap-1 px-2.5 py-1 font-bold">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>رد و نیازمند بازنگری</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 font-medium">
                        در انتظار بررسی
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFeedback(report)}
                      className="text-xs font-bold gap-1.5 h-8 border-[#004071]/30 hover:bg-[#004071]/10 text-[#004071]"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{report.mentorFeedback ? "مشاهده / ویرایش بازخورد" : "ثبت بازخورد آموزشی"}</span>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Hours and Tests Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
                    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                      <div className="text-[10px] text-muted-foreground font-bold">حقوق مدنی</div>
                      <div className="text-sm font-black text-foreground mt-0.5">
                        {toPersianDigits(report.studyHoursCivil)} <span className="text-[10px] font-normal">ساعت</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                      <div className="text-[10px] text-muted-foreground font-bold">حقوق جزا</div>
                      <div className="text-sm font-black text-foreground mt-0.5">
                        {toPersianDigits(report.studyHoursCriminal)} <span className="text-[10px] font-normal">ساعت</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                      <div className="text-[10px] text-muted-foreground font-bold">حقوق تجارت</div>
                      <div className="text-sm font-black text-foreground mt-0.5">
                        {toPersianDigits(report.studyHoursTrade)} <span className="text-[10px] font-normal">ساعت</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
                      <div className="text-[10px] text-muted-foreground font-bold">آیین دادرسی</div>
                      <div className="text-sm font-black text-foreground mt-0.5">
                        {toPersianDigits(report.studyHoursProcedure)} <span className="text-[10px] font-normal">ساعت</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#004071]/20 bg-[#004071]/5 p-2.5">
                      <div className="text-[10px] text-[#004071] font-bold">مجموع کل ساعات</div>
                      <div className="text-sm font-black text-[#004071] mt-0.5">
                        {toPersianDigits(report.totalHours)} <span className="text-[10px] font-normal">ساعت</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">تست‌های حل‌شده</div>
                      <div className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {toPersianDigits(report.testsCount)} <span className="text-[10px] font-normal">تست</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Qualitative Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1">
                      <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 text-[11px]">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>نقاط ضعف و چالش‌ها:</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        {report.weakPoints || "موردی ثبت نشده است."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>نقاط قوت و تسلط‌ها:</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        {report.strengths || "موردی ثبت نشده است."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-1">
                      <div className="font-bold text-[#004071] dark:text-blue-300 flex items-center gap-1 text-[11px]">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>پیام و درخواست داوطلب:</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        {report.studentNotes || "پیامی ثبت نشده است."}
                      </p>
                    </div>
                  </div>

                  {/* Existing Mentor Feedback Display */}
                  {report.mentorFeedback && !isEditing && (
                    <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3.5 space-y-1.5">
                      <div className="text-xs font-bold text-[#004071] dark:text-blue-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4" />
                          <span>بازخورد آموزشی پشتیبان ({report.mentorName}):</span>
                        </span>
                        {report.mentorReviewedAt && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ثبت شده در تاریخ {new Date(report.mentorReviewedAt).toLocaleDateString("fa-IR")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{report.mentorFeedback}</p>
                    </div>
                  )}

                  {/* Inline Feedback / Approval Editor */}
                  {isEditing && (
                    <div className="rounded-xl border-2 border-[#004071]/40 bg-muted/30 p-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground block">
                          ثبت یا به‌روزرسانی بازخورد آموزشی پشتیبان:
                        </label>
                        <textarea
                          rows={3}
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="تحلیل علمی برنامه داوطلب، راهکارهای حل چالش‌های این هفته و اصلاح ساعات مطالعه..."
                          className="w-full p-3 rounded-xl border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-[#004071]"
                        />
                      </div>

                      {/* Supervisor Notes & Approval Toggle (Only for Supervisor/Admin) */}
                      {isSupervisorOrAdmin && (
                        <div className="pt-3 border-t border-border space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-foreground block">
                              یادداشت نظارتی سرپرست:
                            </label>
                            <input
                              type="text"
                              value={supervisorNotesText}
                              onChange={(e) => setSupervisorNotesText(e.target.value)}
                              placeholder="ملاحظات نظارتی درباره عملکرد پشتیبان یا داوطلب..."
                              className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              وضعیت تأییدیه نظارتی سرپرستی:
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant={report.supervisorApproval ? "destructive" : "default"}
                              disabled={isPending}
                              onClick={() => handleToggleSupervisorApproval(report.id, report.supervisorApproval)}
                              className="text-xs font-bold h-8"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              {report.supervisorApproval ? "لغو تأیید سرپرستی" : "ثبت تأیید نظارتی سرپرست"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {actionMessage && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>{actionMessage}</span>
                        </div>
                      )}

                      {errorMessage && (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleReviewReport(report.id, "APPROVED")}
                            className="text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                          >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            <span>تأیید گزارش خودارزیابی</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={isPending}
                            onClick={() => handleReviewReport(report.id, "REJECTED")}
                            className="text-xs font-bold h-9 gap-1.5 shadow-sm"
                          >
                            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            <span>رد گزارش و درخواست بازنگری</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveReportId(null)}
                            className="text-xs h-8"
                          >
                            بستن
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending || !feedbackText.trim()}
                            onClick={() => handleSaveFeedback(report.id)}
                            className="text-xs font-bold h-8 border-[#004071]/30 hover:bg-[#004071]/10 text-[#004071]"
                          >
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />}
                            ذخیره پیش‌نویس بازخورد
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
