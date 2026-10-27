"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  CreditCard,
  BookOpen,
  Sparkles,
  Clock,
  CheckSquare,
  Square,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toPersianDigits, toJalaliString } from "@/lib/jalali";
import {
  assignMentorToStudentAction,
  bulkAssignMentorToStudentsAction,
  type UnassignedStudentRow,
  type MentorOption,
} from "@/server/actions/supervisor-assignment";

interface Props {
  initialStudents: UnassignedStudentRow[];
  mentors: MentorOption[];
}

export function UnassignedStudentsClient({ initialStudents, mentors }: Props) {
  const router = useRouter();
  const [students, setStudents] = useState<UnassignedStudentRow[]>(initialStudents);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [bulkMentorId, setBulkMentorId] = useState("");
  const [rowMentorMap, setRowMentorMap] = useState<Record<string, string>>({});
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const [isBulkPending, startBulkTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Distinct courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const courses = new Set<string>();
    for (const s of students) {
      if (s.enrolledCourseName) {
        courses.add(s.enrolledCourseName);
      }
    }
    return Array.from(courses);
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !searchTerm.trim() ||
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phoneNumber.includes(searchTerm) ||
        (s.nationalId && s.nationalId.includes(searchTerm));

      const matchCourse =
        courseFilter === "ALL" || s.enrolledCourseName === courseFilter;

      return matchSearch && matchCourse;
    });
  }, [students, searchTerm, courseFilter]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedIds.includes(s.profileId));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.profileId));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single assignment
  const handleSingleAssign = async (profileId: string) => {
    const mentorId = rowMentorMap[profileId] || mentors[0]?.id;
    if (!mentorId) {
      setFeedback({ type: "error", message: "لطفاً یک پشتیبان برای تخصیص انتخاب کنید." });
      return;
    }

    setActionLoadingMap((prev) => ({ ...prev, [profileId]: true }));
    setFeedback(null);

    try {
      const res = await assignMentorToStudentAction(profileId, mentorId);
      if (res.success) {
        setFeedback({ type: "success", message: res.message });
        setStudents((prev) => prev.filter((s) => s.profileId !== profileId));
        setSelectedIds((prev) => prev.filter((id) => id !== profileId));
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.message });
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: (err as Error)?.message || "خطای سیستمی رخ داد." });
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [profileId]: false }));
    }
  };

  // Bulk assignment
  const handleBulkAssign = () => {
    if (!selectedIds.length) {
      setFeedback({ type: "error", message: "حداقل یک داوطلب را انتخاب کنید." });
      return;
    }
    if (!bulkMentorId) {
      setFeedback({ type: "error", message: "لطفاً پشتیبان مورد نظر را برای تخصیص گروهی انتخاب کنید." });
      return;
    }

    setFeedback(null);
    startBulkTransition(async () => {
      try {
        const res = await bulkAssignMentorToStudentsAction(selectedIds, bulkMentorId);
        if (res.success) {
          setFeedback({ type: "success", message: res.message });
          setStudents((prev) => prev.filter((s) => !selectedIds.includes(s.profileId)));
          setSelectedIds([]);
          setBulkMentorId("");
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.message });
        }
      } catch (err: unknown) {
        setFeedback({ type: "error", message: (err as Error)?.message || "خطا در تخصیص گروهی پشتیبان." });
      }
    });
  };

  const formatSourceBadge = (source: string) => {
    switch (source) {
      case "EXCEL_WHITELIST":
        return { label: "اکسل / لیست سفید", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
      case "GARNET_SSO":
      case "CENTRAL_API":
        return { label: "حساب کاربری مشاهیر دانش", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" };
      default:
        return { label: "ثبت مستقیم", color: "bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800" };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 end-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  صف انتظار تعیین پشتیبان اختصاصی
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  تخصیص هوشمند، فردی و گروهی داوطلبان جدیدالورود به کادر پشتیبانان تخصصی آزمون وکالت
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">داوطلبان در انتظار:</span>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-600 text-white">
                {toPersianDigits(students.length)} نفر
              </span>
            </div>

            <button
              onClick={() => router.refresh()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="تازه‌سازی فهرست"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            )}
            <p className="text-sm font-medium">{feedback.message}</p>
          </div>
        )}
      </div>

      {/* Control Bar: Search, Filter & Bulk Assignment */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو بر اساس نام داوطلب، شماره موبایل یا کد ملی..."
              className="w-full ps-10 pe-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">فیلتر دوره:</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition max-w-xs"
            >
              <option value="ALL">همه دوره‌ها</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (Active when items selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {toPersianDigits(selectedIds.length)}
              </span>
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                داوطلب جهت تخصیص گروهی انتخاب شده است
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={bulkMentorId}
                onChange={(e) => setBulkMentorId(e.target.value)}
                disabled={isBulkPending}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">-- انتخاب پشتیبان برای تخصیص گروهی --</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({toPersianDigits(m.studentCount)} داوطلب تحت پوشش)
                  </option>
                ))}
              </select>

              <button
                onClick={handleBulkAssign}
                disabled={isBulkPending || !bulkMentorId}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isBulkPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال انتساب...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>تخصیص گروهی</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
              صف انتظار خالی است
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              هیچ داوطلبی در انتظار تعیین پشتیبان نیست. تمامی داوطلبان دارای بسته پشتیبانی به مربیان تخصصی تخصیص داده شده‌اند.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition"
                      title={allFilteredSelected ? "لغو انتخاب همه" : "انتخاب همه"}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4 text-start">نام داوطلب</th>
                  <th className="py-3.5 px-4 text-start">شماره تماس و کد ملی</th>
                  <th className="py-3.5 px-4 text-start">دوره ثبت‌نامی</th>
                  <th className="py-3.5 px-4 text-start">منبع ثبت‌نام</th>
                  <th className="py-3.5 px-4 text-start">تاریخ ورود</th>
                  <th className="py-3.5 px-4 text-start min-w-[280px]">تعیین پشتیبان اختصاصی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredStudents.map((student) => {
                  const isSelected = selectedIds.includes(student.profileId);
                  const isAssigning = !!actionLoadingMap[student.profileId];
                  const currentSelectedMentor = rowMentorMap[student.profileId] || mentors[0]?.id || "";
                  const sourceBadge = formatSourceBadge(student.provisioningSource);

                  return (
                    <tr
                      key={student.profileId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-blue-50/40 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectRow(student.profileId)}
                          className="text-slate-400 hover:text-blue-600 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {student.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {student.profileId}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{toPersianDigits(student.phoneNumber)}</span>
                        </div>
                        {student.nationalId && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                            <CreditCard className="w-3 h-3 text-slate-400" />
                            <span>کد ملی: {toPersianDigits(student.nationalId)}</span>
                          </div>
                        )}
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {student.enrolledCourseName || "دوره جامع وکالت ۳۶۰"}
                          </span>
                        </div>
                        {student.enrolledCourseCode && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 ps-5">
                            {student.enrolledCourseCode}
                          </div>
                        )}
                      </td>

                      {/* Source */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[11px] font-semibold rounded-lg border ${sourceBadge.color}`}
                        >
                          {sourceBadge.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {toJalaliString(student.createdAt)}
                      </td>

                      {/* Assign Action */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={currentSelectedMentor}
                            onChange={(e) =>
                              setRowMentorMap((prev) => ({
                                ...prev,
                                [student.profileId]: e.target.value,
                              }))
                            }
                            disabled={isAssigning}
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          >
                            {mentors.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.fullName} ({toPersianDigits(m.studentCount)} داوطلب)
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleSingleAssign(student.profileId)}
                            disabled={isAssigning || !mentors.length}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                          >
                            {isAssigning ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>تخصیص</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Mentors Status Cards */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>وضعیت ظرفیت و بار کاری پشتیبانان فعال آزمون وکالت</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mentors.map((m) => {
            const loadPercentage = Math.min(100, Math.round((m.studentCount / 40) * 100));
            const isHighLoad = m.studentCount >= 30;

            return (
              <div
                key={m.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{m.fullName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isHighLoad
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      }`}
                    >
                      {isHighLoad ? "نزدیک سقف" : "ظرفیت مطلوب"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mb-3">
                    {toPersianDigits(m.phoneNumber)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span>داوطلبان تحت هدایت:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-200">
                      {toPersianDigits(m.studentCount)} داوطلب
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHighLoad ? "bg-amber-500" : "bg-blue-600"
                      }`}
                      style={{ width: `${loadPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
