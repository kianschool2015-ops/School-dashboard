"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Zap,
  Sparkles,
  Check,
} from "lucide-react";
import { submitDailyCheckinAction } from "@/server/actions/student";
import type { ScheduleItemRecord } from "@/types/models";
import { toPersianDigits } from "@/lib/jalali";

interface DailyCheckinProps {
  isOpen: boolean;
  onClose: () => void;
  studentProfileId: string;
  items: ScheduleItemRecord[];
}

const COMMON_OBSTACLES = [
  "خستگی مفرط ناشی از اشتغال یا کارآموزی",
  "افت شدید تمرکز ذهنی و پراکندگی افکار",
  "سختی و پیچیدگی مفهومی مبحث درسی",
  "رویداد خانوادگی و امور غیرمترقبه",
  "کمبود زمان برای تست‌زنی",
  "اضطراب و استرس فرسایشی آزمون",
];

export function DailyCheckinDrawer({
  isOpen,
  onClose,
  studentProfileId,
  items,
}: DailyCheckinProps) {
  const [taskStates, setTaskStates] = useState<
    Record<string, "NOT_DONE" | "PARTIAL" | "DONE">
  >(() => {
    const initial: Record<string, "NOT_DONE" | "PARTIAL" | "DONE"> = {};
    items.forEach((item) => {
      initial[item.id] = item.status;
    });
    return initial;
  });

  const [selectedObstacle, setSelectedObstacle] = useState<string>("");
  const [helpRequested, setHelpRequested] = useState<boolean>(false);
  const [studentNotes, setStudentNotes] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [submitResult, setSubmitResult] = useState<{
    executionPercent: number;
    durationMs: number;
  } | null>(null);

  // Compute live execution % in sub-millisecond on the client
  const totalCount = items.length;
  let doneCount = 0;
  let partialCount = 0;
  Object.values(taskStates).forEach((st) => {
    if (st === "DONE") doneCount++;
    if (st === "PARTIAL") partialCount++;
  });
  const livePercent =
    totalCount > 0 ? Math.round(((doneCount + 0.5 * partialCount) / totalCount) * 100) : 0;

  const handleStatusChange = (
    itemId: string,
    status: "NOT_DONE" | "PARTIAL" | "DONE"
  ) => {
    setTaskStates((prev) => ({
      ...prev,
      [itemId]: status,
    }));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const payload = {
        studentProfileId,
        items: Object.entries(taskStates).map(([id, status]) => ({ id, status })),
        rootFailureCause: selectedObstacle || undefined,
        helpRequested,
        studentNotes: studentNotes.trim() || undefined,
      };

      const res = await submitDailyCheckinAction(payload);
      if (res.success) {
        setSubmitResult({
          executionPercent: res.executionPercent,
          durationMs: res.durationMs,
        });
        setTimeout(() => {
          onClose();
          setSubmitResult(null);
        }, 1200);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border bg-card p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Zap className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                ثبت سریع گزارش روزانه (چک‌این زیر ۶۰ ثانیه)
              </DialogTitle>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="text-xs text-muted-foreground">درصد تحقق برنامه:</span>
              <span
                className={`text-sm font-bold persian-nums ${
                  livePercent >= 70
                    ? "text-emerald-600 dark:text-emerald-400"
                    : livePercent >= 50
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                %{toPersianDigits(livePercent)}
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            وضعیت آیتم‌های مطالعاتی امروز را تنها با یک کلیک مشخص نمایید.
          </DialogDescription>
        </DialogHeader>

        {submitResult ? (
          <div className="my-8 flex flex-col items-center justify-center space-y-3 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-bounce">
              <Check className="h-7 w-7" />
            </div>
            <div className="text-base font-bold text-foreground">
              گزارش با موفقیت در {submitResult.durationMs} میلی‌ثانیه ثبت گردید!
            </div>
            <p className="text-xs text-muted-foreground">
              درصد تسلط امروز: %{toPersianDigits(submitResult.executionPercent)}
            </p>
          </div>
        ) : (
          <div className="space-y-5 my-2">
            {/* Task Item Toggles */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-foreground block">
                تکالیف و مباحث مطالعاتی امروز:
              </label>
              <div className="space-y-2">
                {items.map((item) => {
                  const currentStatus = taskStates[item.id] || "NOT_DONE";
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <span className="text-xs font-bold text-foreground">{item.subject}</span>
                          <span className="text-[10px] text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10">
                            {item.activityType === "STUDY"
                              ? "مطالعه مفهومی"
                              : item.activityType === "TEST_PRACTICE"
                              ? "تست‌زنی"
                              : item.activityType === "STATUTE_READ"
                              ? "نص‌خوانی قانون"
                              : "مرور"}
                          </span>
                          <span className="text-[11px] text-muted-foreground persian-nums">
                            ({toPersianDigits(item.targetDurationMinutes)} دقیقه)
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.topicDescription} - {toPersianDigits(item.targetVolume)}
                        </p>
                      </div>

                      {/* 3-State Toggle */}
                      <div className="flex items-center space-x-1 space-x-reverse self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "DONE")}
                          className={`flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            currentStatus === "DONE"
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>انجام شد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "PARTIAL")}
                          className={`flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            currentStatus === "PARTIAL"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>بخشی</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, "NOT_DONE")}
                          className={`flex items-center space-x-1 space-x-reverse px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            currentStatus === "NOT_DONE"
                              ? "bg-rose-500/80 text-white shadow-xs"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          <XCircle className="h-3 w-3" />
                          <span>نشد</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Obstacle Selector (Single Click) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                مهم‌ترین مانع پیشرفت یا تاخیر امروز (انتخاب تک‌کلیک):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_OBSTACLES.map((obstacle) => (
                  <button
                    key={obstacle}
                    type="button"
                    onClick={() =>
                      setSelectedObstacle((prev) => (prev === obstacle ? "" : obstacle))
                    }
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                      selectedObstacle === obstacle
                        ? "border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {obstacle}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgent Help Request Toggle (Triggers A01 with 12h SLA) */}
            <div
              onClick={() => setHelpRequested(!helpRequested)}
              className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                helpRequested
                  ? "border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-500/5"
                  : "border-border bg-muted/40 hover:bg-muted"
              }`}
            >
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    helpRequested
                      ? "bg-rose-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground flex items-center space-x-1.5 space-x-reverse">
                    <span>درخواست راهنمایی و تماس فوری پشتیبان (هشدار A01)</span>
                    {helpRequested && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-300 px-1.5 rounded">
                        مهلت رسیدگی ۱۲ ساعت
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    در صورت فعال‌سازی، پیام راهنمایی فوری با اولویت بالا مستقیماً به کارتابل پشتیبان شما ارسال می‌شود.
                  </p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  helpRequested
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "border-border bg-card"
                }`}
              >
                {helpRequested && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>

            {/* Optional Student Notes */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground block">
                توضیحات کوتاه یا سوال مشخص برای پشتیبان (اختیاری):
              </label>
              <input
                type="text"
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                placeholder="مثال: در تست‌های ارث نیاز به فرمول ساده‌تر دارم..."
                className="w-full text-xs rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder-muted-foreground/50 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 border-t border-border pt-3">
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-muted-foreground">
              میانگین زمان تکمیل: ۳۵ ثانیه
            </span>
            <div className="flex space-x-2 space-x-reverse">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
                انصراف
              </Button>
              <Button
                variant={helpRequested ? "rose" : "default"}
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || submitResult !== null}
                className="min-w-28"
              >
                {isPending ? "در حال ثبت..." : "تایید و ارسال نهایی"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
