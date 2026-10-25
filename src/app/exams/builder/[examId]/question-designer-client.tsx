"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Check,
  Send,
  HelpCircle,
  FileText,
  Sliders,
  X,
  Users,
  UserCheck,
  Search,
} from "lucide-react";
import { toPersianDigits, formatJalaliDate } from "@/lib/jalali";
import { JalaliDatePicker } from "@/components/ui/jalali-datepicker";
import {
  updateExamHeaderAction,
  addProductionExamQuestionAction,
  updateProductionExamQuestionAction,
  deleteProductionExamQuestionAction,
  reorderExamQuestionsAction,
  publishExamAction,
} from "@/server/actions/exams";
import type {
  ExamRecord,
  ExamQuestion,
  ExamCategory,
  ExamOptionItem,
  ExamTargetAudience,
} from "@/types/models";

const LEGAL_SUBJECTS = [
  "حقوق مدنی",
  "آیین دادرسی مدنی",
  "حقوق تجارت",
  "حقوق جزا و جرم‌شناسی",
  "آیین دادرسی کیفری",
  "حقوق اساسی",
  "متون فقه و اصول فقه",
];

export interface TargetCourse {
  code: string;
  name: string;
}

export interface TargetStudent {
  id: string;
  fullName: string;
  phoneNumber: string;
  nationalId: string;
  enrolledCourseName?: string | null;
  enrolledCourseCode?: string | null;
}

interface QuestionDesignerClientProps {
  exam: ExamRecord;
  initialQuestions: ExamQuestion[];
  userRole: string;
  targetCourses?: TargetCourse[];
  targetStudents?: TargetStudent[];
}

export function QuestionDesignerClient({
  exam: initialExam,
  initialQuestions,
  targetCourses = [],
  targetStudents = [],
}: QuestionDesignerClientProps) {
  const [exam, setExam] = useState<ExamRecord>(initialExam);
  const [questions, setQuestions] = useState<ExamQuestion[]>(initialQuestions);

  // Exam Header Edit Form State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerTitle, setHeaderTitle] = useState(exam.title);
  const [headerCourseCode, setHeaderCourseCode] = useState(exam.courseCode || "GARNET-BAR-MASTER");
  const [headerCategory, setHeaderCategory] = useState<ExamCategory>(exam.category);
  const [headerDuration, setHeaderDuration] = useState(exam.durationMinutes);
  const [headerNegativeMarking, setHeaderNegativeMarking] = useState(exam.hasNegativeMarking);
  const [headerStartDate, setHeaderStartDate] = useState(
    exam.startDate ? formatJalaliDate(new Date(exam.startDate)) + " 09:00" : "1405/01/15 09:00"
  );
  const [headerExpiryDate, setHeaderExpiryDate] = useState(
    exam.expiryDate ? formatJalaliDate(new Date(exam.expiryDate)) + " 12:00" : "1405/01/15 12:00"
  );
  const [isSavingHeader, setIsSavingHeader] = useState(false);

  // Target Audience Form State
  const [headerTargetAudience, setHeaderTargetAudience] = useState<ExamTargetAudience>(
    exam.targetAudience || "ALL"
  );
  const [headerTargetCourseCodes, setHeaderTargetCourseCodes] = useState<string[]>(
    Array.isArray(exam.targetCourseCodes) ? exam.targetCourseCodes : []
  );
  const [headerTargetStudentIds, setHeaderTargetStudentIds] = useState<string[]>(
    Array.isArray(exam.targetStudentIds) ? exam.targetStudentIds : []
  );
  const [headerStudentSearch, setHeaderStudentSearch] = useState("");

  const activeCourses: TargetCourse[] =
    targetCourses.length > 0
      ? targetCourses
      : [
          { code: "GARNET-BAR-MASTER", name: "دوره جامع مستر وکالت" },
          { code: "CRASH-BAR", name: "دوره ضربتی آزمون وکالت" },
          { code: "SAVIOR-FALL-1405", name: "کلاس نجات پاییز ۱۴۰۵" },
          { code: "GARNET-BAR-360", name: "دوره جامع آمادگی آزمون وکالت ۳۶۰" },
          { code: "DIAGNOSTIC-1405", name: "دوره سنجش و تعیین سطح وکالت ۱۴۰۵" },
        ];

  const filteredStudents = targetStudents.filter((st) => {
    if (!headerStudentSearch.trim()) return true;
    const q = headerStudentSearch.toLowerCase().trim();
    return (
      st.fullName.toLowerCase().includes(q) ||
      st.phoneNumber.includes(q) ||
      st.nationalId.includes(q) ||
      (st.enrolledCourseName && st.enrolledCourseName.toLowerCase().includes(q))
    );
  });

  // Question Form State (for Add or Edit)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [subject, setSubject] = useState(LEGAL_SUBJECTS[0]);
  const [questionText, setQuestionText] = useState("");
  const [option1, setOption1] = useState("");
  const [option2, setOption2] = useState("");
  const [option3, setOption3] = useState("");
  const [option4, setOption4] = useState("");
  const [correctOption, setCorrectOption] = useState<number>(1);
  const [explanation, setExplanation] = useState("");
  const [coefficient, setCoefficient] = useState<number>(1);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Reset question form
  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setOption1("");
    setOption2("");
    setOption3("");
    setOption4("");
    setCorrectOption(1);
    setExplanation("");
    setCoefficient(1);
  };

  // Populate form for editing
  const handleStartEditQuestion = (q: ExamQuestion) => {
    setEditingQuestionId(q.id);
    setSubject(q.subject);
    setQuestionText(q.questionText);
    setOption1(q.options[0]?.text || "");
    setOption2(q.options[1]?.text || "");
    setOption3(q.options[2]?.text || "");
    setOption4(q.options[3]?.text || "");
    setCorrectOption(q.correctOption);
    setExplanation(q.explanation || "");
    setCoefficient(q.coefficient || 1);

    // Scroll to form smoothly
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  // Save Header
  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();

    if (headerTargetAudience === "COURSE_CODE" && headerTargetCourseCodes.length === 0) {
      setFeedback({
        type: "error",
        text: "در حالت تخصیص بر اساس کد دوره، انتخاب حداقل یک دوره الزامی است.",
      });
      return;
    }

    if (headerTargetAudience === "SPECIFIC_STUDENTS" && headerTargetStudentIds.length === 0) {
      setFeedback({
        type: "error",
        text: "در حالت تخصیص به داوطلبان منتخب، انتخاب حداقل یک داوطلب الزامی است.",
      });
      return;
    }

    setIsSavingHeader(true);
    setFeedback(null);

    try {
      const res = await updateExamHeaderAction({
        examId: exam.id,
        title: headerTitle,
        courseCode: headerCourseCode,
        category: headerCategory,
        durationMinutes: headerDuration,
        hasNegativeMarking: headerNegativeMarking,
        targetAudience: headerTargetAudience,
        targetCourseCodes: headerTargetCourseCodes,
        targetStudentIds: headerTargetStudentIds,
        startDate: headerStartDate,
        expiryDate: headerExpiryDate,
      });

      if (res.success) {
        setExam((prev) => ({
          ...prev,
          title: headerTitle,
          courseCode: headerCourseCode,
          category: headerCategory,
          durationMinutes: headerDuration,
          hasNegativeMarking: headerNegativeMarking,
          targetAudience: headerTargetAudience,
          targetCourseCodes: headerTargetCourseCodes,
          targetStudentIds: headerTargetStudentIds,
          startDate: headerStartDate,
          expiryDate: headerExpiryDate,
        }));
        setIsEditingHeader(false);
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در به‌روزرسانی مشخصات آزمون." });
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Save Question (Create or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setFeedback({ type: "error", text: "متن سؤال نمی‌تواند خالی باشد." });
      return;
    }
    if (!option1.trim() || !option2.trim() || !option3.trim() || !option4.trim()) {
      setFeedback({ type: "error", text: "ورود متن تمامی ۴ گزینه الزامی است." });
      return;
    }

    setIsSavingQuestion(true);
    setFeedback(null);

    const options: ExamOptionItem[] = [
      { id: 1, text: option1.trim() },
      { id: 2, text: option2.trim() },
      { id: 3, text: option3.trim() },
      { id: 4, text: option4.trim() },
    ];

    try {
      if (editingQuestionId) {
        // Update existing question
        const res = await updateProductionExamQuestionAction({
          questionId: editingQuestionId,
          subject,
          questionText,
          options,
          correctOption,
          explanation,
          coefficient,
        });

        if (res.success) {
          setQuestions((prev) =>
            prev.map((q) =>
              q.id === editingQuestionId
                ? {
                    ...q,
                    subject,
                    questionText,
                    options,
                    correctOption,
                    explanation,
                    coefficient,
                  }
                : q
            )
          );
          setFeedback({ type: "success", text: res.message });
          resetQuestionForm();
        } else {
          setFeedback({ type: "error", text: res.message });
        }
      } else {
        // Add new question
        const res = await addProductionExamQuestionAction({
          examId: exam.id,
          subject,
          questionText,
          options,
          correctOption,
          explanation,
          coefficient,
        });

        if (res.success && res.questionId) {
          const newQ: ExamQuestion = {
            id: res.questionId,
            examId: exam.id,
            questionNumber: questions.length + 1,
            subject,
            questionText,
            options,
            correctOption,
            explanation,
            coefficient,
          };
          setQuestions((prev) => [...prev, newQ]);
          setExam((prev) => ({ ...prev, totalQuestions: prev.totalQuestions + 1 }));
          setFeedback({ type: "success", text: res.message });
          resetQuestionForm();
        } else {
          setFeedback({ type: "error", text: res.message });
        }
      }
    } catch {
      setFeedback({ type: "error", text: "خطای سیستمی در ثبت سؤال." });
    } finally {
      setIsSavingQuestion(false);
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("آیا از حذف این سؤال از آزمون اطمینان دارید؟")) return;
    try {
      const res = await deleteProductionExamQuestionAction(exam.id, questionId);
      if (res.success) {
        const remaining = questions.filter((q) => q.id !== questionId);
        const reindexed = remaining.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
        setQuestions(reindexed);
        setExam((prev) => ({ ...prev, totalQuestions: reindexed.length }));
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در حذف سؤال." });
    }
  };

  // Re-order Questions
  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = [...questions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const updatedWithNumbers = reordered.map((q, idx) => ({
      ...q,
      questionNumber: idx + 1,
    }));
    setQuestions(updatedWithNumbers);

    try {
      const ids = updatedWithNumbers.map((q) => q.id);
      await reorderExamQuestionsAction(exam.id, ids);
    } catch {
      console.warn("Failed to persist order");
    }
  };

  // Publish / Unpublish Exam
  const handlePublishToggle = async () => {
    if (!exam.isPublished && questions.length === 0) {
      setFeedback({
        type: "error",
        text: "آزمون باید دارای حداقل یک سؤال باشد تا قابلیت انتشار در سامانه را داشته باشد.",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const nextStatus = !exam.isPublished;
      const res = await publishExamAction(exam.id, nextStatus);
      if (res.success) {
        setExam((prev) => ({ ...prev, isPublished: nextStatus }));
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در انتشار آزمون." });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2 space-x-reverse">
          <Link href="/exams/builder">
            <Button variant="ghost" size="sm" className="h-8 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>بازگشت به فهرست آزمون‌ها</span>
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-bold text-foreground line-clamp-1">{exam.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Finalization Button: انتشار آزمون در سامانه */}
          <Button
            size="sm"
            disabled={isPublishing}
            onClick={handlePublishToggle}
            className={`text-xs flex items-center gap-1.5 shadow-sm ${
              exam.isPublished
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }`}
          >
            {exam.isPublished ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>منتشر شده در سامانه (کلیک برای لغو)</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>انتشار نهایی آزمون در سامانه</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Exam Header Overview & Quick Edit */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold text-foreground">
              مشخصات ساختاری و مدیریتی آزمون
            </CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingHeader(!isEditingHeader)}
            className="text-xs h-7 border-border flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Sliders className="h-3 w-3" />
            <span>{isEditingHeader ? "بستن ویرایش مشخصات" : "ویرایش مشخصات آزمون"}</span>
          </Button>
        </CardHeader>

        <CardContent className="pt-4">
          {isEditingHeader ? (
            <form onSubmit={handleSaveHeader} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1 lg:col-span-2">
                  <label className="text-[11px] font-semibold text-foreground">عنوان آزمون</label>
                  <input
                    type="text"
                    required
                    value={headerTitle}
                    onChange={(e) => setHeaderTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">دوره آموزشی / کلاس هدف</label>
                  <select
                    value={headerCourseCode}
                    onChange={(e) => setHeaderCourseCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    {activeCourses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">دسته‌بندی</label>
                  <select
                    value={headerCategory}
                    onChange={(e) => setHeaderCategory(e.target.value as ExamCategory)}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="MOCK_BAR">شبیه‌ساز وکالت (جامع)</option>
                    <option value="DIAGNOSTIC">تعیین سطح و سنجش تشخیصی</option>
                    <option value="SUBJECT_SPECIFIC">موضوعی و تک‌درس</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">مدت زمان (دقیقه)</label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={headerDuration}
                    onChange={(e) => setHeaderDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                {/* Jalali Start Date & Time */}
                <div className="space-y-1">
                  <JalaliDatePicker
                    label="زمان آغاز آزمون (شمسی - پایه ۱۴۰۵)"
                    value={headerStartDate}
                    onChange={(val) => setHeaderStartDate(val)}
                    baseYear={1405}
                    includeTime={true}
                    placeholder="انتخاب زمان شروع آزمون..."
                  />
                </div>

                {/* Jalali Expiry Date & Time */}
                <div className="space-y-1">
                  <JalaliDatePicker
                    label="مهلت پاسخگویی و انقضای آزمون (شمسی)"
                    value={headerExpiryDate}
                    onChange={(val) => setHeaderExpiryDate(val)}
                    baseYear={1405}
                    includeTime={true}
                    placeholder="انتخاب زمان پایان آزمون..."
                  />
                </div>
                <div className="space-y-1 flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={headerNegativeMarking}
                      onChange={(e) => setHeaderNegativeMarking(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-border text-amber-600 focus:ring-amber-500"
                    />
                    <span>نمره منفی یک‌سوم فعال باشد</span>
                  </label>
                </div>
              </div>

              {/* Dedicated Target Audience Card */}
              <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-amber-500" />
                    <label className="text-xs font-bold text-foreground">
                      جامعه هدف و تخصیص آزمون (مخاطبان) <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/10">
                    {headerTargetAudience === "ALL"
                      ? "عمومی برای همه"
                      : headerTargetAudience === "COURSE_CODE"
                      ? `${toPersianDigits(headerTargetCourseCodes.length)} دوره گارنت`
                      : `${toPersianDigits(headerTargetStudentIds.length)} داوطلب منتخب`}
                  </Badge>
                </div>

                {/* Radio visual cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: ALL */}
                  <div
                    onClick={() => setHeaderTargetAudience("ALL")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      headerTargetAudience === "ALL"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-card hover:border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">تمام داوطلبان سامانه (عمومی)</span>
                      <input
                        type="radio"
                        name="headerTargetAudience"
                        checked={headerTargetAudience === "ALL"}
                        onChange={() => setHeaderTargetAudience("ALL")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      عمومی برای همه دانشجویان و داوطلبان فعال در پرتال بدون محدودیت دوره.
                    </p>
                  </div>

                  {/* Option 2: COURSE_CODE */}
                  <div
                    onClick={() => setHeaderTargetAudience("COURSE_CODE")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      headerTargetAudience === "COURSE_CODE"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-card hover:border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">بر اساس کد دوره / کلاس گارنت</span>
                      <input
                        type="radio"
                        name="headerTargetAudience"
                        checked={headerTargetAudience === "COURSE_CODE"}
                        onChange={() => setHeaderTargetAudience("COURSE_CODE")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      تخصیص اختصاصی به داوطلبان ثبت‌نامی یک یا چند دوره خاص گارنت.
                    </p>
                  </div>

                  {/* Option 3: SPECIFIC_STUDENTS */}
                  <div
                    onClick={() => setHeaderTargetAudience("SPECIFIC_STUDENTS")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      headerTargetAudience === "SPECIFIC_STUDENTS"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-card hover:border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">تخصیص به داوطلبان منتخب</span>
                      <input
                        type="radio"
                        name="headerTargetAudience"
                        checked={headerTargetAudience === "SPECIFIC_STUDENTS"}
                        onChange={() => setHeaderTargetAudience("SPECIFIC_STUDENTS")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      انتخاب دستی داوطلبان مشخص بر اساس نام، کدملی یا شماره موبایل.
                    </p>
                  </div>
                </div>

                {/* Dynamic Sub-selector 1: Course Codes */}
                {headerTargetAudience === "COURSE_CODE" && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span>دوره‌های مجاز به شرکت در آزمون (انتخاب یک یا چند دوره):</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setHeaderTargetCourseCodes(activeCourses.map((c) => c.code))}
                          className="text-amber-600 hover:underline"
                        >
                          انتخاب همه
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setHeaderTargetCourseCodes([])}
                          className="text-muted-foreground hover:underline"
                        >
                          لغو انتخاب
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {activeCourses.map((course) => {
                        const isSelected = headerTargetCourseCodes.includes(course.code);
                        return (
                          <label
                            key={course.code}
                            className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/10 text-foreground"
                                : "border-border bg-card hover:bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setHeaderTargetCourseCodes([...headerTargetCourseCodes, course.code]);
                                } else {
                                  setHeaderTargetCourseCodes(
                                    headerTargetCourseCodes.filter((c) => c !== course.code)
                                  );
                                }
                              }}
                              className="mt-0.5 h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 rounded-sm"
                            />
                            <div className="space-y-0.5">
                              <span className="font-semibold block text-foreground">{course.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground block">{course.code}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {headerTargetCourseCodes.length === 0 && (
                      <p className="text-[11px] text-rose-500">
                        * لطفاً حداقل یک دوره را برای آزمون انتخاب نمایید.
                      </p>
                    )}
                  </div>
                )}

                {/* Dynamic Sub-selector 2: Specific Students */}
                {headerTargetAudience === "SPECIFIC_STUDENTS" && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-background/50 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>داوطلبان مجاز به شرکت در آزمون (تخصیص اختصاصی):</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                          {toPersianDigits(headerTargetStudentIds.length)} داوطلب انتخاب‌شده
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setHeaderTargetStudentIds([])}
                          className="text-[11px] text-muted-foreground hover:underline"
                        >
                          پاک کردن انتخاب‌ها
                        </button>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={headerStudentSearch}
                        onChange={(e) => setHeaderStudentSearch(e.target.value)}
                        placeholder="جستجو بر اساس نام داوطلب، شماره موبایل، کدملی یا دوره ثبت‌نامی..."
                        className="w-full pr-8 pl-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Student List */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-border rounded-lg bg-card">
                      {filteredStudents.length === 0 ? (
                        <p className="text-center py-4 text-xs text-muted-foreground">
                          داوطلبی با مشخصات واردشده یافت نشد.
                        </p>
                      ) : (
                        filteredStudents.map((st) => {
                          const isSelected = headerTargetStudentIds.includes(st.id);
                          return (
                            <label
                              key={st.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? "border-amber-500 bg-amber-500/10 text-foreground"
                                  : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setHeaderTargetStudentIds([...headerTargetStudentIds, st.id]);
                                    } else {
                                      setHeaderTargetStudentIds(
                                        headerTargetStudentIds.filter((id) => id !== st.id)
                                      );
                                    }
                                  }}
                                  className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 rounded-sm"
                                />
                                <div>
                                  <span className="font-semibold text-foreground block">{st.fullName}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span>موبایل: {toPersianDigits(st.phoneNumber)}</span>
                                    {st.nationalId && <span>• کدملی: {toPersianDigits(st.nationalId)}</span>}
                                  </div>
                                </div>
                              </div>
                              {st.enrolledCourseName && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                  {st.enrolledCourseName}
                                </Badge>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                    {headerTargetStudentIds.length === 0 && (
                      <p className="text-[11px] text-rose-500">
                        * لطفاً حداقل یک داوطلب را برای تخصیص آزمون انتخاب نمایید.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSavingHeader}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isSavingHeader ? "در حال ذخیره..." : "ذخیره تغییرات مشخصات"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-center text-xs">
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground block">تعداد سؤالات تعریف‌شده</span>
                  <strong className="text-base font-bold font-mono text-foreground mt-0.5 block">
                    {toPersianDigits(questions.length)} سؤال
                  </strong>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground block">زمان استاندارد آزمون</span>
                  <strong className="text-base font-bold font-mono text-foreground mt-0.5 block">
                    {toPersianDigits(exam.durationMinutes)} دقیقه
                  </strong>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground block">محاسبه نمره منفی</span>
                  <strong className="text-base font-bold text-foreground mt-0.5 block">
                    {exam.hasNegativeMarking ? "یک‌سوم (۱/۳)" : "فاقد نمره منفی"}
                  </strong>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <span className="text-[10px] text-muted-foreground block">دوره هدف گارنت LMS</span>
                  <strong className="text-sm font-bold font-mono text-amber-500 mt-0.5 block">
                    {exam.courseCode || "عمومی"}
                  </strong>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground block">وضعیت در سامانه</span>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      exam.isPublished
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                    }`}
                  >
                    {exam.isPublished ? "منتشر شده" : "پیش‌نویس طراح"}
                  </span>
                </div>
              </div>

              {/* Audience Summary Card */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/20 rounded-xl border border-border text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-foreground">جامعه هدف آزمون:</span>
                  {exam.targetAudience === "COURSE_CODE" ? (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/10 text-[11px]">
                      کدهای دوره گارنت: {(exam.targetCourseCodes || []).join(" ، ") || "تعریف نشده"}
                    </Badge>
                  ) : exam.targetAudience === "SPECIFIC_STUDENTS" ? (
                    <Badge variant="outline" className="border-purple-500/30 text-purple-500 bg-purple-500/10 text-[11px]">
                      تخصیص اختصاصی: {toPersianDigits((exam.targetStudentIds || []).length)} داوطلب منتخب
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10 text-[11px]">
                      عمومی برای تمام داوطلبان سامانه
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  (برای ویرایش جامعه هدف و داوطلبان، روی دکمه «ویرایش مشخصات آزمون» در بالا کلیک کنید)
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Builder Form Panel */}
      <Card className="border-amber-500/30 bg-amber-500/5 shadow-md">
        <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-bold text-foreground">
              {editingQuestionId
                ? `ویرایش سؤال شماره ${toPersianDigits(
                    questions.find((q) => q.id === editingQuestionId)?.questionNumber || 0
                  )}`
                : `طراحی سؤال جدید (سؤال شماره ${toPersianDigits(questions.length + 1)})`}
            </CardTitle>
          </div>
          {editingQuestionId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetQuestionForm}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              لغو ویرایش و ایجاد سؤال جدید
            </Button>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Subject Selector */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  درس / مبحث حقوقی <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-amber-500"
                >
                  {LEGAL_SUBJECTS.map((subj) => (
                    <option key={subj} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>

              {/* Coefficient */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ضریب سؤال در آزمون</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={coefficient}
                  onChange={(e) => setCoefficient(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground"
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                متن کامل صورت سؤال حقوقی <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="متن کامل صورت مسأله، پرونده، یا تست حقوقی را با اعراب‌گذاری و نگارش دقیق وارد فرمایید..."
                className="w-full p-3 text-xs border border-border rounded-xl bg-background text-foreground leading-relaxed focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* 4 Options with Correct Answer Selector */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">
                  گزینه‌های پاسخ (انتخاب گزینه صحیح با علامت دایره) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-amber-500 font-semibold">
                  گزینه صحیح فعلی: گزینه {toPersianDigits(correctOption)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option 1 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                    correctOption === 1
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="correctOption"
                    id="opt1"
                    checked={correctOption === 1}
                    onChange={() => setCorrectOption(1)}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor="opt1" className="text-[11px] font-bold text-foreground cursor-pointer block">
                      گزینه ۱ {correctOption === 1 && <span className="text-emerald-500">(پاسخ صحیح)</span>}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={option1}
                      onChange={(e) => setOption1(e.target.value)}
                      placeholder="متن گزینه اول..."
                      className="w-full p-2 text-xs border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Option 2 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                    correctOption === 2
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="correctOption"
                    id="opt2"
                    checked={correctOption === 2}
                    onChange={() => setCorrectOption(2)}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor="opt2" className="text-[11px] font-bold text-foreground cursor-pointer block">
                      گزینه ۲ {correctOption === 2 && <span className="text-emerald-500">(پاسخ صحیح)</span>}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={option2}
                      onChange={(e) => setOption2(e.target.value)}
                      placeholder="متن گزینه دوم..."
                      className="w-full p-2 text-xs border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Option 3 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                    correctOption === 3
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="correctOption"
                    id="opt3"
                    checked={correctOption === 3}
                    onChange={() => setCorrectOption(3)}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor="opt3" className="text-[11px] font-bold text-foreground cursor-pointer block">
                      گزینه ۳ {correctOption === 3 && <span className="text-emerald-500">(پاسخ صحیح)</span>}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={option3}
                      onChange={(e) => setOption3(e.target.value)}
                      placeholder="متن گزینه سوم..."
                      className="w-full p-2 text-xs border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                {/* Option 4 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                    correctOption === 4
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border bg-card"
                  }`}
                >
                  <input
                    type="radio"
                    name="correctOption"
                    id="opt4"
                    checked={correctOption === 4}
                    onChange={() => setCorrectOption(4)}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-1">
                    <label htmlFor="opt4" className="text-[11px] font-bold text-foreground cursor-pointer block">
                      گزینه ۴ {correctOption === 4 && <span className="text-emerald-500">(پاسخ صحیح)</span>}
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={option4}
                      onChange={(e) => setOption4(e.target.value)}
                      placeholder="متن گزینه چهارم..."
                      className="w-full p-2 text-xs border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Rationale / Article Explanation */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                <span>تحلیل مستند و ماده قانونی پاسخ صحیح (تشریح آموزشی کارنامه)</span>
              </label>
              <textarea
                rows={3}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="تحلیل حقوقی، مستند به ماده، آراء وحدت رویه، یا نظریات مشورتی جهت نمایش به داوطلب و استفاده پشتیبان در تحلیل کارنامه..."
                className="w-full p-3 text-xs border border-border rounded-xl bg-background text-foreground leading-relaxed"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              {editingQuestionId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetQuestionForm}
                  className="text-xs"
                >
                  انصراف از ویرایش
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={isSavingQuestion}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                {isSavingQuestion ? (
                  <span>در حال ذخیره...</span>
                ) : editingQuestionId ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>بروزرسانی تغییرات سؤال</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>ثبت و افزودن سؤال به آزمون</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions Roster Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-foreground">
              سؤالات ثبت‌شده در این آزمون ({toPersianDigits(questions.length)} سؤال)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            امکان بازآرایی ترتیب، ویرایش متن و حذف سؤالات
          </span>
        </div>

        {questions.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-xs font-semibold text-foreground">هنوز سؤالی به این آزمون اضافه نشده است.</p>
            <p className="text-[11px] text-muted-foreground">
              از فرم بالای صفحه برای طراحی و ذخیره سؤالات شبیه‌ساز استفاده کنید.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <Card
                key={q.id}
                className={`border transition-all ${
                  editingQuestionId === q.id
                    ? "border-amber-500 bg-amber-500/5 shadow-md"
                    : "border-border bg-card"
                }`}
              >
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold font-mono flex items-center justify-center">
                        {toPersianDigits(q.questionNumber)}
                      </span>
                      <Badge variant="outline" className="border-border text-xs bg-muted/40">
                        {q.subject}
                      </Badge>
                      {q.coefficient > 1 && (
                        <Badge variant="secondary" className="text-[10px]">
                          ضریب {toPersianDigits(q.coefficient)}
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons: Move Up/Down, Edit, Delete */}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, "up")}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="انتقال به بالا"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, "down")}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        title="انتقال به پایین"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEditQuestion(q)}
                        className="h-7 px-2.5 text-xs flex items-center gap-1 border-border text-foreground hover:bg-muted"
                      >
                        <Edit2 className="h-3 w-3 text-indigo-400" />
                        <span>ویرایش</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10"
                        title="حذف سؤال"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Question Text */}
                  <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-line">
                    {q.questionText}
                  </p>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt) => {
                      const isCorrect = opt.id === q.correctOption;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                            isCorrect
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold"
                              : "border-border/70 bg-muted/20 text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {toPersianDigits(opt.id)}
                          </span>
                          <span className="line-clamp-2">{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legal Explanation */}
                  {q.explanation && (
                    <div className="p-3 bg-muted/30 border border-border rounded-xl text-xs space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3 text-amber-500" />
                        مستند و تحلیل قانونی:
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
