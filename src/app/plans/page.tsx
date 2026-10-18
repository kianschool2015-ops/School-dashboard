import { requireRole } from "@/server/auth/guard";
import { memoryRepo } from "@/server/db";
import { PlansClient } from "./plans-client";
import type { WeeklyPlanTemplateRecord, StudentProfileRecord, ScheduleItemRecord } from "@/types/models";

export default async function PlansPage() {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const templates = memoryRepo.getAllWeeklyPlanTemplates();

  // Get accessible students
  let studentsData: Array<{
    id: string;
    fullName: string;
    nationalId: string;
    phoneNumber: string;
    mentorName: string;
    scheduleItems: Array<{
      dayOfWeek: number;
      subject: string;
      activityType: ScheduleItemRecord["activityType"];
      topicDescription: string;
      targetVolume: string;
      targetDurationMinutes: number;
      isCatchup: boolean;
    }>;
  }> = [];

  let rawStudents: StudentProfileRecord[] = [];
  if (session.role === "MENTOR") {
    rawStudents = memoryRepo.getStudentProfilesByMentorId(session.userId);
  } else {
    // Supervisor or CEO/ADMIN
    rawStudents = memoryRepo.getAllStudentProfiles();
  }

  studentsData = rawStudents.map((st) => {
    const user = memoryRepo.getUserById(st.userId);
    const mentorUser = memoryRepo.getUserById(st.mentorId);
    const items = memoryRepo.getScheduleItemsForStudent(st.id);
    return {
      id: st.id,
      fullName: user?.fullName || "داوطلب آزمون وکالت",
      nationalId: user?.nationalId || "---",
      phoneNumber: user?.phoneNumber || "---",
      mentorName: mentorUser?.fullName || "پشتیبان آموزشی",
      scheduleItems: items.map((it) => ({
        dayOfWeek: it.dayOfWeek,
        subject: it.subject,
        activityType: it.activityType,
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
