import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { ExecutiveInspectorTabs } from "./executive-inspector-tabs";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import {
  users,
  studentProfiles as studentProfilesTable,
  triageCases,
  voipCalls,
  landingContent,
  entitledCourses as entitledCoursesTable,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import type { LandingContentSettings, EntitledCourseRecord } from "@/types/models";

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
    if (session?.role === "MENTOR") redirect("/mentor/students");
    if (session?.role === "SUPERVISOR") redirect("/supervisor");
    redirect("/auth/login");
  }

  let supervisorUser: any = null;
  let mentors: any[] = [];
  let studentProfiles: any[] = [];
  let allTriageCases: any[] = [];
  let allVoipCalls: any[] = [];
  let allUsers: any[] = [];
  let initialLanding = defaultLandingContent;
  let allEntitledCourses: EntitledCourseRecord[] = [];

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    const [sup] = await db
      .select()
      .from(users)
      .where(eq(users.id, "usr_adminsupervisor"))
      .limit(1);
    supervisorUser = sup || null;

    mentors = await db
      .select()
      .from(users)
      .where(eq(users.role, "MENTOR"));

    studentProfiles = await db
      .select()
      .from(studentProfilesTable);

    allTriageCases = await db
      .select()
      .from(triageCases);

    allVoipCalls = await db
      .select()
      .from(voipCalls);

    allUsers = await db
      .select()
      .from(users);

    const [landingRow] = await db
      .select()
      .from(landingContent)
      .where(eq(landingContent.id, "default_landing_cms"))
      .limit(1);

    if (landingRow?.content) {
      initialLanding = {
        ...defaultLandingContent,
        ...(landingRow.content as Partial<LandingContentSettings>),
        features: Array.isArray((landingRow.content as any)?.features)
          ? (landingRow.content as any).features
          : defaultLandingContent.features,
        honors: Array.isArray((landingRow.content as any)?.honors)
          ? (landingRow.content as any).honors
          : defaultLandingContent.honors,
        gallery: Array.isArray((landingRow.content as any)?.gallery)
          ? (landingRow.content as any).gallery
          : defaultLandingContent.gallery,
      };
    }

    const coursesRows = await db
      .select()
      .from(entitledCoursesTable)
      .orderBy(desc(entitledCoursesTable.createdAt));
    allEntitledCourses = coursesRows as unknown as EntitledCourseRecord[];
  } catch (err) {
    console.warn("[ExecutiveDashboard] DB query error:", err);
  }

  const userMap = new Map(allUsers.map((u) => [u.id, u]));

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
      canCreateExams: Boolean(m.canCreateExams),
    };
  });

  const studentsData = studentProfiles.map((p) => {
    const user = userMap.get(p.userId);
    const mentor = userMap.get(p.mentorId || "");

    return {
      id: p.id,
      fullName: user?.fullName || "داوطلب آزمون وکالت",
      phoneNumber: user?.phoneNumber || "۰۹۱۲***",
      mentorName: mentor?.fullName || "پشتیبان آموزشی",
      riskStatus: (p.riskStatus as "GREEN" | "YELLOW" | "RED") || "GREEN",
      weeklyHours: (p.currentDailyStudyHours || 6) * 6,
      goal: p.masterclassGoal || "قبولی در کانون وکلا",
      enrolledCourseName: p.enrolledCourseName || "دوره طلایی آمادگی آزمون وکالت ۳۶۰",
      enrolledCourseCode: p.enrolledCourseCode || "BAR-360",
    };
  });

  const subjectGrowth = [
    { subject: "حقوق مدنی", baseline: 52, current: 68, delta: 16 },
    { subject: "آیین دادرسی مدنی", baseline: 48, current: 62, delta: 14 },
    { subject: "حقوق جزا و جرم‌شناسی", baseline: 58, current: 74, delta: 16 },
    { subject: "آیین دادرسی کیفری", baseline: 55, current: 71, delta: 16 },
    { subject: "حقوق تجارت", baseline: 44, current: 59, delta: 15 },
    { subject: "متون فقه و اصول فقه", baseline: 38, current: 54, delta: 16 },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-9 h-9 rounded-xl bg-[#004071] text-white flex items-center justify-center shadow-md">
              <Scale className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              گزارش مدیریتی پشتیبانی مشاهیر دانش
            </h1>
            <Badge variant="outline" className="border-[#004071]/30 text-[#004071] bg-[#004071]/10 text-xs">
              مدیریت عامل • نظارت فراگیر
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            پایش لحظه‌ای عملکرد سرپرستان، پشتیبانان، داوطلبان نیازمند رسیدگی و مدیریت دوره‌های آموزشی مشاهیر دانش
          </p>
        </div>
      </div>

      {/* Main Tabbed Inspector */}
      <ExecutiveInspectorTabs
        supervisors={supervisorsData}
        mentors={mentorsData}
        students={studentsData}
        subjectGrowth={subjectGrowth}
        initialLandingContent={initialLanding}
        initialEntitledCourses={allEntitledCourses}
      />
    </div>
  );
}
