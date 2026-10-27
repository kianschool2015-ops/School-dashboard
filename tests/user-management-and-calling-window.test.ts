import { describe, it, expect, vi } from "vitest";
import { initialUsers, initialStudentProfiles } from "@/server/db/mock-data";
import { checkMentorCallingWindowAvailability } from "@/server/services/voip";
import { isIranFriday, getIranTimeInfo, toPersianDigits, gregorianToJalali } from "@/lib/jalali";

describe("Phase 4: Admin User Management, Test Accounts & Calling Window Tests", () => {
  it("verifies test mentor account 09123445103 is seeded with extension 102 and MENTOR role", () => {
    const testMentor = initialUsers.find((u) => u.phoneNumber === "09123445103");
    expect(testMentor).toBeDefined();
    expect(testMentor?.role).toBe("MENTOR");
    expect(testMentor?.sipExtension).toBe("102");
    expect(testMentor?.isActive).toBe(true);
    expect(testMentor?.username).toBe("mentor_test");
  });

  it("verifies test student account 09227141667 is seeded with STUDENT role and linked to test mentor", () => {
    const testStudent = initialUsers.find((u) => u.phoneNumber === "09227141667");
    expect(testStudent).toBeDefined();
    expect(testStudent?.role).toBe("STUDENT");
    expect(testStudent?.isActive).toBe(true);
    expect(testStudent?.username).toBe("student_test");

    const profile = initialStudentProfiles.find((p) => p.userId === testStudent?.id);
    expect(profile).toBeDefined();
    expect(profile?.mentorId).toBe("usr_mentor_test_09123445103");
  });

  it("verifies Asia/Tehran timezone calculation in getIranTimeInfo", () => {
    const info = getIranTimeInfo(new Date());
    expect(info).toHaveProperty("isFriday");
    expect(info).toHaveProperty("weekday");
    expect(info).toHaveProperty("hour");
    expect(info).toHaveProperty("minute");
    expect(typeof info.hour).toBe("number");
    expect(info.hour).toBeGreaterThanOrEqual(0);
    expect(info.hour).toBeLessThanOrEqual(23);
  });

  it("verifies Friday detection aligns with Asia/Tehran timezone", () => {
    const knownFridayUtc = new Date("2026-10-30T10:00:00Z"); // Oct 30, 2026 is Friday
    const knownSaturdayUtc = new Date("2026-10-31T10:00:00Z"); // Oct 31, 2026 is Saturday

    expect(isIranFriday(knownFridayUtc)).toBe(true);
    expect(isIranFriday(knownSaturdayUtc)).toBe(false);
  });

  it("verifies Jalali date conversion and Persian numerals formatting", () => {
    const jDate = gregorianToJalali(2026, 10, 26);
    expect(jDate.jy).toBe(1405);
    expect(toPersianDigits("102")).toBe("۱۰۲");
    expect(toPersianDigits("09123445103")).toBe("۰۹۱۲۳۴۴۵۱۰۳");
  });
});
