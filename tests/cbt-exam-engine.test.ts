import { describe, it, expect } from "vitest";

describe("Iranian Bar Exam (Kanoon & Markaz Vokala) CBT Scoring Engine", () => {
  /**
   * The Official Iranian Bar Exam Scoring Formula with 1/3 Negative Penalty:
   * Percentage = max(0, ((Correct * 3) - Incorrect) / (TotalQuestions * 3) * 100)
   */
  function calculateIranianBarScore(correct: number, incorrect: number, totalQuestions: number): {
    rawPercentage: number;
    netPercentage: number;
  } {
    if (totalQuestions <= 0) return { rawPercentage: 0, netPercentage: 0 };
    const raw = (correct / totalQuestions) * 100;
    const rawNet = ((correct * 3 - incorrect) / (totalQuestions * 3)) * 100;
    const clampedNet = Math.max(0, Math.min(100, rawNet));
    return {
      rawPercentage: Number(raw.toFixed(2)),
      netPercentage: Number(clampedNet.toFixed(2)),
    };
  }

  it("calculates 100% for all correct answers", () => {
    const res = calculateIranianBarScore(120, 0, 120);
    expect(res.rawPercentage).toBe(100);
    expect(res.netPercentage).toBe(100);
  });

  it("calculates exact 0% when 1 correct and 3 wrong cancel each other out", () => {
    // 1 correct (+3), 3 incorrect (-3) => (3 - 3) / 12 * 100 = 0%
    const res = calculateIranianBarScore(1, 3, 4);
    expect(res.netPercentage).toBe(0);
    expect(res.rawPercentage).toBe(25);
  });

  it("clamps negative net scores to 0% (never negative)", () => {
    // 0 correct, 10 incorrect out of 20 questions => -10/60 * 100 = -16.67% => clamped to 0
    const res = calculateIranianBarScore(0, 10, 20);
    expect(res.netPercentage).toBe(0);
  });

  it("ensures unanswered (blank) questions do not penalize the candidate", () => {
    // 60 correct, 0 incorrect, 60 blank out of 120
    const res = calculateIranianBarScore(60, 0, 120);
    expect(res.netPercentage).toBe(50);
    expect(res.rawPercentage).toBe(50);
  });

  it("accurately handles 3:1 penalty ratio across typical Bar Exam volumes", () => {
    // 90 correct, 30 incorrect out of 120 questions
    // (90 * 3 - 30) / (120 * 3) = 240 / 360 = 66.67%
    const res = calculateIranianBarScore(90, 30, 120);
    expect(res.netPercentage).toBe(66.67);
    expect(res.rawPercentage).toBe(75);
  });
});

describe("Two-Stage Mentor Confirmation Gate & Anti-Leak Shield", () => {
  interface MockExamQuestion {
    id: string;
    questionNumber: number;
    subject: string;
    questionText: string;
    options: Array<{ id: number; text: string }>;
    correctOption: number;
    explanation?: string;
  }

  interface MockSubmission {
    id: string;
    examId: string;
    studentId: string;
    status: "IN_PROGRESS" | "AUTO_GRADED_PENDING_MENTOR" | "PUBLISHED_TO_STUDENT";
    totalPercentage: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    mentorNotes?: string;
  }

  const rawQuestions: MockExamQuestion[] = [
    {
      id: "q1",
      questionNumber: 1,
      subject: "حقوق مدنی",
      questionText: "کدام مورد در خصوص عقد بیع صحیح است؟",
      options: [
        { id: 1, text: "عقد عهدی است" },
        { id: 2, text: "عقد تملیکی است" },
        { id: 3, text: "عقد جایز است" },
        { id: 4, text: "عقد تشریفاتی است" },
      ],
      correctOption: 2,
      explanation: "ماده ۳۳۸ قانون مدنی بیع را تملیک عین به عوض معلوم دانسته است.",
    },
    {
      id: "q2",
      questionNumber: 2,
      subject: "آیین دادرسی مدنی",
      questionText: "مهلت واخواهی برای اشخاص مقیم خارج از کشور چند روز است؟",
      options: [
        { id: 1, text: "۲۰ روز" },
        { id: 2, text: "یک ماه" },
        { id: 3, text: "دو ماه" },
        { id: 4, text: "۴۰ روز" },
      ],
      correctOption: 3,
      explanation: "ماده ۳۰۶ قانون آیین دادرسی مدنی مهلت واخواهی برای مقیم خارج از کشور را دو ماه تعیین نموده است.",
    },
  ];

  function sanitizeQuestionsForStudent(
    questions: MockExamQuestion[],
    submissionStatus: MockSubmission["status"]
  ) {
    if (submissionStatus === "PUBLISHED_TO_STUDENT") {
      return questions; // Full key & explanations visible once confirmed by mentor
    }
    // During exam or pending review: strip correctOption and explanation
    return questions.map(({ correctOption, explanation, ...safeQ }) => safeQ);
  }

  function getStudentExamView(sub: MockSubmission) {
    if (sub.status !== "PUBLISHED_TO_STUDENT") {
      return {
        status: sub.status,
        scoreHidden: true,
        score: null,
        message: "پاسخنامه در انتظار تحلیل و تایید پشتیبان است.",
      };
    }
    return {
      status: sub.status,
      scoreHidden: false,
      score: sub.totalPercentage,
      mentorNotes: sub.mentorNotes,
    };
  }

  it("strictly hides correctOption and explanation during exam and pending review", () => {
    const duringExam = sanitizeQuestionsForStudent(rawQuestions, "IN_PROGRESS");
    expect(duringExam[0]).not.toHaveProperty("correctOption");
    expect(duringExam[0]).not.toHaveProperty("explanation");

    const pendingReview = sanitizeQuestionsForStudent(rawQuestions, "AUTO_GRADED_PENDING_MENTOR");
    expect(pendingReview[0]).not.toHaveProperty("correctOption");
    expect(pendingReview[0]).not.toHaveProperty("explanation");
    expect(pendingReview[1]).not.toHaveProperty("correctOption");
    expect(pendingReview[1]).not.toHaveProperty("explanation");
  });

  it("reveals correctOption and legal explanations only after mentor confirms", () => {
    const published = sanitizeQuestionsForStudent(rawQuestions, "PUBLISHED_TO_STUDENT");
    expect(published[0]).toHaveProperty("correctOption", 2);
    expect(published[0]).toHaveProperty("explanation");
    expect(published[1]).toHaveProperty("correctOption", 3);
  });

  it("hides candidate scores from student until mentor approval", () => {
    const sub: MockSubmission = {
      id: "sub_101",
      examId: "exam_1",
      studentId: "std_42",
      status: "AUTO_GRADED_PENDING_MENTOR",
      totalPercentage: 75.5,
      correctCount: 45,
      incorrectCount: 15,
      unansweredCount: 0,
    };

    const studentView = getStudentExamView(sub);
    expect(studentView.scoreHidden).toBe(true);
    expect(studentView.score).toBeNull();
  });

  it("exposes score and mentor prescription once status is PUBLISHED_TO_STUDENT", () => {
    const sub: MockSubmission = {
      id: "sub_101",
      examId: "exam_1",
      studentId: "std_42",
      status: "PUBLISHED_TO_STUDENT",
      totalPercentage: 75.5,
      correctCount: 45,
      incorrectCount: 15,
      unansweredCount: 0,
      mentorNotes: "تحلیل راهبردی: کنترل عالی نمره منفی در درس مدنی.",
    };

    const studentView = getStudentExamView(sub);
    expect(studentView.scoreHidden).toBe(false);
    expect(studentView.score).toBe(75.5);
    expect(studentView.mentorNotes).toBe("تحلیل راهبردی: کنترل عالی نمره منفی در درس مدنی.");
  });
});

describe("CBT Option Strike-Through & Bookmarking State Logic", () => {
  it("allows eliminating distractors and clears selected choice if struck through", () => {
    let answers: Record<string, number> = { q1: 1 };
    let eliminatedOptions: Record<string, number[]> = {};

    // Eliminate option 1 (which was currently selected)
    const qId = "q1";
    const optToStrike = 1;

    eliminatedOptions[qId] = [...(eliminatedOptions[qId] || []), optToStrike];
    if (answers[qId] === optToStrike) {
      delete answers[qId];
    }

    expect(eliminatedOptions[qId]).toContain(1);
    expect(answers[qId]).toBeUndefined();
  });

  it("restores eliminated option without altering existing answers", () => {
    let answers: Record<string, number> = { q1: 2 };
    let eliminatedOptions: Record<string, number[]> = { q1: [1, 3] };

    // Un-strike option 3
    eliminatedOptions["q1"] = eliminatedOptions["q1"].filter((id) => id !== 3);

    expect(eliminatedOptions["q1"]).toEqual([1]);
    expect(answers["q1"]).toBe(2);
  });

  it("flags and unflags questions for candidate review palette", () => {
    let flaggedQuestions: string[] = [];

    const toggleFlag = (qId: string) => {
      flaggedQuestions = flaggedQuestions.includes(qId)
        ? flaggedQuestions.filter((id) => id !== qId)
        : [...flaggedQuestions, qId];
    };

    toggleFlag("q1");
    expect(flaggedQuestions).toContain("q1");

    toggleFlag("q2");
    expect(flaggedQuestions).toEqual(["q1", "q2"]);

    toggleFlag("q1");
    expect(flaggedQuestions).toEqual(["q2"]);
  });
});
