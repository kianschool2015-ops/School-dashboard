"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Brain,
  Award,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { submitOnboardingAction } from "@/server/actions/student";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  // Step 1: Capacity & Constraints
  const [employment, setEmployment] = useState<"FULL_TIME" | "PART_TIME" | "FREELANCE" | "UNEMPLOYED">("UNEMPLOYED");
  const [studyHoursCap, setStudyHoursCap] = useState(8);
  const [attempts, setAttempts] = useState(0);
  const [goal, setGoal] = useState("قبولی با رتبه زیر ۱۰۰ در کانون وکلای مرکز");

  // Step 2: Learning Style
  const [learningStyle, setLearningStyle] = useState("STRUCTURAL");

  // Step 3: Baseline Diagnostic
  const [baselineScore, setBaselineScore] = useState(55);

  const handleFinish = () => {
    startTransition(async () => {
      await submitOnboardingAction({
        studentProfileId: "profile_stu_1",
        employmentStatus: employment,
        workdayStudyHoursCap: studyHoursCap,
        previousBarExamAttempts: attempts,
        masterclassGoal: goal,
        learningStyle,
        baselineScore,
      });
      router.push("/student/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicator Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-foreground font-bold">
            مرحله {toPersianDigits(step)} از ۳:{" "}
            {step === 1
              ? "پرسشنامه جامع ظرفیت و قیود (P01-P15)"
              : step === 2
              ? "تشخیص سبک یادگیری و متدولوژی (L01-L06)"
              : "آزمون تشخیصی پایه و نقطه شروع"}
          </span>
          <span className="text-muted-foreground persian-nums">
            %{toPersianDigits(Math.round((step / 3) * 100))}
          </span>
        </div>
        <Progress value={(step / 3) * 100} indicatorClassName="bg-indigo-500" />
      </div>

      <Card className="border-border bg-card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center space-x-2 space-x-reverse">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>مرحله ۱: بررسی ظرفیت واقعی و موانع زمانی</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                برنامه‌ریزی آموزشی مشاهیر دانش بر اساس واقعیت‌های زندگی و قیود واقعی شما تدوین می‌شود.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">وضعیت اشتغال:</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: "UNEMPLOYED", label: "تمام‌وقت داوطلب (بدون اشتغال)" },
                    { id: "FULL_TIME", label: "شاغل تمام‌وقت (بیش از ۳۵ ساعت)" },
                    { id: "PART_TIME", label: "شاغل پاره‌وقت / کارآموز" },
                    { id: "FREELANCE", label: "آزاد و پروژه‌ای" },
                  ] as const).map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setEmployment(emp.id)}
                      className={`p-2.5 rounded-lg border text-xs text-start transition-colors ${
                        employment === emp.id
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-white font-medium"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {emp.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">سقف ساعت مطالعه روزانه در روزهای کاری:</span>
                  <span className="font-bold text-foreground persian-nums">
                    {toPersianDigits(studyHoursCap)} ساعت
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={14}
                  value={studyHoursCap}
                  onChange={(e) => setStudyHoursCap(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">تعداد شرکت در آزمون وکالت گذشته:</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAttempts(num)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${
                        attempts === num
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-white"
                          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {num === 0 ? "بار اول" : `${toPersianDigits(num)} بار`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">هدف‌گذاری نهایی در کانون / مرکز وکلا:</label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button size="sm" onClick={() => setStep(2)}>
                <span>مرحله بعد: سبک یادگیری</span>
                <ArrowLeft className="h-4 w-4 me-1.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center space-x-2 space-x-reverse">
                <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>مرحله ۲: پرسشنامه اختصاصی سبک یادگیری (L01-L06)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                تشخیص کانال ادراکی قالب (شنیداری، متنی، ساختاری و نموداری، کاربردی).
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "STRUCTURAL",
                  title: "سبک ساختاری و نموداری (نمودار درختی و جداول تطبیقی)",
                  desc: "یادگیری سریع‌تر از طریق شاخه‌بندی مواد قانونی، دسته‌بندی عقود معین و دیاگرام صلاحیت‌ها.",
                },
                {
                  id: "TEXTUAL",
                  title: "سبک متنی و نص‌خوانی عمیق (نظم قانونی)",
                  desc: "مطالعه دقیق خط به خط قانون مدنی، آرای وحدت رویه و حاشیه‌نویسی نکات آزمونی.",
                },
                {
                  id: "AUDITORY",
                  title: "سبک شنیداری و کلاسی",
                  desc: "تسلط بر مباحث با گوش دادن به ویس‌های تدریس اساتید و تکرار صوتی مباحث کیفری.",
                },
                {
                  id: "PRACTICAL",
                  title: "سبک تست‌محور و کاربردی",
                  desc: "درک مواد قانونی پس از مواجهه با تست‌های سنوات گذشته و تحلیل تله‌های گزینه‌ها.",
                },
              ].map((style) => (
                <div
                  key={style.id}
                  onClick={() => setLearningStyle(style.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    learningStyle === style.id
                      ? "border-indigo-500 bg-indigo-500/10 shadow-md shadow-indigo-500/5"
                      : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{style.title}</span>
                    <Badge variant={learningStyle === style.id ? "tier" : "outline"}>
                      {learningStyle === style.id ? "انتخاب شده" : "گزینه"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{style.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-3">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowRight className="h-4 w-4 ms-1.5" />
                <span>مرحله قبل</span>
              </Button>
              <Button size="sm" onClick={() => setStep(3)}>
                <span>مرحله بعد: آزمون پایه</span>
                <ArrowLeft className="h-4 w-4 me-1.5" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center space-x-2 space-x-reverse">
                <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>مرحله ۳: آزمون تشخیصی پایه (Baseline Diagnostic)</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                تخمین نقطه آغازین شما در دروس ۶ گانه آزمون وکالت جهت محاسبه شاخص رشد و دلتا در طول دوره.
              </p>
            </div>

            <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">میانگین تخمینی نمره پایه شما:</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
                  %{toPersianDigits(baselineScore)}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                value={baselineScore}
                onChange={(e) => setBaselineScore(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="text-[11px] text-muted-foreground">
                پشتیبان اختصاصی بر اساس این درصد، هفته‌های نخست را با شیب ملایم برای تثبیت مفاهیم تنظیم خواهد کرد.
              </p>
            </div>

            <div className="flex justify-between pt-3">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowRight className="h-4 w-4 ms-1.5" />
                <span>مرحله قبل</span>
              </Button>
              <Button
                size="sm"
                variant="emerald"
                onClick={handleFinish}
                disabled={isPending}
                className="min-w-32"
              >
                <CheckCircle className="h-4 w-4 ms-1.5" />
                <span>{isPending ? "در حال ثبت..." : "تکمیل و ورود به داشبورد"}</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
