import { describe, it, expect } from "vitest";
import {
  normalizeIranianMobile,
  ensureHttps,
  getEffectiveSsoSettings,
} from "@/server/services/garnet";
import { sanitizeSsoSettingsForClient } from "@/server/actions/garnet";
import type { SsoApiSettingsRecord } from "@/types/models";

describe("Mashahir Danesh Central SSO & Settings Suite", () => {
  describe("1. Iranian Phone Number Normalization", () => {
    it("normalizes 10-digit mobile starting with 9 to 11-digit 09...", () => {
      expect(normalizeIranianMobile("9123445103")).toBe("09123445103");
      expect(normalizeIranianMobile("9227141667")).toBe("09227141667");
    });

    it("normalizes Persian numerals to standard English digits", () => {
      expect(normalizeIranianMobile("۰۹۱۲۳۴۴۵۱۰۳")).toBe("09123445103");
      expect(normalizeIranianMobile("۹۱۲۳۴۴۵۱۰۳")).toBe("09123445103");
    });

    it("normalizes Arabic numerals to standard English digits", () => {
      expect(normalizeIranianMobile("٠٩١٢٣٤٤٥١٠٣")).toBe("09123445103");
      expect(normalizeIranianMobile("٩١٢٣٤٤٥١٠٣")).toBe("09123445103");
    });

    it("handles E.164 and international dial prefixes (+98 and 0098)", () => {
      expect(normalizeIranianMobile("+989123445103")).toBe("09123445103");
      expect(normalizeIranianMobile("00989123445103")).toBe("09123445103");
    });

    it("strips whitespace, dashes, and non-numeric characters", () => {
      expect(normalizeIranianMobile(" 0912-344-5103 ")).toBe("09123445103");
      expect(normalizeIranianMobile("(+98) 912 344 5103")).toBe("09123445103");
    });
  });

  describe("2. HTTPS Protocol Enforcement", () => {
    it("upgrades insecure http:// URLs to https://", () => {
      expect(ensureHttps("http://mashahiredanesh.com/GarnetAPI")).toBe(
        "https://mashahiredanesh.com/GarnetAPI"
      );
    });

    it("leaves already secure https:// URLs intact", () => {
      expect(ensureHttps("https://mashahiredanesh.com/GarnetAPI")).toBe(
        "https://mashahiredanesh.com/GarnetAPI"
      );
    });

    it("handles trailing and leading whitespaces safely", () => {
      expect(ensureHttps("  http://api.mashahiredanesh.com  ")).toBe(
        "https://api.mashahiredanesh.com"
      );
    });
  });

  describe("3. Client Sanitization & Secret Masking", () => {
    const sampleSettings: SsoApiSettingsRecord = {
      id: "default",
      isEnabled: true,
      serviceTitle: "حساب کاربری مشاهیر دانش",
      baseUrl: "https://mashahiredanesh.com/GarnetAPI",
      loginEndpoint: "/auth/loginMobile",
      coursesEndpoint: "/user/courses",
      apiKeyHeader: "g-api-key",
      apiKeyValue: "AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5",
      mobileFieldName: "mobile",
      passwordFieldName: "password",
      successStatusCode: 2000,
      timeoutMs: 8000,
      autoCreateStudent: true,
      bypassCourseCheckIfNoEndpoint: true,
      updatedAt: new Date(),
    };

    it("retains the real API key for CEO and ADMIN roles", async () => {
      const sanitizedCeo = await sanitizeSsoSettingsForClient(sampleSettings, "CEO");
      expect(sanitizedCeo.apiKeyValue).toBe("AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5");

      const sanitizedAdmin = await sanitizeSsoSettingsForClient(sampleSettings, "ADMIN");
      expect(sanitizedAdmin.apiKeyValue).toBe("AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5");
    });

    it("masks the API key for non-administrative roles (STUDENT, MENTOR, SUPERVISOR)", async () => {
      const sanitizedStudent = await sanitizeSsoSettingsForClient(sampleSettings, "STUDENT");
      expect(sanitizedStudent.apiKeyValue).toBe("••••••••••••••••••••••••••••••••");

      const sanitizedMentor = await sanitizeSsoSettingsForClient(sampleSettings, "MENTOR");
      expect(sanitizedMentor.apiKeyValue).toBe("••••••••••••••••••••••••••••••••");

      const sanitizedSupervisor = await sanitizeSsoSettingsForClient(sampleSettings, "SUPERVISOR");
      expect(sanitizedSupervisor.apiKeyValue).toBe("••••••••••••••••••••••••••••••••");
    });
  });

  describe("4. Runtime SSO Settings Resolution", () => {
    it("returns default institutional production settings when no DB row is provided", async () => {
      const config = await getEffectiveSsoSettings();
      expect(config.baseUrl).toContain("mashahiredanesh.com");
      expect(config.loginEndpoint).toBe("/auth/loginMobile");
      expect(config.apiKeyHeader).toBe("g-api-key");
      expect(config.successStatusCode).toBe(2000);
      expect(config.timeoutMs).toBe(8000);
    });

    it("merges custom overrides provided during connection testing", async () => {
      const config = await getEffectiveSsoSettings({
        baseUrl: "https://mashahiredanesh.com/TestAPI",
        timeoutMs: 5000,
      });
      expect(config.baseUrl).toBe("https://mashahiredanesh.com/TestAPI");
      expect(config.timeoutMs).toBe(5000);
      expect(config.loginEndpoint).toBe("/auth/loginMobile");
    });
  });
});
