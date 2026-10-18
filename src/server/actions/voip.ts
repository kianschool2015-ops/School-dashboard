"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import {
  testIssabelAmiConnection,
  originateSecureMentorCall,
  maskPhoneNumber,
} from "../services/voip";
import { revalidatePath } from "next/cache";
import type { VoipAmiSettings, VoipCallRecord } from "@/types/models";

/**
 * Save Issabel Asterisk AMI Settings (Manager / CEO Only)
 */
export async function saveVoipSettingsAction(payload: {
  host: string;
  port: number;
  username: string;
  secret: string;
  context: string;
  channelTech: "SIP" | "PJSIP";
  trunk: string;
  callerId: string;
  isActive: boolean;
  mentorExtensions: Record<string, string>;
}) {
  await requireRole(["CEO", "ADMIN"]);

  const updated = memoryRepo.updateVoipSettings({
    host: payload.host.trim(),
    port: Number(payload.port) || 5038,
    username: payload.username.trim(),
    secret: payload.secret.trim(),
    context: payload.context.trim() || "from-internal",
    channelTech: payload.channelTech || "SIP",
    trunk: payload.trunk.trim(),
    callerId: payload.callerId.trim(),
    isActive: payload.isActive,
    mentorExtensions: payload.mentorExtensions || {},
  });

  revalidatePath("/settings");
  revalidatePath("/executive");

  return {
    success: true,
    message: "تنظیمات اتصال به وب‌سرویس AMI استریسک / ایزابل با موفقیت ذخیره گردید.",
    settings: updated,
  };
}

/**
 * Test Live AMI Connection to Issabel Server (Manager / CEO Only)
 */
export async function testVoipConnectionAction(customConfig?: Partial<VoipAmiSettings>) {
  await requireRole(["CEO", "ADMIN"]);

  const currentSettings = memoryRepo.getVoipSettings();
  const configToTest: VoipAmiSettings = {
    ...currentSettings,
    ...(customConfig || {}),
  };

  const result = await testIssabelAmiConnection(configToTest);
  return result;
}

/**
 * Click-to-Call with Student Phone Number Masking
 * Can be invoked by MENTOR (or SUPERVISOR/CEO)
 * The student's real phone is NEVER returned to the client.
 */
export async function originateMentorCallAction(payload: {
  studentProfileId: string;
  notes?: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const profile = memoryRepo.getStudentProfileById(payload.studentProfileId);
  if (!profile) {
    return {
      success: false,
      message: "پرونده آموزشی داوطلب یافت نشد.",
    };
  }

  const studentUser = memoryRepo.getUserById(profile.userId);
  if (!studentUser || !studentUser.phoneNumber) {
    return {
      success: false,
      message: "اطلاعات تماس داوطلب در سامانه موجود نیست.",
    };
  }

  // Mentor ownership check: mentors can only call their assigned students (unless supervisor/CEO)
  if (session.role === "MENTOR" && profile.mentorId !== session.userId) {
    return {
      success: false,
      message: "شما تنها مجاز به برقراری تماس با داوطلبان تحت پشتیبانی خود هستید.",
    };
  }

  const result = await originateSecureMentorCall({
    mentorId: session.userId,
    mentorName: session.fullName,
    studentProfileId: profile.id,
    studentName: studentUser.fullName,
    studentRealPhone: studentUser.phoneNumber,
  });

  revalidatePath("/mentor/triage");
  revalidatePath(`/mentor/student/${profile.id}`);
  revalidatePath("/executive");

  return result;
}

/**
 * Get VoIP Call History (Role-aware)
 */
export async function getVoipCallLogsAction(): Promise<VoipCallRecord[]> {
  const session = await requireAuth();

  if (session.role === "CEO" || session.role === "ADMIN" || session.role === "SUPERVISOR") {
    return memoryRepo.getAllVoipCalls();
  } else if (session.role === "MENTOR") {
    return memoryRepo.getVoipCallsForMentor(session.userId);
  }

  return [];
}

/**
 * Get Masked Student Phone for UI display (Client never gets real phone)
 */
export async function getMaskedStudentPhoneAction(studentProfileId: string): Promise<string> {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const profile = memoryRepo.getStudentProfileById(studentProfileId);
  if (!profile) return "۰۹۱۲***۰۰۰۰";

  if (session.role === "MENTOR" && profile.mentorId !== session.userId) {
    return "۰۹۱۲***۰۰۰۰";
  }

  const studentUser = memoryRepo.getUserById(profile.userId);
  if (!studentUser) return "۰۹۱۲***۰۰۰۰";

  return maskPhoneNumber(studentUser.phoneNumber);
}

// Aliases for unified naming convention
export const testAmiConnectionAction = testVoipConnectionAction;
export const triggerMentorCallAction = originateMentorCallAction;

