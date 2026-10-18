"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { revalidatePath } from "next/cache";
import type {
  ChatConversationRecord,
  ChatMessageRecord,
  ConversationType,
  UserRole,
} from "@/types/models";

/**
 * Get all conversations accessible to the current user
 * CEO / ADMIN gets omniscient access to ALL channels, groups, and direct threads!
 */
export async function getConversationsAction(): Promise<ChatConversationRecord[]> {
  const session = await requireAuth();
  return memoryRepo.getConversationsForUser(session.userId, session.role);
}

/**
 * Create a new Channel or Group
 * Channels can be created by CEO, ADMIN, SUPERVISOR, or MENTOR
 * Groups can be created by any staff member
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

  memoryRepo.createChatConversation(newConv);

  revalidatePath("/messages");
  revalidatePath("/executive");

  return {
    success: true,
    message: `${payload.type === "CHANNEL" ? "کانال" : "گروه"} با موفقیت ایجاد گردید.`,
    conversation: newConv,
  };
}

/**
 * Get messages for a specific conversation
 */
export async function getMessagesAction(conversationId: string): Promise<ChatMessageRecord[]> {
  const session = await requireAuth();

  const conv = memoryRepo.getConversationById(conversationId);
  if (!conv) {
    throw new Error("گفتگو یافت نشد.");
  }

  // CEO / ADMIN has omniscient visibility
  if (session.role !== "CEO" && session.role !== "ADMIN") {
    if (conv.type !== "CHANNEL" && !conv.memberIds.includes(session.userId)) {
      throw new Error("شما عضو این گفتگو نیستید.");
    }
  }

  return memoryRepo.getChatMessages(conversationId);
}

/**
 * Send a message in a conversation with optional attachment (up to 10MB)
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

  const conv = memoryRepo.getConversationById(payload.conversationId);
  if (!conv) {
    return { success: false, message: "گفتگو یافت نشد." };
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

  memoryRepo.addChatMessage(newMsg);

  revalidatePath("/messages");
  revalidatePath("/executive");

  return {
    success: true,
    message: "پیام با موفقیت ارسال گردید.",
    data: newMsg,
  };
}

/**
 * Omniscient Inspector Action: Manager / CEO can inspect all conversations
 */
export async function getOmniscientAuditChatAction() {
  await requireRole(["CEO", "ADMIN"]);

  const allConversations = memoryRepo.getAllChatConversations();
  const allDirectMessages = memoryRepo.getAllMessages();

  return {
    conversations: allConversations,
    directMessages: allDirectMessages,
  };
}
