"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  TrendingUp,
  UserCheck,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";

export type GanttTimeHorizon = "TODAY" | "THREE_DAYS" | "WEEK" | "MONTH" | "CUMULATIVE";

export interface GanttItem {
  id: string;
  title: string;
  category: string; // Subject for student (e.g. "حقوق مدنی") or Task type for mentor/supervisor
  startHourOrDay: number; // 0-24 for daily, 1-3 for 3-days, 0-6 for week (Sat-Fri), 1-30 for month, 1-12 for cumulative
  duration: number; // in hours or days
  actualDuration: number;
  status: "COMPLETED" | "PARTIAL" | "NOT_STARTED";
  notes?: string;
  progressPercent: number;
}

interface MultiHorizonGanttProps {
  entityType: "STUDENT" | "MENTOR" | "SUPERVISOR";
  entityName?: string;
  readOnlyAuditorRole?: "SUPERVISOR" | "CEO";
  realItems?: any[];
}

export function MultiHorizonGantt({
  entityType,
  entityName = "داوطلب آزمون وکالت",
  readOnlyAuditorRole,
  realItems,
}: MultiHorizonGanttProps) {
  const [horizon, setHorizon] = useState<GanttTimeHorizon>("WEEK");
  const [selectedItem, setSelectedItem] = useState<GanttItem | null>(null);

  // Derive real items if passed
  const hasRealItems = Array.isArray(realItems) && realItems.length > 0;

  const derivedWeekItems: GanttItem[] = hasRealItems
    ? realItems.map((it, idx) => {
        const durHours = Math.max(0.5, Math.round(((it.targetDurationMinutes || 120) / 60) * 10) / 10);
        const actualH = it.actualDurationMinutes
          ? Math.round((it.actualDurationMinutes / 60) * 10) / 10
          : it.status === "DONE"
          ? durHours
          : it.status === "PARTIAL"
          ? Math.round(durHours * 0.5 * 10) / 10
          : 0;

        return {
          id: it.id || `real_w_${idx}`,
          title: `${it.subject}: ${it.topicDescription || "مبحث مقرر"}`,
          category: it.subject || "دروس تخصصی",
          startHourOrDay: typeof it.dayOfWeek === "number" ? it.dayOfWeek : 0,
          duration: durHours,
          actualDuration: actualH,
          status: it.status === "DONE" ? "COMPLETED" : it.status === "PARTIAL" ? "PARTIAL" : "NOT_STARTED",
          progressPercent: it.status === "DONE" ? 100 : it.status === "PARTIAL" ? 50 : 0,
          notes: it.studentNote || it.targetVolume || undefined,
        };
      })
    : [];

  const derivedTodayItems: GanttItem[] = hasRealItems
    ? (() => {
        let curHour = 7.5;
        // Group by today or fallback to first items
        return realItems.slice(0, 5).map((it, idx) => {
          const durHours = Math.max(1, Math.round(((it.targetDurationMinutes || 120) / 60) * 10) / 10);
          const startH = curHour;
          curHour += durHours + 0.5;
          const actualH = it.actualDurationMinutes
            ? Math.round((it.actualDurationMinutes / 60) * 10) / 10
            : it.status === "DONE"
            ? durHours
            : it.status === "PARTIAL"
            ? Math.round(durHours * 0.5 * 10) / 10
            : 0;

          return {
            id: it.id || `real_d_${idx}`,
            title: `${it.subject}: ${it.topicDescription || "مطالعه و حل تست"}`,
            category: it.subject || "دروس تخصصی",
            startHourOrDay: Math.min(20, startH),
            duration: durHours,
            actualDuration: actualH,
            status: it.status === "DONE" ? "COMPLETED" : it.status === "PARTIAL" ? "PARTIAL" : "NOT_STARTED",
            progressPercent: it.status === "DONE" ? 100 : it.status === "PARTIAL" ? 50 : 0,
            notes: it.studentNote || it.targetVolume || undefined,
          };
        });
      })()
    : [];

  // Mocked rich datasets tailored to each horizon and entity
  const studentData: Record<GanttTimeHorizon, { title: string; subtitle: string; columns: string[]; items: GanttItem[] }> = {
    TODAY: {
      title: "زمان‌بندی مباحث مطالعه امروز",
      subtitle: hasRealItems
        ? "مباحث مطالعاتی ثبت‌شده در برنامه راهبردی امروز"
        : "شنبه (۲۴ ساعت شبانه‌روز) - ساعت ۰۶:۰۰ تا ۲۴:۰۰",
      columns: ["۰۶:۰۰", "۰۹:۰۰", "۱۲:۰۰", "۱۵:۰۰", "۱۸:۰۰", "۲۱:۰۰", "۲۴:۰۰"],
      items: derivedTodayItems.length > 0 ? derivedTodayItems : [
        { id: "1", title: "حقوق مدنی (تعهدات و عقود)", category: "حقوق مدنی", startHourOrDay: 7, duration: 3.5, actualDuration: 3, status: "COMPLETED", progressPercent: 100, notes: "ماده ۱۸۳ تا ۲۳۰ قانون مدنی - ۴۰ تست" },
        { id: "2", title: "آیین دادرسی مدنی (صلاحیت محاکم)", category: "آیین دادرسی مدنی", startHourOrDay: 11, duration: 2.5, actualDuration: 2.5, status: "COMPLETED", progressPercent: 100, notes: "مواد ۱۰ تا ۴۰ ق.آ.د.م - خلاصه نویسی" },
        { id: "3", title: "حقوق تجارت (اسناد تجاری و سفته)", category: "حقوق تجارت", startHourOrDay: 15, duration: 2.5, actualDuration: 1.5, status: "PARTIAL", progressPercent: 60, notes: "بررسی مواد ظهرنویسی و ضمانت برات" },
        { id: "4", title: "حقوق جزا (قواعد عمومی جرم)", category: "حقوق جزا", startHourOrDay: 18.5, duration: 2, actualDuration: 0, status: "NOT_STARTED", progressPercent: 0, notes: "مباحث معاونت و شروع به جرم" },
        { id: "5", title: "مرور شبانه و تست‌زنی سرعتی", category: "مرور و تثبیت", startHourOrDay: 21, duration: 1.5, actualDuration: 0, status: "NOT_STARTED", progressPercent: 0, notes: "تست‌های کنکوری ۱۰ سال اخیر" },
      ],
    },
    THREE_DAYS: {
      title: "عملکرد ۳ روز اخیر",
      subtitle: "پنج‌شنبه، جمعه و امروز (شنبه)",
      columns: ["پنج‌شنبه", "جمعه", "امروز (شنبه)"],
      items: [
        { id: "3d-1", title: "حقوق مدنی - مطالعه تشریحی و تست", category: "حقوق مدنی", startHourOrDay: 0.1, duration: 2.8, actualDuration: 2.5, status: "COMPLETED", progressPercent: 90 },
        { id: "3d-2", title: "آیین دادرسی کیفری - قرارها و تحقیقات", category: "آیین دادرسی کیفری", startHourOrDay: 0.2, duration: 1.8, actualDuration: 1.8, status: "COMPLETED", progressPercent: 100 },
        { id: "3d-3", title: "آزمون آزمایشی جامع و تحلیل کارنامه", category: "آزمون آزمایشی", startHourOrDay: 1.1, duration: 0.9, actualDuration: 0.9, status: "COMPLETED", progressPercent: 100 },
        { id: "3d-4", title: "حقوق جزا و آیین دادرسی مدنی", category: "دروس تخصصی", startHourOrDay: 2.0, duration: 0.9, actualDuration: 0.6, status: "PARTIAL", progressPercent: 65 },
      ],
    },
    WEEK: {
      title: "زمان‌بندی جامع هفته جاری (شنبه تا جمعه)",
      subtitle: hasRealItems
        ? "واحدهای مطالعاتی استخراج‌شده از برنامه راهبردی مصوب هفتگی"
        : "برنامه هفتگی مصوب سرپرستی و پشتیبان آموزشی",
      columns: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"],
      items: derivedWeekItems.length > 0 ? derivedWeekItems : [
        { id: "w-1", title: "حقوق مدنی (قواعد عمومی و اموال)", category: "حقوق مدنی", startHourOrDay: 0, duration: 4.8, actualDuration: 4.8, status: "COMPLETED", progressPercent: 100, notes: "هدف هفتگی: تسلط بر ماده ۱۰ تا ۳۰۰ قانون مدنی" },
        { id: "w-2", title: "آیین دادرسی مدنی (طرق اعتراض به آرا)", category: "آیین دادرسی مدنی", startHourOrDay: 1, duration: 3.5, actualDuration: 3.0, status: "COMPLETED", progressPercent: 85, notes: "تجدیدنظرخواهی و فرجام‌خواهی" },
        { id: "w-3", title: "حقوق تجارت (شرکت‌های سهامی و با مسئولیت محدود)", category: "حقوق تجارت", startHourOrDay: 2, duration: 3, actualDuration: 2.5, status: "COMPLETED", progressPercent: 80, notes: "لایحه اصلاحی قسمتی از قانون تجارت" },
        { id: "w-4", title: "اصول فقه (مباحث الفاظ، اوامر و نواهی)", category: "اصول فقه", startHourOrDay: 3, duration: 3, actualDuration: 1.5, status: "PARTIAL", progressPercent: 50, notes: "مطالعه تست‌های سنوات قبل" },
        { id: "w-5", title: "حقوق جزا و آیین دادرسی کیفری", category: "دروس کیفری", startHourOrDay: 4, duration: 2.8, actualDuration: 0, status: "NOT_STARTED", progressPercent: 0, notes: "مباحث ادله اثبات در امور کیفری" },
        { id: "w-6", title: "مبحث جبرانی و تثبیت آخر هفته", category: "جبرانی", startHourOrDay: 5, duration: 1.8, actualDuration: 0, status: "NOT_STARTED", progressPercent: 0, notes: "پوشش سرفصل‌های عقب‌افتاده اصول فقه" },
      ],
    },
    MONTH: {
      title: "زمان‌بندی پیشرفت ماه جاری",
      subtitle: "عملکرد ۴ هفته مطالعاتی دوره کانون وکلا",
      columns: ["هفته اول", "هفته دوم", "هفته سوم", "هفته چهارم"],
      items: [
        { id: "m-1", title: "تسلط بر حقوق مدنی (دوره اول)", category: "حقوق مدنی", startHourOrDay: 0, duration: 3.8, actualDuration: 3.8, status: "COMPLETED", progressPercent: 100 },
        { id: "m-2", title: "آیین دادرسی مدنی و اسناد تجاری", category: "آد‌م و تجارت", startHourOrDay: 0.5, duration: 3.2, actualDuration: 2.8, status: "COMPLETED", progressPercent: 88 },
        { id: "m-3", title: "حقوق جزا و جرم‌شناسی", category: "جزا و جرم‌شناسی", startHourOrDay: 1.2, duration: 2.5, actualDuration: 2.0, status: "COMPLETED", progressPercent: 80 },
        { id: "m-4", title: "اصول فقه و متون فقه تحلیلی", category: "فقه و اصول", startHourOrDay: 2.0, duration: 1.8, actualDuration: 1.0, status: "PARTIAL", progressPercent: 55 },
      ],
    },
    CUMULATIVE: {
      title: "زمان‌بندی تجمعی از آغاز دوره تا کنون",
      subtitle: "روند پیشرفت کلی داوطلب از تاریخ ثبت‌نام در سامانه مشاهیر دانش",
      columns: ["مهر ۱۴۰۳", "آبان ۱۴۰۳", "آذر ۱۴۰۳", "دی ۱۴۰۳", "بهمن ۱۴۰۳", "اسفند ۱۴۰۳"],
      items: [
        { id: "c-1", title: "مطالعه پایه و مفاهیم بنیادین ۶ ماده امتحانی", category: "دوره پایه", startHourOrDay: 0, duration: 2.5, actualDuration: 2.5, status: "COMPLETED", progressPercent: 100 },
        { id: "c-2", title: "تست‌زنی موضوعی و تحلیل آرا وحدت رویه", category: "تست و تحلیل", startHourOrDay: 1.5, duration: 2.2, actualDuration: 2.2, status: "COMPLETED", progressPercent: 100 },
        { id: "c-3", title: "مرحله تسلط و شبیه‌سازی آزمون کانون وکلا", category: "شبیه‌سازی", startHourOrDay: 3.0, duration: 2.5, actualDuration: 1.5, status: "PARTIAL", progressPercent: 60 },
      ],
    },
  };

  const mentorData: Record<GanttTimeHorizon, { title: string; subtitle: string; columns: string[]; items: GanttItem[] }> = {
    TODAY: {
      title: "زمان‌بندی فعالیت و تماس‌های پشتیبان (امروز)",
      subtitle: "ساعت ۰۸:۰۰ الی ۲۲:۰۰",
      columns: ["۰۸:۰۰", "۱۰:۰۰", "۱۲:۰۰", "۱۴:۰۰", "۱۶:۰۰", "۱۸:۰۰", "۲۰:۰۰", "۲۲:۰۰"],
      items: [
        { id: "men-1", title: "بررسی گزارش‌های مطالعه صبحگاهی (۱۲ داوطلب)", category: "ارزیابی گزارش", startHourOrDay: 8.5, duration: 2.5, actualDuration: 2.5, status: "COMPLETED", progressPercent: 100 },
        { id: "men-2", title: "تماس‌های مشاوره تخصصی و رفع انسداد (۶ داوطلب)", category: "تماس تلفنی", startHourOrDay: 12, duration: 3, actualDuration: 3, status: "COMPLETED", progressPercent: 100 },
        { id: "men-3", title: "شخصی‌سازی برنامه‌های هفتگی داوطلبان پرریسک", category: "برنامه‌ریزی", startHourOrDay: 16.5, duration: 2.5, actualDuration: 2, status: "PARTIAL", progressPercent: 80 },
        { id: "men-4", title: "رسیدگی به پیام‌ها و پاسخ به اشکالات حقوقی", category: "پیام‌رسان", startHourOrDay: 19.5, duration: 2, actualDuration: 0, status: "NOT_STARTED", progressPercent: 0 },
      ],
    },
    THREE_DAYS: {
      title: "عملکرد ۳ روز اخیر پشتیبان",
      subtitle: "رسیدگی به پایش عارضه‌یابی و هشدارهای تحصیلی",
      columns: ["پنج‌شنبه", "جمعه", "امروز"],
      items: [
        { id: "men-3d-1", title: "حل هشدارهای قطع گزارش داوطلبان", category: "پایش بحران", startHourOrDay: 0, duration: 2.8, actualDuration: 2.8, status: "COMPLETED", progressPercent: 100 },
        { id: "men-3d-2", title: "ارسال بازخورد آزمون‌های جامع", category: "ارزیابی آزمون", startHourOrDay: 0.5, duration: 2.0, actualDuration: 2.0, status: "COMPLETED", progressPercent: 100 },
        { id: "men-3d-3", title: "پیگیری تیکت‌های ارجاعی و تماس با داوطلب", category: "مشاوره", startHourOrDay: 1.5, duration: 1.2, actualDuration: 1.2, status: "COMPLETED", progressPercent: 100 },
      ],
    },
    WEEK: {
      title: "عملکرد هفتگی پشتیبان (شنبه تا جمعه)",
      subtitle: "پایش کامل ۳۵ داوطلب تحت نظارت",
      columns: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"],
      items: [
        { id: "men-w-1", title: "تخصیص برنامه هفتگی به ۳۵ داوطلب", category: "برنامه هفتگی", startHourOrDay: 0, duration: 1.8, actualDuration: 1.8, status: "COMPLETED", progressPercent: 100 },
        { id: "men-w-2", title: "پایش نرخ مطالعه روزانه و ثبت هشدارها", category: "پایش مستمر", startHourOrDay: 0, duration: 6.8, actualDuration: 5.5, status: "COMPLETED", progressPercent: 90 },
        { id: "men-w-3", title: "جلسات تحلیل کارنامه آزمون‌های مرحله‌ای", category: "تحلیل کارنامه", startHourOrDay: 2, duration: 3.5, actualDuration: 3.0, status: "COMPLETED", progressPercent: 85 },
        { id: "men-w-4", title: "جلسه هم‌اندیشی با سرپرست آموزشی", category: "جلسه سرپرستی", startHourOrDay: 4, duration: 1, actualDuration: 1, status: "COMPLETED", progressPercent: 100 },
      ],
    },
    MONTH: {
      title: "بازدهی ماهانه پشتیبان",
      subtitle: "ارزیابی پایبندی داوطلبان تحت نظارت به برنامه‌ها",
      columns: ["هفته اول", "هفته دوم", "هفته سوم", "هفته چهارم"],
      items: [
        { id: "men-m-1", title: "کاهش نرخ انصراف از مطالعه و استمرار تحصیلی", category: "رسیدگی به داوطلبان", startHourOrDay: 0, duration: 3.9, actualDuration: 3.9, status: "COMPLETED", progressPercent: 100 },
        { id: "men-m-2", title: "افزایش میانگین ساعات مطالعه گروه داوطلبان از ۵.۲ به ۷.۴ ساعت", category: "شاخص عملکرد", startHourOrDay: 0.5, duration: 3.2, actualDuration: 3.0, status: "COMPLETED", progressPercent: 94 },
      ],
    },
    CUMULATIVE: {
      title: "روند تجمیعی کل دوره پشتیبان",
      subtitle: "شاخص موفقیت داوطلبان در آزمون‌های ادواری کانون وکلا",
      columns: ["مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"],
      items: [
        { id: "men-c-1", title: "هدایت ۳ دوره آموزشی موفق با نرخ قبولی بالای ۸۲٪", category: "دستاورد کلان", startHourOrDay: 0, duration: 5.8, actualDuration: 5.8, status: "COMPLETED", progressPercent: 100 },
      ],
    },
  };

  const currentDataset = entityType === "STUDENT" ? studentData[horizon] : mentorData[horizon];

  // Calculate totals
  const totalPlanned = currentDataset.items.reduce((acc, curr) => acc + curr.duration, 0);
  const totalActual = currentDataset.items.reduce((acc, curr) => acc + curr.actualDuration, 0);
  const avgProgress = Math.round(
    currentDataset.items.reduce((acc, curr) => acc + curr.progressPercent, 0) / (currentDataset.items.length || 1)
  );

  return (
    <Card className="shadow-sm border border-border">
      <CardHeader className="border-b border-border bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg font-bold">
                برنامه مطالعاتی و کارنمای پیشرفت هفتگی
              </CardTitle>
              {readOnlyAuditorRole && (
                <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 text-xs">
                  در حال نظارت توسط: {readOnlyAuditorRole === "CEO" ? "مدیر ارشد / مدیرعامل" : "سرپرست گروه آموزشی"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentDataset.subtitle}
            </p>
          </div>

          {/* 5-Horizon Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-background border border-border p-1 rounded-lg">
            <button
              onClick={() => { setHorizon("TODAY"); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                horizon === "TODAY" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              امروز (۲۴ ساعته)
            </button>
            <button
              onClick={() => { setHorizon("THREE_DAYS"); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                horizon === "THREE_DAYS" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              ۳ روز اخیر
            </button>
            <button
              onClick={() => { setHorizon("WEEK"); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                horizon === "WEEK" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              هفته (شنبه تا جمعه)
            </button>
            <button
              onClick={() => { setHorizon("MONTH"); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                horizon === "MONTH" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              ماه جاری
            </button>
            <button
              onClick={() => { setHorizon("CUMULATIVE"); setSelectedItem(null); }}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                horizon === "CUMULATIVE" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              کل دوره (از ابتدا)
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">میزان تعهد زمانی برنامه‌ریزی‌شده</p>
              <p className="text-base font-bold mt-0.5">{toPersianDigits(totalPlanned.toFixed(1))} ساعت</p>
            </div>
            <Clock className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary font-medium">ساعات تحقق‌یافته واقعی</p>
              <p className="text-base font-bold text-primary mt-0.5">{toPersianDigits(totalActual.toFixed(1))} ساعت</p>
            </div>
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">شاخص پایبندی و پیشرفت</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">٪{toPersianDigits(avgProgress)}</p>
            </div>
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
        </div>

        {/* The Gantt Timeline Grid */}
        <div className="border border-border rounded-xl overflow-hidden bg-background">
          {/* Header Row: Columns */}
          <div className="grid grid-cols-12 bg-muted/50 border-b border-border py-2 text-xs font-bold text-muted-foreground text-center">
            <div className="col-span-4 sm:col-span-3 text-start ps-3">عنوان مبحث / سرفصل</div>
            <div className="col-span-8 sm:col-span-9 grid" style={{ gridTemplateColumns: `repeat(${currentDataset.columns.length}, 1fr)` }}>
              {currentDataset.columns.map((col, idx) => (
                <div key={idx} className="border-e border-border/50 last:border-e-0 px-1 truncate">
                  {col}
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/60">
            {currentDataset.items.map((item) => {
              // Calculate visual offset and width
              const totalColCount = currentDataset.columns.length;
              let leftPercent = 0;
              let widthPercent = 30;

              if (horizon === "TODAY") {
                // Hour 6 to 24 (18 hours span)
                const startClamped = Math.max(6, item.startHourOrDay);
                leftPercent = ((startClamped - 6) / 18) * 100;
                widthPercent = Math.min(100 - leftPercent, (item.duration / 18) * 100);
              } else if (horizon === "WEEK") {
                // 7 days
                leftPercent = (item.startHourOrDay / 7) * 100;
                widthPercent = Math.min(100 - leftPercent, (item.duration / 7) * 100);
              } else if (horizon === "THREE_DAYS") {
                // 3 days
                leftPercent = (item.startHourOrDay / 3) * 100;
                widthPercent = Math.min(100 - leftPercent, (item.duration / 3) * 100);
              } else {
                leftPercent = (item.startHourOrDay / totalColCount) * 100;
                widthPercent = Math.min(100 - leftPercent, (item.duration / totalColCount) * 100);
              }

              const statusColor =
                item.status === "COMPLETED"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : item.status === "PARTIAL"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`grid grid-cols-12 py-3 px-2 text-xs items-center cursor-pointer transition-colors ${
                    selectedItem?.id === item.id ? "bg-primary/10" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Left Label */}
                  <div className="col-span-4 sm:col-span-3 pe-2">
                    <p className="font-semibold text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.category}</span>
                      <span className="text-[10px] text-emerald-600 font-medium">({toPersianDigits(item.actualDuration)} ساعت از {toPersianDigits(item.duration)} ساعت)</span>
                    </div>
                  </div>

                  {/* Gantt Bar Lane */}
                  <div className="col-span-8 sm:col-span-9 relative h-7 bg-muted/20 rounded flex items-center px-1">
                    {/* Vertical grid lines guide */}
                    <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${totalColCount}, 1fr)` }}>
                      {currentDataset.columns.map((_, i) => (
                        <div key={i} className="border-e border-border/30 h-full last:border-none" />
                      ))}
                    </div>

                    {/* Progress Bar inside track */}
                    <div
                      style={{
                        position: "absolute",
                        insetInlineStart: `${leftPercent}%`,
                        width: `${Math.max(8, widthPercent)}%`,
                      }}
                      className={`h-5 rounded-md ${statusColor} px-2 flex items-center justify-between shadow-xs transition-all`}
                    >
                      <span className="text-[10px] font-bold truncate">٪{toPersianDigits(item.progressPercent)}</span>
                      {item.status === "COMPLETED" && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Item Details Footer Card */}
        {selectedItem && (
          <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-foreground">{selectedItem.title}</span>
              <span className="text-muted-foreground ms-2">| دسته‌بندی: {selectedItem.category}</span>
              {selectedItem.notes && (
                <p className="text-muted-foreground mt-1">توضیحات: {selectedItem.notes}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={selectedItem.status === "COMPLETED" ? "default" : "outline"}>
                {selectedItem.status === "COMPLETED" ? "تکمیل شده" : selectedItem.status === "PARTIAL" ? "بخشی انجام شده" : "انجام نشده"}
              </Badge>
              <span className="font-semibold text-primary">٪{toPersianDigits(selectedItem.progressPercent)} پیشرفت</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
