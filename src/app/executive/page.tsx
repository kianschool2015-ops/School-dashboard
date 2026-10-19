import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { ExecutiveInspectorTabs } from "./executive-inspector-tabs";
import { db } from "@/server/db";
import { users, studentProfiles as studentProfilesTable, triageCases, voipCalls, landingContent } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { LandingContentSettings } from "@/types/models";

const defaultLandingContent: LandingContentSettings = {
  heroBadge: "سامانه پایش هوشمند ۳۶۰ درجه",
  heroTitle: "پشتیبانی آموزشی مشاهیر دانش",
  heroSubtitle: "سامانه هدایت تحصیلی، پایش عملکرد و رفع بحران داوطلبان آزمون‌های وکالت",
  featuresTitle: "خدمات ۳۶۰ درجه آموزشی",
  honorsTitle: "افتخارات و رتبه‌های برتر",
  ctaTitle: "شروع قدرتمند در مشاهیر دانش",
  ctaSubtitle: "با همراهی برترین اساتید و پشتیبانان حقوق کشور، مسیر قبولی را هوشمندانه طی کنید.",
  phoneNumber: "۰۲۱-۸۸۸۸۸۸۸۸",
  brandColor: "#004071",
  accentColor: "#F59E0B",
  features: [],
  honors: [],
  gallery: [],
};

export default async function ExecutiveDashboardPage() {
  const session = await getSession();

  // Strict Level 4 Zero-Trust Guard: Only CEO and ADMIN
  if (!session || (session.role !== "CEO" && session.role !== "ADMIN")) {
    if (session?.role === "STUDENT") redirect("/student/dashboard");
    if (session?.role === "MENTOR") redirect("/mentor/triage");
    if (session?.role === "SUPERVISOR") redirect("/supervisor");
    redirect("/auth/login");
  }

  // Fetch hierarchical inspection data via Drizzle ORM
  const [supervisorUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, "usr_adminsupervisor"))
    .limit(1);

  const mentors = await db
    .select()
    .from(users)
    .where(eq(users.role, "MENTOR"));

  const studentProfiles = await db
    .select()
    .from(studentProfilesTable);

  const allTriageCases = await db
    .select()
    .from(triageCases);

  const allVoipCalls = await db
    .select()
    .from(voipCalls);

  const allUsers = await db
    .select()
    .from(users);

  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const [landingRow] = await db
    .select()
    .from(landingContent)
    .where(eq(landingContent.id, "default_landing_cms"))
    .limit(1);

  const initialLanding = (landingRow?.content as LandingContentSettings) || defaultLandingContent;

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
    const assignedProfiles = studentProfiles.filter((p) => p.mentorId === m.id);
    const mentorTriage = allTriageCases.filter((c) => c.mentorId === m.id);
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
    const u = userMap.get(p.userId);
    const mentor = p.mentorId ? userMap.get(p.mentorId) : null;
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
      goal: p.masterclassGoal || "",
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
        initialLandingContent={initialLanding}
      />
    </div>
  );
}
