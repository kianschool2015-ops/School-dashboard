"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldAlert,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  ArrowRight,
  TrendingUp,
  Headphones,
  CheckSquare,
  Award,
  Calendar,
  AlertTriangle,
  UserCheck,
  Building,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toPersianDigits, formatJalaliDate } from "@/lib/jalali";
import type {
  StaffAuditData,
  SupervisorStaffAuditRecord,
  MentorStaffAuditRecord,
} from "@/server/actions/admin-staff-audit";

interface StaffAuditClientProps {
  initialData: StaffAuditData;
}

export function StaffAuditClient({ initialData }: StaffAuditClientProps) {
  const [activeTab, setActiveTab] = useState<"SUPERVISORS" | "MENTORS">("SUPERVISORS");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSupervisors = initialData.supervisors.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phoneNumber.includes(searchTerm) ||
      (s.nationalId && s.nationalId.includes(searchTerm)) ||
      (s.sipExtension && s.sipExtension.includes(searchTerm))
  );

  const filteredMentors = initialData.mentors.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phoneNumber.includes(searchTerm) ||
      (m.nationalId && m.nationalId.includes(searchTerm)) ||
      (m.sipExtension && m.sipExtension.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            <span>مرکز بازرسی و ممیزی کادر اجرایی مؤسسه</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            بررسی تک‌به‌تک سرپرستان آموزشی و پشتیبان‌های علمی، نظارت بر عملکرد، تماس‌ها و وضعیت وظایف سازمانی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/executive">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>بازگشت به پنل مدیریت ارشد</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Aggregate KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">سرپرستان آموزشی</p>
              <p className="text-lg font-black mt-0.5">
                {toPersianDigits(initialData.supervisors.length)} نفر
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">پشتیبان‌های علمی (منتورها)</p>
              <p className="text-lg font-black mt-0.5">
                {toPersianDigits(initialData.mentors.length)} نفر
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">کل تماس‌های هفتگی ثبت‌شده</p>
              <p className="text-lg font-black mt-0.5">
                {toPersianDigits(
                  initialData.mentors.reduce((acc, m) => acc + m.weeklyCallsCount, 0)
                )}{" "}
                تماس
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">تسک‌های سلسله‌مراتبی فعال</p>
              <p className="text-lg font-black mt-0.5">
                {toPersianDigits(
                  initialData.supervisors.reduce((acc, s) => acc + s.tasksAssignedCount, 0)
                )}{" "}
                مأموریت
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("SUPERVISORS")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "SUPERVISORS"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>سرپرستان آموزشی ({toPersianDigits(initialData.supervisors.length)})</span>
          </button>
          <button
            onClick={() => setActiveTab("MENTORS")}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "MENTORS"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserCheck className="h-4 w-4 text-blue-500" />
            <span>پشتیبان‌های علمی ({toPersianDigits(initialData.mentors.length)})</span>
          </button>
        </div>

        <div className="relative min-w-[280px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام، تلفن، کدملی یا شماره داخلی..."
            className="w-full ps-9 pe-4 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:border-primary shadow-xs"
          />
        </div>
      </div>

      {/* TAB 1: Supervisors */}
      {activeTab === "SUPERVISORS" && (
        <div className="space-y-4">
          {filteredSupervisors.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-xs">
              سرپرست آموزشی با مشخصات جستجو شده یافت نشد.
            </Card>
          ) : (
            filteredSupervisors.map((sup) => (
              <Card
                key={sup.id}
                className="border-border overflow-hidden shadow-xs hover:border-primary/50 transition-all bg-card"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-base shrink-0 border border-amber-500/20">
                      {sup.fullName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-foreground">{sup.fullName}</span>
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px]">
                          سرپرست آموزشی (پشتیبان ارشد)
                        </Badge>
                        {sup.isActive ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>فعال</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            غیرفعال
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap font-mono">
                        <span>همراه: {toPersianDigits(sup.phoneNumber)}</span>
                        {sup.nationalId && <span>کدملی: {toPersianDigits(sup.nationalId)}</span>}
                        {sup.sipExtension && (
                          <span className="bg-muted px-2 py-0.5 rounded text-[11px]">
                            داخلی تلفن: {toPersianDigits(sup.sipExtension)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">پشتیبان‌های تحت نظارت</span>
                      <span className="font-black text-foreground block mt-0.5 text-sm">
                        {toPersianDigits(sup.supervisedMentorsCount)} نفر
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">کل داوطلبان دوره</span>
                      <span className="font-black text-foreground block mt-0.5 text-sm">
                        {toPersianDigits(sup.totalStudentsInCohort)} داوطلب
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">تسک‌های ارجاعی</span>
                      <span className="font-black text-foreground block mt-0.5 text-sm">
                        {toPersianDigits(sup.tasksCompletedCount)} / {toPersianDigits(sup.tasksAssignedCount)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">تأییدیه گزارش جمعه</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 block mt-0.5 text-sm">
                        {toPersianDigits(sup.fridayReportsApprovedCount)} گزارش
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-2.5 bg-muted/15 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    تاریخ عضویت در کادر: {formatJalaliDate(new Date(sup.createdAt))}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/supervisor/mentors`}
                      className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>مشاهده عملکرد تفصیلی منتورهای تحت پوشش</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: Mentors */}
      {activeTab === "MENTORS" && (
        <div className="space-y-4">
          {filteredMentors.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-xs">
              پشتیبان علمی با مشخصات جستجو شده یافت نشد.
            </Card>
          ) : (
            filteredMentors.map((men) => {
              const slaColor =
                men.slaCompliancePercent >= 90
                  ? "text-emerald-600 dark:text-emerald-400"
                  : men.slaCompliancePercent >= 75
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-rose-600 dark:text-rose-400";

              return (
                <Card
                  key={men.id}
                  className="border-border overflow-hidden shadow-xs hover:border-primary/50 transition-all bg-card"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-base shrink-0 border border-blue-500/20">
                        {men.fullName.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">{men.fullName}</span>
                          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-[10px]">
                            پشتیبان علمی (منتور)
                          </Badge>
                          {men.callingWindowActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                              ساعت تماس: {toPersianDigits(men.callingWindowTime)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              ساعت تماس: {men.callingWindowTime}
                            </Badge>
                          )}
                          {men.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>فعال</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              غیرفعال
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap font-mono">
                          <span>همراه: {toPersianDigits(men.phoneNumber)}</span>
                          {men.nationalId && <span>کدملی: {toPersianDigits(men.nationalId)}</span>}
                          {men.sipExtension && (
                            <span className="bg-muted px-2 py-0.5 rounded text-[11px]">
                              داخلی تلفن: {toPersianDigits(men.sipExtension)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                        <span className="text-[10px] text-muted-foreground block">داوطلبان اختصاصی</span>
                        <span className="font-black text-foreground block mt-0.5 text-sm">
                          {toPersianDigits(men.assignedStudentsCount)} داوطلب
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                        <span className="text-[10px] text-muted-foreground block">تماس‌های امن هفته</span>
                        <span className="font-black text-foreground block mt-0.5 text-sm">
                          {toPersianDigits(men.weeklyCallsCount)} ({toPersianDigits(men.totalCallMinutes)} دقیقه)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                        <span className="text-[10px] text-muted-foreground block">بازخورد گزارش جمعه</span>
                        <span className="font-black text-foreground block mt-0.5 text-sm">
                          {toPersianDigits(men.fridayReportsReviewed)} /{" "}
                          {toPersianDigits(men.fridayReportsReviewed + men.fridayReportsPending)}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 text-center">
                        <span className="text-[10px] text-muted-foreground block">رعایت مهلت پاسخگویی</span>
                        <span className={`font-black block mt-0.5 text-sm ${slaColor}`}>
                          {toPersianDigits(men.slaCompliancePercent)}٪
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-2.5 bg-muted/15 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      وظایف انجام‌شده: {toPersianDigits(men.tasksCompletedCount)} از{" "}
                      {toPersianDigits(men.tasksReceivedCount)} مأموریت
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/supervisor/mentors`}
                        className="text-primary hover:underline font-bold text-[11px] flex items-center gap-1"
                      >
                        <span>مشاهده پرونده داوطلبان این پشتیبان</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
