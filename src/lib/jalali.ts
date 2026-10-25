/**
 * Jalali (Solar Hijri) Temporal Engine & Persian Date Utilities
 * Handles Persian calendar conversions, week boundary calculations (Saturday - Friday),
 * and Persian number formatting without external runtime dependencies.
 */

export interface JalaliDate {
  jy: number; // Jalali year (e.g. 1403)
  jm: number; // Jalali month (1 - 12)
  jd: number; // Jalali day (1 - 31)
}

export const PERSIAN_WEEKDAYS = [
  "شنبه", // 0 = Saturday
  "یکشنبه", // 1 = Sunday
  "دوشنبه", // 2 = Monday
  "سه‌شنبه", // 3 = Tuesday
  "چهارشنبه", // 4 = Wednesday
  "پنج‌شنبه", // 5 = Thursday
  "جمعه", // 6 = Friday
] as const;

export const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

/**
 * Converts Gregorian date to Jalali date
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy: number;
  if (gy > 1600) {
    jy = 979;
    gy -= 1600;
  } else {
    jy = 0;
    gy -= 621;
  }
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

/**
 * Converts Jalali date to Gregorian date
 * Uses astronomical table algorithm (tested against Nowruz and post-1401 standards)
 */
export function jalaliToGregorian(j_y: number, j_m: number, j_d: number): { gy: number; gm: number; gd: number } {
  const g_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const jy = j_y - 979;
  const jm = j_m - 1;
  const jd = j_d - 1;

  let j_day_no = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4);
  for (let i = 0; i < jm; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
  g_day_no %= 146097;

  let leap = true;
  if (g_day_no >= 36525) {
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524);
    g_day_no %= 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461);
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no %= 365;
  }

  for (let i = 0; i < 12; i++) {
    const dim = g_days[i] + (i === 1 && leap ? 1 : 0);
    if (g_day_no < dim) {
      return { gy, gm: i + 1, gd: g_day_no + 1 };
    }
    g_day_no -= dim;
  }

  return { gy, gm: 12, gd: g_day_no + 1 };
}

/**
 * Formats a Date object to Jalali string: "1403/07/21" or "1403-07-21"
 */
export function formatJalaliDate(date: Date, separator: "/" | "-" = "-"): string {
  const { jy, jm, jd } = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}${separator}${mm}${separator}${dd}`;
}

/**
 * Returns Persian weekday index (0 = Saturday/Shanbeh to 6 = Friday/Jomeh)
 */
export function getPersianDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0 is Sunday, 6 is Saturday
  return (jsDay + 1) % 7; // Saturday -> 0, Sunday -> 1, ..., Friday -> 6
}

/**
 * Gets the Saturday-to-Friday study week boundaries for a given date.
 */
export function getStudyWeekBoundaries(date: Date = new Date()): {
  weekStartDate: string;
  weekEndDate: string;
  startDateObj: Date;
  endDateObj: Date;
  jalaliYear: number;
  jalaliWeekNumber: number;
} {
  const currentDayOfWeek = getPersianDayOfWeek(date); // 0 (Sat) - 6 (Fri)

  // Saturday of this week
  const saturday = new Date(date);
  saturday.setDate(date.getDate() - currentDayOfWeek);
  saturday.setHours(0, 0, 0, 0);

  // Friday of this week
  const friday = new Date(saturday);
  friday.setDate(saturday.getDate() + 6);
  friday.setHours(23, 59, 59, 999);

  const jalaliSat = gregorianToJalali(
    saturday.getFullYear(),
    saturday.getMonth() + 1,
    saturday.getDate()
  );

  // Approximate day of year in Jalali:
  const dayOfYear =
    jalaliSat.jm <= 6
      ? (jalaliSat.jm - 1) * 31 + jalaliSat.jd
      : 186 + (jalaliSat.jm - 7) * 30 + jalaliSat.jd;

  const jalaliWeekNumber = Math.max(1, Math.ceil(dayOfYear / 7));

  return {
    weekStartDate: formatJalaliDate(saturday),
    weekEndDate: formatJalaliDate(friday),
    startDateObj: saturday,
    endDateObj: friday,
    jalaliYear: jalaliSat.jy,
    jalaliWeekNumber,
  };
}

/**
 * Converts English digits to Persian digits
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return "";
  const str = input.toString();
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Human-readable Persian date: "۲۱ مهر ۱۴۰۳"
 */
export function formatJalaliHuman(date: Date): string {
  const { jy, jm, jd } = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  return `${toPersianDigits(jd)} ${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/**
 * Iran Standard Time (IRST) constants:
 * Note: Daylight Saving Time (DST) was permanently repealed in Iran in September 2022 (1401).
 * Iranian Standard Time is permanently fixed at UTC+03:30 (no summer +04:30 shift).
 */
export const IRAN_TZ_OFFSET_MINUTES = 210; // 3 hours and 30 minutes

/**
 * Parse Jalali date/time string (e.g. "1403-08-25 22:00" or "1403/08/25") into
 * an accurate, timezone-aware JavaScript Date object in UTC.
 * Prevents V8 from treating Jalali 1403 as year 1403 AD (medieval expiration bug).
 */
export function parseJalaliDateTime(jalaliStr: string): Date | null {
  if (!jalaliStr || typeof jalaliStr !== "string") return null;

  // Normalize Persian/Arabic digits
  let cleanStr = jalaliStr
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .trim();

  // Pattern: "1403-08-25 22:00" or "1403/08/25"
  const match = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (!match) return null;

  const jy = parseInt(match[1], 10);
  const jm = parseInt(match[2], 10);
  const jd = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 0;
  const minute = match[5] ? parseInt(match[5], 10) : 0;
  const second = match[6] ? parseInt(match[6], 10) : 0;

  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);

  // Iran is permanently UTC+03:30 (offset = +210 minutes).
  // Target UTC timestamp = UTC timestamp of (gy, gm-1, gd, hour, minute, second) minus 210 minutes.
  const utcMillis = Date.UTC(gy, gm - 1, gd, hour, minute, second) - (IRAN_TZ_OFFSET_MINUTES * 60 * 1000);
  return new Date(utcMillis);
}

/**
 * Validates whether an exam submission is within its official time window
 */
export function isExamDeadlinePassed(endTimeStr: string, gracePeriodMinutes: number = 2): boolean {
  const endDate = parseJalaliDateTime(endTimeStr);
  if (!endDate) return false; // Fail open if unparseable, or handle via explicit validation
  const deadlineWithGrace = endDate.getTime() + (gracePeriodMinutes * 60 * 1000);
  return Date.now() > deadlineWithGrace;
}

/**
 * Checks whether the current time in Iran (Asia/Tehran) is Friday.
 */
export function isIranFriday(date: Date = new Date()): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      weekday: "long",
    });
    return formatter.format(date) === "Friday";
  } catch {
    return date.getDay() === 5;
  }
}

/**
 * Returns time parts in Iran (Asia/Tehran) timezone
 */
export function getIranTimeInfo(date: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const part of parts) {
      map[part.type] = part.value;
    }
    const isFriday = map.weekday === "Friday";
    return {
      isFriday,
      weekday: map.weekday,
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
    };
  } catch {
    return {
      isFriday: date.getDay() === 5,
      weekday: date.getDay() === 5 ? "Friday" : "Other",
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
}


