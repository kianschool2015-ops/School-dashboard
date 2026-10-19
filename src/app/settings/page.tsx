import { requireAuth } from "@/server/auth/guard";
import { db } from "@/server/db";
import {
  users,
  smsSettings as smsSettingsTable,
  smsLogs as smsLogsTable,
  voipSettings as voipSettingsTable,
  videoSettings as videoSettingsTable,
  studentWhitelist,
  studentProfiles,
  escalationTickets as escalationTicketsTable,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import type {
  SmsSettingsRecord,
  SmsLogRecord,
  SmsTriggerEvent,
  SmsTriggerConfig,
  StudentWhitelistRecord,
  EscalationTicketRecord,
  VoipAmiSettings,
  VideoConferenceSettings,
} from "@/types/models";

export default async function SettingsPage() {
  const session = await requireAuth();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    redirect("/auth/login");
  }

  const isManager = session.role === "CEO" || session.role === "ADMIN";
  const isSupervisor = session.role === "SUPERVISOR";
  const isStudent = session.role === "STUDENT";

  // Fetch configuration data according to role
  let smsSettings: SmsSettingsRecord | null = null;
  let smsLogs: SmsLogRecord[] = [];
  let voipSettings: VoipAmiSettings | null = null;
  let videoSettings: VideoConferenceSettings | null = null;

  if (isManager) {
    const [sRow] = await db
      .select()
      .from(smsSettingsTable)
      .where(eq(smsSettingsTable.id, "sms_conf_default"))
      .limit(1);
    if (sRow) {
      smsSettings = {
        id: sRow.id,
        provider: sRow.provider as "KAVENEGAR" | "FARAZ" | "MOCK",
        apiKey: sRow.apiKey,
        senderNumber: sRow.senderNumber,
        senderLine: sRow.senderLine,
        isActive: sRow.isActive,
        triggers: (sRow.triggers as unknown) as Record<SmsTriggerEvent, SmsTriggerConfig>,
        updatedAt: new Date(),
      };
    }

    const logs = await db
      .select()
      .from(smsLogsTable)
      .orderBy(desc(smsLogsTable.deliveryTime))
      .limit(100);
    smsLogs = logs as unknown as SmsLogRecord[];

    const [vRow] = await db
      .select()
      .from(voipSettingsTable)
      .where(eq(voipSettingsTable.id, "voip_ami_default"))
      .limit(1);
    if (vRow) {
      voipSettings = {
        id: "voip_default",
        host: vRow.host,
        port: vRow.port,
        username: vRow.username,
        secret: vRow.secret,
        context: vRow.context,
        channelTech: vRow.channelTech as "SIP" | "PJSIP",
        trunk: vRow.trunk,
        callerId: vRow.callerId,
        isActive: vRow.isActive,
        mentorExtensions: (vRow.mentorExtensions as Record<string, string>) || {},
        updatedAt: new Date(),
      };
    }

    const [vidRow] = await db
      .select()
      .from(videoSettingsTable)
      .where(eq(videoSettingsTable.id, "video_conf_default"))
      .limit(1);
    if (vidRow) {
      videoSettings = {
        id: "video_default",
        platformName: vidRow.platformName,
        serverUrl: vidRow.serverUrl,
        apiKey: vidRow.apiKey,
        isEnabled: vidRow.isEnabled,
      };
    }
  }

  let whitelist: StudentWhitelistRecord[] = [];
  if (isManager || isSupervisor) {
    const wl = await db
      .select()
      .from(studentWhitelist)
      .orderBy(desc(studentWhitelist.createdAt));
    whitelist = wl as unknown as StudentWhitelistRecord[];
  }

  const mentors = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.role, "MENTOR"));
  const mentorsList: Array<{ id: string; fullName: string }> = mentors.map((m) => ({ id: m.id, fullName: m.fullName }));

  let assignedMentor: { id: string; fullName: string; phoneNumber: string } | null = null;
  if (isStudent) {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (profile && profile.mentorId) {
      const [mentorUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, profile.mentorId))
        .limit(1);

      if (mentorUser) {
        assignedMentor = {
          id: mentorUser.id,
          fullName: mentorUser.fullName,
          phoneNumber: mentorUser.phoneNumber,
        };
      }
    }
  }

  let escalationTickets: EscalationTicketRecord[] = [];
  if (isStudent) {
    const t = await db
      .select()
      .from(escalationTicketsTable)
      .where(eq(escalationTicketsTable.studentId, session.userId))
      .orderBy(desc(escalationTicketsTable.createdAt));
    escalationTickets = t as unknown as EscalationTicketRecord[];
  } else if (isSupervisor) {
    const t = await db
      .select()
      .from(escalationTicketsTable)
      .where(eq(escalationTicketsTable.supervisorId, session.userId))
      .orderBy(desc(escalationTicketsTable.createdAt));
    escalationTickets = t as unknown as EscalationTicketRecord[];
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SettingsClient
        currentUser={{
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          nationalId: user.nationalId ?? undefined,
          hasPassword: !!user.passwordHash,
        }}
        smsSettings={smsSettings}
        smsLogs={smsLogs}
        whitelist={whitelist}
        escalationTickets={escalationTickets}
        assignedMentor={assignedMentor}
        mentorsList={mentorsList}
        voipSettings={voipSettings}
        videoSettings={videoSettings}
      />
    </div>
  );
}
