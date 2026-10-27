"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Bell,
  FileCheck,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { getNavbarNotificationCounts } from "@/server/actions/notifications";
import { toPersianDigits } from "@/lib/jalali";
import type { UserRole } from "@/types/models";

interface TopUtilityBarProps {
  userRole?: UserRole;
  unreadMessagesCount?: number;
  pendingTasksCount?: number;
  pendingReportsCount?: number;
}

export function TopUtilityBar({
  userRole = "STUDENT",
  unreadMessagesCount: initialUnreadMessages = 0,
  pendingTasksCount: initialPendingTasks = 0,
  pendingReportsCount: initialPendingReports = 0,
}: TopUtilityBarProps) {
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages);
  const [pendingTasks, setPendingTasks] = useState(initialPendingTasks);
  const [pendingReports, setPendingReports] = useState(initialPendingReports);

  const syncNotificationCounts = useCallback(async () => {
    try {
      const counts = await getNavbarNotificationCounts();
      setUnreadMessages(counts.unreadMessagesCount);
      setPendingTasks(counts.pendingTasksCount);
      setPendingReports(counts.pendingReportsCount);
    } catch {
      // Ignore background sync errors silently
    }
  }, []);

  useEffect(() => {
    syncNotificationCounts();
    const handleUpdate = () => syncNotificationCounts();
    window.addEventListener("mashahir:notifications-updated", handleUpdate);
    const interval = setInterval(syncNotificationCounts, 10000);
    return () => {
      window.removeEventListener("mashahir:notifications-updated", handleUpdate);
      clearInterval(interval);
    };
  }, [syncNotificationCounts]);

  const handleOpenMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent("mashahir:open-mobile-sidebar"));
  };

  // Determine page header title & subtitle based on current route
  const getPageHeaderInfo = () => {
    if (!pathname) {
      return { title: "داشبورد پشتیبانی", pill: "مشاهیر دانش", subtitle: "سامانه ۳۶۰ درجه هدایت تحصیلی" };
    }

    if (pathname === "/mentor/triage") {
      return {
        title: "رفع مشکلات علمی و هدایت تحصیلی",
        pill: "پرونده‌های فعال",
        subtitle: "پایش مستمر و مداخله در پرونده‌های داوطلبان در معرض افت",
      };
    }
    if (pathname === "/mentor/students" || pathname.startsWith("/mentor/student/")) {
      return {
        title: "داوطلبان من (تماس و مشاوره)",
        pill: "فهرست فعال",
        subtitle: "مشاهده مشخصات داوطلبان، پرونده آموزشی و ثبت گزارش مکالمه",
      };
    }
    if (pathname === "/mentor/calling-schedule") {
      return {
        title: "تنظیم ساعات پاسخگویی تلفنی",
        pill: "پنجره تماس امن",
        subtitle: "تعیین ساعات مجاز پاسخگویی مستقیم روزانه به داوطلبان",
      };
    }
    if (pathname === "/mentor/friday-reports" || pathname.startsWith("/mentor/friday-reports")) {
      return {
        title: "گزارش‌های خودارزیابی جمعه",
        pill: "پایان هفته",
        subtitle: "بررسی، تایید و ثبت فیدبک کارنامه‌های هفتگی داوطلبان",
      };
    }
    if (pathname === "/student/dashboard") {
      return {
        title: "پیشخوان آموزشی داوطلب",
        pill: "برنامه روزانه",
        subtitle: "میز مطالعه هوشمند، ثبت پارت‌ها و گزارش روزانه به پشتیبان",
      };
    }
    if (pathname === "/student/study-plan") {
      return {
        title: "برنامه مطالعاتی هفتگی",
        pill: "برنامه مصوب",
        subtitle: "سرفصل‌ها و زمان‌بندی مصوب پشتیبان آموزشی برای آزمون وکالت",
      };
    }
    if (pathname.startsWith("/student/exams") || pathname === "/exams") {
      return {
        title: "آزمون‌های آنلاین و کارنامه",
        pill: "سنجش و ارزیابی",
        subtitle: "شرکت در آزمون‌های جامع شبیه‌ساز و تحلیل تحلیلی درصدها",
      };
    }
    if (pathname === "/student/friday-report" || pathname === "/student/friday-reports") {
      return {
        title: "کارنامه خودارزیابی جمعه",
        pill: "پایان هفته",
        subtitle: "ثبت ساعات مطالعه، تراز هفتگی و ارزیابی عملکرد مطالعاتی",
      };
    }
    if (pathname === "/executive") {
      return {
        title: "شاخص‌های کلیدی عملکرد (KPI)",
        pill: "داشبورد کلان",
        subtitle: "پایش جامع نرخ تماس، پایداری تحصیلی و تحلیل افت داوطلبان",
      };
    }
    if (pathname === "/executive/users") {
      return {
        title: "مدیریت جامع کاربران و دسترسی‌ها",
        pill: "کنترل دسترسی",
        subtitle: "ایجاد، ویرایش، تخصیص نقش و مدیریت حساب‌های کاربری سامانه",
      };
    }
    if (pathname === "/supervisor") {
      return {
        title: "میز نظارت و مانیتورینگ آموزشی",
        pill: "فرماندهی نظارت",
        subtitle: "کنترل کیفیت خدمات پشتیبانی و پایش عملکرد پشتیبانان",
      };
    }
    if (pathname === "/plans") {
      return {
        title: "برنامه‌ریزی هفتگی و تمپلیت‌ها",
        pill: "الگوهای مطالعاتی",
        subtitle: "طراحی، ویرایش و تخصیص الگوهای مطالعاتی استاندارد",
      };
    }
    if (pathname.startsWith("/exams/builder")) {
      return {
        title: "طراحی و مدیریت بانک آزمون‌ها",
        pill: "آزمون‌ساز",
        subtitle: "طراحی سوالات تستی، پاسخنامه تشریحی و بودجه‌بندی مباحث",
      };
    }
    if (pathname === "/tasks") {
      return {
        title: "کارتابل وظایف سازمانی",
        pill: "ماموریت‌ها",
        subtitle: "پیگیری وظایف محوله و ارجاع ماموریت‌های جدید به پرسنل",
      };
    }
    if (pathname === "/messages") {
      return {
        title: "پیام‌ها، کانال‌ها و اسناد",
        pill: "مرکز ارتباطات",
        subtitle: "گفتگوی مستقیم با داوطلبان و ارسال مدارک و تکالیف آموزشی",
      };
    }
    if (pathname === "/settings") {
      return {
        title: "تنظیمات پروفایل و سامانه",
        pill: "پیکربندی",
        subtitle: "مدیریت اطلاعات کاربری، افزونه تلفنی Zoiper و سیستم",
      };
    }

    return {
      title: "پشتیبانی مشاهیر دانش",
      pill: "سامانه ۳۶۰°",
      subtitle: "سامانه جامع هدایت تحصیلی داوطلبان آزمون وکالت",
    };
  };

  const headerInfo = getPageHeaderInfo();

  return (
    <header className="sticky top-0 z-30 w-full bg-[#F4F6F9]/90 dark:bg-[#0B101E]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 py-3 px-4 sm:px-6 transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Top-Right: Page Header Architecture */}
        <div className="flex items-center space-x-3 space-x-reverse min-w-0">
          {/* Mobile Menu Hamburger (Visible on < lg) */}
          <button
            type="button"
            onClick={handleOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-white dark:bg-[#161F33] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs shrink-0"
            aria-label="باز کردن منوی ناوبری"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-col text-start min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight truncate">
                {headerInfo.title}
              </h1>
              {headerInfo.pill && (
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 rounded-full shrink-0">
                  {headerInfo.pill}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:block mt-0.5">
              {headerInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Top-Left: Action & Theme Controls */}
        <div className="flex items-center space-x-2 space-x-reverse shrink-0">
          {/* Messages Icon Button */}
          <Link
            href="/messages"
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#161F33] border border-slate-200 dark:border-slate-800 flex items-center justify-center relative shadow-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title={`پیام‌ها و مکاتبات${unreadMessages > 0 ? ` (${toPersianDigits(unreadMessages)} خوانده‌نشده)` : ""}`}
          >
            <MessageSquare className="h-4.5 w-4.5" />
            {unreadMessages > 0 && (
              <span className="bg-indigo-600 dark:bg-rose-500 text-white text-[11px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center absolute -top-1.5 -end-1.5 shadow-xs font-mono animate-in zoom-in-75">
                {toPersianDigits(unreadMessages)}
              </span>
            )}
          </Link>

          {/* Tasks & Action Items (Bell Icon) */}
          <Link
            href="/tasks"
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#161F33] border border-slate-200 dark:border-slate-800 flex items-center justify-center relative shadow-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title={`کارتابل وظایف سازمانی${pendingTasks > 0 ? ` (${toPersianDigits(pendingTasks)} در انتظار اقدام)` : ""}`}
          >
            <Bell className="h-4.5 w-4.5" />
            {pendingTasks > 0 && (
              <span className="bg-amber-600 dark:bg-amber-500 text-white text-[11px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center absolute -top-1.5 -end-1.5 shadow-xs font-mono animate-in zoom-in-75">
                {toPersianDigits(pendingTasks)}
              </span>
            )}
          </Link>

          {/* Friday Self-Assessment Reports Button */}
          <Link
            href={userRole === "STUDENT" ? "/student/friday-report" : "/mentor/friday-reports"}
            className="w-10 h-10 rounded-xl bg-white dark:bg-[#161F33] border border-slate-200 dark:border-slate-800 flex items-center justify-center relative shadow-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title={`گزارشات خودارزیابی جمعه${pendingReports > 0 ? ` (${toPersianDigits(pendingReports)} در انتظار بررسی)` : ""}`}
          >
            <FileCheck className="h-4.5 w-4.5" />
            {pendingReports > 0 && (
              <span className="bg-emerald-600 text-white text-[11px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center absolute -top-1.5 -end-1.5 shadow-xs font-mono animate-in zoom-in-75">
                {toPersianDigits(pendingReports)}
              </span>
            )}
          </Link>

          {/* Theme Toggle Switch Pill (Sun/Moon Segmented Switch) */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
