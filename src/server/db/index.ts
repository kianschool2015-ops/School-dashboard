import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
  initialUsers,
  initialStudentProfiles,
  initialTriageCases,
  initialCoachingMissions,
  initialScheduleItems,
  initialMockExams,
} from "./mock-data";
import type {
  UserRole,
  UserRecord,
  StudentProfileRecord,
  ScheduleItemRecord,
  DailyCheckinRecord,
  TriageCaseRecord,
  MockExamRecord,
  CoachingMissionRecord,
  StudentWhitelistRecord,
  SmsSettingsRecord,
  SmsLogRecord,
  HierarchyTaskRecord,
  DirectMessageRecord,
  EscalationTicketRecord,
  WeeklyPlanTemplateRecord,
  EvaluationExamRecord,
  ExamSubmissionRecord,
  ExamQuestionRecord,
  LandingContentSettings,
  LandingFeatureItem,
  LandingHonorsItem,
  LandingGalleryImage,
  VoipAmiSettings,
  VoipCallRecord,
  ChatConversationRecord,
  ChatMessageRecord,
  VideoConferenceSettings,
  VideoSessionRecord,
} from "@/types/models";

// PostgreSQL Connection String
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/mashahir_support";

// PostgreSQL Client configuration with connection pooling
export const pgClient = postgres(connectionString, {
  max: 20, // Connection pool size for 200k+ high throughput
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(pgClient, { schema });

/**
 * High-Performance In-Memory Data Store & Fallback Repository
 * Full Enterprise State for Mashahir Danesh Platform
 */
class MemoryRepository {
  public users: Map<string, UserRecord> = new Map();
  public studentProfiles: Map<string, StudentProfileRecord> = new Map();
  public triageCases: Map<string, TriageCaseRecord> = new Map();
  public scheduleItems: Map<string, ScheduleItemRecord> = new Map();
  public dailyCheckins: Map<string, DailyCheckinRecord> = new Map();
  public mockExams: Map<string, MockExamRecord> = new Map();
  public coachingMissions: Map<string, CoachingMissionRecord> = new Map();

  // Enterprise State Maps
  public studentWhitelist: Map<string, StudentWhitelistRecord> = new Map();
  public smsSettings: SmsSettingsRecord;
  public smsLogs: SmsLogRecord[] = [];
  public hierarchyTasks: Map<string, HierarchyTaskRecord> = new Map();
  public directMessages: Map<string, DirectMessageRecord> = new Map();
  public escalationTickets: Map<string, EscalationTicketRecord> = new Map();
  public weeklyPlanTemplates: Map<string, WeeklyPlanTemplateRecord> = new Map();
  public evaluationExams: Map<string, EvaluationExamRecord> = new Map();
  public examSubmissions: Map<string, ExamSubmissionRecord> = new Map();

  // VoIP Asterisk Issabel Integration
  public voipSettings: VoipAmiSettings;
  public voipCalls: Map<string, VoipCallRecord> = new Map();

  // Advanced Internal Messaging (Direct, Channels, and Groups)
  public chatConversations: Map<string, ChatConversationRecord> = new Map();
  public chatMessages: Map<string, ChatMessageRecord> = new Map();

  // Video Conferencing Platform
  public videoSettings: VideoConferenceSettings;
  public videoSessions: Map<string, VideoSessionRecord> = new Map();

  // Landing Page Content Management (CMS)
  public landingContent: LandingContentSettings;

  constructor() {
    this.smsSettings = {
      id: "sms_conf_default",
      provider: "KAVENEGAR",
      apiKey: process.env.KAVENEGAR_API_KEY || "YOUR_KAVENEGAR_API_KEY_PLACEHOLDER",
      senderNumber: process.env.KAVENEGAR_SENDER_NUMBER || "10004346",
      senderLine: process.env.KAVENEGAR_SENDER_NUMBER || "10004346",
      isActive: true,
      triggers: {
        LOGIN: {
          event: "LOGIN",
          title: "ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ù¾Ù†Ù„ Ú©Ø§Ø±Ø¨Ø±ÛŒ",
          description: "Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ø®ÙˆØ´â€ŒØ¢Ù…Ø¯ Ùˆ Ù‡Ø´Ø¯Ø§Ø± Ø§Ù…Ù†ÛŒØªÛŒ Ù‡Ù†Ú¯Ø§Ù… ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ù¾Ø±ØªØ§Ù„",
          isEnabled: true, // Default enabled as requested
          templateMessage: "Ø¯Ø§ÙˆØ·Ù„Ø¨ Ú¯Ø±Ø§Ù…ÛŒ {name}ØŒ ÙˆØ±ÙˆØ¯ Ø´Ù…Ø§ Ø¨Ù‡ Ø³Ø§Ù…Ø§Ù†Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ Ø¯Ø± ØªØ§Ø±ÛŒØ® {date} Ø«Ø¨Øª Ø´Ø¯.",
        },
        MENTOR_CONTACT: {
          event: "MENTOR_CONTACT",
          title: "ØªÙ…Ø§Ø³ ÛŒØ§ Ù…Ø¯Ø§Ø®Ù„Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†",
          description: "Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ Ø¨Ù‡ Ø¯Ø§ÙˆØ·Ù„Ø¨ Ù¾Ø³ Ø§Ø² Ø«Ø¨Øª Ú¯Ø²Ø§Ø±Ø´ Ø¬Ù„Ø³Ù‡ ÛŒØ§ ØªÙ…Ø§Ø³ ØªÙ„ÙÙ†ÛŒ",
          isEnabled: true,
          templateMessage: "Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø´Ù…Ø§ {mentorName} Ú¯Ø²Ø§Ø±Ø´ Ø¬Ù„Ø³Ù‡ Ø¢Ù…ÙˆØ²Ø´ÛŒ Ø±Ø§ Ø«Ø¨Øª Ù†Ù…ÙˆØ¯. Ø¬Ù‡Øª Ù…Ø´Ø§Ù‡Ø¯Ù‡ Ø¨Ù‡ Ù¾Ù†Ù„ Ù…Ø±Ø§Ø¬Ø¹Ù‡ ÙØ±Ù…Ø§ÛŒÛŒØ¯.",
        },
        TRIAGE_RESOLVED: {
          event: "TRIAGE_RESOLVED",
          title: "Ø­Ù„ Ù…ÙˆØ§Ù†Ø¹ Ùˆ Ù¾Ø§ÛŒØ´ Ø¢Ù…ÙˆØ²Ø´ÛŒ",
          description: "Ø§Ø¹Ù„Ø§Ù† Ø±ÙØ¹ Ù¾Ø±ÙˆÙ†Ø¯Ù‡ Ø¨Ø­Ø±Ø§Ù†ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨ Ùˆ ØªÙˆØµÛŒÙ‡â€ŒÙ‡Ø§ÛŒ Ø±Ø§Ù‡Ø¨Ø±Ø¯ÛŒ",
          isEnabled: true,
          templateMessage: "Ù¾Ø±ÙˆÙ†Ø¯Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø´Ù…Ø§ Ø¨Ø§ Ù…ÙˆÙÙ‚ÛŒØª Ø¨Ø±Ø±Ø³ÛŒ Ùˆ Ù…Ø®ØªÙˆÙ…Ù‡ Ø´Ø¯. ØªÙˆØµÛŒÙ‡ Ø¢Ù…ÙˆØ²Ø´ÛŒ Ø¯Ø± Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯ Ø«Ø¨Øª Ú¯Ø±Ø¯ÛŒØ¯.",
        },
        WEEKLY_PLAN_ASSIGNED: {
          event: "WEEKLY_PLAN_ASSIGNED",
          title: "ØªØ®ØµÛŒØµ Ø¨Ø±Ù†Ø§Ù…Ù‡ Ù‡ÙØªÚ¯ÛŒ Ø¬Ø¯ÛŒØ¯",
          description: "Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ Ø¨Ø±Ù†Ø§Ù…Ù‡ Ù…Ø·Ø§Ù„Ø¹Ø§ØªÛŒ Ø´Ù†Ø¨Ù‡ ØªØ§ Ø¬Ù…Ø¹Ù‡",
          isEnabled: true,
          templateMessage: "Ø¨Ø±Ù†Ø§Ù…Ù‡ Ù…Ø·Ø§Ù„Ø¹Ø§ØªÛŒ Ù‡ÙØªÙ‡ Ø¬Ø¯ÛŒØ¯ Ø´Ù…Ø§ Ø¯Ø± Ø³Ø§Ù…Ø§Ù†Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ Ù‚Ø±Ø§Ø± Ú¯Ø±ÙØª.",
        },
        TASK_ASSIGNED: {
          event: "TASK_ASSIGNED",
          title: "Ø§Ù†ØªØ³Ø§Ø¨ ÙˆØ¸ÛŒÙÙ‡ Ø§Ø¯Ø§Ø±ÛŒ/Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ",
          description: "Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© Ø¨Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù† ÛŒØ§ Ø³Ø±Ù¾Ø±Ø³Øª Ù¾Ø³ Ø§Ø² Ø§Ù†ØªØ³Ø§Ø¨ ÙˆØ¸ÛŒÙÙ‡ Ø¬Ø¯ÛŒØ¯",
          isEnabled: true,
          templateMessage: "ÙˆØ¸ÛŒÙÙ‡ Ø¬Ø¯ÛŒØ¯ Ø¨Ø§ Ø§ÙˆÙ„ÙˆÛŒØª {priority} Ø§Ø² Ø·Ø±Ù {sender} Ø¨Ø±Ø§ÛŒ Ø´Ù…Ø§ Ø§Ø±Ø¬Ø§Ø¹ Ú¯Ø±Ø¯ÛŒØ¯. Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´",
        },
        EXAM_PUBLISHED: {
          event: "EXAM_PUBLISHED",
          title: "Ø§Ù†ØªØ´Ø§Ø± Ø¢Ø²Ù…ÙˆÙ† Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ Ø¬Ø¯ÛŒØ¯",
          description: "Ø§Ø¹Ù„Ø§Ù† Ø´Ø±ÙˆØ¹ Ø¨Ø§Ø²Ù‡ Ø²Ù…Ø§Ù†ÛŒ Ø´Ø±Ú©Øª Ø¯Ø± Ø¢Ø²Ù…ÙˆÙ† Ø²Ù…Ø§Ù†â€ŒØ¯Ø§Ø±",
          isEnabled: true,
          templateMessage: "Ø¢Ø²Ù…ÙˆÙ† Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ Ø¬Ø¯ÛŒØ¯ ({examTitle}) Ø¯Ø± Ø³Ø§Ù…Ø§Ù†Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ ÙØ¹Ø§Ù„ Ø´Ø¯. Ù…Ù‡Ù„Øª Ø´Ø±Ú©Øª ØªØ§ {endTime} Ù…ÛŒâ€ŒØ¨Ø§Ø´Ø¯.",
        },
        MESSAGE_RECEIVED: {
          event: "MESSAGE_RECEIVED",
          title: "Ø¯Ø±ÛŒØ§ÙØª Ù¾ÛŒØ§Ù… Ù…Ø³ØªÙ‚ÛŒÙ… Ø¬Ø¯ÛŒØ¯",
          description: "Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ Ù¾ÛŒØ§Ù… Ø¬Ø¯ÛŒØ¯ Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø¨Ù‡ Ø¯Ø§ÙˆØ·Ù„Ø¨ ÛŒØ§ Ø¨Ø§Ù„Ø¹Ú©Ø³",
          isEnabled: true,
          templateMessage: "Ù¾ÛŒØ§Ù… Ø¬Ø¯ÛŒØ¯ÛŒ Ø§Ø² Ø·Ø±Ù {sender} Ø¯Ø± Ø³Ø§Ù…Ø§Ù†Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ Ø¯Ø±ÛŒØ§ÙØª Ú©Ø±Ø¯ÛŒØ¯.",
        },
        WHITELIST_INVITE: {
          event: "WHITELIST_INVITE",
          title: "Ø¯Ø¹ÙˆØª Ø¨Ù‡ ØªÚ©Ù…ÛŒÙ„ Ø«Ø¨Øªâ€ŒÙ†Ø§Ù… (Ø§Ú©Ø³Ù„)",
          description: "Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù…Ú© ØªØ§ÛŒÛŒØ¯ ØµÙ„Ø§Ø­ÛŒØª Ùˆ Ù„ÛŒÙ†Ú© ØªÚ©Ù…ÛŒÙ„ Ù¾Ø±ÙˆÙØ§ÛŒÙ„ Ø¯Ø§ÙˆØ·Ù„Ø¨",
          isEnabled: true,
          templateMessage: "{name} Ø¹Ø²ÛŒØ²ØŒ ØµÙ„Ø§Ø­ÛŒØª Ø´Ù…Ø§ Ø¨Ø±Ø§ÛŒ Ø´Ø±Ú©Øª Ø¯Ø± Ø¯ÙˆØ±Ù‡ ÙˆÚ©Ø§Ù„Øª ØªØ§ÛŒÛŒØ¯ Ø´Ø¯. Ø³Ø§Ù…Ø§Ù†Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´: {link}",
        },
      },
      updatedAt: new Date(),
    };

    // Issabel Asterisk AMI VoIP Configuration
    this.voipSettings = {
      id: "voip_issabel_default",
      host: process.env.ASTERISK_HOST || "192.168.1.50",
      port: Number(process.env.ASTERISK_PORT) || 5038,
      username: process.env.ASTERISK_USERNAME || "admin",
      secret: process.env.ASTERISK_SECRET || "YOUR_ASTERISK_SECRET_PLACEHOLDER",
      context: process.env.ASTERISK_CONTEXT || "from-internal",
      channelTech: (process.env.ASTERISK_CHANNEL_TECH as "SIP" | "PJSIP") || "SIP",
      trunk: process.env.ASTERISK_TRUNK || "SIP/mashahir_trunk",
      callerId: process.env.ASTERISK_CALLER_ID || "02191000000",
      isActive: true,
      mentorExtensions: {
        usr_mentor1: "101",
        usr_mentor2: "102",
      },
      updatedAt: new Date(),
    };

    // Video Conferencing Platform Configuration
    this.videoSettings = {
      id: "video_conf_default",
      platformName: "Ø³Ø§Ù…Ø§Ù†Ù‡ Ø§Ø®ØªØµØ§ØµÛŒ ÙˆØ¨ÛŒÙ†Ø§Ø± Ùˆ Ú©Ù„Ø§Ø³ Ù…Ø¬Ø§Ø²ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´",
      serverUrl: process.env.VIDEO_SERVER_URL || "https://room.mashahir.ac.ir",
      apiKey: process.env.VIDEO_API_KEY || "YOUR_VIDEO_API_KEY_PLACEHOLDER",
      isEnabled: true,
    };

    // Landing Page Content Management (CMS) Defaults
    this.landingContent = {
      heroTagline: "Ù¾Ù„ØªÙØ±Ù… Ø¬Ø§Ù…Ø¹ Û³Û¶Û° Ø¯Ø±Ø¬Ù‡ Ù‡Ø¯Ø§ÛŒØª ØªØ­ØµÛŒÙ„ÛŒ Ùˆ Ø­Ù„ Ù…ÙˆØ§Ù†Ø¹ Ø¹Ù„Ù…ÛŒ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª",
      heroTitle: "Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´",
      heroDescription: "Ø³Ø§Ù…Ø§Ù†Ù‡ Ø§Ø®ØªØµØ§ØµÛŒ Ù‡Ø¯Ø§ÛŒØª ØªØ­ØµÛŒÙ„ÛŒØŒ Ù¾Ø§ÛŒØ´ Ù…ÙˆØ§Ù†Ø¹ Ø¢Ù…ÙˆØ²Ø´ÛŒ Ùˆ Ù…Ø±Ø¨ÛŒÚ¯Ø±ÛŒ Ø¨ÛŒØ´ Ø§Ø² Û²Û°Û°,Û°Û°Û° Ø¯Ø§ÙˆØ·Ù„Ø¨ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ÛŒ Ø¯Ø§Ø¯Ú¯Ø³ØªØ±ÛŒ Ùˆ Ù…Ø±Ú©Ø² ÙˆÚ©Ù„Ø§ÛŒ Ù‚ÙˆÙ‡ Ù‚Ø¶Ø§Ø¦ÛŒÙ‡.",
      towerTitle: "Ø¨Ø± ÙØ±Ø§Ø² Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯ØŒ Ø¬Ø´Ù† Ù¾ÛŒØ±ÙˆØ²ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ±ÛŒâ€ŒÙ‡Ø§",
      towerSubtitle: "Ù…ÛŒØ¹Ø§Ø¯Ú¯Ø§Ù‡ Ø³Ø§Ù„Ø§Ù†Ù‡ Ù¾Ø°ÛŒØ±ÙØªÙ‡â€ŒØ´Ø¯Ú¯Ø§Ù† Ùˆ Ø±ØªØ¨Ù‡â€ŒÙ‡Ø§ÛŒ Ø¨Ø±ØªØ± Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Ø¯Ø± Ø¨Ù„Ù†Ø¯ØªØ±ÛŒÙ† Ù‚Ù„Ù‡ Ù¾Ø§ÛŒØªØ®Øª",
      galaTitle: "Ø´Ú©ÙˆÙ‡ ØªØ§Ù„Ø§Ø± Ù‡Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§ÛŒ Ø¨ÛŒÙ†â€ŒØ§Ù„Ù…Ù„Ù„ÛŒ Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯Ø› ØªØ¬Ù„ÛŒÙ„ Ø§Ø² Ø³ØªØ§Ø±Ú¯Ø§Ù† ÙˆÚ©Ø§Ù„Øª",
      galaSubtitle: "Ø­Ø¶ÙˆØ± Ø¨ÛŒØ´ Ø§Ø² Û±,Û¶Û°Û° ÙˆÚ©ÛŒÙ„ØŒ Ø§Ø³ØªØ§Ø¯ Ø¨Ø±Ø¬Ø³ØªÙ‡ Ùˆ Ù…Ø´Ø§ÙˆØ± Ø±ØªØ¨Ù‡â€ŒØ³Ø§Ø² Ø¯Ø± Ø¨Ø²Ø±Ú¯ØªØ±ÛŒÙ† Ø±ÙˆÛŒØ¯Ø§Ø¯ Ø­Ù‚ÙˆÙ‚ÛŒ Ø§ÛŒØ±Ø§Ù†",
      featuresTitle: "Ú†Ø±Ø§ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ Ù…ØªÙØ§ÙˆØª Ø§Ø³ØªØŸ",
      featuresDescription: "ØªØ±Ú©ÛŒØ¨ Ø¯Ø§Ù†Ø´ Ø¹Ù…ÛŒÙ‚ Ø­Ù‚ÙˆÙ‚ÛŒ Ø§Ø³Ø§ØªÛŒØ¯ ØªØ±Ø§Ø² Ø§ÙˆÙ„ Ø¨Ø§ Ø§Ù„Ú¯ÙˆØ±ÛŒØªÙ…â€ŒÙ‡Ø§ÛŒ Ù‡ÙˆØ´Ù…Ù†Ø¯ Ù¾Ø§ÛŒØ´ Ø¨Ø­Ø±Ø§Ù†â€ŒÙ‡Ø§ÛŒ Ù…Ø·Ø§Ù„Ø¹Ø§ØªÛŒ Ùˆ Ø±ÙØ¹ Ù…ÙˆØ§Ù†Ø¹ Ø¹Ù„Ù…ÛŒ ØªØ§ Ú©Ø³Ø¨ Ø±ØªØ¨Ù‡ Ù‚Ø¨ÙˆÙ„ÛŒ Ø¯Ø± Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§.",
      features: [
        {
          id: "feat_1",
          title: "Ù¾Ø§ÛŒØ´ Ø¨Ø­Ø±Ø§Ù†â€ŒÙ‡Ø§ÛŒ Ø¢Ù…ÙˆØ²Ø´ÛŒ (Ø³Ø·ÙˆØ­ P1 ØªØ§ P6)",
          description: "Ø´Ù†Ø§Ø³Ø§ÛŒÛŒ Ø³Ø±ÛŒØ¹ Ø§ÙØª Ø³Ø§Ø¹Øª Ù…Ø·Ø§Ù„Ø¹Ù‡ØŒ Ø§ÙØª ØªØ±Ø§Ø² Ø¢Ø²Ù…ÙˆÙ† Ùˆ Ø¨Ø­Ø±Ø§Ù†â€ŒÙ‡Ø§ÛŒ ØªÙ…Ø±Ú©Ø² Ùˆ Ù…Ø¯Ø§Ø®Ù„Ù‡ Ù‡Ø¯Ø§ÛŒØªâ€ŒÚ¯Ø±Ø§Ù†Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø¯Ø± Ú©Ù…ØªØ± Ø§Ø² Û²Û´ Ø³Ø§Ø¹Øª.",
          iconName: "ShieldAlert",
        },
        {
          id: "feat_2",
          title: "Ù…ÙˆØªÙˆØ± Ø¨Ø±Ù†Ø§Ù…Ù‡â€ŒØ±ÛŒØ²ÛŒ Ù‡ÙØªÚ¯ÛŒ Ø´Ù†Ø¨Ù‡ ØªØ§ Ø¬Ù…Ø¹Ù‡",
          description: "ØªÙ…Ù¾Ù„ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ù‡ÙØªÚ¯ÛŒ Ø¬Ø§Ù…Ø¹ Ø³Ø±Ù¾Ø±Ø³ØªØ§Ù† Ø¨Ø§ Ù‚Ø§Ø¨Ù„ÛŒØª Ø´Ø®ØµÛŒâ€ŒØ³Ø§Ø²ÛŒ Ø¯Ù‚ÛŒÙ‚ ØªÙˆØ³Ø· Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø¹Ù„Ù…ÛŒ Ù…ØªÙ†Ø§Ø³Ø¨ Ø¨Ø§ Ø´Ø±Ø§ÛŒØ· Ø´ØºÙ„ÛŒ Ùˆ Ø²Ù…Ø§Ù†ÛŒ Ù‡Ø± Ø¯Ø§ÙˆØ·Ù„Ø¨.",
          iconName: "CalendarCheck",
        },
        {
          id: "feat_3",
          title: "Ú¯Ø§Ù†Øªâ€ŒÚ†Ø§Ø±Øª ØªØ­Ù„ÛŒÙ„ÛŒ Ûµ Ø³Ø·Ø­ÛŒ Ù¾ÛŒØ´Ø±ÙØª",
          description: "Ù¾Ø§ÛŒØ´ Ù„Ø­Ø¸Ù‡â€ŒØ§ÛŒ ØªØ¯Ø§ÙˆÙ… Ù…Ø·Ø§Ù„Ø¹Ù‡ Ø¯Ø± Ûµ Ù†Ù…Ø§ÛŒ Ø§Ù…Ø±ÙˆØ²ØŒ Û³ Ø±ÙˆØ²ØŒ Ù‡ÙØªÙ‡ØŒ Ù…Ø§Ù‡ Ùˆ Ú©Ù„ Ø¯ÙˆØ±Ù‡ Ù‡Ù…Ø±Ø§Ù‡ Ø¨Ø§ Ù…Ù‚Ø§ÛŒØ³Ù‡ ØªØ·Ø¨ÛŒÙ‚ÛŒ Ø¢Ù…Ø§Ø±ÛŒ.",
          iconName: "BarChart3",
        },
        {
          id: "feat_4",
          title: "Ø³ÛŒØ³ØªÙ… Ø§Ù…Ù† ØªÙ…Ø§Ø³ Ùˆ Ù¾ÛŒØ§Ù…â€ŒØ±Ø³Ø§Ù†ÛŒ Ø¹Ù„Ù…ÛŒ",
          description: "Ù…Ú©Ø§Ù„Ù…Ù‡ ØªÙ„ÙÙ†ÛŒ Ø§Ù…Ù† Ø§Ø² Ø·Ø±ÛŒÙ‚ Ø³Ø§Ù†ØªØ±Ø§Ù„ Ø§ÛŒØ²Ø§Ø¨Ù„ Ø¨Ø¯ÙˆÙ† Ù†Ù…Ø§ÛŒØ´ Ø´Ù…Ø§Ø±Ù‡ ØªÙ„ÙÙ† Ø¯Ø§ÙˆØ·Ù„Ø¨ Ùˆ Ù¾ÛŒØ§Ù…â€ŒØ±Ø³Ø§Ù† Ù…Ø³ØªÙ‚ÛŒÙ… Ø¨Ø§ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ ÙØ§ÛŒÙ„â€ŒÙ‡Ø§ÛŒ Ù¾ÛŒÙˆØ³Øª.",
          iconName: "Headphones",
        },
      ],
      honorsTitle: "Ø«Ù…Ø±Ù‡ Ù‡Ù…Ø±Ø§Ù‡ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ±Ø› ØªÙ†Ø¯ÛŒØ³â€ŒÙ‡Ø§ÛŒ Ø²Ø±ÛŒÙ† Ø¨Ø± ÙØ±Ø§Ø² Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯",
      honorsDescription: "Ø¬Ø´Ù† Ø³Ø§Ù„Ø§Ù†Ù‡ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ Ø¯Ø± Ù…Ø±Ú©Ø² Ù‡Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§ÛŒ Ø¨ÛŒÙ†â€ŒØ§Ù„Ù…Ù„Ù„ÛŒ Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯ Ø¨Ø§ Ø­Ø¶ÙˆØ± Ø±ØªØ¨Ù‡â€ŒÙ‡Ø§ÛŒ Ø¨Ø±ØªØ±ØŒ Ù…Ø¯ÛŒØ±Ø§Ù† Ø¹Ø§Ù„ÛŒâ€ŒØ±ØªØ¨Ù‡ Ù‚Ø¶Ø§ÛŒÛŒ Ùˆ Ø®Ø§Ù†ÙˆØ§Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø­ØªØ±Ù… Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù†.",
      honors: [
        {
          id: "hn_1",
          rankTitle: "Ø±ØªØ¨Ù‡ Û± Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ÛŒ Ù…Ø±Ú©Ø²",
          candidateName: "Ù¾Ø°ÛŒØ±ÙØªÙ‡â€ŒØ´Ø¯Ù‡ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Û±Û´Û°Û³",
          quote: "Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø±Ø§Ù‡Ø¨Ø±Ø¯ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ùˆ ØªÙ…Ø§Ø³â€ŒÙ‡Ø§ÛŒ Ù‡ÙØªÚ¯ÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†Ù… Ø§Ø¬Ø§Ø²Ù‡ Ù†Ø¯Ø§Ø¯ Ø­ØªÛŒ ÛŒÚ© Ø±ÙˆØ² Ø§Ø² Ù…Ø³ÛŒØ± Ø®Ø§Ø±Ø¬ Ø´ÙˆÙ…. Ø­Ø¶ÙˆØ± Ø¨Ø± Ø±ÙˆÛŒ Ø§Ø³ØªÛŒØ¬ Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯ Ù„Ø­Ø¸Ù‡â€ŒØ§ÛŒ ÙØ±Ø§Ù…ÙˆØ´â€ŒÙ†Ø´Ø¯Ù†ÛŒ Ø¨ÙˆØ¯.",
          finalScore: "Ù…Ø¹Ø¯Ù„ Ù†Ù‡Ø§ÛŒÛŒ: Û±Û¹.Û´Û°",
          cohortName: "Ú©ÙˆÙ‡ÙˆØ±Øª Ø·Ù„Ø§ÛŒÛŒ",
        },
        {
          id: "hn_2",
          rankTitle: "Ø±ØªØ¨Ù‡ Û³ Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ÛŒ Ø®Ø±Ø§Ø³Ø§Ù†",
          candidateName: "Ù¾Ø°ÛŒØ±ÙØªÙ‡â€ŒØ´Ø¯Ù‡ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Û±Û´Û°Û³",
          quote: "Ø³ÛŒØ³ØªÙ… Ù¾Ø§ÛŒØ´ Ù…ÙˆØ§Ù†Ø¹ Ø¢Ù…ÙˆØ²Ø´ÛŒ Ø¯Ø± Ù…Ø§Ù‡ Ù¾Ø§ÛŒØ§Ù†ÛŒ Ø§ÙØª ØªØ±Ø§Ø² Ø¢Ø²Ù…ÙˆÙ† Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ Ù…Ù† Ø±Ø§ Ø¸Ø±Ù Û´Û¸ Ø³Ø§Ø¹Øª Ø¨Ø§ Ú©Ø§Ø±Ú¯Ø§Ù‡ Ø¬Ø¨Ø±Ø§Ù†ÛŒ Ø¨Ø±Ø·Ø±Ù Ú©Ø±Ø¯ Ùˆ ØªØ±Ø§Ø² Ú©Ù„ Ø¨Ù‡ Ø¨Ø§Ù„Ø§ÛŒ Û±Û±,Û°Û°Û° Ø±Ø³ÛŒØ¯.",
          finalScore: "Ø¯Ø±ØµØ¯ Ø¬Ø²Ø§ Ùˆ Ù…Ø¯Ù†ÛŒ: Û¹Û²Ùª",
          cohortName: "Ú©ÙˆÙ‡ÙˆØ±Øª Ù‡Ø¯Ø§ÛŒØª Û³Û¶Û°",
        },
        {
          id: "hn_3",
          rankTitle: "Ø±ØªØ¨Ù‡ Û· Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ÛŒ ÙØ§Ø±Ø³",
          candidateName: "Ù¾Ø°ÛŒØ±ÙØªÙ‡â€ŒØ´Ø¯Ù‡ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Û±Û´Û°Û²",
          quote: "Ø«Ø¨Øª Ú†Ú©â€ŒØ§ÛŒÙ†â€ŒÙ‡Ø§ÛŒ Ø²ÛŒØ± Û¶Û° Ø«Ø§Ù†ÛŒÙ‡ Ø¨Ù‡ Ù…Ù† Ø§Ù†Ú¯ÛŒØ²Ù‡ Ùˆ Ù†Ø¸Ù… Ø¢Ù‡Ù†ÛŒÙ† Ø¯Ø§Ø¯. ÙˆÙ‚ØªÛŒ Ù†Ø§Ù…Ù… Ø¯Ø± ØªØ§Ù„Ø§Ø± Ù‡Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§ÛŒ Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯ Ø®ÙˆØ§Ù†Ø¯Ù‡ Ø´Ø¯ØŒ ØªÙ…Ø§Ù… Ø²Ø­Ù…Ø§Øª Ø¨Ù‡ Ø«Ù…Ø± Ù†Ø´Ø³Øª.",
          finalScore: "Ø¯Ø±ØµØ¯ Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ: Û¹ÛµÙª",
          cohortName: "Ú©ÙˆÙ‡ÙˆØ±Øª Ù†Ø®Ø¨Ú¯Ø§Ù†",
        },
      ],
      stats: {
        studentsCount: "Û²Û°Û°,Û°Û°Û°+",
        ranksCount: "Û±,Û´ÛµÛ°+",
        checkinSpeed: "< Û¶Û° Ø«Ø§Ù†ÛŒÙ‡",
        adherenceRate: "Û¹Û´.Û¸Ùª",
      },
      gallery: [
        {
          id: "gal_1",
          title: "Ø³Ù† Ø§ØµÙ„ÛŒ Ùˆ Ø¬Ø§ÛŒÚ¯Ø§Ù‡ Ø§Ù‡Ø¯Ø§ÛŒ ØªÙ†Ø¯ÛŒØ³",
          imageUrl: "/images/landing/milad-gala.webp",
          caption: "ØªØ¬Ù„ÛŒÙ„ Ø§Ø² Ø±ØªØ¨Ù‡â€ŒÙ‡Ø§ÛŒ Ø¨Ø±ØªØ± Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ Ø¯Ø± Ù…Ø±Ú©Ø² Ù‡Ù…Ø§ÛŒØ´â€ŒÙ‡Ø§ÛŒ Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯",
          orderIndex: 1,
        },
        {
          id: "gal_2",
          title: "Ù†Ù…Ø§ÛŒ Ø¨Ø§Ø´Ú©ÙˆÙ‡ Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯ ØªÙ‡Ø±Ø§Ù†",
          imageUrl: "/images/landing/milad-cutout.png",
          caption: "Ù…ÛŒØ¹Ø§Ø¯Ú¯Ø§Ù‡ Ù¾ÛŒØ±ÙˆØ²ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ø³Ø®Øªâ€ŒÚ©ÙˆØ´ Ù…ÙˆØ³Ø³Ù‡ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´",
          orderIndex: 2,
        },
      ],
      ctaTitle: "ØµÙ†Ø¯Ù„ÛŒ Ø§ÙØªØ®Ø§Ø± Ø´Ù…Ø§ Ø¯Ø± Ø¬Ø´Ù† Ø¨Ø±Ø¬ Ù…ÛŒÙ„Ø§Ø¯ Ù…Ù†ØªØ¸Ø± Ø´Ù…Ø§Ø³Øª",
      ctaDescription: "Ø¨Ø§ Ù‡Ù…Ø±Ø§Ù‡ÛŒ ØªÛŒÙ…ÛŒ Ø§Ø² Ø²Ø¨Ø¯Ù‡â€ŒØªØ±ÛŒÙ† Ø±ØªØ¨Ù‡â€ŒÙ‡Ø§ÛŒ Ø¨Ø±ØªØ±ØŒ Ø³Ø±Ù¾Ø±Ø³ØªØ§Ù† Ø¢Ù…ÙˆØ²Ø´ÛŒ Ùˆ Ø§Ø³Ø§ØªÛŒØ¯ Ø¯Ú©ØªØ±ÛŒÙ† Ø­Ù‚ÙˆÙ‚ØŒ Ù…ÙˆÙÙ‚ÛŒØª Ø®ÙˆØ¯ Ø±Ø§ Ø¨Ù‡ Ù‚Ø·Ø¹ÛŒØª ØªØ¨Ø¯ÛŒÙ„ Ú©Ù†ÛŒØ¯.",
      footerRights: "ØªÙ…Ø§Ù…ÛŒ Ø­Ù‚ÙˆÙ‚ Ø§ÛŒÙ† ÙˆØ¨â€ŒØ³Ø§ÛŒØª Ø¨Ø±Ø§ÛŒ Ù…Ø¤Ø³Ø³Ù‡ Ø­Ù‚ÙˆÙ‚ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ± Ø¯Ø§Ù†Ø´ Ù…Ø­ÙÙˆØ¸ Ø§Ø³Øª",
    };

    this.seed();
  }

  public seed() {
    initialUsers.forEach((u) => {
      this.users.set(u.id, {
        ...u,
        nationalId: "00" + Math.floor(10000000 + Math.random() * 90000000),
        passwordHash: u.passwordHash || "",
      });
    });

    initialStudentProfiles.forEach((p) => this.studentProfiles.set(p.id, { ...p }));
    initialTriageCases.forEach((t) => this.triageCases.set(t.id, { ...t }));
    initialScheduleItems.forEach((s) => this.scheduleItems.set(s.id, { ...s }));
    initialMockExams.forEach((m) => this.mockExams.set(m.id, { ...m }));
    initialCoachingMissions.forEach((c) => this.coachingMissions.set(c.id, { ...c }));

    // Seed Whitelist Pre-approved Candidates
    const whitelistSeed: StudentWhitelistRecord[] = [
      {
        id: "wl_1",
        fullName: "Ø¢Ø±Ù…ÛŒÙ† Ø±Ø³ØªÙ…ÛŒ",
        nationalId: "0012345678",
        phoneNumber: "09121000005",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_2",
        fullName: "ÙØ§Ø·Ù…Ù‡ Ø§Ø¨Ø±Ø§Ù‡ÛŒÙ…ÛŒ",
        nationalId: "0023456789",
        phoneNumber: "09121000006",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_3",
        fullName: "Ø³ÛŒÙ†Ø§ Ù…Ø­Ù…Ø¯ÛŒ",
        nationalId: "0034567890",
        phoneNumber: "09121000007",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_4",
        fullName: "Ù†ÛŒÙ„ÙˆÙØ± Ø±Ø§Ø¯",
        nationalId: "0045678901",
        phoneNumber: "09121000008",
        assignedMentorId: "usr_mentor2",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_5",
        fullName: "Ù†ÛŒÙ…Ø§ ØµØ§Ø¯Ù‚ÛŒ",
        nationalId: "0056789012",
        phoneNumber: "09121000009",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_6",
        fullName: "Ù…Ù‡Ø¯ÛŒ Ú©Ø±ÛŒÙ…ÛŒ (Ø¯Ø§ÙˆØ·Ù„Ø¨ Ø¯Ø¹ÙˆØªâ€ŒØ´Ø¯Ù‡)",
        nationalId: "0067890123",
        phoneNumber: "09121000010",
        assignedMentorId: "usr_mentor2",
        status: "PENDING",
        invitedAt: new Date(),
        createdAt: new Date(),
      },
    ];
    whitelistSeed.forEach((w) => this.studentWhitelist.set(w.id, w));

    // Seed Tasks
    const taskSeed: HierarchyTaskRecord[] = [
      {
        id: "task_1",
        senderId: "usr_admin",
        senderRole: "CEO",
        senderName: "Ù…Ø¯ÛŒØ±ÛŒØª Ø§Ø±Ø´Ø¯ (Admin)",
        receiverId: "usr_adminsupervisor",
        receiverRole: "SUPERVISOR",
        receiverName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ Ú©ÙˆÙ‡ÙˆØ±Øª (adminsupervisor)",
        title: "Ù¾Ø§ÛŒØ´ Ù†Ø±Ø® Ù¾Ø§Ø³Ø®Ú¯ÙˆÛŒÛŒ Ø¨Ù‡ Ø¨Ø­Ø±Ø§Ù†â€ŒÙ‡Ø§ÛŒ Tier 1 Ú©ÙˆÙ‡ÙˆØ±Øª Ú©Ø§Ù†ÙˆÙ† Ù…Ø±Ú©Ø²",
        description: "Ú¯Ø²Ø§Ø±Ø´ ÙˆØ¶Ø¹ÛŒØª Û´ Ø±ÙˆØ² Ø³Ú©ÙˆØª Ø¯Ø§ÙˆØ·Ù„Ø¨ ÙØ§Ø·Ù…Ù‡ Ø§Ø¨Ø±Ø§Ù‡ÛŒÙ…ÛŒ Ùˆ Ø§Ù‚Ø¯Ø§Ù…Ø§Øª Ù…Ø¯Ø§Ø®Ù„Ù‡â€ŒØ§ÛŒ Ø§Ù†Ø¬Ø§Ù… Ø´Ø¯Ù‡ ØªØ§ Ù¾Ø§ÛŒØ§Ù† Ø³Ø§Ø¹Øª Ø§Ø¯Ø§Ø±ÛŒ Ø¨Ø±Ø±Ø³ÛŒ Ø´ÙˆØ¯.",
        priority: "CRITICAL",
        status: "IN_PROGRESS",
        dueDate: "1403-08-05",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "task_2",
        senderId: "usr_adminsupervisor",
        senderRole: "SUPERVISOR",
        senderName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ Ú©ÙˆÙ‡ÙˆØ±Øª (adminsupervisor)",
        receiverId: "usr_mentor1",
        receiverRole: "MENTOR",
        receiverName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ (Ù¾Ø´ØªÛŒØ¨Ø§Ù† Ø§Ø±Ø´Ø¯)",
        title: "Ø¨Ø±Ø±Ø³ÛŒ Ø­Ø¶ÙˆØ±ÛŒ/ØªÙ„ÙÙ†ÛŒ Ø¹Ù„Øª Ø§ÙØª ØªØ±Ø§Ø² Ø¢Ø²Ù…ÙˆÙ† Ø³ÛŒÙ†Ø§ Ù…Ø­Ù…Ø¯ÛŒ (Ù‡Ø´Ø¯Ø§Ø± A06)",
        description: "Ø¨Ø±Ø±Ø³ÛŒ Ø¯Ù„Ø§ÛŒÙ„ Ø¯Ø±ØµØ¯ Ù¾Ø§ÛŒÛŒÙ† Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù…Ø¯Ù†ÛŒ Ùˆ ØªÙ†Ø¸ÛŒÙ… Ø¨Ø±Ù†Ø§Ù…Ù‡ Ø¬Ø¨Ø±Ø§Ù†ÛŒ Û³Û° Ø¯Ù‚ÛŒÙ‚Ù‡â€ŒØ§ÛŒ Ø¯Ø± Ø±ÙˆØ²Ù‡Ø§ÛŒ Ø²ÙˆØ¬.",
        priority: "HIGH",
        status: "PENDING",
        dueDate: "1403-08-03",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "task_3",
        senderId: "usr_adminsupervisor",
        senderRole: "SUPERVISOR",
        senderName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ Ú©ÙˆÙ‡ÙˆØ±Øª (adminsupervisor)",
        receiverId: "usr_mentor2",
        receiverRole: "MENTOR",
        receiverName: "Ø§Ø³ØªØ§Ø¯ Ù…Ø±ÛŒÙ… Ø­Ø³ÛŒÙ†ÛŒ (Ù¾Ø´ØªÛŒØ¨Ø§Ù†)",
        title: "ØªØ®ØµÛŒØµ ØªÙ…Ù¾Ù„ÛŒØª Ø¨Ø±Ù†Ø§Ù…Ù‡ Ù…Ø·Ø§Ù„Ø¹Ø§ØªÛŒ Ù‡ÙØªÙ‡ Û³Û± Ø¨Ø±Ø§ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ø´Ø§ØºÙ„",
        description: "Ø´Ø®ØµÛŒâ€ŒØ³Ø§Ø²ÛŒ Ø³Ù‚Ù Ù…Ø·Ø§Ù„Ø¹Ù‡ Ø±ÙˆØ²Ø§Ù†Ù‡ Ø¨Ù‡ Ûµ Ø³Ø§Ø¹Øª Ú©Ø§Ø±ÛŒ Ùˆ Û±Û° Ø³Ø§Ø¹Øª Ø±ÙˆØ²Ù‡Ø§ÛŒ ØªØ¹Ø·ÛŒÙ„.",
        priority: "MEDIUM",
        status: "COMPLETED",
        dueDate: "1403-07-30",
        resolutionNotes: "ØªÙ…Ù¾Ù„ÛŒØª Ø¨Ø±Ø§ÛŒ ØªÙ…Ø§Ù… Û±Û° Ø¯Ø§ÙˆØ·Ù„Ø¨ Ø´Ø§ØºÙ„ Ø´Ø®ØµÛŒâ€ŒØ³Ø§Ø²ÛŒ Ùˆ Ø§Ø¹Ù…Ø§Ù„ Ú¯Ø±Ø¯ÛŒØ¯.",
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(),
      },
    ];
    taskSeed.forEach((t) => this.hierarchyTasks.set(t.id, t));

    // Seed Messages
    const messageSeed: DirectMessageRecord[] = [
      {
        id: "msg_1",
        threadId: "usr_student_1_usr_mentor1",
        senderId: "usr_mentor1",
        senderName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
        senderRole: "MENTOR",
        receiverId: "usr_student_1",
        receiverName: "Ø¢Ø±Ù…ÛŒÙ† Ø±Ø³ØªÙ…ÛŒ",
        receiverRole: "STUDENT",
        message: "Ø³Ù„Ø§Ù… Ø¢Ø±Ù…ÛŒÙ† Ø¬Ø§Ù†ØŒ Ú¯Ø²Ø§Ø±Ø´ Ø¯ÛŒØ±ÙˆØ² Ø±Ùˆ Ø¨Ø±Ø±Ø³ÛŒ Ú©Ø±Ø¯Ù…. Ù¾Ø§Ø±Øª Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ Û³ Ù†ÛŒØ§Ø² Ø¨Ù‡ ØªÙ…Ø±Ú©Ø² Ø¨ÛŒØ´ØªØ±ÛŒ Ø¯Ø§Ø±Ù‡. Ø®Ù„Ø§ØµÙ‡ Ù†Ù…ÙˆØ¯Ø§Ø±ÛŒ Ø¹Ù‚ÙˆØ¯ Ø±Ùˆ Ø¨Ø±Ø§Øª Ù…ÛŒâ€ŒÙØ±Ø³ØªÙ….",
        attachmentUrl: "/sample-docs/civil-law-summary.pdf",
        attachmentName: "Ø®Ù„Ø§ØµÙ‡_Ù†Ù…ÙˆØ¯Ø§Ø±ÛŒ_Ø¹Ù‚ÙˆØ¯_Ù…Ø¹ÛŒÙ†_Ù…Ø¯Ù†ÛŒÛ³.pdf",
        attachmentSize: 1845000,
        attachmentType: "application/pdf",
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        id: "msg_2",
        threadId: "usr_student_1_usr_mentor1",
        senderId: "usr_student_1",
        senderName: "Ø¢Ø±Ù…ÛŒÙ† Ø±Ø³ØªÙ…ÛŒ",
        senderRole: "STUDENT",
        receiverId: "usr_mentor1",
        receiverName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
        receiverRole: "MENTOR",
        message: "Ø³Ù„Ø§Ù… Ø§Ø³ØªØ§Ø¯ Ú©Ø§Ø¸Ù…ÛŒ Ø¹Ø²ÛŒØ²ØŒ Ù…Ù…Ù†ÙˆÙ†Ù…. ÙØ§ÛŒÙ„ Ø±Ùˆ Ø¯Ø±ÛŒØ§ÙØª Ú©Ø±Ø¯Ù…. ØªØ³Øªâ€ŒÙ‡Ø§ÛŒ Ø¢Ø²Ù…ÙˆÙ† Ø¬Ø§Ù…Ø¹ Ø¬Ù…Ø¹Ù‡ Ú¯Ø°Ø´ØªÙ‡ Ø±Ùˆ Ù‡Ù… ØªØ­Ù„ÛŒÙ„ Ú©Ø±Ø¯Ù… Ùˆ Ø¨Ø±Ø§ØªÙˆÙ† Ù¾ÛŒÙˆØ³Øª ÙØ±Ø³ØªØ§Ø¯Ù….",
        attachmentUrl: "/sample-docs/my-exam-notes.jpg",
        attachmentName: "ØªØ­Ù„ÛŒÙ„_Ú©Ø§Ø±Ù†Ø§Ù…Ù‡_Ø¢Ø²Ù…ÙˆÙ†Û´_Ù…Ø´Ø§Ù‡ÛŒØ±.jpg",
        attachmentSize: 2450000,
        attachmentType: "image/jpeg",
        isRead: false,
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        id: "msg_3",
        threadId: "usr_mentor1_usr_adminsupervisor",
        senderId: "usr_adminsupervisor",
        senderName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ (adminsupervisor)",
        senderRole: "SUPERVISOR",
        receiverId: "usr_mentor1",
        receiverName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
        receiverRole: "MENTOR",
        message: "Ø§Ø³ØªØ§Ø¯ Ú©Ø§Ø¸Ù…ÛŒØŒ Ù„Ø·ÙØ§Ù‹ ÙˆØ¶Ø¹ÛŒØª Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ø¨Ø­Ø±Ø§Ù†ÛŒ Tier 1 Ú©ÙˆÙ‡ÙˆØ±Øª Ø±Ø§ ØªØ§ Ø³Ø§Ø¹Øª Û±Û´ Ú¯Ø²Ø§Ø±Ø´ Ø¨ÙØ±Ù…Ø§ÛŒÛŒØ¯.",
        isRead: true,
        createdAt: new Date(Date.now() - 7200000),
      },
    ];
    messageSeed.forEach((m) => this.directMessages.set(m.id, m));

    // Seed Escalation Ticket
    this.escalationTickets.set("ticket_1", {
      id: "ticket_1",
      studentId: "usr_student_2",
      studentName: "ÙØ§Ø·Ù…Ù‡ Ø§Ø¨Ø±Ø§Ù‡ÛŒÙ…ÛŒ",
      studentPhone: "09121000006",
      mentorId: "usr_mentor1",
      mentorName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
      supervisorId: "usr_adminsupervisor",
      subject: "Ø¯Ø±Ø®ÙˆØ§Ø³Øª ØªØºÛŒÛŒØ± Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ÛŒ Ø¬Ù„Ø³Ø§Øª Ø¨Ù‡ Ø´ÛŒÙØª Ø¹ØµØ±",
      reasonCategory: "PLAN_CONFLICT",
      description: "Ø¨Ù‡ Ø¯Ù„ÛŒÙ„ ØªØºÛŒÛŒØ± Ø³Ø§Ø¹Ø§Øª Ø´ÛŒÙØª Ú©Ø§Ø±ÛŒØŒ Ø§Ù…Ú©Ø§Ù† Ù¾Ø§Ø³Ø®Ú¯ÙˆÛŒÛŒ Ø¨Ù‡ ØªÙ…Ø§Ø³â€ŒÙ‡Ø§ÛŒ ØµØ¨Ø­Ú¯Ø§Ù‡ÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù† ÙˆØ¬ÙˆØ¯ Ù†Ø¯Ø§Ø±Ø¯.",
      status: "OPEN",
      createdAt: new Date(),
    });

    // Seed Weekly Plan Template
    this.weeklyPlanTemplates.set("tpl_week30", {
      id: "tpl_week30",
      authorId: "usr_adminsupervisor",
      authorName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ Ú©ÙˆÙ‡ÙˆØ±Øª (adminsupervisor)",
      title: "ØªÙ…Ù¾Ù„ÛŒØª Ø¬Ø§Ù…Ø¹ Ø±Ø§Ù‡Ø¨Ø±Ø¯ÛŒ Ù‡ÙØªÙ‡ Û³Û° - Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Ú©Ø§Ù†ÙˆÙ† Ùˆ Ù…Ø±Ú©Ø²",
      jalaliYear: 1403,
      jalaliWeekNumber: 30,
      targetCohort: "Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† ØªÙ…Ø§Ù…â€ŒÙˆÙ‚Øª Ùˆ Ø¢Ø²Ø§Ø¯",
      weeklyMainGoal: "ØªØ«Ø¨ÛŒØª Ø¹Ù‚ÙˆØ¯ Ù…Ø¹ÛŒÙ† Ù…Ø¯Ù†ÛŒ Ùˆ ØµÙ„Ø§Ø­ÛŒØªâ€ŒÙ‡Ø§ÛŒ Ù…Ø­Ù„ÛŒ Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù…Ø¯Ù†ÛŒ",
      items: [
        {
          dayOfWeek: 0,
          subject: "Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ",
          activityType: "STUDY",
          topicDescription: "Ø¹Ù‚ÙˆØ¯ Ù…Ø¹ÛŒÙ†: Ø§Ø¬Ø§Ø±Ù‡ØŒ ÙˆØ¯ÛŒØ¹Ù‡ Ùˆ Ø¹Ø§Ø±ÛŒÙ‡ (Ù…ÙˆØ§Ø¯ Û´Û¶Û¶ Ø§Ù„ÛŒ Û¶Û´Û°)",
          targetVolume: "Û³Ûµ ØµÙØ­Ù‡ + Û²Ûµ ØªØ³Øª",
          targetDurationMinutes: 120,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 0,
          subject: "Ø­Ù‚ÙˆÙ‚ ØªØ¬Ø§Ø±Øª",
          activityType: "STATUTE_READ",
          topicDescription: "Ø§Ø³Ù†Ø§Ø¯ ØªØ¬Ø§Ø±ÛŒ: Ø¨Ø±Ø§Øª Ùˆ Ø¸Ù‡Ø±Ù†ÙˆÛŒØ³ÛŒ (Ù…ÙˆØ§Ø¯ Û²Û²Û³ Ø§Ù„ÛŒ Û²ÛµÛ±)",
          targetVolume: "Û²Û° Ù…Ø§Ø¯Ù‡ + ØªØ³Øª Ø³Ù†ÙˆØ§Øª",
          targetDurationMinutes: 90,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 1,
          subject: "Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù…Ø¯Ù†ÛŒ",
          activityType: "STUDY",
          topicDescription: "ØµÙ„Ø§Ø­ÛŒØª Ù…Ø±Ø§Ø¬Ø¹ Ø¯Ø§Ø¯Ú¯Ø³ØªØ±ÛŒ Ùˆ Ø´ÙˆØ±Ø§Ù‡Ø§ÛŒ Ø­Ù„ Ø§Ø®ØªÙ„Ø§Ù",
          targetVolume: "Û³Û° ØµÙØ­Ù‡",
          targetDurationMinutes: 100,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 2,
          subject: "Ø­Ù‚ÙˆÙ‚ Ø¬Ø²Ø§",
          activityType: "TEST_PRACTICE",
          topicDescription: "Ù…Ø¬Ø§Ø²Ø§Øªâ€ŒÙ‡Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„ÛŒ Ùˆ ØªØ¨Ø¹ÛŒ Ùˆ ØªØ®ÙÛŒÙ Ù…Ø¬Ø§Ø²Ø§Øª",
          targetVolume: "Û´Û° ØªØ³Øª ØªØ­Ù„ÛŒÙ„ÛŒ",
          targetDurationMinutes: 90,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 3,
          subject: "Ù…ØªÙˆÙ† ÙÙ‚Ù‡",
          activityType: "STUDY",
          topicDescription: "Ú©ØªØ§Ø¨ Ø§Ù„Ù‚Ø¶Ø§Ø¡ Ùˆ Ø§Ù„Ø´Ù‡Ø§Ø¯Ø§Øª Ù„Ù…Ø¹Ù‡ Ø¯Ù…Ø´Ù‚ÛŒÙ‡",
          targetVolume: "Û±Ûµ ØµÙØ­Ù‡ Ø¹Ø±Ø¨ÛŒ Ø§Ø¹Ø±Ø§Ø¨â€ŒÚ¯Ø°Ø§Ø±ÛŒ Ø´Ø¯Ù‡",
          targetDurationMinutes: 75,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 5,
          subject: "Ù…Ø¨Ø§Ø­Ø« Ø¬Ø¨Ø±Ø§Ù†ÛŒ",
          activityType: "REVIEW",
          topicDescription: "Ù…Ø±ÙˆØ± ÙÙ„Ø´â€ŒÚ©Ø§Ø±Øªâ€ŒÙ‡Ø§ÛŒ Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ú©ÛŒÙØ±ÛŒ Ùˆ ØªØ³Øªâ€ŒÙ‡Ø§ÛŒ ØºÙ„Ø· Ø¢Ø²Ù…ÙˆÙ† Ú¯Ø°Ø´ØªÙ‡",
          targetVolume: "Ø±ÙØ¹ Ø§Ø´Ú©Ø§Ù„ Ù¾Ø§Ø±Øªâ€ŒÙ‡Ø§ÛŒ Ø¹Ù‚Ø¨â€ŒØ§ÙØªØ§Ø¯Ù‡",
          targetDurationMinutes: 90,
          isCatchup: true,
          status: "NOT_DONE",
        },
      ],
      createdAt: new Date(),
    });

    // Seed Evaluation Exams with Real Questions and Audience Targeting
    const exam1: EvaluationExamRecord = {
      id: "exam_eval_1",
      creatorId: "usr_adminsupervisor",
      creatorRole: "SUPERVISOR",
      creatorName: "Ø¯Ú©ØªØ± Ù…Ø±ÛŒÙ… Ø±Ø¶Ø§ÛŒÛŒ (Ø³Ø±Ù¾Ø±Ø³Øª Ø¢Ù…ÙˆØ²Ø´ÛŒ)",
      title: "Ø¢Ø²Ù…ÙˆÙ† Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ ØªØ´Ø®ÛŒØµÛŒ Ø¯Ø±ÙˆØ³ Ø§Ø®ØªØµØ§ØµÛŒ (Ù…Ø¯Ù†ÛŒØŒ ØªØ¬Ø§Ø±Øª Ùˆ Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ)",
      description: "Ø³Ù†Ø¬Ø´ ØªØ±Ø§Ø² Ùˆ Ø¢Ù…Ø§Ø¯Ú¯ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ø¨Ø±Ø§ÛŒ Ù…Ø¨Ø§Ø­Ø« Ù†ÛŒÙ…â€ŒØ³Ø§Ù„ Ø§ÙˆÙ„ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Ø¯Ø§Ø¯Ú¯Ø³ØªØ±ÛŒ.",
      startTime: "1403-07-25 08:00",
      endTime: "1403-08-25 22:00", // Open now
      durationMinutes: 90,
      totalQuestions: 4,
      subjectsWeight: {
        "Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ": 40,
        "Ø­Ù‚ÙˆÙ‚ ØªØ¬Ø§Ø±Øª": 30,
        "Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù…Ø¯Ù†ÛŒ": 30,
      },
      isPublished: true,
      targetCohort: "ØªÙ…Ø§Ù…ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† ØªØ­Øª Ø³Ø±Ù¾Ø±Ø³ØªÛŒ",
      assignedStudentIds: ["ALL"],
      questions: [
        {
          id: "q_1_1",
          examId: "exam_eval_1",
          type: "MULTIPLE_CHOICE",
          subject: "Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ",
          questionText: "Ø§Ú¯Ø± Ø¯Ø± Ø¹Ù‚Ø¯ Ø¨ÛŒØ¹ØŒ Ù…Ø¨ÛŒØ¹ Ø¹ÛŒÙ† Ù…Ø¹ÛŒÙ† Ø¨Ø§Ø´Ø¯ Ùˆ Ù‚Ø¨Ù„ Ø§Ø² ØªØ³Ù„ÛŒÙ… Ø¨Ø¯ÙˆÙ† ØªØ¹Ø¯ÛŒ Ùˆ ØªÙØ±ÛŒØ· Ø¨Ø§ÛŒØ¹ ØªÙ„Ù Ø´ÙˆØ¯ØŒ Ø§Ø«Ø± Ø­Ù‚ÙˆÙ‚ÛŒ Ø¢Ù† Ú†ÛŒØ³ØªØŸ",
          options: [
            "Ø¹Ù‚Ø¯ Ù…Ù†ÙØ³Ø® Ù…ÛŒâ€ŒØ´ÙˆØ¯ Ùˆ Ø«Ù…Ù† Ø¨Ø§ÛŒØ¯ Ø¨Ù‡ Ø®Ø±ÛŒØ¯Ø§Ø± Ù…Ø³ØªØ±Ø¯ Ú¯Ø±Ø¯Ø¯.",
            "Ø¹Ù‚Ø¯ Ø¨Ø§Ø·Ù„ Ø§Ø³Øª Ùˆ Ø¨Ø§ÛŒØ¹ Ø¶Ø§Ù…Ù† Ù¾Ø±Ø¯Ø§Ø®Øª Ù…Ø«Ù„ ÛŒØ§ Ù‚ÛŒÙ…Øª Ø§Ø³Øª.",
            "Ø®Ø±ÛŒØ¯Ø§Ø± Ø­Ù‚ ÙØ³Ø® Ù…Ø¹Ø§Ù…Ù„Ù‡ Ø±Ø§ Ø¨Ù‡ Ø§Ø³ØªÙ†Ø§Ø¯ Ø®ÛŒØ§Ø± ØªØ¹Ø°Ø± ØªØ³Ù„ÛŒÙ… Ø¯Ø§Ø±Ø¯.",
            "Ø¹Ù‚Ø¯ ØµØ­ÛŒØ­ Ø§Ø³Øª Ùˆ ØªÙ„Ù Ù…Ø¨ÛŒØ¹ Ø¨Ø± Ø¹Ù‡Ø¯Ù‡ Ø®Ø±ÛŒØ¯Ø§Ø± Ø§Ø³Øª."
          ],
          correctOptionIndex: 0,
          modelAnswer: "Ù…Ø·Ø§Ø¨Ù‚ Ù…Ø§Ø¯Ù‡ Û³Û¸Û· Ù‚Ø§Ù†ÙˆÙ† Ù…Ø¯Ù†ÛŒØŒ Ø§Ú¯Ø± Ù…Ø¨ÛŒØ¹ Ù¾ÛŒØ´ Ø§Ø² ØªØ³Ù„ÛŒÙ… Ø¨Ø¯ÙˆÙ† ØªØ¹Ø¯ÛŒ Ùˆ ØªÙØ±ÛŒØ· Ø¨Ø§ÛŒØ¹ ØªÙ„Ù Ø´ÙˆØ¯ØŒ Ø¨ÛŒØ¹ Ù…Ù†ÙØ³Ø® Ùˆ Ø«Ù…Ù† Ù…Ø³ØªØ±Ø¯ Ù…ÛŒâ€ŒÚ¯Ø±Ø¯Ø¯.",
          points: 1,
          orderIndex: 1,
        },
        {
          id: "q_1_2",
          examId: "exam_eval_1",
          type: "MULTIPLE_CHOICE",
          subject: "Ø­Ù‚ÙˆÙ‚ ØªØ¬Ø§Ø±Øª",
          questionText: "Ø¯Ø± Ù„Ø§ÛŒØ­Ù‡ Ù‚Ø§Ù†ÙˆÙ†ÛŒ Ø§ØµÙ„Ø§Ø­ Ù‚Ø³Ù…ØªÛŒ Ø§Ø² Ù‚Ø§Ù†ÙˆÙ† ØªØ¬Ø§Ø±ØªØŒ Ø­Ø¯Ø§Ù‚Ù„ ØªØ¹Ø¯Ø§Ø¯ Ù…Ø¯ÛŒØ±Ø§Ù† Ùˆ Ø­Ø¯Ø§Ù‚Ù„ ØªØ¹Ø¯Ø§Ø¯ Ø³Ù‡Ø§Ù…Ø¯Ø§Ø±Ø§Ù† Ø¯Ø± Ø´Ø±Ú©Øª Ø³Ù‡Ø§Ù…ÛŒ Ø®Ø§Øµ Ø¨Ù‡ ØªØ±ØªÛŒØ¨ Ú†Ù†Ø¯ Ù†ÙØ± Ø§Ø³ØªØŸ",
          options: [
            "Û³ Ù†ÙØ± Ù…Ø¯ÛŒØ± - Û³ Ù†ÙØ± Ø³Ù‡Ø§Ù…Ø¯Ø§Ø±",
            "Û² Ù†ÙØ± Ù…Ø¯ÛŒØ± - Û³ Ù†ÙØ± Ø³Ù‡Ø§Ù…Ø¯Ø§Ø±",
            "Û³ Ù†ÙØ± Ù…Ø¯ÛŒØ± - Ûµ Ù†ÙØ± Ø³Ù‡Ø§Ù…Ø¯Ø§Ø±",
            "Û² Ù†ÙØ± Ù…Ø¯ÛŒØ± - Û² Ù†ÙØ± Ø³Ù‡Ø§Ù…Ø¯Ø§Ø±"
          ],
          correctOptionIndex: 1,
          modelAnswer: "Ù…Ø·Ø§Ø¨Ù‚ Ù…Ø§Ø¯Ù‡ Û±Û°Û· Ù„Ø§ÛŒØ­Ù‡ Ø§ØµÙ„Ø§Ø­ÛŒØŒ Ø­Ø¯Ø§Ù‚Ù„ Ù‡ÛŒØ¦Øª Ù…Ø¯ÛŒØ±Ù‡ Ø¯Ø± Ø³Ù‡Ø§Ù…ÛŒ Ø®Ø§Øµ Û² Ù†ÙØ± Ùˆ Ø­Ø¯Ø§Ù‚Ù„ Ø³Ù‡Ø§Ù…Ø¯Ø§Ø±Ø§Ù† Ù…Ø·Ø§Ø¨Ù‚ Ù…Ø§Ø¯Ù‡ Û³ØŒ Û³ Ù†ÙØ± Ø§Ø³Øª.",
          points: 1,
          orderIndex: 2,
        },
        {
          id: "q_1_3",
          examId: "exam_eval_1",
          type: "TRUE_FALSE",
          subject: "Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù…Ø¯Ù†ÛŒ",
          questionText: "Ø§ÛŒØ±Ø§Ø¯ Ø¹Ø¯Ù… ØµÙ„Ø§Ø­ÛŒØª Ù…Ø­Ù„ÛŒ Ø¯Ø§Ø¯Ú¯Ø§Ù‡ØŒ Ø¨Ø§ÛŒØ¯ ØªØ§ Ù¾Ø§ÛŒØ§Ù† Ø§ÙˆÙ„ÛŒÙ† Ø¬Ù„Ø³Ù‡ Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ø¨Ù‡ Ø¹Ù…Ù„ Ø¢ÛŒØ¯ØŒ Ù…Ú¯Ø± Ø¢Ù†Ú©Ù‡ Ø³Ø¨Ø¨ Ø§ÛŒØ±Ø§Ø¯ Ø¨Ø¹Ø¯Ø§Ù‹ Ø­Ø§Ø¯Ø« Ø´ÙˆØ¯.",
          options: ["ØµØ­ÛŒØ­", "ØºÙ„Ø·"],
          correctOptionIndex: 0,
          modelAnswer: "Ù…Ø·Ø§Ø¨Ù‚ Ù…Ø§Ø¯Ù‡ Û¸Û· Ù‚Ø§Ù†ÙˆÙ† Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ø¯Ø§Ø¯Ú¯Ø§Ù‡â€ŒÙ‡Ø§ÛŒ Ø¹Ù…ÙˆÙ…ÛŒ Ùˆ Ø§Ù†Ù‚Ù„Ø§Ø¨ Ø¯Ø± Ø§Ù…ÙˆØ± Ù…Ø¯Ù†ÛŒØŒ Ø§ÛŒØ±Ø§Ø¯ Ø¹Ø¯Ù… ØµÙ„Ø§Ø­ÛŒØª Ù…Ø­Ù„ÛŒ Ù…Ù‚ÛŒØ¯ Ø¨Ù‡ Ù…Ù‡Ù„Øª Ø§ÙˆÙ„ÛŒÙ† Ø¬Ù„Ø³Ù‡ Ø§Ø³Øª.",
          points: 1,
          orderIndex: 3,
        },
        {
          id: "q_1_4",
          examId: "exam_eval_1",
          type: "DESCRIPTIVE",
          subject: "Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ",
          questionText: "ØªÙØ§ÙˆØª Ø¨Ù†ÛŒØ§Ø¯ÛŒ Ù…ÛŒØ§Ù† Â«Ø¨Ø·Ù„Ø§Ù†Â»ØŒ Â«ÙØ³Ø®Â» Ùˆ Â«Ø§Ù†ÙØ³Ø§Ø®Â» Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø±Ø§ Ø¨Ø§ Ø°Ú©Ø± Ù…Ù†Ø´Ø£ Ùˆ Ø§Ø«Ø± Ù‡Ø± ÛŒÚ© Ø¯Ø± Ø¯Ùˆ Ø³Ø·Ø± ØªØ´Ø±ÛŒØ­ ÙØ±Ù…Ø§ÛŒÛŒØ¯.",
          modelAnswer: "Ø¨Ø·Ù„Ø§Ù† ÙÙ‚Ø¯Ø§Ù† Ø§Ø«Ø± Ø§Ø² Ø§Ø¨ØªØ¯Ø§ Ø¨Ù‡ Ø¯Ù„ÛŒÙ„ Ø¹ÛŒØ¨ Ø±Ú©Ù†ÛŒ Ø§Ø³ØªØ› ÙØ³Ø® Ø§Ù†Ø­Ù„Ø§Ù„ Ø§Ø±Ø§Ø¯ÛŒ Ø¹Ù‚Ø¯ Ù„Ø§Ø²Ù… Ø¨Ø§ Ø®ÛŒØ§Ø± Ù‚Ø§Ù†ÙˆÙ†ÛŒ ÛŒØ§ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ÛŒ Ø§Ø³ØªØ› Ùˆ Ø§Ù†ÙØ³Ø§Ø® Ø§Ù†Ø­Ù„Ø§Ù„ Ù‚Ù‡Ø±ÛŒ Ø¨Ù‡ Ø­Ú©Ù… Ù‚Ø§Ù†ÙˆÙ† ÛŒØ§ Ø´Ø±Ø· ÙØ§Ø³Ø® Ø§Ø³Øª.",
          points: 2,
          orderIndex: 4,
        },
      ],
      createdAt: new Date("2024-10-10"),
    };

    const exam2: EvaluationExamRecord = {
      id: "exam_eval_2",
      creatorId: "usr_mentor1",
      creatorRole: "MENTOR",
      creatorName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
      title: "Ú©ÙˆØ¦ÛŒØ² Ø³Ù†Ø¬Ø´ Ø³Ø±Ø¹Øª ØªØ³Øªâ€ŒØ²Ù†ÛŒ Ø­Ù‚ÙˆÙ‚ Ø¬Ø²Ø§ Ùˆ Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ú©ÛŒÙØ±ÛŒ",
      description: "Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ Ø¯Ù‚Øª Ù¾Ø§Ø³Ø®â€ŒØ¯Ù‡ÛŒ Ø¨Ù‡ ØªÙ„Ù‡â€ŒÙ‡Ø§ÛŒ Ú¯Ø²ÛŒÙ†Ù‡â€ŒØ§ÛŒ Ù‚Ø§Ù†ÙˆÙ† Ù…Ø¬Ø§Ø²Ø§Øª Ø§Ø³Ù„Ø§Ù…ÛŒ.",
      startTime: "1403-08-08 14:00",
      endTime: "1403-08-30 20:00",
      durationMinutes: 45,
      totalQuestions: 2,
      subjectsWeight: {
        "Ø­Ù‚ÙˆÙ‚ Ø¬Ø²Ø§ Ø¹Ù…ÙˆÙ…ÛŒ Ùˆ Ø§Ø®ØªØµØ§ØµÛŒ": 50,
        "Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ú©ÛŒÙØ±ÛŒ": 50,
      },
      isPublished: true,
      targetCohort: "Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ø§Ø³ØªØ§Ø¯ Ú©Ø§Ø¸Ù…ÛŒ",
      assignedStudentIds: ["ALL"],
      questions: [
        {
          id: "q_2_1",
          examId: "exam_eval_2",
          type: "MULTIPLE_CHOICE",
          subject: "Ø­Ù‚ÙˆÙ‚ Ø¬Ø²Ø§ Ø¹Ù…ÙˆÙ…ÛŒ Ùˆ Ø§Ø®ØªØµØ§ØµÛŒ",
          questionText: "Ú©Ø¯Ø§Ù… ÛŒÚ© Ø§Ø² Ù…Ø¬Ø§Ø²Ø§Øªâ€ŒÙ‡Ø§ÛŒ Ø²ÛŒØ± Ø¯Ø± Ø²Ù…Ø±Ù‡ Ù…Ø¬Ø§Ø²Ø§Øªâ€ŒÙ‡Ø§ÛŒ ØªÚ©Ù…ÛŒÙ„ÛŒ Ù…Ù‚Ø±Ø± Ø¯Ø± Ù…Ø§Ø¯Ù‡ Û²Û³ Ù‚Ø§Ù†ÙˆÙ† Ù…Ø¬Ø§Ø²Ø§Øª Ø§Ø³Ù„Ø§Ù…ÛŒ Ø§Ø³ØªØŸ",
          options: [
            "Ø§Ù‚Ø§Ù…Øª Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ø¯Ø± Ù…Ø­Ù„ Ù…Ø¹ÛŒÙ†",
            "Ø¶Ø¨Ø· Ø§Ù…ÙˆØ§Ù„ Ù†Ø§Ø´ÛŒ Ø§Ø² Ø¬Ø±Ù…",
            "Ø´Ù„Ø§Ù‚ ØªØ¹Ø²ÛŒØ±ÛŒ ØªØ§ Û·Û´ Ø¶Ø±Ø¨Ù‡",
            "Ø­Ø¨Ø³ ØªØ¹Ø²ÛŒØ±ÛŒ Ø¯Ø±Ø¬Ù‡ Ø´Ø´"
          ],
          correctOptionIndex: 0,
          modelAnswer: "Ù…Ø·Ø§Ø¨Ù‚ Ø¨Ù†Ø¯ (Ø§Ù„Ù) Ù…Ø§Ø¯Ù‡ Û²Û³ Ù‚Ø§Ù†ÙˆÙ† Ù…Ø¬Ø§Ø²Ø§Øª Ø§Ø³Ù„Ø§Ù…ÛŒØŒ Ø§Ù‚Ø§Ù…Øª Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ø¯Ø± Ù…Ø­Ù„ Ù…Ø¹ÛŒÙ† ÛŒÚ©ÛŒ Ø§Ø² Ù…ØµØ§Ø¯ÛŒÙ‚ Ù…Ø¬Ø§Ø²Ø§Øª ØªÚ©Ù…ÛŒÙ„ÛŒ Ø§Ø³Øª.",
          points: 1,
          orderIndex: 1,
        },
        {
          id: "q_2_2",
          examId: "exam_eval_2",
          type: "SHORT_ANSWER",
          subject: "Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ú©ÛŒÙØ±ÛŒ",
          questionText: "Ø­Ø¯Ø§Ú©Ø«Ø± Ù…Ù‡Ù„Øª Ù‚Ø§Ù†ÙˆÙ†ÛŒ Ø¨Ø§Ø²Ù¾Ø±Ø³ Ø¨Ø±Ø§ÛŒ Ø§Ø¸Ù‡Ø§Ø±Ù†Ø¸Ø± Ø¯Ø± Ø®ØµÙˆØµ Ù‚Ø±Ø§Ø± Ù…Ù†Ø¹ ØªØ¹Ù‚ÛŒØ¨ ÛŒØ§ Ø¬Ù„Ø¨ Ø¨Ù‡ Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù¾Ø³ Ø§Ø² Ù¾Ø§ÛŒØ§Ù† ØªØ­Ù‚ÛŒÙ‚Ø§Øª Ú†Ù†Ø¯ Ø±ÙˆØ² Ø§Ø³ØªØŸ",
          modelAnswer: "Ûµ Ø±ÙˆØ² Ú©Ø§Ø±ÛŒ",
          points: 1,
          orderIndex: 2,
        },
      ],
      createdAt: new Date(),
    };

    this.evaluationExams.set(exam1.id, exam1);
    this.evaluationExams.set(exam2.id, exam2);

    // Seed Exam Submissions for comparison charts
    const sub1: ExamSubmissionRecord = {
      id: "sub_1",
      examId: "exam_eval_1",
      examTitle: exam1.title,
      studentProfileId: "profile_stu_1",
      studentName: "Ø³Ø§Ø±Ø§ Ø§Ø­Ù…Ø¯ÛŒ",
      scorePercent: 78,
      subjectScores: {
        "Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ": 82,
        "Ø­Ù‚ÙˆÙ‚ ØªØ¬Ø§Ø±Øª": 74,
        "Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ Ù…Ø¯Ù†ÛŒ": 78,
      },
      correctCount: 48,
      wrongCount: 8,
      unansweredCount: 4,
      rank: 8,
      deltaFromPrevious: +6,
      deltaFromBaseline: +24,
      submittedAt: new Date(Date.now() - 86400000),
    };
    this.examSubmissions.set(sub1.id, sub1);

    // Seed VoIP Calls (Asterisk Issabel)
    const call1: VoipCallRecord = {
      id: "call_1",
      mentorId: "usr_mentor1",
      mentorName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
      mentorExtension: "101",
      studentProfileId: "profile_stu_1",
      studentName: "Ø¢Ø±Ù…ÛŒÙ† Ø±Ø³ØªÙ…ÛŒ",
      maskedPhone: "Û°Û¹Û±Û²***Û°Û°Û°Ûµ",
      status: "COMPLETED",
      durationSeconds: 432,
      callUniqueId: "asterisk_1729001234.5",
      initiatedAt: new Date(Date.now() - 86400000),
      notes: "Ù…Ø´Ø§ÙˆØ±Ù‡ ØªÙ„ÙÙ†ÛŒ Ù‡Ø¯Ø§ÛŒØª ØªØ­ØµÛŒÙ„ÛŒ Ùˆ Ø­Ù„ Ú†Ø§Ù„Ø´ Ø¹Ù‚ÙˆØ¯ Ù…Ø¯Ù†ÛŒ - Ø§ØªØµØ§Ù„ Ù…ÙˆÙÙ‚ Ø§Ø² Ø·Ø±ÛŒÙ‚ Zoiper",
    };
    const call2: VoipCallRecord = {
      id: "call_2",
      mentorId: "usr_mentor1",
      mentorName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
      mentorExtension: "101",
      studentProfileId: "profile_stu_2",
      studentName: "ÙØ§Ø·Ù…Ù‡ Ø§Ø¨Ø±Ø§Ù‡ÛŒÙ…ÛŒ",
      maskedPhone: "Û°Û¹Û±Û²***Û°Û°Û°Û¶",
      status: "ANSWERED",
      durationSeconds: 195,
      callUniqueId: "asterisk_1729005432.1",
      initiatedAt: new Date(Date.now() - 3600000 * 3),
      notes: "Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ù‡Ø´Ø¯Ø§Ø± Ø³Ú©ÙˆØª Û´ Ø±ÙˆØ²Ù‡ (A08) Ø¨Ø§ Ø®Ø· Ø§Ù…Ù† Ù…ÙˆØ³Ø³Ù‡",
    };
    this.voipCalls.set(call1.id, call1);
    this.voipCalls.set(call2.id, call2);

    // Seed Advanced Chat Channels and Groups
    const channel1: ChatConversationRecord = {
      id: "conv_channel_bar1403",
      type: "CHANNEL",
      title: "Ú©Ø§Ù†Ø§Ù„ Ø§Ø·Ù„Ø§Ø¹ÛŒÙ‡â€ŒÙ‡Ø§ÛŒ Ø±Ø³Ù…ÛŒ Ø¢Ø²Ù…ÙˆÙ† ÙˆÚ©Ø§Ù„Øª Û±Û´Û°Û³",
      description: "Ú©Ø§Ù†Ø§Ù„ Ø§Ø·Ù„Ø§Ø¹â€ŒØ±Ø³Ø§Ù†ÛŒ Ø³Ø±Ø§Ø³Ø±ÛŒ Ø¨Ø®Ø´Ù†Ø§Ù…Ù‡â€ŒÙ‡Ø§ÛŒ Ø§Ø³Ú©ÙˆØ¯Ø§ØŒ Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ÛŒ Ù…Ø±Ú©Ø² Ùˆ Ø²Ù…Ø§Ù†â€ŒØ¨Ù†Ø¯ÛŒ Ø¢Ø²Ù…ÙˆÙ†â€ŒÙ‡Ø§ÛŒ Ø¢Ø²Ù…Ø§ÛŒØ´ÛŒ Ù…Ø´Ø§Ù‡ÛŒØ±",
      creatorId: "usr_admin",
      creatorRole: "CEO",
      creatorName: "Ù…Ø¯ÛŒØ±ÛŒØª Ø§Ø±Ø´Ø¯",
      memberIds: ["usr_admin", "usr_adminsupervisor", "usr_mentor1", "usr_mentor2"],
      isChannelReadOnlyForStudents: true,
      createdAt: new Date("2024-07-01"),
      updatedAt: new Date(),
    };
    const group1: ChatConversationRecord = {
      id: "conv_group_civil_law",
      type: "GROUP",
      title: "Ú©ÙˆÙ‡ÙˆØ±Øª Ù…Ø¨Ø§Ø­Ø«Ù‡ Ùˆ ØªØ­Ù„ÛŒÙ„ Ù¾Ø±ÙˆÙ†Ø¯Ù‡â€ŒÙ‡Ø§ÛŒ Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ",
      description: "Ú¯Ø±ÙˆÙ‡ ØªØ¹Ø§Ù…Ù„ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ø¨Ø±ØªØ± Ø¬Ù‡Øª Ø¨Ø±Ø±Ø³ÛŒ ØªÙ„Ù‡â€ŒÙ‡Ø§ÛŒ ØªØ³ØªÛŒ Ø¯Ø±Ø³ Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ Û³ Ùˆ Ø¹Ù‚ÙˆØ¯ Ù…Ø¹ÛŒÙ†",
      creatorId: "usr_adminsupervisor",
      creatorRole: "SUPERVISOR",
      creatorName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ Ú©ÙˆÙ‡ÙˆØ±Øª",
      memberIds: ["usr_adminsupervisor", "usr_mentor1", "usr_student_1", "usr_student_2", "usr_student_3", "usr_student_5"],
      isChannelReadOnlyForStudents: false,
      createdAt: new Date("2024-08-10"),
      updatedAt: new Date(),
    };
    this.chatConversations.set(channel1.id, channel1);
    this.chatConversations.set(group1.id, group1);

    const cMsg1: ChatMessageRecord = {
      id: "cmsg_1",
      conversationId: "conv_channel_bar1403",
      senderId: "usr_admin",
      senderName: "Ù…Ø¯ÛŒØ±ÛŒØª Ø§Ø±Ø´Ø¯",
      senderRole: "CEO",
      message: "Ø¨Ù‡ Ø§Ø·Ù„Ø§Ø¹ ØªÙ…Ø§Ù…ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ú¯Ø±Ø§Ù…ÛŒ Ù…ÛŒâ€ŒØ±Ø³Ø§Ù†Ø¯ØŒ Ø¨ÙˆØ¯Ø¬Ù‡â€ŒØ¨Ù†Ø¯ÛŒ Ø¢Ø²Ù…ÙˆÙ† Ø¬Ø§Ù…Ø¹ Ø´Ù…Ø§Ø±Ù‡ Û´ Ú©Ø§Ù†ÙˆÙ† ÙˆÚ©Ù„Ø§ Ø¯Ø± Ø¨Ø®Ø´ Ø¢Ø²Ù…ÙˆÙ†â€ŒÙ‡Ø§ÛŒ ØªØ´Ø®ÛŒØµÛŒ ÙØ¹Ø§Ù„ Ú¯Ø±Ø¯ÛŒØ¯.",
      attachmentUrl: "/sample-docs/exam-schedule-1403.pdf",
      attachmentName: "Ø¨ÙˆØ¯Ø¬Ù‡_Ø¨Ù†Ø¯ÛŒ_Ø¢Ø²Ù…ÙˆÙ†_Ù‡Ø§ÛŒ_Ø¬Ø§Ù…Ø¹_ÙˆÚ©Ø§Ù„Øª.pdf",
      attachmentSize: 1240000,
      attachmentType: "application/pdf",
      createdAt: new Date(Date.now() - 3600000 * 24),
    };
    const cMsg2: ChatMessageRecord = {
      id: "cmsg_2",
      conversationId: "conv_group_civil_law",
      senderId: "usr_mentor1",
      senderName: "Ø§Ø³ØªØ§Ø¯ Ø¹Ù„ÛŒ Ú©Ø§Ø¸Ù…ÛŒ",
      senderRole: "MENTOR",
      message: "Ù‡Ù…Ú©Ø§Ø±Ø§Ù† Ùˆ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ú¯Ø±Ø§Ù…ÛŒØŒ Ù…Ø³Ø¦Ù„Ù‡ ØªÙØ§ÙˆØª Ø§Ø¬Ø§Ø±Ù‡ Ø¨Ù‡ Ø´Ø±Ø· ØªÙ…Ù„ÛŒÚ© Ùˆ Ù„ÛŒØ²ÛŒÙ†Ú¯ Ø®ÙˆØ¯Ø±Ùˆ Ø¯Ø± Ø¢Ø²Ù…ÙˆÙ† Ø³Ø§Ù„ Ù‚Ø¨Ù„ Ø¨Ù‡ Ú†Ø§Ù„Ø´ Ú©Ø´ÛŒØ¯Ù‡ Ø´Ø¯Ù‡ Ø¨ÙˆØ¯. Ù†Ø¸Ø±ØªØ§Ù† Ø±Ø§ Ø¨Ù‡ Ø§Ø´ØªØ±Ø§Ú© Ø¨Ú¯Ø°Ø§Ø±ÛŒØ¯.",
      createdAt: new Date(Date.now() - 3600000 * 5),
    };
    this.chatMessages.set(cMsg1.id, cMsg1);
    this.chatMessages.set(cMsg2.id, cMsg2);

    // Seed Video Conference Sessions
    const vSession1: VideoSessionRecord = {
      id: "vsession_1",
      title: "Ú©Ø§Ø±Ú¯Ø§Ù‡ Ø¬Ø§Ù…Ø¹ ØªØ­Ù„ÛŒÙ„ Ø¢Ø±Ø§ÛŒ ÙˆØ­Ø¯Øª Ø±ÙˆÛŒÙ‡ Ø­Ù‚ÙˆÙ‚ Ù…Ø¯Ù†ÛŒ Ùˆ Ø¢ÛŒÛŒÙ† Ø¯Ø§Ø¯Ø±Ø³ÛŒ",
      hostId: "usr_adminsupervisor",
      hostName: "Ø³Ø±Ù¾Ø±Ø³Øª Ø§Ø±Ø´Ø¯ Ú©ÙˆÙ‡ÙˆØ±Øª",
      hostRole: "SUPERVISOR",
      roomCode: "msh-bar-1403-live",
      sessionType: "COHORT_WEBINAR",
      targetCohort: "ØªÙ…Ø§Ù…ÛŒ Ø¯Ø§ÙˆØ·Ù„Ø¨Ø§Ù† Ú©ÙˆÙ‡ÙˆØ±Øª",
      allowedRoles: ["CEO", "ADMIN", "SUPERVISOR", "MENTOR", "STUDENT"],
      participantIds: ["usr_adminsupervisor", "usr_mentor1", "usr_student_1", "usr_student_2"],
      scheduledStart: "1403-08-06 17:30",
      durationMinutes: 90,
      status: "SCHEDULED",
      joinUrl: "https://room.mashahir.ac.ir/join/msh-bar-1403-live?token=msh_jwt_live_session_99",
      createdAt: new Date(),
    };
    this.videoSessions.set(vSession1.id, vSession1);
  }

  // -------------------------------------------------------------
  // User Management
  // -------------------------------------------------------------
  getUserByPhone(phone: string): UserRecord | undefined {
    const normalized = phone.trim();
    for (const user of this.users.values()) {
      if (user.phoneNumber === normalized) return user;
    }
    return undefined;
  }

  getUserByUsername(username: string): UserRecord | undefined {
    const normalized = username.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.username && user.username.toLowerCase() === normalized) return user;
    }
    return undefined;
  }

  getUserByUsernameOrPhone(identifier: string): UserRecord | undefined {
    const normalized = identifier.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (
        user.phoneNumber === normalized ||
        (user.username && user.username.toLowerCase() === normalized)
      ) {
        return user;
      }
    }
    return undefined;
  }

  getUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  getAllUsers(): UserRecord[] {
    return Array.from(this.users.values());
  }

  getAllMentors(): UserRecord[] {
    return Array.from(this.users.values()).filter((u) => u.role === "MENTOR");
  }

  updateUserPassword(userId: string, newPasswordHash: string) {
    const user = this.users.get(userId);
    if (user) {
      user.passwordHash = newPasswordHash;
      user.mustChangePassword = false;
      user.updatedAt = new Date();
      this.users.set(userId, user);
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Student Profiles
  // -------------------------------------------------------------
  getStudentProfileByUserId(userId: string): StudentProfileRecord | undefined {
    for (const profile of this.studentProfiles.values()) {
      if (profile.userId === userId) return profile;
    }
    return undefined;
  }

  getStudentProfileById(id: string): StudentProfileRecord | undefined {
    return this.studentProfiles.get(id);
  }

  getAllStudentProfiles(): StudentProfileRecord[] {
    return Array.from(this.studentProfiles.values());
  }

  getStudentsByMentorId(mentorId: string): StudentProfileRecord[] {
    return Array.from(this.studentProfiles.values()).filter(
      (p) => p.mentorId === mentorId
    );
  }

  getStudentProfilesByMentorId(mentorId: string): StudentProfileRecord[] {
    return this.getStudentsByMentorId(mentorId);
  }

  updateStudentRisk(profileId: string, riskStatus: "GREEN" | "YELLOW" | "RED", riskReason: string) {
    const profile = this.studentProfiles.get(profileId);
    if (profile) {
      profile.riskStatus = riskStatus;
      profile.riskReason = riskReason;
      profile.updatedAt = new Date();
      this.studentProfiles.set(profileId, profile);
    }
  }

  // -------------------------------------------------------------
  // Triage Cases
  // -------------------------------------------------------------
  getTriageCasesByMentor(mentorId: string, unresolvedOnly = true): TriageCaseRecord[] {
    return Array.from(this.triageCases.values())
      .filter((t) => t.mentorId === mentorId && (!unresolvedOnly || !t.isResolved))
      .sort((a, b) => a.priorityTier - b.priorityTier);
  }

  getAllTriageCases(): TriageCaseRecord[] {
    return Array.from(this.triageCases.values());
  }

  getTriageCasesForStudent(studentProfileId: string): TriageCaseRecord[] {
    return Array.from(this.triageCases.values()).filter(
      (t) => t.studentProfileId === studentProfileId
    );
  }

  resolveTriageCase(caseId: string, interventionNotes: string) {
    const item = this.triageCases.get(caseId);
    if (item) {
      item.isResolved = true;
      item.resolvedAt = new Date();
      item.interventionNotes = interventionNotes;
      this.triageCases.set(caseId, item);
      return item;
    }
    return null;
  }

  addTriageCase(item: TriageCaseRecord) {
    this.triageCases.set(item.id, item);
  }

  // -------------------------------------------------------------
  // Schedule Items
  // -------------------------------------------------------------
  getScheduleItemsForStudent(studentProfileId: string): ScheduleItemRecord[] {
    return Array.from(this.scheduleItems.values());
  }

  updateScheduleItemStatus(
    itemId: string,
    status: "NOT_DONE" | "PARTIAL" | "DONE"
  ): ScheduleItemRecord | null {
    const item = this.scheduleItems.get(itemId);
    if (item) {
      item.status = status;
      this.scheduleItems.set(itemId, item);
      return item;
    }
    return null;
  }

  setScheduleItemsForStudent(studentProfileId: string, items: ScheduleItemRecord[]) {
    items.forEach((it) => this.scheduleItems.set(it.id, it));
  }

  // -------------------------------------------------------------
  // Daily Checkins
  // -------------------------------------------------------------
  recordCheckin(checkin: DailyCheckinRecord) {
    this.dailyCheckins.set(checkin.id, checkin);
  }

  getCheckinsForStudent(studentProfileId: string): DailyCheckinRecord[] {
    return Array.from(this.dailyCheckins.values()).filter(
      (c) => c.studentProfileId === studentProfileId
    );
  }

  // -------------------------------------------------------------
  // Mock Exams
  // -------------------------------------------------------------
  getMockExamsForStudent(studentProfileId: string): MockExamRecord[] {
    return Array.from(this.mockExams.values()).filter(
      (m) => m.studentProfileId === studentProfileId
    );
  }

  addMockExam(exam: MockExamRecord) {
    this.mockExams.set(exam.id, exam);
  }

  // -------------------------------------------------------------
  // Coaching Missions
  // -------------------------------------------------------------
  getCoachingMissions(): CoachingMissionRecord[] {
    return Array.from(this.coachingMissions.values());
  }

  // -------------------------------------------------------------
  // Whitelist Management (Excel Import & Verification)
  // -------------------------------------------------------------
  getWhitelist(): StudentWhitelistRecord[] {
    return Array.from(this.studentWhitelist.values());
  }

  getAllWhitelist(): StudentWhitelistRecord[] {
    return this.getWhitelist();
  }

  isPhoneOrNationalIdWhitelisted(phone: string, nationalId?: string): StudentWhitelistRecord | undefined {
    const normPhone = phone.trim();
    for (const record of this.studentWhitelist.values()) {
      if (record.phoneNumber === normPhone) return record;
      if (nationalId && record.nationalId === nationalId.trim()) return record;
    }
    return undefined;
  }

  addWhitelistRecord(record: StudentWhitelistRecord) {
    this.studentWhitelist.set(record.id, record);
  }

  markWhitelistRegistered(phoneNumber: string) {
    const normPhone = phoneNumber.trim();
    for (const record of this.studentWhitelist.values()) {
      if (record.phoneNumber === normPhone) {
        record.status = "REGISTERED";
        record.registeredAt = new Date();
        this.studentWhitelist.set(record.id, record);
      }
    }
  }

  // -------------------------------------------------------------
  // SMS Settings & Logs
  // -------------------------------------------------------------
  getSmsSettings(): SmsSettingsRecord {
    return this.smsSettings;
  }

  updateSmsSettings(settings: Partial<SmsSettingsRecord>) {
    this.smsSettings = {
      ...this.smsSettings,
      ...settings,
      updatedAt: new Date(),
    };
  }

  addSmsLog(log: SmsLogRecord) {
    this.smsLogs.unshift(log); // Prepend for recency
  }

  getSmsLogs(limit = 50): SmsLogRecord[] {
    return this.smsLogs.slice(0, limit);
  }

  // -------------------------------------------------------------
  // Hierarchical Tasks
  // -------------------------------------------------------------
  getTasksForUser(userId: string, role: string): HierarchyTaskRecord[] {
    return Array.from(this.hierarchyTasks.values()).filter(
      (t) => t.receiverId === userId || t.senderId === userId || role === "CEO"
    );
  }

  getTasksForReceiver(receiverId: string): HierarchyTaskRecord[] {
    return Array.from(this.hierarchyTasks.values()).filter(
      (t) => t.receiverId === receiverId
    );
  }

  getAllTasks(): HierarchyTaskRecord[] {
    return Array.from(this.hierarchyTasks.values());
  }

  addTask(task: HierarchyTaskRecord) {
    this.hierarchyTasks.set(task.id, task);
  }

  updateTaskStatus(taskId: string, status: HierarchyTaskRecord["status"], resolutionNotes?: string) {
    const task = this.hierarchyTasks.get(taskId);
    if (task) {
      task.status = status;
      if (resolutionNotes) task.resolutionNotes = resolutionNotes;
      task.updatedAt = new Date();
      this.hierarchyTasks.set(taskId, task);
      return task;
    }
    return null;
  }

  // -------------------------------------------------------------
  // Direct Messages & Attachments
  // -------------------------------------------------------------
  getMessagesBetween(userA: string, userB: string): DirectMessageRecord[] {
    const thread1 = `${userA}_${userB}`;
    const thread2 = `${userB}_${userA}`;
    return Array.from(this.directMessages.values())
      .filter((m) => m.threadId === thread1 || m.threadId === thread2)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getMessagesForUser(userId: string): DirectMessageRecord[] {
    return Array.from(this.directMessages.values())
      .filter((m) => m.senderId === userId || m.receiverId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getAllMessages(): DirectMessageRecord[] {
    return Array.from(this.directMessages.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  addMessage(message: DirectMessageRecord) {
    this.directMessages.set(message.id, message);
  }

  // -------------------------------------------------------------
  // Escalation Tickets (Student -> Supervisor)
  // -------------------------------------------------------------
  createTicket(ticket: EscalationTicketRecord) {
    this.escalationTickets.set(ticket.id, ticket);
  }

  getTicketsForSupervisor(supervisorId: string): EscalationTicketRecord[] {
    return Array.from(this.escalationTickets.values()).filter(
      (t) => t.supervisorId === supervisorId || supervisorId === "usr_adminsupervisor"
    );
  }

  getTicketsForStudent(studentId: string): EscalationTicketRecord[] {
    return Array.from(this.escalationTickets.values()).filter(
      (t) => t.studentId === studentId
    );
  }

  resolveTicket(ticketId: string, supervisorResponse: string) {
    const ticket = this.escalationTickets.get(ticketId);
    if (ticket) {
      ticket.status = "RESOLVED";
      ticket.supervisorResponse = supervisorResponse;
      ticket.resolvedAt = new Date();
      this.escalationTickets.set(ticketId, ticket);
      return ticket;
    }
    return null;
  }

  // -------------------------------------------------------------
  // Weekly Plan Templates
  // -------------------------------------------------------------
  getWeeklyPlanTemplates(): WeeklyPlanTemplateRecord[] {
    return Array.from(this.weeklyPlanTemplates.values());
  }

  getAllWeeklyPlanTemplates(): WeeklyPlanTemplateRecord[] {
    return this.getWeeklyPlanTemplates();
  }

  addWeeklyPlanTemplate(tpl: WeeklyPlanTemplateRecord) {
    this.weeklyPlanTemplates.set(tpl.id, tpl);
  }

  getWeeklyPlanTemplateById(id: string): WeeklyPlanTemplateRecord | undefined {
    return this.weeklyPlanTemplates.get(id);
  }

  // -------------------------------------------------------------
  // Evaluation Exams & Submissions
  // -------------------------------------------------------------
  getEvaluationExams(): EvaluationExamRecord[] {
    return Array.from(this.evaluationExams.values());
  }

  getAllEvaluationExams(): EvaluationExamRecord[] {
    return this.getEvaluationExams();
  }

  addEvaluationExam(exam: EvaluationExamRecord) {
    this.evaluationExams.set(exam.id, exam);
  }

  getExamById(id: string): EvaluationExamRecord | undefined {
    return this.evaluationExams.get(id);
  }

  addExamSubmission(submission: ExamSubmissionRecord) {
    this.examSubmissions.set(submission.id, submission);
  }

  getExamSubmissionsForStudent(studentProfileId: string): ExamSubmissionRecord[] {
    return Array.from(this.examSubmissions.values())
      .filter((s) => s.studentProfileId === studentProfileId)
      .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  getAllExamSubmissions(): ExamSubmissionRecord[] {
    return Array.from(this.examSubmissions.values());
  }

  addExamQuestion(question: ExamQuestionRecord): boolean {
    const exam = this.evaluationExams.get(question.examId);
    if (exam) {
      if (!exam.questions) exam.questions = [];
      exam.questions.push(question);
      exam.totalQuestions = exam.questions.length;
      this.evaluationExams.set(exam.id, exam);
      return true;
    }
    return false;
  }

  deleteExamQuestion(examId: string, questionId: string): boolean {
    const exam = this.evaluationExams.get(examId);
    if (exam && exam.questions) {
      exam.questions = exam.questions.filter((q) => q.id !== questionId);
      exam.totalQuestions = exam.questions.length;
      this.evaluationExams.set(exam.id, exam);
      return true;
    }
    return false;
  }

  getExamQuestions(examId: string): ExamQuestionRecord[] {
    const exam = this.evaluationExams.get(examId);
    return exam?.questions || [];
  }

  updateExamAudience(examId: string, assignedStudentIds: string[]): boolean {
    const exam = this.evaluationExams.get(examId);
    if (exam) {
      exam.assignedStudentIds = assignedStudentIds;
      this.evaluationExams.set(exam.id, exam);
      return true;
    }
    return false;
  }

  // -------------------------------------------------------------
  // Landing Page Content Management (CMS)
  // -------------------------------------------------------------
  getLandingContent(): LandingContentSettings {
    return this.landingContent;
  }

  updateLandingContent(content: Partial<LandingContentSettings>): LandingContentSettings {
    this.landingContent = {
      ...this.landingContent,
      ...content,
    };
    return this.landingContent;
  }

  addLandingGalleryImage(img: LandingGalleryImage) {
    this.landingContent.gallery.push(img);
  }

  deleteLandingGalleryImage(id: string): boolean {
    this.landingContent.gallery = this.landingContent.gallery.filter((g) => g.id !== id);
    return true;
  }

  addLandingFeature(feature: LandingFeatureItem) {
    this.landingContent.features.push(feature);
  }

  deleteLandingFeature(id: string): boolean {
    this.landingContent.features = this.landingContent.features.filter((f) => f.id !== id);
    return true;
  }

  addLandingHonor(honor: LandingHonorsItem) {
    this.landingContent.honors.push(honor);
  }

  deleteLandingHonor(id: string): boolean {
    this.landingContent.honors = this.landingContent.honors.filter((h) => h.id !== id);
    return true;
  }

  // -------------------------------------------------------------
  // VoIP Asterisk Issabel AMI
  // -------------------------------------------------------------
  getVoipSettings(): VoipAmiSettings {
    return this.voipSettings;
  }

  updateVoipSettings(settings: Partial<VoipAmiSettings>): VoipAmiSettings {
    this.voipSettings = {
      ...this.voipSettings,
      ...settings,
      updatedAt: new Date(),
    };
    return this.voipSettings;
  }

  getAllVoipCalls(): VoipCallRecord[] {
    return Array.from(this.voipCalls.values()).sort(
      (a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime()
    );
  }

  getVoipCallsForMentor(mentorId: string): VoipCallRecord[] {
    return Array.from(this.voipCalls.values())
      .filter((c) => c.mentorId === mentorId)
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime());
  }

  addVoipCall(call: VoipCallRecord) {
    this.voipCalls.set(call.id, call);
  }

  // -------------------------------------------------------------
  // Advanced Messaging (Direct, Channels, and Groups)
  // -------------------------------------------------------------
  getAllChatConversations(): ChatConversationRecord[] {
    return Array.from(this.chatConversations.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  getConversationsForUser(userId: string, role?: string): ChatConversationRecord[] {
    // Manager/CEO has omniscient visibility across all channels, groups, and conversations
    if (role === "CEO" || role === "ADMIN") {
      return this.getAllChatConversations();
    }
    return Array.from(this.chatConversations.values())
      .filter((c) => c.type === "CHANNEL" || c.memberIds.includes(userId))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getConversationById(id: string): ChatConversationRecord | undefined {
    return this.chatConversations.get(id);
  }

  createChatConversation(conv: ChatConversationRecord) {
    this.chatConversations.set(conv.id, conv);
  }

  getChatMessages(conversationId: string): ChatMessageRecord[] {
    return Array.from(this.chatMessages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  getAllChatMessages(): ChatMessageRecord[] {
    return Array.from(this.chatMessages.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
  }

  addChatMessage(msg: ChatMessageRecord) {
    this.chatMessages.set(msg.id, msg);
    const conv = this.chatConversations.get(msg.conversationId);
    if (conv) {
      conv.updatedAt = new Date();
      this.chatConversations.set(conv.id, conv);
    }
  }

  // -------------------------------------------------------------
  // Video Conferencing Platform
  // -------------------------------------------------------------
  getVideoSettings(): VideoConferenceSettings {
    return this.videoSettings;
  }

  updateVideoSettings(settings: Partial<VideoConferenceSettings>): VideoConferenceSettings {
    this.videoSettings = {
      ...this.videoSettings,
      ...settings,
    };
    return this.videoSettings;
  }

  getAllVideoSessions(): VideoSessionRecord[] {
    return Array.from(this.videoSessions.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  getVideoSessionsForUser(userId: string, role?: string): VideoSessionRecord[] {
    if (role === "CEO" || role === "ADMIN") {
      return this.getAllVideoSessions();
    }
    return Array.from(this.videoSessions.values())
      .filter((s) => !s.allowedRoles.length || (role && s.allowedRoles.includes(role as UserRole)) || s.participantIds.includes(userId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  addVideoSession(session: VideoSessionRecord) {
    this.videoSessions.set(session.id, session);
  }
}

// Global singleton for server-side persistence across actions in Node runtime
const globalForMemory = globalThis as unknown as { memoryRepo?: MemoryRepository };
if (!globalForMemory.memoryRepo || typeof (globalForMemory.memoryRepo as unknown as { getAllWeeklyPlanTemplates?: unknown }).getAllWeeklyPlanTemplates !== "function") {
  globalForMemory.memoryRepo = new MemoryRepository();
} else {
  // Ensure prototype methods are up to date on hot reload
  Object.setPrototypeOf(globalForMemory.memoryRepo, MemoryRepository.prototype);
}

export const memoryRepo: MemoryRepository = globalForMemory.memoryRepo;

