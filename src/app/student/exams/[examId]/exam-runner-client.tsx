"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Scale,
  Send,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { submitExamAction } from "@/server/actions/exams";
import type { ExamRecord, ExamQuestion } from "@/types/models";

interface ExamRunnerClientProps {
  exam: ExamRecord;
  questions: ExamQuestion[];
  userId: string;
  initialStartedAt?: string;
}

export function ExamRunnerClient({ exam, questions, userId, initialStartedAt }: ExamRunnerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active question index (0 to questions.length - 1)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers Map: { [questionId]: optionId (1 to 4) }
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // StartedAt timestamp (derived from server timestamp or fallback)
  const [startedAt] = useState<string>(() => initialStartedAt || new Date().toISOString());

  // Countdown timer state in seconds (enforced via server start time)
  const totalSeconds = (exam.durationMinutes || 120) * 60;
  const initialRemaining = initialStartedAt
    ? Math.max(0, totalSeconds - Math.floor((Date.now() - new Date(initialStartedAt).getTime()) / 1000))
    : totalSeconds;
  const [remainingSeconds, setRemainingSeconds] = useState(initialRemaining);
  const [isTimeUp, setIsTimeUp] = useState(() => initialRemaining <= 0);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    totalPercentage?: number;
    message?: string;
  } | null>(null);

  const autoSubmittedRef = useRef(false);

  // Timer Countdown Effect
  useEffect(() => {
    if (submissionComplete || isTimeUp) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [submissionComplete, isTimeUp]);

  // Auto-submit when countdown hits zero
  useEffect(() => {
    if (isTimeUp && !autoSubmittedRef.current && !submissionComplete) {
      autoSubmittedRef.current = true;
      executeSubmit();
    }
  }, [isTimeUp, submissionComplete]);

  // Select Option handler (immediate state update)
  const handleSelectOption = (questionId: string, optionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Clear answer for current question
  const handleClearAnswer = (questionId: string) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  // Execute Submission
  const executeSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const res = await submitExamAction({
        examId: exam.id,
        answers,
        startedAt,
      });

      if (res.success) {
        setSubmissionComplete(true);
        setSubmissionResult({
          totalPercentage: res.totalPercentage,
          message: res.message,
        });
      } else {
        alert(res.message || "خطا در ثبت نهایی پاسخنامه.");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      alert("خطای ارتباط با سرور در هنگام ثبت آزمون.");
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  // Format time remaining MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${toPersianDigits(m.toString().padStart(2, "0"))}:${toPersianDigits(
      s.toString().padStart(2, "0")
    )}`;
  };

  // Timer urgency style
  const timerPercent = (remainingSeconds / totalSeconds) * 100;
  const isUrgent = remainingSeconds < 300; // less than 5 minutes

  // ============================================================================
  // RENDER COMPLETION NOTICE CARD
  // ============================================================================
  if (submissionComplete) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <Card className="max-w-xl w-full border-amber-500/30 bg-amber-500/5 shadow-2xl p-8 space-y-6 text-center rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10 text-xs px-3 py-1">
              تصحیح سیستمی انجام شد • در انتظار تحلیل و تایید پشتیبان
            </Badge>
            <h2 className="text-xl font-bold text-foreground">
              پاسخنامه شما در آزمون «{exam.title}» با موفقیت ثبت گردید
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              پاسخ‌های شما مطابق با فرمول استاندارد نمره منفی ۱/۳ کانون وکلای دادگستری تصحیح گردید. کارنامه و درصدهای تفکیکی پس از بازبینی راهبردی و درج توصیه‌های اختصاصی توسط پشتیبان آموزشی شما منتشر خواهد شد.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-card rounded-xl border border-border text-center text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">کل سؤالات</span>
              <strong className="text-sm font-mono text-foreground">{toPersianDigits(questions.length)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">پاسخ‌داده‌شده</span>
              <strong className="text-sm font-mono text-emerald-500">{toPersianDigits(answeredCount)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">بدون پاسخ</span>
              <strong className="text-sm font-mono text-amber-500">{toPersianDigits(unansweredCount)}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/student/exams" className="w-full sm:w-auto">
              <Button className="w-full text-xs bg-[#004071] hover:bg-[#00335c] text-white">
                <ArrowLeft className="h-4 w-4 ml-1.5" />
                <span>مشاهده فهرست آزمون‌ها و تاریخچه</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER INTERACTIVE EXAM ENGINE
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Top Header Bar: Exam Info & Countdown Timer */}
      <Card className="border-border bg-card shadow-md sticky top-2 z-20">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground line-clamp-1">{exam.title}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {exam.hasNegativeMarking
                    ? "آزمون دارای نمره منفی ۱/۳ بر اساس استاندارد کانون وکلا می‌باشد"
                    : "آزمون فاقد نمره منفی است"}
                </p>
              </div>
            </div>
          </div>

          {/* Timer & Submit Controls */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm ${
                  isUrgent
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse"
                    : "bg-muted/40 border-border text-foreground"
                }`}
              >
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{formatTime(remainingSeconds)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">زمان باقیمانده</span>
            </div>

            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={() => setShowConfirmModal(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>پایان و ارسال پاسخنامه</span>
            </Button>
          </div>
        </CardContent>

        {/* Progress Bar of Time Remaining */}
        <Progress
          value={timerPercent}
          className="h-1 rounded-none bg-muted"
          indicatorClassName={isUrgent ? "bg-rose-500" : "bg-amber-500"}
        />
      </Card>

      {/* Main Examination View (Two Columns: Question Card + Palette) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (3 Cols): Active Question */}
        <div className="lg:col-span-3 space-y-4">
          {currentQ ? (
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#004071] text-white text-xs font-bold font-mono flex items-center justify-center">
                    {toPersianDigits(currentQ.questionNumber)}
                  </span>
                  <Badge variant="outline" className="border-border text-xs bg-muted/30">
                    {currentQ.subject}
                  </Badge>
                  {currentQ.coefficient > 1 && (
                    <Badge variant="secondary" className="text-[10px]">
                      ضریب {toPersianDigits(currentQ.coefficient)}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  سؤال {toPersianDigits(currentIndex + 1)} از {toPersianDigits(questions.length)}
                </div>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                {/* Question Text */}
                <div className="p-4 bg-muted/20 border border-border/60 rounded-xl">
                  <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-line text-justify">
                    {currentQ.questionText}
                  </p>
                </div>

                {/* 4 Options Radio Group */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-muted-foreground block">
                    گزینه مورد نظر خود را انتخاب کنید:
                  </span>

                  <div className="space-y-2.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQ.id, opt.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isSelected
                              ? "border-[#004071] bg-[#004071]/10 text-foreground font-semibold shadow-xs"
                              : "border-border bg-card hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isSelected
                                ? "border-[#004071] bg-[#004071] text-white"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <div className="flex-1 text-xs leading-relaxed">
                            <span className="font-bold ml-1 font-mono text-[11px] text-muted-foreground">
                              {toPersianDigits(opt.id)})
                            </span>
                            <span>{opt.text}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Question Navigation & Reset Choice */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    className="text-xs flex items-center gap-1.5 border-border"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>سؤال قبلی</span>
                  </Button>

                  {answers[currentQ.id] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearAnswer(currentQ.id)}
                      className="text-xs text-muted-foreground hover:text-rose-500 flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>پاک کردن گزینه (بی‌پاسخ)</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">هنوز گزینه‌ای انتخاب نشده است</span>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    disabled={currentIndex === questions.length - 1}
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="text-xs flex items-center gap-1.5 bg-[#004071] hover:bg-[#00335c] text-white"
                  >
                    <span>سؤال بعدی</span>
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">
              سؤالی برای نمایش وجود ندارد.
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Question Palette & Summary */}
        <div className="space-y-4">
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>پالت سؤالات آزمون</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {toPersianDigits(answeredCount)} / {toPersianDigits(questions.length)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Question Grid Numbers */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isActive = idx === currentIndex;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                        isActive
                          ? "ring-2 ring-[#004071] bg-[#004071] text-white shadow-sm"
                          : isAnswered
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                          : "bg-muted/40 text-muted-foreground border border-border hover:bg-muted"
                      }`}
                    >
                      {toPersianDigits(idx + 1)}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="pt-3 border-t border-border space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#004071]" />
                    سؤال جاری
                  </span>
                  <span className="font-mono text-foreground font-bold">{toPersianDigits(currentIndex + 1)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/30 border border-emerald-500/50" />
                    پاسخ‌داده‌شده
                  </span>
                  <span className="font-mono text-emerald-500 font-bold">{toPersianDigits(answeredCount)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-muted/60 border border-border" />
                    بدون پاسخ
                  </span>
                  <span className="font-mono text-amber-500 font-bold">{toPersianDigits(unansweredCount)}</span>
                </div>
              </div>

              {/* Submit Final Action Button in Palette */}
              <div className="pt-3 border-t border-border">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>ارسال نهایی پاسخنامه</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal before Submit */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border bg-card shadow-2xl p-6 space-y-5 rounded-2xl animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">تأیید پایان و ارسال آزمون</h3>
                <p className="text-xs text-muted-foreground">پس از ارسال، امکان تغییر پاسخ‌ها وجود نخواهد داشت.</p>
              </div>
            </div>

            <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">تعداد کل سؤالات:</span>
                <span className="font-mono font-bold">{toPersianDigits(questions.length)} سؤال</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">پاسخ‌های ثبت‌شده:</span>
                <span className="font-mono font-bold text-emerald-500">{toPersianDigits(answeredCount)} سؤال</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">سؤالات بدون پاسخ:</span>
                <span className="font-mono font-bold text-amber-500">{toPersianDigits(unansweredCount)} سؤال</span>
              </div>
              {exam.hasNegativeMarking && unansweredCount > 0 && (
                <p className="text-[10px] text-amber-500/90 pt-1 border-t border-border/50">
                  توجه: برای سؤالات بی‌پاسخ نمره منفی محاسبه نخواهد شد.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                className="text-xs"
              >
                ادامه پاسخگویی
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={executeSubmit}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>در حال ارسال...</span>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>تأیید نهایی و تحویل پاسخنامه</span>
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
