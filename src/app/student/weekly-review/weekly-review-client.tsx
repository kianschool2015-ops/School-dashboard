"use client";

import React, { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { submitWeeklyReviewAction } from "@/server/actions/student";

interface WeeklyReviewClientProps {
  studentProfileId: string;
}

const OBSTACLE_OPTIONS = [
  "کمبود زمان در طول روزهای کاری هفته",
  "تله‌های تستی و سختی مواد قانونی مدنی و تجارت",
  "اضطراب، خستگی روحی و افت انگیزه مقطعی",
  "عدم درک و تطبیق متون فقه با قانون مدنی",
  "سرعت پایین در پاسخگویی به تست‌های آیین دادرسی",
];

export function WeeklyReviewClient({ studentProfileId }: WeeklyReviewClientProps) {
  const [satisfaction, setSatisfaction] = useState<number>(4);
  const [primaryObstacle, setPrimaryObstacle] = useState("کمبود زمان در طول روزهای کاری هفته");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitWeeklyReviewAction({
        studentProfileId,
        selfSatisfactionScore: satisfaction,
        primaryObstacle,
        studentFeedbackNote: feedbackNote,
      });
      if (res.success) {
        setIsSubmitted(true);
      }
    });
  };

  return isSubmitted ? (
    <Card className="border-emerald-500/30 bg-emerald-500/10 p-8 text-center space-y-3">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white mx-auto">
        <CheckCircle className="h-6 w-6" />
      </div>
      <h2 className="text-base font-bold text-foreground">
        خودارزیابی هفتگی با موفقیت ثبت شد!
      </h2>
      <p className="text-xs text-emerald-700 dark:text-emerald-300">
        پشتیبان شما گزارش عملکرد این هفته را بررسی نموده و در جلسه مشاوره هفتگی نکات لازم را منعکس خواهد کرد.
      </p>
    </Card>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Summary Telemetry Card */}
      <Card className="p-5">
        <CardTitle className="text-xs font-bold text-muted-foreground mb-3">
          خلاصه آماری عملکرد هفته پشت‌سر گذاشته‌شده:
        </CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground block">درصد تحقق کل برنامه</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 persian-nums">%۷۸</span>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground block">پیوستگی ثبت روزانه</span>
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 persian-nums">%۸۵</span>
          </div>
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground block">انباشت مباحث جبرانی</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 persian-nums">۹۰ دقیقه</span>
          </div>
        </div>
      </Card>

      {/* Satisfaction Score (1 to 5 Stars) */}
      <Card className="p-5 space-y-3">
        <CardTitle className="text-xs font-bold text-foreground">
          میزان رضایت شخصی شما از نظم مطالعاتی این هفته (۱ تا ۵):
        </CardTitle>
        <div className="flex items-center space-x-3 space-x-reverse">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setSatisfaction(star)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                satisfaction >= star
                  ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-xs"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              <Star className={`h-4 w-4 ${satisfaction >= star ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
          ))}
          <span className="text-xs text-muted-foreground me-2">
            امتیاز فعلی: {toPersianDigits(satisfaction)} از ۵
          </span>
        </div>
      </Card>

      {/* Primary Obstacle */}
      <Card className="p-5 space-y-3">
        <CardTitle className="text-xs font-bold text-foreground">
          بزرگ‌ترین مانع یا چالش درسی شما در این هفته:
        </CardTitle>
        <div className="space-y-2">
          {OBSTACLE_OPTIONS.map((opt) => (
            <label
              key={opt}
              className={`flex items-center space-x-2.5 space-x-reverse p-3 rounded-lg border cursor-pointer text-xs transition-colors ${
                primaryObstacle === opt
                  ? "border-indigo-500 bg-indigo-500/10 text-foreground font-medium"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name="obstacle"
                checked={primaryObstacle === opt}
                onChange={() => setPrimaryObstacle(opt)}
                className="accent-indigo-500"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Feedback Note to Mentor */}
      <Card className="p-5 space-y-3">
        <CardTitle className="text-xs font-bold text-foreground">
          پیام یا درخواست ویژه از پشتیبان تحصیلی برای برنامه هفته آینده:
        </CardTitle>
        <textarea
          rows={3}
          value={feedbackNote}
          onChange={(e) => setFeedbackNote(e.target.value)}
          placeholder="مثال: لطفاً پارت تست‌زنی آیین دادرسی مدنی را در روزهای زوج قرار دهید..."
          className="w-full text-xs rounded-lg border border-border bg-card p-3 text-foreground placeholder-muted-foreground/60 focus:border-indigo-500 focus:outline-none resize-none"
        />
      </Card>

      <Button type="submit" disabled={isPending} className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
        {isPending ? "در حال ثبت..." : "ثبت نهایی خودارزیابی جمعه"}
      </Button>
    </form>
  );
}
