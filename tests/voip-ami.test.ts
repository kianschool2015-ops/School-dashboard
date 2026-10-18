import { describe, it, expect } from "vitest";
import { sanitizeIranianPhone, maskPhoneNumber, AsteriskAmiClient } from "../src/server/services/voip";
import type { VoipAmiSettings } from "../src/types/models";

describe("VoIP Asterisk AMI Protocol & Security Sanitization", () => {
  describe("sanitizeIranianPhone", () => {
    it("converts Persian digits to English national format", () => {
      expect(sanitizeIranianPhone("۰۹۱۲۱۰۵۶۷۸۹")).toBe("09121056789");
    });

    it("converts Arabic digits to English national format", () => {
      expect(sanitizeIranianPhone("٠٩١٢١٠٥٦٧٨٩")).toBe("09121056789");
    });

    it("strips international prefix +98", () => {
      expect(sanitizeIranianPhone("+989121056789")).toBe("09121056789");
    });

    it("strips international prefix 0098", () => {
      expect(sanitizeIranianPhone("00989121056789")).toBe("09121056789");
    });

    it("handles 10-digit number starting with 9", () => {
      expect(sanitizeIranianPhone("9121056789")).toBe("09121056789");
    });

    it("removes dashes and spaces", () => {
      expect(sanitizeIranianPhone("0912-105-6789")).toBe("09121056789");
      expect(sanitizeIranianPhone(" 0912 105 6789 ")).toBe("09121056789");
    });
  });

  describe("maskPhoneNumber (Zero-Knowledge Student Privacy)", () => {
    it("masks student phone with asterisks and Persian digits", () => {
      const masked = maskPhoneNumber("09121000005");
      expect(masked).toBe("۰۹۱۲***۰۰۰۵");
    });

    it("falls back to default placeholder for short or invalid phone", () => {
      expect(maskPhoneNumber("")).toBe("۰۹۱۲***۰۰۰۰");
      expect(maskPhoneNumber("123")).toBe("۰۹۱۲***۰۰۰۰");
    });
  });

  describe("AsteriskAmiClient initialization", () => {
    it("initializes with configured settings", () => {
      const mockSettings: VoipAmiSettings = {
        id: "voip_test",
        host: "192.168.1.50",
        port: 5038,
        username: "test_ami",
        secret: "test_secret",
        context: "from-internal",
        channelTech: "SIP",
        trunk: "TRUNK_IRANCELL",
        callerId: "02191000000",
        isActive: true,
        mentorExtensions: { usr_mentor1: "101" },
        updatedAt: new Date(),
      };

      const client = new AsteriskAmiClient(mockSettings);
      expect(client).toBeDefined();
    });
  });
});
