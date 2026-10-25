"use server";

import { requireAuth } from "../auth/guard";
import { db } from "../db";
import {
  directMessages,
  directChatThreads,
  escalationTickets,
  users,
  studentProfiles,
} from "../db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { DirectMessageRecord, EscalationTicketRecord } from "@/types/models";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Send Direct Message with File Attachment via Drizzle ORM
 * Enforces hierarchical messaging and zero-trust IDOR checks (Track 4):
 * - Student can ONLY message their assigned Mentor
 * - Mentor can message their assigned Students and Supervisor
 */
export async function sendDirectMessageAction(payload: {
  receiverId: string;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentType?: string;
}) {
  const session = await requireAuth();

  const [receiver] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.receiverId))
    .limit(1);

  if (!receiver) {
    return { success: false, message: "گیرنده پیام یافت نشد." };
  }

  // Strict Downward Hierarchy Validation (Requirement 5):
  // Students and mentors cannot initiate direct messages to supervisors/executives unless replying to an existing thread
  const isLeadership =
    receiver.role === "SUPERVISOR" ||
    receiver.role === "CEO" ||
    receiver.role === "ADMIN";

  if (isLeadership && (session.role === "STUDENT" || session.role === "MENTOR")) {
    const incomingMessages = await db
      .select()
      .from(directMessages)
      .where(
        and(
          eq(directMessages.senderId, receiver.id),
          eq(directMessages.receiverId, session.userId)
        )
      )
      .limit(1);

    if (incomingMessages.length === 0) {
      return {
        success: false,
        message:
          session.role === "STUDENT"
            ? "داوطلب امکان شروع گفتگوی مستقیم جدید با مدیران و سرپرستان را ندارد مگر در پاسخ به پیام ارسالی از سوی ایشان (برای موارد فوری از تیکت ارجاع استفاده نمایید)."
            : "پشتیبان امکان شروع گفتگوی مستقیم جدید با سرپرستان یا مدیران را ندارد مگر در پاسخ به پیام ارسالی از سوی ایشان.",
      };
    }
  } else if (session.role === "STUDENT") {
    // If not messaging leadership, student can ONLY message their assigned mentor
    const [studentProfile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (!studentProfile || studentProfile.mentorId !== receiver.id) {
      return {
        success: false,
        message: "داوطلب تنها مجاز به ارسال پیام به پشتیبان اختصاصی خود است.",
      };
    }
  }

  // Mentor IDOR check (Track 4): Mentor can only message assigned students
  if (session.role === "MENTOR" && receiver.role === "STUDENT") {
    const [studentProfile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, receiver.id))
      .limit(1);

    if (!studentProfile || studentProfile.mentorId !== session.userId) {
      return {
        success: false,
        message: "پشتیبان تنها مجاز به ارسال پیام به داوطلبان تحت نظارت مستقیم خود است.",
      };
    }
  }

  // Validate attachment size
  if (payload.attachmentSize && payload.attachmentSize > MAX_ATTACHMENT_SIZE) {
    return {
      success: false,
      message: "حجم فایل پیوست نباید بیشتر از ۱۰ مگابایت باشد.",
    };
  }

  // Supervisor Chat Closure Check (Requirement 4.2):
  const canonicalThreadId = [session.userId, receiver.id].sort().join("_");
  const [threadRecord] = await db
    .select()
    .from(directChatThreads)
    .where(eq(directChatThreads.id, canonicalThreadId))
    .limit(1);

  if (threadRecord && threadRecord.isClosed) {
    if (session.role === "STUDENT") {
      return {
        success: false,
        message: "این گفت‌وگو توسط سرپرست آموزشی مختومه اعلام شده است و امکان ارسال پیام جدید وجود ندارد.",
      };
    } else if (session.role === "SUPERVISOR" || session.role === "CEO" || session.role === "ADMIN") {
      // If the Supervisor/Admin sends a new message later, the thread automatically re-opens.
      await db
        .update(directChatThreads)
        .set({
          isClosed: false,
          closedById: null,
          closedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(directChatThreads.id, canonicalThreadId));
    }
  }

  const threadId = `${session.userId}_${receiver.id}`;
  const messageId = `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const newMsg: DirectMessageRecord = {
    id: messageId,
    threadId,
    senderId: session.userId,
    senderName: session.fullName,
    senderRole: session.role,
    receiverId: receiver.id,
    receiverName: receiver.fullName,
    receiverRole: receiver.role,
    message: payload.message.trim(),
    attachmentUrl: payload.attachmentUrl,
    attachmentName: payload.attachmentName,
    attachmentSize: payload.attachmentSize,
    attachmentType: payload.attachmentType,
    isRead: false,
    createdAt: new Date(),
  };

  await db.insert(directMessages).values({
    id: messageId,
    threadId,
    senderId: session.userId,
    senderName: session.fullName,
    senderRole: session.role,
    receiverId: receiver.id,
    receiverName: receiver.fullName,
    receiverRole: receiver.role,
    message: payload.message.trim(),
    attachmentUrl: payload.attachmentUrl || null,
    attachmentName: payload.attachmentName || null,
    attachmentSize: payload.attachmentSize || null,
    attachmentType: payload.attachmentType || null,
    isRead: false,
  });

  // Send SMS notification to receiver
  await sendSystemSms({
    event: "MESSAGE_RECEIVED",
    recipientPhone: receiver.phoneNumber,
    recipientName: receiver.fullName,
    variables: {
      sender: session.fullName,
    },
  });

  revalidatePath("/messages");
  revalidatePath("/student/messages");

  return {
    success: true,
    message: "پیام شما با موفقیت ارسال گردید.",
    messageRecord: newMsg,
  };
}

/**
 * Get closure status for a direct chat thread
 */
export async function getThreadClosureStatusAction(otherUserId: string): Promise<{
  isClosed: boolean;
  closedById?: string | null;
  closedAt?: Date | null;
}> {
  const session = await requireAuth();
  const canonicalThreadId = [session.userId, otherUserId].sort().join("_");

  const [threadRecord] = await db
    .select()
    .from(directChatThreads)
    .where(eq(directChatThreads.id, canonicalThreadId))
    .limit(1);

  if (!threadRecord) {
    return { isClosed: false };
  }

  return {
    isClosed: threadRecord.isClosed,
    closedById: threadRecord.closedById,
    closedAt: threadRecord.closedAt,
  };
}

/**
 * Supervisor or Admin closes or re-opens a direct chat thread with a student
 */
export async function toggleThreadClosureAction(
  otherUserId: string,
  close: boolean
): Promise<{ success: boolean; message: string; isClosed: boolean }> {
  try {
    const session = await requireAuth();

    if (session.role !== "SUPERVISOR" && session.role !== "CEO" && session.role !== "ADMIN") {
      return {
        success: false,
        message: "تنها سرپرستان و مدیران ارشد مجاز به بستن یا بازگشایی گفت‌وگو هستند.",
        isClosed: false,
      };
    }

    const canonicalThreadId = [session.userId, otherUserId].sort().join("_");

    const [existing] = await db
      .select()
      .from(directChatThreads)
      .where(eq(directChatThreads.id, canonicalThreadId))
      .limit(1);

    if (existing) {
      await db
        .update(directChatThreads)
        .set({
          isClosed: close,
          closedById: close ? session.userId : null,
          closedAt: close ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(directChatThreads.id, canonicalThreadId));
    } else {
      await db.insert(directChatThreads).values({
        id: canonicalThreadId,
        isClosed: close,
        closedById: close ? session.userId : null,
        closedAt: close ? new Date() : null,
        updatedAt: new Date(),
      });
    }

    revalidatePath("/messages");

    return {
      success: true,
      message: close
        ? "گفت‌وگو به عنوان مختومه (اتمام رسیدگی) علامت‌گذاری شد."
        : "گفت‌وگو مجدداً بازگشایی شد.",
      isClosed: close,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطا در تغییر وضعیت گفت‌وگو";
    return { success: false, message: msg, isClosed: false };
  }
}

/**
 * Poll messages and thread status for real-time synchronization (every 3-4s)
 */
export async function pollDirectMessagesAction(activeContactId?: string): Promise<{
  messages: DirectMessageRecord[];
  isThreadClosed?: boolean;
}> {
  const session = await requireAuth();

  const msgs = (await db
    .select()
    .from(directMessages)
    .where(
      or(
        eq(directMessages.senderId, session.userId),
        eq(directMessages.receiverId, session.userId)
      )
    )
    .orderBy(asc(directMessages.createdAt))) as unknown as DirectMessageRecord[];

  let isThreadClosed = false;
  if (activeContactId) {
    const canonicalThreadId = [session.userId, activeContactId].sort().join("_");
    const [threadRecord] = await db
      .select()
      .from(directChatThreads)
      .where(eq(directChatThreads.id, canonicalThreadId))
      .limit(1);

    if (threadRecord) {
      isThreadClosed = threadRecord.isClosed;
    }
  }

  return { messages: msgs, isThreadClosed };
}

/**
 * Submit Escalation Ticket from Student to Supervisor (Located inside Settings) via Drizzle ORM
 */
export async function submitEscalationTicketAction(payload: {
  subject: string;
  reasonCategory: EscalationTicketRecord["reasonCategory"];
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  const session = await requireAuth();

  if (session.role !== "STUDENT") {
    return { success: false, message: "ارسال تیکت ارجاع به سرپرست مختص داوطلبان است." };
  }

  const [studentProfile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.userId))
    .limit(1);

  if (!studentProfile) {
    return { success: false, message: "پروفایل داوطلب یافت نشد." };
  }

  const mentorId = studentProfile.mentorId || "usr_mentor1";
  const [mentorUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, mentorId))
    .limit(1);

  const ticketId = `ticket_${Date.now()}`;

  const newTicket: EscalationTicketRecord = {
    id: ticketId,
    studentId: session.userId,
    studentName: session.fullName,
    studentPhone: session.phoneNumber,
    mentorId,
    mentorName: mentorUser ? mentorUser.fullName : "پشتیبان اختصاصی",
    supervisorId: "usr_adminsupervisor",
    subject: payload.subject.trim(),
    reasonCategory: payload.reasonCategory,
    description: payload.description.trim(),
    attachmentUrl: payload.attachmentUrl,
    attachmentName: payload.attachmentName,
    status: "OPEN",
    createdAt: new Date(),
  };

  await db.insert(escalationTickets).values({
    id: ticketId,
    studentId: session.userId,
    studentName: session.fullName,
    studentPhone: session.phoneNumber,
    mentorId,
    mentorName: mentorUser ? mentorUser.fullName : "پشتیبان اختصاصی",
    supervisorId: "usr_adminsupervisor",
    subject: payload.subject.trim(),
    reasonCategory: payload.reasonCategory,
    description: payload.description.trim(),
    attachmentUrl: payload.attachmentUrl || null,
    attachmentName: payload.attachmentName || null,
    status: "OPEN",
  });

  revalidatePath("/settings");
  revalidatePath("/supervisor");

  return {
    success: true,
    message: "تیکت اضطراری با موفقیت به سرپرست گروه آموزشی ارجاع داده شد.",
    ticket: newTicket,
  };
}
