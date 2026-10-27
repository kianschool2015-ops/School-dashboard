/**
 * Master Type Definitions for Mashahir Danesh 360-Degree Platform
 * Pure TypeScript interfaces safe for both Client and Server Components
 */

export type UserRole = "STUDENT" | "MENTOR" | "SUPERVISOR" | "CEO" | "ADMIN";

export interface UserRecord {
  id: string;
  phoneNumber: string;
  username?: string | null;
  sipExtension?: string | null;
  fullName: string;
  role: UserRole;
  nationalId?: string | null;
  passwordHash?: string | null;
  mustChangePassword?: boolean;
  garnetUserId?: string | null;
  garnetUsername?: string | null;
  canCreateExams?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfileRecord {
  id: string;
  userId: string;
  mentorId: string;
  employmentStatus: "FULL_TIME" | "PART_TIME" | "FREELANCE" | "UNEMPLOYED";
  isStudent: boolean;
  maritalStatus: "SINGLE" | "MARRIED" | "ENGAGED" | "IN_RELATIONSHIP" | "OTHER";
  hasChildren: boolean;
  childrenCount: number;
  hasFamilyCareDuty: boolean;
  familyCareDetail?: string;
  workdayStudyHoursCap: number;
  holidayStudyHoursCap: number;
  bestStudyTime: string; // MORNING, AFTERNOON, NIGHT
  primaryConstraint?: string;
  previousBarExamAttempts: number;
  currentDailyStudyHours: number;
  selfBaselineAssessment?: string;
  masterclassGoal: string;
  riskStatus: "GREEN" | "YELLOW" | "RED";
  riskReason: string;
  lastContactAt: Date;
  enrolledCourseCode?: string | null;
  enrolledCourseName?: string | null;
  hasActiveSupport?: boolean;
  externalUserId?: string | null;
  initialSyncCompleted?: boolean;
  initialSyncAt?: Date | null;
  provisioningSource?: "EXCEL_WHITELIST" | "EXTERNAL_API_ONCE" | "ADMIN_MANUAL" | "LOCAL";
  acceptedLegalTermsAt?: Date | null;
  acceptedLegalTermsIp?: string | null;
  isProbationary?: boolean;
  lastEntitlementCheckAt?: Date | null;
  suspensionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleItemRecord {
  id: string;
  scheduleId: string;
  dayOfWeek: number; // 0 to 6 (Sat to Fri)
  subject: string;
  activityType: "CLASS" | "STUDY" | "REVIEW" | "STATUTE_READ" | "TEST_STUDY" | "TEST_PRACTICE" | "EXAM_ANALYSIS";
  topicDescription: string;
  targetVolume: string;
  targetDurationMinutes: number;
  isCatchup: boolean;
  status: "NOT_DONE" | "PARTIAL" | "DONE";
  isTemplateOverride?: boolean;
}

export interface DailyCheckinRecord {
  id: string;
  studentProfileId: string;
  checkinDate: string; // "1403-07-21"
  calculatedExecutionPercent: number;
  plannedHours?: number;
  actualHours?: number;
  rootFailureCause?: string;
  helpRequested: boolean;
  studentNotes?: string;
  loggedAt: Date;
}

export interface TriageCaseRecord {
  id: string;
  studentProfileId: string;
  mentorId: string;
  triggerCode: string;
  priorityTier: number;
  description: string;
  isResolved: boolean;
  resolvedAt?: Date;
  slaDueAt: Date;
  interventionNotes?: string;
  createdAt: Date;
}

export interface MockExamRecord {
  id: string;
  studentProfileId: string;
  examTitle: string;
  examDate: string;
  hasParticipated: boolean;
  isExcusedAbsence: boolean;
  overallScorePercent: number;
  overallRank: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  subjectScores: Record<string, number>;
  analysisStatus: "DONE" | "PARTIAL" | "NOT_DONE";
  primaryErrorCause?: string;
  priorityReviewSubject?: string;
  deltaPreviousExam: number;
  deltaBaseline: number;
  createdAt: Date;
}

export interface CoachingMissionRecord {
  id: string;
  title: string;
  category: string;
  assignedJalaliWeek: number;
  assignedJalaliYear: number;
}

export interface StudentMissionLogRecord {
  id: string;
  missionId: string;
  studentProfileId: string;
  adherenceStatus: "NOT_DONE" | "PARTIAL" | "DONE";
  obstacleEncountered?: string;
  notes?: string;
  loggedAt: Date;
}

// -------------------------------------------------------------
// Enterprise Features Data Models
// -------------------------------------------------------------

/**
 * 1. Pre-Approved Student Whitelist (Excel Upload & Template)
 */
export interface StudentWhitelistRecord {
  id: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  assignedMentorId?: string;
  status: "PENDING" | "REGISTERED";
  invitedAt?: Date;
  registeredAt?: Date;
  createdAt: Date;
}

/**
 * 2. Kavenegar SMS Settings & Event Triggers
 */
export type SmsTriggerEvent =
  | "LOGIN"
  | "MENTOR_CONTACT"
  | "MENTOR_ASSIGNED"
  | "TRIAGE_RESOLVED"
  | "WEEKLY_PLAN_ASSIGNED"
  | "TASK_ASSIGNED"
  | "EXAM_PUBLISHED"
  | "MESSAGE_RECEIVED"
  | "WHITELIST_INVITE";

export interface SmsTriggerConfig {
  event?: SmsTriggerEvent;
  title: string;
  description: string;
  isEnabled: boolean;
  templateMessage: string;
}

export interface SmsSettingsRecord {
  id: string;
  provider: "KAVENEGAR" | "FARAZ" | "MOCK";
  apiKey: string;
  senderNumber: string;
  senderLine: string;
  isActive: boolean;
  triggers: Record<SmsTriggerEvent, SmsTriggerConfig>;
  updatedAt: Date;
}

export interface SmsLogRecord {
  id: string;
  recipientPhone: string;
  recipientName: string;
  event: SmsTriggerEvent;
  messageText: string;
  status: "DELIVERED" | "SENT" | "QUEUED" | "FAILED" | "SIMULATED";
  providerMessageId?: string;
  deliveryTime?: Date;
  sentAt?: Date;
  createdAt?: Date | string;
}

/**
 * 3. Hierarchical Tasks (Manager -> Supervisor, Supervisor -> Mentors)
 */
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskStatus =
  | "PENDING"
  | "SEEN_IN_PROGRESS"
  | "IN_PROGRESS"
  | "COMPLETED_BY_MENTOR"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export interface HierarchyTaskRecord {
  id: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  receiverId: string;
  receiverRole: UserRole;
  receiverName: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // "1403-08-01"
  resolutionNotes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNotes?: string;
  seenAt?: Date;
  reviewedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Friday Self-Assessment Report Record
 */
export interface FridayReportRecord {
  id: string;
  studentId: string;
  studentProfileId?: string;
  cohortId?: string;
  weekNumber: number;
  studyHoursCivil: number;
  studyHoursCriminal: number;
  studyHoursTrade: number;
  studyHoursProcedure: number;
  totalHours: number;
  testsCount: number;
  weakPoints?: string;
  strengths?: string;
  studentNotes?: string;
  status?: "SUBMITTED" | "APPROVED" | "REJECTED";
  mentorFeedback?: string;
  mentorReviewedAt?: Date;
  supervisorApproval: boolean;
  supervisorNotes?: string;
  supervisorApprovedAt?: Date;
  submittedAt: Date;
  updatedAt: Date;
}

export interface DirectChatThreadRecord {
  id: string;
  isClosed: boolean;
  closedById?: string | null;
  closedAt?: Date | null;
  updatedAt: Date;
}

/**
 * 4. Internal Messaging with Attachments (up to 10MB)
 */
export interface DirectMessageRecord {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  receiverId: string;
  receiverName: string;
  receiverRole: UserRole;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number; // bytes
  attachmentType?: string; // "application/pdf" | "image/jpeg" etc.
  isRead: boolean;
  createdAt: Date;
}

/**
 * 5. Escalation Ticket to Supervisor (from Settings only)
 */
export interface EscalationTicketRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  mentorId: string;
  mentorName: string;
  supervisorId: string;
  subject: string;
  reasonCategory: "MENTOR_UNRESPONSIVE" | "PLAN_CONFLICT" | "EMOTIONAL_CRISIS" | "OTHER";
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED";
  supervisorResponse?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

/**
 * 6. Weekly Plan Templates (Supervisor Template -> Mentor Tailoring)
 */
export interface WeeklyPlanTemplateRecord {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  jalaliYear: number;
  jalaliWeekNumber: number;
  targetCohort: string;
  weeklyMainGoal: string;
  items: Omit<ScheduleItemRecord, "id" | "scheduleId">[];
  createdAt: Date;
}

/**
 * 7. Timed Evaluation Exams & Longitudinal Delta Analytics
 */
export type QuestionType = "MULTIPLE_CHOICE" | "DESCRIPTIVE" | "SHORT_ANSWER" | "TRUE_FALSE";

export interface ExamQuestionRecord {
  id: string;
  examId: string;
  type: QuestionType;
  subject: string; // e.g. "حقوق مدنی"
  questionText: string;
  options?: string[]; // for MULTIPLE_CHOICE (4 options)
  correctOptionIndex?: number; // 0, 1, 2, 3
  modelAnswer?: string; // for DESCRIPTIVE, SHORT_ANSWER or TRUE_FALSE
  points: number; // e.g. 1
  orderIndex: number;
}

export interface EvaluationExamRecord {
  id: string;
  creatorId: string;
  creatorRole: UserRole;
  creatorName: string;
  title: string;
  description: string;
  startTime: string; // ISO String or Jalali "1403-08-01 09:00"
  endTime: string;   // ISO String or Jalali "1403-08-01 18:00"
  durationMinutes: number;
  totalQuestions: number;
  subjectsWeight: Record<string, number>; // { "حقوق مدنی": 25, "حقوق تجارت": 15, ... }
  isPublished: boolean;
  targetCohort: string;
  assignedStudentIds?: string[]; // ["ALL"] or array of specific studentProfileIds
  questions?: ExamQuestionRecord[];
  createdAt: Date;
}

export interface ExamSubmissionRecord {
  id: string;
  examId: string;
  examTitle?: string;
  studentProfileId?: string;
  studentId?: string;
  mentorId?: string;
  studentName?: string;
  scorePercent?: number;
  subjectScores?: Record<string, number>;
  correctCount: number;
  wrongCount?: number;
  incorrectCount?: number;
  unansweredCount: number;
  rank?: number;
  deltaFromPrevious?: number;
  deltaFromBaseline?: number;
  answers?: Record<string, any>;
  totalPercentage?: string | number;
  subjectBreakdown?: SubjectBreakdownItem[];
  status?: ExamSubmissionStatus;
  mentorNotes?: string | null;
  reviewedAt?: Date | null;
  publishedAt?: Date | null;
  submittedAt: Date;
}

/**
 * Production Exam Module Models (Bar Exam Simulation Engine)
 */
export type ExamCategory = "MOCK_BAR" | "DIAGNOSTIC" | "SUBJECT_SPECIFIC";
export type ExamTargetAudience = "ALL" | "COURSE_CODE" | "SPECIFIC_STUDENTS";

export interface ExamOptionItem {
  id: number;
  text: string;
}

export interface ExamRecord {
  id: string;
  title: string;
  courseCode?: string | null;
  category: ExamCategory;
  durationMinutes: number;
  totalQuestions: number;
  hasNegativeMarking: boolean;
  isPublished: boolean;
  targetAudience: ExamTargetAudience;
  targetCourseCodes: string[];
  targetStudentIds: string[];
  startDate?: Date | string | null;
  expiryDate?: Date | string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionNumber: number;
  subject: string;
  questionText: string;
  options: ExamOptionItem[];
  correctOption?: number;
  explanation?: string | null;
  coefficient: number;
}

export interface SubjectBreakdownItem {
  subject: string;
  correct: number;
  incorrect: number;
  unattempted: number;
  percentage: number;
}

export type ExamSubmissionStatus =
  | "IN_PROGRESS"
  | "AUTO_GRADED_PENDING_MENTOR"
  | "PUBLISHED_TO_STUDENT";

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  mentorId: string;
  studentName?: string | null;
  startedAt: Date;
  submittedAt?: Date | null;
  answers: Record<string, number>;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalPercentage: string | number;
  subjectBreakdown: SubjectBreakdownItem[];
  status: ExamSubmissionStatus;
  mentorNotes?: string | null;
  reviewedAt?: Date | null;
  publishedAt?: Date | null;
}

/**
 * 8. Issabel Asterisk AMI VoIP Integration & Phone Masking
 */
export interface VoipAmiSettings {
  id?: string;
  host: string;
  port: number;
  username: string;
  secret: string;
  context: string;
  channelTech: "SIP" | "PJSIP";
  trunk: string;
  callerId: string;
  isActive: boolean;
  mentorExtensions: Record<string, string>; // mentorId -> SIP extension (e.g. { "usr_mentor1": "101", "usr_mentor2": "102" })
  updatedAt?: Date;
}

export interface VoipCallRecord {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorExtension: string;
  studentProfileId: string;
  studentName: string;
  maskedPhone: string; // Zero-knowledge: e.g. "۰۹۱۲***۰۰۰۵"
  status: "INITIATED" | "RINGING" | "ANSWERED" | "COMPLETED" | "FAILED" | "BUSY";
  durationSeconds: number;
  callUniqueId?: string;
  initiatedAt: Date;
  notes?: string;
}

/**
 * 9. Advanced Internal Messaging (Direct, Channels, and Groups)
 */
export type ConversationType = "DIRECT" | "GROUP" | "CHANNEL";

export interface ChatConversationRecord {
  id: string;
  type: ConversationType;
  title: string;
  description?: string;
  creatorId: string;
  creatorRole: UserRole;
  creatorName: string;
  memberIds: string[];
  isChannelReadOnlyForStudents: boolean;
  isGhostMode?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number; // bytes
  attachmentType?: string; // "application/pdf" | "image/jpeg" etc.
  createdAt: Date;
}

/**
 * 10. Custom Video Conferencing (Mashahir Danesh Tailor-Made Platform)
 */
export interface VideoConferenceSettings {
  id?: string;
  platformName: string;
  serverUrl: string;
  apiKey: string;
  isEnabled: boolean;
  updatedAt?: Date | string;
}

export interface VideoSessionRecord {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostRole: UserRole;
  roomCode: string;
  sessionType: "COUNSELING_1ON1" | "COHORT_WEBINAR" | "TRIAGE_URGENT";
  targetCohort?: string;
  allowedRoles: UserRole[];
  participantIds: string[];
  scheduledStart: string;
  durationMinutes: number;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  joinUrl: string;
  createdAt: Date;
}

/**
 * 11. Landing Page Content Management (CMS)
 */
export interface LandingFeatureItem {
  id: string;
  title: string;
  description: string;
  iconName: string; // "ShieldAlert" | "CalendarCheck" | "BarChart3" | "Headphones" | ...
}

export interface LandingHonorsItem {
  id: string;
  rankTitle: string; // e.g. "رتبه ۱ کانون وکلای مرکز"
  candidateName: string; // e.g. "پذیرفته‌شده آزمون وکالت ۱۴۰۳"
  quote: string;
  finalScore: string; // "معدل نهایی: ۱۹.۴۰"
  cohortName: string; // "دوره آموزشی"
}

export interface LandingGalleryImage {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
  orderIndex: number;
}

export interface LandingContentSettings {
  heroBadge?: string;
  heroTagline?: string;
  heroTitle: string;
  heroSubtitle?: string;
  heroDescription?: string;
  towerTitle?: string;
  towerSubtitle?: string;
  galaTitle?: string;
  galaSubtitle?: string;
  featuresTitle?: string;
  featuresDescription?: string;
  features: LandingFeatureItem[];
  honorsTitle?: string;
  honorsDescription?: string;
  honors: LandingHonorsItem[];
  stats?: {
    studentsCount: string;
    ranksCount: string;
    checkinSpeed: string;
    adherenceRate: string;
  };
  gallery: LandingGalleryImage[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaDescription?: string;
  footerRights?: string;
  phoneNumber?: string;
  brandColor?: string;
  accentColor?: string;
}

/**
 * 12. Mentor Calling Windows (Reverse AMI Calling)
 */
export interface MentorCallingWindowRecord {
  id: string;
  mentorId: string;
  startTime: string; // e.g. "17:00"
  endTime: string;   // e.g. "20:00"
  daysOfWeek: number[]; // [0, 1, 2, 3, 4] Shanbeh to Chaharshanbeh
  dailyDurationHours: number;
  isActive: boolean;
  announcement?: string | null;
  updatedAt: Date;
}

/**
 * 13. Garnet LMS Entitled Courses
 */
export interface EntitledCourseRecord {
  id: string;
  courseCode: string;
  courseName: string;
  description?: string | null;
  priceFormatted: string;
  garnetPurchaseUrl: string;
  hasSupport: boolean;
  supportTier?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 14. Central SSO API Settings (Mashahir Danesh Central Account)
 */
export interface SsoApiSettingsRecord {
  id: string;
  isEnabled: boolean;
  serviceTitle: string;
  baseUrl: string;
  loginEndpoint: string;
  coursesEndpoint: string;
  sendOtpEndpoint?: string;
  verifyOtpEndpoint?: string;
  productsEndpoint?: string;
  codeCount?: number;
  apiKeyHeader: string;
  apiKeyValue: string;
  mobileFieldName: string;
  passwordFieldName: string;
  successStatusCode: number;
  timeoutMs: number;
  autoCreateStudent: boolean;
  bypassCourseCheckIfNoEndpoint: boolean;
  updatedAt: Date;
}

/**
 * 15. System Audit Logs
 */
export interface SystemAuditLogRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  eventType: string;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  details?: string | null;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}



