"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Plus,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  ArrowLeft,
  Scale,
  Trash2,
  Eye,
  Sliders,
  Check,
  Users,
  UserCheck,
  Search,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { JalaliDatePicker } from "@/components/ui/jalali-datepicker";
import { createExamAction, publishExamAction, deleteExamAction } from "@/server/actions/exams";
import type { ExamRecord, ExamCategory, ExamTargetAudience } from "@/types/models";

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

interface ExamBuilderDashboardProps {
  initialExams: ExamRecord[];
  userRole: string;
  userId: string;
  targetCourses?: TargetCourse[];
  targetStudents?: TargetStudent[];
}

export function ExamBuilderDashboard({
  initialExams,
  userRole,
  targetCourses = [],
  targetStudents = [],
}: ExamBuilderDashboardProps) {
  const router = useRouter();
  const [examsList, setExamsList] = useState<ExamRecord[]>(initialExams);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("MASHAHIR-BAR-MASTER");
  const [category, setCategory] = useState<ExamCategory>("MOCK_BAR");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [hasNegativeMarking, setHasNegativeMarking] = useState(true);
  const [startDate, setStartDate] = useState("1405/01/15 09:00");
  const [expiryDate, setExpiryDate] = useState("1405/01/15 12:00");

  // Target Audience State
  const [targetAudience, setTargetAudience] = useState<ExamTargetAudience>("ALL");
  const [targetCourseCodes, setTargetCourseCodes] = useState<string[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Default active courses if none provided from database
  const activeCourses: TargetCourse[] =
    targetCourses.length > 0
      ? targetCourses
      : [
          { code: "MASHAHIR-BAR-MASTER", name: "دوره جامع مستر وکالت" },
          { code: "CRASH-BAR", name: "دوره ضربتی آزمون وکالت" },
          { code: "SAVIOR-FALL-1405", name: "کلاس نجات پاییز ۱۴۰۵" },
          { code: "MASHAHIR-BAR-360", name: "دوره جامع آمادگی آزمون وکالت ۳۶۰" },
          { code: "DIAGNOSTIC-1405", name: "دوره سنجش و تعیین سطح وکالت ۱۴۰۵" },
        ];

  // Filter students based on search input
  const filteredStudents = targetStudents.filter((st) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase().trim();
    return (
      st.fullName.toLowerCase().includes(q) ||
      st.phoneNumber.includes(q) ||
      st.nationalId.includes(q) ||
      (st.enrolledCourseName && st.enrolledCourseName.toLowerCase().includes(q))
    );
  });

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: "error", text: "عنوان آزمون الزامی است." });
      return;
    }

    if (targetAudience === "COURSE_CODE" && targetCourseCodes.length === 0) {
      setFeedback({
        type: "error",
        text: "در حالت تخصیص بر اساس کد دوره، انتخاب حداقل یک دوره الزامی است.",
      });
      return;
    }

    if (targetAudience === "SPECIFIC_STUDENTS" && targetStudentIds.length === 0) {
      setFeedback({
        type: "error",
        text: "در حالت تخصیص به داوطلبان منتخب، انتخاب حداقل یک داوطلب الزامی است.",
      });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await createExamAction({
        title,
        courseCode,
        category,
        durationMinutes: Number(durationMinutes),
        hasNegativeMarking,
        targetAudience,
        targetCourseCodes,
        targetStudentIds,
        startDate,
        expiryDate,
      });

      if (res.success && res.examId) {
        setFeedback({ type: "success", text: res.message });
        router.push(`/exams/builder/${res.examId}`);
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در ایجاد ساختار آزمون." });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "خطای سیستمی در برقراری ارتباط.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleTogglePublish = async (examId: string, currentPublished: boolean) => {
    try {
      const res = await publishExamAction(examId, !currentPublished);
      if (res.success) {
        setExamsList((prev) =>
          prev.map((ex) => (ex.id === examId ? { ...ex, isPublished: !currentPublished } : ex))
        );
      } else {
        alert(res.message);
      }
    } catch {
      alert("خطا در تغییر وضعیت انتشار آزمون.");
    }
  };

  const handleDeleteExam = async (examId: string, examTitle: string) => {
    if (!confirm(`آیا از حذف کامل آزمون «${examTitle}» و تمامی سؤالات آن اطمینان دارید؟`)) {
      return;
    }
    try {
      const res = await deleteExamAction(examId);
      if (res.success) {
        setExamsList((prev) => prev.filter((e) => e.id !== examId));
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در حذف آزمون." });
    }
  };

  const getCategoryTitle = (cat: ExamCategory) => {
    switch (cat) {
      case "MOCK_BAR":
        return "شبیه‌ساز وکالت (جامع)";
      case "DIAGNOSTIC":
        return "تعیین سطح و سنجش پایه";
      case "SUBJECT_SPECIFIC":
        return "موضوعی و تک‌درس";
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>میز طراحی و مدیریت آزمون‌های وکالت</span>
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 text-xs">
                  سامانه سنجش تخصصی
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                طراحی استاندارد سؤالات حقوقی، تعریف گزینه‌ها با نمره منفی ۱/۳ و انتشار کارتابل داوطلبان
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/exams">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5 border-border">
              <span>مشاهده کارتابل آزمون‌ها</span>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>تعریف آزمون جدید</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* New Exam Creation Form Panel */}
      {showCreateForm && (
        <Card className="border-amber-500/30 bg-amber-500/5 shadow-md">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>مشخصات ساختاری آزمون جدید</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    عنوان رسمی آزمون <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: شبیه‌ساز جامع کانون وکلا - مرحله اول (پاییز ۱۴۰۳)"
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">دسته‌بندی آزمون</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExamCategory)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="MOCK_BAR">شبیه‌ساز وکالت (جامع)</option>
                    <option value="DIAGNOSTIC">تعیین سطح و سنجش تشخیصی</option>
                    <option value="SUBJECT_SPECIFIC">موضوعی و تک‌درس</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">دوره آموزشی / کلاس هدف</label>
                  <select
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground"
                  >
                    {activeCourses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">مدت زمان آزمون (دقیقه)</label>
                  <input
                    type="number"
                    min={10}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                {/* Jalali Start Date & Time */}
                <div className="space-y-1.5">
                  <JalaliDatePicker
                    label="زمان آغاز آزمون (شمسی - پایه ۱۴۰۵)"
                    value={startDate}
                    onChange={(val) => setStartDate(val)}
                    baseYear={1405}
                    includeTime={true}
                    placeholder="انتخاب زمان شروع آزمون..."
                  />
                </div>

                {/* Jalali Expiry Date & Time */}
                <div className="space-y-1.5">
                  <JalaliDatePicker
                    label="مهلت پاسخگویی و انقضای آزمون (شمسی)"
                    value={expiryDate}
                    onChange={(val) => setExpiryDate(val)}
                    baseYear={1405}
                    includeTime={true}
                    placeholder="انتخاب زمان پایان آزمون..."
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card">
                    <input
                      type="checkbox"
                      id="negativeMarkingCheck"
                      checked={hasNegativeMarking}
                      onChange={(e) => setHasNegativeMarking(e.target.checked)}
                      className="h-4 w-4 rounded-sm border-border text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="negativeMarkingCheck" className="text-xs text-foreground cursor-pointer select-none">
                      اعمال نمره منفی استاندارد کانون وکلا (۱/۳)
                    </label>
                  </div>
                </div>
              </div>

              {/* Target Audience & Assignment Section */}
              <div className="pt-4 border-t border-border space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>جامعه هدف و تخصیص آزمون (مخاطبان)</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    تعیین کنید این آزمون به کدام گروه از داوطلبان تخصیص داده شود و در کارتابل آن‌ها قابل مشاهده باشد.
                  </p>
                </div>

                {/* Radio visual cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: ALL */}
                  <div
                    onClick={() => setTargetAudience("ALL")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      targetAudience === "ALL"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-card hover:border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">تمام داوطلبان سامانه (عمومی)</span>
                      <input
                        type="radio"
                        name="targetAudience"
                        checked={targetAudience === "ALL"}
                        onChange={() => setTargetAudience("ALL")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      عمومی برای همه دانشجویان و داوطلبان فعال در پرتال بدون محدودیت دوره.
                    </p>
                  </div>

                  {/* Option 2: COURSE_CODE */}
                  <div
                    onClick={() => setTargetAudience("COURSE_CODE")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      targetAudience === "COURSE_CODE"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-card hover:border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">بر اساس کد دوره / کلاس مشاهیر دانش</span>
                      <input
                        type="radio"
                        name="targetAudience"
                        checked={targetAudience === "COURSE_CODE"}
                        onChange={() => setTargetAudience("COURSE_CODE")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      تخصیص اختصاصی به داوطلبان ثبت‌نامی یک یا چند دوره خاص مشاهیر دانش.
                    </p>
                  </div>

                  {/* Option 3: SPECIFIC_STUDENTS */}
                  <div
                    onClick={() => setTargetAudience("SPECIFIC_STUDENTS")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      targetAudience === "SPECIFIC_STUDENTS"
                        ? "border-amber-500 bg-amber-500/10 text-foreground ring-1 ring-amber-500"
                        : "border-border bg-card hover:border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">تخصیص به داوطلبان منتخب</span>
                      <input
                        type="radio"
                        name="targetAudience"
                        checked={targetAudience === "SPECIFIC_STUDENTS"}
                        onChange={() => setTargetAudience("SPECIFIC_STUDENTS")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      انتخاب دستی داوطلبان مشخص بر اساس نام، کدملی یا شماره موبایل.
                    </p>
                  </div>
                </div>

                {/* Dynamic Sub-selector 1: Course Codes */}
                {targetAudience === "COURSE_CODE" && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span>دوره‌های مجاز به شرکت در آزمون (انتخاب یک یا چند دوره):</span>
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setTargetCourseCodes(activeCourses.map((c) => c.code))}
                          className="text-amber-600 hover:underline"
                        >
                          انتخاب همه
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setTargetCourseCodes([])}
                          className="text-muted-foreground hover:underline"
                        >
                          لغو انتخاب
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                      {activeCourses.map((course) => {
                        const isSelected = targetCourseCodes.includes(course.code);
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
                                  setTargetCourseCodes([...targetCourseCodes, course.code]);
                                } else {
                                  setTargetCourseCodes(targetCourseCodes.filter((c) => c !== course.code));
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
                    {targetCourseCodes.length === 0 && (
                      <p className="text-[11px] text-rose-500">
                        * لطفاً حداقل یک دوره را برای آزمون انتخاب نمایید.
                      </p>
                    )}
                  </div>
                )}

                {/* Dynamic Sub-selector 2: Specific Students */}
                {targetAudience === "SPECIFIC_STUDENTS" && (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-background/50 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>داوطلبان مجاز به شرکت در آزمون (تخصیص اختصاصی):</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                          {toPersianDigits(targetStudentIds.length)} داوطلب انتخاب‌شده
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setTargetStudentIds([])}
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
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="جستجو بر اساس نام داوطلب، شماره موبایل، کدملی یا دوره ثبت‌نامی..."
                        className="w-full pr-8 pl-3 py-1.5 text-xs border border-border rounded-lg bg-card text-foreground focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    {/* Student List */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-border rounded-lg bg-card">
                      {filteredStudents.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-4">
                          هیچ داوطلبی مطابق با عبارت جستجو یا در سیستم یافت نشد.
                        </p>
                      ) : (
                        filteredStudents.map((st) => {
                          const isSelected = targetStudentIds.includes(st.id);
                          return (
                            <label
                              key={st.id}
                              className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-amber-500/15 border border-amber-500/40 text-foreground"
                                  : "hover:bg-muted/50 border border-transparent text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTargetStudentIds([...targetStudentIds, st.id]);
                                    } else {
                                      setTargetStudentIds(targetStudentIds.filter((id) => id !== st.id));
                                    }
                                  }}
                                  className="h-3.5 w-3.5 text-amber-600 focus:ring-amber-500 rounded-sm"
                                />
                                <div>
                                  <span className="font-semibold text-foreground block">{st.fullName}</span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    موبایل: {toPersianDigits(st.phoneNumber)} • کدملی: {toPersianDigits(st.nationalId)}
                                  </span>
                                </div>
                              </div>
                              {st.enrolledCourseName && (
                                <Badge variant="secondary" className="text-[9px]">
                                  {st.enrolledCourseName}
                                </Badge>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                    {targetStudentIds.length === 0 && (
                      <p className="text-[11px] text-rose-500">
                        * لطفاً حداقل یک داوطلب را برای تخصیص آزمون انتخاب نمایید.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                >
                  {isCreating ? (
                    <span>در حال ایجاد...</span>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>ایجاد آزمون و ورود به طراح سؤالات</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Authored Exams Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" />
            <span>فهرست آزمون‌های طراحی‌شده</span>
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            مجموع: {toPersianDigits(examsList.length)} دوره آزمون
          </span>
        </div>

        {examsList.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/50 space-y-3">
            <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-foreground">هیچ آزمونی یافت نشد</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              شما هنوز آزمونی طراحی نکرده‌اید. با کلیک بر روی دکمه «تعریف آزمون جدید»، اولین آزمون شبیه‌ساز را ایجاد کنید.
            </p>
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white mt-2"
            >
              <Plus className="h-3.5 w-3.5 ml-1" />
              <span>شروع طراحی آزمون</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examsList.map((exam) => (
              <Card
                key={exam.id}
                className="border-border bg-card hover:border-amber-500/40 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        exam.isPublished
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                      }`}
                    >
                      {exam.isPublished ? "منتشر شده" : "پیش‌نویس (طراحی)"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {getCategoryTitle(exam.category)}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground line-clamp-1 leading-snug">
                    {exam.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {exam.targetAudience === "COURSE_CODE" ? (
                      <Badge variant="outline" className="text-[9px] border-blue-500/30 text-blue-600 bg-blue-500/10">
                        دوره اختصاصی ({toPersianDigits(exam.targetCourseCodes?.length || 0)} دوره)
                      </Badge>
                    ) : exam.targetAudience === "SPECIFIC_STUDENTS" ? (
                      <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-600 bg-purple-500/10">
                        داوطلبان منتخب ({toPersianDigits(exam.targetStudentIds?.length || 0)} نفر)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                        عمومی (تمام داوطلبان)
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="grid grid-cols-3 gap-2 py-2 border-y border-border text-center text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">سؤالات</span>
                      <strong className="text-xs font-mono text-foreground">
                        {toPersianDigits(exam.totalQuestions)} سؤال
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">زمان</span>
                      <strong className="text-xs font-mono text-foreground">
                        {toPersianDigits(exam.durationMinutes)} دقیقه
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">نمره منفی</span>
                      <strong className="text-xs font-mono text-foreground">
                        {exam.hasNegativeMarking ? "۱/۳" : "ندارد"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(exam.id, exam.isPublished)}
                      className="text-xs h-8 border-border flex items-center gap-1"
                    >
                      {exam.isPublished ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>لغو انتشار</span>
                        </>
                      ) : (
                        <span>انتشار عمومی</span>
                      )}
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Link href={`/exams/builder/${exam.id}`}>
                        <Button
                          size="sm"
                          className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>طراحی و بارگذاری سؤالات</span>
                        </Button>
                      </Link>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                        className="h-8 px-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                        title="حذف کامل آزمون"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
