"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Scale,
  LogOut,
  ShieldAlert,
  BarChart3,
  BookOpen,
  Calendar,
  Settings,
  MessageSquare,
  CheckSquare,
  Sliders,
  GraduationCap,
  Eye,
  Menu,
  X,
  User,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/server/actions/auth";
import { toPersianDigits } from "@/lib/jalali";
import type { UserRole } from "@/types/models";

interface NavbarProps {
  userRole?: UserRole;
  userName?: string;
  phoneNumber?: string;
  unreadMessagesCount?: number;
  pendingTasksCount?: number;
  pendingReportsCount?: number;
}

export function Navbar({
  userRole = "STUDENT",
  userName,
  phoneNumber,
  unreadMessagesCount = 0,
  pendingTasksCount = 0,
  pendingReportsCount = 0,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Requirement 1: Completely remove top navbar/header from /auth/login
  if (pathname === "/auth/login") {
    return null;
  }

  const handleLogout = () => {
    startTransition(async () => {
      const res = await logoutAction();
      if (res.redirectUrl) {
        setMobileMenuOpen(false);
        router.push(res.redirectUrl);
        router.refresh();
      }
    });
  };

  // Canonical role labels and styling
  const roleDisplayNames: Record<
    UserRole,
    { badge: string; roleLabel: string; bgClass: string; textClass: string; borderClass: string }
  > = {
    STUDENT: {
      badge: "داوطلب وکالت",
      roleLabel: "داوطلب آزمون",
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-700 dark:text-emerald-400",
      borderClass: "border-emerald-500/30",
    },
    MENTOR: {
      badge: "پشتیبان ارشد",
      roleLabel: "پشتیبان آموزشی",
      bgClass: "bg-indigo-500/10",
      textClass: "text-indigo-700 dark:text-indigo-400",
      borderClass: "border-indigo-500/30",
    },
    SUPERVISOR: {
      badge: "سرپرست گروه آموزشی",
      roleLabel: "سرپرست پشتیبانی",
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-800 dark:text-amber-400",
      borderClass: "border-amber-500/30",
    },
    CEO: {
      badge: "مدیریت ارشد (CEO)",
      roleLabel: "مدیرعامل",
      bgClass: "bg-rose-500/10",
      textClass: "text-rose-700 dark:text-rose-400",
      borderClass: "border-rose-500/30",
    },
    ADMIN: {
      badge: "مدیر ارشد سامانه",
      roleLabel: "مدیر سیستم",
      bgClass: "bg-purple-500/10",
      textClass: "text-purple-700 dark:text-purple-400",
      borderClass: "border-purple-500/30",
    },
  };

  const roleInfo = roleDisplayNames[userRole] || roleDisplayNames.STUDENT;

  // Role root destination
  const roleHomeHref =
    userRole === "STUDENT"
      ? "/student/dashboard"
      : userRole === "MENTOR"
      ? "/mentor/triage"
      : userRole === "SUPERVISOR"
      ? "/supervisor"
      : "/executive";

  const isManager = userRole === "CEO" || userRole === "ADMIN";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* 1. Brand Logo & Title */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <Link href={roleHomeHref} className="flex items-center space-x-3 space-x-reverse group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="font-bold text-sm tracking-tight text-foreground">
                  پشتیبانی مشاهیر دانش
                </span>
                <span className="rounded bg-indigo-500/10 dark:bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-400">
                  ۳۶۰°
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                سامانه هدایت تحصیلی آزمون وکالت
              </p>
            </div>
          </Link>

          {/* 2. Role-specific Navigation Links (Desktop) */}
          <nav className="hidden xl:flex items-center space-x-1 space-x-reverse ms-4">
            {/* LEVEL 1: STUDENT */}
            {userRole === "STUDENT" && (
              <>
                <Link
                  href="/student/dashboard"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/student/dashboard"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>میز کار و برنامه</span>
                </Link>

                <Link
                  href="/student/friday-report"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/student/friday-report"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                  <span>گزارشات خودارزیابی جمعه</span>
                </Link>

                <Link
                  href="/student/exams"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname?.startsWith("/student/exams")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                  <span>آزمون‌های آنلاین و کارنامه</span>
                </Link>

                <Link
                  href="/messages"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/messages"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                  <span>ارتباط با پشتیبان</span>
                </Link>
              </>
            )}

            {/* LEVEL 2: MENTOR */}
            {userRole === "MENTOR" && (
              <>
                <Link
                  href="/mentor/students"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/students"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span>داوطلبان من (تماس و مشاوره)</span>
                </Link>

                <Link
                  href="/mentor/friday-reports"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/friday-reports"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                  <span>گزارشات خودارزیابی جمعه</span>
                </Link>

                <Link
                  href="/mentor/triage"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/triage"
                      ? "bg-rose-500/10 text-rose-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>رفع مشکلات علمی</span>
                </Link>

                <Link
                  href="/plans"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/plans"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span>برنامه‌ریزی هفتگی</span>
                </Link>

                <Link
                  href="/tasks"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/tasks"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-amber-400" />
                  <span>ارجاع وظیفه</span>
                </Link>

                <Link
                  href="/exams/builder"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname?.startsWith("/exams")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                  <span>طراحی و بارگذاری آزمون</span>
                </Link>

                <Link
                  href="/messages"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/messages"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  <span>پیام‌ها و اسناد</span>
                </Link>
              </>
            )}

            {/* LEVEL 3: SUPERVISOR */}
            {userRole === "SUPERVISOR" && (
              <>
                <Link
                  href="/supervisor"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/supervisor"
                      ? "bg-amber-500/10 text-amber-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                  <span>داشبورد سرپرستی گروه آموزشی</span>
                </Link>

                <Link
                  href="/mentor/friday-reports"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/friday-reports"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                  <span>گزارشات خودارزیابی جمعه</span>
                </Link>

                <Link
                  href="/mentor/triage"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/triage"
                      ? "bg-rose-500/10 text-rose-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>پایش و عارضه‌یابی آموزشی</span>
                </Link>

                <Link
                  href="/plans"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/plans"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span>تمپلیت برنامه هفتگی</span>
                </Link>

                <Link
                  href="/tasks"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/tasks"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-amber-400" />
                  <span>ارجاع وظایف</span>
                </Link>

                <Link
                  href="/exams/builder"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname?.startsWith("/exams")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                  <span>طراحی و پایش آزمون‌ها</span>
                </Link>

                <Link
                  href="/messages"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/messages"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  <span>پیام‌ها و اسناد</span>
                </Link>
              </>
            )}

            {/* LEVEL 4: MANAGER / CEO / ADMIN */}
            {isManager && (
              <>
                <Link
                  href="/executive"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/executive"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>شاخص‌های کلیدی</span>
                </Link>

                <Link
                  href="/supervisor"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/supervisor"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span>نظارت و پیگیری سرپرستان</span>
                </Link>

                <Link
                  href="/mentor/students"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/students"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span>داوطلبان و تماس‌ها</span>
                </Link>

                <Link
                  href="/mentor/triage"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/mentor/triage"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>رفع مشکلات علمی</span>
                </Link>

                <Link
                  href="/plans"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/plans"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  <span>برنامه‌ریزی</span>
                </Link>

                <Link
                  href="/tasks"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/tasks"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <CheckSquare className="h-3.5 w-3.5 text-amber-400" />
                  <span>ارجاع وظیفه</span>
                </Link>

                <Link
                  href="/exams/builder"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname?.startsWith("/exams")
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
                  <span>طراحی و مدیریت آزمون‌ها</span>
                </Link>

                <Link
                  href="/messages"
                  className={`flex items-center space-x-1.5 space-x-reverse px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    pathname === "/messages"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                  <span>پیام‌ها و بازبینی</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* 3. Action Utilities & User Profile Pill */}
        <div className="flex items-center space-x-2 space-x-reverse">
          {/* Notification 1: Friday Reports Counter */}
          <Link
            href={userRole === "STUDENT" ? "/student/friday-reports" : "/mentor/friday-reports"}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
            title={`گزارشات خودارزیابی جمعه${pendingReportsCount > 0 ? ` (${toPersianDigits(pendingReportsCount)} در انتظار اقدام)` : ""}`}
          >
            <BookOpen className="h-4 w-4" />
            {pendingReportsCount > 0 && (
              <span className="absolute -top-1 -end-1 px-1.5 py-0.2 min-w-4.5 h-4.5 text-[10px] font-bold rounded-full bg-emerald-600 text-white flex items-center justify-center font-mono shadow-xs animate-in zoom-in-75">
                {toPersianDigits(pendingReportsCount)}
              </span>
            )}
          </Link>

          {/* Notification 2: Hierarchy Tasks Counter (Mentors / Supervisors / Management) */}
          {userRole !== "STUDENT" && (
            <Link
              href="/tasks"
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
              title={`کارتابل وظایف سازمانی${pendingTasksCount > 0 ? ` (${toPersianDigits(pendingTasksCount)} وظیفه در انتظار)` : ""}`}
            >
              <CheckSquare className="h-4 w-4" />
              {pendingTasksCount > 0 && (
                <span className="absolute -top-1 -end-1 px-1.5 py-0.2 min-w-4.5 h-4.5 text-[10px] font-bold rounded-full bg-amber-600 text-white flex items-center justify-center font-mono shadow-xs animate-in zoom-in-75">
                  {toPersianDigits(pendingTasksCount)}
                </span>
              )}
            </Link>
          )}

          {/* Notification 3: Direct & Internal Messages Counter */}
          <Link
            href="/messages"
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
            title={`مرکز پیام‌ها و مکاتبات${unreadMessagesCount > 0 ? ` (${toPersianDigits(unreadMessagesCount)} پیام خوانده‌نشده)` : ""}`}
          >
            <MessageSquare className="h-4 w-4" />
            {unreadMessagesCount > 0 ? (
              <span className="absolute -top-1 -end-1 px-1.5 py-0.2 min-w-4.5 h-4.5 text-[10px] font-bold rounded-full bg-indigo-600 text-white flex items-center justify-center font-mono shadow-xs animate-in zoom-in-75">
                {toPersianDigits(unreadMessagesCount)}
              </span>
            ) : null}
          </Link>

          {/* Theme Toggle (Light / Dark Mode) */}
          <ThemeToggle />

          {/* Settings Cog: Accessible to all authenticated users (role-tailored tabs) */}
          <Link
            href="/settings"
            className={`p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
              pathname === "/settings" ? "bg-primary/10 text-primary border-primary/50" : ""
            }`}
            title="تنظیمات پروفایل و سامانه"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* 4. User Profile Pill: Displays Static User Name + Actual Role Badge + Logout */}
          <div className="flex items-center gap-2 border border-border bg-card/80 px-2.5 py-1 rounded-xl shadow-xs">
            <div className="text-end hidden sm:block">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 justify-end">
                <span>{userName || "کاربر سامانه"}</span>
                <span className="text-muted-foreground/40">|</span>
                <span className={`text-[11px] font-semibold ${roleInfo.textClass}`}>
                  {roleInfo.badge}
                </span>
              </div>
              {phoneNumber && (
                <div className="text-[10px] text-muted-foreground font-mono">{phoneNumber}</div>
              )}
            </div>

            {/* Mobile-only compact role indicator */}
            <div className="sm:hidden">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${roleInfo.bgClass} ${roleInfo.textClass} ${roleInfo.borderClass}`}
              >
                {roleInfo.badge}
              </span>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={isPending}
              title="خروج از حساب کاربری"
              className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden text-foreground hover:bg-muted"
            aria-label="منوی ناوبری"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown (Strictly Role-Specific, ZERO Role Switcher) */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          {/* User details on mobile */}
          <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <span className="text-xs font-bold text-foreground block">{userName || "کاربر سامانه"}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{phoneNumber}</span>
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${roleInfo.bgClass} ${roleInfo.textClass} ${roleInfo.borderClass}`}
            >
              {roleInfo.badge}
            </span>
          </div>

          {/* Mobile Nav Links based on exact role */}
          <nav className="flex flex-col space-y-1 pt-1">
            {userRole === "STUDENT" && (
              <>
                <Link
                  href="/student/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span>میز کار و برنامه</span>
                </Link>
                <Link
                  href="/student/friday-report"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  <span>گزارشات خودارزیابی جمعه</span>
                </Link>
                <Link
                  href="/student/exams"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                  <span>آزمون‌های آنلاین و کارنامه</span>
                </Link>
              </>
            )}

            {userRole === "MENTOR" && (
              <>
                <Link
                  href="/mentor/students"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Users className="h-4 w-4 text-sky-400" />
                  <span>داوطلبان من (تماس و مشاوره)</span>
                </Link>
                <Link
                  href="/mentor/friday-reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  <span>گزارشات خودارزیابی جمعه</span>
                </Link>
                <Link
                  href="/mentor/triage"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>رفع مشکلات علمی</span>
                </Link>
                <Link
                  href="/plans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Sliders className="h-4 w-4 text-purple-400" />
                  <span>برنامه‌ریزی هفتگی</span>
                </Link>
                <Link
                  href="/tasks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <CheckSquare className="h-4 w-4 text-amber-400" />
                  <span>ارجاع وظیفه</span>
                </Link>
                <Link
                  href="/exams/builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                  <span>طراحی و بارگذاری آزمون</span>
                </Link>
              </>
            )}

            {userRole === "SUPERVISOR" && (
              <>
                <Link
                  href="/supervisor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span>داشبورد سرپرستی گروه آموزشی</span>
                </Link>
                <Link
                  href="/mentor/friday-reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <BookOpen className="h-4 w-4 text-blue-400" />
                  <span>گزارشات خودارزیابی جمعه</span>
                </Link>
                <Link
                  href="/mentor/triage"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>پایش و عارضه‌یابی آموزشی</span>
                </Link>
                <Link
                  href="/plans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Sliders className="h-4 w-4 text-purple-400" />
                  <span>تمپلیت برنامه هفتگی</span>
                </Link>
                <Link
                  href="/tasks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <CheckSquare className="h-4 w-4 text-amber-400" />
                  <span>ارجاع وظایف</span>
                </Link>
                <Link
                  href="/exams/builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                  <span>طراحی و پایش آزمون‌ها</span>
                </Link>
              </>
            )}

            {isManager && (
              <>
                <Link
                  href="/executive"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  <span>شاخص‌های کلیدی</span>
                </Link>
                <Link
                  href="/supervisor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Eye className="h-4 w-4 text-amber-400" />
                  <span>نظارت و پیگیری سرپرستان</span>
                </Link>
                <Link
                  href="/mentor/triage"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>رفع مشکلات علمی</span>
                </Link>
                <Link
                  href="/plans"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Sliders className="h-4 w-4 text-purple-400" />
                  <span>برنامه‌ریزی</span>
                </Link>
                <Link
                  href="/tasks"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <CheckSquare className="h-4 w-4 text-amber-400" />
                  <span>ارجاع وظیفه</span>
                </Link>
                <Link
                  href="/exams/builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
                >
                  <GraduationCap className="h-4 w-4 text-emerald-400" />
                  <span>بانک و طراحی آزمون‌ها</span>
                </Link>
              </>
            )}

            {/* Common to all */}
            <Link
              href="/exams"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
            >
              <GraduationCap className="h-4 w-4 text-emerald-400" />
              <span>آزمون‌های ارزیابی</span>
            </Link>

            <Link
              href="/messages"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
            >
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <span>پیام‌ها و اسناد</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 space-x-reverse px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted"
            >
              <Settings className="h-4 w-4 text-primary" />
              <span>تنظیمات و پروفایل</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
