"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { db } from "../db";
import { hierarchyTasks, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import { sanitizeTextContent } from "@/lib/sanitize";
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

    const cleanTitle = sanitizeTextContent(payload.title);
    const cleanDescription = sanitizeTextContent(payload.description);

    const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newTask: HierarchyTaskRecord = {
      id: taskId,
      senderId: session.userId,
      senderRole: session.role,
      senderName: session.fullName,
      receiverId: receiver.id,
      receiverRole: receiver.role,
      receiverName: receiver.fullName,
      title: cleanTitle,
      description: cleanDescription,
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
      title: cleanTitle,
      description: cleanDescription,
      priority: payload.priority,
      status: "PENDING",
      dueDate: payload.dueDate,
    });

    createdTasks.push(newTask);

    // Send SMS Notification asynchronously (M-14)
    sendSystemSms({
      event: "TASK_ASSIGNED",
      recipientPhone: receiver.phoneNumber,
      recipientName: receiver.fullName,
      variables: {
        priority: payload.priority === "CRITICAL" ? "فوری" : payload.priority === "HIGH" ? "بالا" : "عادی",
        sender: session.fullName,
      },
    }).catch((err) => console.error("[SMS] Failed to send task assigned notification:", err));
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
 * Mark a task as seen by recipient or supervisor/admin
 * Transitions PENDING -> SEEN_IN_PROGRESS with timestamp (Requirement 5.3)
 * Enforces Zero-Trust Access Control (M-05 IDOR protection)
 */
export async function markTaskSeenAction(taskId: string) {
  const session = await requireAuth();

  const [task] = await db
    .select()
    .from(hierarchyTasks)
    .where(eq(hierarchyTasks.id, taskId))
    .limit(1);

  if (!task) {
    return { success: false, message: "وظیفه مورد نظر یافت نشد." };
  }

  const isPrivileged = session.role === "CEO" || session.role === "ADMIN";
  if (!isPrivileged && task.receiverId !== session.userId && task.senderId !== session.userId) {
    return { success: false, message: "شما مجاز به مشاهده یا تغییر وضعیت این وظیفه نیستید." };
  }

  // Only transition if currently PENDING
  if (task.status !== "PENDING") {
    return { success: true, status: task.status, alreadySeen: true, seenAt: task.seenAt };
  }

  const now = new Date();
  await db
    .update(hierarchyTasks)
    .set({
      status: "SEEN_IN_PROGRESS",
      seenAt: now,
      updatedAt: now,
    })
    .where(eq(hierarchyTasks.id, taskId));

  revalidatePath("/tasks");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message: "وضعیت وظیفه به «مشاهده‌شده و در حال پیگیری» تغییر یافت.",
    status: "SEEN_IN_PROGRESS" as TaskStatus,
    seenAt: now,
  };
}

/**
 * Update Hierarchy Task Status via Drizzle ORM
 * Enforces IDOR check and input sanitization (M-04, M-05)
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

  // Check permission: receiver, sender, or CEO/ADMIN
  const isPrivileged = session.role === "CEO" || session.role === "ADMIN";
  if (!isPrivileged && task.receiverId !== session.userId && task.senderId !== session.userId) {
    return { success: false, message: "شما مجاز به تغییر وضعیت این وظیفه نیستید." };
  }

  const cleanNotes = payload.resolutionNotes ? sanitizeTextContent(payload.resolutionNotes) : null;

  const updateData: {
    status: TaskStatus;
    resolutionNotes: string | null;
    updatedAt: Date;
    seenAt?: Date;
  } = {
    status: payload.status,
    resolutionNotes: cleanNotes,
    updatedAt: new Date(),
  };

  if (payload.status === "SEEN_IN_PROGRESS" && !task.seenAt) {
    updateData.seenAt = new Date();
  }

  await db
    .update(hierarchyTasks)
    .set(updateData)
    .where(eq(hierarchyTasks.id, payload.taskId));

  revalidatePath("/tasks");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message: "وضعیت وظیفه با موفقیت به‌روزرسانی شد.",
  };
}

/**
 * Mentor marks task completed -> transitions to COMPLETED_BY_MENTOR
 * awaiting Supervisor or Admin approval
 */
export async function completeHierarchyTaskByMentorAction(payload: {
  taskId: string;
  resolutionNotes: string;
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

  const isPrivileged = session.role === "CEO" || session.role === "ADMIN";
  if (!isPrivileged && task.receiverId !== session.userId && task.senderId !== session.userId) {
    return { success: false, message: "شما مجاز به ثبت انجام این وظیفه نیستید." };
  }

  const cleanNotes = sanitizeTextContent(payload.resolutionNotes);

  await db
    .update(hierarchyTasks)
    .set({
      status: "COMPLETED_BY_MENTOR",
      resolutionNotes: cleanNotes,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(hierarchyTasks.id, payload.taskId));

  revalidatePath("/tasks");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message: "وظیفه با موفقیت تکمیل شد و در صف تأیید سرپرست قرار گرفت.",
  };
}

/**
 * Supervisor or Admin reviews and approves/rejects a completed task
 */
export async function reviewHierarchyTaskAction(payload: {
  taskId: string;
  decision: "APPROVED" | "REJECTED";
  reviewNotes?: string;
}) {
  const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  const [task] = await db
    .select()
    .from(hierarchyTasks)
    .where(eq(hierarchyTasks.id, payload.taskId))
    .limit(1);

  if (!task) {
    return { success: false, message: "وظیفه مورد نظر یافت نشد." };
  }

  const cleanReviewNotes = payload.reviewNotes ? sanitizeTextContent(payload.reviewNotes) : null;
  const finalStatus: TaskStatus = payload.decision === "APPROVED" ? "APPROVED" : "REJECTED";

  await db
    .update(hierarchyTasks)
    .set({
      status: finalStatus,
      reviewedBy: session.userId,
      reviewedByName: session.fullName,
      reviewNotes: cleanReviewNotes,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(hierarchyTasks.id, payload.taskId));

  revalidatePath("/tasks");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message:
      payload.decision === "APPROVED"
        ? "وظیفه با موفقیت تأیید نهایی شد."
        : "وظیفه رد شد و جهت بازبینی به پشتیبان ارجاع داده شد.",
  };
}

/**
 * Edit Hierarchy Task (Requirement 15: Admin Edit CRUD)
 */
export async function editHierarchyTaskAction(payload: {
  taskId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    const [task] = await db
      .select()
      .from(hierarchyTasks)
      .where(eq(hierarchyTasks.id, payload.taskId))
      .limit(1);

    if (!task) {
      return { success: false, message: "وظیفه مورد نظر یافت نشد." };
    }

    const updates: Record<string, unknown> = {
      title: sanitizeTextContent(payload.title.trim()),
      description: sanitizeTextContent(payload.description.trim()),
      priority: payload.priority,
      updatedAt: new Date(),
    };
    if (payload.dueDate) {
      updates.dueDate = payload.dueDate;
    }

    await db
      .update(hierarchyTasks)
      .set(updates)
      .where(eq(hierarchyTasks.id, payload.taskId));

    revalidatePath("/tasks");
    revalidatePath("/supervisor");
    revalidatePath("/executive");

    return {
      success: true,
      message: "مشخصات وظیفه سازمانی با موفقیت ویرایش گردید.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطا در ویرایش وظیفه";
    return { success: false, message: msg };
  }
}

/**
 * Delete Hierarchy Task (Requirement 15: Admin Delete CRUD)
 */
export async function deleteHierarchyTaskAction(
  taskId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

    const [task] = await db
      .select()
      .from(hierarchyTasks)
      .where(eq(hierarchyTasks.id, taskId))
      .limit(1);

    if (!task) {
      return { success: false, message: "وظیفه مورد نظر یافت نشد." };
    }

    await db
      .delete(hierarchyTasks)
      .where(eq(hierarchyTasks.id, taskId));

    revalidatePath("/tasks");
    revalidatePath("/supervisor");
    revalidatePath("/executive");

    return {
      success: true,
      message: "وظیفه سازمانی با موفقیت حذف گردید.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطا در حذف وظیفه";
    return { success: false, message: msg };
  }
}

