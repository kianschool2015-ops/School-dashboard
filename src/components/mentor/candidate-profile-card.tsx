"use client";

import React, { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  User,
  Clock,
  Briefcase,
  Heart,
  TrendingUp,
  AlertOctagon,
  PhoneCall,
  Calendar,
  Layers,
  ChevronLeft,
  CheckCircle,
  ShieldAlert,
  Send,
  Wifi,
} from "lucide-react";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";
import { logMentorContactAction } from "@/server/actions/mentor";
import { originateMentorCallAction } from "@/server/actions/voip";
import type { StudentProfileRecord, UserRecord, MockExamRecord } from "@/types/models";

interface CandidateProfileCardProps {
  student: StudentProfileRecord;
  user: UserRecord;
  mockExams: MockExamRecord[];
  onOpenResolveDialog?: () => void;
}

export function CandidateProfileCard({
  student,
  user,
  mockExams,
  onOpenResolveDialog,
}: CandidateProfileCardProps) {
  const [callNote, setCallNote] = useState("");
  const [showCallForm, setShowCallForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [callSuccessMessage, setCallSuccessMessage] = useState("");
  const [isCallingVoip, setIsCallingVoip] = useState(false);
  const [voipFeedback, setVoipFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Zero-Knowledge phone masking: 09121234567 -> ۰۹۱۲***۴۵۶۷
  const maskedPhone = user.phoneNumber && user.phoneNumber.length >= 7
    ? `${user.phoneNumber.substring(0, 4)}***${user.phoneNumber.substring(user.phoneNumber.length - 4)}`
    : "۰۹۱۲***۰۰۰۰";

  const handleOriginateCall = async () => {
    setIsCallingVoip(true);
    setVoipFeedback(null);
    try {
      const res = await originateMentorCallAction({
        studentProfileId: student.id,
        notes: "تماس امن از طریق کلیک روی کارت داوطلب",
      });
      setVoipFeedback({ success: res.success, message: res.message });
    } catch {
      setVoipFeedback({
        success: false,
        message: "خطای سیستمی در برقراری ارتباط با وب‌سرویس ایزابل AMI.",
      });
    } finally {
      setIsCallingVoip(false);
    }
  };

  const handleLogCall = () => {
    if (!callNote.trim()) return;
    startTransition(async () => {
      const res = await logMentorContactAction({
        studentProfileId: student.id,
        notes: callNote,
      });
      if (res.success) {
        setCallSuccessMessage(res.message || "تماس ثبت شد.");
        setCallNote("");
        setTimeout(() => {
          setShowCallForm(false);
          setCallSuccessMessage("");
        }, 1500);
      }
    });
  };

  const riskBadgeVariants: Record<"GREEN" | "YELLOW" | "RED", "green" | "yellow" | "red"> = {
    GREEN: "green",
    YELLOW: "yellow",
    RED: "red",
  };

  const riskLabels: Record<"GREEN" | "YELLOW" | "RED", string> = {
    GREEN: "پایدار و عادی (سبز)",
    YELLOW: "هشدار متوسط (زرد)",
    RED: "بحران حاد (قرمز)",
  };

  const latestExam = mockExams[mockExams.length - 1];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-lg shadow-md shadow-indigo-600/20">
              {user.fullName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <h2 className="text-lg font-bold text-foreground">{user.fullName}</h2>
                <Badge variant={riskBadgeVariants[student.riskStatus]}>
                  {riskLabels[student.riskStatus]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                شماره تماس امن (ماسک‌شده): <span className="persian-nums text-indigo-600 dark:text-indigo-400 font-mono font-bold">{toPersianDigits(maskedPhone)}</span> • هدف: {student.masterclassGoal}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
            {/* Zoiper / Issabel AMI Secure Call Button */}
            <Button
              variant="default"
              size="sm"
              onClick={handleOriginateCall}
              disabled={isCallingVoip}
              className="text-xs flex items-center space-x-1.5 space-x-reverse bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              title="ارسال دستور تماس امن به وب‌سرویس AMI ایزابل و زنگ خوردن اپلیکیشن زویپر پشتیبان"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>{isCallingVoip ? "ارسال به AMI..." : "تماس امن زویپر (Issabel)"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCallForm(!showCallForm)}
              className="text-xs flex items-center space-x-1.5 space-x-reverse border-border hover:bg-muted text-foreground"
            >
              <PhoneCall className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>ثبت یادداشت تماس</span>
            </Button>
            {onOpenResolveDialog && student.riskStatus !== "GREEN" && (
              <Button
                variant="emerald"
                size="sm"
                onClick={onOpenResolveDialog}
                className="text-xs flex items-center space-x-1.5 space-x-reverse"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>تعیین تکلیف و ثبت راهکار آموزشی</span>
              </Button>
            )}
          </div>
        </div>

        {/* VoIP Feedback Notification Banner */}
        {voipFeedback && (
          <div
            className={`border-t px-5 py-3 text-xs flex items-center justify-between ${
              voipFeedback.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 shrink-0" />
              <span>{voipFeedback.message}</span>
            </div>
            <button
              onClick={() => setVoipFeedback(null)}
              className="text-[10px] underline hover:text-foreground"
            >
              بستن
            </button>
          </div>
        )}

        {/* Rapid Call Log Form Dropdown */}
        {showCallForm && (
          <div className="border-t border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">ثبت فوری گزارش تماس مشاوره‌ای:</span>
              {callSuccessMessage && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{callSuccessMessage}</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
                placeholder="خلاصه تماس: بررسی مبحث سقوط تعهدات، توصیه به افزایش زمان تست‌زنی..."
                className="flex-1 text-xs rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground/50 focus:border-indigo-500 focus:outline-none"
              />
              <Button
                size="sm"
                onClick={handleLogCall}
                disabled={isPending || !callNote.trim()}
                className="text-xs"
              >
                <Send className="h-3.5 w-3.5 ms-1" />
                <span>ثبت</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 360-Degree Grid (6 Information Panels) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Panel 1: Intake & Capacity Constraints */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-xs font-bold text-foreground">۱. ظرفیت و قیود زمانی (Intake)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">وضعیت اشتغال:</span>
              <span className="text-foreground font-medium">
                {student.employmentStatus === "FULL_TIME"
                  ? "شاغل تمام‌وقت"
                  : student.employmentStatus === "PART_TIME"
                  ? "شاغل پاره‌وقت"
                  : "داوطلب غیرشاغل"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">وضعیت تاهل و فرزند:</span>
              <span className="text-foreground font-medium">
                {student.maritalStatus === "MARRIED" ? "متاهل" : "مجرد"}
                {student.hasChildren && ` (دارای ${toPersianDigits(student.childrenCount)} فرزند)`}
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">سقف ساعت مطالعه روز کاری:</span>
              <span className="text-foreground font-medium persian-nums">
                حداکثر {toPersianDigits(student.workdayStudyHoursCap)} ساعت
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">سقف ساعت مطالعه روز تعطیل:</span>
              <span className="text-foreground font-medium persian-nums">
                حداکثر {toPersianDigits(student.holidayStudyHoursCap)} ساعت
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">تعداد دفعات آزمون قبلی:</span>
              <span className="text-foreground font-medium persian-nums">
                {toPersianDigits(student.previousBarExamAttempts)} بار
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Panel 2: Live Weekly Telemetry */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-xs font-bold text-foreground">۲. تله‌متری هفتگی (Weekly Telemetry)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">درصد تحقق برنامه (Execution):</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold persian-nums">%۷۸</span>
              </div>
              <Progress value={78} indicatorClassName="bg-emerald-500" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">پیوستگی ثبت گزارش (Consistency):</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold persian-nums">%۸۵</span>
              </div>
              <Progress value={85} indicatorClassName="bg-indigo-500" />
            </div>
            <div className="flex justify-between border-b border-border pb-2 pt-1">
              <span className="text-muted-foreground">تعداد روزهای فعال ثبت:</span>
              <span className="text-foreground font-medium persian-nums">۶ از ۷ روز</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">انباشت مباحث جبرانی:</span>
              <span className="text-amber-700 dark:text-amber-400 font-medium persian-nums">۹۰ دقیقه</span>
            </div>
          </CardContent>
        </Card>

        {/* Panel 3: Academic Trajectory & Subject Scores */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              <CardTitle className="text-xs font-bold text-foreground">۳. سیر آموزشی دروس آزمون وکالت</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {latestExam ? (
              Object.entries(latestExam.subjectScores).map(([subj, score]) => (
                <div key={subj}>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-muted-foreground">{subj}</span>
                    <span
                      className={`font-semibold persian-nums ${
                        score >= 70
                          ? "text-emerald-600 dark:text-emerald-400"
                          : score >= 50
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      %{toPersianDigits(score)}
                    </span>
                  </div>
                  <Progress
                    value={score}
                    indicatorClassName={
                      score >= 70
                        ? "bg-emerald-500"
                        : score >= 50
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }
                  />
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-[11px]">
                اطلاعات تراز کارنامه در آزمون‌های اخیر در حال جمع‌آوری است.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Panel 4: Coaching Adherence Metrics */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-xs font-bold text-foreground">۴. تعهد به عادات مربیگری (Habits)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">نرخ پایبندی به ماموریت‌ها:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold persian-nums">%۷۵</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">تنظیم الگوی خواب کنکوری:</span>
              <span className="text-foreground font-medium">اجرا شده (۶:۳۰ صبح)</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">حاشیه‌نویسی قانون:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">کامل</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">بلوک تمرکز بدون موبایل:</span>
              <span className="text-amber-700 dark:text-amber-400 font-medium">بخشی اجرا شده</span>
            </div>
          </CardContent>
        </Card>

        {/* Panel 5: Communication History & Last Call */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <PhoneCall className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-xs font-bold text-foreground">۵. سوابق ارتباطی و آخرین تماس</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">تاریخ آخرین تماس پشتیبان:</span>
              <span className="text-foreground font-medium">
                {student.lastContactAt
                  ? formatJalaliHuman(new Date(student.lastContactAt))
                  : "هنوز تماسی ثبت نشده"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">وضعیت برقراری تماس:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">موفق</span>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">یادداشت آخرین جلسه مشاوره:</span>
              <p className="text-[11px] text-foreground bg-muted/60 p-2.5 rounded-lg border border-border">
                داوطلب در نحوه مطالعه مواد قانون مدنی با اصول فقه تطبیقی به تسلط رسیده است. تمرکز بر تست‌های سرعتی تجارت تعیین شد.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Panel 6: Active Risk Diagnosis & Triggers */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <AlertOctagon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <CardTitle className="text-xs font-bold text-foreground">۶. تشخیص ریسک و کدهای فعال هشدار</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-muted-foreground">وضعیت کلی ریسک:</span>
              <Badge variant={riskBadgeVariants[student.riskStatus]}>
                {riskLabels[student.riskStatus]}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">علت و تشخیص سیستمی:</span>
              <p className="text-[11px] text-foreground bg-muted/60 p-2.5 rounded-lg border border-border">
                {student.riskReason || "هیچ هشداری در سیستم فعال نیست."}
              </p>
            </div>
            <div className="pt-1">
              <span className="text-muted-foreground block text-[11px]">
                پوشش هوشمند الگوهای A01 تا A09 با زمان پاسخگویی منطبق بر توافق‌نامه سطح خدمات (SLA).
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
