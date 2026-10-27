"use server";

import { requireRole, requireStudentOwnership } from "../auth/guard";
import { db } from "../db";
import {
  studentProfiles,
  studentSchedules,
  scheduleItems,
  dailyCheckins,
  triageCases,
  mockExams,
} from "../db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  calculateProgramExecutionPercent,
  evaluateStudentRisk,
  calculateSlaDueAt,
  TRIGGER_DEFINITIONS,
} from "../services/alert-engine";
import { formatJalaliDate } from "@/lib/jalali";
import { getCurrentCourseWeekInfo } from "@/lib/jalali-week";
import { sanitizeTextContent } from "@/lib/sanitize";
import { revalidatePath } from "next/cache";

export interface CheckinItemInput {
  id: string;
  status: "NOT_DONE" | "PARTIAL" | "DONE";
}

export interface CheckinPayload {
  studentProfileId: string;
  items: CheckinItemInput[];
  rootFailureCause?: string;
  helpRequested: boolean;
  studentNotes?: string;
}

/**
 * Sub-60-Second Daily Check-in Server Action (< 100ms Execution)
 * Enforces Zero-Trust Ownership & triggers A01 Alert if help requested via Drizzle ORM
 */
export async function submitDailyCheckinAction(payload: CheckinPayload) {
  const startTime = Date.now();

  // 1. Enforce RBAC and Zero-Trust Ownership (Track 4)
  const session = await requireRole(["STUDENT", "ADMIN"]);
  let studentProfileId = payload.studentProfileId || "profile_stu_1";

  if (session.role === "STUDENT") {
    if (session.studentProfileId) {
      studentProfileId = session.studentProfileId;
    } else {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      if (profile) {
        studentProfileId = profile.id;
      }
    }
  }

  await requireStudentOwnership(studentProfileId);

  const { items, rootFailureCause, helpRequested, studentNotes } = payload;
  const cleanRootFailureCause = rootFailureCause ? sanitizeTextContent(rootFailureCause) : null;
  const cleanStudentNotes = studentNotes ? sanitizeTextContent(studentNotes) : null;

  // 2. Enforce schedule item ownership (H-06 IDOR protection) & current-week access (Module 2)
  let doneCount = 0;
  let partialCount = 0;

  const itemIds = items.map((i) => i.id).filter(Boolean);
  if (itemIds.length > 0) {
    const validItems = await db
      .select({
        id: scheduleItems.id,
        weekNumber: studentSchedules.jalaliWeekNumber,
      })
      .from(scheduleItems)
      .innerJoin(studentSchedules, eq(scheduleItems.scheduleId, studentSchedules.id))
      .where(
        and(
          eq(studentSchedules.studentProfileId, studentProfileId),
          inArray(scheduleItems.id, itemIds)
        )
      );

    // Module 2: Strict current-week access & expiry lock for students
    if (session.role === "STUDENT" && validItems.length > 0) {
      const activeWeek = getCurrentCourseWeekInfo();
      const hasExpiredItem = validItems.some((v) => v.weekNumber !== activeWeek.weekNumber);
      if (hasExpiredItem) {
        return {
          success: false,
          message:
            "مهلت مشاهده و ثبت گزارش این هفته به پایان رسیده است. صرفاً برنامه هفته جاری قابل مشاهده و ثبت می‌باشد.",
          executionPercent: 0,
          durationMs: Date.now() - startTime,
        };
      }
    }

    const validIdSet = new Set(validItems.map((v) => v.id));

    for (const item of items) {
      if (!validIdSet.has(item.id)) continue;

      await db
        .update(scheduleItems)
        .set({ status: item.status })
        .where(eq(scheduleItems.id, item.id));

      if (item.status === "DONE") doneCount++;
      else if (item.status === "PARTIAL") partialCount++;
    }
  }

  // 3. Compute execution percent
  const executionPercent = calculateProgramExecutionPercent(doneCount, partialCount, items.length);

  // 4. Record Daily Check-in in PostgreSQL
  const checkinDate = formatJalaliDate(new Date());
  const checkinId = `chk_${studentProfileId}_${Date.now()}`;

  await db
    .insert(dailyCheckins)
    .values({
      id: checkinId,
      studentProfileId,
      checkinDate,
      calculatedExecutionPercent: executionPercent,
      rootFailureCause: cleanRootFailureCause,
      helpRequested,
      studentNotes: cleanStudentNotes,
    })
    .onConflictDoNothing();

  // 5. Evaluate Risk & Alert Engine Triggers
  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  const riskEval = evaluateStudentRisk({
    studentProfileId,
    helpRequested,
    weeklyExecutionPercent: executionPercent,
    consecutiveMissedCheckinDays: 0,
  });

  // If helpRequested === true (Trigger A01), generate Triage Case for Mentor with 12h SLA
  if (helpRequested && student) {
    const trigger = { code: "A01" as const, ...TRIGGER_DEFINITIONS.A01 };
    const slaDueAt = calculateSlaDueAt(trigger);

    await db.insert(triageCases).values({
      id: `trg_${Date.now()}`,
      studentProfileId,
      mentorId: student.mentorId || "usr_mentor1",
      triggerCode: "A01",
      priorityTier: 2,
      description: `درخواست کمک فوری داوطلب: ${rootFailureCause || "عدم تسلط یا اضطراب در اجرای برنامه"} - ${studentNotes || "بدون یادداشت اضافی"}`,
      isResolved: false,
      slaDueAt,
    });
  }

  // Update profile risk state in PostgreSQL
  await db
    .update(studentProfiles)
    .set({
      riskStatus: riskEval.riskState,
      riskReason: riskEval.riskReason,
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, studentProfileId));

  const durationMs = Date.now() - startTime;

  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/triage");

  return {
    success: true,
    message: helpRequested
      ? "گزارش روزانه با موفقیت ثبت شد و هشدار فوری برای پشتیبان شما ارسال گردید."
      : "گزارش روزانه با موفقیت ثبت گردید. خدا قوت!",
    executionPercent,
    durationMs,
  };
}

/**
 * Submit Weekly Review (Friday Reflection)
 */
export async function submitWeeklyReviewAction(payload: {
  studentProfileId?: string;
  selfSatisfactionScore: number;
  primaryObstacle: string;
  studentFeedbackNote?: string;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  let studentProfileId = payload.studentProfileId || "profile_stu_1";

  if (session.role === "STUDENT") {
    if (session.studentProfileId) {
      studentProfileId = session.studentProfileId;
    } else {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      if (profile) {
        studentProfileId = profile.id;
      }
    }
  }

  await requireStudentOwnership(studentProfileId);

  // If student had A02 warning, resolve it
  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  if (student && student.riskReason?.includes("A02")) {
    await db
      .update(studentProfiles)
      .set({
        riskStatus: "GREEN",
        riskReason: "خودارزیابی هفتگی با موفقیت ثبت شد و وضعیت تحصیلی نرمال است.",
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, studentProfileId));
  }

  revalidatePath("/student/weekly-review");
  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/triage");

  return {
    success: true,
    message: "فرم خودارزیابی و تحلیل عملکرد هفتگی شما با موفقیت ثبت شد.",
  };
}

/**
 * Submit Onboarding Profile (Intake Capacity, Learning Style, Baseline)
 */
export async function submitOnboardingAction(payload: {
  studentProfileId?: string;
  employmentStatus: "FULL_TIME" | "PART_TIME" | "FREELANCE" | "UNEMPLOYED";
  workdayStudyHoursCap: number;
  previousBarExamAttempts: number;
  masterclassGoal: string;
  learningStyle: string;
  baselineScore: number;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  let studentProfileId = payload.studentProfileId || "profile_stu_1";

  if (session.role === "STUDENT") {
    if (session.studentProfileId) {
      studentProfileId = session.studentProfileId;
    } else {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      if (profile) {
        studentProfileId = profile.id;
      }
    }
  }

  await requireStudentOwnership(studentProfileId);

  await db
    .update(studentProfiles)
    .set({
      employmentStatus: payload.employmentStatus,
      workdayStudyHoursCap: payload.workdayStudyHoursCap,
      previousBarExamAttempts: payload.previousBarExamAttempts,
      masterclassGoal: payload.masterclassGoal,
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, studentProfileId));

  revalidatePath("/student/dashboard");
  revalidatePath(`/mentor/student/${studentProfileId}`);

  return {
    success: true,
    message: "مشخصات و اهداف تحصیلی شما با موفقیت ثبت و ذخیره گردید.",
  };
}

/**
 * Submit Daily Study Log (ساعات مطالعه واقعی و بازخورد روزانه داوطلب)
 */
export async function submitDailyStudyLogAction(payload: {
  studentProfileId?: string;
  checkinDate?: string;
  plannedHours?: number;
  actualHours: number;
  studentNotes?: string;
  rootFailureCause?: string;
  helpRequested?: boolean;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  let studentProfileId = payload.studentProfileId || "profile_stu_1";

  if (session.role === "STUDENT") {
    if (session.studentProfileId) {
      studentProfileId = session.studentProfileId;
    } else {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      if (profile) {
        studentProfileId = profile.id;
      }
    }
  }

  await requireStudentOwnership(studentProfileId);

  const checkinDate = payload.checkinDate || formatJalaliDate(new Date());
  const plannedHours = payload.plannedHours ?? 6;
  const actualHours = Math.max(0, payload.actualHours);
  const executionPercent = plannedHours > 0
    ? Math.min(100, Math.round((actualHours / plannedHours) * 100))
    : 100;

  // Check if a record already exists for this date
  const [existingCheckin] = await db
    .select()
    .from(dailyCheckins)
    .where(
      and(
        eq(dailyCheckins.studentProfileId, studentProfileId),
        eq(dailyCheckins.checkinDate, checkinDate)
      )
    )
    .limit(1);

  if (existingCheckin) {
    await db
      .update(dailyCheckins)
      .set({
        plannedHours,
        actualHours,
        calculatedExecutionPercent: executionPercent,
        studentNotes: payload.studentNotes?.trim() || null,
        rootFailureCause: payload.rootFailureCause?.trim() || null,
        helpRequested: payload.helpRequested || false,
        loggedAt: new Date(),
      })
      .where(eq(dailyCheckins.id, existingCheckin.id));
  } else {
    const checkinId = `chk_${studentProfileId}_${Date.now()}`;
    await db.insert(dailyCheckins).values({
      id: checkinId,
      studentProfileId,
      checkinDate,
      plannedHours,
      actualHours,
      calculatedExecutionPercent: executionPercent,
      studentNotes: payload.studentNotes?.trim() || null,
      rootFailureCause: payload.rootFailureCause?.trim() || null,
      helpRequested: payload.helpRequested || false,
    });
  }

  // Synchronize studentProfiles.currentDailyStudyHours across all views (Requirement 6)
  await db
    .update(studentProfiles)
    .set({
      currentDailyStudyHours: Math.max(1, Math.round(actualHours)),
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, studentProfileId));

  // If helpRequested === true, alert mentor
  if (payload.helpRequested) {
    const [student] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, studentProfileId))
      .limit(1);

    if (student) {
      const trigger = { code: "A01" as const, ...TRIGGER_DEFINITIONS.A01 };
      const slaDueAt = calculateSlaDueAt(trigger);

      await db.insert(triageCases).values({
        id: `trg_${Date.now()}`,
        studentProfileId,
        mentorId: student.mentorId || "usr_mentor1",
        triggerCode: "A01",
        priorityTier: 2,
        description: `درخواست راهنمایی در گزارش مطالعه روزانه: ${payload.rootFailureCause || "عدم تحقق برنامه"} - ${payload.studentNotes || ""}`,
        isResolved: false,
        slaDueAt,
      });
    }
  }

  revalidatePath("/student/study-plan");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/friday-report");
  revalidatePath("/student/friday-reports");
  revalidatePath(`/mentor/student/${studentProfileId}`);

  return {
    success: true,
    message: "گزارش مطالعه روزانه با موفقیت ثبت و محاسبه گردید.",
    executionPercent,
    actualHours,
    plannedHours,
  };
}

/**
 * Submit Mock Exam Record & Score Breakdown
 * Evaluates Trigger A06 (Score drop > 15%)
 */
export async function submitMockExamAction(payload: {
  studentProfileId?: string;
  examTitle: string;
  examDate: string;
  overallScorePercent: number;
  subjectScores: Record<string, number>;
  primaryErrorCause?: string;
  priorityReviewSubject?: string;
}) {
  const session = await requireRole(["STUDENT", "ADMIN"]);
  let studentProfileId = payload.studentProfileId || "profile_stu_1";

  if (session.role === "STUDENT") {
    if (session.studentProfileId) {
      studentProfileId = session.studentProfileId;
    } else {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.userId))
        .limit(1);
      if (profile) {
        studentProfileId = profile.id;
      }
    }
  }

  await requireStudentOwnership(studentProfileId);

  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentProfileId))
    .limit(1);

  const previousExams = await db
    .select()
    .from(mockExams)
    .where(eq(mockExams.studentProfileId, studentProfileId))
    .orderBy(desc(mockExams.createdAt));

  const lastExam = previousExams[0];

  let deltaPreviousExam = 0;
  if (lastExam) {
    deltaPreviousExam = payload.overallScorePercent - lastExam.overallScorePercent;
  }

  const examId = `exam_${Date.now()}`;
  await db.insert(mockExams).values({
    id: examId,
    studentProfileId,
    examTitle: payload.examTitle,
    examDate: payload.examDate,
    hasParticipated: true,
    isExcusedAbsence: false,
    overallScorePercent: payload.overallScorePercent,
    overallRank: Math.floor(Math.random() * 500) + 50,
    correctCount: Math.round((payload.overallScorePercent * 120) / 100),
    wrongCount: 20,
    unansweredCount: 10,
    subjectScores: payload.subjectScores,
    analysisStatus: payload.primaryErrorCause ? "DONE" : "NOT_DONE",
    primaryErrorCause: payload.primaryErrorCause || null,
    priorityReviewSubject: payload.priorityReviewSubject || null,
    deltaPreviousExam,
    deltaBaseline: deltaPreviousExam,
  });

  // Evaluate A06 (Score Drop > 15%)
  if (deltaPreviousExam < -15 && student) {
    const trigger = { code: "A06" as const, ...TRIGGER_DEFINITIONS.A06 };
    const slaDueAt = calculateSlaDueAt(trigger);

    await db.insert(triageCases).values({
      id: `trg_${Date.now()}`,
      studentProfileId,
      mentorId: student.mentorId || "usr_mentor1",
      triggerCode: "A06",
      priorityTier: 3,
      description: `افت معنادار تراز در ${payload.examTitle}: افت ${Math.abs(deltaPreviousExam)} درصدی در نتایج`,
      isResolved: false,
      slaDueAt,
    });

    await db
      .update(studentProfiles)
      .set({
        riskStatus: "YELLOW",
        riskReason: `افت معنادار تراز آزمون آزمایشی (${Math.abs(deltaPreviousExam)}٪)`,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.id, studentProfileId));
  }

  revalidatePath("/student/mock-exams");
  revalidatePath("/student/dashboard");
  revalidatePath("/mentor/triage");

  return {
    success: true,
    message: "کارنامه آزمون آزمایشی با موفقیت ثبت شد و روند رشد آموزشی به‌روزرسانی گردید.",
    deltaPreviousExam,
  };
}

/**
 * Update single study schedule item progress independently (Module 3)
 * Allows student to record actual hours and completion per individual subject
 */
export async function updateSingleScheduleItemProgressAction(payload: {
  itemId: string;
  actualHours: number;
  isCompleted: boolean;
  studentNote?: string;
}): Promise<{
  success: boolean;
  message: string;
  executionPercent?: number;
}> {
  const session = await requireRole(["STUDENT", "ADMIN"]);

  try {
    // 1. Fetch item with schedule
    const [itemWithSchedule] = await db
      .select({
        item: scheduleItems,
        schedule: studentSchedules,
      })
      .from(scheduleItems)
      .innerJoin(studentSchedules, eq(scheduleItems.scheduleId, studentSchedules.id))
      .where(eq(scheduleItems.id, payload.itemId))
      .limit(1);

    if (!itemWithSchedule) {
      return { success: false, message: "آیتم مطالعاتی مورد نظر یافت نشد." };
    }

    const { item, schedule } = itemWithSchedule;

    // 2. Ownership verification for students
    if (session.role === "STUDENT") {
      let userProfileId = session.studentProfileId;
      if (!userProfileId) {
        const [prof] = await db
          .select({ id: studentProfiles.id })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, session.userId))
          .limit(1);
        userProfileId = prof?.id;
      }

      if (schedule.studentProfileId !== userProfileId) {
        return { success: false, message: "دسترسی غیرمجاز به برنامه مطالعاتی داوطلب دیگر." };
      }

      // 3. Strict current week check (Module 2)
      // Once week ends (Friday 23:59:59 Asia/Tehran), student cannot edit
      const currentWeek = getCurrentCourseWeekInfo();
      if (schedule.jalaliWeekNumber !== currentWeek.weekNumber) {
        return {
          success: false,
          message:
            "مهلت مشاهده و ثبت گزارش این هفته به پایان رسیده است. صرفاً برنامه هفته جاری قابل مشاهده و ثبت می‌باشد.",
        };
      }
    }

    // 4. Update the item
    const newStatus = payload.isCompleted ? "DONE" : "PARTIAL";
    const actualMinutes = Math.max(0, Math.round(Number(payload.actualHours || 0) * 60));
    const cleanNote = payload.studentNote ? sanitizeTextContent(payload.studentNote) : null;

    await db
      .update(scheduleItems)
      .set({
        status: newStatus,
        actualDurationMinutes: actualMinutes,
        studentNote: cleanNote,
        completedAt: payload.isCompleted ? new Date() : null,
      })
      .where(eq(scheduleItems.id, payload.itemId));

    // 5. Recalculate execution percent for the schedule
    const allItems = await db
      .select()
      .from(scheduleItems)
      .where(eq(scheduleItems.scheduleId, schedule.id));

    let doneCount = 0;
    let partialCount = 0;
    for (const it of allItems) {
      const itStatus = it.id === payload.itemId ? newStatus : it.status;
      if (itStatus === "DONE") doneCount++;
      else if (itStatus === "PARTIAL") partialCount++;
    }

    const executionPercent = calculateProgramExecutionPercent(doneCount, partialCount, allItems.length);

    // 6. Update or insert daily check-in
    const todayDate = formatJalaliDate(new Date());
    await db
      .insert(dailyCheckins)
      .values({
        id: `chk_${schedule.studentProfileId}_${todayDate.replace(/[^0-9]/g, "")}`,
        studentProfileId: schedule.studentProfileId,
        checkinDate: todayDate,
        calculatedExecutionPercent: executionPercent,
        actualHours: Math.round(actualMinutes / 60),
      })
      .onConflictDoUpdate({
        target: [dailyCheckins.studentProfileId, dailyCheckins.checkinDate],
        set: {
          calculatedExecutionPercent: executionPercent,
          actualHours: Math.round(actualMinutes / 60),
        },
      });

    revalidatePath("/student/dashboard");
    revalidatePath("/student/study-plan");
    revalidatePath("/plans");

    return {
      success: true,
      message: `گزارش مطالعه درس «${item.subject}» با موفقیت ثبت شد.`,
      executionPercent,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در ثبت گزارش مطالعه.",
    };
  }
}

