import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "STUDENT",
  "MENTOR",
  "SUPERVISOR",
  "CEO",
  "ADMIN",
]);

export const employmentStatusEnum = pgEnum("employment_status", [
  "FULL_TIME",
  "PART_TIME",
  "FREELANCE",
  "UNEMPLOYED",
]);

export const maritalStatusEnum = pgEnum("marital_status", [
  "SINGLE",
  "MARRIED",
  "ENGAGED",
  "IN_RELATIONSHIP",
  "OTHER",
]);

export const riskStatusEnum = pgEnum("risk_status", [
  "GREEN",
  "YELLOW",
  "RED",
]);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "BASELINE",
  "FINAL_BENCHMARK",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "CLASS",
  "STUDY",
  "REVIEW",
  "STATUTE_READ",
  "TEST_STUDY",
  "TEST_PRACTICE",
  "EXAM_ANALYSIS",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "NOT_DONE",
  "PARTIAL",
  "DONE",
]);

export const analysisStatusEnum = pgEnum("analysis_status", [
  "DONE",
  "PARTIAL",
  "NOT_DONE",
]);

// 1. Users
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).unique().notNull(),
  fullName: text("full_name").notNull(),
  nationalId: varchar("national_id", { length: 20 }),
  sipExtension: varchar("sip_extension", { length: 20 }),
  role: userRoleEnum("role").default("STUDENT").notNull(),
  passwordHash: text("password_hash"),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Student Profiles
export const studentProfiles = pgTable("student_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  mentorId: text("mentor_id").references(() => users.id),
  employmentStatus: employmentStatusEnum("employment_status").default("UNEMPLOYED"),
  isStudent: boolean("is_student").default(false).notNull(),
  maritalStatus: maritalStatusEnum("marital_status").default("SINGLE"),
  hasChildren: boolean("has_children").default(false).notNull(),
  childrenCount: integer("children_count").default(0).notNull(),
  hasFamilyCareDuty: boolean("has_family_care_duty").default(false).notNull(),
  familyCareDetail: text("family_care_detail"),
  workdayStudyHoursCap: integer("workday_study_hours_cap").default(6).notNull(),
  holidayStudyHoursCap: integer("holiday_study_hours_cap").default(10).notNull(),
  bestStudyTime: text("best_study_time").default("MORNING"), // MORNING, AFTERNOON, NIGHT
  primaryConstraint: text("primary_constraint"),
  previousBarExamAttempts: integer("previous_bar_exam_attempts").default(0).notNull(),
  currentDailyStudyHours: integer("current_daily_study_hours").default(4).notNull(),
  selfBaselineAssessment: text("self_baseline_assessment"),
  masterclassGoal: text("masterclass_goal"),
  riskStatus: riskStatusEnum("risk_status").default("GREEN").notNull(),
  riskReason: text("risk_reason"),
  lastContactAt: timestamp("last_contact_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 3. Study Preference Profiles
export const studyPreferenceProfiles = pgTable("study_preference_profiles", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
  auditoryScore: integer("auditory_score").default(0).notNull(),
  textualScore: integer("textual_score").default(0).notNull(),
  structuralScore: integer("structural_score").default(0).notNull(),
  practicalScore: integer("practical_score").default(0).notNull(),
  dominantPreference: text("dominant_preference").notNull(),
  actionableRecommendations: text("actionable_recommendations").notNull(),
});

// 4. Benchmark Assessments
export const benchmarkAssessments = pgTable("benchmark_assessments", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
  assessmentType: assessmentTypeEnum("assessment_type").notNull(),
  overallScorePercent: integer("overall_score_percent").notNull(),
  subjectScores: jsonb("subject_scores").notNull(), // { civilLaw: 45, commercialLaw: 50, ... }
  academicNotes: text("academic_notes"),
  takenAt: timestamp("taken_at").defaultNow().notNull(),
});

// 5. Student Schedules
export const studentSchedules = pgTable(
  "student_schedules",
  {
    id: text("id").primaryKey(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
    jalaliYear: integer("jalali_year").notNull(),
    jalaliWeekNumber: integer("jalali_week_number").notNull(),
    weekStartDate: text("week_start_date").notNull(),
    weekEndDate: text("week_end_date").notNull(),
    weeklyMainGoal: text("weekly_main_goal"),
    topPriorities: jsonb("top_priorities"), // string[]
    isTemplateOverride: boolean("is_template_override").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    studentWeekIdx: uniqueIndex("student_week_idx").on(
      table.studentProfileId,
      table.jalaliYear,
      table.jalaliWeekNumber
    ),
    jalaliWeekIdx: index("jalali_week_idx").on(
      table.jalaliYear,
      table.jalaliWeekNumber
    ),
  })
);
export const schedules = studentSchedules;

// 6. Schedule Items
export const scheduleItems = pgTable("schedule_items", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").references(() => studentSchedules.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Saturday (Shanbeh) to 6 = Friday (Jomeh)
  subject: text("subject").notNull(), // حقوق مدنی، حقوق تجارت، etc.
  activityType: activityTypeEnum("activity_type").default("STUDY").notNull(),
  topicDescription: text("topic_description").notNull(),
  targetVolume: text("target_volume").notNull(), // e.g. "۴۰ صفحه", "۳۰ تست"
  targetDurationMinutes: integer("target_duration_minutes").notNull(),
  isCatchup: boolean("is_catchup").default(false).notNull(),
  status: itemStatusEnum("status").default("NOT_DONE").notNull(),
});

// 7. Daily Check-ins
export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: text("id").primaryKey(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
    checkinDate: text("checkin_date").notNull(), // "1403-07-21"
    calculatedExecutionPercent: integer("calculated_execution_percent").notNull(),
    rootFailureCause: text("root_failure_cause"),
    helpRequested: boolean("help_requested").default(false).notNull(),
    studentNotes: text("student_notes"),
    loggedAt: timestamp("logged_at").defaultNow().notNull(),
  },
  (table) => ({
    studentCheckinDateIdx: uniqueIndex("student_checkin_date_idx").on(
      table.studentProfileId,
      table.checkinDate
    ),
  })
);

// 8. Weekly Reviews
export const weeklyReviews = pgTable("weekly_reviews", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
  scheduleId: text("schedule_id").references(() => studentSchedules.id).notNull(),
  programExecutionPercent: integer("program_execution_percent").notNull(),
  consistencyPercent: integer("consistency_percent").notNull(),
  backlogMinutesAccumulated: integer("backlog_minutes_accumulated").default(0).notNull(),
  backlogMinutesRecovered: integer("backlog_minutes_recovered").default(0).notNull(),
  coachingAdherencePercent: integer("coaching_adherence_percent").notNull(),
  primaryObstacle: text("primary_obstacle"),
  assistanceNeededDomain: text("assistance_needed_domain"),
  selfSatisfactionScore: integer("self_satisfaction_score").notNull(), // 1-5
  studentFeedbackNote: text("student_feedback_note"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

// 9. Mock Exams
export const mockExams = pgTable("mock_exams", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
  examTitle: text("exam_title").notNull(),
  examDate: text("exam_date").notNull(),
  hasParticipated: boolean("has_participated").default(true).notNull(),
  isExcusedAbsence: boolean("is_excused_absence").default(false).notNull(),
  overallScorePercent: integer("overall_score_percent").default(0).notNull(),
  overallRank: integer("overall_rank"),
  correctCount: integer("correct_count").default(0).notNull(),
  wrongCount: integer("wrong_count").default(0).notNull(),
  unansweredCount: integer("unanswered_count").default(0).notNull(),
  subjectScores: jsonb("subject_scores").notNull(), // { civilLaw: 60, ... }
  analysisStatus: analysisStatusEnum("analysis_status").default("NOT_DONE").notNull(),
  primaryErrorCause: text("primary_error_cause"),
  priorityReviewSubject: text("priority_review_subject"),
  deltaPreviousExam: integer("delta_previous_exam").default(0).notNull(),
  deltaBaseline: integer("delta_baseline").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 10. Coaching Missions
export const coachingMissions = pgTable("coaching_missions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(), // e.g. "سبک زندگی", "تکنیک تست‌زنی", "تنظیم خواب"
  assignedJalaliWeek: integer("assigned_jalali_week").notNull(),
  assignedJalaliYear: integer("assigned_jalali_year").notNull(),
});

// 11. Student Mission Logs
export const studentMissionLogs = pgTable(
  "student_mission_logs",
  {
    id: text("id").primaryKey(),
    missionId: text("mission_id").references(() => coachingMissions.id).notNull(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
    adherenceStatus: itemStatusEnum("adherence_status").default("NOT_DONE").notNull(),
    obstacleEncountered: text("obstacle_encountered"),
    notes: text("notes"),
    loggedAt: timestamp("logged_at").defaultNow().notNull(),
  },
  (table) => ({
    studentMissionIdx: uniqueIndex("student_mission_idx").on(
      table.missionId,
      table.studentProfileId
    ),
  })
);

// 12. Mentor Triage Cases
export const mentorTriageCases = pgTable(
  "mentor_triage_cases",
  {
    id: text("id").primaryKey(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
    mentorId: text("mentor_id").references(() => users.id).notNull(),
    triggerCode: varchar("trigger_code", { length: 10 }).notNull(), // A01 - A09
    priorityTier: integer("priority_tier").notNull(), // 1 to 6
    description: text("description").notNull(),
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at"),
    slaDueAt: timestamp("sla_due_at").notNull(),
    interventionNotes: text("intervention_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    mentorTriageIdx: index("mentor_triage_idx").on(
      table.mentorId,
      table.isResolved,
      table.priorityTier
    ),
  })
);
export const triageCases = mentorTriageCases;

// 13. Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  targetEntity: text("target_entity").notNull(),
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Student Whitelist
export const studentWhitelist = pgTable(
  "student_whitelist",
  {
    id: text("id").primaryKey(),
    nationalId: varchar("national_id", { length: 20 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    fullName: text("full_name").notNull(),
    assignedMentorId: text("assigned_mentor_id").references(() => users.id),
    status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING | REGISTERED
    invitedAt: timestamp("invited_at"),
    registeredAt: timestamp("registered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    whitelistPhoneIdx: index("whitelist_phone_idx").on(table.phoneNumber),
    whitelistNationalIdIdx: index("whitelist_national_id_idx").on(table.nationalId),
  })
);

// 15. SMS Settings
export const smsSettings = pgTable("sms_settings", {
  id: text("id").primaryKey(),
  provider: varchar("provider", { length: 30 }).default("KAVENEGAR").notNull(),
  apiKey: text("api_key").notNull(),
  senderNumber: varchar("sender_number", { length: 30 }).notNull(),
  senderLine: varchar("sender_line", { length: 30 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  triggers: jsonb("triggers").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 16. SMS Logs
export const smsLogs = pgTable(
  "sms_logs",
  {
    id: text("id").primaryKey(),
    event: varchar("event", { length: 50 }).notNull(),
    recipientPhone: varchar("recipient_phone", { length: 20 }).notNull(),
    recipientName: text("recipient_name").notNull(),
    messageText: text("message_text").notNull(),
    status: varchar("status", { length: 20 }).default("SENT").notNull(),
    deliveryTime: timestamp("delivery_time").defaultNow().notNull(),
    providerResponse: text("provider_response"),
  },
  (table) => ({
    smsLogsPhoneIdx: index("sms_logs_phone_idx").on(table.recipientPhone),
  })
);

// 17. Hierarchy Tasks
export const hierarchyTasks = pgTable(
  "hierarchy_tasks",
  {
    id: text("id").primaryKey(),
    senderId: text("sender_id").references(() => users.id).notNull(),
    senderRole: varchar("sender_role", { length: 20 }).notNull(),
    senderName: text("sender_name").notNull(),
    receiverId: text("receiver_id").references(() => users.id).notNull(),
    receiverRole: varchar("receiver_role", { length: 20 }).notNull(),
    receiverName: text("receiver_name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: varchar("priority", { length: 20 }).notNull(), // LOW, MEDIUM, HIGH, CRITICAL
    status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING, IN_PROGRESS, COMPLETED
    dueDate: varchar("due_date", { length: 30 }).notNull(),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    taskReceiverIdx: index("task_receiver_idx").on(table.receiverId, table.status),
    taskSenderIdx: index("task_sender_idx").on(table.senderId),
  })
);

// 18. Direct Messages
export const directMessages = pgTable(
  "direct_messages",
  {
    id: text("id").primaryKey(),
    threadId: varchar("thread_id", { length: 100 }).notNull(),
    senderId: text("sender_id").references(() => users.id).notNull(),
    senderName: text("sender_name").notNull(),
    senderRole: varchar("sender_role", { length: 20 }).notNull(),
    receiverId: text("receiver_id").references(() => users.id).notNull(),
    receiverName: text("receiver_name").notNull(),
    receiverRole: varchar("receiver_role", { length: 20 }).notNull(),
    message: text("message").notNull(),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentSize: integer("attachment_size"),
    attachmentType: text("attachment_type"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    directThreadIdx: index("direct_thread_idx").on(table.threadId, table.createdAt),
    directSenderIdx: index("direct_sender_idx").on(table.senderId),
    directReceiverIdx: index("direct_receiver_idx").on(table.receiverId),
  })
);

// 19. Escalation Tickets
export const escalationTickets = pgTable(
  "escalation_tickets",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").references(() => users.id).notNull(),
    studentName: text("student_name").notNull(),
    studentPhone: varchar("student_phone", { length: 20 }).notNull(),
    mentorId: text("mentor_id").references(() => users.id).notNull(),
    mentorName: text("mentor_name").notNull(),
    supervisorId: text("supervisor_id").references(() => users.id).notNull(),
    subject: text("subject").notNull(),
    reasonCategory: varchar("reason_category", { length: 50 }).notNull(),
    description: text("description").notNull(),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    status: varchar("status", { length: 20 }).default("OPEN").notNull(), // OPEN, IN_REVIEW, RESOLVED
    supervisorResponse: text("supervisor_response"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    ticketStudentIdx: index("ticket_student_idx").on(table.studentId),
    ticketSupervisorIdx: index("ticket_supervisor_idx").on(table.supervisorId),
  })
);

// 20. Weekly Plan Templates
export const weeklyPlanTemplates = pgTable("weekly_plan_templates", {
  id: text("id").primaryKey(),
  authorId: text("author_id").references(() => users.id).notNull(),
  authorName: text("author_name").notNull(),
  title: text("title").notNull(),
  jalaliYear: integer("jalali_year").notNull(),
  jalaliWeekNumber: integer("jalali_week_number").notNull(),
  targetCohort: text("target_cohort").notNull(),
  weeklyMainGoal: text("weekly_main_goal").notNull(),
  items: jsonb("items").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 21. Evaluation Exams
export const evaluationExams = pgTable(
  "evaluation_exams",
  {
    id: text("id").primaryKey(),
    creatorId: text("creator_id").references(() => users.id).notNull(),
    creatorRole: varchar("creator_role", { length: 20 }).notNull(),
    creatorName: text("creator_name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    startTime: varchar("start_time", { length: 30 }).notNull(),
    endTime: varchar("end_time", { length: 30 }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    totalQuestions: integer("total_questions").default(0).notNull(),
    subjectsWeight: jsonb("subjects_weight").notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    targetCohort: text("target_cohort").notNull(),
    assignedStudentIds: jsonb("assigned_student_ids").notNull(),
    questions: jsonb("questions").default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    examCreatorIdx: index("exam_creator_idx").on(table.creatorId),
  })
);

// 22. Exam Submissions
export const examSubmissions = pgTable(
  "exam_submissions",
  {
    id: text("id").primaryKey(),
    examId: text("exam_id").references(() => evaluationExams.id).notNull(),
    examTitle: text("exam_title").notNull(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
    studentName: text("student_name").notNull(),
    scorePercent: integer("score_percent").notNull(),
    subjectScores: jsonb("subject_scores").notNull(),
    correctCount: integer("correct_count").default(0).notNull(),
    wrongCount: integer("wrong_count").default(0).notNull(),
    unansweredCount: integer("unanswered_count").default(0).notNull(),
    rank: integer("rank"),
    deltaFromPrevious: integer("delta_from_previous").default(0).notNull(),
    deltaFromBaseline: integer("delta_from_baseline").default(0).notNull(),
    answers: jsonb("answers"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  },
  (table) => ({
    examSubmissionIdx: uniqueIndex("exam_submission_student_idx").on(table.examId, table.studentProfileId),
    examSubStudentIdx: index("exam_sub_student_idx").on(table.studentProfileId),
  })
);

// 23. VoIP AMI Settings
export const voipSettings = pgTable("voip_settings", {
  id: text("id").primaryKey(),
  host: varchar("host", { length: 100 }).notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  secret: text("secret").notNull(),
  context: varchar("context", { length: 50 }).notNull(),
  channelTech: varchar("channel_tech", { length: 20 }).notNull(),
  trunk: text("trunk").notNull(),
  callerId: varchar("caller_id", { length: 30 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  mentorExtensions: jsonb("mentor_extensions").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 24. VoIP Calls
export const voipCalls = pgTable(
  "voip_calls",
  {
    id: text("id").primaryKey(),
    mentorId: text("mentor_id").references(() => users.id).notNull(),
    mentorName: text("mentor_name").notNull(),
    mentorExtension: varchar("mentor_extension", { length: 20 }).notNull(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id).notNull(),
    studentName: text("student_name").notNull(),
    maskedPhone: varchar("masked_phone", { length: 30 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    durationSeconds: integer("duration_seconds").default(0).notNull(),
    callUniqueId: text("call_unique_id"),
    initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
    notes: text("notes"),
  },
  (table) => ({
    voipCallMentorIdx: index("voip_call_mentor_idx").on(table.mentorId),
    voipCallStudentIdx: index("voip_call_student_idx").on(table.studentProfileId),
  })
);

// 25. Chat Conversations
export const chatConversations = pgTable("chat_conversations", {
  id: text("id").primaryKey(),
  type: varchar("type", { length: 20 }).notNull(), // CHANNEL | GROUP | DIRECT
  title: text("title").notNull(),
  description: text("description"),
  creatorId: text("creator_id").references(() => users.id).notNull(),
  creatorRole: varchar("creator_role", { length: 20 }).notNull(),
  creatorName: text("creator_name").notNull(),
  memberIds: jsonb("member_ids").notNull(), // string[]
  isChannelReadOnlyForStudents: boolean("is_channel_read_only_for_students").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 26. Chat Messages
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id").references(() => chatConversations.id).notNull(),
    senderId: text("sender_id").references(() => users.id).notNull(),
    senderName: text("sender_name").notNull(),
    senderRole: varchar("sender_role", { length: 20 }).notNull(),
    message: text("message").notNull(),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentSize: integer("attachment_size"),
    attachmentType: text("attachment_type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    chatMsgConvIdx: index("chat_msg_conv_idx").on(table.conversationId, table.createdAt),
  })
);

// 27. Video Settings
export const videoSettings = pgTable("video_settings", {
  id: text("id").primaryKey(),
  platformName: text("platform_name").notNull(),
  serverUrl: text("server_url").notNull(),
  apiKey: text("api_key").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

// 28. Video Sessions
export const videoSessions = pgTable("video_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  hostId: text("host_id").references(() => users.id).notNull(),
  hostName: text("host_name").notNull(),
  hostRole: varchar("host_role", { length: 20 }).notNull(),
  roomCode: varchar("room_code", { length: 50 }).notNull(),
  sessionType: varchar("session_type", { length: 50 }).notNull(),
  targetCohort: text("target_cohort").notNull(),
  allowedRoles: jsonb("allowed_roles").notNull(),
  participantIds: jsonb("participant_ids").notNull(),
  scheduledStart: varchar("scheduled_start", { length: 30 }).notNull(),
  durationMinutes: integer("duration_minutes").default(60).notNull(),
  status: varchar("status", { length: 20 }).default("SCHEDULED").notNull(),
  joinUrl: text("join_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 29. Landing Content
export const landingContent = pgTable("landing_content", {
  id: text("id").primaryKey(),
  content: jsonb("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
