import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkOtpRateLimit,
  generateOtp,
  verifyOtp,
  _clearOtpStores,
  isValidIranianPhone,
} from "../src/server/auth/otp";
import { memoryRepo } from "../src/server/db";
import { resolveTriageCaseAction, logMentorContactAction } from "../src/server/actions/mentor";
import { applyTailoredPlanToStudentAction } from "../src/server/actions/plans";
import { originateMentorCallAction, getMaskedStudentPhoneAction } from "../src/server/actions/voip";
import { launchInstantTriageRoomAction } from "../src/server/actions/video";
import { sendMessageAction, getMessagesAction, createConversationAction } from "../src/server/actions/chat";
import { sendDirectMessageAction } from "../src/server/actions/messages";
import {
  submitEvaluationExamAction,
  addExamQuestionAction,
  deleteExamQuestionAction,
  updateExamAudienceAction,
  createEvaluationExamAction,
} from "../src/server/actions/exams";
import { updateLandingContentAction } from "../src/server/actions/landing-cms";
import { saveSmsSettingsAction } from "../src/server/actions/sms";
import { importStudentWhitelistAction } from "../src/server/actions/whitelist";
import { assignHierarchyTaskAction } from "../src/server/actions/tasks";
import {
  loginWithPasswordAction,
  _clearPasswordRateLimitStores,
} from "../src/server/actions/auth";

// Mock auth guard session
let currentMockSession: {
  userId: string;
  phoneNumber: string;
  fullName: string;
  role: "STUDENT" | "MENTOR" | "SUPERVISOR" | "ADMIN" | "CEO";
  studentProfileId?: string;
} | null = null;

vi.mock("../src/server/auth/guard", () => ({
  getSession: vi.fn(async () => currentMockSession),
  requireAuth: vi.fn(async () => {
    if (!currentMockSession) throw new Error("UNAUTHORIZED");
    return currentMockSession;
  }),
  requireRole: vi.fn(async (allowedRoles: string[]) => {
    if (!currentMockSession) throw new Error("UNAUTHORIZED");
    if (!allowedRoles.includes(currentMockSession.role)) {
      throw new Error(`FORBIDDEN: Requires role ${allowedRoles.join(" or ")}`);
    }
    return currentMockSession;
  }),
  requireStudentOwnership: vi.fn(async (targetStudentProfileId: string) => {
    if (!currentMockSession) throw new Error("UNAUTHORIZED");
    if (
      currentMockSession.role === "STUDENT" &&
      currentMockSession.studentProfileId !== targetStudentProfileId
    ) {
      throw new Error("FORBIDDEN: You do not own this student profile");
    }
    return currentMockSession;
  }),
}));

// Mock SMS sender to prevent actual HTTP calls during unit testing
vi.mock("../src/server/services/sms", () => ({
  sendSystemSms: vi.fn(async () => ({ success: true, messageId: "mock_msg_1" })),
}));

// Mock next/cache revalidation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("Phase 3: Automated Security & Zero-Trust Audit Test Suite", () => {
  beforeEach(() => {
    _clearOtpStores();
    _clearPasswordRateLimitStores();
    currentMockSession = null;
  });

  // ===========================================================================
  // 1. IDOR Matrix Tests
  // ===========================================================================
  describe("1. IDOR Matrix (Insecure Direct Object Reference)", () => {
    it("denies MENTOR from logging contact for a student assigned to another mentor", async () => {
      // Setup Mentor A
      currentMockSession = {
        userId: "usr_mentor_A",
        phoneNumber: "09121111111",
        fullName: "پشتیبان الف",
        role: "MENTOR",
      };

      // Target student assigned to Mentor B
      memoryRepo.studentProfiles.set("profile_stu_other", {
        id: "profile_stu_other",
        userId: "usr_stu_other",
        mentorId: "usr_mentor_B", // Different mentor
        employmentStatus: "UNEMPLOYED",
        isStudent: true,
        maritalStatus: "SINGLE",
        hasChildren: false,
        childrenCount: 0,
        hasFamilyCareDuty: false,
        workdayStudyHoursCap: 6,
        holidayStudyHoursCap: 10,
        bestStudyTime: "MORNING",
        previousBarExamAttempts: 0,
        currentDailyStudyHours: 4,
        riskStatus: "GREEN",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await logMentorContactAction({
        studentProfileId: "profile_stu_other",
        notes: "تماس تستی غیرمجاز",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("تنها مجاز به ثبت گزارش برای داوطلبان اختصاصی خود هستید");
    });

    it("denies MENTOR from resolving a triage case belonging to another mentor's student", async () => {
      currentMockSession = {
        userId: "usr_mentor_A",
        phoneNumber: "09121111111",
        fullName: "پشتیبان الف",
        role: "MENTOR",
      };

      memoryRepo.triageCases.set("case_other", {
        id: "case_other",
        studentProfileId: "profile_stu_other",
        mentorId: "usr_mentor_B",
        triggerCode: "A01",
        priorityTier: "CRITICAL",
        description: "بحران آزمون",
        isResolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await resolveTriageCaseAction({
        caseId: "case_other",
        interventionNotes: "مداخله غیرمجاز پشتیبان الف",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("تنها مجاز به رسیدگی به پرونده‌های داوطلبان تحت سرپرستی خود هستید");
    });

    it("denies MENTOR from sending direct message to another mentor's student", async () => {
      currentMockSession = {
        userId: "usr_mentor_A",
        phoneNumber: "09121111111",
        fullName: "پشتیبان الف",
        role: "MENTOR",
      };

      // Receiver is a student assigned to Mentor B
      memoryRepo.users.set("usr_stu_other", {
        id: "usr_stu_other",
        phoneNumber: "09129999999",
        fullName: "داوطلب دیگر",
        role: "STUDENT",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await sendDirectMessageAction({
        receiverId: "usr_stu_other",
        message: "پیام نقض‌کننده سلسله‌مراتب",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("تنها مجاز به ارسال پیام به داوطلبان تحت نظارت مستقیم خود است");
    });

    it("denies non-member from reading private chat messages", async () => {
      currentMockSession = {
        userId: "usr_eavesdropper",
        phoneNumber: "09123333333",
        fullName: "کاربر غریبه",
        role: "MENTOR",
      };

      // Create private group with members A and B
      memoryRepo.createChatConversation({
        id: "conv_private_1",
        type: "GROUP",
        title: "گروه محرمانه سرپرستی",
        creatorId: "usr_mentor_A",
        creatorRole: "MENTOR",
        creatorName: "پشتیبان الف",
        memberIds: ["usr_mentor_A", "usr_mentor_B"],
        isChannelReadOnlyForStudents: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(getMessagesAction("conv_private_1")).rejects.toThrow("شما عضو این گفتگو نیستید");
    });

    it("denies non-member from sending message into a private conversation", async () => {
      currentMockSession = {
        userId: "usr_eavesdropper",
        phoneNumber: "09123333333",
        fullName: "کاربر غریبه",
        role: "MENTOR",
      };

      const res = await sendMessageAction({
        conversationId: "conv_private_1",
        message: "ارسال پیام غیرمجاز",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("شما عضو این گفتگو نیستید");
    });

    it("denies MENTOR from updating or deleting questions on an exam created by another mentor", async () => {
      currentMockSession = {
        userId: "usr_mentor_A",
        phoneNumber: "09121111111",
        fullName: "پشتیبان الف",
        role: "MENTOR",
      };

      memoryRepo.evaluationExams.set("exam_by_mentor_B", {
        id: "exam_by_mentor_B",
        title: "آزمون تخصصی مدنی",
        description: "طراحی شده توسط پشتیبان ب",
        creatorId: "usr_mentor_B",
        creatorRole: "MENTOR",
        creatorName: "پشتیبان ب",
        startTime: "1403-08-01 08:00",
        endTime: "1403-08-05 22:00",
        durationMinutes: 60,
        totalQuestions: 20,
        subjectsWeight: { "مدنی": 1 },
        targetCohort: "عمومی",
        assignedStudentIds: [],
        questions: [],
        createdAt: new Date(),
      });

      const resDelete = await deleteExamQuestionAction("exam_by_mentor_B", "q_fake");
      expect(resDelete.success).toBe(false);
      expect(resDelete.message).toContain("تنها مجاز به ویرایش آزمون‌های ایجاد شده توسط خود است");

      const resAdd = await addExamQuestionAction({
        examId: "exam_by_mentor_B",
        type: "MULTIPLE_CHOICE",
        subject: "مدنی",
        questionText: "سؤال تستی غیرمجاز",
        points: 1,
      });
      expect(resAdd.success).toBe(false);
      expect(resAdd.message).toContain("تنها مجاز به ویرایش آزمون‌های ایجاد شده توسط خود است");
    });
  });

  // ===========================================================================
  // 2. Role Escalation & RBAC Checks
  // ===========================================================================
  describe("2. Role Escalation & RBAC Guards", () => {
    it("denies unauthenticated request to sensitive server actions", async () => {
      currentMockSession = null;
      await expect(getMessagesAction("conv_any")).rejects.toThrow("UNAUTHORIZED");
      await expect(
        createEvaluationExamAction({
          title: "آزمون",
          description: "شرح",
          startTime: "1403-01-01 08:00",
          endTime: "1403-01-01 10:00",
          durationMinutes: 60,
          totalQuestions: 10,
          subjectsWeight: { "مدنی": 1 },
          targetCohort: "عمومی",
        })
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("denies STUDENT role from updating landing page CMS settings", async () => {
      currentMockSession = {
        userId: "usr_student_1",
        phoneNumber: "09120000001",
        fullName: "داوطلب عادی",
        role: "STUDENT",
        studentProfileId: "profile_stu_1",
      };

      await expect(
        updateLandingContentAction({ heroTitle: "هک صفحه اول" })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("denies STUDENT role from saving SMS gateway credentials", async () => {
      currentMockSession = {
        userId: "usr_student_1",
        phoneNumber: "09120000001",
        fullName: "داوطلب عادی",
        role: "STUDENT",
        studentProfileId: "profile_stu_1",
      };

      await expect(
        saveSmsSettingsAction({
          provider: "KAVENEGAR",
          apiKey: "malicious_api_key",
          isActive: true,
          triggers: {},
        })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("denies STUDENT role from importing candidate whitelist", async () => {
      currentMockSession = {
        userId: "usr_student_1",
        phoneNumber: "09120000001",
        fullName: "داوطلب عادی",
        role: "STUDENT",
        studentProfileId: "profile_stu_1",
      };

      await expect(
        importStudentWhitelistAction([
          { fullName: "کاربر جعلی", nationalId: "0011223344", phoneNumber: "09129998877" },
        ])
      ).rejects.toThrow("FORBIDDEN");
    });

    it("denies STUDENT role from assigning hierarchy tasks", async () => {
      currentMockSession = {
        userId: "usr_student_1",
        phoneNumber: "09120000001",
        fullName: "داوطلب عادی",
        role: "STUDENT",
        studentProfileId: "profile_stu_1",
      };

      await expect(
        assignHierarchyTaskAction({
          receiverIds: ["usr_mentor_A"],
          title: "دستور جعلی",
          description: "شرح",
          priority: "CRITICAL",
          dueDate: "1403-08-01",
        })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("denies STUDENT role from creating channels or groups", async () => {
      currentMockSession = {
        userId: "usr_student_1",
        phoneNumber: "09120000001",
        fullName: "داوطلب عادی",
        role: "STUDENT",
        studentProfileId: "profile_stu_1",
      };

      await expect(
        createConversationAction({
          title: "کانال غیرمجاز",
          type: "CHANNEL",
        })
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  // ===========================================================================
  // 3. OTP Hardening & Brute-Force Tests
  // ===========================================================================
  describe("3. OTP Gateway Security & Abuse Prevention", () => {
    it("validates Iranian phone format strictly (09xxxxxxxxx)", () => {
      expect(isValidIranianPhone("09121234567")).toBe(true);
      expect(isValidIranianPhone("09351112233")).toBe(true);
      expect(isValidIranianPhone("02188888888")).toBe(false); // Landline
      expect(isValidIranianPhone("123456")).toBe(false);
      expect(isValidIranianPhone("+989121234567")).toBe(false); // Raw string must be normalized
      expect(isValidIranianPhone("0912123456")).toBe(false); // 10 digits
      expect(isValidIranianPhone("091212345678")).toBe(false); // 12 digits
    });

    it("strictly rejects master mock OTP '12345' when NODE_ENV is production", () => {
      const origEnv = process.env.NODE_ENV;
      const origMock = process.env.ENABLE_MOCK_OTP;
      try {
        process.env.NODE_ENV = "production";
        process.env.ENABLE_MOCK_OTP = "true";

        const phone = "09123456789";
        // Even if mock code is 12345, in production it must be denied
        const result = verifyOtp(phone, "12345");
        expect(result).toBe(false);
      } finally {
        process.env.NODE_ENV = origEnv;
        process.env.ENABLE_MOCK_OTP = origMock;
      }
    });

    it("locks out OTP verification after 5 consecutive incorrect attempts", () => {
      const phone = "09129990001";
      const { code } = generateOtp(phone);

      // 4 wrong attempts
      for (let i = 0; i < 4; i++) {
        expect(verifyOtp(phone, "00000")).toBe(false);
      }

      // 5th wrong attempt triggers lockout / deletion
      expect(verifyOtp(phone, "00000")).toBe(false);

      // Now even the authentic OTP code must be rejected because it is destroyed!
      expect(verifyOtp(phone, code)).toBe(false);
    });

    it("enforces sliding-window rate limit per phone number (max 3 requests per 10 mins)", () => {
      const phone = "09128880002";
      expect(checkOtpRateLimit(phone).allowed).toBe(true);
      generateOtp(phone);

      expect(checkOtpRateLimit(phone).allowed).toBe(true);
      generateOtp(phone);

      expect(checkOtpRateLimit(phone).allowed).toBe(true);
      generateOtp(phone);

      // 4th request must be rejected
      const rateCheck = checkOtpRateLimit(phone);
      expect(rateCheck.allowed).toBe(false);
      expect(rateCheck.remainingMinutes).toBeGreaterThan(0);
    });

    it("enforces sliding-window rate limit per IP address to prevent SMS toll fraud", () => {
      const attackerIp = "185.120.40.10";

      // Attacker attempts to cycle through different phone numbers from same IP
      for (let i = 0; i < 10; i++) {
        const phone = `0912000100${i}`;
        expect(checkOtpRateLimit(phone, attackerIp).allowed).toBe(true);
        generateOtp(phone, attackerIp);
      }

      // 11th request from this IP must be blocked regardless of new phone number
      const freshPhone = "09129999999";
      const check = checkOtpRateLimit(freshPhone, attackerIp);
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("IP");
    });
  });

  // ===========================================================================
  // 4. Password Brute-Force & Lockout Tests
  // ===========================================================================
  describe("4. Password Authentication Lockout", () => {
    it("locks out user account after 5 consecutive failed password attempts", async () => {
      const targetUser = "09127776655";
      memoryRepo.users.set(targetUser, {
        id: "usr_pwd_test",
        phoneNumber: targetUser,
        fullName: "کاربر تست پسورد",
        role: "STUDENT",
        passwordHash: "Authentic@Password2026",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 5 failed password attempts
      for (let i = 0; i < 5; i++) {
        const res = await loginWithPasswordAction(targetUser, "WrongPassword");
        expect(res.success).toBe(false);
        expect(res.message).toContain("کلمه عبور وارد شده نادرست است");
      }

      // 6th attempt must be actively locked out
      const lockedRes = await loginWithPasswordAction(targetUser, "Authentic@Password2026");
      expect(lockedRes.success).toBe(false);
      expect(lockedRes.message).toContain("تعداد تلاش‌های ناموفق شما بیش از حد مجاز است");
    });
  });
});
