"use client";

import React, { useState, useTransition } from "react";
import {
  PhoneCall,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Power,
  Sparkles,
  Info,
  Radio,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateMentorCallingWindowAction } from "@/server/actions/voip";
import { toPersianDigits, PERSIAN_WEEKDAYS } from "@/lib/jalali";
import type { MentorCallingWindowRecord } from "@/types/models";

interface CallingScheduleClientProps {
  initialWindow: MentorCallingWindowRecord | null;
  mentorName: string;
  mentorId: string;
  sipExtension?: string | null;
  isOpenNow: boolean;
  liveMessage: string;
}

const PRESETS = [
  {
    label: "شنبه تا چهارشنبه، ۱۷:۰۰ الی ۲۰:۰۰ (پیش‌فرض مشاهیر)",
    days: [0, 1, 2, 3, 4],
    start: "17:00",
    end: "20:00",
  },
  {
    label: "شنبه تا پنج‌شنبه، ۱۸:۰۰ الی ۲۱:۰۰ (نوبت عصرگاهی)",
    days: [0, 1, 2, 3, 4, 5],
    start: "18:00",
    end: "21:00",
  },
  {
    label: "همه روزه، ۰۸:۰۰ الی ۲۳:۰۰ (بازه آزمایشی گسترده)",
    days: [0, 1, 2, 3, 4, 5, 6],
    start: "08:00",
    end: "23:00",
  },
];

export function CallingScheduleClient({
  initialWindow,
  mentorName,
  mentorId,
  sipExtension,
  isOpenNow,
  liveMessage,
}: CallingScheduleClientProps) {
  const [startTime, setStartTime] = useState(initialWindow?.startTime || "17:00");
  const [endTime, setEndTime] = useState(initialWindow?.endTime || "20:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    initialWindow?.daysOfWeek || [0, 1, 2, 3, 4]
  );
  const [isActive, setIsActive] = useState<boolean>(
    initialWindow?.isActive ?? true
  );
  const [announcement, setAnnouncement] = useState(
    initialWindow?.announcement || "پاسخگویی مستقیم تلفنی به سوالات داوطلبان و رفع اشکال آموزشی"
  );

  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const toggleDay = (dayIndex: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setDaysOfWeek(preset.days);
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysOfWeek.length === 0) {
      setNotification({
        type: "error",
        text: "حداقل یک روز در هفته باید جهت پاسخگویی انتخاب شود.",
      });
      return;
    }

    startTransition(async () => {
      const res = await updateMentorCallingWindowAction({
        mentorId,
        startTime,
        endTime,
        daysOfWeek,
        isActive,
        announcement,
      });

      if (res.success) {
        setNotification({ type: "success", text: res.message });
      } else {
        setNotification({ type: "error", text: "خطا در ذخیره تنظیمات." });
      }
      setTimeout(() => setNotification(null), 5000);
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-[#004071] to-[#002847] p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3 backdrop-blur-sm">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>تنظیمات ارتباط تلفنی معکوس استریسک AMI</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">ساعات پاسخگویی تلفنی پشتیبان</h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-xl">
            تعیین پنجره زمانی پاسخگویی تلفنی روزانه به داوطلبان تحت سرپرستی شما. دکمه تماس در پنل داوطلب صرفاً در ساعات انتخابی فعال خواهد بود.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-start">
          <div className="text-[11px] text-blue-100">داخلی تلفن VoIP شما:</div>
          <div className="text-lg font-black font-mono mt-0.5 text-amber-300">
            {sipExtension ? toPersianDigits(sipExtension) : "تعیین‌نشده"}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center gap-2.5 border shadow-sm animate-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-semibold">{notification.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>تعیین ساعات و روزهای کاری پاسخگویی</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Active Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      وضعیت کلی پاسخگویی مستقیم تلفنی
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      با غیرفعال‌سازی این گزینه، دکمه تماس برای داوطلبان به حالت موقت غیرفعال تغییر می‌یابد.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs border cursor-pointer select-none ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-400/30 hover:bg-slate-500/20"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    <span>{isActive ? "فعال — آماده پذیرش تماس" : "غیرفعال — خارج از دسترس"}</span>
                  </button>
                </div>

                {/* Presets */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-2">
                    الگوهای زمان‌بندی پیشنهادی:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="p-2.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 text-start text-xs font-medium transition-colors"
                      >
                        <div className="font-bold text-foreground text-[11px] mb-1">
                          {p.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {toPersianDigits(p.start)} - {toPersianDigits(p.end)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Days of Week Selection */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-2">
                    روزهای پاسخگویی در هفته <span className="text-destructive">*</span>:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {PERSIAN_WEEKDAYS.map((dayName, idx) => {
                      const selected = daysOfWeek.includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center ${
                            selected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">
                      ساعت شروع پاسخگویی:
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1.5">
                      ساعت پایان پاسخگویی:
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                {/* Announcement Message */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    پیام یا اطلاعیه به داوطلبان (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="مثال: پاسخگویی به سوالات حقوق مدنی و برنامه هفته جاری"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full md:w-auto px-6 h-10 bg-[#004071] hover:bg-[#003056] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره تنظیمات...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ذخیره ساعات پاسخگویی</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Student View Preview */}
        <div className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="p-4 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>پیش‌نمایش زنده در پنل داوطلب</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="p-3 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">وضعیت زنده (اکنون):</span>
                  <Badge
                    variant={isOpenNow ? "green" : "outline"}
                    className="text-[10px] px-2 py-0.5"
                  >
                    {isOpenNow ? "در ساعت پاسخگویی" : "خارج از بازه پاسخگویی"}
                  </Badge>
                </div>
                <p className="text-[11px] text-foreground font-medium">
                  {toPersianDigits(liveMessage)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 text-xs space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  <span>مکانیزم برقراری تماس دوطرفه:</span>
                </div>
                <p className="text-[11px]">
                  ۱. با فشردن دکمه توسط داوطلب در ساعت مجاز، سرور تلفنی مشاهیر دانش فوراً داخلی زویپر شما ({sipExtension ? toPersianDigits(sipExtension) : "۱۰۱"}) را به صدا درمی‌آورد.
                </p>
                <p className="text-[11px]">
                  ۲. به محض پاسخ دادن شما به تماس، سیستم شماره تلفن داوطلب را شماره‌گیری کرده و خطوط را متصل می‌سازد.
                </p>
                <p className="text-[11px]">
                  ۳. شماره موبایل طرفین محرمانه مانده و سرشماره رسمی مشاهیر ارسال می‌شود.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
