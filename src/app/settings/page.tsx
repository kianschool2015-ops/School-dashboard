import { requireAuth } from "@/server/auth/guard";
import { memoryRepo } from "@/server/db";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import type {
  SmsSettingsRecord,
  SmsLogRecord,
  StudentWhitelistRecord,
  EscalationTicketRecord,
  VoipAmiSettings,
  VideoConferenceSettings,
} from "@/types/models";

export default async function SettingsPage() {
  const session = await requireAuth();

  // Zero-Trust Guard: Settings (VoIP AMI, SMS Gateway, Video platform) is strictly Level 4 (CEO/ADMIN)
  if (session.role !== "CEO" && session.role !== "ADMIN") {
    if (session.role === "STUDENT") redirect("/student/dashboard");
    if (session.role === "MENTOR") redirect("/mentor/triage");
    if (session.role === "SUPERVISOR") redirect("/supervisor");
    redirect("/auth/login");
  }

  const user = memoryRepo.getUserById(session.userId);
  if (!user) {
    redirect("/auth/login");
  }

  // Fetch configuration data (Level 4 - CEO / ADMIN)
  const smsSettings: SmsSettingsRecord | null = memoryRepo.getSmsSettings();
  const smsLogs: SmsLogRecord[] = memoryRepo.getSmsLogs();
  const voipSettings: VoipAmiSettings | null = memoryRepo.getVoipSettings();
  const videoSettings: VideoConferenceSettings | null = memoryRepo.getVideoSettings();
  const whitelist: StudentWhitelistRecord[] = memoryRepo.getAllWhitelist();
  const mentors = memoryRepo.getAllMentors();
  const mentorsList: Array<{ id: string; fullName: string }> = mentors.map((m) => ({ id: m.id, fullName: m.fullName }));
  const escalationTickets: EscalationTicketRecord[] = [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SettingsClient
        currentUser={{
          id: user.id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          nationalId: user.nationalId,
          hasPassword: !!user.passwordHash,
        }}
        smsSettings={smsSettings}
        smsLogs={smsLogs}
        whitelist={whitelist}
        escalationTickets={escalationTickets}
        assignedMentor={null}
        mentorsList={mentorsList}
        voipSettings={voipSettings}
        videoSettings={videoSettings}
      />
    </div>
  );
}
