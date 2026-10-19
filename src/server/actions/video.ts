"use server";

import { requireAuth, requireRole } from "../auth/guard";
import { db } from "../db";
import { videoSettings, videoSessions, studentProfiles } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { VideoConferenceSettings, VideoSessionRecord, UserRole } from "@/types/models";

const defaultVideoSettings: VideoConferenceSettings = {
  id: "video_conf_1",
  platformName: "پلتفرم وبینار و آموزش آنلاین مشاهیر دانش",
  serverUrl: "https://meet.mashahirdanesh.com",
  apiKey: "msh_vid_key_2026",
  isEnabled: true,
};

/**
 * Save Custom Video Platform Settings (CEO / ADMIN Only) via Drizzle ORM
 */
export async function saveVideoSettingsAction(payload: {
  platformName: string;
  serverUrl: string;
  apiKey: string;
  isEnabled: boolean;
}) {
  await requireRole(["CEO", "ADMIN"]);

  const updated: VideoConferenceSettings = {
    id: "video_conf_1",
    platformName: payload.platformName.trim(),
    serverUrl: payload.serverUrl.trim().replace(/\/$/, ""),
    apiKey: payload.apiKey.trim(),
    isEnabled: payload.isEnabled,
  };

  await db
    .insert(videoSettings)
    .values({
      id: "video_conf_default",
      platformName: updated.platformName,
      serverUrl: updated.serverUrl,
      apiKey: updated.apiKey,
      isEnabled: updated.isEnabled,
    })
    .onConflictDoUpdate({
      target: videoSettings.id,
      set: {
        platformName: updated.platformName,
        serverUrl: updated.serverUrl,
        apiKey: updated.apiKey,
        isEnabled: updated.isEnabled,
      },
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
 * Get all Video Sessions for current user via Drizzle ORM
 */
export async function getVideoSessionsAction(): Promise<VideoSessionRecord[]> {
  const session = await requireAuth();

  const all = await db
    .select()
    .from(videoSessions)
    .orderBy(desc(videoSessions.createdAt));

  if (session.role === "CEO" || session.role === "ADMIN") {
    return all as unknown as VideoSessionRecord[];
  }

  return all.filter((s) => {
    const roles = (s.allowedRoles as string[]) || [];
    const participants = (s.participantIds as string[]) || [];
    return roles.includes(session.role) || participants.includes(session.userId);
  }) as unknown as VideoSessionRecord[];
}

/**
 * Schedule / Launch a new Video Class or Counseling Room via Drizzle ORM
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

  const [row] = await db
    .select()
    .from(videoSettings)
    .where(eq(videoSettings.id, "video_conf_default"))
    .limit(1);

  const currentVideoSettings: VideoConferenceSettings = row
    ? {
        id: "video_conf_1",
        platformName: row.platformName,
        serverUrl: row.serverUrl,
        apiKey: row.apiKey,
        isEnabled: row.isEnabled,
      }
    : defaultVideoSettings;

  const roomCode = `msh-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const joinToken = `msh_jwt_${Date.now()}_${session.userId}`;
  const joinUrl = `${currentVideoSettings.serverUrl}/join/${roomCode}?token=${joinToken}&role=${session.role}`;

  const sessionId = `vsession_${Date.now()}`;
  const newSession: VideoSessionRecord = {
    id: sessionId,
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

  await db.insert(videoSessions).values({
    id: sessionId,
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
  });

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
 * Launch an instant room for urgent triage counseling via Drizzle ORM
 * Enforces Zero-Trust Mentor Ownership (Track 4)
 */
export async function launchInstantTriageRoomAction(studentProfileId: string, studentName: string) {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);

  if (session.role === "MENTOR") {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, studentProfileId))
      .limit(1);

    if (!profile || profile.mentorId !== session.userId) {
      return {
        success: false,
        message: "شما تنها مجاز به ایجاد جلسه برای داوطلبان تحت نظارت مستقیم خود هستید.",
      };
    }
  }

  const [row] = await db
    .select()
    .from(videoSettings)
    .where(eq(videoSettings.id, "video_conf_default"))
    .limit(1);

  const currentVideoSettings: VideoConferenceSettings = row
    ? {
        id: "video_conf_1",
        platformName: row.platformName,
        serverUrl: row.serverUrl,
        apiKey: row.apiKey,
        isEnabled: row.isEnabled,
      }
    : defaultVideoSettings;

  const roomCode = `urgent-triage-${studentProfileId}`;
  const joinUrl = `${currentVideoSettings.serverUrl}/join/${roomCode}?token=urgent_${Date.now()}`;

  const sessionId = `vsession_${Date.now()}`;
  const newSession: VideoSessionRecord = {
    id: sessionId,
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

  await db.insert(videoSessions).values({
    id: sessionId,
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
  });

  return {
    success: true,
    message: "جلسه مشاوره تصویری فوری آغاز شد.",
    joinUrl,
  };
}
