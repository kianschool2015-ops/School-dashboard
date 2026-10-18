"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { revalidatePath } from "next/cache";
import type { VideoConferenceSettings, VideoSessionRecord, UserRole } from "@/types/models";

/**
 * Save Custom Video Platform Settings (CEO / ADMIN Only)
 */
export async function saveVideoSettingsAction(payload: {
  platformName: string;
  serverUrl: string;
  apiKey: string;
  isEnabled: boolean;
}) {
  await requireRole(["CEO", "ADMIN"]);

  const updated = memoryRepo.updateVideoSettings({
    platformName: payload.platformName.trim(),
    serverUrl: payload.serverUrl.trim().replace(/\/$/, ""),
    apiKey: payload.apiKey.trim(),
    isEnabled: payload.isEnabled,
  });

  revalidatePath("/settings");
  revalidatePath("/executive");

  return {
    success: true,
    message: "تنظیمات سامانه اختصاصی کلاس و وبینار مجازی مشاهیر دانش ذخیره گردید.",
    settings: updated,
  };
}

/**
 * Get all Video Sessions for current user
 */
export async function getVideoSessionsAction(): Promise<VideoSessionRecord[]> {
  const session = await requireAuth();
  return memoryRepo.getVideoSessionsForUser(session.userId, session.role);
}

/**
 * Schedule / Launch a new Video Class or Counseling Room
 */
export async function createVideoSessionAction(payload: {
  title: string;
  sessionType: "COUNSELING_1ON1" | "COHORT_WEBINAR" | "TRIAGE_URGENT";
  targetCohort?: string;
  scheduledStart: string;
  durationMinutes: number;
  allowedRoles?: UserRole[];
  participantIds?: string[];
}) {
  const session = await requireRole(["CEO", "ADMIN", "SUPERVISOR", "MENTOR"]);
  const videoSettings = memoryRepo.getVideoSettings();

  const roomCode = `msh-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const joinToken = `msh_jwt_${Date.now()}_${session.userId}`;
  const joinUrl = `${videoSettings.serverUrl}/join/${roomCode}?token=${joinToken}&role=${session.role}`;

  const newSession: VideoSessionRecord = {
    id: `vsession_${Date.now()}`,
    title: payload.title.trim(),
    hostId: session.userId,
    hostName: session.fullName,
    hostRole: session.role,
    roomCode,
    sessionType: payload.sessionType,
    targetCohort: payload.targetCohort || "کوهورت عمومی داوطلبان وکالت",
    allowedRoles: payload.allowedRoles || ["CEO", "ADMIN", "SUPERVISOR", "MENTOR", "STUDENT"],
    participantIds: payload.participantIds || [session.userId],
    scheduledStart: payload.scheduledStart,
    durationMinutes: payload.durationMinutes || 60,
    status: "SCHEDULED",
    joinUrl,
    createdAt: new Date(),
  };

  memoryRepo.addVideoSession(newSession);

  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/triage");
  revalidatePath("/supervisor");
  revalidatePath("/executive");

  return {
    success: true,
    message: "اتاق و لینک ورود به پلتفرم اختصاصی ویدئوکنفرانس مشاهیر دانش با موفقیت ایجاد شد.",
    session: newSession,
  };
}

/**
 * Launch an instant room for urgent triage counseling
 */
export async function launchInstantTriageRoomAction(studentProfileId: string, studentName: string) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);
  const videoSettings = memoryRepo.getVideoSettings();

  const roomCode = `urgent-triage-${studentProfileId}`;
  const joinUrl = `${videoSettings.serverUrl}/join/${roomCode}?token=urgent_${Date.now()}`;

  const newSession: VideoSessionRecord = {
    id: `vsession_${Date.now()}`,
    title: `جلسه هدایت تحصیلی و مشاوره آنلاین فوری با داوطلب ${studentName}`,
    hostId: session.userId,
    hostName: session.fullName,
    hostRole: session.role,
    roomCode,
    sessionType: "TRIAGE_URGENT",
    targetCohort: "مشاوره اضطراری",
    allowedRoles: ["CEO", "ADMIN", "SUPERVISOR", "MENTOR", "STUDENT"],
    participantIds: [session.userId, studentProfileId],
    scheduledStart: "هم‌اکنون (جلسه فوری)",
    durationMinutes: 45,
    status: "LIVE",
    joinUrl,
    createdAt: new Date(),
  };

  memoryRepo.addVideoSession(newSession);

  return {
    success: true,
    message: "جلسه مشاوره تصویری فوری آغاز شد.",
    joinUrl,
  };
}
