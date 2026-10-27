"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Headphones,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getMentorCallingStatusAction,
  requestStudentToMentorCallAction,
} from "@/server/actions/voip";
import { toPersianDigits } from "@/lib/jalali";

interface CallingStatusState {
  isOpen: boolean;
  message: string;
  scheduleDescription: string;
  mentorName: string;
  mentorId?: string;
}

export function StudentCallCoachWidget() {
  const [status, setStatus] = useState<CallingStatusState | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callResult, setCallResult] = useState<{
    success: boolean;
    message: string;
    maskedStudentPhone?: string;
  } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await getMentorCallingStatusAction();
      setStatus(res);
    } catch (err) {
      console.warn("[CallCoachWidget] Error fetching mentor window status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll window status every 60 seconds to update button when office hours arrive
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleInitiateCall = async () => {
    if (isCalling) return;
    setIsCalling(true);
    setCallResult(null);

    try {
      const res = await requestStudentToMentorCallAction();
      setCallResult(res);
      if (res.success) {
        setTimeout(() => {
          fetchStatus();
        }, 5000);
      }
    } catch {
      setCallResult({
        success: false,
        message: "خطا در برقراری ارتباط با مرکز تماس هوشمند. لطفاً دقایقی دیگر مجدداً تلاش فرمایید.",
      });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <div>
        <CardHeader className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 space-x-reverse min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#004071] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Headphones className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs sm:text-sm font-bold text-foreground truncate">
                  تماس با پشتیبان آموزشی
                </CardTitle>
                <p className="text-[11px] text-muted-foreground truncate">
                  پشتیبان:{" "}
                  <span className="font-semibold text-foreground">
                    {status?.mentorName || "در حال اتصال..."}
                  </span>
                </p>
              </div>
            </div>

            <Badge
              variant={status?.isOpen ? "green" : "outline"}
              className="text-[10px] px-2 py-0.5 shrink-0"
            >
              {status?.isOpen ? "در ساعت پاسخگویی" : "خارج از بازه پاسخگویی"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          {/* Availability Schedule Notice */}
          <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/80">
            <Clock className="w-4 h-4 text-[#004071] shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <span className="font-semibold text-foreground text-[11px] block">
                ساعات پاسخگویی تلفنی:
              </span>
              <span className="text-[11px] leading-relaxed block">
                {status?.scheduleDescription
                  ? toPersianDigits(status.scheduleDescription)
                  : "در حال دریافت ساعات کاری پشتیبان..."}
              </span>
            </div>
          </div>

          {/* Call Flow Explanation & Privacy Guarantee */}
          <div className="flex items-start gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed">
              تماس امن دوطرفه: سامانه ابتدا با پشتیبان تماس برقرار کرده و پس از پاسخگویی ایشان، با شما ارتباط برقرار می‌کند. شماره تماس طرفین کاملاً محرمانه باقی می‌ماند.
            </span>
          </div>

          {/* Feedback Message */}
          {callResult && (
            <div
              className={`rounded-xl p-2.5 text-xs flex items-start gap-2 border ${
                callResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {callResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-bold block">{callResult.message}</span>
                {callResult.maskedStudentPhone && (
                  <span className="text-[10px] opacity-80 block">
                    تماس با شماره ماسک‌شده شما: {toPersianDigits(callResult.maskedStudentPhone)}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </div>

      <div className="p-4 pt-0">
        {status?.isOpen ? (
          <Button
            onClick={handleInitiateCall}
            disabled={isCalling}
            className="w-full h-10 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            {isCalling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال برقراری ارتباط امن با پشتیبان...</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4 animate-pulse" />
                <span>تماس با پشتیبان</span>
              </>
            )}
          </Button>
        ) : (
          <Button
            disabled
            variant="outline"
            className="w-full h-10 text-xs font-medium text-muted-foreground bg-muted/30 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">
              {status?.message
                ? toPersianDigits(status.message)
                : "تماس با پشتیبان فقط در بازه کاری تعیین‌شده امکان‌پذیر است"}
            </span>
          </Button>
        )}

        <div className="mt-2 text-center">
          <Link
            href="/student/call"
            className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline font-medium transition-colors"
          >
            <span>مشاهده صفحه اختصاصی و دیاگرام زنده تماس</span>
            <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
