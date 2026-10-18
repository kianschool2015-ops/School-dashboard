import { requireRole } from "@/server/auth/guard";
import { memoryRepo } from "@/server/db";
import { TasksClient } from "./tasks-client";
import type { HierarchyTaskRecord, UserRecord } from "@/types/models";

export default async function TasksPage() {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  // Fetch tasks
  let tasks: HierarchyTaskRecord[] = [];
  if (session.role === "CEO" || session.role === "ADMIN") {
    tasks = memoryRepo.getAllTasks();
  } else if (session.role === "SUPERVISOR") {
    // Tasks received by supervisor or sent by supervisor
    tasks = memoryRepo.getAllTasks().filter(
      (t) => t.receiverId === session.userId || t.senderId === session.userId
    );
  } else {
    // Mentor: tasks assigned to them
    tasks = memoryRepo.getTasksForReceiver(session.userId);
  }

  // Potential assignees
  let assignees: Array<{ id: string; fullName: string; role: string }> = [];
  if (session.role === "CEO" || session.role === "ADMIN") {
    const supervisors = memoryRepo.getAllUsers().filter((u) => u.role === "SUPERVISOR");
    const mentors = memoryRepo.getAllMentors();
    assignees = [
      ...supervisors.map((s) => ({ id: s.id, fullName: s.fullName, role: "سرپرست کوهورت" })),
      ...mentors.map((m) => ({ id: m.id, fullName: m.fullName, role: "پشتیبان آموزشی" })),
    ];
  } else if (session.role === "SUPERVISOR") {
    const mentors = memoryRepo.getAllMentors();
    assignees = mentors.map((m) => ({ id: m.id, fullName: m.fullName, role: "پشتیبان آموزشی" }));
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <TasksClient
        currentUser={{
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        }}
        tasks={tasks}
        assignees={assignees}
      />
    </div>
  );
}
