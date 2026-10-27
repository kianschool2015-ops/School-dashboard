"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar";
import { TopUtilityBar } from "./top-utility-bar";
import { ForensicWatermark } from "@/components/security/forensic-watermark";
import type { UserRole } from "@/types/models";

interface AppShellProps {
  children: React.ReactNode;
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

export function AppShell({
  children,
  userRole = "STUDENT",
  userName,
  phoneNumber,
  unreadMessagesCount = 0,
  pendingTasksCount = 0,
  pendingReportsCount = 0,
  unassignedStudentsCount = 0,
  openTriageCasesCount = 0,
  pendingExamsCount = 0,
}: AppShellProps) {
  const pathname = usePathname();

  // Completely isolate Landing Page (/) and /auth/* routes from sidebar, top header, and layout offset
  const isStandaloneRoute = pathname === "/" || pathname?.startsWith("/auth");

  if (isStandaloneRoute) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B101E] text-slate-900 dark:text-slate-100 transition-colors duration-150">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] dark:bg-[#0B101E] text-slate-900 dark:text-slate-100 transition-colors duration-150 flex">
      {/* Permanent Right-Hand Vertical Sidebar */}
      <AppSidebar
        userRole={userRole}
        userName={userName}
        phoneNumber={phoneNumber}
        unreadMessagesCount={unreadMessagesCount}
        pendingTasksCount={pendingTasksCount}
        pendingReportsCount={pendingReportsCount}
        unassignedStudentsCount={unassignedStudentsCount}
        openTriageCasesCount={openTriageCasesCount}
        pendingExamsCount={pendingExamsCount}
      />

      {/* Main Content Area Placed to its Left */}
      <div className="flex-1 mr-0 lg:mr-72 min-h-screen flex flex-col w-full min-w-0 transition-all duration-150">
        {/* Top-Left Utility Bar & Page Header */}
        <TopUtilityBar
          userRole={userRole}
          unreadMessagesCount={unreadMessagesCount}
          pendingTasksCount={pendingTasksCount}
          pendingReportsCount={pendingReportsCount}
        />

        {/* Main Page Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {userName ? (
            <ForensicWatermark
              userFullName={userName}
              phoneNumber={phoneNumber || "۰۹•••••••••"}
            >
              {children}
            </ForensicWatermark>
          ) : (
            children
          )}
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-[#111827]/50 backdrop-blur-xs">
          <div className="container mx-auto px-4">
            <p>تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Backward compatibility export if needed
export { AppShell as Navbar };
