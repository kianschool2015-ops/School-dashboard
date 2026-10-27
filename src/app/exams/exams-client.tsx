"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Plus,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  ArrowLeft,
  Trash2,
  Eye,
  Sliders,
  Check,
  Users,
  UserCheck,
  Search,
  Sparkles,
  Award,
  TrendingUp,
  FileText,
  ShieldAlert,
  ChevronDown,
  Filter,
} from "lucide-react";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";
import { JalaliDatePicker } from "@/components/ui/jalali-datepicker";
import {
  createExamAction,
  publishExamAction,
  deleteExamAction,
} from "@/server/actions/exams";
import type {
  ExamRecord,
  ExamCategory,
  ExamTargetAudience,
  UserRole,
} from "@/types/models";

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

export interface PendingReviewItem {
  submission: {
    id: string;
    examId: string;
    studentId: string;
    mentorId?: string | null;
    submittedAt?: Date | string | null;
    totalPercentage: string | number;
    rawScore?: string | number;
    netScore?: string | number;
    correctCount: number;
    incorrectCount: number;
    wrongCount?: number;
    unansweredCount: number;
    blankCount?: number;
    tabSwitchCount?: number;
    flaggedQuestions?: string[];
    status: string;
  };
  studentName: string;
  studentPhone: string;
  examTitle: string;
}

interface ExamsClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: UserRole;
  };
  initialExams: ExamRecord[];
  pendingSubmissions: PendingReviewItem[];
  confirmedSubmissions: PendingReviewItem[];
  targetCourses?: TargetCourse[];
  targetStudents?: TargetStudent[];
  initialTab?: string;
}

export function ExamsClient({
  currentUser,
  initialExams,
  pendingSubmissions: initialPendingSubmissions,
  confirmedSubmissions: initialConfirmedSubmissions,
  targetCourses = [],
  targetStudents = [],
  initialTab,
}: ExamsClientProps) {
  const router = useRouter();

  // Active Tab: BANK, PENDING, CONFIRMED
  const [activeTab, setActiveTab] = useState<"BANK" | "PENDING" | "CONFIRMED">(() => {
    if (initialTab === "pending") return "PENDING";
    if (initialTab === "confirmed") return "CONFIRMED";
    return "BANK";
  });

  const [examsList, setExamsList] = useState<ExamRecord[]>(initialExams);
  const [pendingList, setPendingList] = useState<PendingReviewItem[]>(initialPendingSubmissions);
  const [confirmedList, setConfirmedList] = useState<PendingReviewItem[]>(initialConfirmedSubmissions);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("MASHAHIR-BAR-MASTER");
  const [category, setCategory] = useState<ExamCategory>("MOCK_BAR");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [hasNegativeMarking, setHasNegativeMarking] = useState(true);
  const [passingScore, setPassingScore] = useState(50);
  const [startDate, setStartDate] = useState("1405/01/15 09:00");
  const [expiryDate, setExpiryDate] = useState("1405/01/15 12:00");

  // Target Audience State
  const [targetAudience, setTargetAudience] = useState<ExamTargetAudience>("ALL");
  const [targetCourseCodes, setTargetCourseCodes] = useState<string[]>([]);
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Default active courses if none provided
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

  // Filter students based on search input for modal
  const filteredModalStudents = targetStudents.filter((st) => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase().trim();
    return (
      st.fullName.toLowerCase().includes(q) ||
      st.phoneNumber.includes(q) ||
      st.nationalId.includes(q)
    );
  });

  // Filtered Exams in Bank
  const filteredExams = examsList.filter((exam) => {
    const matchesSearch =
      !searchQuery.trim() ||
      exam.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (exam.courseCode && exam.courseCode.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    const matchesCourse =
      selectedCourseFilter === "ALL" || exam.courseCode === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  // Filtered Pending Submissions
  const filteredPending = pendingList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.studentName.toLowerCase().includes(q) || p.examTitle.toLowerCase().includes(q);
  });

  // Filtered Confirmed Submissions
  const filteredConfirmed = confirmedList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return c.studentName.toLowerCase().includes(q) || c.examTitle.toLowerCase().includes(q);
  });

  // Create Exam Handler
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: "error", text: "عنوان آزمون الزامی است." });
      return;
    }

    setIsCreating(true);
    setFeedback(null);

    try {
      const res = await createExamAction({
        title: title.trim(),
        courseCode: courseCode || null,
        category,
        examType: category,
        durationMinutes: Number(durationMinutes) || 120,
        hasNegativeMarking,
        passingScore: Number(passingScore) || 50,
        targetAudience,
        targetType: targetAudience,
        targetCourseCodes: targetAudience === "COURSE_CODE" ? targetCourseCodes : [],
        targetCourses: targetAudience === "COURSE_CODE" ? targetCourseCodes : [],
        targetStudentIds: targetAudience === "SPECIFIC_STUDENTS" ? targetStudentIds : [],
        startDate: startDate ? new Date(startDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      });

      if (res.success && res.examId) {
        setFeedback({ type: "success", text: res.message });
        setShowCreateModal(false);
        // Navigate directly to question builder
        router.push(`/exams/builder/${res.examId}`);
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در ایجاد آزمون." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطای ارتباط با سرور در زمان ایجاد آزمون." });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = async (examId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const confirmMsg = nextStatus
      ? "آیا از انتشار این آزمون برای داوطلبان اطمینان دارید؟ داوطلبان مجاز قادر به شروع آزمون خواهند بود."
      : "آیا مایلید آزمون را از وضعیت انتشار خارج کنید؟ داوطلبان دیگر به این آزمون دسترسی نخواهند داشت.";

    if (!confirm(confirmMsg)) return;

    try {
      const res = await publishExamAction(examId, nextStatus);
      if (res.success) {
        setExamsList((prev) =>
          prev.map((e) => (e.id === examId ? { ...e, isPublished: nextStatus } : e))
        );
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در تغییر وضعیت انتشار آزمون." });
    }
  };

  // Delete Exam Handler
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

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Scale className="h-6 w-6 text-[#004071]" />
            <span>مرکز فرماندهی و بانک آزمون‌های آنلاین</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            طراحی، بارگذاری، تصحیح هوشمند با نمره منفی ۱/۳ و تایید نهایی کارنامه‌های تحلیلی
          </p>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#004071] hover:bg-[#00335c] text-white text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>طراحی و بارگذاری آزمون جدید</span>
        </Button>
      </div>

      {/* Global Feedback Banner */}
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
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">کل آزمون‌های تعریف‌شده</span>
              <strong className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                {toPersianDigits(examsList.length)} آزمون
              </strong>
            </div>
            <BookOpen className="h-8 w-8 text-[#004071] opacity-70" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">آزمون‌های منتشر شده</span>
              <strong className="text-lg font-bold font-mono text-emerald-500 mt-0.5 block">
                {toPersianDigits(examsList.filter((e) => e.isPublished).length)} آزمون
              </strong>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-70" />
          </CardContent>
        </Card>

        <Card
          className={`border-border transition-all cursor-pointer ${
            pendingList.length > 0 ? "bg-amber-500/5 border-amber-500/30" : "bg-card"
          }`}
          onClick={() => setActiveTab("PENDING")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">در انتظار بررسی و تایید منتور</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <strong className="text-lg font-bold font-mono text-amber-500 block">
                  {toPersianDigits(pendingList.length)} پاسخنامه
                </strong>
                {pendingList.length > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>
            </div>
            <Clock className="h-8 w-8 text-amber-500 opacity-70" />
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">کارنامه‌های تایید و منتشرشده</span>
              <strong className="text-lg font-bold font-mono text-sky-500 mt-0.5 block">
                {toPersianDigits(confirmedList.length)} کارنامه
              </strong>
            </div>
            <Award className="h-8 w-8 text-sky-500 opacity-70" />
          </CardContent>
        </Card>
      </div>

      {/* 3-Tab Command Center Controls */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("BANK")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "BANK"
              ? "bg-[#004071] text-white shadow-xs"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>طراحی و مدیریت بانک آزمون ({toPersianDigits(examsList.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PENDING")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "PENDING"
              ? "bg-[#004071] text-white shadow-xs"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>پاسخنامه‌های در انتظار بررسی و تایید منتور</span>
          {pendingList.length > 0 && (
            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full">
              {toPersianDigits(pendingList.length)}
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CONFIRMED")}
          className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "CONFIRMED"
              ? "bg-[#004071] text-white shadow-xs"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>نتایج نهایی منتشرشده و آمار تحلیلی ({toPersianDigits(confirmedList.length)})</span>
        </button>
      </div>

      {/* Global Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="جستجو بر اساس عنوان یا نام داوطلب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pr-9 pl-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#004071]"
          />
        </div>

        {activeTab === "BANK" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">فیلتر دوره:</span>
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#004071]"
            >
              <option value="ALL">همه دوره‌ها</option>
              {activeCourses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ====================================================================== */}
      {/* TAB 1: BANK & BUILDER                                                  */}
      {/* ====================================================================== */}
      {activeTab === "BANK" && (
        <div className="space-y-4">
          {filteredExams.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center rounded-2xl">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-bold text-foreground">هیچ آزمونی یافت نشد</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                برای این بخش هنوز آزمونی ثبت نشده است یا با جستجوی شما مطابقت ندارد.
              </p>
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="bg-[#004071] text-white text-xs"
              >
                طراحی اولین آزمون
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExams.map((exam) => (
                <Card
                  key={exam.id}
                  className="border-border bg-card hover:border-[#004071]/40 transition-all flex flex-col justify-between shadow-xs rounded-2xl"
                >
                  <CardHeader className="p-4 pb-2 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${
                          exam.isPublished
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        }`}
                      >
                        {exam.isPublished ? "منتشر شده (فعال برای داوطلب)" : "پیش‌نویس (غیرفعال)"}
                      </Badge>

                      <Badge variant="outline" className="text-[10px] font-mono">
                        {exam.courseCode || "عمومی"}
                      </Badge>
                    </div>

                    <CardTitle className="text-sm font-bold text-foreground leading-snug line-clamp-2">
                      {exam.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/60 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">سؤالات</span>
                        <strong className="font-bold text-foreground font-mono">
                          {toPersianDigits(exam.totalQuestions || 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">مدت زمان</span>
                        <strong className="font-bold text-foreground font-mono">
                          {toPersianDigits(exam.durationMinutes)} د
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">نمره منفی</span>
                        <strong className="font-bold text-foreground">
                          {exam.hasNegativeMarking ? "۱/۳" : "ندارد"}
                        </strong>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <Link href={`/exams/builder/${exam.id}`} className="block w-full">
                        <Button
                          size="sm"
                          className="w-full bg-[#004071] hover:bg-[#00335c] text-white text-xs flex items-center justify-center gap-1.5"
                        >
                          <FileQuestion className="h-3.5 w-3.5" />
                          <span>طراحی و ویرایش سؤالات ({toPersianDigits(exam.totalQuestions || 0)})</span>
                        </Button>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/student/exams/${exam.id}?preview=true`}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[11px] h-8 flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3 w-3" />
                            <span>پیش‌نمایش</span>
                          </Button>
                        </Link>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublish(exam.id, exam.isPublished)}
                          className={`flex-1 text-[11px] h-8 flex items-center justify-center gap-1 ${
                            exam.isPublished
                              ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                          }`}
                        >
                          {exam.isPublished ? "توقف انتشار" : "انتشار آزمون"}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExam(exam.id, exam.title)}
                          className="h-8 px-2 text-rose-500 hover:bg-rose-500/10"
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
      )}

      {/* ====================================================================== */}
      {/* TAB 2: SUBMISSIONS PENDING CONFIRMATION                                */}
      {/* ====================================================================== */}
      {activeTab === "PENDING" && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">
                دروازه تایید و تحلیل پشتیبان آموزشی (Mentor Confirmation Gate)
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                پاسخنامه‌های داوطلبان توسط سیستم با اعمال نمره منفی یک‌سوم کانون وکلا تصحیح اولیه شده است.
                داوطلب تا پیش از ثبت تحلیل آموزشی و فشردن دکمه تایید توسط شما، به درصدها و کلید سؤالات دسترسی ندارد.
              </p>
            </div>
          </div>

          {filteredPending.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center rounded-2xl">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-bold text-foreground">هیچ پاسخنامه معوقی وجود ندارد</h3>
              <p className="text-xs text-muted-foreground mt-1">
                تمامی آزمون‌های شرکت‌شده داوطلبان توسط پشتیبانان بررسی و تایید شده‌اند.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPending.map((item) => {
                const sub = item.submission;
                const netScoreNum = Number(sub.netScore || sub.totalPercentage || 0);

                return (
                  <Card
                    key={sub.id}
                    className="border-border bg-card hover:border-amber-500/40 transition-all p-4 rounded-2xl shadow-xs"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Candidate & Exam Metadata */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{item.studentName}</h4>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {item.studentPhone}
                          </span>
                          <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px]">
                            در انتظار تایید پشتیبان
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>آزمون: <strong className="text-foreground">{item.examTitle}</strong></span>
                          <span>•</span>
                          <span>
                            ارسال شده:{" "}
                            {sub.submittedAt
                              ? formatJalaliHuman(new Date(sub.submittedAt))
                              : "امروز"}
                          </span>
                        </div>

                        {/* CBT Anti-Cheat Telemetry */}
                        <div className="flex items-center gap-2 pt-1">
                          {(sub.tabSwitchCount ?? 0) > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-rose-500/30 text-rose-600 bg-rose-500/5 flex items-center gap-1"
                            >
                              <ShieldAlert className="h-3 w-3 text-rose-500" />
                              <span>{toPersianDigits(sub.tabSwitchCount ?? 0)} بار خروج از صفحه آزمون</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                              بدون خروج از صفحه
                            </Badge>
                          )}

                          {Array.isArray(sub.flaggedQuestions) && sub.flaggedQuestions.length > 0 && (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                              {toPersianDigits(sub.flaggedQuestions.length)} سؤال نشان‌دار
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Performance Breakdown & Direct Review Action */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 px-3">
                            <span className="text-[9px] text-emerald-600 block">درست</span>
                            <strong className="text-xs font-bold text-emerald-600 font-mono">
                              {toPersianDigits(sub.correctCount)}
                            </strong>
                          </div>

                          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/30 px-3">
                            <span className="text-[9px] text-rose-600 block">غلط (-۱/۳)</span>
                            <strong className="text-xs font-bold text-rose-600 font-mono">
                              {toPersianDigits(sub.wrongCount || sub.incorrectCount || 0)}
                            </strong>
                          </div>

                          <div className="p-2 bg-muted/40 rounded-xl border border-border px-3">
                            <span className="text-[9px] text-muted-foreground block">تراز سیستمی</span>
                            <strong className="text-xs font-bold text-foreground font-mono">
                              {toPersianDigits(netScoreNum.toFixed(1))}٪
                            </strong>
                          </div>
                        </div>

                        <Link href={`/mentor/exams/review/${sub.id}`}>
                          <Button
                            size="sm"
                            className="bg-[#004071] hover:bg-[#00335c] text-white text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>بررسی، تحلیل و تایید کارنامه</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* TAB 3: CONFIRMED RESULTS & ANALYTICS                                   */}
      {/* ====================================================================== */}
      {activeTab === "CONFIRMED" && (
        <div className="space-y-4">
          {filteredConfirmed.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center rounded-2xl">
              <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-bold text-foreground">کارنامه منتشرشده‌ای یافت نشد</h3>
              <p className="text-xs text-muted-foreground mt-1">
                هنوز کارنامه‌ای تایید نهایی و برای داوطلبان منتشر نگردیده است.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredConfirmed.map((item) => {
                const sub = item.submission;
                const netScoreNum = Number(sub.netScore || sub.totalPercentage || 0);

                return (
                  <Card
                    key={sub.id}
                    className="border-border bg-card hover:border-emerald-500/40 transition-all p-4 rounded-2xl shadow-xs"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{item.studentName}</h4>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {item.studentPhone}
                          </span>
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[10px]">
                            منتشر شده برای داوطلب
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          آزمون: <strong className="text-foreground">{item.examTitle}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0">
                        <div className="flex items-center gap-3 text-center">
                          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 px-3">
                            <span className="text-[9px] text-emerald-600 block">تراز نهایی</span>
                            <strong className="text-sm font-bold text-emerald-600 font-mono">
                              {toPersianDigits(netScoreNum.toFixed(1))}٪
                            </strong>
                          </div>
                          <div className="p-2 bg-muted/30 rounded-xl border border-border px-3 text-xs">
                            <span className="text-[9px] text-muted-foreground block">درست / غلط</span>
                            <span className="font-mono text-foreground font-semibold">
                              {toPersianDigits(sub.correctCount)} / {toPersianDigits(sub.wrongCount || sub.incorrectCount || 0)}
                            </span>
                          </div>
                        </div>

                        <Link href={`/mentor/exams/review/${sub.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>مشاهده کارنامه</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* CREATE EXAM MODAL                                                      */}
      {/* ====================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="max-w-2xl w-full border-border bg-card shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  طراحی و بارگذاری آزمون جدید
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  مشخصات آزمون را تعیین کنید؛ پس از ساخت به صفحه طراحی سؤالات هدایت خواهید شد.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </CardHeader>

            <form onSubmit={handleCreateExam} className="p-5 space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">عنوان آزمون *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شبیه‌ساز جامع آزمون وکالت کانون - مرحله ۱"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#004071]"
                />
              </div>

              {/* Course & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">دوره آموزشی منتسب</label>
                  <select
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#004071]"
                  >
                    {activeCourses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">نوع / سطح آزمون</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExamCategory)}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#004071]"
                  >
                    <option value="MOCK_BAR">آزمون آزمایشی استاندارد وکالت (شبیه‌ساز)</option>
                    <option value="DIAGNOSTIC">آزمون تشخیصی و تعیین سطح داوطلب</option>
                    <option value="SUBJECT_SPECIFIC">آزمون مبحثی / تک‌درس حقوقی</option>
                  </select>
                </div>
              </div>

              {/* Duration, Passing Score & Negative Marking */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">مدت زمان (دقیقه)</label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-[#004071]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">حد نصاب قبولی (درصد)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-[#004071]"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={hasNegativeMarking}
                      onChange={(e) => setHasNegativeMarking(e.target.checked)}
                      className="rounded text-[#004071] focus:ring-[#004071]"
                    />
                    <span>نمره منفی ۱/۳ فعال باشد</span>
                  </label>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <label className="text-xs font-semibold text-foreground block">جامعه هدف آزمون</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAudience("ALL")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      targetAudience === "ALL"
                        ? "bg-[#004071] text-white border-[#004071]"
                        : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    همه داوطلبان
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetAudience("COURSE_CODE")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      targetAudience === "COURSE_CODE"
                        ? "bg-[#004071] text-white border-[#004071]"
                        : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    دوره آموزشی خاص
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetAudience("SPECIFIC_STUDENTS")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      targetAudience === "SPECIFIC_STUDENTS"
                        ? "bg-[#004071] text-white border-[#004071]"
                        : "bg-muted/30 text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    داوطلبان منتخب
                  </button>
                </div>

                {targetAudience === "COURSE_CODE" && (
                  <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
                    <span className="text-[11px] text-muted-foreground block">
                      دوره‌های مجاز برای این آزمون را انتخاب کنید:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {activeCourses.map((c) => {
                        const isChecked = targetCourseCodes.includes(c.code);
                        return (
                          <label
                            key={c.code}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border ${
                              isChecked
                                ? "bg-[#004071]/10 border-[#004071] text-foreground font-semibold"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTargetCourseCodes((prev) => [...prev, c.code]);
                                } else {
                                  setTargetCourseCodes((prev) => prev.filter((x) => x !== c.code));
                                }
                              }}
                              className="rounded text-[#004071]"
                            />
                            <span>{c.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {targetAudience === "SPECIFIC_STUDENTS" && (
                  <div className="p-3 bg-muted/20 border border-border rounded-xl space-y-2">
                    <input
                      type="text"
                      placeholder="جستجوی داوطلب بر اساس نام، کدملی یا تلفن..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredModalStudents.slice(0, 15).map((st) => {
                        const isChecked = targetStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border ${
                              isChecked
                                ? "bg-[#004071]/10 border-[#004071] text-foreground font-semibold"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTargetStudentIds((prev) => [...prev, st.id]);
                                  } else {
                                    setTargetStudentIds((prev) => prev.filter((x) => x !== st.id));
                                  }
                                }}
                                className="rounded text-[#004071]"
                              />
                              <span>{st.fullName}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {st.phoneNumber}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  size="sm"
                  className="bg-[#004071] hover:bg-[#00335c] text-white text-xs min-w-28"
                >
                  {isCreating ? "در حال ایجاد..." : "ایجاد و طراحی سؤالات"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
