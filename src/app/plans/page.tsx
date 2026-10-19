import { requireRole } from "@/server/auth/guard";
import { db } from "@/server/db";
import { weeklyPlanTemplates, studentProfiles, users, scheduleItems, studentSchedules } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { PlansClient } from "./plans-client";
import type { WeeklyPlanTemplateRecord, StudentProfileRecord, ScheduleItemRecord } from "@/types/models";

export default async function PlansPage() {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const templateRows = await db
    .select()
    .from(weeklyPlanTemplates)
    .orderBy(desc(weeklyPlanTemplates.createdAt));
  const templates = templateRows as unknown as WeeklyPlanTemplateRecord[];

  // Get accessible students
  let rawStudents: StudentProfileRecord[] = [];
  if (session.role === "MENTOR") {
    const rows = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.mentorId, session.userId));
    rawStudents = rows as unknown as StudentProfileRecord[];
  } else {
    // Supervisor or CEO/ADMIN
    const rows = await db
      .select()
      .from(studentProfiles);
    rawStudents = rows as unknown as StudentProfileRecord[];
  }

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allSchedules = await db.select().from(studentSchedules);
  const studentScheduleMap = new Map(allSchedules.map((s) => [s.studentProfileId, s.id]));

  const allScheduleItems = await db.select().from(scheduleItems);

  const studentsData = rawStudents.map((st) => {
    const user = userMap.get(st.userId);
    const mentorUser = st.mentorId ? userMap.get(st.mentorId) : null;
    const studentSchedId = studentScheduleMap.get(st.id);
    const items = allScheduleItems.filter((it) => it.scheduleId === studentSchedId || it.scheduleId === st.id);
    return {
      id: st.id,
      fullName: user?.fullName || "داوطلب آزمون وکالت",
      nationalId: user?.nationalId || "---",
      phoneNumber: user?.phoneNumber || "---",
      mentorName: mentorUser?.fullName || "پشتیبان آموزشی",
      scheduleItems: items.map((it) => ({
        dayOfWeek: it.dayOfWeek,
        subject: it.subject,
        activityType: it.activityType as ScheduleItemRecord["activityType"],
        topicDescription: it.topicDescription,
        targetVolume: it.targetVolume,
        targetDurationMinutes: it.targetDurationMinutes,
        isCatchup: it.isCatchup,
      })),
    };
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PlansClient
        currentUser={{
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        }}
        templates={templates}
        students={studentsData}
      />
    </div>
  );
}
