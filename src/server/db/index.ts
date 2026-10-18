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
          title: "ورود به پنل کاربری",
          description: "ارسال پیامک خوش‌آمد و هشدار امنیتی هنگام ورود به پرتال",
          isEnabled: true, // Default enabled as requested
          templateMessage: "داوطلب گرامی {name}، ورود شما به سامانه پشتیبانی مشاهیر دانش در تاریخ {date} ثبت شد.",
        },
        MENTOR_CONTACT: {
          event: "MENTOR_CONTACT",
          title: "تماس یا مداخله پشتیبان",
          description: "اطلاع‌رسانی به داوطلب پس از ثبت گزارش جلسه یا تماس تلفنی",
          isEnabled: true,
          templateMessage: "پشتیبان شما {mentorName} گزارش جلسه آموزشی را ثبت نمود. جهت مشاهده به پنل مراجعه فرمایید.",
        },
        TRIAGE_RESOLVED: {
          event: "TRIAGE_RESOLVED",
          title: "حل موانع و پایش آموزشی",
          description: "اعلان رفع پرونده بحرانی داوطلب و توصیه‌های راهبردی",
          isEnabled: true,
          templateMessage: "پرونده پشتیبانی شما با موفقیت بررسی و مختومه شد. توصیه آموزشی در داشبورد ثبت گردید.",
        },
        WEEKLY_PLAN_ASSIGNED: {
          event: "WEEKLY_PLAN_ASSIGNED",
          title: "تخصیص برنامه هفتگی جدید",
          description: "اطلاع‌رسانی بارگذاری برنامه مطالعاتی شنبه تا جمعه",
          isEnabled: true,
          templateMessage: "برنامه مطالعاتی هفته جدید شما در سامانه پشتیبانی مشاهیر دانش قرار گرفت.",
        },
        TASK_ASSIGNED: {
          event: "TASK_ASSIGNED",
          title: "انتساب وظیفه اداری/پشتیبانی",
          description: "ارسال پیامک به پشتیبان یا سرپرست پس از انتساب وظیفه جدید",
          isEnabled: true,
          templateMessage: "وظیفه جدید با اولویت {priority} از طرف {sender} برای شما ارجاع گردید. پشتیبانی مشاهیر دانش",
        },
        EXAM_PUBLISHED: {
          event: "EXAM_PUBLISHED",
          title: "انتشار آزمون ارزیابی جدید",
          description: "اعلان شروع بازه زمانی شرکت در آزمون زمان‌دار",
          isEnabled: true,
          templateMessage: "آزمون ارزیابی جدید ({examTitle}) در سامانه پشتیبانی مشاهیر دانش فعال شد. مهلت شرکت تا {endTime} می‌باشد.",
        },
        MESSAGE_RECEIVED: {
          event: "MESSAGE_RECEIVED",
          title: "دریافت پیام مستقیم جدید",
          description: "اطلاع‌رسانی پیام جدید پشتیبان به داوطلب یا بالعکس",
          isEnabled: true,
          templateMessage: "پیام جدیدی از طرف {sender} در سامانه پشتیبانی مشاهیر دانش دریافت کردید.",
        },
        WHITELIST_INVITE: {
          event: "WHITELIST_INVITE",
          title: "دعوت به تکمیل ثبت‌نام (اکسل)",
          description: "ارسال پیامک تایید صلاحیت و لینک تکمیل پروفایل داوطلب",
          isEnabled: true,
          templateMessage: "{name} عزیز، صلاحیت شما برای شرکت در دوره وکالت تایید شد. سامانه پشتیبانی مشاهیر دانش: {link}",
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
      channelTech: process.env.ASTERISK_CHANNEL_TECH || "SIP",
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
      platformName: "سامانه اختصاصی وبینار و کلاس مجازی مشاهیر دانش",
      serverUrl: process.env.VIDEO_SERVER_URL || "https://room.mashahir.ac.ir",
      apiKey: process.env.VIDEO_API_KEY || "YOUR_VIDEO_API_KEY_PLACEHOLDER",
      isEnabled: true,
    };

    // Landing Page Content Management (CMS) Defaults
    this.landingContent = {
      heroTagline: "پلتفرم جامع ۳۶۰ درجه هدایت تحصیلی و حل موانع علمی آزمون وکالت",
      heroTitle: "پشتیبانی مشاهیر دانش",
      heroDescription: "سامانه اختصاصی هدایت تحصیلی، پایش موانع آموزشی و مربیگری بیش از ۲۰۰,۰۰۰ داوطلب آزمون وکالت کانون وکلای دادگستری و مرکز وکلای قوه قضائیه.",
      towerTitle: "بر فراز برج میلاد، جشن پیروزی مشاهیری‌ها",
      towerSubtitle: "میعادگاه سالانه پذیرفته‌شدگان و رتبه‌های برتر آزمون وکالت در بلندترین قله پایتخت",
      galaTitle: "شکوه تالار همایش‌های بین‌المللی برج میلاد؛ تجلیل از ستارگان وکالت",
      galaSubtitle: "حضور بیش از ۱,۶۰۰ وکیل، استاد برجسته و مشاور رتبه‌ساز در بزرگترین رویداد حقوقی ایران",
      featuresTitle: "چرا پشتیبانی مشاهیر دانش متفاوت است؟",
      featuresDescription: "ترکیب دانش عمیق حقوقی اساتید تراز اول با الگوریتم‌های هوشمند پایش بحران‌های مطالعاتی و رفع موانع علمی تا کسب رتبه قبولی در کانون وکلا.",
      features: [
        {
          id: "feat_1",
          title: "پایش بحران‌های آموزشی (سطوح P1 تا P6)",
          description: "شناسایی سریع افت ساعت مطالعه، افت تراز آزمون و بحران‌های تمرکز و مداخله هدایت‌گرانه پشتیبان در کمتر از ۲۴ ساعت.",
          iconName: "ShieldAlert",
        },
        {
          id: "feat_2",
          title: "موتور برنامه‌ریزی هفتگی شنبه تا جمعه",
          description: "تمپلیت‌های هفتگی جامع سرپرستان با قابلیت شخصی‌سازی دقیق توسط پشتیبان علمی متناسب با شرایط شغلی و زمانی هر داوطلب.",
          iconName: "CalendarCheck",
        },
        {
          id: "feat_3",
          title: "گانت‌چارت تحلیلی ۵ سطحی پیشرفت",
          description: "پایش لحظه‌ای تداوم مطالعه در ۵ نمای امروز، ۳ روز، هفته، ماه و کل دوره همراه با مقایسه تطبیقی آماری.",
          iconName: "BarChart3",
        },
        {
          id: "feat_4",
          title: "سیستم امن تماس و پیام‌رسانی علمی",
          description: "مکالمه تلفنی امن از طریق سانترال ایزابل بدون نمایش شماره تلفن داوطلب و پیام‌رسان مستقیم با پشتیبانی فایل‌های پیوست.",
          iconName: "Headphones",
        },
      ],
      honorsTitle: "ثمره همراهی مشاهیر؛ تندیس‌های زرین بر فراز برج میلاد",
      honorsDescription: "جشن سالانه مشاهیر دانش در مرکز همایش‌های بین‌المللی برج میلاد با حضور رتبه‌های برتر، مدیران عالی‌رتبه قضایی و خانواده‌های محترم داوطلبان.",
      honors: [
        {
          id: "hn_1",
          rankTitle: "رتبه ۱ کانون وکلای مرکز",
          candidateName: "پذیرفته‌شده آزمون وکالت ۱۴۰۳",
          quote: "برنامه راهبردی مشاهیر و تماس‌های هفتگی پشتیبانم اجازه نداد حتی یک روز از مسیر خارج شوم. حضور بر روی استیج برج میلاد لحظه‌ای فراموش‌نشدنی بود.",
          finalScore: "معدل نهایی: ۱۹.۴۰",
          cohortName: "کوهورت طلایی",
        },
        {
          id: "hn_2",
          rankTitle: "رتبه ۳ کانون وکلای خراسان",
          candidateName: "پذیرفته‌شده آزمون وکالت ۱۴۰۳",
          quote: "سیستم پایش موانع آموزشی در ماه پایانی افت تراز آزمون حقوق مدنی من را ظرف ۴۸ ساعت با کارگاه جبرانی برطرف کرد و تراز کل به بالای ۱۱,۰۰۰ رسید.",
          finalScore: "درصد جزا و مدنی: ۹۲٪",
          cohortName: "کوهورت هدایت ۳۶۰",
        },
        {
          id: "hn_3",
          rankTitle: "رتبه ۷ کانون وکلای فارس",
          candidateName: "پذیرفته‌شده آزمون وکالت ۱۴۰۲",
          quote: "ثبت چک‌این‌های زیر ۶۰ ثانیه به من انگیزه و نظم آهنین داد. وقتی نامم در تالار همایش‌های برج میلاد خوانده شد، تمام زحمات به ثمر نشست.",
          finalScore: "درصد آیین دادرسی: ۹۵٪",
          cohortName: "کوهورت نخبگان",
        },
      ],
      stats: {
        studentsCount: "۲۰۰,۰۰۰+",
        ranksCount: "۱,۴۵۰+",
        checkinSpeed: "< ۶۰ ثانیه",
        adherenceRate: "۹۴.۸٪",
      },
      gallery: [
        {
          id: "gal_1",
          title: "سن اصلی و جایگاه اهدای تندیس",
          imageUrl: "/images/landing/milad-gala.webp",
          caption: "تجلیل از رتبه‌های برتر آزمون وکالت کانون وکلا در مرکز همایش‌های برج میلاد",
          orderIndex: 1,
        },
        {
          id: "gal_2",
          title: "نمای باشکوه برج میلاد تهران",
          imageUrl: "/images/landing/milad-cutout.png",
          caption: "میعادگاه پیروزی داوطلبان سخت‌کوش موسسه مشاهیر دانش",
          orderIndex: 2,
        },
      ],
      ctaTitle: "صندلی افتخار شما در جشن برج میلاد منتظر شماست",
      ctaDescription: "با همراهی تیمی از زبده‌ترین رتبه‌های برتر، سرپرستان آموزشی و اساتید دکترین حقوق، موفقیت خود را به قطعیت تبدیل کنید.",
      footerRights: "تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است",
    };

    this.seed();
  }

  public seed() {
    initialUsers.forEach((u) => {
      this.users.set(u.id, {
        ...u,
        nationalId: "00" + Math.floor(10000000 + Math.random() * 90000000),
        passwordHash: u.passwordHash || "123456",
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
        fullName: "آرمین رستمی",
        nationalId: "0012345678",
        phoneNumber: "09121000005",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_2",
        fullName: "فاطمه ابراهیمی",
        nationalId: "0023456789",
        phoneNumber: "09121000006",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_3",
        fullName: "سینا محمدی",
        nationalId: "0034567890",
        phoneNumber: "09121000007",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_4",
        fullName: "نیلوفر راد",
        nationalId: "0045678901",
        phoneNumber: "09121000008",
        assignedMentorId: "usr_mentor2",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_5",
        fullName: "نیما صادقی",
        nationalId: "0056789012",
        phoneNumber: "09121000009",
        assignedMentorId: "usr_mentor1",
        status: "REGISTERED",
        registeredAt: new Date("2024-06-01"),
        createdAt: new Date("2024-05-15"),
      },
      {
        id: "wl_6",
        fullName: "مهدی کریمی (داوطلب دعوت‌شده)",
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
        senderName: "مدیریت ارشد (Admin)",
        receiverId: "usr_adminsupervisor",
        receiverRole: "SUPERVISOR",
        receiverName: "سرپرست ارشد کوهورت (adminsupervisor)",
        title: "پایش نرخ پاسخگویی به بحران‌های Tier 1 کوهورت کانون مرکز",
        description: "گزارش وضعیت ۴ روز سکوت داوطلب فاطمه ابراهیمی و اقدامات مداخله‌ای انجام شده تا پایان ساعت اداری بررسی شود.",
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
        senderName: "سرپرست ارشد کوهورت (adminsupervisor)",
        receiverId: "usr_mentor1",
        receiverRole: "MENTOR",
        receiverName: "استاد علی کاظمی (پشتیبان ارشد)",
        title: "بررسی حضوری/تلفنی علت افت تراز آزمون سینا محمدی (هشدار A06)",
        description: "بررسی دلایل درصد پایین آیین دادرسی مدنی و تنظیم برنامه جبرانی ۳۰ دقیقه‌ای در روزهای زوج.",
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
        senderName: "سرپرست ارشد کوهورت (adminsupervisor)",
        receiverId: "usr_mentor2",
        receiverRole: "MENTOR",
        receiverName: "استاد مریم حسینی (پشتیبان)",
        title: "تخصیص تمپلیت برنامه مطالعاتی هفته ۳۱ برای داوطلبان شاغل",
        description: "شخصی‌سازی سقف مطالعه روزانه به ۵ ساعت کاری و ۱۰ ساعت روزهای تعطیل.",
        priority: "MEDIUM",
        status: "COMPLETED",
        dueDate: "1403-07-30",
        resolutionNotes: "تمپلیت برای تمام ۱۰ داوطلب شاغل شخصی‌سازی و اعمال گردید.",
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
        senderName: "استاد علی کاظمی",
        senderRole: "MENTOR",
        receiverId: "usr_student_1",
        receiverName: "آرمین رستمی",
        receiverRole: "STUDENT",
        message: "سلام آرمین جان، گزارش دیروز رو بررسی کردم. پارت حقوق مدنی ۳ نیاز به تمرکز بیشتری داره. خلاصه نموداری عقود رو برات می‌فرستم.",
        attachmentUrl: "/sample-docs/civil-law-summary.pdf",
        attachmentName: "خلاصه_نموداری_عقود_معین_مدنی۳.pdf",
        attachmentSize: 1845000,
        attachmentType: "application/pdf",
        isRead: true,
        createdAt: new Date(Date.now() - 3600000 * 4),
      },
      {
        id: "msg_2",
        threadId: "usr_student_1_usr_mentor1",
        senderId: "usr_student_1",
        senderName: "آرمین رستمی",
        senderRole: "STUDENT",
        receiverId: "usr_mentor1",
        receiverName: "استاد علی کاظمی",
        receiverRole: "MENTOR",
        message: "سلام استاد کاظمی عزیز، ممنونم. فایل رو دریافت کردم. تست‌های آزمون جامع جمعه گذشته رو هم تحلیل کردم و براتون پیوست فرستادم.",
        attachmentUrl: "/sample-docs/my-exam-notes.jpg",
        attachmentName: "تحلیل_کارنامه_آزمون۴_مشاهیر.jpg",
        attachmentSize: 2450000,
        attachmentType: "image/jpeg",
        isRead: false,
        createdAt: new Date(Date.now() - 1800000),
      },
      {
        id: "msg_3",
        threadId: "usr_mentor1_usr_adminsupervisor",
        senderId: "usr_adminsupervisor",
        senderName: "سرپرست ارشد (adminsupervisor)",
        senderRole: "SUPERVISOR",
        receiverId: "usr_mentor1",
        receiverName: "استاد علی کاظمی",
        receiverRole: "MENTOR",
        message: "استاد کاظمی، لطفاً وضعیت داوطلبان بحرانی Tier 1 کوهورت را تا ساعت ۱۴ گزارش بفرمایید.",
        isRead: true,
        createdAt: new Date(Date.now() - 7200000),
      },
    ];
    messageSeed.forEach((m) => this.directMessages.set(m.id, m));

    // Seed Escalation Ticket
    this.escalationTickets.set("ticket_1", {
      id: "ticket_1",
      studentId: "usr_student_2",
      studentName: "فاطمه ابراهیمی",
      studentPhone: "09121000006",
      mentorId: "usr_mentor1",
      mentorName: "استاد علی کاظمی",
      supervisorId: "usr_adminsupervisor",
      subject: "درخواست تغییر زمان‌بندی جلسات به شیفت عصر",
      reasonCategory: "PLAN_CONFLICT",
      description: "به دلیل تغییر ساعات شیفت کاری، امکان پاسخگویی به تماس‌های صبحگاهی پشتیبان وجود ندارد.",
      status: "OPEN",
      createdAt: new Date(),
    });

    // Seed Weekly Plan Template
    this.weeklyPlanTemplates.set("tpl_week30", {
      id: "tpl_week30",
      authorId: "usr_adminsupervisor",
      authorName: "سرپرست ارشد کوهورت (adminsupervisor)",
      title: "تمپلیت جامع راهبردی هفته ۳۰ - آزمون وکالت کانون و مرکز",
      jalaliYear: 1403,
      jalaliWeekNumber: 30,
      targetCohort: "داوطلبان تمام‌وقت و آزاد",
      weeklyMainGoal: "تثبیت عقود معین مدنی و صلاحیت‌های محلی آیین دادرسی مدنی",
      items: [
        {
          dayOfWeek: 0,
          subject: "حقوق مدنی",
          activityType: "STUDY",
          topicDescription: "عقود معین: اجاره، ودیعه و عاریه (مواد ۴۶۶ الی ۶۴۰)",
          targetVolume: "۳۵ صفحه + ۲۵ تست",
          targetDurationMinutes: 120,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 0,
          subject: "حقوق تجارت",
          activityType: "STATUTE_READ",
          topicDescription: "اسناد تجاری: برات و ظهرنویسی (مواد ۲۲۳ الی ۲۵۱)",
          targetVolume: "۲۰ ماده + تست سنوات",
          targetDurationMinutes: 90,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 1,
          subject: "آیین دادرسی مدنی",
          activityType: "STUDY",
          topicDescription: "صلاحیت مراجع دادگستری و شوراهای حل اختلاف",
          targetVolume: "۳۰ صفحه",
          targetDurationMinutes: 100,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 2,
          subject: "حقوق جزا",
          activityType: "TEST_PRACTICE",
          topicDescription: "مجازات‌های تکمیلی و تبعی و تخفیف مجازات",
          targetVolume: "۴۰ تست تحلیلی",
          targetDurationMinutes: 90,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 3,
          subject: "متون فقه",
          activityType: "STUDY",
          topicDescription: "کتاب القضاء و الشهادات لمعه دمشقیه",
          targetVolume: "۱۵ صفحه عربی اعراب‌گذاری شده",
          targetDurationMinutes: 75,
          isCatchup: false,
          status: "NOT_DONE",
        },
        {
          dayOfWeek: 5,
          subject: "مباحث جبرانی",
          activityType: "REVIEW",
          topicDescription: "مرور فلش‌کارت‌های آیین دادرسی کیفری و تست‌های غلط آزمون گذشته",
          targetVolume: "رفع اشکال پارت‌های عقب‌افتاده",
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
      creatorName: "دکتر مریم رضایی (سرپرست آموزشی)",
      title: "آزمون ارزیابی تشخیصی دروس اختصاصی (مدنی، تجارت و آیین دادرسی)",
      description: "سنجش تراز و آمادگی داوطلبان برای مباحث نیم‌سال اول آزمون وکالت دادگستری.",
      startTime: "1403-07-25 08:00",
      endTime: "1403-08-25 22:00", // Open now
      durationMinutes: 90,
      totalQuestions: 4,
      subjectsWeight: {
        "حقوق مدنی": 40,
        "حقوق تجارت": 30,
        "آیین دادرسی مدنی": 30,
      },
      isPublished: true,
      targetCohort: "تمامی داوطلبان تحت سرپرستی",
      assignedStudentIds: ["ALL"],
      questions: [
        {
          id: "q_1_1",
          examId: "exam_eval_1",
          type: "MULTIPLE_CHOICE",
          subject: "حقوق مدنی",
          questionText: "اگر در عقد بیع، مبیع عین معین باشد و قبل از تسلیم بدون تعدی و تفریط بایع تلف شود، اثر حقوقی آن چیست؟",
          options: [
            "عقد منفسخ می‌شود و ثمن باید به خریدار مسترد گردد.",
            "عقد باطل است و بایع ضامن پرداخت مثل یا قیمت است.",
            "خریدار حق فسخ معامله را به استناد خیار تعذر تسلیم دارد.",
            "عقد صحیح است و تلف مبیع بر عهده خریدار است."
          ],
          correctOptionIndex: 0,
          modelAnswer: "مطابق ماده ۳۸۷ قانون مدنی، اگر مبیع پیش از تسلیم بدون تعدی و تفریط بایع تلف شود، بیع منفسخ و ثمن مسترد می‌گردد.",
          points: 1,
          orderIndex: 1,
        },
        {
          id: "q_1_2",
          examId: "exam_eval_1",
          type: "MULTIPLE_CHOICE",
          subject: "حقوق تجارت",
          questionText: "در لایحه قانونی اصلاح قسمتی از قانون تجارت، حداقل تعداد مدیران و حداقل تعداد سهامداران در شرکت سهامی خاص به ترتیب چند نفر است؟",
          options: [
            "۳ نفر مدیر - ۳ نفر سهامدار",
            "۲ نفر مدیر - ۳ نفر سهامدار",
            "۳ نفر مدیر - ۵ نفر سهامدار",
            "۲ نفر مدیر - ۲ نفر سهامدار"
          ],
          correctOptionIndex: 1,
          modelAnswer: "مطابق ماده ۱۰۷ لایحه اصلاحی، حداقل هیئت مدیره در سهامی خاص ۲ نفر و حداقل سهامداران مطابق ماده ۳، ۳ نفر است.",
          points: 1,
          orderIndex: 2,
        },
        {
          id: "q_1_3",
          examId: "exam_eval_1",
          type: "TRUE_FALSE",
          subject: "آیین دادرسی مدنی",
          questionText: "ایراد عدم صلاحیت محلی دادگاه، باید تا پایان اولین جلسه دادرسی به عمل آید، مگر آنکه سبب ایراد بعداً حادث شود.",
          options: ["صحیح", "غلط"],
          correctOptionIndex: 0,
          modelAnswer: "مطابق ماده ۸۷ قانون آیین دادرسی دادگاه‌های عمومی و انقلاب در امور مدنی، ایراد عدم صلاحیت محلی مقید به مهلت اولین جلسه است.",
          points: 1,
          orderIndex: 3,
        },
        {
          id: "q_1_4",
          examId: "exam_eval_1",
          type: "DESCRIPTIVE",
          subject: "حقوق مدنی",
          questionText: "تفاوت بنیادی میان «بطلان»، «فسخ» و «انفساخ» قرارداد را با ذکر منشأ و اثر هر یک در دو سطر تشریح فرمایید.",
          modelAnswer: "بطلان فقدان اثر از ابتدا به دلیل عیب رکنی است؛ فسخ انحلال ارادی عقد لازم با خیار قانونی یا قراردادی است؛ و انفساخ انحلال قهری به حکم قانون یا شرط فاسخ است.",
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
      creatorName: "استاد علی کاظمی",
      title: "کوئیز سنجش سرعت تست‌زنی حقوق جزا و آیین دادرسی کیفری",
      description: "ارزیابی دقت پاسخ‌دهی به تله‌های گزینه‌ای قانون مجازات اسلامی.",
      startTime: "1403-08-08 14:00",
      endTime: "1403-08-30 20:00",
      durationMinutes: 45,
      totalQuestions: 2,
      subjectsWeight: {
        "حقوق جزا عمومی و اختصاصی": 50,
        "آیین دادرسی کیفری": 50,
      },
      isPublished: true,
      targetCohort: "داوطلبان استاد کاظمی",
      assignedStudentIds: ["ALL"],
      questions: [
        {
          id: "q_2_1",
          examId: "exam_eval_2",
          type: "MULTIPLE_CHOICE",
          subject: "حقوق جزا عمومی و اختصاصی",
          questionText: "کدام یک از مجازات‌های زیر در زمره مجازات‌های تکمیلی مقرر در ماده ۲۳ قانون مجازات اسلامی است؟",
          options: [
            "اقامت اجباری در محل معین",
            "ضبط اموال ناشی از جرم",
            "شلاق تعزیری تا ۷۴ ضربه",
            "حبس تعزیری درجه شش"
          ],
          correctOptionIndex: 0,
          modelAnswer: "مطابق بند (الف) ماده ۲۳ قانون مجازات اسلامی، اقامت اجباری در محل معین یکی از مصادیق مجازات تکمیلی است.",
          points: 1,
          orderIndex: 1,
        },
        {
          id: "q_2_2",
          examId: "exam_eval_2",
          type: "SHORT_ANSWER",
          subject: "آیین دادرسی کیفری",
          questionText: "حداکثر مهلت قانونی بازپرس برای اظهارنظر در خصوص قرار منع تعقیب یا جلب به دادرسی پس از پایان تحقیقات چند روز است؟",
          modelAnswer: "۵ روز کاری",
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
      studentName: "سارا احمدی",
      scorePercent: 78,
      subjectScores: {
        "حقوق مدنی": 82,
        "حقوق تجارت": 74,
        "آیین دادرسی مدنی": 78,
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
      mentorName: "استاد علی کاظمی",
      mentorExtension: "101",
      studentProfileId: "profile_stu_1",
      studentName: "آرمین رستمی",
      maskedPhone: "۰۹۱۲***۰۰۰۵",
      status: "COMPLETED",
      durationSeconds: 432,
      callUniqueId: "asterisk_1729001234.5",
      initiatedAt: new Date(Date.now() - 86400000),
      notes: "مشاوره تلفنی هدایت تحصیلی و حل چالش عقود مدنی - اتصال موفق از طریق Zoiper",
    };
    const call2: VoipCallRecord = {
      id: "call_2",
      mentorId: "usr_mentor1",
      mentorName: "استاد علی کاظمی",
      mentorExtension: "101",
      studentProfileId: "profile_stu_2",
      studentName: "فاطمه ابراهیمی",
      maskedPhone: "۰۹۱۲***۰۰۰۶",
      status: "ANSWERED",
      durationSeconds: 195,
      callUniqueId: "asterisk_1729005432.1",
      initiatedAt: new Date(Date.now() - 3600000 * 3),
      notes: "پیگیری هشدار سکوت ۴ روزه (A08) با خط امن موسسه",
    };
    this.voipCalls.set(call1.id, call1);
    this.voipCalls.set(call2.id, call2);

    // Seed Advanced Chat Channels and Groups
    const channel1: ChatConversationRecord = {
      id: "conv_channel_bar1403",
      type: "CHANNEL",
      title: "کانال اطلاعیه‌های رسمی آزمون وکالت ۱۴۰۳",
      description: "کانال اطلاع‌رسانی سراسری بخشنامه‌های اسکودا، کانون وکلای مرکز و زمان‌بندی آزمون‌های آزمایشی مشاهیر",
      creatorId: "usr_admin",
      creatorRole: "CEO",
      creatorName: "مدیریت ارشد",
      memberIds: ["usr_admin", "usr_adminsupervisor", "usr_mentor1", "usr_mentor2"],
      isChannelReadOnlyForStudents: true,
      createdAt: new Date("2024-07-01"),
      updatedAt: new Date(),
    };
    const group1: ChatConversationRecord = {
      id: "conv_group_civil_law",
      type: "GROUP",
      title: "کوهورت مباحثه و تحلیل پرونده‌های حقوق مدنی",
      description: "گروه تعاملی داوطلبان برتر جهت بررسی تله‌های تستی درس حقوق مدنی ۳ و عقود معین",
      creatorId: "usr_adminsupervisor",
      creatorRole: "SUPERVISOR",
      creatorName: "سرپرست ارشد کوهورت",
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
      senderName: "مدیریت ارشد",
      senderRole: "CEO",
      message: "به اطلاع تمامی داوطلبان گرامی می‌رساند، بودجه‌بندی آزمون جامع شماره ۴ کانون وکلا در بخش آزمون‌های تشخیصی فعال گردید.",
      attachmentUrl: "/sample-docs/exam-schedule-1403.pdf",
      attachmentName: "بودجه_بندی_آزمون_های_جامع_وکالت.pdf",
      attachmentSize: 1240000,
      attachmentType: "application/pdf",
      createdAt: new Date(Date.now() - 3600000 * 24),
    };
    const cMsg2: ChatMessageRecord = {
      id: "cmsg_2",
      conversationId: "conv_group_civil_law",
      senderId: "usr_mentor1",
      senderName: "استاد علی کاظمی",
      senderRole: "MENTOR",
      message: "همکاران و داوطلبان گرامی، مسئله تفاوت اجاره به شرط تملیک و لیزینگ خودرو در آزمون سال قبل به چالش کشیده شده بود. نظرتان را به اشتراک بگذارید.",
      createdAt: new Date(Date.now() - 3600000 * 5),
    };
    this.chatMessages.set(cMsg1.id, cMsg1);
    this.chatMessages.set(cMsg2.id, cMsg2);

    // Seed Video Conference Sessions
    const vSession1: VideoSessionRecord = {
      id: "vsession_1",
      title: "کارگاه جامع تحلیل آرای وحدت رویه حقوق مدنی و آیین دادرسی",
      hostId: "usr_adminsupervisor",
      hostName: "سرپرست ارشد کوهورت",
      hostRole: "SUPERVISOR",
      roomCode: "msh-bar-1403-live",
      sessionType: "COHORT_WEBINAR",
      targetCohort: "تمامی داوطلبان کوهورت",
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
