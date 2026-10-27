import {
  pgTable,
  text,
  varchar,
  integer,
  numeric,
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
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").unique(),
    phoneNumber: varchar("phone_number", { length: 20 }).unique().notNull(),
    fullName: text("full_name").notNull(),
    nationalId: varchar("national_id", { length: 20 }),
    sipExtension: varchar("sip_extension", { length: 20 }),
    role: userRoleEnum("role").default("STUDENT").notNull(),
    passwordHash: text("password_hash"),
    mustChangePassword: boolean("must_change_password").default(false).notNull(),
    garnetUserId: text("garnet_user_id"),
    garnetUsername: text("garnet_username"),
    canCreateExams: boolean("can_create_exams").default(false).notNull(),
    supervisorId: text("supervisor_id"), // Supervisor folder hierarchy assignment
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    usersRoleIdx: index("users_role_idx").on(table.role),
  })
);

// 2. Student Profiles
export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    mentorId: text("mentor_id").references(() => users.id, { onDelete: "set null" }),
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
    enrolledCourseCode: text("enrolled_course_code"),
    enrolledCourseName: text("enrolled_course_name"),
    hasActiveSupport: boolean("has_active_support").default(true).notNull(),
    externalUserId: text("external_user_id"),
    initialSyncCompleted: boolean("initial_sync_completed").default(false).notNull(),
    initialSyncAt: timestamp("initial_sync_at"),
    provisioningSource: varchar("provisioning_source", { length: 30 }).default("LOCAL").notNull(),
    acceptedLegalTermsAt: timestamp("accepted_legal_terms_at"),
    acceptedLegalTermsIp: varchar("accepted_legal_terms_ip", { length: 64 }),
    isProbationary: boolean("is_probationary").default(true).notNull(),
    lastEntitlementCheckAt: timestamp("last_entitlement_check_at"),
    lastCentralCheckResult: text("last_central_check_result"),
    suspensionReason: text("suspension_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    studentProfilesUserIdIdx: uniqueIndex("student_profiles_user_id_idx").on(table.userId),
    studentProfilesMentorIdIdx: index("student_profiles_mentor_id_idx").on(table.mentorId),
    studentProfilesCourseCodeIdx: index("student_profiles_course_code_idx").on(table.enrolledCourseCode),
  })
);

// 3. Study Preference Profiles
export const studyPreferenceProfiles = pgTable("study_preference_profiles", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
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
  studentProfileId: text("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
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
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
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
export const scheduleItems = pgTable(
  "schedule_items",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id").references(() => studentSchedules.id, { onDelete: "cascade" }).notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0 = Saturday (Shanbeh) to 6 = Friday (Jomeh)
    subject: text("subject").notNull(), // حقوق مدنی، حقوق تجارت، etc.
    activityType: activityTypeEnum("activity_type").default("STUDY").notNull(),
    topicDescription: text("topic_description").notNull(),
    targetVolume: text("target_volume").notNull(), // e.g. "۴۰ صفحه", "۳۰ تست"
    targetDurationMinutes: integer("target_duration_minutes").notNull(),
    actualDurationMinutes: integer("actual_duration_minutes").default(0),
    studentNote: text("student_note"),
    completedAt: timestamp("completed_at"),
    isCatchup: boolean("is_catchup").default(false).notNull(),
    status: itemStatusEnum("status").default("NOT_DONE").notNull(),
  },
  (table) => ({
    scheduleItemsScheduleIdIdx: index("schedule_items_schedule_id_idx").on(table.scheduleId),
  })
);

// 7. Daily Check-ins
export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: text("id").primaryKey(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    checkinDate: text("checkin_date").notNull(), // "1403-07-21"
    calculatedExecutionPercent: integer("calculated_execution_percent").notNull(),
    plannedHours: integer("planned_hours").default(6),
    actualHours: integer("actual_hours").default(0),
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
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
    mentorId: text("mentor_id").references(() => users.id, { onDelete: "set null" }),
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
    enrolledCourseName: text("enrolled_course_name"),
    enrolledCourseCode: varchar("enrolled_course_code", { length: 100 }),
    assignedMentorId: text("assigned_mentor_id").references(() => users.id),
    assignedMentorName: text("assigned_mentor_name"),
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
    senderId: text("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    senderRole: varchar("sender_role", { length: 20 }).notNull(),
    senderName: text("sender_name").notNull(),
    receiverId: text("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    receiverRole: varchar("receiver_role", { length: 20 }).notNull(),
    receiverName: text("receiver_name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priority: varchar("priority", { length: 20 }).notNull(), // LOW, MEDIUM, HIGH, CRITICAL
    status: varchar("status", { length: 30 }).default("PENDING").notNull(), // PENDING, IN_PROGRESS, COMPLETED_BY_MENTOR, APPROVED, REJECTED, COMPLETED
    dueDate: varchar("due_date", { length: 30 }).notNull(),
    resolutionNotes: text("resolution_notes"),
    seenAt: timestamp("seen_at"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedByName: text("reviewed_by_name"),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at"),
    completedAt: timestamp("completed_at"),
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
    senderId: text("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    senderName: text("sender_name").notNull(),
    senderRole: varchar("sender_role", { length: 20 }).notNull(),
    receiverId: text("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
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

// 18.1. Direct Chat Thread State (for supervisor chat closure & reopening)
export const directChatThreads = pgTable(
  "direct_chat_threads",
  {
    id: text("id").primaryKey(), // canonical pair: [userA, userB].sort().join("_")
    isClosed: boolean("is_closed").default(false).notNull(),
    closedById: text("closed_by_id").references(() => users.id),
    closedAt: timestamp("closed_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  }
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

// 22. Production Exams Engine (New Specification)
export const exams = pgTable(
  "exams",
  {
    id: text("id").primaryKey(), // "exam_{nanoid}"
    title: text("title").notNull(), // e.g. "آزمون شبیه‌ساز جامع وکالت - مرحله سوم"
    courseCode: text("course_code"), // Linkable to enrolled course (e.g. "GARNET-BAR-360")
    category: varchar("category", { length: 50 }).notNull(), // "MOCK_BAR", "DIAGNOSTIC", "SUBJECT_SPECIFIC"
    examType: varchar("exam_type", { length: 30 }).default("MOCK_BAR").notNull(), // "MOCK_BAR", "DIAGNOSTIC", "COMPREHENSIVE", "SUBJECT"
    passingScore: integer("passing_score").default(50).notNull(),
    durationMinutes: integer("duration_minutes").default(120).notNull(),
    totalQuestions: integer("total_questions").default(0).notNull(),
    hasNegativeMarking: boolean("has_negative_marking").default(true).notNull(), // 1/3 penalty standard for Iranian Bar Exam
    isPublished: boolean("is_published").default(false).notNull(),
    targetAudience: varchar("target_audience", { length: 30 }).default("ALL").notNull(), // "ALL" | "COURSE_CODE" | "SPECIFIC_STUDENTS"
    targetType: varchar("target_type", { length: 30 }).default("ALL").notNull(), // "ALL" | "COHORT" | "SPECIFIC_STUDENTS" | "MENTOR_STUDENTS"
    targetCourseCodes: jsonb("target_course_codes").default([]).notNull(), // e.g. ["GARNET-BAR-360", "CRASH-BAR"]
    targetCourses: jsonb("target_courses").default([]).notNull(), // Course names or tags: ["وکالت ۳۶۰", "مرکز وکلا"]
    targetStudentIds: jsonb("target_student_ids").default([]).notNull(), // Array of user IDs: ["usr_student1"]
    targetMentorId: text("target_mentor_id").references(() => users.id), // Cohort-scoped mentor ID
    startDate: timestamp("start_date"),
    expiryDate: timestamp("expiry_date"),
    createdById: text("created_by_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    examCreatedByIdx: index("exams_created_by_idx").on(table.createdById),
    examCategoryIdx: index("exams_category_idx").on(table.category),
    examPublishedIdx: index("exams_published_idx").on(table.isPublished),
    examAudienceIdx: index("exams_target_audience_idx").on(table.targetAudience),
    examsCourseCodeIdx: index("exams_course_code_idx").on(table.courseCode),
    examTargetMentorIdx: index("exams_target_mentor_idx").on(table.targetMentorId),
  })
);

// 22b. Exam Questions Table
export const examQuestions = pgTable(
  "exam_questions",
  {
    id: text("id").primaryKey(), // "q_{nanoid}"
    examId: text("exam_id").references(() => exams.id, { onDelete: "cascade" }).notNull(),
    questionNumber: integer("question_number").notNull(),
    subject: varchar("subject", { length: 100 }).notNull(), // "حقوق مدنی", "آیین دادرسی مدنی", "حقوق تجارت", "حقوق جزا", "آیین دادرسی کیفری", "حقوق اساسی"
    questionText: text("question_text").notNull(),
    options: jsonb("options").notNull(), // Array of 4 options: [{ id: 1, text: "گزینه ۱" }, { id: 2, text: "گزینه ۲" }, { id: 3, text: "گزینه ۳" }, { id: 4, text: "گزینه ۴" }]
    correctOption: integer("correct_option").notNull(), // 1, 2, 3, or 4
    explanation: text("explanation"), // Rationale and legal article references
    coefficient: integer("coefficient").default(1).notNull(),
  },
  (table) => ({
    examQuestionExamIdx: index("exam_questions_exam_id_idx").on(table.examId),
    examQuestionNumIdx: index("exam_questions_num_idx").on(table.examId, table.questionNumber),
  })
);

// 22c. Exam Submissions Table (Production Grade)
export const examSubmissions = pgTable(
  "exam_submissions",
  {
    id: text("id").primaryKey(), // "sub_{nanoid}"
    examId: text("exam_id").references(() => exams.id, { onDelete: "cascade" }).notNull(),
    studentId: text("student_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    mentorId: text("mentor_id").references(() => users.id, { onDelete: "set null" }),
    reviewedById: text("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
    answers: jsonb("answers").default({}).$type<Record<string, number>>().notNull(), // { [questionId]: selectedOptionNumber }
    flaggedQuestions: jsonb("flagged_questions").default([]).$type<string[]>().notNull(), // Question IDs bookmarked by student
    eliminatedOptions: jsonb("eliminated_options").default({}).$type<Record<string, number[]>>().notNull(), // { [questionId]: [optionNumbers] } crossed out by candidate
    tabSwitchCount: integer("tab_switch_count").default(0).notNull(), // Tab blur / anti-cheat counter
    correctCount: integer("correct_count").default(0).notNull(),
    incorrectCount: integer("incorrect_count").default(0).notNull(),
    wrongCount: integer("wrong_count").default(0).notNull(),
    unansweredCount: integer("unanswered_count").default(0).notNull(),
    blankCount: integer("blank_count").default(0).notNull(),
    totalPercentage: numeric("total_percentage", { precision: 5, scale: 2 }).default("0.00").notNull(),
    rawScore: numeric("raw_score", { precision: 5, scale: 2 }).default("0.00").notNull(),
    netScore: numeric("net_score", { precision: 5, scale: 2 }).default("0.00").notNull(),
    subjectBreakdown: jsonb("subject_breakdown").default([]).$type<Array<{
      subject: string;
      correct: number;
      incorrect: number;
      unattempted: number;
      percentage: number;
    }>>().notNull(),
    // Array of: { subject: string, correct: number, incorrect: number, unattempted: number, percentage: number }
    status: varchar("status", { length: 40 }).default("AUTO_GRADED_PENDING_MENTOR").notNull(),
    // "IN_PROGRESS" | "AUTO_GRADED_PENDING_MENTOR" | "PENDING_MENTOR_REVIEW" | "PUBLISHED_TO_STUDENT"
    mentorNotes: text("mentor_notes"),
    mentorFeedback: text("mentor_feedback"),
    reviewedAt: timestamp("reviewed_at"),
    publishedAt: timestamp("published_at"),

    // Optional compatibility fields for legacy views
    studentProfileId: text("student_profile_id"),
    studentName: text("student_name").default("داوطلب مشاهیر دانش"),
    examTitle: text("exam_title"),
    scorePercent: integer("score_percent"),
    subjectScores: jsonb("subject_scores").default({}).$type<Record<string, number>>(),
    rank: integer("rank"),
    deltaFromPrevious: integer("delta_from_previous").default(0),
    deltaFromBaseline: integer("delta_from_baseline").default(0),
  },
  (table) => ({
    examSubExamStudentIdx: index("exam_sub_exam_student_idx").on(table.examId, table.studentId),
    examSubStudentIdx: index("exam_sub_student_idx").on(table.studentId),
    examSubMentorIdx: index("exam_sub_mentor_idx").on(table.mentorId),
    examSubReviewedByIdx: index("exam_sub_reviewed_by_idx").on(table.reviewedById),
    examSubStatusIdx: index("exam_sub_status_idx").on(table.status),
    examSubmissionsStatusSubmittedIdx: index("exam_submissions_status_submitted_idx").on(table.status, table.submittedAt),
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
  isGhostMode: boolean("is_ghost_mode").default(false).notNull(),
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

// 30. Mentor Calling Windows (Daily 2-3 hours availability for Student-to-Coach AMI Calls)
export const mentorCallingWindows = pgTable("mentor_calling_windows", {
  id: text("id").primaryKey(),
  mentorId: text("mentor_id").references(() => users.id).notNull().unique(),
  startTime: varchar("start_time", { length: 10 }).default("17:00").notNull(), // "17:00"
  endTime: varchar("end_time", { length: 10 }).default("20:00").notNull(),   // "20:00"
  daysOfWeek: jsonb("days_of_week").default([0, 1, 2, 3, 4]).notNull(), // [0, 1, 2, 3, 4] Shanbeh to Chaharshanbeh
  dailyDurationHours: integer("daily_duration_hours").default(3).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  announcement: text("announcement"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 31. Garnet LMS Entitled Courses (Courses that include 360 Coaching/Support)
export const entitledCourses = pgTable("entitled_courses", {
  id: text("id").primaryKey(),
  courseCode: varchar("course_code", { length: 100 }).unique().notNull(), // e.g. "GARNET-BAR-360"
  courseName: text("course_name").notNull(), // e.g. "دوره طلایی جامع آمادگی آزمون وکالت کانون و مرکز وکلا"
  description: text("description"),
  priceFormatted: varchar("price_formatted", { length: 50 }).default("۵,۸۰۰,۰۰۰ تومان"),
  garnetPurchaseUrl: text("garnet_purchase_url").notNull(),
  hasSupport: boolean("has_support").default(true).notNull(),
  supportTier: varchar("support_tier", { length: 50 }).default("GOLD").notNull(),
  studyPlanStartDate: varchar("study_plan_start_date", { length: 50 }), // Jalali date e.g. "1405/08/02"
  studyPlanEndDate: varchar("study_plan_end_date", { length: 50 }),     // Jalali date e.g. "1406/04/30"
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 32. Friday Self-Assessment Reports
export const fridayReports = pgTable(
  "friday_reports",
  {
    id: text("id").primaryKey(),
    studentId: text("student_id").references(() => users.id).notNull(),
    studentProfileId: text("student_profile_id").references(() => studentProfiles.id),
    cohortId: text("cohort_id"),
    weekNumber: integer("week_number").notNull(),
    studyHoursCivil: integer("study_hours_civil").default(0).notNull(),
    studyHoursCriminal: integer("study_hours_criminal").default(0).notNull(),
    studyHoursTrade: integer("study_hours_trade").default(0).notNull(),
    studyHoursProcedure: integer("study_hours_procedure").default(0).notNull(),
    totalHours: integer("total_hours").default(0).notNull(),
    testsCount: integer("tests_count").default(0).notNull(),
    weakPoints: text("weak_points"),
    strengths: text("strengths"),
    studentNotes: text("student_notes"),
    status: varchar("status", { length: 30 }).default("SUBMITTED").notNull(), // 'SUBMITTED' | 'APPROVED' | 'REJECTED'
    mentorFeedback: text("mentor_feedback"),
    mentorReviewedAt: timestamp("mentor_reviewed_at"),
    supervisorApproval: boolean("supervisor_approval").default(false).notNull(),
    supervisorNotes: text("supervisor_notes"),
    supervisorApprovedAt: timestamp("supervisor_approved_at"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    fridayReportStudentIdx: index("friday_report_student_idx").on(table.studentId, table.weekNumber),
    fridayReportWeekIdx: index("friday_report_week_idx").on(table.weekNumber),
  })
);

// 33. Central SSO API Settings (Mashahir Danesh Central Account)
export const ssoApiSettings = pgTable("sso_api_settings", {
  id: text("id").primaryKey().default("default"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  serviceTitle: text("service_title").default("حساب کاربری مشاهیر دانش").notNull(),
  baseUrl: text("base_url").default("https://mashahiredanesh.com/GarnetAPI").notNull(),
  loginEndpoint: text("login_endpoint").default("/auth/loginMobile").notNull(),
  coursesEndpoint: text("courses_endpoint").default("/user/courses").notNull(),
  sendOtpEndpoint: text("send_otp_endpoint").default("/users/sendVerificationCodeByMobile").notNull(),
  verifyOtpEndpoint: text("verify_otp_endpoint").default("/users/checkVerificationCode").notNull(),
  productsEndpoint: text("products_endpoint").default("/invoices/productListByUser").notNull(),
  codeCount: integer("code_count").default(5).notNull(),
  apiKeyHeader: varchar("api_key_header", { length: 100 }).default("g-api-key").notNull(),
  apiKeyValue: text("api_key_value").default("AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5").notNull(),
  mobileFieldName: varchar("mobile_field_name", { length: 50 }).default("mobile").notNull(),
  passwordFieldName: varchar("password_field_name", { length: 50 }).default("password").notNull(),
  successStatusCode: integer("success_status_code").default(2000).notNull(),
  timeoutMs: integer("timeout_ms").default(8000).notNull(),
  autoCreateStudent: boolean("auto_create_student").default(true).notNull(),
  bypassCourseCheckIfNoEndpoint: boolean("bypass_course_check_if_no_endpoint").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 34. System Audit Logs (Comprehensive audit trail for admin/executive oversight)
export const systemAuditLogs = pgTable(
  "system_audit_logs",
  {
    id: text("id").primaryKey(), // "sys_log_{nanoid}"
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name").notNull(),
    actorRole: varchar("actor_role", { length: 30 }).notNull(),
    eventType: varchar("event_type", { length: 50 }).notNull(), // "AUTH" | "CHANNEL" | "COURSE" | "MESSAGE" | "VOICE" | "VOIP_CALL" | "STUDY_PLAN" | "EXAM" | "TASK" | "USER_MGMT"
    action: text("action").notNull(),
    targetEntity: varchar("target_entity", { length: 50 }).notNull(),
    targetId: text("target_id"),
    details: text("details"),
    metadata: jsonb("metadata").default({}),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    sysAuditActorIdx: index("sys_audit_actor_idx").on(table.actorId),
    sysAuditEventIdx: index("sys_audit_event_idx").on(table.eventType),
    sysAuditCreatedIdx: index("sys_audit_created_idx").on(table.createdAt),
  })
);


