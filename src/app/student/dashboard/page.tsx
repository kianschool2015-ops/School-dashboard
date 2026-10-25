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
} from "@/lib/jalali";
import { StudentDashboardClient } from "./dashboard-client";
import { StudentCallCoachWidget } from "@/components/student/student-call-coach-widget";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";

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
          mentorId: "usr_mentor1",
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
          enrolledCourseCode: "GARNET-BAR-360",
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

  const { weekStartDate, weekEndDate, jalaliWeekNumber } = getStudyWeekBoundaries();
  const currentDayIndex = getPersianDayOfWeek(new Date());

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

  return (
    <div className="space-y-6">
      {/* Top Banner & Welcome */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              سلام، {session.fullName} 👋
            </h1>
            <Badge
              variant={
                student?.riskStatus === "RED"
                  ? "red"
                  : student?.riskStatus === "YELLOW"
                  ? "yellow"
                  : "green"
              }
            >
              {student?.riskStatus === "RED"
                ? "نیازمند مداخله و پیگیری"
                : student?.riskStatus === "YELLOW"
                ? "هشدار مطالعاتی"
                : "پایدار و عالی"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            هفته مطالعاتی {toPersianDigits(jalaliWeekNumber)} ({weekStartDate} تا {weekEndDate}) • هدف:{" "}
            {student?.masterclassGoal || "قبولی در آزمون وکالت کانون و مرکز وکلا"}
          </p>
        </div>

        {/* Client Interactive Trigger: Daily Check-in Button */}
        {studentProfileId && (
          <StudentDashboardClient studentProfileId={studentProfileId} items={items} />
        )}
      </div>

      {/* Coach Calling Hours & Reverse AMI Calling Widget */}
      <StudentCallCoachWidget />

      {/* KPI Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">درصد اجرای برنامه</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground persian-nums">
            %{toPersianDigits(executionPercent)}
          </div>
          <Progress value={executionPercent} className="mt-2 h-1.5" indicatorClassName="bg-emerald-500" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">استمرار ثبت (Streak)</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground persian-nums">
            {toPersianDigits(6)}{" "}
            <span className="text-xs font-normal text-muted-foreground">روز متوالی</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">۱ روز تا ثبت رکورد هفته کامل</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">ساعت مطالعه روزانه</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground persian-nums">
            {toPersianDigits(student?.currentDailyStudyHours || 5)}{" "}
            <span className="text-xs font-normal text-muted-foreground">ساعت</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            سقف مجاز: {toPersianDigits(student?.workdayStudyHoursCap || 6)} ساعت
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">آخرین تراز آزمون وکالت</span>
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          {latestSubmission?.status === "PUBLISHED_TO_STUDENT" ? (
            <>
              <div className="text-2xl font-bold text-emerald-500 persian-nums">
                %{toPersianDigits(Number(latestSubmission.totalPercentage || 0).toFixed(1))}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                تایید شده توسط پشتیبان علمی
              </p>
            </>
          ) : latestSubmission?.status === "AUTO_GRADED_PENDING_MENTOR" ? (
            <>
              <div className="text-base font-bold text-amber-500 mt-1">
                در انتظار تایید
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                پاسخنامه در دست تحلیل پشتیبان است
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground persian-nums">
                %{toPersianDigits(mockExams[0]?.overallScorePercent || 68)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                تراز استاندارد کشوری
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Online Exam & Longitudinal Scorecard Banner */}
      <Card className="border-border bg-gradient-to-r from-[#004071]/10 via-card to-card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#004071] text-white flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                مرکز آزمون‌های شبیه‌ساز وکالت و پایش رشد طولی
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                شرکت در آزمون‌های زمان‌دار استاندارد کانون وکلا با نمره منفی ۱/۳ و مشاهده کارنامه تحلیلی پشتیبان
              </p>
            </div>
          </div>

          <Link href="/student/exams">
            <Button size="sm" className="text-xs bg-[#004071] hover:bg-[#00335c] text-white flex items-center gap-1.5 shrink-0">
              <span>ورود به کارتابل آزمون‌ها</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </Card>

      {/* Multi-Horizon 5-Level Progress Gantt Chart */}
      <MultiHorizonGantt entityType="STUDENT" entityName={session.fullName} />

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
