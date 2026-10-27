/**
 * Jalali Study Week Temporal Engine (Saturday to Friday)
 * Evaluates strict course week boundaries in Asia/Tehran timezone.
 * Aligns Iranian Bar Exam (کانون و مرکز وکلا) coaching timelines.
 */

import {
  gregorianToJalali,
  jalaliToGregorian,
  formatJalaliDate,
  toPersianDigits,
  toEnglishDigits,
  getPersianDayOfWeek,
  getStudyWeekBoundaries,
} from "./jalali";

export interface CourseWeekInfo {
  weekNumber: number;
  totalWeeks: number;
  currentWeekStartJalali: string;
  currentWeekEndJalali: string;
  startDateJalali: string;
  endDateJalali: string;
  isCourseStarted: boolean;
  isCourseEnded: boolean;
  daysRemainingInWeek: number;
  formattedBadge: string;
  currentSaturdayDate: Date;
  currentFridayDate: Date;
}

/**
 * Parses a Jalali string ("1404/08/02", "۱۴۰۵/۰۸/۰۲", "1404-08-02") or standard ISO date string
 * into a valid Gregorian Date object set to 00:00:00 in Asia/Tehran.
 */
export function parseJalaliOrIsoDate(input?: string | null): Date | null {
  if (!input || typeof input !== "string" || input.trim() === "") {
    return null;
  }

  const clean = toEnglishDigits(input.trim());

  // Check for Jalali format: YYYY/MM/DD or YYYY-MM-DD
  const jalaliMatch = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (jalaliMatch) {
    const jy = parseInt(jalaliMatch[1], 10);
    const jm = parseInt(jalaliMatch[2], 10);
    const jd = parseInt(jalaliMatch[3], 10);

    if (jy >= 1300 && jy <= 1500 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
      // Return date at 00:00:00 UTC representing Tehran local day
      const d = new Date(Date.UTC(gy, gm - 1, gd, 0, 0, 0));
      return d;
    }
  }

  // Fallback to standard JavaScript date parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Returns Date adjusted to Asia/Tehran midnight for calendar arithmetic
 */
export function getTehranMidnight(date: Date = new Date()): Date {
  const tehranStr = date.toLocaleString("en-US", { timeZone: "Asia/Tehran" });
  const tehranDate = new Date(tehranStr);
  return new Date(tehranDate.getFullYear(), tehranDate.getMonth(), tehranDate.getDate(), 0, 0, 0);
}

/**
 * Calculates current course week info based on course start date and optional end date.
 * Every study week strictly starts on Saturday 00:00:00 and ends on Friday 23:59:59.
 */
export function getCurrentCourseWeekInfo(
  studyPlanStartDate?: string | null,
  studyPlanEndDate?: string | null,
  referenceDate: Date = new Date()
): CourseWeekInfo {
  // 1. Current week Saturday-to-Friday boundaries
  const now = referenceDate;
  const currentDayOfWeek = getPersianDayOfWeek(now); // 0 (Sat) - 6 (Fri)

  // Current week's Saturday
  const currentSaturday = new Date(now);
  currentSaturday.setDate(now.getDate() - currentDayOfWeek);
  currentSaturday.setHours(0, 0, 0, 0);

  // Current week's Friday
  const currentFriday = new Date(currentSaturday);
  currentFriday.setDate(currentSaturday.getDate() + 6);
  currentFriday.setHours(23, 59, 59, 999);

  const currentWeekStartJalali = formatJalaliDate(currentSaturday, "/");
  const currentWeekEndJalali = formatJalaliDate(currentFriday, "/");

  // 2. Parse course start date
  const parsedStart = parseJalaliOrIsoDate(studyPlanStartDate);
  const parsedEnd = parseJalaliOrIsoDate(studyPlanEndDate);

  let weekNumber = 1;
  let totalWeeks = 24; // Default standard Bar Exam syllabus: 24 weeks
  let isCourseStarted = true;
  let isCourseEnded = false;

  let startDateJalali = studyPlanStartDate || currentWeekStartJalali;
  let endDateJalali = studyPlanEndDate || "";

  if (parsedStart) {
    startDateJalali = formatJalaliDate(parsedStart, "/");

    // Align course start date to the Saturday of its week
    const startDayOfWeek = getPersianDayOfWeek(parsedStart);
    const startSaturday = new Date(parsedStart);
    startSaturday.setDate(parsedStart.getDate() - startDayOfWeek);
    startSaturday.setHours(0, 0, 0, 0);

    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffMs = currentSaturday.getTime() - startSaturday.getTime();

    if (diffMs < 0) {
      // Course has not started yet
      weekNumber = 1;
      isCourseStarted = false;
    } else {
      // 1-indexed week calculation
      const elapsedWeeks = Math.floor(diffMs / msPerWeek);
      weekNumber = Math.max(1, elapsedWeeks + 1);
    }

    if (parsedEnd) {
      endDateJalali = formatJalaliDate(parsedEnd, "/");
      const endDayOfWeek = getPersianDayOfWeek(parsedEnd);
      const endFriday = new Date(parsedEnd);
      endFriday.setDate(parsedEnd.getDate() + (6 - endDayOfWeek));
      endFriday.setHours(23, 59, 59, 999);

      const totalSpanMs = endFriday.getTime() - startSaturday.getTime();
      if (totalSpanMs > 0) {
        totalWeeks = Math.max(1, Math.ceil(totalSpanMs / msPerWeek));
      }

      if (now.getTime() > endFriday.getTime()) {
        isCourseEnded = true;
      }
    }
  } else {
    // If no course start date is set, fallback to annual Jalali week
    const boundaries = getStudyWeekBoundaries(now);
    weekNumber = boundaries.jalaliWeekNumber;
    totalWeeks = 52;
  }

  // Days remaining until Friday 23:59:59
  const daysRemainingInWeek = Math.max(0, 6 - currentDayOfWeek);

  // Formatted Persian Badge: هفته مطالعاتی [شماره هفته] از [کل هفته‌ها] (شنبه [تاریخ شروع] الی جمعه [تاریخ پایان])
  const formattedBadge = `هفته مطالعاتی ${toPersianDigits(weekNumber)} از ${toPersianDigits(
    totalWeeks
  )} (شنبه ${toPersianDigits(currentWeekStartJalali)} الی جمعه ${toPersianDigits(
    currentWeekEndJalali
  )})`;

  return {
    weekNumber,
    totalWeeks,
    currentWeekStartJalali,
    currentWeekEndJalali,
    startDateJalali,
    endDateJalali,
    isCourseStarted,
    isCourseEnded,
    daysRemainingInWeek,
    formattedBadge,
    currentSaturdayDate: currentSaturday,
    currentFridayDate: currentFriday,
  };
}

/**
 * Lock check: Is the requested week editable/viewable by student?
 * Returns true if the week is strictly expired (past Friday 23:59:59 Asia/Tehran) or future week.
 */
export function isStudentWeekLocked(
  targetWeekNumber: number,
  currentActiveWeekNumber: number
): { isLocked: boolean; reason?: string } {
  if (targetWeekNumber < currentActiveWeekNumber) {
    return {
      isLocked: true,
      reason:
        "مهلت مشاهده و ثبت گزارش این هفته به پایان رسیده است. صرفاً برنامه هفته جاری قابل مشاهده و ثبت می‌باشد.",
    };
  }

  if (targetWeekNumber > currentActiveWeekNumber) {
    return {
      isLocked: true,
      reason:
        "برنامه این هفته هنوز فعال نشده است. محتوای هر هفته با آغاز شنبه آن هفته در دسترس داوطلب قرار می‌گیرد.",
    };
  }

  return { isLocked: false };
}
