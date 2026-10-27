"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Clock,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Check,
  PhoneCall,
  Video,
  User,
  Sparkles,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { ResolveDialog } from "@/components/mentor/resolve-dialog";
import { originateMentorCallAction } from "@/server/actions/voip";
import { launchInstantTriageRoomAction } from "@/server/actions/video";
import type { TriageCaseRecord } from "@/types/models";

interface MentorTriageClientProps {
  initialCases: TriageCaseRecord[];
  studentNames: Record<string, string>;
}

export function MentorTriageClient({
  initialCases,
  studentNames,
}: MentorTriageClientProps) {
  const [selectedTier, setSelectedTier] = useState<number | "ALL">("ALL");
  const [tab, setTab] = useState<"ACTIVE" | "RESOLVED">("ACTIVE");
  const [callingStudentId, setCallingStudentId] = useState<string | null>(null);
  const [videoLaunchingId, setVideoLaunchingId] = useState<string | null>(null);
  const [voipNotice, setVoipNotice] = useState<{ id: string; message: string; success: boolean } | null>(null);
  const [activeResolveCase, setActiveResolveCase] = useState<{
    id: string;
    triggerCode: string;
    studentName: string;
  } | null>(null);

  const handleCallStudent = async (studentProfileId: string, studentName: string) => {
    setCallingStudentId(studentProfileId);
    setVoipNotice(null);
    try {
      const res = await originateMentorCallAction({
        studentProfileId,
        notes: `تماس پایش و هدایت تحصیلی فوری با ${studentName}`,
      });
      setVoipNotice({ id: studentProfileId, message: res.message, success: res.success });
    } catch {
      setVoipNotice({
        id: studentProfileId,
        message: "خطا در برقراری ارتباط با وب‌سرویس ایزابل استریسک.",
        success: false,
      });
    } finally {
      setCallingStudentId(null);
    }
  };

  const handleLaunchVideo = async (studentProfileId: string, studentName: string) => {
    setVideoLaunchingId(studentProfileId);
    try {
      const res = await launchInstantTriageRoomAction(studentProfileId, studentName);
      if (res.success && res.joinUrl) {
        window.open(res.joinUrl, "_blank");
      }
    } catch {
      alert("خطا در ایجاد اتاق وبینار و مشاوره تصویری فوری.");
    } finally {
      setVideoLaunchingId(null);
    }
  };

  // Filter cases
  const filteredCases = initialCases.filter((c) => {
    const matchStatus = tab === "ACTIVE" ? !c.isResolved : c.isResolved;
    const matchTier = selectedTier === "ALL" ? true : c.priorityTier === selectedTier;
    return matchStatus && matchTier;
  });

  const getSlaChip = (slaDueAt: Date, isResolved: boolean) => {
    if (isResolved) {
      return (
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-3 py-1 text-xs font-bold flex items-center space-x-1.5 space-x-reverse">
          <Check className="h-3.5 w-3.5" />
          <span>رسیدگی شده در موعد مقرر</span>
        </span>
      );
    }

    const now = Date.now();
    const diffHours = Math.round((new Date(slaDueAt).getTime() - now) / 3600000);

    if (diffHours < 0) {
      return (
        <span className="rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-3 py-1 text-xs font-bold border border-rose-200 dark:border-rose-500/30 flex items-center space-x-1.5 space-x-reverse">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>منقضی شده ({toPersianDigits(Math.abs(diffHours))} ساعت تاخیر)</span>
        </span>
      );
    }

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-bold border flex items-center space-x-1.5 space-x-reverse persian-nums ${
          diffHours <= 4
            ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 animate-pulse"
            : diffHours <= 12
            ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
            : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20"
        }`}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>{toPersianDigits(diffHours)} ساعت تا اتمام مهلت پاسخگویی</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* 5. UNIFIED FILTER BAR */}
      <div className="bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
        {/* Right (Start in RTL): Segmented pill toggle inside soft track */}
        <div className="bg-slate-100 dark:bg-slate-900/90 p-1 rounded-full flex items-center space-x-1 space-x-reverse">
          <button
            type="button"
            onClick={() => setTab("ACTIVE")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              tab === "ACTIVE"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            پرونده‌های فعال و بحرانی
          </button>
          <button
            type="button"
            onClick={() => setTab("RESOLVED")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              tab === "RESOLVED"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            بایگانی مختومه شده
          </button>
        </div>

        {/* Left (End in RTL): Priority Filter Chips */}
        <div className="flex items-center space-x-1.5 space-x-reverse text-xs flex-wrap">
          <span className="text-slate-500 dark:text-slate-400 text-xs font-bold ms-1">
            فیلتر اولویت:
          </span>
          {(["ALL", 1, 2, 3, 4, 5, 6] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`rounded-full px-3 py-1 text-xs transition-all ${
                selectedTier === tier
                  ? "bg-slate-800 dark:bg-indigo-600 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
              }`}
            >
              {tier === "ALL" ? "همه" : `P${toPersianDigits(tier)}`}
            </button>
          ))}
        </div>
      </div>

      {/* 5. CASE / CANDIDATE ACTION CARDS LIST */}
      <div className="space-y-4">
        {filteredCases.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#131B2E] rounded-2xl border border-slate-200/80 dark:border-slate-800/90 space-y-3 shadow-xs">
            <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              صف رفع مشکلات علمی خالی است!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              هیچ داوطلبی در این سطح اولویت دارای هشدار فعال و حل‌نشده نیست و کلیه داوطلبان در روند پایدار قرار دارند.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const studentName = studentNames[c.studentProfileId] || "داوطلب آزمون";

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800/90 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] transition-all space-y-4"
              >
                {/* Top Row: Name, Role Pill, Priority Badge, SLA Chip */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 space-x-reverse flex-wrap">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                      <User className="h-5 w-5" />
                    </div>
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">
                      {studentName}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium border border-slate-200/60 dark:border-slate-700/60">
                      داوطلب آزمون وکالت
                    </span>
                    <span
                      className={`text-xs px-3 py-0.5 rounded-full font-bold border ${
                        c.priorityTier <= 2
                          ? "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30"
                          : c.priorityTier <= 4
                          ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30"
                      }`}
                    >
                      اولویت {toPersianDigits(c.priorityTier)} ({c.triggerCode})
                    </span>
                  </div>

                  <div>{getSlaChip(c.slaDueAt, c.isResolved)}</div>
                </div>

                {/* Middle Callout Box: Description */}
                <div className="bg-[#F1F4F9] text-slate-700 rounded-xl p-4 text-sm leading-relaxed dark:bg-[#2A242D]/90 dark:border dark:border-rose-300/20 dark:text-slate-200">
                  <p>{c.description}</p>

                  {/* Intervention Notes if present */}
                  {c.interventionNotes && (
                    <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border dark:border-emerald-800/40 dark:text-emerald-300 rounded-xl p-3 text-xs mt-3 flex items-start gap-2">
                      <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div>
                        <span className="font-bold">شرح اقدام مداخله‌ای پشتیبان: </span>
                        <span>{c.interventionNotes}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* VoIP feedback alert */}
                {voipNotice && voipNotice.id === c.studentProfileId && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
                      voipNotice.success
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/40 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/40 dark:text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <PhoneCall className="h-4 w-4 shrink-0" />
                      <span>{voipNotice.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVoipNotice(null)}
                      className="text-xs font-bold px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Bottom Action Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  {/* Right (Start in RTL): Resolve Button */}
                  <div>
                    {!c.isResolved && (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveResolveCase({
                            id: c.id,
                            triggerCode: c.triggerCode,
                            studentName,
                          })
                        }
                        className="bg-[#109868] hover:bg-[#0E8359] text-white rounded-xl px-5 py-2.5 text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        <span>✓ مختومه کردن</span>
                      </button>
                    )}
                  </div>

                  {/* Left (End in RTL): Secondary & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!c.isResolved && (
                      <>
                        {/* Instant 1-on-1 Video Room */}
                        <button
                          type="button"
                          onClick={() => handleLaunchVideo(c.studentProfileId, studentName)}
                          disabled={videoLaunchingId === c.studentProfileId}
                          className="border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-900/40 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="راه‌اندازی فوری اتاق ویدئوکنفرانس اختصاصی مشاهیر دانش"
                        >
                          <Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <span>
                            {videoLaunchingId === c.studentProfileId
                              ? "ایجاد اتاق..."
                              : "مشاوره تصویری فوری"}
                          </span>
                        </button>

                        {/* Zoiper / Issabel AMI Secure Call */}
                        <button
                          type="button"
                          onClick={() => handleCallStudent(c.studentProfileId, studentName)}
                          disabled={callingStudentId === c.studentProfileId}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="تماس امن با زویپر (شماره داوطلب ماسک شده)"
                        >
                          <PhoneCall className="h-4 w-4" />
                          <span>
                            {callingStudentId === c.studentProfileId
                              ? "در حال اتصال به AMI..."
                              : "تماس امن Zoiper"}
                          </span>
                        </button>
                      </>
                    )}

                    {/* Student 360 File */}
                    <Link
                      href={`/mentor/student/${c.studentProfileId}`}
                      className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>پرونده ۳۶۰°</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resolve Dialog */}
      {activeResolveCase && (
        <ResolveDialog
          isOpen={true}
          onClose={() => setActiveResolveCase(null)}
          caseId={activeResolveCase.id}
          triggerCode={activeResolveCase.triggerCode}
          candidateName={activeResolveCase.studentName}
        />
      )}
    </div>
  );
}
