"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Flame,
  Check,
  ShieldCheck,
  PhoneCall,
  Video,
} from "lucide-react";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";
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
        <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1 space-x-reverse">
          <Check className="h-3.5 w-3.5" />
          <span>رسیدگی شده در موعد SLA</span>
        </span>
      );
    }

    const now = Date.now();
    const diffHours = Math.round((new Date(slaDueAt).getTime() - now) / 3600000);

    if (diffHours < 0) {
      return (
        <span className="rounded-md bg-rose-500/20 text-rose-400 px-2 py-0.5 text-[11px] font-bold border border-rose-500/30 flex items-center space-x-1 space-x-reverse">
          <AlertTriangle className="h-3 w-3" />
          <span>منقضی شده ({toPersianDigits(Math.abs(diffHours))} ساعت تاخیر)</span>
        </span>
      );
    }

    return (
      <span
        className={`rounded-md px-2 py-0.5 text-[11px] font-bold border flex items-center space-x-1 space-x-reverse persian-nums ${
          diffHours <= 4
            ? "bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse"
            : diffHours <= 12
            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
            : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
        }`}
      >
        <Clock className="h-3 w-3" />
        <span>{toPersianDigits(diffHours)} ساعت تا اتمام مهلت SLA</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex items-center space-x-1.5 space-x-reverse">
          <button
            onClick={() => setTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === "ACTIVE"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            پرونده‌های فعال و بحرانی
          </button>
          <button
            onClick={() => setTab("RESOLVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === "RESOLVED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            بایگانی مختومه شده
          </button>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center space-x-1.5 space-x-reverse text-xs">
          <span className="text-muted-foreground text-[11px]">فیلتر اولویت:</span>
          {(["ALL", 1, 2, 3, 4, 5, 6] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                selectedTier === tier
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tier === "ALL" ? "همه" : `P${toPersianDigits(tier)}`}
            </button>
          ))}
        </div>
      </div>

      {/* Triage Cases List */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border space-y-2">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-foreground">صف رفع مشکلات علمی خالی است!</h3>
            <p className="text-xs text-muted-foreground">
              هیچ داوطلبی در این سطح اولویت دارای هشدار فعال و حل‌نشده نیست.
            </p>
          </div>
        ) : (
          filteredCases.map((c) => {
            const studentName = studentNames[c.studentProfileId] || "داوطلب آزمون";

            return (
              <Card
                key={c.id}
                className={`border p-4.5 transition-all ${
                  c.priorityTier === 1
                    ? "border-rose-500/50 bg-rose-500/5 shadow-md shadow-rose-500/5"
                    : c.priorityTier === 2
                    ? "border-rose-500/30 bg-rose-500/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          c.priorityTier <= 2
                            ? "red"
                            : c.priorityTier <= 4
                            ? "yellow"
                            : "tier"
                        }
                      >
                        اولویت {toPersianDigits(c.priorityTier)} ({c.triggerCode})
                      </Badge>
                      <span className="font-bold text-sm text-foreground">{studentName}</span>
                      {getSlaChip(c.slaDueAt, c.isResolved)}
                    </div>
                    <p className="text-xs text-muted-foreground/90">{c.description}</p>
                    {c.interventionNotes && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20">
                        شرح اقدام مداخله‌ای پشتیبان: {c.interventionNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 self-end md:self-center">
                    {!c.isResolved && (
                      <>
                        {/* Zoiper / Issabel AMI Secure Call */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCallStudent(c.studentProfileId, studentName)}
                          disabled={callingStudentId === c.studentProfileId}
                          className="text-xs flex items-center space-x-1 space-x-reverse bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                          title="تماس امن با زویپر (شماره داوطلب ماسک شده)"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          <span>
                            {callingStudentId === c.studentProfileId ? "در حال اتصال به AMI..." : "تماس امن Zoiper"}
                          </span>
                        </Button>

                        {/* Instant 1-on-1 Video Room */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLaunchVideo(c.studentProfileId, studentName)}
                          disabled={videoLaunchingId === c.studentProfileId}
                          className="text-xs flex items-center space-x-1 space-x-reverse border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                          title="راه‌اندازی فوری اتاق ویدئوکنفرانس اختصاصی مشاهیر دانش"
                        >
                          <Video className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          <span>
                            {videoLaunchingId === c.studentProfileId ? "ایجاد اتاق..." : "مشاوره تصویری فوری"}
                          </span>
                        </Button>
                      </>
                    )}

                    <Link href={`/mentor/student/${c.studentProfileId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex items-center space-x-1 space-x-reverse border-border hover:bg-muted text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>پرونده ۳۶۰°</span>
                      </Button>
                    </Link>

                    {!c.isResolved && (
                      <Button
                        variant="emerald"
                        size="sm"
                        onClick={() =>
                          setActiveResolveCase({
                            id: c.id,
                            triggerCode: c.triggerCode,
                            studentName,
                          })
                        }
                        className="text-xs flex items-center space-x-1 space-x-reverse"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>مختومه کردن</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* VoIP feedback alert */}
                {voipNotice && voipNotice.id === c.studentProfileId && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-between border ${
                      voipNotice.success
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5 shrink-0" />
                      <span>{voipNotice.message}</span>
                    </div>
                    <button
                      onClick={() => setVoipNotice(null)}
                      className="text-[10px] text-muted-foreground hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                )}
              </Card>
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
