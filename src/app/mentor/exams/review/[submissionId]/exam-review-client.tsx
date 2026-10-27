"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Scale,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  FileText,
  Send,
  User,
  Check,
  X,
  Sparkles,
  HelpCircle,
  BookOpen,
  Filter,
} from "lucide-react";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";
import { publishExamResultToStudentAction } from "@/server/actions/exams";
import type { ExamRecord, ExamQuestion, SubjectBreakdownItem } from "@/types/models";

interface ExamReviewClientProps {
  submission: {
    id: string;
    examId: string;
    studentId: string;
    mentorId?: string | null;
    startedAt: Date | string;
    submittedAt?: Date | string | null;
    answers: Record<string, number>;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    totalPercentage: string | number;
    subjectBreakdown: SubjectBreakdownItem[];
    status: string;
    mentorNotes?: string | null;
    reviewedAt?: Date | string | null;
    publishedAt?: Date | string | null;
  };
  student: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  exam: ExamRecord;
  questions: ExamQuestion[];
  currentUserRole: string;
}

export function ExamReviewClient({
  submission: initialSubmission,
  student,
  exam,
  questions,
}: ExamReviewClientProps) {
  const router = useRouter();
  const [submission, setSubmission] = useState(initialSubmission);
  const [mentorNotes, setMentorNotes] = useState(submission.mentorNotes || "");
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Question Filter Tab: ALL, INCORRECT, UNANSWERED, CORRECT
  const [filterMode, setFilterMode] = useState<"ALL" | "INCORRECT" | "UNANSWERED" | "CORRECT">("ALL");

  const totalPercentageNum = Number(submission.totalPercentage) || 0;
  const isPublished = submission.status === "PUBLISHED_TO_STUDENT";

  const handlePublish = async () => {
    if (!mentorNotes.trim()) {
      if (!confirm("آیا مایلید کارنامه را بدون ثبت یادداشت و تحلیل راهبردی منتشر کنید؟")) {
        return;
      }
    }

    setIsPublishing(true);
    setFeedback(null);

    try {
      const res = await publishExamResultToStudentAction(submission.id, mentorNotes);
      if (res.success) {
        setSubmission((prev) => ({
          ...prev,
          status: "PUBLISHED_TO_STUDENT",
          mentorNotes: mentorNotes.trim(),
          publishedAt: new Date().toISOString(),
        }));
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطای سیستمی در انتشار کارنامه." });
    } finally {
      setIsPublishing(false);
    }
  };

  // Filtered Questions list
  const filteredQuestions = questions.filter((q) => {
    const studentChoice = submission.answers[q.id];
    const isAnswered = studentChoice !== undefined && studentChoice !== null && studentChoice !== 0;
    const isCorrect = isAnswered && studentChoice === q.correctOption;
    const isIncorrect = isAnswered && studentChoice !== q.correctOption;
    const isUnanswered = !isAnswered;

    if (filterMode === "INCORRECT") return isIncorrect;
    if (filterMode === "UNANSWERED") return isUnanswered;
    if (filterMode === "CORRECT") return isCorrect;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Link href="/mentor/students">
            <Button variant="ghost" size="sm" className="h-8 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>بازگشت به فهرست داوطلبان</span>
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-bold text-foreground">
            تحلیل و بازبینی کارنامه: {student.fullName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPublished ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs px-3 py-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>کارنامه برای داوطلب منتشر شده است</span>
            </Badge>
          ) : (
            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs px-3 py-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>نیازمند بازبینی و تحلیل پشتیبان</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span>{feedback.text}</span>
          </div>
        </div>
      )}

      {/* Candidate & Exam Summary Card */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#004071] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                {student.fullName.slice(0, 1)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-foreground">{student.fullName}</h1>
                  <Badge variant="outline" className="text-[10px]">
                    {exam.courseCode || "BAR-360"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  آزمون: <strong className="text-foreground">{exam.title}</strong> • ارسال شده:{" "}
                  {submission.submittedAt ? formatJalaliHuman(new Date(submission.submittedAt)) : "ثبت سیستمی"}
                </p>
              </div>
            </div>

            {/* Scorecard Hero Metrics */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-muted/30 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block">درصد کل نهایی</span>
                <strong
                  className={`text-lg font-bold font-mono block mt-0.5 ${
                    totalPercentageNum >= 60
                      ? "text-emerald-500"
                      : totalPercentageNum >= 40
                      ? "text-amber-500"
                      : "text-rose-500"
                  }`}
                >
                  {toPersianDigits(totalPercentageNum.toFixed(1))}٪
                </strong>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">درست</span>
                <strong className="text-lg font-bold font-mono text-emerald-600 block mt-0.5">
                  {toPersianDigits(submission.correctCount)}
                </strong>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-semibold">غلط (-۱/۳)</span>
                <strong className="text-lg font-bold font-mono text-rose-600 block mt-0.5">
                  {toPersianDigits(submission.incorrectCount)}
                </strong>
              </div>
              <div className="p-3 bg-muted/30 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block">بی‌پاسخ</span>
                <strong className="text-lg font-bold font-mono text-muted-foreground block mt-0.5">
                  {toPersianDigits(submission.unansweredCount)}
                </strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Percentage Breakdown Grid */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-amber-500" />
              <span>تفکیک عملکرد در دروس تخصصی حقوقی (فرمول نمره منفی ۱/۳)</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">
              میانگین وزنی دروس
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {submission.subjectBreakdown.map((item) => {
              const pct = Number(item.percentage) || 0;
              return (
                <div
                  key={item.subject}
                  className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{item.subject}</span>
                    <strong
                      className={`text-xs font-mono font-bold ${
                        pct >= 60 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : "text-rose-500"
                      }`}
                    >
                      {toPersianDigits(pct.toFixed(1))}٪
                    </strong>
                  </div>

                  <Progress
                    value={Math.max(0, Math.min(100, pct))}
                    className="h-1.5 bg-muted"
                    indicatorClassName={pct >= 60 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500"}
                  />

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                    <span>صحیح: {toPersianDigits(item.correct)}</span>
                    <span className="text-rose-500">غلط: {toPersianDigits(item.incorrect)}</span>
                    <span>بی‌پاسخ: {toPersianDigits(item.unattempted)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mentor Strategic Feedback & Publishing Box */}
      <Card className="border-amber-500/40 bg-amber-500/5 shadow-md">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold text-foreground">
              تحلیل راهبردی پشتیبان و توصیه‌های اختصاصی برای داوطلب
            </CardTitle>
          </div>
          {isPublished && (
            <Badge className="bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 text-[10px]">
              منتشر شده در تاریخ {submission.publishedAt ? formatJalaliHuman(new Date(submission.publishedAt)) : ""}
            </Badge>
          )}
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            این تحلیل مستقیماً در کارنامه داوطلب و صفحه داشبورد او درج خواهد شد. نقاط ضعف کلیدی، نحوه مدیریت آزمون‌های با نمره منفی و راهکار بهبود را مشخص فرمایید.
          </p>

          <textarea
            rows={4}
            value={mentorNotes}
            onChange={(e) => setMentorNotes(e.target.value)}
            placeholder="مثال: داوطلب گرامی، با توجه به افت تراز در درس حقوق تجارت و پاسخ‌های اشتباه مکرر در مبحث اسناد تجاری، لازم است هفته آتی حداقل ۸ ساعت تست زمان‌دار با تکنیک ضربدر منها مطالعه فرمایید..."
            className="w-full p-3 text-xs border border-border rounded-xl bg-background text-foreground leading-relaxed focus:ring-1 focus:ring-amber-500"
          />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>توصیه‌های آماده:</span>
              <button
                type="button"
                onClick={() =>
                  setMentorNotes(
                    (prev) =>
                      prev +
                      " تمرکز روی قوانین خاص و کاهش تعداد پاسخ‌های نامطمئن در درس مدنی توصیه می‌شود."
                  )
                }
                className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px]"
              >
                + کنترل نمره منفی
              </button>
              <button
                type="button"
                onClick={() =>
                  setMentorNotes(
                    (prev) =>
                      prev +
                      " تسلط بر آیین دادرسی مدنی مطلوب است، زمان‌بندی تست‌زنی را تقویت فرمایید."
                  )
                }
                className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-[10px]"
              >
                + تقویت سرعت تست
              </button>
            </div>

            {/* Button: تأیید نهایی و انتشار کارنامه برای داوطلب */}
            <Button
              type="button"
              disabled={isPublishing}
              onClick={handlePublish}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm px-4 py-2"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isPublished ? "به‌روزرسانی و بازنشر کارنامه" : "تأیید نهایی و انتشار کارنامه برای داوطلب"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Question Review & Error Analysis Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#004071]" />
            <h2 className="text-sm font-bold text-foreground">
              بررسی و مقایسه تفکیکی پاسخ‌های داوطلب با کلید آزمون
            </h2>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("ALL")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMode === "ALL" ? "bg-[#004071] text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              همه ({toPersianDigits(questions.length)})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("INCORRECT")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMode === "INCORRECT"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-500/10 text-rose-600"
              }`}
            >
              پاسخ‌های اشتباه ({toPersianDigits(submission.incorrectCount)})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("UNANSWERED")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMode === "UNANSWERED"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              بدون پاسخ ({toPersianDigits(submission.unansweredCount)})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("CORRECT")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterMode === "CORRECT"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              پاسخ‌های صحیح ({toPersianDigits(submission.correctCount)})
            </button>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border text-xs text-muted-foreground">
            سؤالی در این دسته‌بندی یافت نشد.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const studentChoice = submission.answers[q.id];
              const isAnswered = studentChoice !== undefined && studentChoice !== null && studentChoice !== 0;
              const isCorrect = isAnswered && studentChoice === q.correctOption;
              const isIncorrect = isAnswered && studentChoice !== q.correctOption;

              return (
                <Card
                  key={q.id}
                  className={`border transition-all ${
                    isCorrect
                      ? "border-emerald-500/30 bg-card"
                      : isIncorrect
                      ? "border-rose-500/40 bg-rose-500/5 shadow-xs"
                      : "border-border bg-card"
                  }`}
                >
                  <CardHeader className="pb-3 border-b border-border/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-muted text-foreground text-xs font-bold font-mono flex items-center justify-center">
                          {toPersianDigits(q.questionNumber)}
                        </span>
                        <Badge variant="outline" className="border-border text-xs bg-muted/30">
                          {q.subject}
                        </Badge>
                      </div>

                      <div>
                        {isCorrect ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[11px] flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>پاسخ داوطلب: صحیح</span>
                          </Badge>
                        ) : isIncorrect ? (
                          <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/30 text-[11px] flex items-center gap-1">
                            <X className="h-3 w-3" />
                            <span>پاسخ داوطلب: نادرست (گزینه {toPersianDigits(studentChoice)})</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[11px]">
                            بدون پاسخ (عدم ثبت گزینه)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Question Text */}
                    <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-line text-justify">
                      {q.questionText}
                    </p>

                    {/* 4 Options Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => {
                        const isThisCorrect = opt.id === q.correctOption;
                        const isStudentSelected = opt.id === studentChoice;

                        let styleClasses = "border-border/60 bg-muted/20 text-muted-foreground";
                        if (isThisCorrect) {
                          styleClasses =
                            "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 font-bold";
                        } else if (isStudentSelected && !isThisCorrect) {
                          styleClasses =
                            "border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-300 font-semibold";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${styleClasses}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 border border-border">
                                {toPersianDigits(opt.id)}
                              </span>
                              <span>{opt.text}</span>
                            </div>

                            <div className="shrink-0 text-[10px]">
                              {isThisCorrect && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  ✓ کلید صحیح
                                </span>
                              )}
                              {isStudentSelected && !isThisCorrect && (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  ✗ انتخاب داوطلب
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legal Rationale / Statute Explanation */}
                    {q.explanation && (
                      <div className="p-3 bg-muted/30 border border-border rounded-xl text-xs space-y-1">
                        <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          تحلیل مستند و ماده قانونی پاسخ صحیح:
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
