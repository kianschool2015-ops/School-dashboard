"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  FolderTree,
  Users,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Search,
  Filter,
  Shield,
  ShieldCheck,
  Sparkles,
  Phone,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserMinus,
  Layers,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toPersianDigits } from "@/lib/jalali";
import {
  assignMentorToSupervisorAction,
  assignStudentToMentorAction,
  transferStudentAction,
  bulkAssignStudentsAction,
  getAssignmentHubDataAction,
  type AssignmentHubData,
  type SupervisorFolderItem,
  type MentorAssignmentItem,
  type StudentAssignmentItem,
} from "@/server/actions/assignments";

interface AssignmentsClientProps {
  initialData: AssignmentHubData;
  currentUserRole: string;
  currentUserId: string;
}

export function AssignmentsClient({
  initialData,
  currentUserRole,
  currentUserId,
}: AssignmentsClientProps) {
  const [data, setData] = useState<AssignmentHubData>(initialData);
  const [activeTab, setActiveTab] = useState<"SUPERVISORS" | "STUDENTS">(
    currentUserRole === "SUPERVISOR" ? "STUDENTS" : "SUPERVISORS"
  );
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search & Filter States
  const [searchStudent, setSearchStudent] = useState("");
  const [filterMentor, setFilterMentor] = useState<string>("ALL");
  const [filterCourse, setFilterCourse] = useState<string>("ALL");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetBatchMentorId, setTargetBatchMentorId] = useState<string>("");

  // Transfer Modal / Quick Action State
  const [transferModalStudent, setTransferModalStudent] = useState<StudentAssignmentItem | null>(null);
  const [targetTransferMentorId, setTargetTransferMentorId] = useState<string>("");

  const isAdminOrCeo = currentUserRole === "ADMIN" || currentUserRole === "CEO";

  const refreshData = async () => {
    try {
      const fresh = await getAssignmentHubDataAction();
      setData(fresh);
    } catch (err) {
      console.warn("[AssignmentsClient] Error refreshing hub data:", err);
    }
  };

  // Handlers for Tab 1: Mentor -> Supervisor
  const handleAssignMentorToSupervisor = (mentorId: string, supervisorId: string | null) => {
    startTransition(async () => {
      setBanner(null);
      const res = await assignMentorToSupervisorAction({ mentorId, supervisorId });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        await refreshData();
      } else {
        setBanner({ type: "error", text: res.message });
      }
    });
  };

  // Handlers for Tab 2: Student -> Mentor
  const handleAssignStudent = (studentProfileId: string, mentorId: string | null) => {
    startTransition(async () => {
      setBanner(null);
      const res = await assignStudentToMentorAction({ studentProfileId, mentorId });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        await refreshData();
      } else {
        setBanner({ type: "error", text: res.message });
      }
    });
  };

  const handleExecuteTransfer = () => {
    if (!transferModalStudent || !targetTransferMentorId) return;

    startTransition(async () => {
      setBanner(null);
      const res = await transferStudentAction({
        studentProfileId: transferModalStudent.id,
        toMentorId: targetTransferMentorId,
      });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        setTransferModalStudent(null);
        setTargetTransferMentorId("");
        await refreshData();
      } else {
        setBanner({ type: "error", text: res.message });
      }
    });
  };

  const handleBatchAssign = () => {
    if (selectedStudentIds.length === 0 || !targetBatchMentorId) return;

    startTransition(async () => {
      setBanner(null);
      const res = await bulkAssignStudentsAction({
        studentProfileIds: selectedStudentIds,
        mentorId: targetBatchMentorId === "UNASSIGN" ? null : targetBatchMentorId,
      });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        setSelectedStudentIds([]);
        setTargetBatchMentorId("");
        await refreshData();
      } else {
        setBanner({ type: "error", text: res.message });
      }
    });
  };

  // Filtered Students Calculation
  const filteredStudents = data.students.filter((st) => {
    const matchesSearch =
      st.fullName.toLowerCase().includes(searchStudent.toLowerCase()) ||
      st.phoneNumber.includes(searchStudent) ||
      (st.nationalId && st.nationalId.includes(searchStudent));

    const matchesMentor =
      filterMentor === "ALL"
        ? true
        : filterMentor === "UNASSIGNED"
        ? !st.mentorId
        : st.mentorId === filterMentor;

    const matchesCourse =
      filterCourse === "ALL" ? true : st.enrolledCourseName === filterCourse;

    return matchesSearch && matchesMentor && matchesCourse;
  });

  const distinctCourses = Array.from(
    new Set(data.students.map((s) => s.enrolledCourseName).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/supervisor" className="hover:text-primary transition-colors">
              کارتابل سرپرستی
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">مرکز سلسله‌مراتب و تخصیص پوشه‌ها</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2.5">
            <FolderTree className="w-6 h-6 text-[#004071] dark:text-sky-400" />
            <span>مدیریت پوشه‌های نظارتی و تخصیص داوطلبان</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            سامانه دو سطحی انتساب پشتیبانان به پوشه سرپرستان و تخصیص/جابه‌جایی داوطلبان کانون وکلا
          </p>
        </div>

        {/* Global Summary Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs px-3 py-1 bg-muted/30">
            <span>{toPersianDigits(data.supervisors.length)} سرپرست</span>
          </Badge>
          <Badge variant="outline" className="text-xs px-3 py-1 bg-muted/30">
            <span>{toPersianDigits(data.mentors.length)} پشتیبان</span>
          </Badge>
          <Badge variant="outline" className="text-xs px-3 py-1 bg-[#004071]/10 text-[#004071] dark:text-sky-400 border-[#004071]/20">
            <span>{toPersianDigits(data.students.length)} داوطلب کل</span>
          </Badge>
          {data.unassignedStudents.length > 0 && (
            <Badge variant="destructive" className="text-xs px-3 py-1 animate-pulse">
              <span>{toPersianDigits(data.unassignedStudents.length)} داوطلب بدون پشتیبان</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Global Feedback Banner */}
      {banner && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-medium transition-all ${
            banner.type === "success"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/30"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        {isAdminOrCeo && (
          <button
            type="button"
            onClick={() => setActiveTab("SUPERVISORS")}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === "SUPERVISORS"
                ? "bg-[#004071] text-white shadow-sm"
                : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>تب ۱: اختصاص پشتیبانان به پوشه سرپرستان (Supervisors)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("STUDENTS")}
          className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === "STUDENTS"
              ? "bg-[#004071] text-white shadow-sm"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>تب ۲: مدیریت پوشه پشتیبانان و جابه‌جایی داوطلبان (Students &lt;-&gt; Mentors)</span>
          {data.unassignedStudents.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-mono">
              {toPersianDigits(data.unassignedStudents.length)}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ADMIN - SUPERVISOR FOLDERS & MENTORS */}
      {/* ========================================================================= */}
      {activeTab === "SUPERVISORS" && isAdminOrCeo && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#004071] shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground block mb-0.5 font-bold">
                سطح اول معماری سازمانی: انتساب پشتیبانان علمی به پوشه سرپرستان
              </strong>
              <span>
                در این بخش مدیر ارشد یا مدیر آموزش می‌تواند هر پشتیبان را داخل پوشه نظارتی یک سرپرست قرار دهد. سرپرست منحصراً به داوطلبان و پرونده‌های پشتیبانان موجود در پوشه خود دسترسی نظارتی، پایش عملکرد و ارجاع وظیفه خواهد داشت.
              </span>
            </div>
          </div>

          {/* Supervisor Folders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.supervisors.map((sup) => {
              const supMentors = data.mentors.filter((m) => m.supervisorId === sup.id);

              return (
                <Card key={sup.id} className="border-border bg-card shadow-xs overflow-hidden">
                  <CardHeader className="p-4 bg-muted/20 border-b border-border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#004071] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold text-foreground">
                            پوشه سرپرستی: {sup.fullName}
                          </CardTitle>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {toPersianDigits(sup.phoneNumber)}
                          </span>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-background">
                        {toPersianDigits(sup.assignedMentorsCount)} پشتیبان
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/60">
                      <span>کل داوطلبان تحت نظارت این سرپرست:</span>
                      <strong className="text-foreground font-mono text-sm">
                        {toPersianDigits(sup.assignedStudentsTotalCount)} داوطلب
                      </strong>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-foreground block">
                        پشتیبانان مستقر در این پوشه:
                      </span>
                      {supMentors.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground italic p-3 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                          پشتیبانی به این سرپرست اختصاص داده نشده است.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {supMentors.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/80 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">{m.fullName}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                                  {toPersianDigits(m.assignedStudentsCount)} داوطلب
                                </Badge>
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isPending}
                                onClick={() => handleAssignMentorToSupervisor(m.id, null)}
                                className="h-6 px-2 text-[10px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                              >
                                خروج از پوشه
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Mentors Table with Supervisor Assignment Dropdown */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="p-4 border-b border-border bg-muted/10">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-[#004071]" />
                <span>فهرست کل پشتیبانان و وضعیت پوشه سرپرستی آن‌ها</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 text-start">نام پشتیبان</th>
                      <th className="p-3 text-start">شماره تماس</th>
                      <th className="p-3 text-start">داوطلبان اختصاصی</th>
                      <th className="p-3 text-start">ظرفیت تکمیل‌شده</th>
                      <th className="p-3 text-start">سرپرست مستقیم (پوشه نظارتی)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.mentors.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-bold text-foreground">{m.fullName}</td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {toPersianDigits(m.phoneNumber)}
                        </td>
                        <td className="p-3 font-mono">
                          {toPersianDigits(m.assignedStudentsCount)} داوطلب
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 w-32">
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border">
                              <div
                                className={`h-full rounded-full ${
                                  m.capacityPercentage > 90
                                    ? "bg-rose-500"
                                    : m.capacityPercentage > 70
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${m.capacityPercentage}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                              {toPersianDigits(m.capacityPercentage)}٪
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={m.supervisorId || ""}
                            disabled={isPending}
                            onChange={(e) =>
                              handleAssignMentorToSupervisor(
                                m.id,
                                e.target.value === "" ? null : e.target.value
                              )
                            }
                            className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                          >
                            <option value="">(بدون سرپرست - آزاد)</option>
                            {data.supervisors.map((sup) => (
                              <option key={sup.id} value={sup.id}>
                                پوشه: {sup.fullName}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STUDENTS <-> MENTORS ALLOCATION & TRANSFER */}
      {/* ========================================================================= */}
      {activeTab === "STUDENTS" && (
        <div className="space-y-6">
          {/* Top Stat Banners */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border bg-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">کل داوطلبان</span>
                <strong className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                  {toPersianDigits(data.students.length)} داوطلب
                </strong>
              </div>
              <Users className="w-8 h-8 text-[#004071] opacity-60" />
            </Card>

            <Card className="border-border bg-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">تخصیص‌یافته به پشتیبان</span>
                <strong className="text-xl font-bold font-mono text-emerald-600 mt-0.5 block">
                  {toPersianDigits(data.students.length - data.unassignedStudents.length)} داوطلب
                </strong>
              </div>
              <UserCheck className="w-8 h-8 text-emerald-500 opacity-60" />
            </Card>

            <Card className="border-border bg-card p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">داوطلبان در صف انتظار</span>
                <strong className="text-xl font-bold font-mono text-rose-600 mt-0.5 block">
                  {toPersianDigits(data.unassignedStudents.length)} داوطلب
                </strong>
              </div>
              <UserX className="w-8 h-8 text-rose-500 opacity-60" />
            </Card>
          </div>

          {/* Unassigned Students Waiting Room Notice */}
          {data.unassignedStudents.length > 0 && (
            <Card className="border-2 border-rose-500/30 bg-rose-500/5 shadow-xs">
              <CardHeader className="p-4 border-b border-rose-500/20 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-rose-600" />
                    <CardTitle className="text-sm font-bold text-foreground">
                      صف داوطلبان در انتظار تخصیص پشتیبان ({toPersianDigits(data.unassignedStudents.length)} داوطلب)
                    </CardTitle>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    لطفاً جهت فعال‌سازی برنامه مطالعاتی این داوطلبان، پشتیبان مناسب را انتخاب نمایید.
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.unassignedStudents.slice(0, 6).map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-card border border-border flex flex-col justify-between gap-2 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{st.fullName}</span>
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            بدون پشتیبان
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {toPersianDigits(st.phoneNumber)}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {st.enrolledCourseName}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                        <select
                          disabled={isPending}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignStudent(st.id, e.target.value);
                            }
                          }}
                          defaultValue=""
                          className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                        >
                          <option value="" disabled>
                            انتخاب پشتیبان...
                          </option>
                          {data.mentors.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} ({toPersianDigits(m.assignedStudentsCount)} داوطلب)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mentors Capacity Visual Bar Cards */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004071]" />
              <span>ظرفیت و ترافیک کاری پشتیبانان علمی</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.mentors.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setFilterMentor(filterMentor === m.id ? "ALL" : m.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    filterMentor === m.id
                      ? "bg-[#004071]/10 border-[#004071] shadow-xs"
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-bold text-xs text-foreground truncate">{m.fullName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-mono font-bold ${
                        m.assignedStudentsCount >= 45
                          ? "border-rose-500 text-rose-600 bg-rose-500/10"
                          : m.assignedStudentsCount >= 35
                          ? "border-amber-500 text-amber-600 bg-amber-500/10"
                          : "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                      }`}
                    >
                      {toPersianDigits(m.assignedStudentsCount)} / {toPersianDigits(m.maxCapacity)}
                    </Badge>
                  </div>

                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border mb-1.5">
                    <div
                      className={`h-full rounded-full ${
                        m.capacityPercentage > 90
                          ? "bg-rose-500"
                          : m.capacityPercentage > 70
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${m.capacityPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>سرپرست: {m.supervisorName || "بدون پوشه"}</span>
                    <span>{toPersianDigits(m.capacityPercentage)}٪</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Filters Bar */}
          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    placeholder="جستجوی نام داوطلب، شماره تماس یا کد ملی..."
                    className="w-full h-10 pr-9 pl-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Filter Mentor */}
                <div>
                  <select
                    value={filterMentor}
                    onChange={(e) => setFilterMentor(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">همه پشتیبانان (کل داوطلبان)</option>
                    <option value="UNASSIGNED">صرفاً داوطلبان بدون پشتیبان</option>
                    {data.mentors.map((m) => (
                      <option key={m.id} value={m.id}>
                        پشتیبان: {m.fullName} ({toPersianDigits(m.assignedStudentsCount)} داوطلب)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Course */}
                <div>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="ALL">همه دوره‌های ثبت‌نامی</option>
                    {distinctCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batch Action Bar if items selected */}
              {selectedStudentIds.length > 0 && (
                <div className="p-3 rounded-xl bg-[#004071]/10 border border-[#004071]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#004071]" />
                    <span className="font-bold text-foreground">
                      {toPersianDigits(selectedStudentIds.length)} داوطلب انتخاب شده است.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={targetBatchMentorId}
                      onChange={(e) => setTargetBatchMentorId(e.target.value)}
                      className="h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground"
                    >
                      <option value="">انتخاب پشتیبان مقصد...</option>
                      <option value="UNASSIGN">سلب پشتیبان (آزادسازی)</option>
                      {data.mentors.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending || !targetBatchMentorId}
                      onClick={handleBatchAssign}
                      className="text-xs h-8 px-3 bg-[#004071] hover:bg-[#002f54] text-white font-bold"
                    >
                      {isPending ? "در حال اعمال..." : "تخصیص گروهی"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedStudentIds([])}
                      className="text-xs h-8 px-2 text-muted-foreground"
                    >
                      لغو انتخاب
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Students List Table */}
          <Card className="border-border bg-card shadow-xs overflow-hidden">
            <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-[#004071]" />
                <span>فهرست داوطلبان ({toPersianDigits(filteredStudents.length)} داوطلب)</span>
              </CardTitle>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedStudentIds.length === filteredStudents.length) {
                      setSelectedStudentIds([]);
                    } else {
                      setSelectedStudentIds(filteredStudents.map((s) => s.id));
                    }
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {selectedStudentIds.length === filteredStudents.length
                    ? "لغو انتخاب همه"
                    : "انتخاب همه موارد این صفحه"}
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 text-center w-10">انتخاب</th>
                      <th className="p-3 text-start">نام داوطلب</th>
                      <th className="p-3 text-start">شماره تماس / کد ملی</th>
                      <th className="p-3 text-start">دوره ثبت‌نامی</th>
                      <th className="p-3 text-start">پشتیبان اختصاصی</th>
                      <th className="p-3 text-start">سرپرست ناظر</th>
                      <th className="p-3 text-center">عملیات جابه‌جایی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          هیچ داوطلبی با معیارهای جستجو یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => {
                        const isSelected = selectedStudentIds.includes(st.id);

                        return (
                          <tr
                            key={st.id}
                            className={`hover:bg-muted/20 transition-colors ${
                              isSelected ? "bg-[#004071]/5" : ""
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentIds((prev) => [...prev, st.id]);
                                  } else {
                                    setSelectedStudentIds((prev) => prev.filter((id) => id !== st.id));
                                  }
                                }}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-foreground">{st.fullName}</div>
                              {st.riskStatus === "RED" && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 mt-0.5">
                                  هشدار قرمز
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 font-mono text-muted-foreground">
                              <div>{toPersianDigits(st.phoneNumber)}</div>
                              {st.nationalId && (
                                <div className="text-[10px] opacity-75">
                                  کد ملی: {toPersianDigits(st.nationalId)}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-xs">
                              {st.enrolledCourseName}
                            </td>
                            <td className="p-3">
                              {st.mentorName ? (
                                <div className="flex items-center gap-1.5 font-medium text-foreground">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{st.mentorName}</span>
                                </div>
                              ) : (
                                <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                  در انتظار تعیین پشتیبان
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {st.supervisorName ? (
                                <span>پوشه {st.supervisorName}</span>
                              ) : (
                                <span className="opacity-50">---</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Transfer Button */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTransferModalStudent(st);
                                    setTargetTransferMentorId(st.mentorId || "");
                                  }}
                                  className="h-7 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10 border-primary/30"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span>{st.mentorId ? "انتقال" : "تخصیص"}</span>
                                </Button>

                                {/* Unassign Button */}
                                {st.mentorId && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={isPending}
                                    onClick={() => handleAssignStudent(st.id, null)}
                                    className="h-7 px-1.5 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                                    title="سلب پشتیبان"
                                  >
                                    <UserMinus className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer / Direct Assignment Modal */}
      {transferModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#004071]" />
                <span>
                  {transferModalStudent.mentorId ? "انتقال داوطلب به پشتیبان جدید" : "تخصیص اولیه داوطلب"}
                </span>
              </h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setTransferModalStudent(null)}
                className="h-7 w-7 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-2 text-xs bg-muted/30 p-3 rounded-xl border border-border">
              <div>
                نام داوطلب: <strong className="text-foreground">{transferModalStudent.fullName}</strong>
              </div>
              <div>
                شماره تماس:{" "}
                <span className="font-mono text-muted-foreground">
                  {toPersianDigits(transferModalStudent.phoneNumber)}
                </span>
              </div>
              <div>
                پشتیبان فعلی:{" "}
                <strong className="text-foreground">
                  {transferModalStudent.mentorName || "در انتظار تخصیص پشتیبان"}
                </strong>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                انتخاب پشتیبان مقصد:
              </label>
              <select
                value={targetTransferMentorId}
                onChange={(e) => setTargetTransferMentorId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="">انتخاب پشتیبان...</option>
                {data.mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({toPersianDigits(m.assignedStudentsCount)} / {toPersianDigits(m.maxCapacity)} داوطلب)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferModalStudent(null)}
                className="text-xs"
              >
                انصراف
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPending || !targetTransferMentorId}
                onClick={handleExecuteTransfer}
                className="text-xs font-bold bg-[#004071] hover:bg-[#002f54] text-white px-4"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ms-1.5" />
                    <span>در حال انتقال...</span>
                  </>
                ) : (
                  <span>ثبت انتقال داوطلب</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
