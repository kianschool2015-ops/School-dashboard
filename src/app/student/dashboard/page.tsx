import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { memoryRepo } from "@/server/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  Award,
  BookOpen,
  Layers,
  Flame,
} from "lucide-react";
import {
  PERSIAN_WEEKDAYS,
  getStudyWeekBoundaries,
  formatJalaliHuman,
  toPersianDigits,
  getPersianDayOfWeek,
} from "@/lib/jalali";
import { StudentDashboardClient } from "./dashboard-client";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";

export default async function StudentDashboardPage() {
  const session = await getSession();

  // If not logged in, redirect to login
  if (!session) {
    redirect("/auth/login");
  }

  const studentProfileId = session.studentProfileId || "profile_stu_1";
  const student = memoryRepo.getStudentProfileById(studentProfileId);
  const items = memoryRepo.getScheduleItemsForStudent(studentProfileId);
  const mockExams = memoryRepo.getMockExamsForStudent(studentProfileId);

  const { weekStartDate, weekEndDate, jalaliWeekNumber, jalaliYear } = getStudyWeekBoundaries();
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
            <Badge variant={student?.riskStatus === "RED" ? "red" : student?.riskStatus === "YELLOW" ? "yellow" : "green"}>
              {student?.riskStatus === "RED"
                ? "نیازمند مداخله و پیگیری"
                : student?.riskStatus === "YELLOW"
                ? "هشدار مطالعاتی"
                : "پایدار و عالی"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            هفته مطالعاتی {toPersianDigits(jalaliWeekNumber)} ({weekStartDate} تا {weekEndDate}) • هدف: {student?.masterclassGoal}
          </p>
        </div>

        {/* Client Interactive Trigger: Daily Check-in Button */}
        <StudentDashboardClient
          studentProfileId={studentProfileId}
          items={items}
        />
      </div>

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
            {toPersianDigits(6)} <span className="text-xs font-normal text-muted-foreground">روز متوالی</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">۱ روز تا ثبت رکورد هفته کامل</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">ساعت مطالعه روزانه</span>
            <Clock className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground persian-nums">
            {toPersianDigits(student?.currentDailyStudyHours || 5)} <span className="text-xs font-normal text-muted-foreground">ساعت</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">سقف مجاز: {toPersianDigits(student?.workdayStudyHoursCap || 6)} ساعت</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs">آخرین تراز آزمون جامع</span>
            <Award className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground persian-nums">
            %{toPersianDigits(mockExams[0]?.overallScorePercent || 68)}
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">+۴٪ نسبت به آزمون قبلی</p>
        </Card>
      </div>

      {/* Multi-Horizon 5-Level Progress Gantt Chart */}
      <MultiHorizonGantt
        entityType="STUDENT"
        entityName={session.fullName}
      />

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
                        isToday
                          ? "bg-indigo-600 text-white"
                          : "bg-muted text-muted-foreground"
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
