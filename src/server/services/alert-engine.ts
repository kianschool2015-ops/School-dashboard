/**
 * Deterministic Alert Engine & Academic Coaching Quantitative Metrics Engine
 * Evaluates triggers A01 - A09, SLA boundaries, and aggregate risk state (RED, YELLOW, GREEN)
 */

export type RiskState = "GREEN" | "YELLOW" | "RED";

export interface AlertTrigger {
  code: "A01" | "A02" | "A03" | "A04" | "A05" | "A06" | "A07" | "A08" | "A09";
  tier: 1 | 2 | 3 | 4 | 5 | 6; // Tier 1 = Crisis (Highest priority), Tier 6 = Lowest
  slaHours: number;
  title: string;
  description: string;
  escalateToSupervisor?: boolean;
}

export interface StudentEvaluationContext {
  studentProfileId: string;
  helpRequested?: boolean;
  weeklyReflectionSubmitted?: boolean;
  weeklyExecutionPercent?: number; // 0 - 100
  consecutiveBacklogWeeks?: number;
  missedMockExamUnexcused?: boolean;
  mockExamScoreDropPercent?: number; // e.g. 18 means 18% drop
  mockExamAnalysisPendingHours?: number; // hours since exam without analysis
  consecutiveMissedCheckinDays?: number; // e.g. 4 days
  hasOverdueUnresolvedCase?: boolean;
}

export interface EvaluationResult {
  studentProfileId: string;
  riskState: RiskState;
  riskReason: string;
  activeTriggers: AlertTrigger[];
  highestPriorityTier: number | null;
}

/**
 * Trigger Definitions according to Master Specification Section 5
 */
export const TRIGGER_DEFINITIONS: Record<AlertTrigger["code"], Omit<AlertTrigger, "code">> = {
  A01: {
    tier: 2,
    slaHours: 12,
    title: "درخواست کمک فوری داوطلب",
    description: "درخواست کمک فوری داوطلب در گزارش روزانه",
  },
  A02: {
    tier: 5,
    slaHours: 24,
    title: "عدم ثبت خودارزیابی هفتگی",
    description: "عدم ثبت فرم خودارزیابی هفتگی در مهلت مقرر (شنبه ساعت ۱۲:۰۰)",
  },
  A03: {
    tier: 4, // If < 50% Tier 4, if 50%-69% Tier 6
    slaHours: 48,
    title: "افت درصد اجرای برنامه مطالعاتی",
    description: "درصد اجرای برنامه مطالعاتی کمتر از حد استاندارد است",
  },
  A04: {
    tier: 4,
    slaHours: 48,
    title: "انباشت مباحث جبرانی",
    description: "انباشت مباحث جبرانی در دو هفته پیاپی",
  },
  A05: {
    tier: 3,
    slaHours: 24,
    title: "غیبت غیرموجه در آزمون",
    description: "غیبت غیرموجه در آزمون آزمایشی کانون/مرکز وکلا",
  },
  A06: {
    tier: 3,
    slaHours: 48,
    title: "افت تراز آزمون آزمایشی",
    description: "افت معنادار تراز آزمون آزمایشی بیش از ۱۵٪ نسبت به آزمون قبلی یا پایه",
  },
  A07: {
    tier: 3,
    slaHours: 48,
    title: "عدم ثبت تحلیل کارنامه",
    description: "عدم ثبت تحلیل کارنامه آزمون آزمایشی پس از گذشت ۷۲ ساعت",
  },
  A08: {
    tier: 1, // Crisis
    slaHours: 6,
    title: "قطع ارتباط کامل (بحران)",
    description: "قطع ارتباط کامل داوطلب (بیش از ۴ روز عدم ثبت گزارش و سکوت)",
  },
  A09: {
    tier: 5,
    slaHours: 24,
    title: "پرونده پایش منقضی شده",
    description: "پرونده پایش آموزشی منقضی شده بدون تعیین تکلیف توسط پشتیبان (ارجاع به سرپرست)",
    escalateToSupervisor: true,
  },
};

/**
 * Quantitative Metrics Calculation
 */
export function calculateProgramExecutionPercent(
  doneCount: number,
  partialCount: number,
  totalItems: number
): number {
  if (totalItems <= 0) return 0;
  const raw = ((doneCount + 0.5 * partialCount) / totalItems) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function calculateConsistencyPercent(activeLoggingDays: number): number {
  if (activeLoggingDays <= 0) return 0;
  const raw = (activeLoggingDays / 7) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function calculateCoachingAdherencePercent(
  doneMissions: number,
  partialMissions: number,
  totalMissions: number
): number {
  if (totalMissions <= 0) return 0;
  const raw = ((doneMissions + 0.5 * partialMissions) / totalMissions) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function calculateSlaCompliancePercent(
  resolvedWithinSlaCount: number,
  totalTriggeredCases: number
): number {
  if (totalTriggeredCases <= 0) return 100;
  const raw = (resolvedWithinSlaCount / totalTriggeredCases) * 100;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Pure function: Evaluates context and generates active alerts and aggregate risk status
 */
export function evaluateStudentRisk(context: StudentEvaluationContext): EvaluationResult {
  const activeTriggers: AlertTrigger[] = [];

  // A01: helpRequested === true
  if (context.helpRequested) {
    activeTriggers.push({
      code: "A01",
      ...TRIGGER_DEFINITIONS.A01,
    });
  }

  // A08: Consecutive missed check-ins >= 4 days (Checked early due to Tier 1 urgency)
  if (
    context.consecutiveMissedCheckinDays !== undefined &&
    context.consecutiveMissedCheckinDays >= 4
  ) {
    activeTriggers.push({
      code: "A08",
      ...TRIGGER_DEFINITIONS.A08,
    });
  }

  // A02: Weekly reflection missing
  if (context.weeklyReflectionSubmitted === false) {
    activeTriggers.push({
      code: "A02",
      ...TRIGGER_DEFINITIONS.A02,
    });
  }

  // A03: Weekly execution < 50% (Tier 4, SLA 48h) or < 70% (Tier 6, SLA 72h)
  if (context.weeklyExecutionPercent !== undefined) {
    if (context.weeklyExecutionPercent < 50) {
      activeTriggers.push({
        code: "A03",
        tier: 4,
        slaHours: 48,
        title: "اجرای بحرانی برنامه (زیر ۵۰٪)",
        description: `درصد اجرای برنامه هفتگی ${context.weeklyExecutionPercent}٪ است (کمتر از ۵۰٪)`,
      });
    } else if (context.weeklyExecutionPercent < 70) {
      activeTriggers.push({
        code: "A03",
        tier: 6,
        slaHours: 72,
        title: "افت اجرای برنامه (زیر ۷۰٪)",
        description: `درصد اجرای برنامه هفتگی ${context.weeklyExecutionPercent}٪ است (بین ۵۰٪ تا ۷۰٪)`,
      });
    }
  }

  // A04: Backlog accumulated >= 2 consecutive weeks
  if (
    context.consecutiveBacklogWeeks !== undefined &&
    context.consecutiveBacklogWeeks >= 2
  ) {
    activeTriggers.push({
      code: "A04",
      ...TRIGGER_DEFINITIONS.A04,
    });
  }

  // A05: Unexcused absence in Mock Exam
  if (context.missedMockExamUnexcused) {
    activeTriggers.push({
      code: "A05",
      ...TRIGGER_DEFINITIONS.A05,
    });
  }

  // A06: Mock exam score drop > 15%
  if (
    context.mockExamScoreDropPercent !== undefined &&
    context.mockExamScoreDropPercent > 15
  ) {
    activeTriggers.push({
      code: "A06",
      ...TRIGGER_DEFINITIONS.A06,
      description: `افت معنادار تراز آزمون آزمایشی به میزان ${context.mockExamScoreDropPercent}٪`,
    });
  }

  // A07: Mock exam analysis not submitted after 72 hours
  if (
    context.mockExamAnalysisPendingHours !== undefined &&
    context.mockExamAnalysisPendingHours >= 72
  ) {
    activeTriggers.push({
      code: "A07",
      ...TRIGGER_DEFINITIONS.A07,
    });
  }

  // A09: Overdue unresolved case
  if (context.hasOverdueUnresolvedCase) {
    activeTriggers.push({
      code: "A09",
      ...TRIGGER_DEFINITIONS.A09,
    });
  }

  // Determine highest priority tier (1 is highest, 6 is lowest)
  let highestPriorityTier: number | null = null;
  if (activeTriggers.length > 0) {
    highestPriorityTier = Math.min(...activeTriggers.map((t) => t.tier));
  }

  // Aggregate Risk State Logic:
  // RED: Any Tier 1 alert active OR >= 3 simultaneous active alerts.
  // YELLOW: 1 to 2 active alerts.
  // GREEN: 0 active alerts.
  const hasTier1 = activeTriggers.some((t) => t.tier === 1);
  let riskState: RiskState = "GREEN";
  let riskReason = "وضعیت آموزشی پایدار و مطابق با برنامه";

  if (hasTier1 || activeTriggers.length >= 3) {
    riskState = "RED";
    if (hasTier1) {
      riskReason = "بحران آموزشی: قطع ارتباط یا افت حاد شناسایی شد";
    } else {
      riskReason = `وضعیت قرمز: انباشت ${activeTriggers.length} هشدار همزمان`;
    }
  } else if (activeTriggers.length >= 1) {
    riskState = "YELLOW";
    riskReason = `هشدار: ${activeTriggers.map((t) => t.title).join("، ")}`;
  }

  return {
    studentProfileId: context.studentProfileId,
    riskState,
    riskReason,
    activeTriggers,
    highestPriorityTier,
  };
}

/**
 * Calculates SLA due timestamp given an alert trigger
 */
export function calculateSlaDueAt(trigger: AlertTrigger, fromDate: Date = new Date()): Date {
  const due = new Date(fromDate);
  due.setHours(due.getHours() + trigger.slaHours);
  return due;
}
