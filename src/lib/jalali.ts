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
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let gy: number;
  if (jy > 979) {
    gy = 1600;
    jy -= 979;
  } else {
    gy = 621;
  }
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 -
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm: number;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return { gy, gm, gd };
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
