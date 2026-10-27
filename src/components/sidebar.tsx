"use client";

import React, { useState, useTransition, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Scale,
  LogOut,
  Settings,
  Users,
  CalendarRange,
  FileCheck,
  AlertTriangle,
  CheckSquare,
  FileEdit,
  PhoneCall,
  MessageSquare,
  LayoutDashboard,
  Shield,
  UserCheck,
  Bell,
  Menu,
  X,
  User,
  Clock,
  Sparkles,
  FileSpreadsheet,
  ShieldAlert,
  FileText,
  ShieldCheck,
  QrCode,
  FolderTree,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/server/actions/auth";
import { getNavbarNotificationCounts } from "@/server/actions/notifications";
import { toPersianDigits } from "@/lib/jalali";
import type { UserRole } from "@/types/models";

interface SidebarProps {
  userRole?: UserRole;
  userName?: string;
  phoneNumber?: string;
  unreadMessagesCount?: number;
  pendingTasksCount?: number;
  pendingReportsCount?: number;
  unassignedStudentsCount?: number;
  openTriageCasesCount?: number;
  pendingExamsCount?: number;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  hasUnreadDot?: boolean;
}

export function AppSidebar({
  userRole = "STUDENT",
  userName,
  phoneNumber,
  unreadMessagesCount: initialUnreadMessages = 0,
  pendingTasksCount: initialPendingTasks = 0,
  pendingReportsCount: initialPendingReports = 0,
  unassignedStudentsCount: initialUnassignedStudents = 0,
  openTriageCasesCount: initialOpenTriageCases = 0,
  pendingExamsCount: initialPendingExams = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Badge notification states
  const [unreadMessages, setUnreadMessages] = useState(initialUnreadMessages);
  const [pendingTasks, setPendingTasks] = useState(initialPendingTasks);
  const [pendingReports, setPendingReports] = useState(initialPendingReports);
  const [unassignedStudents, setUnassignedStudents] = useState(initialUnassignedStudents);
  const [openTriageCases, setOpenTriageCases] = useState(initialOpenTriageCases);
  const [pendingExams, setPendingExams] = useState(initialPendingExams);

  const syncNotificationCounts = useCallback(async () => {
    try {
      const counts = await getNavbarNotificationCounts();
      setUnreadMessages(counts.unreadMessagesCount);
      setPendingTasks(counts.pendingTasksCount);
      setPendingReports(counts.pendingReportsCount);
      setUnassignedStudents(counts.unassignedStudentsCount);
      setOpenTriageCases(counts.openTriageCasesCount || 0);
      setPendingExams(counts.pendingExamsCount || 0);
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

  const handleLogout = () => {
    startTransition(async () => {
      const res = await logoutAction();
      if (res.redirectUrl) {
        setMobileOpen(false);
        router.push(res.redirectUrl);
        router.refresh();
      }
    });
  };

  const cleanUserName = userName ? userName.replace(/\s*\([^)]*\)/g, "").trim() : "کاربر سامانه";
  const formattedPhone = phoneNumber ? toPersianDigits(phoneNumber) : "";

  const roleLabels: Record<UserRole, { badge: string; subtitle: string }> = {
    STUDENT: { badge: "داوطلب آزمون وکالت", subtitle: "داوطلب کانون و مرکز وکلا" },
    MENTOR: { badge: "پشتیبان علمی (منتور)", subtitle: "پشتیبان تخصصی و هدایت تحصیلی" },
    SUPERVISOR: { badge: "سرپرست آموزشی (پشتیبان ارشد)", subtitle: "فرماندهی نظارت و مانیتورینگ" },
    CEO: { badge: "مدیر ارشد سامانه", subtitle: "راهبر ارشد پلتفرم مشاهیر دانش" },
    ADMIN: { badge: "مدیر ارشد سامانه", subtitle: "مدیر زیرساخت و دسترسی‌ها" },
  };

  const roleInfo = roleLabels[userRole] || roleLabels.STUDENT;

  // Build role-aware navigation links per specifications
  let navItems: NavItem[] = [];

  if (userRole === "STUDENT") {
    navItems = [
      { title: "پیشخوان آموزشی", href: "/student/dashboard", icon: LayoutDashboard },
      { title: "برنامه مطالعاتی هفتگی", href: "/student/study-plan", icon: CalendarRange },
      { title: "تماس امن با پشتیبان", href: "/student/call", icon: PhoneCall },
      { title: "آزمون‌های آزمایشی", href: "/student/exams", icon: FileEdit },
      {
        title: "کارنامه خودارزیابی جمعه",
        href: "/student/friday-report",
        icon: FileCheck,
        badge: pendingReports > 0 ? pendingReports : undefined,
      },
      {
        title: "پیام‌ها و اسناد",
        href: "/messages",
        icon: MessageSquare,
        badge: unreadMessages > 0 ? unreadMessages : undefined,
      },
    ];
  } else if (userRole === "MENTOR") {
    navItems = [
      { title: "داوطلبان من (تماس و مشاوره)", href: "/mentor/students", icon: Users },
      {
        title: "گزارشات خودارزیابی",
        href: "/mentor/friday-reports",
        icon: FileCheck,
        badge: pendingReports > 0 ? pendingReports : undefined,
      },
      { title: "برنامه‌ریزی هفتگی", href: "/plans", icon: CalendarRange },
      {
        title: "رفع مشکلات علمی",
        href: "/mentor/triage",
        icon: AlertTriangle,
        hasUnreadDot: openTriageCases > 0,
      },
      {
        title: "ارجاع وظیفه",
        href: "/tasks",
        icon: CheckSquare,
        badge: pendingTasks > 0 ? pendingTasks : undefined,
      },
      {
        title: "طراحی و بارگذاری آزمون",
        href: "/exams",
        icon: FileEdit,
        badge: pendingExams > 0 ? pendingExams : undefined,
      },
      { title: "ساعات پاسخگویی تلفنی", href: "/mentor/calling-schedule", icon: PhoneCall },
      {
        title: "پیام‌ها و اسناد",
        href: "/messages",
        icon: MessageSquare,
        badge: unreadMessages > 0 ? unreadMessages : undefined,
      },
    ];
  } else if (userRole === "SUPERVISOR") {
    navItems = [
      { title: "نظارت و مانیتورینگ آموزشی", href: "/supervisor", icon: LayoutDashboard },
      { title: "تخصیص و جابه‌جایی داوطلبان", href: "/assignments", icon: FolderTree },
      { title: "عملکرد پشتیبانان علمی", href: "/supervisor/mentors", icon: Users },
      {
        title: "داوطلبان جدید (تعیین پشتیبان)",
        href: "/supervisor/unassigned-students",
        icon: UserCheck,
        badge: unassignedStudents > 0 ? unassignedStudents : undefined,
      },
      {
        title: "گزارش‌های خودارزیابی جمعه",
        href: "/mentor/friday-reports",
        icon: FileCheck,
        badge: pendingReports > 0 ? pendingReports : undefined,
      },
      {
        title: "کارتابل ارجاع وظایف",
        href: "/tasks",
        icon: CheckSquare,
        badge: pendingTasks > 0 ? pendingTasks : undefined,
      },
      { title: "برنامه‌ریزی هفتگی", href: "/plans", icon: CalendarRange },
      {
        title: "تایید و بانک آزمون‌ها",
        href: "/exams",
        icon: FileEdit,
        badge: pendingExams > 0 ? pendingExams : undefined,
      },
      {
        title: "پیام‌ها و ارتباطات",
        href: "/messages",
        icon: MessageSquare,
        badge: unreadMessages > 0 ? unreadMessages : undefined,
      },
    ];
  } else {
    // CEO / ADMIN
    navItems = [
      { title: "شاخص‌های کلیدی (داشبورد کلان)", href: "/executive", icon: LayoutDashboard },
      { title: "سلسله‌مراتب و پوشه سرپرستان", href: "/assignments", icon: FolderTree },
      { title: "مدیریت جامع کاربران", href: "/executive/users", icon: Shield },
      { title: "عملکرد پشتیبانان علمی", href: "/supervisor/mentors", icon: Users },
      { title: "بازرسی کادر پشتیبانی", href: "/executive/staff-audit", icon: ShieldCheck },
      {
        title: "داوطلبان جدید (تعیین پشتیبان)",
        href: "/supervisor/unassigned-students",
        icon: UserCheck,
        badge: unassignedStudents > 0 ? unassignedStudents : undefined,
      },
      { title: "نظارت و پیگیری سرپرستان", href: "/supervisor", icon: Users },
      { title: "برنامه‌ریزی هفتگی", href: "/plans", icon: CalendarRange },
      {
        title: "طراحی و بانک آزمون‌ها",
        href: "/exams",
        icon: FileEdit,
        badge: pendingExams > 0 ? pendingExams : undefined,
      },
      {
        title: "کارتابل وظایف سازمانی",
        href: "/tasks",
        icon: CheckSquare,
        badge: pendingTasks > 0 ? pendingTasks : undefined,
      },
      {
        title: "پیام‌ها و مکاتبات",
        href: "/messages",
        icon: MessageSquare,
        badge: unreadMessages > 0 ? unreadMessages : undefined,
      },
      { title: "مرکز جامع لاگ و ممیزی", href: "/executive/audit-logs", icon: FileText },
      { title: "رمزگشای واترمارک امنیتی", href: "/executive/watermark-decoder", icon: QrCode },
      { title: "تنظیمات سامانه", href: "/settings", icon: Settings },
    ];
  }

  const isLinkActive = (href: string) => {
    if (href === "/exams" && (pathname === "/exams" || pathname?.startsWith("/exams/"))) return true;
    if (href === "/student/friday-report" && (pathname === "/student/friday-report" || pathname === "/student/friday-reports")) return true;
    return pathname === href || (href !== "/" && pathname?.startsWith(href));
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Main Right-Hand Vertical Sidebar Container */}
      <aside
        className={`w-72 shrink-0 fixed right-0 top-0 bottom-0 z-40 flex flex-col justify-between p-5 bg-[#EEF1F6] border-l border-slate-200/80 dark:bg-[#111827]/95 dark:border-l dark:border-slate-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: Brand Identity */}
        <div>
          <div className="flex items-center justify-between">
            <Link
              href={
                userRole === "STUDENT"
                  ? "/student/dashboard"
                  : userRole === "MENTOR"
                  ? "/mentor/students"
                  : userRole === "SUPERVISOR"
                  ? "/supervisor"
                  : "/executive"
              }
              onClick={() => setMobileOpen(false)}
              className="flex items-center space-x-3 space-x-reverse group"
            >
              <div className="bg-indigo-600 text-white w-11 h-11 flex items-center justify-center rounded-xl shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-all shrink-0">
                <Scale className="h-6 w-6 text-amber-300" />
              </div>
              <div className="flex flex-col text-start">
                <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                  پشتیبانی مشاهیر دانش
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    ۳۶۰°
                  </span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  سامانه هدایت تحصیلی
                </span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              aria-label="بستن منو"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Middle: Vertical Navigation Links */}
          <nav className="space-y-1.5 mt-8 flex flex-col overflow-y-auto max-h-[calc(100vh-280px)] pr-1 pl-1">
            {navItems.map((item) => {
              const active = isLinkActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between transition-all ${
                    active
                      ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200/80 rounded-xl px-4 py-3 dark:bg-gradient-to-l dark:from-indigo-500/30 dark:to-purple-500/10 dark:text-white dark:border dark:border-indigo-400/40 dark:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/50 rounded-xl px-4 py-2.5 font-medium"
                  }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse min-w-0">
                    <Icon
                      className={`h-4.5 w-4.5 shrink-0 ${
                        active
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800"
                      }`}
                    />
                    <span className="text-xs truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Unread dot indicator for Triage / Emergencies */}
                    {item.hasUnreadDot && (
                      <span
                        className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                        title="پرونده‌های فعال نیازمند مداخله"
                      />
                    )}

                    {/* Numeric badge indicator */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white flex items-center justify-center font-mono shadow-xs">
                        {toPersianDigits(item.badge)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Profile Card & Utility Footer */}
        <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="border border-slate-200/80 bg-white rounded-2xl p-3.5 shadow-xs dark:bg-slate-800/60 dark:border-slate-700/60">
            {/* User Profile Row */}
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-xs shrink-0 shadow-xs">
                {cleanUserName.slice(0, 1) || "ک"}
              </div>
              <div className="flex flex-col text-start min-w-0 flex-1">
                <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {cleanUserName}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {roleInfo.badge}
                </span>
              </div>
            </div>

            {/* Bottom Icon Row */}
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-700/60">
              {/* Settings button on the left */}
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                title="تنظیمات سامانه و پروفایل"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">تنظیمات</span>
              </Link>

              {/* Formatted phone number or role label */}
              {formattedPhone && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {formattedPhone}
                </span>
              )}

              {/* Logout button on the right */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                title="خروج از حساب کاربری"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Expose Mobile Menu Opener via Event Listener or Global Trigger */}
      <MobileMenuTrigger onOpen={() => setMobileOpen(true)} />
    </>
  );
}

/**
 * Helper to listen for mobile hamburger clicks triggered from the TopUtilityBar
 */
function MobileMenuTrigger({ onOpen }: { onOpen: () => void }) {
  useEffect(() => {
    const handleOpen = () => onOpen();
    window.addEventListener("mashahir:open-mobile-sidebar", handleOpen);
    return () => {
      window.removeEventListener("mashahir:open-mobile-sidebar", handleOpen);
    };
  }, [onOpen]);

  return null;
}
