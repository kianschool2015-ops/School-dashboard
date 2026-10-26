"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Scale,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BookOpen,
  FileText,
  TrendingUp,
  User,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";
import { getStudentExamResultAction } from "@/server/actions/exams";
import type { ExamRecord, SubjectBreakdownItem } from "@/types/models";
import { LongitudinalScoreChart } from "@/components/analytics/longitudinal-score-chart";

export interface ExamItem {
  exam: ExamRecord;
  status: string;
  submission: {
    id: string;
    status: string;
    submittedAt?: Date | string | null;
    publishedAt?: Date | string | null;
    scoreHidden: boolean;
    totalPercentage: number | null;
    correctCount: number | null;
    incorrectCount: number | null;
    unansweredCount: number | null;
    subjectBreakdown: SubjectBreakdownItem[];
    mentorNotes?: string | null;
  } | null;
}

export interface LongitudinalItem {
  submissionId: string;
  examId: string;
  examTitle: string;
  examCategory: string;
  submittedAt?: Date | string | null;
  publishedAt?: Date | string | null;
  totalPercentage: number;
  deltaFromBaseline: number;
  deltaFromPrevious: number;
  subjectBreakdown: SubjectBreakdownItem[];
  mentorNotes?: string | null;
}

export interface StudentExamsOverviewData {
  success: boolean;
  mentorName: string;
  exams: ExamItem[];
  longitudinalHistory: LongitudinalItem[];
  message?: string;
}

export interface StudentExamsClientProps {
  initialData: StudentExamsOverviewData;
  initialViewResultId?: string;
  userName: string;
}

export function StudentExamsClient({
  initialData,
  initialViewResultId,
  userName,
}: StudentExamsClientProps) {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "COMPLETED" | "LONGITUDINAL">("ACTIVE");
  const [selectedExamId, setSelectedExamId] = useState<string | null>(initialViewResultId || null);

  // Expanded detailed answer key modal/drawer
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailedResult, setDetailedResult] = useState<{
    examTitle: string;
    questions: Array<{
      id: string;
      questionNumber: number;
      subject: string;
      questionText: string;
      options: Array<{ id: number; text: string }>;
      correctOption: number;
      explanation?: string | null;
    }>;
    answers: Record<string, number>;
  } | null>(null);

  const { exams, longitudinalHistory, mentorName } = initialData;

  const activeExams = exams.filter((e) => e.status === "NOT_STARTED");
  const completedExams = exams.filter((e) => e.status !== "NOT_STARTED");
  const pendingCount = completedExams.filter((e) => e.status === "AUTO_GRADED_PENDING_MENTOR").length;
  const publishedCount = completedExams.filter((e) => e.status === "PUBLISHED_TO_STUDENT").length;

  // Compute summary stats
  const latestPublished = longitudinalHistory[longitudinalHistory.length - 1];
  const baselinePublished = longitudinalHistory[0];
  const overallDeltaFromBaseline = latestPublished && baselinePublished
    ? Number((latestPublished.totalPercentage - baselinePublished.totalPercentage).toFixed(1))
    : 0;

  const handleOpenDetailedResult = async (examId: string) => {
    setSelectedExamId(examId);
    setDetailLoading(true);
    try {
      const res = await getStudentExamResultAction(examId);
      if (res && res.isPublished && res.questions) {
        setDetailedResult({
          examTitle: res.exam.title,
          questions: res.questions,
          answers: (res.submission.answers as Record<string, number>) || {},
        });
      } else {
        setDetailedResult(null);
      }
    } catch {
      setDetailedResult(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Scale className="h-6 w-6 text-[#004071]" />
            <span>سامانه آزمون‌های آنلاین و کارنامه داوطلب</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            شبیه‌ساز استاندارد آزمون وکالت با محاسبه هوشمند نمره منفی یک‌سوم و تحلیل طولی تراز
          </p>
        </div>

        {/* Assigned Mentor Badge */}
        <div className="flex items-center gap-2.5 bg-muted/40 border border-border px-3.5 py-2 rounded-xl">
          <User className="h-4 w-4 text-amber-500" />
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">پشتیبان علمی اختصاصی شما</span>
            <span className="text-xs font-bold text-foreground">{mentorName}</span>
          </div>
        </div>
      </div>

      {/* KPI Overview Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">آزمون‌های شرکت کرده</span>
              <strong className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                {toPersianDigits(completedExams.length)} آزمون
              </strong>
            </div>
            <Award className="h-8 w-8 text-[#004071] opacity-70" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">آخرین تراز نهایی (با نمره منفی)</span>
              <strong className="text-lg font-bold font-mono text-emerald-500 mt-0.5 block">
                {latestPublished ? `${toPersianDigits(latestPublished.totalPercentage.toFixed(1))}٪` : "---"}
              </strong>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-500 opacity-70" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">رشد از آزمون پایه</span>
              <div className="flex items-center gap-1 mt-0.5">
                {overallDeltaFromBaseline >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                )}
                <strong
                  className={`text-lg font-bold font-mono ${
                    overallDeltaFromBaseline >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {toPersianDigits(Math.abs(overallDeltaFromBaseline).toFixed(1))}٪
                </strong>
              </div>
            </div>
            <Sparkles className="h-8 w-8 text-amber-500 opacity-70" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">در انتظار تایید پشتیبان</span>
              <strong className="text-lg font-bold font-mono text-amber-500 mt-0.5 block">
                {toPersianDigits(pendingCount)} کارنامه
              </strong>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* Main Tab Controls */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "ACTIVE"
              ? "bg-[#004071] text-white shadow-xs"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>آزمون‌های پیش رو و فعال ({toPersianDigits(activeExams.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "COMPLETED"
              ? "bg-[#004071] text-white shadow-xs"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>کارنامه‌ها و نتایج تفکیکی ({toPersianDigits(completedExams.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("LONGITUDINAL")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "LONGITUDINAL"
              ? "bg-[#004071] text-white shadow-xs"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>روند رشد طولی و پیشرفت تراز ({toPersianDigits(longitudinalHistory.length)})</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE & AVAILABLE EXAMS */}
      {activeTab === "ACTIVE" && (
        <div className="space-y-4">
          {activeExams.length === 0 ? (
            <Card className="border-border bg-card p-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-foreground">در حال حاضر آزمون فعالی تعریف نشده است</h3>
              <p className="text-xs text-muted-foreground mt-1">
                آزمون‌های جدید طبق تقویم آموزشی مشاهیر به صورت هفتگی توسط اساتید و پشتیبانان بارگذاری می‌گردد.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeExams.map(({ exam }) => (
                <Card key={exam.id} className="border-border bg-card hover:border-[#004071]/50 transition-all shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                        {exam.courseCode || "BAR-360"}
                      </Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]">
                        آماده برگزاری آنلاین
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground mt-2">
                      {exam.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs bg-muted/20 p-2.5 rounded-xl border border-border">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">تعداد سؤال</span>
                        <strong className="font-mono text-foreground font-bold mt-0.5 block">
                          {toPersianDigits(exam.totalQuestions)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">مدت زمان</span>
                        <strong className="font-mono text-foreground font-bold mt-0.5 block">
                          {toPersianDigits(exam.durationMinutes)} دقیقه
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">نمره منفی</span>
                        <strong className="text-[11px] text-foreground font-bold mt-0.5 block">
                          {exam.hasNegativeMarking ? "۱/۳" : "ندارد"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-muted-foreground">
                        رده آزمون: {exam.category || "جامع شبیه‌ساز وکالت"}
                      </span>

                      <Link href={`/student/exams/${exam.id}`}>
                        <Button size="sm" className="text-xs bg-[#004071] hover:bg-[#00335c] text-white flex items-center gap-1.5 shadow-sm">
                          <span>ورود به جلسه آزمون</span>
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPLETED EXAMS & SCORECARDS */}
      {activeTab === "COMPLETED" && (
        <div className="space-y-6">
          {completedExams.length === 0 ? (
            <Card className="border-border bg-card p-8 text-center">
              <Award className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-bold text-foreground">هنوز در هیچ آزمونی شرکت نکرده‌اید</h3>
              <p className="text-xs text-muted-foreground mt-1">
                برای سنجش آمادگی و دریافت تحلیل تخصصی پشتیبان، از تب آزمون‌های فعال شروع کنید.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedExams.map(({ exam, status, submission }) => {
                const isPendingMentor = status === "AUTO_GRADED_PENDING_MENTOR";
                const isPublished = status === "PUBLISHED_TO_STUDENT";
                const score = submission?.totalPercentage || 0;

                return (
                  <Card
                    key={exam.id}
                    className={`border transition-all ${
                      isPendingMentor
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border bg-card shadow-xs"
                    }`}
                  >
                    <CardHeader className="pb-3 border-b border-border/60">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-foreground">{exam.title}</h3>
                            <Badge variant="outline" className="text-[10px]">
                              {exam.courseCode || "BAR-360"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            ارسال پاسخنامه:{" "}
                            {submission?.submittedAt
                              ? formatJalaliHuman(new Date(submission.submittedAt))
                              : "ثبت سیستمی"}
                          </span>
                        </div>

                        <div>
                          {isPendingMentor ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[11px] flex items-center gap-1.5 px-3 py-1">
                              <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                              <span>در انتظار تایید و تحلیل پشتیبان</span>
                            </Badge>
                          ) : isPublished ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[11px] flex items-center gap-1.5 px-3 py-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              <span>کارنامه نهایی تایید شده</span>
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      {/* PENDING MENTOR STATE NOTICE */}
                      {isPendingMentor && (
                        <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                            <AlertCircle className="h-4 w-4" />
                            <span>تصحیح سیستمی انجام شد • قفل کارنامه تا اتمام تحلیل پشتیبان</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            پاسخنامه شما با موفقیت ثبت شده و برای استاد <strong>{mentorName}</strong> جهت بررسی دقیق خطاهای آزمون، ارزیابی شیوه پاسخ‌دهی و ارائه برنامه جبرانی ارسال گردید. به محض تایید پشتیبان، درصدهای تفکیکی و پاسخ‌های تشریحی برای شما در این بخش قابل رویت خواهد بود.
                          </p>
                        </div>
                      )}

                      {/* PUBLISHED STATE SCORECARD */}
                      {isPublished && submission && (
                        <div className="space-y-4">
                          {/* Hero Scores */}
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="p-2.5 bg-muted/30 rounded-xl border border-border">
                              <span className="text-[10px] text-muted-foreground block">درصد کل (با نمره منفی)</span>
                              <strong
                                className={`text-base font-bold font-mono mt-0.5 block ${
                                  score >= 60
                                    ? "text-emerald-500"
                                    : score >= 40
                                    ? "text-amber-500"
                                    : "text-rose-500"
                                }`}
                              >
                                {toPersianDigits(score.toFixed(1))}٪
                              </strong>
                            </div>
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">پاسخ‌های صحیح</span>
                              <strong className="text-base font-bold font-mono text-emerald-600 block mt-0.5">
                                {toPersianDigits(submission.correctCount ?? 0)}
                              </strong>
                            </div>
                            <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30">
                              <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-semibold">غلط (نمره منفی)</span>
                              <strong className="text-base font-bold font-mono text-rose-600 block mt-0.5">
                                {toPersianDigits(submission.incorrectCount ?? 0)}
                              </strong>
                            </div>
                            <div className="p-2.5 bg-muted/30 rounded-xl border border-border">
                              <span className="text-[10px] text-muted-foreground block">سفید و بی‌پاسخ</span>
                              <strong className="text-base font-bold font-mono text-muted-foreground block mt-0.5">
                                {toPersianDigits(submission.unansweredCount ?? 0)}
                              </strong>
                            </div>
                          </div>

                          {/* Subject Breakdown Bars */}
                          {submission.subjectBreakdown && submission.subjectBreakdown.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                                <Scale className="h-3 w-3 text-amber-500" />
                                <span>درصد عملکرد در دروس تخصصی حقوقی:</span>
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {submission.subjectBreakdown.map((item) => {
                                  const pct = Number(item.percentage) || 0;
                                  return (
                                    <div
                                      key={item.subject}
                                      className="p-2 bg-muted/20 border border-border/80 rounded-lg space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-[11px] font-semibold text-foreground truncate">
                                          {item.subject}
                                        </span>
                                        <span
                                          className={`font-mono font-bold text-[11px] ${
                                            pct >= 60
                                              ? "text-emerald-500"
                                              : pct >= 40
                                              ? "text-amber-500"
                                              : "text-rose-500"
                                          }`}
                                        >
                                          {toPersianDigits(pct.toFixed(1))}٪
                                        </span>
                                      </div>
                                      <Progress
                                        value={Math.max(0, Math.min(100, pct))}
                                        className="h-1 bg-muted"
                                        indicatorClassName={
                                          pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"
                                        }
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Mentor Strategic Feedback Callout */}
                          {submission.mentorNotes && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5" />
                                تحلیل راهبردی و توصیه‌های اختصاصی استاد {mentorName}:
                              </span>
                              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">
                                {submission.mentorNotes}
                              </p>
                            </div>
                          )}

                          {/* Action Button: View Detailed Answer Key */}
                          <div className="pt-2 flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetailedResult(exam.id)}
                              className="text-xs flex items-center gap-1.5 border-border hover:bg-muted"
                            >
                              <FileText className="h-3.5 w-3.5 text-[#004071]" />
                              <span>مشاهده پاسخنامه تشریحی و تحلیل مواد قانونی</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LONGITUDINAL GROWTH TRAJECTORY */}
      {activeTab === "LONGITUDINAL" && (
        <div className="space-y-6">
          {/* Visual Longitudinal SVG Area/Line Chart (M-15) */}
          <LongitudinalScoreChart
            data={longitudinalHistory.map((item) => ({
              id: item.submissionId,
              title: item.examTitle,
              category: item.examCategory,
              scorePercent: item.totalPercentage,
              deltaFromPrevious: item.deltaFromPrevious,
              deltaFromBaseline: item.deltaFromBaseline,
              date: item.publishedAt || item.submittedAt,
              mentorNotes: item.mentorNotes,
            }))}
            passingScore={50}
            title="نمودار طولی رشد و پیشرفت تراز شبیه‌سازها"
            subtitle="تحلیل روند آمادگی و سنجش مهارت‌های حقوقی در طول زمان نسبت به آزمون تعیین سطح بدو ورود (Baseline)"
          />

          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span>تاریخچه مرحله‌ای آزمون‌ها و توصیه‌های راهبردی پشتیبان</span>
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  سوابق تفصیلی و بازخوردهای آموزشی
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              {longitudinalHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  هنوز کارنامه تایید شده‌ای برای ترسیم نمودار طولی ثبت نگردیده است.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step Trajectory Pipeline */}
                  <div className="relative border-r-2 border-[#004071]/30 mr-4 space-y-6 pr-6">
                    {longitudinalHistory.map((item, index) => {
                      const isFirst = index === 0;
                      const hasGrown = item.deltaFromPrevious >= 0;

                      return (
                        <div key={item.submissionId} className="relative space-y-2">
                          {/* Dot on Timeline */}
                          <div
                            className={`absolute -right-[31px] top-1 w-4 h-4 rounded-full border-2 border-background ${
                              isFirst
                                ? "bg-indigo-500"
                                : hasGrown
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20 p-3 rounded-xl border border-border">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {isFirst ? "آزمون تعیین سطح اولیه (Baseline):" : `مرحله ${toPersianDigits(index + 1)}:`}{" "}
                                  {item.examTitle}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {item.examCategory}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                تاریخ انتشار:{" "}
                                {item.publishedAt ? formatJalaliHuman(new Date(item.publishedAt)) : "ثبت شده"}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-center px-3 py-1 bg-card rounded-lg border border-border">
                                <span className="text-[9px] text-muted-foreground block">درصد کل</span>
                                <strong className="text-xs font-mono font-bold text-foreground">
                                  {toPersianDigits(item.totalPercentage.toFixed(1))}٪
                                </strong>
                              </div>

                              {!isFirst && (
                                <>
                                  <div className="text-center px-3 py-1 bg-card rounded-lg border border-border">
                                    <span className="text-[9px] text-muted-foreground block">رشد از قبلی</span>
                                    <strong
                                      className={`text-xs font-mono font-bold ${
                                        item.deltaFromPrevious >= 0 ? "text-emerald-500" : "text-rose-500"
                                      }`}
                                    >
                                      {item.deltaFromPrevious >= 0 ? "+" : ""}
                                      {toPersianDigits(item.deltaFromPrevious.toFixed(1))}٪
                                    </strong>
                                  </div>

                                  <div className="text-center px-3 py-1 bg-card rounded-lg border border-border">
                                    <span className="text-[9px] text-muted-foreground block">رشد از بدو ورود</span>
                                    <strong
                                      className={`text-xs font-mono font-bold ${
                                        item.deltaFromBaseline >= 0 ? "text-emerald-500" : "text-rose-500"
                                      }`}
                                    >
                                      {item.deltaFromBaseline >= 0 ? "+" : ""}
                                      {toPersianDigits(item.deltaFromBaseline.toFixed(1))}٪
                                    </strong>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {item.mentorNotes && (
                            <p className="text-[11px] text-muted-foreground pr-2 border-r border-amber-500/50">
                              نکته مربی: {item.mentorNotes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* DETAILED ANSWER KEY MODAL / DRAWER */}
      {selectedExamId && (
        <Card className="border-indigo-500/40 bg-card shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-foreground">
                پاسخنامه تشریحی و تحلیل مواد قانونی: {detailedResult?.examTitle}
              </h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedExamId(null)}
              className="text-xs h-7 px-2"
            >
              بستن پنجره تحلیل
            </Button>
          </div>

          {detailLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
              در حال بارگذاری کلید سؤالات و مستندات قانونی...
            </div>
          ) : detailedResult ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {detailedResult.questions.map((q) => {
                const studentAns = detailedResult.answers[q.id];
                const isCorrect = studentAns === q.correctOption;
                const isAnswered = studentAns !== undefined && studentAns !== 0;

                return (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-xl border space-y-3 ${
                      isCorrect
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : isAnswered
                        ? "border-rose-500/30 bg-rose-500/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono">سؤال {toPersianDigits(q.questionNumber)}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {q.subject}
                        </Badge>
                      </div>

                      <div>
                        {isCorrect ? (
                          <Badge className="bg-emerald-500/20 text-emerald-600 text-[10px]">
                            پاسخ شما: گزینه {toPersianDigits(studentAns)} (صحیح)
                          </Badge>
                        ) : isAnswered ? (
                          <Badge className="bg-rose-500/20 text-rose-600 text-[10px]">
                            پاسخ شما: گزینه {toPersianDigits(studentAns)} (نادرست)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            بدون پاسخ
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-foreground font-semibold leading-relaxed">
                      {q.questionText}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                            opt.id === q.correctOption
                              ? "border-emerald-500 bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 font-bold"
                              : opt.id === studentAns && !isCorrect
                              ? "border-rose-500 bg-rose-500/20 text-rose-900 dark:text-rose-300"
                              : "border-border/60 bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center border">
                              {toPersianDigits(opt.id)}
                            </span>
                            <span>{opt.text}</span>
                          </div>
                          {opt.id === q.correctOption && (
                            <span className="text-[9px] text-emerald-600 font-bold shrink-0">
                              ✓ کلید
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 bg-background rounded-lg border border-border text-[11px] space-y-1">
                        <span className="text-[10px] font-bold text-indigo-500 block">
                          مستند و ماده قانونی:
                        </span>
                        <p className="text-muted-foreground leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
