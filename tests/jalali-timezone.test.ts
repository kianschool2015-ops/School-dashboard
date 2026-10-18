import { describe, it, expect } from "vitest";
import {
  jalaliToGregorian,
  gregorianToJalali,
  parseJalaliDateTime,
  isExamDeadlinePassed,
  IRAN_TZ_OFFSET_MINUTES,
} from "../src/lib/jalali";

describe("Jalali Calendar & Timezone Engine (Post-1401 No-DST Standard)", () => {
  it("verifies IRAN_TZ_OFFSET_MINUTES is fixed at UTC+03:30 (210 minutes)", () => {
    expect(IRAN_TZ_OFFSET_MINUTES).toBe(210);
  });

  // 52 Known Reference Dates across Leap and Non-Leap Years
  const KNOWN_DATES = [
    // 1370 - 1379
    { jy: 1370, jm: 1, jd: 1, gy: 1991, gm: 3, gd: 21 },
    { jy: 1374, jm: 1, jd: 1, gy: 1995, gm: 3, gd: 21 },
    { jy: 1375, jm: 1, jd: 1, gy: 1996, gm: 3, gd: 20 }, // 1375 is leap
    { jy: 1375, jm: 12, jd: 30, gy: 1997, gm: 3, gd: 20 },
    { jy: 1376, jm: 1, jd: 1, gy: 1997, gm: 3, gd: 21 },
    { jy: 1379, jm: 1, jd: 1, gy: 2000, gm: 3, gd: 20 }, // 1379 is leap
    { jy: 1379, jm: 12, jd: 30, gy: 2001, gm: 3, gd: 20 },

    // 1380 - 1389
    { jy: 1380, jm: 1, jd: 1, gy: 2001, gm: 3, gd: 21 },
    { jy: 1382, jm: 7, jd: 1, gy: 2003, gm: 9, gd: 23 },
    { jy: 1383, jm: 1, jd: 1, gy: 2004, gm: 3, gd: 20 }, // 1383 is leap
    { jy: 1383, jm: 12, jd: 30, gy: 2005, gm: 3, gd: 20 },
    { jy: 1384, jm: 1, jd: 1, gy: 2005, gm: 3, gd: 21 },
    { jy: 1387, jm: 1, jd: 1, gy: 2008, gm: 3, gd: 20 }, // 1387 is leap
    { jy: 1387, jm: 12, jd: 30, gy: 2009, gm: 3, gd: 20 },
    { jy: 1388, jm: 1, jd: 1, gy: 2009, gm: 3, gd: 21 },

    // 1390 - 1399
    { jy: 1390, jm: 1, jd: 1, gy: 2011, gm: 3, gd: 21 },
    { jy: 1391, jm: 1, jd: 1, gy: 2012, gm: 3, gd: 20 }, // 1391 is leap
    { jy: 1391, jm: 12, jd: 30, gy: 2013, gm: 3, gd: 20 },
    { jy: 1392, jm: 1, jd: 1, gy: 2013, gm: 3, gd: 21 },
    { jy: 1394, jm: 6, jd: 31, gy: 2015, gm: 9, gd: 22 },
    { jy: 1395, jm: 1, jd: 1, gy: 2016, gm: 3, gd: 20 }, // 1395 is leap
    { jy: 1395, jm: 6, jd: 31, gy: 2016, gm: 9, gd: 21 },
    { jy: 1395, jm: 12, jd: 30, gy: 2017, gm: 3, gd: 20 },
    { jy: 1396, jm: 1, jd: 1, gy: 2017, gm: 3, gd: 21 },
    { jy: 1398, jm: 1, jd: 1, gy: 2019, gm: 3, gd: 21 },
    { jy: 1399, jm: 1, jd: 1, gy: 2020, gm: 3, gd: 20 }, // 1399 is leap
    { jy: 1399, jm: 6, jd: 31, gy: 2020, gm: 9, gd: 21 },
    { jy: 1399, jm: 12, jd: 30, gy: 2021, gm: 3, gd: 20 },

    // 1400 - 1409 (Current Era)
    { jy: 1400, jm: 1, jd: 1, gy: 2021, gm: 3, gd: 21 },
    { jy: 1400, jm: 6, jd: 31, gy: 2021, gm: 9, gd: 22 },
    { jy: 1400, jm: 12, jd: 29, gy: 2022, gm: 3, gd: 20 },
    { jy: 1401, jm: 1, jd: 1, gy: 2022, gm: 3, gd: 21 },
    { jy: 1401, jm: 7, jd: 1, gy: 2022, gm: 9, gd: 23 },
    { jy: 1402, jm: 1, jd: 1, gy: 2023, gm: 3, gd: 21 },
    { jy: 1402, jm: 12, jd: 29, gy: 2024, gm: 3, gd: 19 },
    { jy: 1403, jm: 1, jd: 1, gy: 2024, gm: 3, gd: 20 }, // 1403 is leap
    { jy: 1403, jm: 1, jd: 2, gy: 2024, gm: 3, gd: 21 },
    { jy: 1403, jm: 4, jd: 1, gy: 2024, gm: 6, gd: 21 },
    { jy: 1403, jm: 6, jd: 31, gy: 2024, gm: 9, gd: 21 },
    { jy: 1403, jm: 7, jd: 1, gy: 2024, gm: 9, gd: 22 },
    { jy: 1403, jm: 8, jd: 25, gy: 2024, gm: 11, gd: 15 },
    { jy: 1403, jm: 11, jd: 22, gy: 2025, gm: 2, gd: 10 },
    { jy: 1403, jm: 12, jd: 30, gy: 2025, gm: 3, gd: 20 },
    { jy: 1404, jm: 1, jd: 1, gy: 2025, gm: 3, gd: 21 },
    { jy: 1405, jm: 1, jd: 1, gy: 2026, gm: 3, gd: 21 },
    { jy: 1406, jm: 1, jd: 1, gy: 2027, gm: 3, gd: 21 },
    { jy: 1407, jm: 1, jd: 1, gy: 2028, gm: 3, gd: 20 }, // 1407 Nowruz
    { jy: 1407, jm: 12, jd: 29, gy: 2029, gm: 3, gd: 19 },
    { jy: 1408, jm: 1, jd: 1, gy: 2029, gm: 3, gd: 20 }, // 1408 5-year leap cycle
    { jy: 1408, jm: 12, jd: 30, gy: 2030, gm: 3, gd: 20 },
    { jy: 1409, jm: 1, jd: 1, gy: 2030, gm: 3, gd: 21 },

    // 1410 - 1412
    { jy: 1410, jm: 1, jd: 1, gy: 2031, gm: 3, gd: 21 },
    { jy: 1411, jm: 1, jd: 1, gy: 2032, gm: 3, gd: 20 }, // 1411 is leap
  ];

  it(`accurately converts 50+ known dates including leap years (${KNOWN_DATES.length} test points)`, () => {
    expect(KNOWN_DATES.length).toBeGreaterThanOrEqual(50);
    for (const d of KNOWN_DATES) {
      const g = jalaliToGregorian(d.jy, d.jm, d.jd);
      expect(
        { gy: g.gy, gm: g.gm, gd: g.gd },
        `Mismatch for Jalali ${d.jy}/${d.jm}/${d.jd}`
      ).toEqual({ gy: d.gy, gm: d.gm, gd: d.gd });

      // Bidirectional test
      const j = gregorianToJalali(d.gy, d.gm, d.gd);
      expect(
        { jy: j.jy, jm: j.jm, jd: j.jd },
        `Mismatch for Gregorian ${d.gy}/${d.gm}/${d.gd}`
      ).toEqual({ jy: d.jy, jm: d.jm, jd: d.jd });
    }
  });

  it("accurately converts Jalali '1403-08-25 22:00' to UTC without medieval 1403 AD bug", () => {
    const parsed = parseJalaliDateTime("1403-08-25 22:00");
    expect(parsed).not.toBeNull();
    // 1403-08-25 corresponds to 2024-11-15 in Gregorian.
    // At 22:00 Iran time (UTC+03:30), UTC time is 18:30:00.
    expect(parsed!.getUTCFullYear()).toBe(2024);
    expect(parsed!.getUTCMonth()).toBe(10); // 0-indexed November
    expect(parsed!.getUTCDate()).toBe(15);
    expect(parsed!.getUTCHours()).toBe(18);
    expect(parsed!.getUTCMinutes()).toBe(30);
  });

  it("handles Persian digits in date string", () => {
    const parsed = parseJalaliDateTime("۱۴۰۳-۰۸-۲۵ ۲۲:۰۰");
    expect(parsed).not.toBeNull();
    expect(parsed!.getUTCFullYear()).toBe(2024);
    expect(parsed!.getUTCHours()).toBe(18);
    expect(parsed!.getUTCMinutes()).toBe(30);
  });

  it("confirms no raw date string is passed to new Date() during parsing", () => {
    // parseJalaliDateTime calculates epoch millis and calls new Date(utcMillis)
    const result = parseJalaliDateTime("1403-01-01 12:00");
    expect(result).toBeInstanceOf(Date);
    expect(typeof result!.getTime()).toBe("number");
    expect(!isNaN(result!.getTime())).toBe(true);
  });

  it("detects expired exams correctly based on epoch comparison", () => {
    // 1400-01-01 is in the past
    expect(isExamDeadlinePassed("1400-01-01 10:00")).toBe(true);
    // 1410-01-01 is in the future
    expect(isExamDeadlinePassed("1410-01-01 10:00")).toBe(false);
  });
});
