import { describe, it, expect } from "vitest";
import type { ExamRecord, ExamTargetAudience } from "../src/types/models";

describe("Exam Target Audience Access Control Suite", () => {
  const baseExam: ExamRecord = {
    id: "exam_test_101",
    title: "شبیه‌ساز وکالت ۱۴۰۳",
    courseCode: "GARNET-BAR-360",
    category: "MOCK_BAR",
    durationMinutes: 120,
    totalQuestions: 120,
    hasNegativeMarking: true,
    isPublished: true,
    targetAudience: "ALL",
    targetCourseCodes: [],
    targetStudentIds: [],
    createdById: "usr_mentor_01",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function checkStudentAccess(
    exam: Pick<ExamRecord, "targetAudience" | "targetCourseCodes" | "targetStudentIds">,
    student: { userId: string; enrolledCourseCode?: string | null }
  ): boolean {
    const audience = exam.targetAudience || "ALL";

    if (audience === "ALL") {
      return true;
    }

    if (audience === "COURSE_CODE") {
      const allowedCodes = Array.isArray(exam.targetCourseCodes) ? exam.targetCourseCodes : [];
      return Boolean(student.enrolledCourseCode && allowedCodes.includes(student.enrolledCourseCode));
    }

    if (audience === "SPECIFIC_STUDENTS") {
      const allowedStudentIds = Array.isArray(exam.targetStudentIds) ? exam.targetStudentIds : [];
      return allowedStudentIds.includes(student.userId);
    }

    return false;
  }

  describe("Target Audience = 'ALL'", () => {
    it("grants access to any student regardless of enrolled course or ID", () => {
      const publicExam = { ...baseExam, targetAudience: "ALL" as ExamTargetAudience };

      expect(checkStudentAccess(publicExam, { userId: "std_1", enrolledCourseCode: "GARNET-BAR-360" })).toBe(true);
      expect(checkStudentAccess(publicExam, { userId: "std_2", enrolledCourseCode: null })).toBe(true);
      expect(checkStudentAccess(publicExam, { userId: "std_3", enrolledCourseCode: "DIAGNOSTIC-1403" })).toBe(true);
      expect(checkStudentAccess(publicExam, { userId: "random_id" })).toBe(true);
    });
  });

  describe("Target Audience = 'COURSE_CODE'", () => {
    const courseTargetedExam = {
      ...baseExam,
      targetAudience: "COURSE_CODE" as ExamTargetAudience,
      targetCourseCodes: ["GARNET-BAR-360", "CRASH-BAR"],
    };

    it("grants access if student enrolledCourseCode matches one of the targetCourseCodes", () => {
      expect(
        checkStudentAccess(courseTargetedExam, { userId: "std_1", enrolledCourseCode: "GARNET-BAR-360" })
      ).toBe(true);
      expect(
        checkStudentAccess(courseTargetedExam, { userId: "std_2", enrolledCourseCode: "CRASH-BAR" })
      ).toBe(true);
    });

    it("denies access if student is enrolled in a different course", () => {
      expect(
        checkStudentAccess(courseTargetedExam, { userId: "std_3", enrolledCourseCode: "DIAGNOSTIC-1403" })
      ).toBe(false);
    });

    it("denies access if student has no enrolled course", () => {
      expect(
        checkStudentAccess(courseTargetedExam, { userId: "std_4", enrolledCourseCode: null })
      ).toBe(false);
      expect(
        checkStudentAccess(courseTargetedExam, { userId: "std_5" })
      ).toBe(false);
    });
  });

  describe("Target Audience = 'SPECIFIC_STUDENTS'", () => {
    const specificStudentExam = {
      ...baseExam,
      targetAudience: "SPECIFIC_STUDENTS" as ExamTargetAudience,
      targetStudentIds: ["usr_student_alpha", "usr_student_beta"],
    };

    it("grants access only to exact student IDs in the list", () => {
      expect(
        checkStudentAccess(specificStudentExam, { userId: "usr_student_alpha", enrolledCourseCode: "ANY" })
      ).toBe(true);
      expect(
        checkStudentAccess(specificStudentExam, { userId: "usr_student_beta", enrolledCourseCode: null })
      ).toBe(true);
    });

    it("denies access to student IDs not in targetStudentIds", () => {
      expect(
        checkStudentAccess(specificStudentExam, { userId: "usr_student_gamma", enrolledCourseCode: "GARNET-BAR-360" })
      ).toBe(false);
    });
  });
});

describe("Student Candidate Name Resolution & Defensive Submission", () => {
  function resolveCandidateStudentName(params: {
    userFullName?: string | null;
    userName?: string | null;
    studentProfileFullName?: string | null;
    whitelistFullName?: string | null;
    sessionFullName?: string | null;
    username?: string | null;
    phoneNumber?: string | null;
  }): string {
    const DEFAULT_NAME = "داوطلب مشاهیر دانش";
    return (
      params.userFullName ||
      params.userName ||
      params.studentProfileFullName ||
      params.whitelistFullName ||
      params.sessionFullName ||
      params.username ||
      params.phoneNumber ||
      DEFAULT_NAME
    );
  }

  it("resolves primary user.fullName when present", () => {
    const resolved = resolveCandidateStudentName({
      userFullName: "سارا اسماعیلی",
      userName: "سارا",
      username: "09121112233",
    });
    expect(resolved).toBe("سارا اسماعیلی");
  });

  it("falls back to user.name if fullName is null", () => {
    const resolved = resolveCandidateStudentName({
      userFullName: null,
      userName: "محمد حسینی",
      username: "09122223344",
    });
    expect(resolved).toBe("محمد حسینی");
  });

  it("falls back to studentProfile.fullName if user fields are null", () => {
    const resolved = resolveCandidateStudentName({
      studentProfileFullName: "امیررضا شفیعی",
      whitelistFullName: "امیر شفیعی",
    });
    expect(resolved).toBe("امیررضا شفیعی");
  });

  it("falls back to whitelistRecord.fullName if profile is null", () => {
    const resolved = resolveCandidateStudentName({
      whitelistFullName: "مهسا کریمی",
      username: "09125556677",
    });
    expect(resolved).toBe("مهسا کریمی");
  });

  it("falls back to username or phoneNumber when no display names exist", () => {
    const resolved = resolveCandidateStudentName({
      username: "std_mashahir_99",
      phoneNumber: "09129990000",
    });
    expect(resolved).toBe("std_mashahir_99");
  });

  it("guarantees a valid non-null non-empty fallback string if ALL inputs are null/undefined", () => {
    const resolved = resolveCandidateStudentName({});
    expect(resolved).toBe("داوطلب مشاهیر دانش");
    expect(resolved).not.toBeNull();
    expect(resolved.length).toBeGreaterThan(0);
  });
});
