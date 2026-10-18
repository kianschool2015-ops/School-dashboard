"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Clock,
  Calendar,
  TrendingUp,
  Plus,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Users,
  HelpCircle,
  Trash2,
  Check,
  X,
  FileQuestion,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import {
  createEvaluationExamAction,
  submitEvaluationExamAction,
  addExamQuestionAction,
  deleteExamQuestionAction,
  updateExamAudienceAction,
} from "@/server/actions/exams";
import type {
  EvaluationExamRecord,
  ExamSubmissionRecord,
  ExamQuestionRecord,
  QuestionType,
} from "@/types/models";

interface ExamsClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  studentProfileId?: string;
  exams: EvaluationExamRecord[];
  submissions: ExamSubmissionRecord[];
  studentsList: {
    id: string;
    fullName: string;
    nationalId: string;
    phone: string;
  }[];
}

export function ExamsClient({
  currentUser,
  studentProfileId,
  exams: initialExams,
  submissions: initialSubmissions,
  studentsList,
}: ExamsClientProps) {
  const [exams, setExams] = useState<EvaluationExamRecord[]>(initialExams);
  const [submissions, setSubmissions] = useState<ExamSubmissionRecord[]>(initialSubmissions);
  const [isCreating, setIsCreating] = useState(false);
  const [activeExamForTaking, setActiveExamForTaking] = useState<EvaluationExamRecord | null>(null);

  // Question Builder Modal State
  const [questionModalExam, setQuestionModalExam] = useState<EvaluationExamRecord | null>(null);
  const [qType, setQType] = useState<QuestionType>("MULTIPLE_CHOICE");
  const [qSubject, setQSubject] = useState("حقوق مدنی");
  const [qText, setQText] = useState("");
  const [qOption1, setQOption1] = useState("");
  const [qOption2, setQOption2] = useState("");
  const [qOption3, setQOption3] = useState("");
  const [qOption4, setQOption4] = useState("");
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qModelAnswer, setQModelAnswer] = useState("");
  const [qPoints, setQPoints] = useState(1);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);

  // Audience Modal State
  const [audienceModalExam, setAudienceModalExam] = useState<EvaluationExamRecord | null>(null);
  const [audienceMode, setAudienceMode] = useState<"ALL" | "SPECIFIC">("ALL");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSavingAudience, setIsSavingAudience] = useState(false);

  // New exam form state
  const [examTitle, setExamTitle] = useState("");
  const [examDesc, setExamDesc] = useState("");
  const [startTime, setStartTime] = useState("1403-08-01 08:00");
  const [endTime, setEndTime] = useState("1403-08-10 22:00");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [cohort, setCohort] = useState("کوهورت جامع وکالت ۱۴۰۳");
  const [newExamAudienceType, setNewExamAudienceType] = useState<"ALL" | "SPECIFIC">("ALL");
  const [newExamSelectedStudents, setNewExamSelectedStudents] = useState<string[]>([]);

  // Taking exam student answers state
  const [studentAnswers, setStudentAnswers] = useState<Record<string, number | string>>({});
  const [mockScores, setMockScores] = useState<Record<string, number>>({
    "حقوق مدنی": 75,
    "آیین دادرسی مدنی": 70,
    "حقوق تجارت": 68,
    "حقوق جزا": 80,
    "آیین دادرسی کیفری": 78,
    "متون فقه": 65,
  });

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageExams =
    currentUser.role === "SUPERVISOR" ||
    currentUser.role === "MENTOR" ||
    currentUser.role === "CEO" ||
    currentUser.role === "ADMIN";

  // Check student eligibility for an exam
  const isStudentEligible = (exam: EvaluationExamRecord): boolean => {
    if (!studentProfileId) return true;
    if (!exam.assignedStudentIds || exam.assignedStudentIds.length === 0) return true;
    if (exam.assignedStudentIds.includes("ALL")) return true;
    return exam.assignedStudentIds.includes(studentProfileId);
  };

  // 1. Create Exam Handler
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const assigned =
        newExamAudienceType === "ALL" ? ["ALL"] : newExamSelectedStudents;

      const res = await createEvaluationExamAction({
        title: examTitle,
        description: examDesc,
        startTime,
        endTime,
        durationMinutes,
        totalQuestions: 0,
        subjectsWeight: {
          "حقوق مدنی": 3,
          "آیین دادرسی مدنی": 3,
          "حقوق تجارت": 2,
          "حقوق جزا": 2,
          "آیین دادرسی کیفری": 2,
          "متون فقه": 1,
        },
        targetCohort: cohort,
        assignedStudentIds: assigned,
      });

      if (res.success && res.examId) {
        const newlyCreated: EvaluationExamRecord = {
          id: res.examId,
          creatorId: currentUser.id,
          creatorRole: currentUser.role as any,
          creatorName: currentUser.fullName,
          title: examTitle.trim(),
          description: examDesc.trim(),
          startTime,
          endTime,
          durationMinutes,
          totalQuestions: 0,
          subjectsWeight: { "حقوق مدنی": 3, "آیین دادرسی مدنی": 3 },
          isPublished: true,
          targetCohort: cohort.trim(),
          assignedStudentIds: assigned,
          questions: [],
          createdAt: new Date(),
        };
        setExams([newlyCreated, ...exams]);
        setFeedback({
          type: "success",
          text: "آزمون با موفقیت ایجاد شد. اکنون می‌توانید از دکمه «مدیریت و اضافه کردن سؤال» برای تعریف سؤالات آن استفاده کنید.",
        });
        setIsCreating(false);
        setExamTitle("");
        setExamDesc("");
        setNewExamSelectedStudents([]);
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در ایجاد آزمون." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در برقراری ارتباط با سرور." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Add Question Handler
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionModalExam) return;
    setIsAddingQuestion(true);
    setFeedback(null);

    let options: string[] | undefined;
    let correctOptionIndex: number | undefined;

    if (qType === "MULTIPLE_CHOICE") {
      options = [qOption1.trim(), qOption2.trim(), qOption3.trim(), qOption4.trim()];
      correctOptionIndex = qCorrectIdx;
    } else if (qType === "TRUE_FALSE") {
      options = ["صحیح", "غلط"];
      correctOptionIndex = qCorrectIdx;
    }

    try {
      const res = await addExamQuestionAction({
        examId: questionModalExam.id,
        type: qType,
        subject: qSubject,
        questionText: qText,
        options,
        correctOptionIndex,
        modelAnswer: qModelAnswer,
        points: qPoints,
      });

      if (res.success && res.question) {
        const updatedQuestions = [...(questionModalExam.questions || []), res.question];
        const updatedExam = {
          ...questionModalExam,
          questions: updatedQuestions,
          totalQuestions: updatedQuestions.length,
        };

        setQuestionModalExam(updatedExam);
        setExams(exams.map((ex) => (ex.id === updatedExam.id ? updatedExam : ex)));

        setFeedback({ type: "success", text: "سؤال جدید با موفقیت به آزمون اضافه شد." });
        setQText("");
        setQOption1("");
        setQOption2("");
        setQOption3("");
        setQOption4("");
        setQModelAnswer("");
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در افزودن سؤال." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطای ناشناخته در ثبت سؤال." });
    } finally {
      setIsAddingQuestion(false);
    }
  };

  // 3. Delete Question Handler
  const handleDeleteQuestion = async (questionId: string) => {
    if (!questionModalExam) return;
    try {
      const res = await deleteExamQuestionAction(questionModalExam.id, questionId);
      if (res.success) {
        const updatedQuestions = (questionModalExam.questions || []).filter(
          (q) => q.id !== questionId
        );
        const updatedExam = {
          ...questionModalExam,
          questions: updatedQuestions,
          totalQuestions: updatedQuestions.length,
        };
        setQuestionModalExam(updatedExam);
        setExams(exams.map((ex) => (ex.id === updatedExam.id ? updatedExam : ex)));
      }
    } catch {
      // Ignored
    }
  };

  // 4. Save Audience Handler
  const handleSaveAudience = async () => {
    if (!audienceModalExam) return;
    setIsSavingAudience(true);
    try {
      const targetList = audienceMode === "ALL" ? ["ALL"] : selectedStudentIds;
      const res = await updateExamAudienceAction(audienceModalExam.id, targetList);
      if (res.success) {
        const updated = { ...audienceModalExam, assignedStudentIds: targetList };
        setAudienceModalExam(null);
        setExams(exams.map((ex) => (ex.id === updated.id ? updated : ex)));
        setFeedback({ type: "success", text: res.message || "جامعه هدف ذخیره شد." });
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در تنظیم جامعه هدف." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ذخیره جامعه هدف." });
    } finally {
      setIsSavingAudience(false);
    }
  };

  // 5. Submit Answers
  const handleSubmitExamAnswers = async () => {
    if (!activeExamForTaking || !studentProfileId) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await submitEvaluationExamAction({
        examId: activeExamForTaking.id,
        studentProfileId,
        subjectScores: mockScores,
        correctCount: 85,
        wrongCount: 15,
        unansweredCount: 0,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: `پاسخنامه شما با موفقیت ثبت گردید. نمره کل تراز شده: ${res.scorePercent}٪ (رشد نسبت به آزمون قبلی: ${
            res.deltaFromPrevious && res.deltaFromPrevious > 0
              ? `+${res.deltaFromPrevious}`
              : res.deltaFromPrevious || 0
          }٪)`,
        });
        setActiveExamForTaking(null);
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در ثبت پاسخنامه." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ارسال پاسخنامه آزمون." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const latestSub = submissions[submissions.length - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">
            سامانه آزمون‌های ارزیابی و طراح سؤالات
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            تعریف آزمون‌های تستی و تشریحی، طراحی و ثبت بانک سؤالات، تخصیص داوطلبان و تحلیل رشد تراز (Delta)
          </p>
        </div>

        {canManageExams && (
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 h-11 px-5 bg-[#004071] hover:bg-[#003157] text-white shadow-md font-semibold text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            {isCreating ? "انصراف" : "تعریف آزمون ارزیابی جدید"}
          </Button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs sm:text-sm font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Longitudinal Analytics (for student or supervisor) */}
      {submissions.length > 0 && (
        <Card className="border border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-4 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                تحلیل روند رشد و شاخص مقایسه‌ای دلتا (Longitudinal Progress)
              </CardTitle>
            </div>
            {latestSub && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs px-3 py-1">
                رتبه تقریبی در کوهورت: {latestSub.rank}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground">آخرین نمره تراز شده</p>
                <p className="text-2xl font-black text-foreground mt-1 font-mono">
                  {latestSub?.scorePercent || 0}٪
                </p>
              </div>

              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  رشد نسبت به آزمون قبلی (Delta)
                </p>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                  <ArrowUpRight className="h-6 w-6" />
                  {latestSub?.deltaFromPrevious && latestSub.deltaFromPrevious > 0
                    ? `+${latestSub.deltaFromPrevious}`
                    : latestSub?.deltaFromPrevious || 0}
                  ٪
                </p>
              </div>

              <div className="p-4 bg-[#004071]/10 rounded-xl border border-[#004071]/20">
                <p className="text-xs text-[#004071] dark:text-sky-300 font-medium">رشد از نقطه آغاز</p>
                <p className="text-2xl font-black text-[#004071] dark:text-sky-400 mt-1 flex items-center gap-1 font-mono">
                  <TrendingUp className="h-6 w-6" />
                  {latestSub?.deltaFromBaseline && latestSub.deltaFromBaseline > 0
                    ? `+${latestSub.deltaFromBaseline}`
                    : latestSub?.deltaFromBaseline || 0}
                  ٪
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create New Exam Form with Audience Selection */}
      {isCreating && canManageExams && (
        <Card className="border-2 border-[#004071]/30 bg-[#004071]/5 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-bold text-[#004071] dark:text-sky-300 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              تعریف آزمون ارزیابی جدید و تعیین مخاطبان
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">عنوان آزمون ارزیابی:</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="مثال: آزمون جامع حقوق مدنی و آیین دادرسی"
                    className="w-full h-11 px-3 text-xs border border-border rounded-xl bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">کوهورت هدف:</label>
                  <input
                    type="text"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                    className="w-full h-11 px-3 text-xs border border-border rounded-xl bg-background"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">توضیحات و سرفصل‌ها:</label>
                <textarea
                  rows={2}
                  value={examDesc}
                  onChange={(e) => setExamDesc(e.target.value)}
                  placeholder="سرفصل‌های مواد قانونی مورد ارزیابی..."
                  className="w-full p-3 text-xs border border-border rounded-xl bg-background"
                  required
                />
              </div>

              {/* Time Span */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-background border border-border rounded-xl">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">آغاز بازه آزمون:</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-border rounded-lg bg-background font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">پایان مهلت آزمون:</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-9 px-2 text-xs border border-border rounded-lg bg-background font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">مدت آزمون (دقیقه):</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full h-9 px-2 text-xs border border-border rounded-lg bg-background font-mono"
                    required
                  />
                </div>
              </div>

              {/* Audience Targeting Configuration */}
              <div className="p-4 bg-background border border-border rounded-xl space-y-3">
                <label className="block text-xs font-bold text-foreground">
                  تعیین داوطلبان مجاز برای شرکت در آزمون (Audience Targeting):
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="newExamAudience"
                      checked={newExamAudienceType === "ALL"}
                      onChange={() => setNewExamAudienceType("ALL")}
                      className="accent-[#004071]"
                    />
                    <span>همه داوطلبان کوهورت (عمومی)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="newExamAudience"
                      checked={newExamAudienceType === "SPECIFIC"}
                      onChange={() => setNewExamAudienceType("SPECIFIC")}
                      className="accent-[#004071]"
                    />
                    <span>داوطلبان منتخب و اختصاصی</span>
                  </label>
                </div>

                {newExamAudienceType === "SPECIFIC" && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <p className="text-[11px] text-muted-foreground">داوطلبانی که مجاز به شرکت هستند را انتخاب فرمایید:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 border border-border rounded-lg p-2 bg-muted/20">
                      {studentsList.map((st) => (
                        <label
                          key={st.id}
                          className="flex items-center justify-between p-1.5 hover:bg-muted/50 rounded text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newExamSelectedStudents.includes(st.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewExamSelectedStudents([...newExamSelectedStudents, st.id]);
                                } else {
                                  setNewExamSelectedStudents(
                                    newExamSelectedStudents.filter((id) => id !== st.id)
                                  );
                                }
                              }}
                              className="accent-[#004071]"
                            />
                            <span className="font-medium text-foreground">{st.fullName}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">{st.phone}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 px-6 bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs"
                >
                  {isSubmitting ? "در حال ایجاد..." : "ایجاد آزمون و ورود به مرحله افزودن سؤال"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="h-11 px-5 text-xs"
                >
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Available Exams Cards List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-foreground">فهرست آزمون‌های ارزیابی:</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exams.map((exam) => {
            const eligible = isStudentEligible(exam);
            const isAudienceAll =
              !exam.assignedStudentIds ||
              exam.assignedStudentIds.length === 0 ||
              exam.assignedStudentIds.includes("ALL");
            const questionsCount = exam.questions?.length || 0;

            return (
              <Card
                key={exam.id}
                className="border border-border shadow-sm rounded-2xl overflow-hidden hover:border-[#004071]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-4 bg-muted/20 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-sm font-bold text-foreground">
                          {exam.title}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {exam.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 border-[#004071]/30 text-[#004071] dark:text-sky-300">
                        {exam.targetCohort}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> آغاز:{" "}
                        <strong className="font-mono text-foreground">{exam.startTime}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> مهلت:{" "}
                        <strong className="font-mono text-foreground">{exam.endTime}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {exam.durationMinutes} دقیقه
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-semibold ${
                          questionsCount > 0
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                        }`}
                      >
                        <FileQuestion className="h-3 w-3 me-1 inline" />
                        {questionsCount} سؤال ثبت‌شده
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isAudienceAll
                            ? "border-sky-500/30 text-sky-700 dark:text-sky-300"
                            : "border-purple-500/30 text-purple-700 dark:text-purple-300"
                        }`}
                      >
                        <Users className="h-3 w-3 me-1 inline" />
                        {isAudienceAll
                          ? "همه داوطلبان"
                          : `${exam.assignedStudentIds?.length} داوطلب اختصاصی`}
                      </Badge>
                    </div>
                  </CardContent>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 pt-0 space-y-2">
                  {/* Management Buttons for Admin/Supervisor/Mentor */}
                  {canManageExams && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
                      <Button
                        onClick={() => {
                          setQuestionModalExam(exam);
                          setQType("MULTIPLE_CHOICE");
                        }}
                        className="flex-1 h-10 text-xs font-semibold bg-[#004071] hover:bg-[#003157] text-white flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        مدیریت و اضافه کردن سؤال
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAudienceModalExam(exam);
                          const isAll =
                            !exam.assignedStudentIds ||
                            exam.assignedStudentIds.includes("ALL");
                          setAudienceMode(isAll ? "ALL" : "SPECIFIC");
                          setSelectedStudentIds(
                            isAll ? [] : exam.assignedStudentIds || []
                          );
                        }}
                        className="h-10 px-3 text-xs border-border flex items-center gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        مخاطبان
                      </Button>
                    </div>
                  )}

                  {/* Student Action */}
                  {currentUser.role === "STUDENT" && (
                    <div>
                      {eligible ? (
                        <Button
                          onClick={() => {
                            setActiveExamForTaking(exam);
                            setStudentAnswers({});
                          }}
                          className="w-full h-11 text-xs font-bold flex items-center justify-center gap-2 bg-[#004071] hover:bg-[#003157] text-white shadow-md"
                        >
                          <PlayCircle className="h-4 w-4" />
                          ورود به آزمون و ثبت کارنامه
                        </Button>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-border text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                          <ShieldAlert className="h-4 w-4 text-amber-500" />
                          این آزمون مخصوص داوطلبان منتخب است.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: QUESTION BUILDER (اضافه کردن سؤال با اولویت چهارگزینه‌ای)
          ===================================================================== */}
      {questionModalExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-3xl bg-background border border-border shadow-2xl rounded-2xl my-8 overflow-hidden">
            <CardHeader className="p-4 bg-[#004071]/10 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-[#004071] dark:text-sky-300" />
                  مدیریت و اضافه کردن سؤال: {questionModalExam.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  طراحی سؤالات چهارگزینه‌ای (پیش‌فرض)، تشریحی، کوتاه‌پاسخ و صحیح/غلط
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setQuestionModalExam(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Form to Add New Question */}
              <div className="p-4 rounded-xl border-2 border-[#004071]/20 bg-muted/20 space-y-4">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#004071] dark:text-sky-300" />
                  طرح سؤال جدید:
                </h4>

                <form onSubmit={handleAddQuestion} className="space-y-4">
                  {/* Question Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      نوع سؤال:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setQType("MULTIPLE_CHOICE")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          qType === "MULTIPLE_CHOICE"
                            ? "bg-[#004071] text-white border-[#004071] shadow-sm"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        چهارگزینه‌ای (پیش‌فرض)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQType("DESCRIPTIVE")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          qType === "DESCRIPTIVE"
                            ? "bg-[#004071] text-white border-[#004071] shadow-sm"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        تشریحی
                      </button>
                      <button
                        type="button"
                        onClick={() => setQType("SHORT_ANSWER")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          qType === "SHORT_ANSWER"
                            ? "bg-[#004071] text-white border-[#004071] shadow-sm"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        کوتاه‌پاسخ
                      </button>
                      <button
                        type="button"
                        onClick={() => setQType("TRUE_FALSE")}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          qType === "TRUE_FALSE"
                            ? "bg-[#004071] text-white border-[#004071] shadow-sm"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        صحیح / غلط
                      </button>
                    </div>
                  </div>

                  {/* Subject and Points */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        درس امتحانی:
                      </label>
                      <select
                        value={qSubject}
                        onChange={(e) => setQSubject(e.target.value)}
                        className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                      >
                        <option value="حقوق مدنی">حقوق مدنی</option>
                        <option value="آیین دادرسی مدنی">آیین دادرسی مدنی</option>
                        <option value="حقوق تجارت">حقوق تجارت</option>
                        <option value="حقوق جزا">حقوق جزا</option>
                        <option value="آیین دادرسی کیفری">آیین دادرسی کیفری</option>
                        <option value="متون فقه">متون فقه / اصول فقه</option>
                        <option value="حقوق اساسی">حقوق اساسی</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        بارم نمره سؤال:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={qPoints}
                        onChange={(e) => setQPoints(Number(e.target.value))}
                        className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      متن سؤال:
                    </label>
                    <textarea
                      rows={3}
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="صورت مسئله یا تست آزمونی را بنویسید..."
                      className="w-full p-3 text-xs border border-border rounded-xl bg-background"
                      required
                    />
                  </div>

                  {/* Options for MULTIPLE_CHOICE */}
                  {qType === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-background border border-border">
                      <p className="text-xs font-bold text-foreground">
                        گزینه‌های پاسخ (گزینه صحیح را تیک بزنید):
                      </p>
                      {[
                        { label: "گزینه ۱", val: qOption1, setVal: setQOption1, idx: 0 },
                        { label: "گزینه ۲", val: qOption2, setVal: setQOption2, idx: 1 },
                        { label: "گزینه ۳", val: qOption3, setVal: setQOption3, idx: 2 },
                        { label: "گزینه ۴", val: qOption4, setVal: setQOption4, idx: 3 },
                      ].map((opt) => (
                        <div key={opt.idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correctOption"
                            checked={qCorrectIdx === opt.idx}
                            onChange={() => setQCorrectIdx(opt.idx)}
                            className="h-4 w-4 accent-[#004071] cursor-pointer"
                          />
                          <span className="text-xs font-medium text-muted-foreground w-14">
                            {opt.label}:
                          </span>
                          <input
                            type="text"
                            value={opt.val}
                            onChange={(e) => opt.setVal(e.target.value)}
                            placeholder={`متن ${opt.label}...`}
                            className="flex-1 h-9 px-3 text-xs border border-border rounded-lg bg-background"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Options for TRUE_FALSE */}
                  {qType === "TRUE_FALSE" && (
                    <div className="p-3 rounded-xl bg-background border border-border space-y-2">
                      <p className="text-xs font-bold text-foreground">پاسخ صحیح گزینه:</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="tfCorrect"
                            checked={qCorrectIdx === 0}
                            onChange={() => setQCorrectIdx(0)}
                            className="accent-[#004071]"
                          />
                          <span>صحیح</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="tfCorrect"
                            checked={qCorrectIdx === 1}
                            onChange={() => setQCorrectIdx(1)}
                            className="accent-[#004071]"
                          />
                          <span>غلط</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Model Answer for Descriptive / Short Answer */}
                  {(qType === "DESCRIPTIVE" || qType === "SHORT_ANSWER") && (
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1">
                        کلید پاسخ و نکات ارزیابی:
                      </label>
                      <textarea
                        rows={2}
                        value={qModelAnswer}
                        onChange={(e) => setQModelAnswer(e.target.value)}
                        placeholder="نکات کلیدی یا ماده قانونی مستند برای تصحیح..."
                        className="w-full p-2.5 text-xs border border-border rounded-xl bg-background"
                      />
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isAddingQuestion}
                    className="h-11 px-6 bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs"
                  >
                    {isAddingQuestion ? "در حال ثبت سؤال..." : "ثبت سؤال در آزمون"}
                  </Button>
                </form>
              </div>

              {/* List of Existing Questions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground">
                  سؤالات ثبت‌شده در این آزمون ({questionModalExam.questions?.length || 0} مورد):
                </h4>

                {(!questionModalExam.questions || questionModalExam.questions.length === 0) ? (
                  <p className="text-xs text-muted-foreground p-4 text-center border border-dashed rounded-xl">
                    هنوز سؤالی برای این آزمون ثبت نشده است. از فرم بالا برای اضافه کردن سؤال استفاده فرمایید.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {questionModalExam.questions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-3.5 rounded-xl border border-border bg-card space-y-2 relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-full bg-[#004071]/10 text-[#004071] dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                              {idx + 1}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {q.subject}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {q.type === "MULTIPLE_CHOICE"
                                ? "چهارگزینه‌ای"
                                : q.type === "DESCRIPTIVE"
                                ? "تشریحی"
                                : q.type === "SHORT_ANSWER"
                                ? "کوتاه‌پاسخ"
                                : "صحیح/غلط"}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-xs text-foreground font-medium leading-relaxed">
                          {q.questionText}
                        </p>

                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-lg text-xs flex items-center justify-between ${
                                  optIdx === q.correctOptionIndex
                                    ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-semibold"
                                    : "bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                <span>
                                  {optIdx + 1}) {opt}
                                </span>
                                {optIdx === q.correctOptionIndex && (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: AUDIENCE TARGETING (مشخص‌کردن افرادی که باید آزمون را داشته باشند)
          ===================================================================== */}
      {audienceModalExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-background border border-border shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-muted/20 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-[#004071] dark:text-sky-300" />
                  جامعه هدف آزمون: {audienceModalExam.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تعیین دسترسی داوطلبان جهت شرکت در این آزمون
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAudienceModalExam(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="audTarget"
                    checked={audienceMode === "ALL"}
                    onChange={() => setAudienceMode("ALL")}
                    className="accent-[#004071]"
                  />
                  <span>همه داوطلبان کوهورت مجاز به شرکت هستند (عمومی)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="audTarget"
                    checked={audienceMode === "SPECIFIC"}
                    onChange={() => setAudienceMode("SPECIFIC")}
                    className="accent-[#004071]"
                  />
                  <span>تنها داوطلبان منتخب زیر مجاز به شرکت هستند:</span>
                </label>
              </div>

              {audienceMode === "SPECIFIC" && (
                <div className="space-y-2 border border-border rounded-xl p-3 bg-muted/20 max-h-56 overflow-y-auto">
                  {studentsList.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center justify-between p-2 hover:bg-muted/60 rounded-lg text-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(st.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudentIds([...selectedStudentIds, st.id]);
                            } else {
                              setSelectedStudentIds(
                                selectedStudentIds.filter((id) => id !== st.id)
                              );
                            }
                          }}
                          className="accent-[#004071]"
                        />
                        <span className="font-semibold text-foreground">{st.fullName}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{st.phone}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button
                  onClick={handleSaveAudience}
                  disabled={isSavingAudience}
                  className="flex-1 h-11 bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs"
                >
                  {isSavingAudience ? "در حال ذخیره..." : "ذخیره دسترسی داوطلبان"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAudienceModalExam(null)}
                  className="h-11 px-5 text-xs"
                >
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: STUDENT TAKING EXAM
          ===================================================================== */}
      {activeExamForTaking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-background border border-border shadow-2xl rounded-2xl my-8 overflow-hidden">
            <CardHeader className="p-4 bg-[#004071]/10 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <GraduationCap className="h-5 w-5 text-[#004071] dark:text-sky-300" />
                  آزمون آنلاین: {activeExamForTaking.title}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مدت آزمون: {activeExamForTaking.durationMinutes} دقیقه | سرفصل: دروس کانون وکلا
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveExamForTaking(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* If exam has real questions defined */}
              {activeExamForTaking.questions && activeExamForTaking.questions.length > 0 ? (
                <div className="space-y-6">
                  {activeExamForTaking.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl border border-border bg-card space-y-3"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-6 w-6 rounded-full bg-[#004071] text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-foreground">{q.subject}</span>
                        <span>({q.points} نمره)</span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
                        {q.questionText}
                      </p>

                      {/* Multiple choice options */}
                      {q.options && (
                        <div className="space-y-2 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                studentAnswers[q.id] === optIdx
                                  ? "bg-[#004071]/10 border-[#004071] text-foreground font-semibold"
                                  : "border-border hover:bg-muted/40"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`q_${q.id}`}
                                checked={studentAnswers[q.id] === optIdx}
                                onChange={() =>
                                  setStudentAnswers({ ...studentAnswers, [q.id]: optIdx })
                                }
                                className="h-4 w-4 accent-[#004071]"
                              />
                              <span>
                                {optIdx + 1}) {opt}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Text answer if descriptive */}
                      {!q.options && (
                        <textarea
                          rows={3}
                          placeholder="پاسخ تشریحی خود را اینجا مرقوم فرمایید..."
                          value={(studentAnswers[q.id] as string) || ""}
                          onChange={(e) =>
                            setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })
                          }
                          className="w-full p-3 text-xs border border-border rounded-xl bg-background"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-muted/40 rounded-xl text-xs leading-relaxed text-muted-foreground">
                    پاسخ‌های تستی شما به صورت خودکار تراز گردیده و بلافاصله پس از ارسال، دلتا پیشرفت شما در مقایسه با آزمون‌های قبلی محاسبه خواهد شد.
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-foreground">درصد تخمینی پاسخ‌ها در دروس ۶ گانه:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(mockScores).map(([subj, score]) => (
                        <div key={subj} className="space-y-1">
                          <label className="text-[10px] text-muted-foreground block">{subj}</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={score}
                            onChange={(e) =>
                              setMockScores({
                                ...mockScores,
                                [subj]: Math.min(100, Math.max(0, Number(e.target.value))),
                              })
                            }
                            className="w-full h-9 px-2 text-xs border border-border rounded-lg bg-background font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <Button
                  onClick={handleSubmitExamAnswers}
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs"
                >
                  {isSubmitting ? "در حال ثبت کارنامه..." : "ارسال نهایی پاسخنامه و محاسبه دلتا"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveExamForTaking(null)}
                  className="h-11 px-5 text-xs"
                >
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
