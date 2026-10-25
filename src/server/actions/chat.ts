"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { db } from "../db";
import { chatConversations, chatMessages, studentProfiles } from "../db/schema";
import { eq, asc, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type {
  ChatConversationRecord,
  ChatMessageRecord,
  ConversationType,
} from "@/types/models";

/**
 * Get all conversations accessible to the current user via Drizzle ORM
 * CEO / ADMIN gets omniscient access to ALL channels, groups, and direct threads!
 */
export async function getConversationsAction(): Promise<ChatConversationRecord[]> {
  const session = await requireAuth();

  const all = await db.select().from(chatConversations);

  if (session.role === "CEO" || session.role === "ADMIN") {
    return all as unknown as ChatConversationRecord[];
  }

  return all.filter((c) => {
    if (c.type === "CHANNEL") return true;
    const members = (c.memberIds as string[]) || [];
    return members.includes(session.userId);
  }) as unknown as ChatConversationRecord[];
}

/**
 * Create a new Channel or Group via Drizzle ORM
 */
export async function createConversationAction(payload: {
  title: string;
  type: ConversationType;
  description?: string;
  memberIds?: string[];
  isChannelReadOnlyForStudents?: boolean;
}) {
  const session = await requireAuth();

  if (session.role === "STUDENT") {
    throw new Error("FORBIDDEN: داوطلبان مجاز به ایجاد کانال یا گروه جدید نیستند.");
  }

  await requireRole(["CEO", "ADMIN", "SUPERVISOR", "MENTOR"]);

  const convId = `conv_${payload.type.toLowerCase()}_${Date.now()}`;
  const members = Array.from(
    new Set([session.userId, ...(payload.memberIds || [])])
  );

  const newConv: ChatConversationRecord = {
    id: convId,
    type: payload.type,
    title: payload.title.trim(),
    description: payload.description?.trim(),
    creatorId: session.userId,
    creatorRole: session.role,
    creatorName: session.fullName,
    memberIds: members,
    isChannelReadOnlyForStudents: payload.type === "CHANNEL" ? true : (payload.isChannelReadOnlyForStudents ?? false),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(chatConversations).values({
    id: convId,
    type: payload.type,
    title: payload.title.trim(),
    description: payload.description?.trim() || null,
    creatorId: session.userId,
    creatorRole: session.role,
    creatorName: session.fullName,
    memberIds: members,
    isChannelReadOnlyForStudents: payload.type === "CHANNEL" ? true : (payload.isChannelReadOnlyForStudents ?? false),
  });

  revalidatePath("/messages");
  revalidatePath("/executive");

  return {
    success: true,
    message: `${payload.type === "CHANNEL" ? "کانال" : "گروه"} با موفقیت ایجاد گردید.`,
    conversation: newConv,
  };
}

/**
 * Get messages for a specific conversation via Drizzle ORM
 */
export async function getMessagesAction(conversationId: string): Promise<ChatMessageRecord[]> {
  const session = await requireAuth();

  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, conversationId))
    .limit(1);

  if (!conv) {
    throw new Error("گفتگو یافت نشد.");
  }

  // CEO / ADMIN has omniscient visibility
  if (session.role !== "CEO" && session.role !== "ADMIN") {
    const members = (conv.memberIds as string[]) || [];
    if (conv.type !== "CHANNEL" && !members.includes(session.userId)) {
      throw new Error("شما عضو این گفتگو نیستید.");
    }
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(asc(chatMessages.createdAt));

  return messages as unknown as ChatMessageRecord[];
}

/**
 * Send a message in a conversation with optional attachment (up to 10MB) via Drizzle ORM
 */
export async function sendMessageAction(payload: {
  conversationId: string;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentType?: string;
}) {
  const session = await requireAuth();

  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, payload.conversationId))
    .limit(1);

  if (!conv) {
    return { success: false, message: "گفتگو یافت نشد." };
  }

  const members = (conv.memberIds as string[]) || [];

  // Enforce membership for non-channel conversations
  if (conv.type !== "CHANNEL" && session.role !== "CEO" && session.role !== "ADMIN") {
    if (!members.includes(session.userId)) {
      return {
        success: false,
        message: "شما عضو این گفتگو نیستید و مجاز به ارسال پیام نمی‌باشید.",
      };
    }
  }

  // Student check for read-only channels
  if (session.role === "STUDENT" && conv.type === "CHANNEL" && conv.isChannelReadOnlyForStudents) {
    return {
      success: false,
      message: "این کانال فقط جهت اطلاع‌رسانی است و امکان ارسال پیام برای داوطلبان وجود ندارد.",
    };
  }

  // Attachment validation (up to 10MB)
  if (payload.attachmentSize && payload.attachmentSize > 10 * 1024 * 1024) {
    return {
      success: false,
      message: "حجم فایل پیوست نمی‌تواند بیش از ۱۰ مگابایت باشد.",
    };
  }

  const msgId = `cmsg_${Date.now()}`;
  const newMsg: ChatMessageRecord = {
    id: msgId,
    conversationId: payload.conversationId,
    senderId: session.userId,
    senderName: session.fullName,
    senderRole: session.role,
    message: payload.message.trim(),
    attachmentUrl: payload.attachmentUrl,
    attachmentName: payload.attachmentName,
    attachmentSize: payload.attachmentSize,
    attachmentType: payload.attachmentType,
    createdAt: new Date(),
  };

  await db.insert(chatMessages).values({
    id: msgId,
    conversationId: payload.conversationId,
    senderId: session.userId,
    senderName: session.fullName,
    senderRole: session.role,
    message: payload.message.trim(),
    attachmentUrl: payload.attachmentUrl || null,
    attachmentName: payload.attachmentName || null,
    attachmentSize: payload.attachmentSize || null,
    attachmentType: payload.attachmentType || null,
  });

  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, payload.conversationId));

  revalidatePath("/messages");
  revalidatePath("/executive");

  return {
    success: true,
    message: "پیام با موفقیت ارسال گردید.",
    messageRecord: newMsg,
  };
}

/**
 * Add Member to Channel or Group (Requirement 5: Channel Member Management)
 */
export async function addMemberToConversationAction(payload: {
  conversationId: string;
  userId: string;
}) {
  const session = await requireAuth();

  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, payload.conversationId))
    .limit(1);

  if (!conv) {
    return { success: false, message: "گفتگو یافت نشد." };
  }

  // Only Admin, CEO, Supervisor or the creator can manage members
  const canManage =
    session.role === "CEO" ||
    session.role === "ADMIN" ||
    session.role === "SUPERVISOR" ||
    conv.creatorId === session.userId;

  if (!canManage) {
    return { success: false, message: "شما مجوز مدیریت اعضای این گفتگو را ندارید." };
  }

  const currentMembers = Array.isArray(conv.memberIds) ? (conv.memberIds as string[]) : [];
  if (currentMembers.includes(payload.userId)) {
    return { success: false, message: "کاربر مورد نظر در حال حاضر عضو این گفتگو است." };
  }

  const updatedMembers = [...currentMembers, payload.userId];

  await db
    .update(chatConversations)
    .set({
      memberIds: updatedMembers,
      updatedAt: new Date(),
    })
    .where(eq(chatConversations.id, payload.conversationId));

  revalidatePath("/messages");

  return {
    success: true,
    message: "عضو جدید با موفقیت به گفتگو اضافه شد.",
    memberIds: updatedMembers,
  };
}

/**
 * Remove Member from Channel or Group (Requirement 5: Channel Member Management)
 */
export async function removeMemberFromConversationAction(payload: {
  conversationId: string;
  userId: string;
}) {
  const session = await requireAuth();

  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, payload.conversationId))
    .limit(1);

  if (!conv) {
    return { success: false, message: "گفتگو یافت نشد." };
  }

  // Only Admin, CEO, Supervisor or creator can manage members
  const canManage =
    session.role === "CEO" ||
    session.role === "ADMIN" ||
    session.role === "SUPERVISOR" ||
    conv.creatorId === session.userId;

  if (!canManage) {
    return { success: false, message: "شما مجوز حذف اعضای این گفتگو را ندارید." };
  }

  const currentMembers = Array.isArray(conv.memberIds) ? (conv.memberIds as string[]) : [];
  const updatedMembers = currentMembers.filter((id) => id !== payload.userId);

  await db
    .update(chatConversations)
    .set({
      memberIds: updatedMembers,
      updatedAt: new Date(),
    })
    .where(eq(chatConversations.id, payload.conversationId));

  revalidatePath("/messages");

  return {
    success: true,
    message: "کاربر با موفقیت از گفتگو حذف گردید.",
    memberIds: updatedMembers,
  };
}

/**
 * Toggle Ghost/Incognito Monitoring Mode on Conversation (Requirement 5)
 */
export async function toggleConversationGhostModeAction(payload: {
  conversationId: string;
  isGhostMode: boolean;
}) {
  const session = await requireRole(["CEO", "ADMIN", "SUPERVISOR"]);

  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, payload.conversationId))
    .limit(1);

  if (!conv) {
    return { success: false, message: "گفتگو یافت نشد." };
  }

  await db
    .update(chatConversations)
    .set({
      isGhostMode: payload.isGhostMode,
      updatedAt: new Date(),
    })
    .where(eq(chatConversations.id, payload.conversationId));

  revalidatePath("/messages");

  return {
    success: true,
    message: payload.isGhostMode
      ? "حالت نظارت نامحسوس (Ghost Mode) برای این گفتگو فعال گردید."
      : "حالت نظارت عادی فعال شد.",
  };
}

/**
 * Bulk Add Members by Course to Channel or Group (Requirement 4.5)
 */
export async function bulkAddMembersByCourseAction(payload: {
  conversationId: string;
  courseNameOrCode: string;
}) {
  const session = await requireRole(["CEO", "ADMIN", "SUPERVISOR"]);

  const [conv] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, payload.conversationId))
    .limit(1);

  if (!conv) {
    return { success: false, message: "گفتگو یافت نشد." };
  }

  // Fetch students enrolled in this course or all students if "ALL"
  let targetUserIds: string[] = [];
  if (payload.courseNameOrCode === "ALL") {
    const allStudents = await db.select({ userId: studentProfiles.userId }).from(studentProfiles);
    targetUserIds = allStudents.map((s) => s.userId);
  } else {
    const matchingProfiles = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(
        or(
          eq(studentProfiles.enrolledCourseCode, payload.courseNameOrCode),
          eq(studentProfiles.enrolledCourseName, payload.courseNameOrCode)
        )
      );
    targetUserIds = matchingProfiles.map((s) => s.userId);
  }

  if (targetUserIds.length === 0) {
    return {
      success: false,
      message: "هیچ داوطلبی در دوره آموزشی انتخاب‌شده یافت نشد.",
    };
  }

  const currentMembers = Array.isArray(conv.memberIds) ? (conv.memberIds as string[]) : [];
  const mergedMembers = Array.from(new Set([...currentMembers, ...targetUserIds]));
  const addedCount = mergedMembers.length - currentMembers.length;

  await db
    .update(chatConversations)
    .set({
      memberIds: mergedMembers,
      updatedAt: new Date(),
    })
    .where(eq(chatConversations.id, payload.conversationId));

  revalidatePath("/messages");

  return {
    success: true,
    message: `${addedCount} داوطلب از دوره آموزشی با موفقیت به این گفتگو اضافه شدند.`,
    memberIds: mergedMembers,
    addedCount,
  };
}
