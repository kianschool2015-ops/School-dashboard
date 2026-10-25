"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Headphones,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getMentorCallingStatusAction,
  requestStudentToMentorCallAction,
} from "@/server/actions/voip";

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
        message: "خطا در برقراری ارتباط با سانترال تلفنی ایزابل / AMI.",
      });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-[#004071] text-white flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                تماس تلفنی با پشتیبان اختصاصی
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                پشتیبان شما:{" "}
                <span className="font-semibold text-foreground">
                  {status?.mentorName || "پشتیبان آموزشی"}
                </span>
              </p>
            </div>
          </div>

          <Badge variant={status?.isOpen ? "green" : "outline"} className="text-[10px] px-2.5 py-0.5">
            {status?.isOpen ? "هم‌اکنون در ساعت پاسخگویی" : "خارج از ساعت پاسخگویی"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5">
        {/* Availability Schedule Notice */}
        <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
          <Clock className="w-4 h-4 text-[#004071] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-foreground block">
              ساعات پاسخگویی تلفنی پشتیبان:
            </span>
            <span>
              {status?.scheduleDescription || "در حال دریافت ساعات کاری پشتیبان..."}
            </span>
          </div>
        </div>

        {/* Call Flow Explanation & Privacy Guarantee */}
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            سیستم امن AMI: ابتدا زویپر پشتیبان زنگ می‌خورد و پس از پاسخ، تلفن شما وصل می‌شود. شماره تماس‌ها کاملاً محرمانه است.
          </span>
        </div>

        {/* Feedback Message */}
        {callResult && (
          <div
            className={`rounded-xl p-3 text-xs flex items-start gap-2 border ${
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
                  تماس با شماره ماسک‌شده شما: {callResult.maskedStudentPhone}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div>
          {status?.isOpen ? (
            <Button
              onClick={handleInitiateCall}
              disabled={isCalling}
              className="w-full h-11 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
            >
              {isCalling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ارسال دستور تماس امن به سانترال AMI...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 animate-pulse" />
                  <span>برقراری تماس صوتی با پشتیبان آموزشی</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="w-full h-11 text-xs font-semibold text-muted-foreground bg-muted/30 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>
                {status?.message || "تماس با پشتیبان فقط در بازه کاری تعیین‌شده امکان‌پذیر است"}
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
