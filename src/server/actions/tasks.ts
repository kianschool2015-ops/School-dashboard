"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { db } from "../db";
import { hierarchyTasks, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { TaskPriority, TaskStatus, HierarchyTaskRecord } from "@/types/models";

/**
 * Assign a Hierarchy Task (Manager -> Supervisor, Supervisor -> Mentor(s)) via Drizzle ORM
 */
export async function assignHierarchyTaskAction(payload: {
  receiverIds: string[];
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
}) {
  const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  const createdTasks: HierarchyTaskRecord[] = [];

  for (const receiverId of payload.receiverIds) {
    const [receiver] = await db
      .select()
      .from(users)
      .where(eq(users.id, receiverId))
      .limit(1);

    if (!receiver) continue;

    // Supervisor can only assign to Mentors
    if (session.role === "SUPERVISOR" && receiver.role !== "MENTOR") {
      continue;
    }

    const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newTask: HierarchyTaskRecord = {
      id: taskId,
      senderId: session.userId,
      senderRole: session.role,
      senderName: session.fullName,
      receiverId: receiver.id,
      receiverRole: receiver.role,
      receiverName: receiver.fullName,
      title: payload.title.trim(),
      description: payload.description.trim(),
      priority: payload.priority,
      status: "PENDING",
      dueDate: payload.dueDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(hierarchyTasks).values({
      id: taskId,
      senderId: session.userId,
      senderRole: session.role,
      senderName: session.fullName,
      receiverId: receiver.id,
      receiverRole: receiver.role,
      receiverName: receiver.fullName,
      title: payload.title.trim(),
      description: payload.description.trim(),
      priority: payload.priority,
      status: "PENDING",
      dueDate: payload.dueDate,
    });

    createdTasks.push(newTask);

    // Send SMS Notification
    await sendSystemSms({
      event: "TASK_ASSIGNED",
      recipientPhone: receiver.phoneNumber,
      recipientName: receiver.fullName,
      variables: {
        priority: payload.priority === "CRITICAL" ? "فوری" : payload.priority === "HIGH" ? "بالا" : "عادی",
        sender: session.fullName,
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message: `${createdTasks.length} وظیفه سازمانی با موفقیت ثبت و پیامک ارجاع ارسال گردید.`,
    tasksCount: createdTasks.length,
  };
}

/**
 * Update Hierarchy Task Status via Drizzle ORM
 */
export async function updateHierarchyTaskStatusAction(payload: {
  taskId: string;
  status: TaskStatus;
  resolutionNotes?: string;
}) {
  const session = await requireAuth();

  const [task] = await db
    .select()
    .from(hierarchyTasks)
    .where(eq(hierarchyTasks.id, payload.taskId))
    .limit(1);

  if (!task) {
    return { success: false, message: "وظیفه مورد نظر یافت نشد." };
  }

  // Check permission: receiver, sender, or CEO
  if (task.receiverId !== session.userId && task.senderId !== session.userId && session.role !== "CEO") {
    return { success: false, message: "شما مجاز به تغییر وضعیت این وظیفه نیستید." };
  }

  await db
    .update(hierarchyTasks)
    .set({
      status: payload.status,
      resolutionNotes: payload.resolutionNotes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(hierarchyTasks.id, payload.taskId));

  revalidatePath("/tasks");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message: "وضعیت وظیفه با موفقیت به‌روزرسانی شد.",
  };
}
