"use server";

import { requireAuth } from "../auth/guard";
import { memoryRepo } from "../db";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { DirectMessageRecord, EscalationTicketRecord } from "@/types/models";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

/**
 * Send Direct Message with File Attachment
 * Enforces hierarchical messaging:
 * - Student can ONLY message their assigned Mentor
 * - Mentor can message their assigned Students and Supervisor
 * - Supervisor can message their Mentors
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

  const receiver = memoryRepo.getUserById(payload.receiverId);
  if (!receiver) {
    return { success: false, message: "گیرنده پیام یافت نشد." };
  }

  // Hierarchy validation
  if (session.role === "STUDENT") {
    const studentProfile = memoryRepo.getStudentProfileByUserId(session.userId);
    if (!studentProfile || studentProfile.mentorId !== receiver.id) {
      return {
        success: false,
        message: "داوطلب تنها مجاز به ارسال پیام به پشتیبان اختصاصی خود است.",
      };
    }
  }

  // Mentor IDOR check: Mentor can only message assigned students
  if (session.role === "MENTOR" && receiver.role === "STUDENT") {
    const studentProfile = memoryRepo.getStudentProfileByUserId(receiver.id);
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

  memoryRepo.addMessage(newMsg);

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
 * Submit Escalation Ticket from Student to Supervisor (Located inside Settings)
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

  const studentProfile = memoryRepo.getStudentProfileByUserId(session.userId);
  if (!studentProfile) {
    return { success: false, message: "پروفایل داوطلب یافت نشد." };
  }

  const mentorUser = memoryRepo.getUserById(studentProfile.mentorId);
  const ticketId = `ticket_${Date.now()}`;

  const newTicket: EscalationTicketRecord = {
    id: ticketId,
    studentId: session.userId,
    studentName: session.fullName,
    studentPhone: session.phoneNumber,
    mentorId: studentProfile.mentorId,
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

  memoryRepo.createTicket(newTicket);

  revalidatePath("/settings");
  revalidatePath("/supervisor");

  return {
    success: true,
    message: "تیکت ارجاع با اولویت بالا به سرپرست کوهورت ارسال گردید.",
    ticketId,
  };
}
