import React from "react";
import Link from "next/link";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import {
  studentProfiles,
  scheduleItems,
  mockExams as mockExamsTable,
  studentSchedules,
  examSubmissions,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Flame,
  Scale,
  ArrowLeft,
} from "lucide-react";
import {
  PERSIAN_WEEKDAYS,
  getStudyWeekBoundaries,
  toPersianDigits,
  getPersianDayOfWeek,
  formatJalaliRangeHuman,
} from "@/lib/jalali";
import { StudentDashboardClient } from "./dashboard-client";
import { StudentCallCoachWidget } from "@/components/student/student-call-coach-widget";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";
import { LongitudinalScoreChart } from "@/components/analytics/longitudinal-score-chart";
import { getStudentLongitudinalHistoryAction } from "@/server/actions/exams";

export default async function StudentDashboardPage() {
  const session = await getSession();

  // If not logged in, redirect to login
  if (!session) {
    redirect("/auth/login");
  }

  let studentProfileId = session.studentProfileId;
  let student: typeof studentProfiles.$inferSelect | null = null;
  let items: (typeof scheduleItems.$inferSelect)[] = [];
  let mockExams: (typeof mockExamsTable.$inferSelect)[] = [];

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    if (studentProfileId) {
      const [found] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.id, studentProfileId))
        .limit(1);
      student = found || null;
    }

    if (!student) {
      // Find by user id
      const [foundByUser] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      student = foundByUser || null;
      if (student) {
        studentProfileId = student.id;
      }
    }

    // If still no student profile exists in PostgreSQL, self-heal and insert one
    if (!student) {
      const newProfileId = `profile_${session.userId}`;
      const [created] = await db
        .insert(studentProfiles)
        .values({
          id: newProfileId,
          userId: session.userId,
          mentorId: null, // UNASSIGNED: Enters supervisor queue & student waiting room
          employmentStatus: "UNEMPLOYED",
          isStudent: false,
          maritalStatus: "SINGLE",
          hasChildren: false,
          childrenCount: 0,
          hasFamilyCareDuty: false,
          workdayStudyHoursCap: 8,
          holidayStudyHoursCap: 12,
          bestStudyTime: "MORNING",
          previousBarExamAttempts: 0,
          currentDailyStudyHours: 6,
          masterclassGoal: "قبولی در آزمون وکالت کانون وکلای دادگستری",
          riskStatus: "GREEN",
          riskReason: "داوطلب فعال سامانه مشاهیر دانش",
          hasActiveSupport: true,
          enrolledCourseCode: "MASHAHIR-BAR-360",
          enrolledCourseName: "دوره جامع آمادگی آزمون وکالت",
          lastContactAt: new Date(),
        })
        .returning();
      student = created;
      studentProfileId = newProfileId;
    }

    if (studentProfileId) {
      const [studentSchedule] = await db
        .select({ id: studentSchedules.id })
        .from(studentSchedules)
        .where(eq(studentSchedules.studentProfileId, studentProfileId))
        .limit(1);

      if (studentSchedule) {
        items = await db
          .select()
          .from(scheduleItems)
          .where(eq(scheduleItems.scheduleId, studentSchedule.id));
      }

      mockExams = await db
        .select()
        .from(mockExamsTable)
        .where(eq(mockExamsTable.studentProfileId, studentProfileId))
        .orderBy(desc(mockExamsTable.createdAt));
    }
  } catch (err) {
    console.warn("[StudentDashboard] DB query error:", err);
  }

  // Fetch latest exam submission for two-stage publishing check
  let latestSubmission: (typeof examSubmissions.$inferSelect) | null = null;
  try {
    const [foundSub] = await db
      .select()
      .from(examSubmissions)
      .where(eq(examSubmissions.studentId, session.userId))
      .orderBy(desc(examSubmissions.submittedAt))
      .limit(1);
    latestSubmission = foundSub || null;
  } catch (err) {
    console.warn("[StudentDashboard] examSubmissions query error:", err);
  }

  // Fetch longitudinal history for score trajectory chart (M-15)
  let longitudinalHistory: Awaited<ReturnType<typeof getStudentLongitudinalHistoryAction>> = [];
  try {
    longitudinalHistory = await getStudentLongitudinalHistoryAction(session.userId);
  } catch (err) {
    console.warn("[StudentDashboard] longitudinalHistory query error:", err);
  }

  const { startDateObj, endDateObj, jalaliWeekNumber } = getStudyWeekBoundaries();
  const studyWeekRange = formatJalaliRangeHuman(startDateObj, endDateObj);
  const currentDayIndex = getPersianDayOfWeek(new Date());

  // Copywriting cleanup: strip parenthetical role suffixes from full name (e.g. "(داوطلب کانون وکلا)")
  const cleanFullName = (session.fullName || "داوطلب گرامی")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();

  // Metrics
  const totalTasks = items.length;
  let doneCount = 0;
  let partialCount = 0;
  items.forEach((item) => {
    if (item.status === "DONE") doneCount++;
    else if (item.status === "PARTIAL") partialCount++;
  });
  const executionPercent =
    totalTasks > 0 ? Math.round(((doneCount + 0.5 * partialCount) / totalTasks) * 100) : 0;

  // Actionable risk status metadata
  const riskStatusConfig = {
    GREEN: {
      variant: "green" as const,
      label: "پایدار و عالی",
      reason: student?.riskReason || "عملکرد تحصیلی باثبات و مطابق بودجه‌بندی آزمون وکالت",
    },
    YELLOW: {
      variant: "yellow" as const,
      label: "هشدار مطالعاتی",
      reason: student?.riskReason || "نیازمند جبران ساعت مطالعه و پیگیری برنامه هفتگی",
    },
    RED: {
      variant: "red" as const,
      label: "نیازمند مداخله و پیگیری",
      reason: student?.riskReason || "عدم ثبت گزارش در ۴۸ ساعت گذشته؛ لزوم ارتباط با پشتیبان",
    },
  }[student?.riskStatus || "GREEN"];

  return (
    <div className="space-y-6">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              سلام، {cleanFullName} 👋
            </h1>
            <Badge variant={riskStatusConfig.variant} className="text-xs px-2.5 py-0.5 font-medium">
              {riskStatusConfig.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            هفته مطالعاتی {toPersianDigits(jalaliWeekNumber)} ({studyWeekRange}) • وضعیت پایش:{" "}
            <span className="text-foreground font-medium">{riskStatusConfig.reason}</span>
          </p>
        </div>

        {/* Client Interactive Trigger: Daily Check-in Button */}
        {studentProfileId && (
          <StudentDashboardClient studentProfileId={studentProfileId} items={items} />
        )}
      </div>

      {/* Student Waiting Room Banner (When active support is true but mentorId is null) */}
      {student?.hasActiveSupport && (!student?.mentorId || student.mentorId.trim() === "") && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-5 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    در انتظار تعیین پشتیبان تخصصی (صف انتظار سرپرست آموزشی)
                  </h3>
                  <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-300 text-[10px]">
                    ثبت‌نام تایید شده
                  </Badge>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  داوطلب گرامی، ثبت‌نام و بسته پشتیبانی شما با موفقیت تایید شد. پرونده شما در صف تعیین پشتیبان تخصصی توسط سرپرست آموزشی قرار دارد و ظرف ۲۴ الی ۴۸ ساعت آینده پشتیبان اختصاصی شما تعیین خواهد شد.
                </p>
                <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 pt-1">
                  دوره ثبت‌نامی: <span className="font-semibold text-foreground">{student.enrolledCourseName || "دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI Stat Tiles: Harmonious rounded-xl badges & bottom progress bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Execution */}
        <Card className="p-4 border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">درصد اجرای برنامه</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground persian-nums">
              ٪{toPersianDigits(executionPercent)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {toPersianDigits(doneCount)} پارت تکمیل از {toPersianDigits(totalTasks)} پارت مصوب
            </p>
          </div>
          <Progress value={executionPercent} className="mt-3 h-1.5 rounded-full" indicatorClassName="bg-emerald-500" />
        </Card>

        {/* KPI 2: Streak */}
        <Card className="p-4 border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">استمرار ثبت گزارش</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground persian-nums">
              {toPersianDigits(6)}{" "}
              <span className="text-xs font-normal text-muted-foreground">روز متوالی</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {toPersianDigits(1)} روز تا ثبت رکورد هفته کامل مطالعاتی
            </p>
          </div>
          <Progress value={Math.round((6 / 7) * 100)} className="mt-3 h-1.5 rounded-full" indicatorClassName="bg-amber-500" />
        </Card>

        {/* KPI 3: Daily Study Hours */}
        <Card className="p-4 border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">ساعت مطالعه روزانه</span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground persian-nums">
              {toPersianDigits(student?.currentDailyStudyHours || 5)}{" "}
              <span className="text-xs font-normal text-muted-foreground">ساعت</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              سقف مجاز: {toPersianDigits(student?.workdayStudyHoursCap || 6)} ساعت در روز
            </p>
          </div>
          <Progress
            value={Math.min(100, Math.round(((student?.currentDailyStudyHours || 5) / (student?.workdayStudyHoursCap || 6)) * 100))}
            className="mt-3 h-1.5 rounded-full"
            indicatorClassName="bg-blue-500"
          />
        </Card>

        {/* KPI 4: Exam Score */}
        <Card className="p-4 border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">آخرین تراز آزمون وکالت</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
            </div>
            {latestSubmission?.status === "PUBLISHED_TO_STUDENT" ? (
              <>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
                  ٪{toPersianDigits(Number(latestSubmission.totalPercentage || 0).toFixed(1))}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  تایید شده توسط پشتیبان علمی
                </p>
              </>
            ) : latestSubmission?.status === "AUTO_GRADED_PENDING_MENTOR" ? (
              <>
                <div className="text-lg font-bold text-amber-500 mt-0.5">
                  در انتظار ارزیابی
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  پاسخنامه در دست تحلیل پشتیبان است
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground persian-nums">
                  ٪{toPersianDigits(mockExams[0]?.overallScorePercent || 68)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                  تراز آزمون آزمایشی استاندارد
                </p>
              </>
            )}
          </div>
          <Progress
            value={
              latestSubmission?.status === "PUBLISHED_TO_STUDENT"
                ? Number(latestSubmission.totalPercentage || 0)
                : latestSubmission?.status === "AUTO_GRADED_PENDING_MENTOR"
                ? 50
                : mockExams[0]?.overallScorePercent || 68
            }
            className="mt-3 h-1.5 rounded-full"
            indicatorClassName={
              latestSubmission?.status === "PUBLISHED_TO_STUDENT"
                ? "bg-emerald-500"
                : latestSubmission?.status === "AUTO_GRADED_PENDING_MENTOR"
                ? "bg-amber-500"
                : "bg-purple-500"
            }
          />
        </Card>
      </div>

      {/* Bento Grid: Col 1-7: Mentor Call Widget | Col 8-12: Exam Center Banner & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-7">
          <StudentCallCoachWidget />
        </div>
        <div className="lg:col-span-5">
          <Card className="border-border bg-gradient-to-br from-[#004071]/10 via-card to-card p-4 sm:p-5 h-full flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#004071] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Scale className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="border-[#004071]/30 text-[#004071] dark:text-sky-400 bg-[#004071]/5 text-[10px] px-2 py-0.5">
                  شبیه‌ساز وکالت
                </Badge>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1.5">
                مرکز آزمون‌های شبیه‌ساز و پایش رشد
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                شرکت در آزمون‌های زمان‌دار استاندارد کانون وکلا با محاسبه تراز کشوری، نمره منفی ۱/۳ و صدور کارنامه تفصیلی و تحلیلی توسط پشتیبان آموزشی.
              </p>
            </div>

            <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between gap-3">
              <div className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground persian-nums">
                  {toPersianDigits(mockExams.length || 1)}
                </span>{" "}
                آزمون در دسترس
              </div>
              <Link href="/student/exams">
                <Button size="sm" className="h-9 px-3.5 text-xs font-semibold bg-[#004071] hover:bg-[#00335c] text-white flex items-center gap-1.5 shadow-xs transition-all">
                  <span>ورود به کارتابل آزمون‌ها</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Visual Longitudinal SVG Score Growth Chart (M-15) */}
      {longitudinalHistory.length > 0 && (
        <LongitudinalScoreChart
          data={longitudinalHistory.map((item) => ({
            id: item.submissionId,
            title: item.examTitle,
            category: item.examCategory,
            scorePercent: item.totalPercentage,
            deltaFromPrevious: item.deltaFromPrevious,
            deltaFromBaseline: item.deltaFromBaseline,
            date: item.publishedAt || item.submittedAt,
            mentorNotes: item.mentorNotes,
          }))}
          passingScore={50}
          title="پایش رشد طولی تراز داوطلب در شبیه‌سازهای وکالت"
          subtitle="روند پیشرفت و ارتقای معدل تراز شما در آزمون‌های آزمایشی استاندارد"
        />
      )}

      {/* Multi-Horizon 5-Level Progress Gantt Chart */}
      <MultiHorizonGantt entityType="STUDENT" entityName={cleanFullName} />

      {/* Persian 7-Day Study Week Schedule (Saturday to Friday) */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-sm font-bold text-foreground">
                برنامه راهبردی هفته جاری (شنبه تا جمعه)
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              امروز: <span className="text-foreground font-semibold">{PERSIAN_WEEKDAYS[currentDayIndex]}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {PERSIAN_WEEKDAYS.map((dayName, dayIdx) => {
            const dayTasks = items.filter((it) => it.dayOfWeek === dayIdx);
            const isToday = dayIdx === currentDayIndex;

            return (
              <div
                key={dayName}
                className={`rounded-xl border p-4 transition-all ${
                  isToday
                    ? "border-indigo-500/50 bg-indigo-50/40 dark:bg-[#161824] shadow-md shadow-indigo-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                        isToday ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="text-[10px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        امروز (موعد ثبت گزارش)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground persian-nums">
                    {toPersianDigits(dayTasks.length)} پارت مطالعاتی
                  </span>
                </div>

                {/* Day Tasks List */}
                <div className="space-y-2">
                  {dayTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-1">
                      روز جمع‌بندی، آزمون آزمایشی یا استراحت فعال
                    </p>
                  ) : (
                    dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-border bg-muted/40 text-xs gap-2"
                      >
                        <div className="flex items-center space-x-2.5 space-x-reverse">
                          <span className="font-semibold text-foreground min-w-24">
                            {task.subject}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {task.topicDescription} ({toPersianDigits(task.targetVolume)})
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse self-end sm:self-auto">
                          <span className="text-muted-foreground persian-nums text-[11px]">
                            {toPersianDigits(task.targetDurationMinutes)} دقیقه
                          </span>
                          <Badge
                            variant={
                              task.status === "DONE"
                                ? "green"
                                : task.status === "PARTIAL"
                                ? "yellow"
                                : "outline"
                            }
                          >
                            {task.status === "DONE"
                              ? "انجام شد"
                              : task.status === "PARTIAL"
                              ? "بخشی"
                              : "باقی‌مانده"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
