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
  phoneNumber: varchar("phone_number", { length: 15 }).unique().notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").default("STUDENT").notNull(),
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
