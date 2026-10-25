import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import { studentProfiles, triageCases, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { SupervisorDashboardClient } from "./supervisor-client";
import type { StudentProfileRecord } from "@/types/models";

export default async function SupervisorDashboardPage() {
  const session = await getSession();

  if (!session || (session.role !== "SUPERVISOR" && session.role !== "ADMIN" && session.role !== "CEO")) {
    redirect("/auth/login");
  }

  let allStudents: (typeof studentProfiles.$inferSelect)[] = [];
  let allTriage: (typeof triageCases.$inferSelect)[] = [];
  let mentorUsers: (typeof users.$inferSelect)[] = [];

  try {
    await ensureDatabaseBootstrap().catch(() => {});
    allStudents = await db.select().from(studentProfiles);
    allTriage = await db.select().from(triageCases);
    mentorUsers = await db.select().from(users).where(eq(users.role, "MENTOR"));
  } catch (err) {
    console.warn("[SupervisorDashboard] DB query error:", err);
  }

  // Mentors Performance & SLA Compliance from DB
  const mentors = mentorUsers.map((m) => {
    const assigned = allStudents.filter((s) => s.mentorId === m.id);
    const assignedTriage = allTriage.filter((t) => t.mentorId === m.id);
    const resolved = assignedTriage.filter((t) => t.isResolved).length;
    const totalTriggers = assignedTriage.length;
    const slaCompliance = totalTriggers > 0 ? Math.round((resolved / totalTriggers) * 100) : 100;
    const openCrisis = assigned.filter((s) => s.riskStatus === "RED").length;

    return {
      id: m.id,
      name: m.fullName,
      activeStudents: assigned.length,
      resolvedInSla: resolved,
      totalTriggers,
      slaCompliance,
      openCrisis,
    };
  });

  const mentorsList = mentorUsers.map((m) => ({ id: m.id, fullName: m.fullName }));

  // Top Systemic Candidate Obstacles
  const topObstacles = [
    { title: "سختی درک و تطبیق مواد عقود معین (مدنی ۳ و ۶)", count: 42, pct: 68 },
    { title: "کمبود وقت در دور اول پاسخگویی به تست‌های آیین دادرسی", count: 35, pct: 56 },
    { title: "خستگی مفرط ناشی از اشتغال همزمان با آمادگی آزمون", count: 28, pct: 45 },
    { title: "عدم تسلط بر متن عربی و اصطلاحات متون فقه (لمعه)", count: 22, pct: 35 },
    { title: "اضطراب زمان‌بندی و افت انگیزه در تست‌های حقوق تجارت", count: 18, pct: 29 },
  ];

  return (
    <SupervisorDashboardClient
      currentUser={{
        id: session.userId,
        fullName: session.fullName,
        role: session.role,
      }}
      initialStudents={allStudents.map((s) => ({
        id: s.id,
        riskStatus: (s.riskStatus as "GREEN" | "YELLOW" | "RED") || "GREEN",
        enrolledCourseName: s.enrolledCourseName,
        enrolledCourseCode: s.enrolledCourseCode,
        mentorId: s.mentorId,
      }))}
      mentors={mentors}
      mentorsList={mentorsList}
      topObstacles={topObstacles}
    />
  );
}
