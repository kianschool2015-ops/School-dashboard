"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Flame,
  Scale,
  Send,
  Sparkles,
  HelpCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import {
  PERSIAN_WEEKDAYS,
  toPersianDigits,
  formatJalaliDate,
} from "@/lib/jalali";
import { submitDailyStudyLogAction } from "@/server/actions/student";
import type { ScheduleItemRecord, DailyCheckinRecord } from "@/types/models";

interface StudyPlanClientProps {
  studentProfileId: string;
  studentName: string;
  mentorName: string;
  weekStartDate: string;
  weekEndDate: string;
  jalaliYear: number;
  jalaliWeekNumber: number;
  currentDayOfWeek: number;
  items: ScheduleItemRecord[];
  todayCheckin?: DailyCheckinRecord | null;
  weeklyMainGoal?: string;
}

const DEFAULT_LEGAL_BLOCKS: Record<number, { subject: string; topic: string; duration: number; volume: string; type: string }[]> = {
  0: [
    { subject: "حقوق مدنی", topic: "قواعد عمومی قراردادها و شرایط صحت عقد (مواد ۱۹۰ تا ۲۱۸ قانون مدنی)", duration: 150, volume: "۲۵ صفحه + ۳۰ تست", type: "STUDY" },
    { subject: "آیین دادرسی مدنی", topic: "صلاحیت مراجع قضایی و ایرادات دادرسی (مواد ۱۰ تا ۹۲)", duration: 120, volume: "۲۰ صفحه + ۲۰ تست", type: "STUDY" },
    { subject: "مرور شبانه و قوانین خاص", topic: "قانون حمایت خانواده و آرای وحدت رویه مرتبط با حقوق مدنی", duration: 60, volume: "متن قوانین", type: "REVIEW" },
  ],
  1: [
    { subject: "حقوق جزا (عمومی و اختصاصی)", topic: "عناصر متشکله جرم و مجازات‌های تعزیری (مواد ۱ تا ۱۰۰ قانون مجازات اسلامی)", duration: 150, volume: "۳۰ صفحه + ۳۰ تست", type: "STUDY" },
    { subject: "آیین دادرسی کیفری", topic: "تحقیقات مقدماتی، قرارهای تأمین و نظارت قضایی", duration: 120, volume: "۲۵ صفحه + ۲۰ تست", type: "STUDY" },
    { subject: "قوانین خاص جزا", topic: "قانون مجازات راجع به انتقال مال غیر و قانون کاهش مجازات حبس تعزیری", duration: 60, volume: "مطالعه تفسیری", type: "STATUTE_READ" },
  ],
  2: [
    { subject: "حقوق تجارت", topic: "اسناد تجارتی (برات، سفته، چک) و الزامات صادرکننده و ظهرنویس", duration: 150, volume: "۲۵ صفحه + ۳۵ تست", type: "STUDY" },
    { subject: "حقوق مدنی", topic: "مسئولیت مدنی و الزامات خارج از قرارداد (غصب، اتلاف و تسبیب)", duration: 120, volume: "۲۰ صفحه + ۲۵ تست", type: "STUDY" },
    { subject: "تست‌زنی جامع", topic: "مجموعه آزمون‌های طبقه‌بندی شده وکالت سنوات قبل", duration: 60, volume: "۴۰ تست زمان‌دار", type: "TEST_PRACTICE" },
  ],
  3: [
    { subject: "آیین دادرسی مدنی", topic: "طرق فوق‌العاده شکایت از آراء (فرجام‌خواهی و اعاده دادرسی)", duration: 150, volume: "۲۵ صفحه + ۳۰ تست", type: "STUDY" },
    { subject: "حقوق جزا (اختصاصی)", topic: "جرایم علیه اموال و مالکیت (کلاهبرداری، سرقت، خیانت در امانت)", duration: 120, volume: "۲۵ صفحه + ۲۵ تست", type: "STUDY" },
    { subject: "متون فقه", topic: "مباحث تحریر الوسیله (کتاب القضاء و الشهادات)", duration: 60, volume: "۱۵ صفحه عربی و ترجمه", type: "STUDY" },
  ],
  4: [
    { subject: "حقوق تجارت", topic: "شرکت‌های سهامی و ورشکستگی تاجر (تصفیه و امور ورشکستگی)", duration: 150, volume: "۳۰ صفحه + ۳۰ تست", type: "STUDY" },
    { subject: "حقوق مدنی", topic: "عقود معین ۱ و ۲ (بیع، اجاره، وکالت، ضمان)", duration: 120, volume: "۲۵ صفحه + ۳۰ تست", type: "STUDY" },
    { subject: "اصول فقه", topic: "مباحث الفاظ، اوامر و نواهی و مفاهیم", duration: 60, volume: "۲۰ صفحه", type: "STUDY" },
  ],
  5: [
    { subject: "جمع‌بندی دروس چهارگانه اصلی", topic: "مرور نکات کلیدی مدنی، جزا، تجارت و آیین دادرسی مدنی", duration: 180, volume: "یادداشت‌های خلاصه‌نویسی", type: "REVIEW" },
    { subject: "آزمون مبحثی آزمایشی", topic: "شبیه‌سازی ۵۰ سوال چهارگزینه‌ای از مباحث هفته با نمره منفی", duration: 90, volume: "۵۰ تست جامع", type: "TEST_PRACTICE" },
    { subject: "تحلیل آزمون و رفع اشکال", topic: "بررسی گزینه‌های نادرست و علامت‌گذاری مواد قانونی مبهم", duration: 60, volume: "تحلیل کارنامه", type: "EXAM_ANALYSIS" },
  ],
  6: [
    { subject: "جمعه: خودارزیابی و گزارش هفتگی", topic: "تکمیل فرم گزارش هفتگی، ثبت ساعت مطالعه دروس، نقاط قوت و ضعف", duration: 60, volume: "فرم خودارزیابی جمعه", type: "REVIEW" },
    { subject: "جبران عقب‌افتادگی‌های مطالعاتی", topic: "مطالعه مباحث ناقص در طول هفته بر اساس اولویت پشتیبان علمی", duration: 120, volume: "بخش‌های علامت‌زده", type: "CLASS" },
  ],
};

export function StudyPlanClient({
  studentProfileId,
  studentName,
  mentorName,
  weekStartDate,
  weekEndDate,
  jalaliYear,
  jalaliWeekNumber,
  currentDayOfWeek,
  items,
  todayCheckin,
  weeklyMainGoal,
}: StudyPlanClientProps) {
  const [selectedDay, setSelectedDay] = useState<number>(currentDayOfWeek);

  // Clean mentor name to avoid double parentheses like: (تعیین‌شده توسط استاد علی کاظمی (پشتیبان علمی)):
  const cleanMentorName = (mentorName || "پشتیبان علمی")
    .replace(/\s*\((?:پشتیبان علمی|پشتیبان آموزشی|پشتیبان)\)/gi, "")
    .trim();

  // Daily Study Log Form State
  const [plannedHours, setPlannedHours] = useState<number>(todayCheckin?.plannedHours || 6);
  const [actualHours, setActualHours] = useState<number>(todayCheckin?.actualHours || 0);
  const [studentNotes, setStudentNotes] = useState<string>(todayCheckin?.studentNotes || "");
  const [rootFailureCause, setRootFailureCause] = useState<string>(todayCheckin?.rootFailureCause || "");
  const [helpRequested, setHelpRequested] = useState<boolean>(todayCheckin?.helpRequested || false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calculate current execution percent
  const executionPercent = plannedHours > 0
    ? Math.min(100, Math.round((actualHours / plannedHours) * 100))
    : 100;

  // Filter items for selected day
  const dayItems = items.filter((it) => it.dayOfWeek === selectedDay);
  const displayItems = dayItems.length > 0 ? dayItems : (DEFAULT_LEGAL_BLOCKS[selectedDay] || []);

  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setIsSubmitting(true);

    try {
      const res = await submitDailyStudyLogAction({
        studentProfileId,
        plannedHours,
        actualHours,
        studentNotes,
        rootFailureCause: executionPercent < 70 ? rootFailureCause : undefined,
        helpRequested,
      });

      if (res.success) {
        setBanner({
          type: "success",
          text: helpRequested
            ? "گزارش مطالعه روزانه ثبت شد و پیام درخواست راهنمایی برای پشتیبان علمی ارسال گردید."
            : "گزارش مطالعه امروز با موفقیت ذخیره شد. خدا قوت!",
        });
      } else {
        setBanner({ type: "error", text: "خطا در ثبت گزارش مطالعه روزانه." });
      }
    } catch {
      setBanner({ type: "error", text: "خطا در ارتباط با سرور." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/student/dashboard"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>بازگشت به داشبورد</span>
            </Link>
          </div>
          <h1 className="text-2xl font-black text-foreground mt-1 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>برنامه هفتگی مطالعه و خودتنظیمی آموزشی</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            جدول زمان‌بندی شنبه تا جمعه (حقوق مدنی، جزا، تجارت، آیین دادرسی) و کارتابل ثبت بازخورد روزانه
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs py-1 px-3 border-primary/40 bg-primary/5 text-primary">
            <Calendar className="h-3.5 w-3.5 ms-1.5" />
            <span>هفته {toPersianDigits(jalaliWeekNumber)} سال {toPersianDigits(jalaliYear)}</span>
          </Badge>
          <Badge variant="secondary" className="text-xs py-1 px-3">
            از شنبه {toPersianDigits(weekStartDate)} تا جمعه {toPersianDigits(weekEndDate)}
          </Badge>
          <Link href="/student/friday-reports">
            <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>گزارشات خودارزیابی جمعه</span>
            </Button>
          </Link>
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            banner.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Weekly Goal Banner if set by mentor */}
      {weeklyMainGoal && (
        <Card className="bg-primary/5 border border-primary/20 shadow-xs">
          <CardContent className="p-4 flex items-start gap-3">
            <Flame className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-primary">
                هدف راهبردی هفته (تعیین‌شده توسط {cleanMentorName}):
              </span>
              <p className="text-xs text-foreground mt-0.5 leading-relaxed">{weeklyMainGoal}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saturday-to-Friday Day Selector Bar */}
      <div className="bg-card border border-border rounded-xl p-2 shadow-xs">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {PERSIAN_WEEKDAYS.map((dayName, idx) => {
            const isToday = idx === currentDayOfWeek;
            const isSelected = idx === selectedDay;

            return (
              <button
                key={dayName}
                onClick={() => setSelectedDay(idx)}
                type="button"
                className={`py-3 px-1 sm:px-3 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-bold shadow-sm"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                } ${isToday && !isSelected ? "border-2 border-primary/40 text-primary font-bold" : ""}`}
              >
                <span className="text-xs sm:text-sm">{dayName}</span>
                {isToday && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-normal ${
                      isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    امروز
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Study Blocks for Selected Day */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <span>واحدهای مطالعاتی {PERSIAN_WEEKDAYS[selectedDay]}</span>
            </h2>
            <Badge variant="outline" className="text-xs">
              {toPersianDigits(displayItems.length)} بخش مصوب
            </Badge>
          </div>

          <div className="space-y-3">
            {displayItems.map((block, i) => {
              const isDefault = !("id" in block);
              const subject = block.subject;
              const topic = "topicDescription" in block ? block.topicDescription : block.topic;
              const duration = "targetDurationMinutes" in block ? block.targetDurationMinutes : block.duration;
              const volume = "targetVolume" in block ? block.targetVolume : block.volume;
              const status = "status" in block ? block.status : "NOT_DONE";

              const badgeColor =
                subject.includes("مدنی")
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                  : subject.includes("جزا")
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  : subject.includes("تجارت")
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : subject.includes("دادرسی")
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30";

              return (
                <Card
                  key={i}
                  className="border border-border hover:border-primary/40 transition-colors shadow-xs"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeColor}`}
                        >
                          {subject}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {toPersianDigits(duration)} دقیقه
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {volume && (
                          <Badge variant="outline" className="text-[11px] font-normal">
                            حجم هدف: {toPersianDigits(volume)}
                          </Badge>
                        )}
                        {!isDefault && (
                          <Badge
                            variant={
                              status === "DONE"
                                ? "green"
                                : status === "PARTIAL"
                                ? "yellow"
                                : "outline"
                            }
                            className="text-[11px]"
                          >
                            {status === "DONE"
                              ? "تکمیل‌شده"
                              : status === "PARTIAL"
                              ? "مطالعه ناقص"
                              : "در انتظار اجرا"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed break-words">
                      {topic}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right 1 Column: Daily Study Log Card («ثبت نتیجه و بازخورد مطالعه امروز») */}
        <div className="space-y-4">
          <Card className="border-2 border-primary/30 shadow-md bg-card">
            <CardHeader className="pb-3 border-b border-border bg-primary/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>ثبت نتیجه و بازخورد مطالعه امروز</span>
                </CardTitle>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {toPersianDigits(formatJalaliDate(new Date()))}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                ساعات واقعی مطالعه خود را ثبت نمایید تا در نمودار پیشرفت و ارزیابی پشتیبان منعکس گردد.
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleSaveDailyLog} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                      ساعت مصوب برنامه ({toPersianDigits(plannedHours)} ساعت):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="16"
                        step="0.5"
                        value={plannedHours}
                        onChange={(e) => setPlannedHours(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground font-mono"
                        required
                      />
                      <span className="absolute end-2.5 top-2 text-[10px] text-muted-foreground">ساعت</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      ساعت مطالعه واقعی ({toPersianDigits(actualHours)} ساعت):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={actualHours}
                        onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border-2 border-primary/40 focus:border-primary rounded-lg bg-background text-foreground font-mono font-bold"
                        required
                      />
                      <span className="absolute end-2.5 top-2 text-[10px] text-muted-foreground">ساعت</span>
                    </div>
                  </div>
                </div>

                {/* Progress calculation */}
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">
                      درصد تحقق برنامه امروز ({toPersianDigits(actualHours)} از {toPersianDigits(plannedHours)} ساعت):
                    </span>
                    <span
                      className={`font-bold font-mono ${
                        executionPercent >= 80
                          ? "text-emerald-600"
                          : executionPercent >= 50
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      %{toPersianDigits(executionPercent)}
                    </span>
                  </div>
                  <Progress value={executionPercent} className="h-2" />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-medium pt-1">
                    <span>مصوب: {toPersianDigits(plannedHours)} ساعت</span>
                    <span>اجراشده: {toPersianDigits(actualHours)} ساعت</span>
                  </div>
                </div>

                {/* Root cause if execution < 70% */}
                {executionPercent < 70 && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="block text-xs font-semibold text-rose-700 dark:text-rose-400">
                      علت اصلی عدم تحقق کامل برنامه (جهت رفع اشکال پشتیبان):
                    </label>
                    <select
                      value={rootFailureCause}
                      onChange={(e) => setRootFailureCause(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-rose-300 dark:border-rose-800 rounded-lg bg-background text-foreground"
                    >
                      <option value="">انتخاب علت اصلی...</option>
                      <option value="اشتغال و ضیق وقت کاری">اشتغال و ضیق وقت کاری</option>
                      <option value="سختی یا عدم درک مطلب آموزشی">سختی یا عدم درک مطلب آموزشی</option>
                      <option value="خستگی مفرط یا کسالت جسمی">خستگی مفرط یا کسالت جسمی</option>
                      <option value="تداخل وظایف خانوادگی و شخصی">تداخل وظایف خانوادگی و شخصی</option>
                      <option value="اضطراب و افت انگیزه تحصیلی">اضطراب و افت انگیزه تحصیلی</option>
                      <option value="سایر موارد">سایر موارد</option>
                    </select>
                  </div>
                )}

                {/* Student Notes */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    یادداشت، موانع و بازخورد مطالعه امروز:
                  </label>
                  <textarea
                    rows={3}
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    placeholder="نکات مهم، موادی از قانون که برایتان مبهم بود یا بازخورد برای پشتیبان..."
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground leading-relaxed placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Help Requested Checkbox */}
                <label className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg cursor-pointer text-xs text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={helpRequested}
                    onChange={(e) => setHelpRequested(e.target.checked)}
                    className="mt-0.5 rounded border-amber-500"
                  />
                  <div>
                    <span className="font-bold flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                      درخواست راهنمایی و تماس تلفنی از پشتیبان
                    </span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                      در صورت فعال‌سازی، هشدار فوری در کارتابل پشتیبان شما ثبت شده و در ساعات پاسخگویی با شما تماس می‌گیرد.
                    </p>
                  </div>
                </label>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground text-xs h-9 gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "در حال ذخیره‌سازی..." : "ثبت نتیجه و بازخورد مطالعه امروز"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
