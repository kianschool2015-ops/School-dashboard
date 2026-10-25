"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import {
  voipSettings,
  voipCalls,
  studentProfiles,
  users,
  mentorCallingWindows,
} from "../db/schema";
import { eq, desc } from "drizzle-orm";
import {
  testIssabelAmiConnection,
  originateSecureMentorCall,
  originateReverseStudentCall,
  checkMentorCallingWindowAvailability,
  maskPhoneNumber,
} from "../services/voip";
import { revalidatePath } from "next/cache";
import type {
  VoipAmiSettings,
  VoipCallRecord,
  MentorCallingWindowRecord,
} from "@/types/models";

const defaultVoipSettings: VoipAmiSettings = {
  id: "voip_settings_1",
  host: "127.0.0.1",
  port: 5038,
  username: "admin",
  secret: "secret123",
  context: "from-internal",
  channelTech: "SIP",
  trunk: "SIP/Trunk-Mashahir",
  callerId: "02188888888",
  isActive: true,
  mentorExtensions: {
    usr_mentor1: "101",
  },
  updatedAt: new Date(),
};

/**
 * Save Issabel Asterisk AMI Settings (Manager / CEO Only) via Drizzle ORM
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

  const updated: VoipAmiSettings = {
    id: "voip_settings_1",
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
    updatedAt: new Date(),
  };

  await db
    .insert(voipSettings)
    .values({
      id: "voip_ami_default",
      host: updated.host,
      port: updated.port,
      username: updated.username,
      secret: updated.secret,
      context: updated.context,
      channelTech: updated.channelTech,
      trunk: updated.trunk,
      callerId: updated.callerId,
      isActive: updated.isActive,
      mentorExtensions: updated.mentorExtensions,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: voipSettings.id,
      set: {
        host: updated.host,
        port: updated.port,
        username: updated.username,
        secret: updated.secret,
        context: updated.context,
        channelTech: updated.channelTech,
        trunk: updated.trunk,
        callerId: updated.callerId,
        isActive: updated.isActive,
        mentorExtensions: updated.mentorExtensions,
        updatedAt: new Date(),
      },
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
 * Test Live AMI Connection to Issabel Server (Manager / CEO Only) via Drizzle ORM
 */
export async function testVoipConnectionAction(customConfig?: Partial<VoipAmiSettings>) {
  await requireRole(["CEO", "ADMIN"]);

  let row: any = null;
  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const [found] = await db
      .select()
      .from(voipSettings)
      .where(eq(voipSettings.id, "voip_ami_default"))
      .limit(1);
    row = found;
  } catch {}

  const currentSettings: VoipAmiSettings = row
    ? {
        id: "voip_settings_1",
        host: row.host,
        port: row.port,
        username: row.username,
        secret: row.secret,
        context: row.context,
        channelTech: row.channelTech as "SIP" | "PJSIP",
        trunk: row.trunk,
        callerId: row.callerId,
        isActive: row.isActive,
        mentorExtensions: (row.mentorExtensions as Record<string, string>) || {},
        updatedAt: new Date(),
      }
    : defaultVoipSettings;

  const configToTest: VoipAmiSettings = {
    ...currentSettings,
    ...(customConfig || {}),
  };

  const result = await testIssabelAmiConnection(configToTest);
  return result;
}

/**
 * Click-to-Call with Student Phone Number Masking via Drizzle ORM
 * Can be invoked by MENTOR (or SUPERVISOR/CEO)
 * The student's real phone is NEVER returned to the client.
 */
export async function originateMentorCallAction(payload: {
  studentProfileId: string;
  notes?: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  let profile: any = null;
  let studentUser: any = null;

  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const [foundProfile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, payload.studentProfileId))
      .limit(1);
    profile = foundProfile;

    if (profile) {
      const [foundUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, profile.userId))
        .limit(1);
      studentUser = foundUser;
    }
  } catch {}

  if (!studentUser || !studentUser.phoneNumber) {
    return {
      success: false,
      message: "اطلاعات تماس داوطلب در سامانه موجود نیست.",
    };
  }

  // Mentor ownership check (Track 4): mentors can only call their assigned students (unless supervisor/CEO)
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
 * Get VoIP Call History (Role-aware) via Drizzle ORM
 */
export async function getVoipCallLogsAction(): Promise<VoipCallRecord[]> {
  const session = await requireAuth();

  if (session.role === "CEO" || session.role === "ADMIN" || session.role === "SUPERVISOR") {
    const calls = await db
      .select()
      .from(voipCalls)
      .orderBy(desc(voipCalls.initiatedAt));
    return calls as unknown as VoipCallRecord[];
  } else if (session.role === "MENTOR") {
    const calls = await db
      .select()
      .from(voipCalls)
      .where(eq(voipCalls.mentorId, session.userId))
      .orderBy(desc(voipCalls.initiatedAt));
    return calls as unknown as VoipCallRecord[];
  }

  return [];
}

/**
 * Get Masked Student Phone for UI display (Client never gets real phone) via Drizzle ORM
 */
export async function getMaskedStudentPhoneAction(studentProfileId: string): Promise<string> {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  if (!profile) return "۰۹۱۲***۰۰۰۰";

  if (session.role === "MENTOR" && profile.mentorId !== session.userId) {
    return "۰۹۱۲***۰۰۰۰";
  }

  const [studentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, profile.userId))
    .limit(1);

  if (!studentUser) return "۰۹۱۲***۰۰۰۰";

  return maskPhoneNumber(studentUser.phoneNumber);
}

/**
 * Get Mentor Calling Window Status for Student Dashboard
 */
export async function getMentorCallingStatusAction(mentorIdParam?: string): Promise<{
  isOpen: boolean;
  message: string;
  scheduleDescription: string;
  mentorName: string;
  mentorId?: string;
  window: MentorCallingWindowRecord | null;
}> {
  const session = await requireAuth();

  let targetMentorId = mentorIdParam;
  if (!targetMentorId && session.role === "STUDENT") {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);
    targetMentorId = profile?.mentorId || "usr_mentor1";
  }

  if (!targetMentorId) {
    return {
      isOpen: false,
      message: "پشتیبان اختصاصی تعیین نشده است.",
      scheduleDescription: "ساعات کاری هنوز تعریف نشده است.",
      mentorName: "پشتیبان آموزشی",
      window: null,
    };
  }

  const [mentorUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetMentorId))
    .limit(1);

  const availability = await checkMentorCallingWindowAvailability(targetMentorId);

  return {
    isOpen: availability.isOpen,
    message: availability.message,
    scheduleDescription: availability.scheduleDescription,
    mentorName: mentorUser?.fullName || "پشتیبان آموزشی",
    mentorId: targetMentorId,
    window: availability.window,
  };
}

/**
 * Learner-Initiated Reverse Call to Coach via Asterisk AMI
 * 1. System calls the Coach's extension/Zoiper first
 * 2. If Coach answers, system bridges call to Learner
 * 3. Masked numbers & PBX CallerID enforced
 */
export async function requestStudentToMentorCallAction(): Promise<{
  success: boolean;
  message: string;
  maskedStudentPhone?: string;
  maskedMentorPhone?: string;
  callRecordId?: string;
}> {
  const session = await requireRole(["STUDENT"]);

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.userId))
    .limit(1);

  if (!profile) {
    return {
      success: false,
      message: "پرونده تحصیلی داوطلب یافت نشد.",
    };
  }

  const mentorId = profile.mentorId || "usr_mentor1";

  const [studentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!studentUser || !studentUser.phoneNumber) {
    return {
      success: false,
      message: "شماره تلفن همراه شما در پروفایل ثبت نشده است.",
    };
  }

  const [mentorUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, mentorId))
    .limit(1);

  const mentorName = mentorUser?.fullName || "پشتیبان آموزشی";

  const result = await originateReverseStudentCall({
    studentProfileId: profile.id,
    studentName: studentUser.fullName,
    studentRealPhone: studentUser.phoneNumber,
    mentorId,
    mentorName,
  });

  revalidatePath("/student/dashboard");

  return result;
}

/**
 * Update Mentor's Daily Calling Window (e.g. 2-3 hours/day)
 */
export async function updateMentorCallingWindowAction(payload: {
  mentorId?: string;
  startTime: string; // e.g. "17:00"
  endTime: string;   // e.g. "20:00"
  daysOfWeek: number[]; // [0, 1, 2, 3, 4]
  dailyDurationHours?: number;
  isActive?: boolean;
  announcement?: string;
}) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  const targetMentorId =
    session.role === "MENTOR" ? session.userId : payload.mentorId || session.userId;

  const start = payload.startTime?.trim() || "17:00";
  const end = payload.endTime?.trim() || "20:00";
  const [sH] = start.split(":").map(Number);
  const [eH] = end.split(":").map(Number);
  const calculatedDuration = payload.dailyDurationHours || Math.max(1, (eH || 20) - (sH || 17));

  const windowId = `window_${targetMentorId}`;

  await db
    .insert(mentorCallingWindows)
    .values({
      id: windowId,
      mentorId: targetMentorId,
      startTime: start,
      endTime: end,
      daysOfWeek: payload.daysOfWeek || [0, 1, 2, 3, 4],
      dailyDurationHours: calculatedDuration,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      announcement: payload.announcement?.trim() || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: mentorCallingWindows.mentorId,
      set: {
        startTime: start,
        endTime: end,
        daysOfWeek: payload.daysOfWeek || [0, 1, 2, 3, 4],
        dailyDurationHours: calculatedDuration,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
        announcement: payload.announcement?.trim() || null,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  revalidatePath("/mentor/students");
  revalidatePath("/student/dashboard");

  return {
    success: true,
    message: "ساعات کاری پاسخگویی تلفنی پشتیبان با موفقیت به‌روزرسانی شد.",
  };
}

// Aliases for unified naming convention
export const testAmiConnectionAction = testVoipConnectionAction;
export const triggerMentorCallAction = originateMentorCallAction;
export const callCoachAction = requestStudentToMentorCallAction;

