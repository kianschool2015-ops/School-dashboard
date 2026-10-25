import { requireRole } from "@/server/auth/guard";
import { db } from "@/server/db";
import { hierarchyTasks, users } from "@/server/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { TasksClient } from "./tasks-client";
import type { HierarchyTaskRecord } from "@/types/models";

export default async function TasksPage() {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  // Fetch tasks
  let tasks: HierarchyTaskRecord[] = [];
  if (session.role === "CEO" || session.role === "ADMIN") {
    const rows = await db
      .select()
      .from(hierarchyTasks)
      .orderBy(desc(hierarchyTasks.createdAt));
    tasks = rows as unknown as HierarchyTaskRecord[];
  } else if (session.role === "SUPERVISOR") {
    // Tasks received by supervisor or sent by supervisor
    const rows = await db
      .select()
      .from(hierarchyTasks)
      .where(
        or(
          eq(hierarchyTasks.receiverId, session.userId),
          eq(hierarchyTasks.senderId, session.userId)
        )
      )
      .orderBy(desc(hierarchyTasks.createdAt));
    tasks = rows as unknown as HierarchyTaskRecord[];
  } else {
    // Mentor: tasks assigned to them
    const rows = await db
      .select()
      .from(hierarchyTasks)
      .where(eq(hierarchyTasks.receiverId, session.userId))
      .orderBy(desc(hierarchyTasks.createdAt));
    tasks = rows as unknown as HierarchyTaskRecord[];
  }

  // Potential assignees
  const allUsers = await db.select().from(users);
  let assignees: Array<{ id: string; fullName: string; role: string }> = [];
  if (session.role === "CEO" || session.role === "ADMIN") {
    const supervisors = allUsers.filter((u) => u.role === "SUPERVISOR");
    const mentors = allUsers.filter((u) => u.role === "MENTOR");
    assignees = [
      ...supervisors.map((s) => ({ id: s.id, fullName: s.fullName, role: "سرپرست گروه آموزشی" })),
      ...mentors.map((m) => ({ id: m.id, fullName: m.fullName, role: "پشتیبان آموزشی" })),
    ];
  } else if (session.role === "SUPERVISOR") {
    const mentors = allUsers.filter((u) => u.role === "MENTOR");
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
