"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  PhoneCall,
  FileText,
  Calendar,
  Sliders,
  History,
  Clock,
  Search,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Briefcase,
  User,
  GraduationCap,
  Sparkles,
  Send,
  X,
  Plus,
  BookOpen,
} from "lucide-react";
import { toPersianDigits, formatJalaliHuman, PERSIAN_WEEKDAYS } from "@/lib/jalali";
import {
  originateMentorCallAction,
  updateMentorCallingWindowAction,
  getMentorCallingStatusAction,
} from "@/server/actions/voip";
import {
  logMentorContactAction,
  updateConsultationNoteAction,
} from "@/server/actions/mentor";
import type { CandidateRosterItem } from "./page";

interface MentorStudentsClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  initialRoster: CandidateRosterItem[];
}

export function MentorStudentsClient({
  currentUser,
  initialRoster,
}: MentorStudentsClientProps) {
  const router = useRouter();
  const [roster, setRoster] = useState<CandidateRosterItem[]>(initialRoster);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "GREEN" | "YELLOW" | "RED">("ALL");
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // VoIP AMI Call States
  const [callingStudentId, setCallingStudentId] = useState<string | null>(null);
  const [amiBanner, setAmiBanner] = useState<{
    success: boolean;
    message: string;
    studentName?: string;
  } | null>(null);

  // Active Note-taking Modal
  const [noteModalStudent, setNoteModalStudent] = useState<CandidateRosterItem | null>(null);
  const [noteTopic, setNoteTopic] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteDuration, setNoteDuration] = useState("15");
  const [noteCallStatus, setNoteCallStatus] = useState("COMPLETED");
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  // Active Consultation History Modal
  const [historyModalStudent, setHistoryModalStudent] = useState<CandidateRosterItem | null>(null);
  const [editingCallId, setEditingCallId] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState("");

  // Mentor Calling Window Modal (Daily 2-3 hours office hours)
  const [isCallingWindowModalOpen, setIsCallingWindowModalOpen] = useState(false);
  const [windowStartTime, setWindowStartTime] = useState("17:00");
  const [windowEndTime, setWindowEndTime] = useState("20:00");
  const [windowDays, setWindowDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [windowIsActive, setWindowIsActive] = useState(true);
  const [windowAnnouncement, setWindowAnnouncement] = useState("پاسخگویی عصرگاهی داوطلبان مشاهیر دانش");
  const [windowFeedback, setWindowFeedback] = useState<string | null>(null);
  const [isSavingWindow, setIsSavingWindow] = useState(false);

  // Load existing calling window when opening modal
  const handleOpenCallingWindowModal = async () => {
    setIsCallingWindowModalOpen(true);
    setWindowFeedback(null);
    try {
      const res = await getMentorCallingStatusAction(currentUser.id);
      if (res.window) {
        setWindowStartTime(res.window.startTime || "17:00");
        setWindowEndTime(res.window.endTime || "20:00");
        if (Array.isArray(res.window.daysOfWeek)) {
          setWindowDays(res.window.daysOfWeek);
        }
        setWindowIsActive(res.window.isActive !== undefined ? res.window.isActive : true);
        if (res.window.announcement) {
          setWindowAnnouncement(res.window.announcement);
        }
      }
    } catch {}
  };

  const handleSaveCallingWindow = async () => {
    setIsSavingWindow(true);
    setWindowFeedback(null);
    try {
      const res = await updateMentorCallingWindowAction({
        mentorId: currentUser.id,
        startTime: windowStartTime,
        endTime: windowEndTime,
        daysOfWeek: windowDays,
        isActive: windowIsActive,
        announcement: windowAnnouncement,
      });

      if (res.success) {
        setWindowFeedback("ساعات پاسخگویی با موفقیت در سامانه ذخیره شد.");
        setTimeout(() => {
          setIsCallingWindowModalOpen(false);
          setWindowFeedback(null);
        }, 1500);
      } else {
        setWindowFeedback("خطا در ذخیره‌سازی ساعات پاسخگویی.");
      }
    } catch {
      setWindowFeedback("خطا در برقراری ارتباط با پایگاه داده.");
    } finally {
      setIsSavingWindow(false);
    }
  };

  // Extract unique courses for filtering
  const availableCourses = Array.from(
    new Set(roster.map((s) => s.enrolledCourseName).filter(Boolean))
  );

  // Filter roster
  const filteredRoster = roster.filter((student) => {
    const matchesSearch =
      !searchQuery.trim() ||
      student.fullName.includes(searchQuery.trim()) ||
      student.nationalId.includes(searchQuery.trim()) ||
      student.masterclassGoal.includes(searchQuery.trim()) ||
      (student.enrolledCourseName && student.enrolledCourseName.includes(searchQuery.trim()));

    const matchesRisk =
      riskFilter === "ALL" || student.riskStatus === riskFilter;

    const matchesCourse =
      courseFilter === "ALL" || student.enrolledCourseName === courseFilter;

    return matchesSearch && matchesRisk && matchesCourse;
  });

  // Tri-color KPI calculations (Strictly separated Green, Yellow, Red)
  const totalAssigned = roster.length;
  const greenCount = roster.filter((s) => s.riskStatus === "GREEN").length;
  const yellowCount = roster.filter((s) => s.riskStatus === "YELLOW").length;
  const redCount = roster.filter((s) => s.riskStatus === "RED").length;
  const totalNotesCount = roster.reduce((acc, curr) => acc + curr.callNotesCount, 0);

  // Trigger VoIP AMI Call
  const handleOriginateAmiCall = async (student: CandidateRosterItem) => {
    setCallingStudentId(student.id);
    setAmiBanner(null);

    try {
      const res = await originateMentorCallAction({
        studentProfileId: student.id,
        notes: `تماس امن دوطرفه از کارتابل داوطلبان توسط ${currentUser.fullName}`,
      });

      setAmiBanner({
        success: res.success,
        message: res.message,
        studentName: student.fullName,
      });

      if (res.success) {
        // Automatically open the consultation note modal for convenient logging
        setNoteModalStudent(student);
        setNoteTopic("تماس تلفنی مشاوره‌ای");
        setNoteContent("");
        setNoteDuration("15");
        setNoteCallStatus("COMPLETED");
      }
    } catch {
      setAmiBanner({
        success: false,
        message: "خطای سیستمی در ارسال فرمان به سرور تلفنی Asterisk AMI.",
        studentName: student.fullName,
      });
    } finally {
      setCallingStudentId(null);
    }
  };

  // Save Consultation Note
  const handleSaveConsultationNote = (redirectAfterSave = false) => {
    if (!noteModalStudent || !noteContent.trim()) return;

    startTransition(async () => {
      const res = await logMentorContactAction({
        studentProfileId: noteModalStudent.id,
        notes: noteContent.trim(),
        topic: noteTopic.trim() || "جلسه مشاوره تلفنی و برنامه‌ریزی",
        durationMinutes: parseInt(noteDuration, 10) || 15,
        callStatus: noteCallStatus,
      });

      if (res.success) {
        setNoteFeedback("یادداشت با موفقیت ذخیره شد.");

        // Update local state
        setRoster((prev) =>
          prev.map((s) => {
            if (s.id === noteModalStudent.id) {
              const newCall = {
                id: res.callId || `call_${Date.now()}`,
                mentorName: currentUser.fullName,
                status: noteCallStatus,
                durationSeconds: (parseInt(noteDuration, 10) || 15) * 60,
                initiatedAt: new Date().toISOString(),
                notes: `[موضوع: ${noteTopic.trim()}]\n${noteContent.trim()}`,
              };
              return {
                ...s,
                lastContactAt: new Date().toISOString(),
                callNotesCount: s.callNotesCount + 1,
                recentCalls: [newCall, ...s.recentCalls],
              };
            }
            return s;
          })
        );

        const targetStudentId = noteModalStudent.id;
        setTimeout(() => {
          setNoteModalStudent(null);
          setNoteFeedback(null);
          setNoteContent("");
          setNoteTopic("");

          if (redirectAfterSave) {
            router.push(`/plans?studentId=${targetStudentId}`);
          }
        }, 1200);
      } else {
        setNoteFeedback(res.message || "خطا در ثبت یادداشت.");
      }
    });
  };

  // Update existing consultation note
  const handleUpdateNote = (callId: string) => {
    if (!editNotesValue.trim()) return;

    startTransition(async () => {
      const res = await updateConsultationNoteAction({
        callId,
        notes: editNotesValue.trim(),
      });

      if (res.success) {
        if (historyModalStudent) {
          const updatedCalls = historyModalStudent.recentCalls.map((c) =>
            c.id === callId ? { ...c, notes: editNotesValue.trim() } : c
          );
          setHistoryModalStudent({
            ...historyModalStudent,
            recentCalls: updatedCalls,
          });
          setRoster((prev) =>
            prev.map((s) =>
              s.id === historyModalStudent.id
                ? { ...s, recentCalls: updatedCalls }
                : s
            )
          );
        }
        setEditingCallId(null);
        setEditNotesValue("");
      }
    });
  };

  const riskBadgeVariants: Record<"GREEN" | "YELLOW" | "RED", "green" | "yellow" | "red"> = {
    GREEN: "green",
    YELLOW: "yellow",
    RED: "red",
  };

  const riskLabels: Record<"GREEN" | "YELLOW" | "RED", string> = {
    GREEN: "پایدار و عادی (سبز)",
    YELLOW: "هشدار متوسط (زرد)",
    RED: "بحران حاد (قرمز)",
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Key Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                کارتابل داوطلبان اختصاصی و تماس‌های مشاوره‌ای
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                پشتیبان: <span className="font-semibold text-foreground">{currentUser.fullName}</span> • برقراری تماس امن ایزابل AMI، ثبت خلاصه مذاکرات و شخصی‌سازی برنامه مطالعاتی
              </p>
            </div>
          </div>
        </div>

        {/* Global Quick Action */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCallingWindowModal}
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold"
          >
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>ساعات پاسخگویی تلفنی</span>
          </Button>

          <Link href="/plans">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5 border-border hover:bg-muted"
            >
              <Sliders className="h-3.5 w-3.5 text-purple-400" />
              <span>موتور برنامه‌ریزی هفتگی</span>
            </Button>
          </Link>

          <Link href="/mentor/triage">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5 border-border hover:bg-muted"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
              <span>رفع مشکلات علمی</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* VoIP AMI Response Banner */}
      {amiBanner && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-all ${
            amiBanner.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <PhoneCall className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-bold block">
                {amiBanner.success ? "اتصال تماس تلفنی موفقیت‌آمیز" : "خطا در تماس تلفنی"}
                {amiBanner.studentName ? ` با ${amiBanner.studentName}` : ""}
              </span>
              <span>{amiBanner.message}</span>
            </div>
          </div>
          <button
            onClick={() => setAmiBanner(null)}
            className="text-muted-foreground hover:text-foreground text-xs p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Key Performance Indicators - Strictly 3-Color Risk Separation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">کل داوطلبان</span>
              <span className="text-xl font-bold text-foreground persian-nums">
                {toPersianDigits(totalAssigned)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 1. Green: Stable */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-semibold">پایدار (سبز)</span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
                {toPersianDigits(greenCount)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Yellow: Attention Needed */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-semibold">نیازمند توجه (زرد)</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400 persian-nums">
                {toPersianDigits(yellowCount)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 3. Red: Critical */}
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-semibold">بحرانی (قرمز)</span>
              <span className="text-xl font-bold text-rose-600 dark:text-rose-400 persian-nums">
                {toPersianDigits(redCount)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        {/* 4. Total Consultation Notes */}
        <Card className="border-border bg-card">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-muted-foreground block">یادداشت‌های مشاوره</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 persian-nums">
                {toPersianDigits(totalNotesCount)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <FileText className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search and Risk Level Filter Controls */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام داوطلب، کدملی یا دوره..."
                className="w-full text-xs rounded-xl border border-border bg-background ps-9 pe-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Course Filter Dropdown */}
            {availableCourses.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-[#004071]" />
                <span className="shrink-0 font-medium">فیلتر دوره:</span>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-input bg-background text-xs font-bold text-foreground focus:ring-2 focus:ring-[#004071] max-w-56 truncate"
                >
                  <option value="ALL">همه دوره‌ها ({toPersianDigits(roster.length)})</option>
                  {availableCourses.map((crs) => (
                    <option key={crs} value={crs}>
                      {crs}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Risk Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs text-muted-foreground shrink-0">فیلتر وضعیت:</span>
              <button
                type="button"
                onClick={() => setRiskFilter("ALL")}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  riskFilter === "ALL"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                همه ({toPersianDigits(roster.length)})
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("GREEN")}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  riskFilter === "GREEN"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                پایدار (سبز) ({toPersianDigits(greenCount)})
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("YELLOW")}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  riskFilter === "YELLOW"
                    ? "bg-amber-600 text-white font-semibold"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                نیازمند توجه (زرد) ({toPersianDigits(yellowCount)})
              </button>
              <button
                type="button"
                onClick={() => setRiskFilter("RED")}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                  riskFilter === "RED"
                    ? "bg-rose-600 text-white font-semibold"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                }`}
              >
                بحرانی (قرمز) ({toPersianDigits(redCount)})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Candidate Roster List */}
      <div className="space-y-4">
        {filteredRoster.length === 0 ? (
          <Card className="border-border bg-card p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground">هیچ داوطلبی مطابق با فیلتر انتخابی یافت نشد</h3>
            <p className="text-xs text-muted-foreground mt-1">
              لطفاً متن جستجو یا فیلتر وضعیت را تغییر دهید.
            </p>
          </Card>
        ) : (
          filteredRoster.map((student) => {
            const hasRecentCall = student.recentCalls.length > 0;
            const latestCall = hasRecentCall ? student.recentCalls[0] : null;

            return (
              <Card
                key={student.id}
                className="border-border bg-card overflow-hidden hover:border-primary/40 transition-colors shadow-xs"
              >
                <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                  {/* Student Identity & Key Profile Details */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-700 text-white font-bold text-base shadow-md shadow-indigo-600/20 shrink-0">
                      {student.fullName.slice(0, 1)}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/mentor/student/${student.id}`}
                          className="text-base font-bold text-foreground hover:text-primary transition-colors hover:underline"
                        >
                          {student.fullName}
                        </Link>
                        <Badge variant={riskBadgeVariants[student.riskStatus]}>
                          {riskLabels[student.riskStatus]}
                        </Badge>
                        {student.activeTriageCaseCount > 0 && (
                          <Badge variant="red" className="animate-pulse">
                            {toPersianDigits(student.activeTriageCaseCount)} پرونده بحران باز
                          </Badge>
                        )}
                        {Boolean(student.pendingExamReviewCount && student.pendingExamReviewCount > 0 && student.latestPendingSubmissionId) && (
                          <Link href={`/mentor/exams/review/${student.latestPendingSubmissionId}`}>
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none animate-pulse flex items-center gap-1 cursor-pointer shadow-xs">
                              <Sparkles className="h-3 w-3" />
                              <span>کارنامه آزمون نیازمند بازبینی و تحلیل</span>
                            </Badge>
                          </Link>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <div>
                          شماره تماس امن:{" "}
                          <span className="font-mono font-bold text-primary text-xs">
                            {student.maskedPhone}
                          </span>
                        </div>
                        <div>•</div>
                        <div>
                          هدف:{" "}
                          <span className="text-foreground font-medium">
                            {student.masterclassGoal}
                          </span>
                        </div>
                        <div>•</div>
                        <div>
                          ساعت مطالعه:{" "}
                          <span className="text-foreground font-medium persian-nums">
                            {toPersianDigits(student.currentDailyStudyHours)} ساعت در روز
                          </span>
                        </div>
                        <div>•</div>
                        <div>
                          وضعیت اشتغال:{" "}
                          <span className="text-foreground font-medium">
                            {student.employmentStatus === "FULL_TIME"
                              ? "شاغل تمام‌وقت"
                              : student.employmentStatus === "PART_TIME"
                              ? "شاغل پاره‌وقت"
                              : "داوطلب غیرشاغل"}
                          </span>
                        </div>
                      </div>

                      {/* Educational Progress Status & Last Consultation Note Snippet */}
                      <div className="pt-2 text-xs flex flex-wrap items-center gap-3">
                        {student.latestExam && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium">
                            <GraduationCap className="h-3.5 w-3.5" />
                            <span>
                              آخرین آزمون: {student.latestExam.overallScorePercent}٪{" "}
                              {student.latestExam.overallRank ? `(رتبه ${student.latestExam.overallRank})` : ""}
                            </span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                          <span>
                            برنامه هفتگی: {toPersianDigits(student.scheduleItemCount)} پارت مطالعه فعال
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>
                            آخرین تماس:{" "}
                            {student.lastContactAt
                              ? formatJalaliHuman(new Date(student.lastContactAt))
                              : "تماسی ثبت نشده"}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-medium">
                          <FileText className="h-3.5 w-3.5" />
                          <span>
                            {toPersianDigits(student.callNotesCount)} یادداشت مشاوره در پرونده
                          </span>
                        </span>
                      </div>

                      {/* Highlight snippet of most recent conversation note */}
                      {latestCall && latestCall.notes && (
                        <div className="mt-2 text-xs bg-muted/60 p-2.5 rounded-lg border border-border/60 text-muted-foreground">
                          <span className="font-semibold text-foreground ms-1">
                            آخرین خلاصه مذاکره:
                          </span>
                          <span className="line-clamp-2">{latestCall.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Action Buttons (VoIP Call, Notes, Plan Adjuster) */}
                  <div className="flex flex-wrap lg:flex-col items-stretch sm:items-end gap-2 w-full lg:w-auto shrink-0">
                    {/* 1. Asterisk Issabel AMI Click-to-Call */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOriginateAmiCall(student)}
                      disabled={callingStudentId === student.id}
                      className="text-xs flex items-center justify-center gap-1.5 bg-[#004071] hover:bg-[#003058] text-white shadow-xs w-full sm:w-auto"
                      title="برقراری تماس امن AMI با نرم‌افزار زویپر بدون افشای شماره داوطلب"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      <span>
                        {callingStudentId === student.id
                          ? "در حال اتصال به AMI..."
                          : "تماس امن زویپر (Issabel)"}
                      </span>
                    </Button>

                    {/* 2. Log Conversation Note Modal Trigger */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNoteModalStudent(student);
                        setNoteTopic("جلسه مشاوره هفتگی و بررسی روند مطالعه");
                        setNoteContent("");
                        setNoteDuration("15");
                        setNoteCallStatus("COMPLETED");
                      }}
                      className="text-xs flex items-center justify-center gap-1.5 border-border hover:bg-muted text-foreground w-full sm:w-auto"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      <span>ثبت یادداشت و نکات گفتگو</span>
                    </Button>

                    {/* 3. Consultation History & Notes Viewer */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryModalStudent(student)}
                      className="text-xs flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted w-full sm:w-auto"
                    >
                      <History className="h-3.5 w-3.5 text-sky-500" />
                      <span>سوابق مکالمات و یادداشت‌ها</span>
                    </Button>

                    {/* 4. Directly Adjust Weekly Plan Based on Notes */}
                    <Link
                      href={`/plans?studentId=${student.id}`}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 w-full"
                        title="تنظیم و شخصی‌سازی برنامه هفتگی بر اساس مصوبات مکالمه"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>تنظیم برنامه هفتگی داوطلب</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. MODAL: Log Conversation Notes */}
      {noteModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border-border bg-card shadow-2xl">
            <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>ثبت یادداشت و خلاصه مکالمه مشاوره</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  داوطلب: <span className="font-bold text-foreground">{noteModalStudent.fullName}</span> • شماره تماس امن: {noteModalStudent.maskedPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalStudent(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {noteFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    noteFeedback.includes("موفقیت")
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{noteFeedback}</span>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    موضوع یا محور اصلی گفتگو:
                  </label>
                  <input
                    type="text"
                    value={noteTopic}
                    onChange={(e) => setNoteTopic(e.target.value)}
                    placeholder="مثلاً: بررسی افت درصد مدنی، مدیریت خواب، آزمون شماره ۲..."
                    className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    مدت مکالمه (دقیقه):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={noteDuration}
                    onChange={(e) => setNoteDuration(e.target.value)}
                    className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  نتیجه و وضعیت تماس:
                </label>
                <select
                  value={noteCallStatus}
                  onChange={(e) => setNoteCallStatus(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="COMPLETED">تماس با موفقیت برقرار و مشاوره انجام شد (پاسخ داده شد)</option>
                  <option value="BUSY">خط مشغول بود یا در دسترس نبود</option>
                  <option value="NO_ANSWER">داوطلب پاسخ نداد (پیامک یادآوری ارسال گردید)</option>
                  <option value="VOICEMAIL">پست صوتی یا تماس ناموفق</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  شرح کامل مذاکرات، توافقات و نکات آموزشی:
                </label>
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="نکات کلیدی مطرح شده در مکالمه، چالش‌های درسی داوطلب، ساعات مطالعه توافق شده، مواد قانونی نیازمند تکرار، و راهکارهای تنظیمی..."
                  className="w-full text-xs rounded-lg border border-border bg-background p-3 text-foreground focus:border-primary focus:outline-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNoteModalStudent(null)}
                  className="text-xs text-muted-foreground w-full sm:w-auto"
                >
                  انصراف
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending || !noteContent.trim()}
                    onClick={() => handleSaveConsultationNote(false)}
                    className="text-xs border-border hover:bg-muted w-full sm:w-auto"
                  >
                    <CheckCircle className="h-3.5 w-3.5 ms-1" />
                    <span>{isPending ? "در حال ثبت..." : "ذخیره یادداشت در پرونده"}</span>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    disabled={isPending || !noteContent.trim()}
                    onClick={() => handleSaveConsultationNote(true)}
                    className="text-xs bg-[#004071] hover:bg-[#003058] text-white flex items-center gap-1.5 w-full sm:w-auto"
                    title="ذخیره یادداشت و هدایت مستقیم به ویرایشگر برنامه هفتگی داوطلب"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>ذخیره و شخصی‌سازی برنامه هفتگی</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. MODAL: Consultation Notes & Call History Timeline */}
      {historyModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[85vh] border-border bg-card shadow-2xl flex flex-col">
            <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  <span>تاریخچه مکالمات و یادداشت‌های مشاوره</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  داوطلب: <span className="font-bold text-foreground">{historyModalStudent.fullName}</span> • مجموع تماس‌ها: {toPersianDigits(historyModalStudent.recentCalls.length)} مورد
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/plans?studentId=${historyModalStudent.id}`}
                  onClick={() => setHistoryModalStudent(null)}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex items-center gap-1.5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    <span>تنظیم برنامه هفتگی داوطلب</span>
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={() => setHistoryModalStudent(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-y-auto space-y-4 flex-1">
              {historyModalStudent.recentCalls.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs">تاکنون تماسی برای این داوطلب ثبت نشده است.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const st = historyModalStudent;
                      setHistoryModalStudent(null);
                      setNoteModalStudent(st);
                      setNoteTopic("جلسه مشاوره هفتگی");
                      setNoteContent("");
                    }}
                    className="mt-3 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 ms-1" />
                    <span>ثبت اولین یادداشت مشاوره</span>
                  </Button>
                </div>
              ) : (
                historyModalStudent.recentCalls.map((call, idx) => {
                  const callDate = new Date(call.initiatedAt);
                  const durationMin = Math.round(call.durationSeconds / 60) || 1;
                  const isEditing = editingCallId === call.id;

                  return (
                    <div
                      key={call.id || idx}
                      className="border border-border rounded-xl p-4 bg-muted/30 space-y-2 relative"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                            {toPersianDigits(idx + 1)}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-foreground">
                              {call.mentorName || "پشتیبان آموزشی"}
                            </span>
                            <span className="text-[11px] text-muted-foreground ms-2">
                              {formatJalaliHuman(callDate)} • ساعت {toPersianDigits(callDate.getHours())}:{callDate.getMinutes() < 10 ? "۰" : ""}{toPersianDigits(callDate.getMinutes())}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              call.status === "COMPLETED"
                                ? "green"
                                : call.status === "RINGING"
                                ? "blue"
                                : "yellow"
                            }
                            className="text-[10px]"
                          >
                            {call.status === "COMPLETED"
                              ? `پاسخ داده شد (${toPersianDigits(durationMin)} دقیقه)`
                              : call.status === "RINGING"
                              ? "در حال برقراری"
                              : call.status}
                          </Badge>

                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCallId(call.id);
                                setEditNotesValue(call.notes || "");
                              }}
                              className="text-[11px] text-primary hover:underline ms-2"
                            >
                              ویرایش یادداشت
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Call Notes Content */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={4}
                            value={editNotesValue}
                            onChange={(e) => setEditNotesValue(e.target.value)}
                            className="w-full text-xs rounded-lg border border-border bg-background p-2.5 text-foreground focus:border-primary focus:outline-none"
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingCallId(null)}
                              className="text-xs"
                            >
                              انصراف
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleUpdateNote(call.id)}
                              className="text-xs bg-primary text-primary-foreground"
                            >
                              {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                          {call.notes || "بدون یادداشت متنی."}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 7. MODAL: Configure Mentor Daily Calling Window (2-3 Hours Daily) */}
      {isCallingWindowModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
            <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <span>تنظیم ساعات پاسخگویی تلفنی روزانه</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  تعیین بازه زمانی پاسخگویی تلفنی داوطلبان (۲ الی ۳ ساعت در روز)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCallingWindowModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {windowFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    windowFeedback.includes("موفقیت")
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  }`}
                >
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{windowFeedback}</span>
                </div>
              )}

              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                داوطلبان تحت پشتیبانی شما صرفاً در این بازه زمانی مجاز به درخواست تماس تلفنی امن دوطرفه خواهند بود. سامانه ابتدا زویپر شما را شماره‌گیری نموده و پس از پاسخ شما، با داوطلب ارتباط برقرار می‌کند.
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    ساعت شروع پاسخگویی:
                  </label>
                  <input
                    type="time"
                    value={windowStartTime}
                    onChange={(e) => setWindowStartTime(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    ساعت پایان پاسخگویی:
                  </label>
                  <input
                    type="time"
                    value={windowEndTime}
                    onChange={(e) => setWindowEndTime(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-sm font-mono text-foreground focus:border-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Days of Week Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  روزهای فعال هفته:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {PERSIAN_WEEKDAYS.map((dayName, index) => {
                    const isSelected = windowDays.includes(index);
                    return (
                      <button
                        key={dayName}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setWindowDays(windowDays.filter((d) => d !== index));
                          } else {
                            setWindowDays([...windowDays, index].sort());
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Announcement Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  پیام اطلاع‌رسانی به داوطلبان (اختیاری):
                </label>
                <input
                  type="text"
                  value={windowAnnouncement}
                  onChange={(e) => setWindowAnnouncement(e.target.value)}
                  placeholder="مثال: پاسخگویی عصرگاهی از ساعت ۱۷ تا ۲۰"
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">
                    وضعیت امکان برقراری تماس توسط داوطلبان
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    در صورت غیرفعال بودن، دکمه تماس در پنل داوطلبان مسدود خواهد بود
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={windowIsActive}
                  onChange={(e) => setWindowIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCallingWindowModalOpen(false)}
                  className="text-xs"
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  disabled={isSavingWindow || windowDays.length === 0}
                  onClick={handleSaveCallingWindow}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSavingWindow ? "در حال ذخیره..." : "ثبت ساعات پاسخگویی"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
