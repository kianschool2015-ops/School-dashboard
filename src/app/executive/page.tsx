import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { ExecutiveInspectorTabs } from "./executive-inspector-tabs";
import { memoryRepo } from "@/server/db";

export default async function ExecutiveDashboardPage() {
  const session = await getSession();

  // Strict Level 4 Zero-Trust Guard: Only CEO and ADMIN
  if (!session || (session.role !== "CEO" && session.role !== "ADMIN")) {
    if (session?.role === "STUDENT") redirect("/student/dashboard");
    if (session?.role === "MENTOR") redirect("/mentor/triage");
    if (session?.role === "SUPERVISOR") redirect("/supervisor");
    redirect("/auth/login");
  }

  // Fetch hierarchical inspection data
  const supervisorUser = memoryRepo.getUserById("usr_adminsupervisor");
  const mentors = memoryRepo.getAllMentors();
  const studentProfiles = memoryRepo.getAllStudentProfiles();
  const allTriageCases = memoryRepo.getAllTriageCases();
  const allVoipCalls = memoryRepo.getAllVoipCalls();

  const supervisorsData = supervisorUser
    ? [
        {
          id: supervisorUser.id,
          fullName: supervisorUser.fullName,
          username: supervisorUser.username || "adminsupervisor",
          phoneNumber: supervisorUser.phoneNumber,
          mentorsCount: mentors.length,
          studentsCount: studentProfiles.length,
          openTriageCount: allTriageCases.filter((c) => !c.isResolved).length,
        },
      ]
    : [];

  const mentorsData = mentors.map((m) => {
    const assignedProfiles = memoryRepo.getStudentProfilesByMentorId(m.id);
    const mentorTriage = memoryRepo.getTriageCasesByMentor(m.id, false);
    const mentorCalls = allVoipCalls.filter((c) => c.mentorId === m.id);

    return {
      id: m.id,
      fullName: m.fullName,
      phoneNumber: m.phoneNumber,
      sipExtension: m.sipExtension || "101",
      studentsCount: assignedProfiles.length,
      activeTriageCount: mentorTriage.filter((c) => !c.isResolved).length,
      resolvedTriageCount: mentorTriage.filter((c) => c.isResolved).length,
      callsCount: mentorCalls.length,
    };
  });

  const studentsData = studentProfiles.map((p) => {
    const u = memoryRepo.getUserById(p.userId);
    const mentor = memoryRepo.getUserById(p.mentorId);
    return {
      id: p.id,
      fullName: u?.fullName || "داوطلب وکالت",
      phoneNumber: u?.phoneNumber || "09120000000",
      mentorName: mentor?.fullName || "پشتیبان اختصاصی",
      riskStatus: p.riskStatus,
      weeklyHours:
        (p.workdayStudyHoursCap * 5) + (p.holidayStudyHoursCap * 2) ||
        (p.currentDailyStudyHours * 7) ||
        0,
      goal: p.masterclassGoal,
    };
  });

  // Macro institutional metrics: Delta between Baseline & Current Benchmark across Legal Subjects
  const subjectGrowth = [
    { subject: "حقوق مدنی", baseline: 42, current: 71, delta: +29 },
    { subject: "حقوق تجارت", baseline: 38, current: 67, delta: +29 },
    { subject: "آیین دادرسی مدنی", baseline: 45, current: 69, delta: +24 },
    { subject: "حقوق جزا عمومی و اختصاصی", baseline: 50, current: 78, delta: +28 },
    { subject: "آیین دادرسی کیفری", baseline: 48, current: 74, delta: +26 },
    { subject: "متون فقه و اصول فقه", baseline: 32, current: 61, delta: +29 },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center space-x-2 space-x-reverse">
            <Scale className="h-5 w-5 text-indigo-400" />
            <span>گزارش راهبردی مدیریت ارشد پشتیبانی مشاهیر دانش</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            داشبورد تصمیم‌گیری کلان موسسه • پایش شاخص‌های رشد علمی، ماندگاری داوطلبان و پیش‌بینی قبولی در کانون وکلا
          </p>
        </div>

        <Badge variant="green" className="text-xs px-3 py-1">
          شاخص سلامت سازمانی: ۹۴.۲٪ (بسیار مطلوب)
        </Badge>
      </div>

      {/* 5 Structured Drill-Down Tabs (Macro Metrics / Supervisors / Mentors / Critical Students / Landing CMS) */}
      <ExecutiveInspectorTabs
        supervisors={supervisorsData}
        mentors={mentorsData}
        students={studentsData}
        subjectGrowth={subjectGrowth}
        initialLandingContent={memoryRepo.getLandingContent()}
      />
    </div>
  );
}
