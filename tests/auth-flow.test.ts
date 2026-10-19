import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  toEnglishDigits,
  normalizePhoneNumber,
  isValidIranianPhone,
  checkOtpRateLimit,
  generateOtp,
  verifyOtp,
  _clearOtpStores,
} from "../src/server/auth/otp";
import {
  loginWithPasswordAction,
  requestOtpAction,
  verifyOtpAction,
  _clearPasswordRateLimitStores,
} from "../src/server/actions/auth";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(async () => ({
    get: vi.fn((key: string) => {
      if (key === "x-forwarded-for") return "127.0.0.1";
      return null;
    }),
  })),
}));

describe("Authentication & Login Resilience Test Suite", () => {
  beforeEach(async () => {
    _clearOtpStores();
    await _clearPasswordRateLimitStores();
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.ENABLE_MOCK_OTP = "true";
  });

  describe("1. Digit Normalization & Phone Sanitization", () => {
    it("converts Persian and Arabic digits to ASCII English numerals", () => {
      expect(toEnglishDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
      expect(toEnglishDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
      expect(toEnglishDigits("0912۳۴۵۶789")).toBe("09123456789");
      expect(toEnglishDigits(null)).toBe("");
      expect(toEnglishDigits(undefined)).toBe("");
    });

    it("normalizes diverse Iranian phone number input formats to standard 09xxxxxxxxx", () => {
      // Standard Persian keyboard
      expect(normalizePhoneNumber("۰۹۱۲۳۴۵۶۷۸۹")).toBe("09123456789");
      // Arabic digits
      expect(normalizePhoneNumber("٠٩١٢٣٤٥٦٧٨٩")).toBe("09123456789");
      // International prefix +98
      expect(normalizePhoneNumber("+989123456789")).toBe("09123456789");
      // Double zero prefix 0098
      expect(normalizePhoneNumber("00989123456789")).toBe("09123456789");
      // 98 prefix without plus
      expect(normalizePhoneNumber("989123456789")).toBe("09123456789");
      // Without leading zero
      expect(normalizePhoneNumber("9123456789")).toBe("09123456789");
      // With spaces, dashes, or parentheses
      expect(normalizePhoneNumber(" ۰۹۱۲-۳۴۵-۶۷۸۹ ")).toBe("09123456789");
      expect(normalizePhoneNumber("(0912) 345 6789")).toBe("09123456789");
    });

    it("validates Iranian phone numbers accurately across Persian and international formats", () => {
      expect(isValidIranianPhone("09123456789")).toBe(true);
      expect(isValidIranianPhone("۰۹۱۲۳۴۵۶۷۸۹")).toBe(true);
      expect(isValidIranianPhone("+989123456789")).toBe(true);
      expect(isValidIranianPhone("00989123456789")).toBe(true);
      expect(isValidIranianPhone(" 0912 345 6789 ")).toBe(true);

      // Invalid phone formats
      expect(isValidIranianPhone("02188888888")).toBe(false); // Tehran landline
      expect(isValidIranianPhone("091234567")).toBe(false); // Too short
      expect(isValidIranianPhone("0912345678901")).toBe(false); // Too long
      expect(isValidIranianPhone("not-a-phone")).toBe(false);
    });
  });

  describe("2. OTP Code Generation & Persian Code Verification", () => {
    it("generates 5-digit cryptographic OTP code and verifies successfully", () => {
      const phone = "09121112233";
      const { code, expiresInSeconds } = generateOtp(phone);
      expect(code).toMatch(/^[0-9]{5}$/);
      expect(expiresInSeconds).toBe(120);

      // Verify with original English digits
      const verified = verifyOtp(phone, code);
      expect(verified).toBe(true);
    });

    it("accepts Persian digits when verifying OTP codes", () => {
      const phone = "09129990011";
      const { code } = generateOtp(phone);

      // Convert code to Persian digits
      const persianCode = code
        .replace(/0/g, "۰")
        .replace(/1/g, "۱")
        .replace(/2/g, "۲")
        .replace(/3/g, "۳")
        .replace(/4/g, "۴")
        .replace(/5/g, "۵")
        .replace(/6/g, "۶")
        .replace(/7/g, "۷")
        .replace(/8/g, "۸")
        .replace(/9/g, "۹");

      const verified = verifyOtp(phone, persianCode);
      expect(verified).toBe(true);
    });

    it("supports mock OTP 12345 in development mode even if entered with Persian digits", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      process.env.ENABLE_MOCK_OTP = "true";

      const phone = "۰۹۱۲۸۸۸۷۷۶۶";
      // English digits
      expect(verifyOtp(phone, "12345")).toBe(true);

      // Persian digits ۱۲۳۴۵
      expect(verifyOtp(phone, "۱۲۳۴۵")).toBe(true);
    });
  });

  describe("3. Server Actions & Password Authentication Fallback", () => {
    it("authenticates institutional admin account using username and password", async () => {
      const res = await loginWithPasswordAction("admin", "Admin@123456");
      expect(res.success).toBe(true);
      expect(res.redirectUrl).toBe("/executive");
      expect(res.data?.role).toBe("CEO");
    });

    it("authenticates institutional supervisor account using Persian phone number", async () => {
      // Supervisor phone: 09120000002 entered with Persian digits
      const res = await loginWithPasswordAction("۰۹۱۲۰۰۰۰۰۰۲", "Supervisor@123456");
      expect(res.success).toBe(true);
      expect(res.redirectUrl).toBe("/supervisor");
      expect(res.data?.role).toBe("SUPERVISOR");
    });

    it("authenticates mentor account using username or phone", async () => {
      const res1 = await loginWithPasswordAction("mentor", "Mentor@123456");
      expect(res1.success).toBe(true);
      expect(res1.redirectUrl).toBe("/mentor/triage");
      expect(res1.data?.role).toBe("MENTOR");

      const res2 = await loginWithPasswordAction("09121000001", "Mentor@123456");
      expect(res2.success).toBe(true);
      expect(res2.redirectUrl).toBe("/mentor/triage");
    });

    it("authenticates student account with appropriate student dashboard redirect", async () => {
      const res = await loginWithPasswordAction("student", "Student@123456");
      expect(res.success).toBe(true);
      expect(res.redirectUrl).toBe("/student/dashboard");
      expect(res.data?.role).toBe("STUDENT");
    });

    it("rejects invalid password with friendly Persian error message", async () => {
      const res = await loginWithPasswordAction("admin", "WrongPassword123");
      expect(res.success).toBe(false);
      expect(res.message).toContain("کلمه عبور وارد شده نادرست است");
    });

    it("rejects non-existent user with polite error message", async () => {
      const res = await loginWithPasswordAction("non_existent_user_999", "SomePass@123");
      expect(res.success).toBe(false);
      expect(res.message).toContain("کاربری با این مشخصات یافت نشد");
    });
  });

  describe("4. OTP Request & Verification Server Actions", () => {
    it("handles requestOtpAction with Persian phone number seamlessly", async () => {
      const res = await requestOtpAction("۰۹۱۲۵۵۵۴۴۳۳");
      expect(res.success).toBe(true);
      expect(res.message).toContain("کد تایید ۵ رقمی");
    });

    it("handles verifyOtpAction with mock OTP in development", async () => {
      const phone = "۰۹۱۲۵۵۵۴۴۳۳";
      const res = await verifyOtpAction(phone, "۱۲۳۴۵");
      expect(res.success).toBe(true);
      expect(res.data?.fullName).toBeDefined();
      expect(res.redirectUrl).toBe("/student/dashboard");
    });
  });
});
