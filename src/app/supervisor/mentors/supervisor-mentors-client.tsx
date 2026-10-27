"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  PhoneCall,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Shield,
  FileText,
  Activity,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toPersianDigits } from "@/lib/jalali";
import type { MentorEvaluationRecord, MentorStudentDetail } from "@/server/actions/supervisor";

interface SupervisorMentorsClientProps {
  initialMentors: MentorEvaluationRecord[];
  currentUserRole: string;
}

export function SupervisorMentorsClient({
  initialMentors,
  currentUserRole,
}: SupervisorMentorsClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMentorId, setExpandedMentorId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<MentorStudentDetail | null>(null);

  const filteredMentors = initialMentors.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phoneNumber.includes(searchTerm)
  );

  // Overall aggregates
  const totalStudents = initialMentors.reduce((sum, m) => sum + m.assignedStudentsCount, 0);
  const totalCalls = initialMentors.reduce((sum, m) => sum + m.callsCountWeekly, 0);
  const totalCallHours = Math.round(
    initialMentors.reduce((sum, m) => sum + m.totalCallDurationMinutes, 0) / 60
  );
  const totalPendingReports = initialMentors.reduce((sum, m) => sum + m.pendingFridayReportsCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <span>نظارت و ارزیابی عملکرد پشتیبان‌های علمی (منتورها)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            مشاهده شاخص‌های کلیدی، عملکرد تماس‌ها، گزارش‌های خودارزیابی و داوطلبان تحت نظارت هر پشتیبان
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/supervisor">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              <span>بازگشت به پیشخوان سرپرستی</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Aggregates Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">کل پشتیبان‌های علمی</p>
              <p className="text-lg font-black mt-0.5">{toPersianDigits(initialMentors.length)} پشتیبان</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">داوطلبان تحت نظارت</p>
              <p className="text-lg font-black mt-0.5">{toPersianDigits(totalStudents)} داوطلب</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">تماس‌های هفتگی امن</p>
              <p className="text-lg font-black mt-0.5">
                {toPersianDigits(totalCalls)} تماس ({toPersianDigits(totalCallHours)} ساعت)
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">گزارش‌های در انتظار بازخورد</p>
              <p className="text-lg font-black mt-0.5 text-purple-600 dark:text-purple-400">
                {toPersianDigits(totalPendingReports)} گزارش
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="جستجو در نام پشتیبان یا شماره تماس..."
          className="w-full ps-9 pe-4 py-2.5 text-xs sm:text-sm bg-card border border-border rounded-xl focus:outline-none focus:border-primary shadow-xs"
        />
      </div>

      {/* Mentors List */}
      <div className="space-y-4">
        {filteredMentors.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            پشتیبان علمی منطبق با جستجو یافت نشد.
          </Card>
        ) : (
          filteredMentors.map((mentor) => {
            const isExpanded = expandedMentorId === mentor.mentorId;
            const slaColor =
              mentor.slaCompliancePercent >= 90
                ? "text-emerald-600 dark:text-emerald-400"
                : mentor.slaCompliancePercent >= 75
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400";

            return (
              <Card
                key={mentor.mentorId}
                className="border-border overflow-hidden shadow-xs hover:border-primary/50 transition-all bg-card"
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/20">
                      {mentor.fullName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-foreground">
                          {mentor.fullName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          پشتیبان علمی (منتور)
                        </Badge>
                        {mentor.callingWindow ? (
                          mentor.callingWindow.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                              ساعت تماس: {toPersianDigits(mentor.callingWindow.startTime)} الی {toPersianDigits(mentor.callingWindow.endTime)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              ساعات تماس غیرفعال
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            بدون برنامه تماس
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {toPersianDigits(mentor.phoneNumber)} {mentor.email && `| ${mentor.email}`}
                      </p>
                    </div>
                  </div>

                  {/* Quick Metric Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">داوطلبان</span>
                      <span className="font-bold text-foreground block mt-0.5">
                        {toPersianDigits(mentor.assignedStudentsCount)} نفر
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">تماس‌های هفتگی</span>
                      <span className="font-bold text-foreground block mt-0.5">
                        {toPersianDigits(mentor.callsCountWeekly)} ({toPersianDigits(mentor.totalCallDurationMinutes)} دقیقه)
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">گزارش‌های جمعه</span>
                      <span className="font-bold text-foreground block mt-0.5">
                        {toPersianDigits(mentor.reviewedFridayReportsCount)} / {toPersianDigits(mentor.fridayReportsCount)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-muted/40 border border-border/80 text-center">
                      <span className="text-[10px] text-muted-foreground block">رعایت مهلت پاسخگویی</span>
                      <span className={`font-black block mt-0.5 ${slaColor}`}>
                        {toPersianDigits(mentor.slaCompliancePercent)}٪
                      </span>
                    </div>
                  </div>

                  {/* Expand / Collapse Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedMentorId(isExpanded ? null : mentor.mentorId)}
                    className="text-xs flex items-center justify-center gap-1.5 h-8 shrink-0 border border-border/60"
                  >
                    <span>{isExpanded ? "بستن لیست داوطلبان" : "مشاهده داوطلبان و جزییات"}</span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {/* Expanded Details / Students Roster */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/15 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-primary" />
                        <span>فهرست داوطلبان تحت نظارت مستقیم ({toPersianDigits(mentor.assignedStudents.length)} داوطلب)</span>
                      </h4>
                      <Link
                        href={`/messages`}
                        className="text-[11px] text-primary hover:underline font-medium"
                      >
                        ارسال پیام مستقیم به این پشتیبان
                      </Link>
                    </div>

                    {mentor.assignedStudents.length === 0 ? (
                      <div className="p-4 bg-muted/40 rounded-xl text-center text-xs text-muted-foreground">
                        هنوز داوطلبی به این پشتیبان اختصاص نیافته است. جهت تخصیص داوطلب به منوی «تعیین پشتیبان داوطلبان» مراجعه فرمایید.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mentor.assignedStudents.map((stu) => {
                          const riskBadge =
                            stu.riskStatus === "RED" ? (
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px]">
                                وضعیت پرخطر
                              </Badge>
                            ) : stu.riskStatus === "YELLOW" ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                نیازمند توجه
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                نرمال
                              </Badge>
                            );

                          return (
                            <div
                              key={stu.studentProfileId}
                              className="p-3 bg-card border border-border/80 rounded-xl space-y-2 hover:border-primary/40 transition-all text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-foreground">{stu.fullName}</span>
                                {riskBadge}
                              </div>

                              <div className="space-y-1 text-[11px] text-muted-foreground">
                                <p className="truncate">
                                  دوره: {stu.enrolledCourseName || "دوره آمادگی آزمون وکالت"}
                                </p>
                                <p className="font-mono">
                                  تماس: {toPersianDigits(stu.phoneNumber)}
                                </p>
                                <p>
                                  میانگین مطالعه روزانه: {toPersianDigits(stu.currentDailyStudyHours)} ساعت
                                </p>
                              </div>

                              <div className="pt-1 border-t border-border/40 flex items-center justify-between">
                                <Link
                                  href={`/mentor/student/${stu.studentProfileId}`}
                                  className="text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                                >
                                  <span>پرونده آموزشی کامل</span>
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
