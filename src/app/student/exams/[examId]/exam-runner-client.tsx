"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
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
  ShieldAlert,
  Bookmark,
  BookmarkCheck,
  Strikethrough,
  Filter,
  Eye,
  Check,
  AlertCircle,
  Play,
  FileText,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { submitExamAction, reportSuspiciousExamActivityAction } from "@/server/actions/exams";
import type { ExamRecord, ExamQuestion } from "@/types/models";

interface ExamRunnerClientProps {
  exam: ExamRecord;
  questions: ExamQuestion[];
  userId: string;
  initialStartedAt?: string;
  initialRemainingSeconds?: number;
}

export function ExamRunnerClient({
  exam,
  questions,
  userId,
  initialStartedAt,
  initialRemainingSeconds,
}: ExamRunnerClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const storageKey = `exam_state_${exam.id}_${userId}`;

  // Lobby state: show lobby if no saved answers and full time remaining
  const totalSeconds = (exam.durationMinutes || 120) * 60;
  const initialRemaining =
    initialRemainingSeconds !== undefined
      ? initialRemainingSeconds
      : initialStartedAt
      ? Math.max(0, totalSeconds - Math.floor((Date.now() - new Date(initialStartedAt).getTime()) / 1000))
      : totalSeconds;

  const [hasStarted, setHasStarted] = useState<boolean>(() => {
    // If exam was started in a previous session or page reload with time elapsed, skip lobby
    if (initialRemaining < totalSeconds - 5) return true;
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.hasStarted || Object.keys(parsed.answers || {}).length > 0)) {
            return true;
          }
        }
      }
    } catch {}
    return false;
  });

  // Active question index (0 to questions.length - 1)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers Map: { [questionId]: optionId (1 to 4) }
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // Flagged / Bookmarked Questions: questionId[]
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);

  // Eliminated / Struck-through Options: { [questionId]: optionId[] }
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, number[]>>({});

  // Tab-switch / blur counter
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showTabSwitchModal, setShowTabSwitchModal] = useState<boolean>(false);

  // Palette Filter Tab: ALL, ANSWERED, FLAGGED, UNANSWERED
  const [paletteFilter, setPaletteFilter] = useState<"ALL" | "ANSWERED" | "FLAGGED" | "UNANSWERED">("ALL");

  // StartedAt timestamp (derived from server timestamp or fallback)
  const [startedAt, setStartedAt] = useState<string>(() => initialStartedAt || new Date().toISOString());

  // Countdown timer state in seconds
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

  // Restore saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers && typeof parsed.answers === "object") {
          setAnswers((prev) => ({ ...parsed.answers, ...prev }));
        }
        if (Array.isArray(parsed.flaggedQuestions)) {
          setFlaggedQuestions(parsed.flaggedQuestions);
        }
        if (parsed.eliminatedOptions && typeof parsed.eliminatedOptions === "object") {
          setEliminatedOptions(parsed.eliminatedOptions);
        }
        if (typeof parsed.tabSwitchCount === "number") {
          setTabSwitchCount(parsed.tabSwitchCount);
        }
        if (parsed.hasStarted) {
          setHasStarted(true);
        }
      }
    } catch (e) {
      console.warn("[ExamRunnerClient] Failed to restore answers from localStorage:", e);
    }
  }, [storageKey]);

  // Persist state to localStorage on changes
  useEffect(() => {
    if (submissionComplete) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      return;
    }
    if (!hasStarted) return;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          answers,
          flaggedQuestions,
          eliminatedOptions,
          tabSwitchCount,
          startedAt,
          remainingSeconds,
          hasStarted: true,
          updatedAt: Date.now(),
        })
      );
    } catch {}
  }, [
    answers,
    flaggedQuestions,
    eliminatedOptions,
    tabSwitchCount,
    remainingSeconds,
    startedAt,
    storageKey,
    submissionComplete,
    hasStarted,
  ]);

  // Tab Switch & Visibility Change Anti-Cheat Tracking
  useEffect(() => {
    if (!hasStarted || submissionComplete || isTimeUp) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          void reportSuspiciousExamActivityAction(exam.id, `TAB_SWITCH_COUNT_${next}`);
          return next;
        });
      } else {
        setShowTabSwitchModal(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasStarted, submissionComplete, isTimeUp, exam.id]);

  // Layer 4 DRM: Anti-Scraping Tripwire States
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showTripwireModal, setShowTripwireModal] = useState(false);
  const navigationTimestampsRef = useRef<number[]>([]);
  const tripwireTriggeredRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  // Timer Countdown Effect
  useEffect(() => {
    if (!hasStarted || submissionComplete || isTimeUp || isTimerPaused) return;

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
  }, [hasStarted, submissionComplete, isTimeUp, isTimerPaused]);

  // Auto-submit when countdown hits zero
  useEffect(() => {
    if (isTimeUp && !autoSubmittedRef.current && !submissionComplete && hasStarted) {
      autoSubmittedRef.current = true;
      executeSubmit();
    }
  }, [isTimeUp, submissionComplete, hasStarted]);

  // Start exam from lobby
  const handleStartExam = () => {
    setHasStarted(true);
    setStartedAt(new Date().toISOString());
  };

  // Monitored Question Navigation
  const handleNavigateQuestion = (targetIndex: number) => {
    if (targetIndex === currentIndex) return;

    const now = Date.now();
    navigationTimestampsRef.current = navigationTimestampsRef.current.filter(
      (ts) => now - ts <= 25000
    );
    navigationTimestampsRef.current.push(now);

    const answeredCount = Object.keys(answers).length;
    // Tripwire trigger: clicked through >12 questions in under 25 seconds with fewer than 3 answers
    if (
      navigationTimestampsRef.current.length > 12 &&
      answeredCount < 3 &&
      !tripwireTriggeredRef.current
    ) {
      tripwireTriggeredRef.current = true;
      setIsTimerPaused(true);
      setShowTripwireModal(true);
      void reportSuspiciousExamActivityAction(
        exam.id,
        "RAPID_QUESTION_SCRAPING_SUSPECTED"
      );
    }

    setCurrentIndex(targetIndex);
  };

  // Select Option handler
  const handleSelectOption = (questionId: string, optionId: number) => {
    // If option was struck-through, un-strike it upon selection
    const currentElim = eliminatedOptions[questionId] || [];
    if (currentElim.includes(optionId)) {
      setEliminatedOptions((prev) => ({
        ...prev,
        [questionId]: prev[questionId].filter((id) => id !== optionId),
      }));
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Toggle Strike-through Option
  const handleToggleStrikeOption = (e: React.MouseEvent, questionId: string, optionId: number) => {
    e.stopPropagation();
    setEliminatedOptions((prev) => {
      const current = prev[questionId] || [];
      const isElim = current.includes(optionId);
      const next = isElim ? current.filter((id) => id !== optionId) : [...current, optionId];

      // If eliminated option was currently selected, unselect it
      if (!isElim && answers[questionId] === optionId) {
        setAnswers((ansPrev) => {
          const ansCopy = { ...ansPrev };
          delete ansCopy[questionId];
          return ansCopy;
        });
      }

      return {
        ...prev,
        [questionId]: next,
      };
    });
  };

  // Toggle Bookmark / Flag
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
    );
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
        flaggedQuestions,
        eliminatedOptions,
        tabSwitchCount,
        startedAt,
      });

      if (res.success) {
        try {
          localStorage.removeItem(storageKey);
        } catch {}
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
  const flaggedCount = flaggedQuestions.length;

  // Format time remaining MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${toPersianDigits(m.toString().padStart(2, "0"))}:${toPersianDigits(
      s.toString().padStart(2, "0")
    )}`;
  };

  const timerPercent = (remainingSeconds / totalSeconds) * 100;
  const isUrgent = remainingSeconds < 300; // less than 5 minutes

  // ============================================================================
  // 1. PRE-EXAM READINESS LOBBY
  // ============================================================================
  if (!hasStarted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-border bg-card shadow-2xl p-8 space-y-6 rounded-3xl">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#004071] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              <Scale className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {exam.courseCode || "BAR-360"}
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]">
                  سامانه سنجش و آزمون هوشمند
                </Badge>
              </div>
              <h1 className="text-lg font-bold text-foreground mt-1">{exam.title}</h1>
            </div>
          </div>

          {/* Exam Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">تعداد سؤالات</span>
              <strong className="text-sm font-bold font-mono text-foreground mt-0.5 block">
                {toPersianDigits(questions.length)} سؤال
              </strong>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">مدت زمان آزمون</span>
              <strong className="text-sm font-bold font-mono text-foreground mt-0.5 block">
                {toPersianDigits(exam.durationMinutes)} دقیقه
              </strong>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">قانون نمره منفی</span>
              <strong className="text-sm font-bold text-foreground mt-0.5 block">
                {exam.hasNegativeMarking ? "یک‌سوم (۱/۳)" : "ندارد"}
              </strong>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">حد نصاب قبولی</span>
              <strong className="text-sm font-bold font-mono text-foreground mt-0.5 block">
                {toPersianDigits(exam.passingScore || 50)}٪
              </strong>
            </div>
          </div>

          {/* Official Rules & Instructions */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs leading-relaxed text-foreground">
            <h4 className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>دستورالعمل و ضوابط برگزاری آزمون CBT:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
              <li>
                <strong>محاسبه نمره منفی:</strong> هر ۳ پاسخ نادرست یک پاسخ صحیح شما را خنثی می‌کند. برای سؤالات بی‌پاسخ نمره منفی محاسبه نمی‌شود.
              </li>
              <li>
                <strong>ابزارهای پیشرفته:</strong> می‌توانید سؤالات را نشان‌دار کنید و با کلیک روی آیکون خط‌زدن، گزینه‌های انحرافی را حذف نمایید.
              </li>
              <li>
                <strong>پایش تقلب و خروج از تب:</strong> هرگونه خروج از صفحه آزمون به صورت هوشمند ثبت شده و به عنوان تخلف به پشتیبان شما گزارش می‌شود.
              </li>
              <li>
                <strong>ذخیره خودکار:</strong> در صورت قطع اینترنت یا رفرش مرورگر، پاسخ‌های شما در حافظه ذخیره مانده و زمان آزمون به صورت ضد رفرش از سرور خوانده می‌شود.
              </li>
            </ul>
          </div>

          {/* Action Button: Start Official Exam */}
          <div className="flex items-center justify-between pt-2">
            <Link href="/student/exams">
              <Button variant="outline" size="sm" className="text-xs text-muted-foreground">
                انصراف و بازگشت
              </Button>
            </Link>

            <Button
              onClick={handleStartExam}
              size="lg"
              className="bg-[#004071] hover:bg-[#00335c] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>شروع رسمی آزمون و فعال‌سازی زمان‌سنج</span>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // 2. COMPLETION NOTICE CARD (POST-SUBMIT)
  // ============================================================================
  if (submissionComplete) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <Card className="max-w-xl w-full border-amber-500/30 bg-amber-500/5 shadow-2xl p-8 space-y-6 text-center rounded-3xl">
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

  // Filtered Question list in Palette based on quick filter tabs
  const filteredPaletteQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q, idx }) => {
    const isAnswered = answers[q.id] !== undefined;
    const isFlagged = flaggedQuestions.includes(q.id);

    if (paletteFilter === "ANSWERED") return isAnswered;
    if (paletteFilter === "FLAGGED") return isFlagged;
    if (paletteFilter === "UNANSWERED") return !isAnswered;
    return true;
  });

  // ============================================================================
  // 3. MAIN INTERACTIVE CBT EXAM ENGINE
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

                <div className="flex items-center gap-3">
                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleFlag(currentQ.id)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      flaggedQuestions.includes(currentQ.id)
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {flaggedQuestions.includes(currentQ.id) ? (
                      <>
                        <BookmarkCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>نشان‌دار شده</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>نشان‌دار کردن</span>
                      </>
                    )}
                  </button>

                  <div className="text-xs text-muted-foreground">
                    سؤال {toPersianDigits(currentIndex + 1)} از {toPersianDigits(questions.length)}
                  </div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">
                      گزینه مورد نظر خود را انتخاب کنید:
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      (برای حذف گزینه‌های انحرافی از دکمه خط‌زدن استفاده کنید)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.id;
                      const isEliminated = (eliminatedOptions[currentQ.id] || []).includes(opt.id);

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(currentQ.id, opt.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                            isSelected
                              ? "border-[#004071] bg-[#004071]/10 text-foreground font-semibold shadow-xs"
                              : isEliminated
                              ? "border-border/40 bg-muted/40 text-muted-foreground/60 opacity-50 line-through"
                              : "border-border bg-card hover:bg-muted/30 text-foreground"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
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

                          {/* Strike-Through Action Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleStrikeOption(e, currentQ.id, opt.id)}
                            title={isEliminated ? "بازگرداندن گزینه" : "خط زدن گزینه انحرافی"}
                            className={`p-1 rounded-md text-xs transition-colors shrink-0 ${
                              isEliminated
                                ? "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                                : "text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10"
                            }`}
                          >
                            <Strikethrough className="w-4 h-4" />
                          </button>
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
                    onClick={() => handleNavigateQuestion(Math.max(0, currentIndex - 1))}
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
                    onClick={() => handleNavigateQuestion(Math.min(questions.length - 1, currentIndex + 1))}
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
            <CardHeader className="pb-3 border-b border-border space-y-2">
              <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>پالت سؤالات آزمون</span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {toPersianDigits(answeredCount)} / {toPersianDigits(questions.length)}
                </span>
              </CardTitle>

              {/* Quick Filter Chips */}
              <div className="grid grid-cols-4 gap-1 text-[10px] pt-1">
                <button
                  type="button"
                  onClick={() => setPaletteFilter("ALL")}
                  className={`p-1 rounded-md text-center font-bold transition-all ${
                    paletteFilter === "ALL" ? "bg-[#004071] text-white" : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  همه
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteFilter("ANSWERED")}
                  className={`p-1 rounded-md text-center font-bold transition-all ${
                    paletteFilter === "ANSWERED" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  پاسخ ({toPersianDigits(answeredCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteFilter("FLAGGED")}
                  className={`p-1 rounded-md text-center font-bold transition-all ${
                    paletteFilter === "FLAGGED" ? "bg-amber-600 text-white" : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  نشان ({toPersianDigits(flaggedCount)})
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteFilter("UNANSWERED")}
                  className={`p-1 rounded-md text-center font-bold transition-all ${
                    paletteFilter === "UNANSWERED" ? "bg-slate-600 text-white" : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  سفید
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Question Grid Numbers */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs max-h-64 overflow-y-auto p-1">
                {filteredPaletteQuestions.map(({ q, idx }) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isFlagged = flaggedQuestions.includes(q.id);
                  const isActive = idx === currentIndex;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleNavigateQuestion(idx)}
                      className={`relative h-8 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center ${
                        isActive
                          ? "ring-2 ring-[#004071] bg-[#004071] text-white shadow-sm"
                          : isAnswered
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                          : "bg-muted/40 text-muted-foreground border border-border hover:bg-muted"
                      }`}
                    >
                      {toPersianDigits(idx + 1)}
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-background" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div className="pt-3 border-t border-border space-y-1.5 text-[11px]">
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
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    نشان‌دار برای بازبینی
                  </span>
                  <span className="font-mono text-amber-500 font-bold">{toPersianDigits(flaggedCount)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-muted/60 border border-border" />
                    بدون پاسخ
                  </span>
                  <span className="font-mono text-muted-foreground font-bold">{toPersianDigits(unansweredCount)}</span>
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

      {/* Pre-Submission Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-border bg-card shadow-2xl p-6 space-y-5 rounded-2xl animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">تأیید پایان و تحویل آزمون</h3>
                <p className="text-xs text-muted-foreground">پس از تحویل، پاسخ‌ها به پشتیبان شما ارجاع خواهد شد.</p>
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
              {flaggedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">سؤالات نشان‌دار:</span>
                  <span className="font-mono font-bold text-amber-600">{toPersianDigits(flaggedCount)} سؤال</span>
                </div>
              )}
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

      {/* Tab Switch Warning Modal */}
      {showTabSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-rose-500/40 bg-card shadow-2xl p-6 space-y-4 rounded-2xl animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">هشدار ممیزی آزمون</h3>
                <p className="text-xs text-rose-500 font-semibold">خروج از صفحه آزمون ردیابی گردید</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              شما از صفحه آزمون خارج شده‌اید. تعداد دفعات خروج شما ({toPersianDigits(tabSwitchCount)} بار) در گزارش ممیزی آزمون ثبت و برای پشتیبان و سرپرست آموزشی ارسال می‌گردد. لطفاً تا پایان آزمون در همین صفحه باقی بمانید.
            </p>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setShowTabSwitchModal(false)}
                className="text-xs bg-[#004071] hover:bg-[#00335c] text-white"
              >
                متوجه شدم، بازگشت به آزمون
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Layer 4 DRM: Anti-Scraping Tripwire Security Warning Modal */}
      {showTripwireModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-rose-500/50 bg-card shadow-2xl p-6 space-y-5 rounded-2xl animate-in fade-in-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">هشدار امنیتی سامانه سنجش</h3>
                <p className="text-xs text-rose-500 font-semibold">ردیابی رفتار نامتعارف و الگوریتم مشکوک</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-200 leading-relaxed space-y-2">
              <p className="font-bold">
                فعالیت مشکوک شناسایی شد. لطفاً سوالات را با دقت مطالعه فرمایید.
              </p>
              <p className="text-[11px] text-muted-foreground leading-normal">
                ورق‌زدن متوالی و فوق‌سریع بیش از ۱۲ سؤال در کمتر از ۲۵ ثانیه بدون ثبت پاسخ، مغایر با اصول شرکت در آزمون‌های حقوقی بوده و به عنوان احتمال استخراج غیرمجاز سوالات ثبت گردید. زمان آزمون موقتاً متوقف گردیده است.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setShowTripwireModal(false);
                  setIsTimerPaused(false);
                  navigationTimestampsRef.current = [];
                  setTimeout(() => {
                    tripwireTriggeredRef.current = false;
                  }, 10000);
                }}
                className="w-full text-xs bg-[#004071] hover:bg-[#003056] text-white py-2.5 font-bold"
              >
                متوجه شدم، بازگشت به آزمون و مطالعه دقیق سوالات
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
