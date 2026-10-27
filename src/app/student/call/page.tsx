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
  ArrowRight,
  Server,
  PhoneForwarded,
  Sparkles,
  Lock,
  Volume2,
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

export default function StudentCallPage() {
  const [status, setStatus] = useState<CallingStatusState | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Idle, 1: Request, 2: PBX Dialing, 3: Bridging
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
      console.warn("[StudentCallPage] Error fetching mentor window status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInitiateCall = async () => {
    if (isCalling) return;
    setIsCalling(true);
    setCallResult(null);
    setActiveStep(1);

    try {
      // Simulate/Show step 1
      await new Promise((resolve) => setTimeout(resolve, 800));
      setActiveStep(2);

      const res = await requestStudentToMentorCallAction();
      setCallResult(res);

      if (res.success) {
        setActiveStep(3);
        setTimeout(() => {
          fetchStatus();
        }, 5000);
      } else {
        setActiveStep(0);
      }
    } catch {
      setActiveStep(0);
      setCallResult({
        success: false,
        message: "خطا در برقراری ارتباط با مرکز تماس هوشمند مشاهیر دانش. لطفاً دقایقی دیگر مجدداً تلاش فرمایید.",
      });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/student/dashboard" className="hover:text-primary transition-colors">
              پیشخوان داوطلب
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">تماس هوشمند با پشتیبان علمی</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-[#004071]" />
            <span>سامانه تماس امن و معکوس با پشتیبان</span>
          </h1>
        </div>

        <Link href="/student/dashboard">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowRight className="w-3.5 h-3.5 ms-1.5" />
            <span>بازگشت به پیشخوان</span>
          </Button>
        </Link>
      </div>

      {/* Mentor Info & Availability Hero Card */}
      <Card className="border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-linear-to-l from-[#004071] to-[#002847] text-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-300">
                {status?.mentorName && status.mentorName !== "در انتظار تخصیص پشتیبان"
                  ? "پشتیبان اختصاصی و مشاور تحصیلی شما"
                  : "وضعیت تخصیص پشتیبان"}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>
                  {status?.mentorName && status.mentorName !== "در انتظار تخصیص پشتیبان"
                    ? `پشتیبان اختصاصی شما: ${status.mentorName}`
                    : "در انتظار تخصیص پشتیبان"}
                </span>
                <Badge
                  variant={status?.isOpen ? "green" : "outline"}
                  className="text-xs px-2.5 py-0.5 border-white/20 bg-white/10 text-white font-medium"
                >
                  {status?.isOpen ? "هم‌اکنون آنلاین و آماده مکالمه" : "خارج از بازه پاسخگویی"}
                </Badge>
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-xs border border-white/15">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <div className="text-xs">
                <span className="text-slate-300 block text-[10px]">
                  {status?.scheduleDescription && status.scheduleDescription !== "در انتظار تخصیص پشتیبان"
                    ? "روزها و ساعات پاسخگویی تلفنی پشتیبان:"
                    : "وضعیت پاسخگویی تلفنی:"}
                </span>
                <span className="font-semibold text-white font-mono text-[11px] leading-relaxed">
                  {status?.scheduleDescription && status.scheduleDescription !== "در انتظار تخصیص پشتیبان"
                    ? toPersianDigits(status.scheduleDescription)
                    : "در انتظار تخصیص پشتیبان"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* 3-Step Live Interactive Diagram */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#004071]" />
              <span>مراحل برقراری تماس هوشمند دوطرفه (معماری امن PBX مشاهیر دانش)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              {/* Step 1 */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  activeStep === 1
                    ? "bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/30"
                    : activeStep > 1
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeStep > 1
                        ? "bg-emerald-500 text-white"
                        : activeStep === 1
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {activeStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : "۱"}
                  </div>
                  <span className="text-xs font-bold text-foreground">گام اول: ثبت درخواست</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  بررسی بازه مجاز روزانه پشتیبان و ارسال درخواست امن شما به مرکز تماس ابری.
                </p>
              </div>

              {/* Step 2 */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  activeStep === 2
                    ? "bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/30"
                    : activeStep > 2
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeStep > 2
                        ? "bg-emerald-500 text-white"
                        : activeStep === 2
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {activeStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : "۲"}
                  </div>
                  <span className="text-xs font-bold text-foreground">گام دوم: تماس با پشتیبان</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  مرکز تلفن ابری ابتدا به صورت خودکار با داخلی زویپر پشتیبان شما تماس می‌گیرد.
                </p>
              </div>

              {/* Step 3 */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 ${
                  activeStep === 3
                    ? "bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/30"
                    : "bg-muted/30 border-border"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      activeStep === 3
                        ? "bg-emerald-500 text-white animate-bounce"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {activeStep === 3 ? <Volume2 className="w-4 h-4" /> : "۳"}
                  </div>
                  <span className="text-xs font-bold text-foreground">گام سوم: اتصال دوطرفه</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  به محض برداشتن گوشی توسط پشتیبان، گوشی شما زنگ خورده و پل ارتباطی برقرار می‌شود.
                </p>
              </div>
            </div>
          </div>

          {/* Call Result Alert */}
          {callResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                callResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
              }`}
            >
              {callResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold block">
                  {callResult.success ? "درخواست با موفقیت ثبت شد" : "عدم امکان برقراری تماس"}
                </span>
                <span>{callResult.message}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-muted/20">
            <div className="space-y-1 text-center sm:text-start">
              <span className="text-xs font-bold text-foreground block">
                برقراری تماس مستقیم با پشتیبان
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {status?.isOpen
                  ? "پشتیبان شما هم‌اکنون آنلاین و آماده پاسخگویی به سؤالات تحصیلی شماست."
                  : "در حال حاضر خارج از ساعات کاری پشتیبان هستید. تماس در ساعت مقرر فعال خواهد شد."}
              </span>
            </div>

            <Button
              onClick={handleInitiateCall}
              disabled={!status?.isOpen || isCalling}
              className={`text-xs px-6 py-2.5 font-bold rounded-xl transition-all shadow-md shrink-0 ${
                status?.isOpen
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {isCalling ? (
                <>
                  <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                  <span>در حال شماره‌گیری و ارتباط...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 ms-2" />
                  <span>تماس تلفنی با پشتیبان</span>
                </>
              )}
            </Button>
          </div>

          {/* Privacy & Security Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-border bg-card flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground text-[11px] block">
                  محرمانگی ۱۰۰٪ شماره تماس
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed block">
                  شماره همراه شما برای پشتیبان و شماره پشتیبان برای شما نمایش داده نمی‌شود و کالرآیدی سرشماره سازمانی مشاهیر دانش ارسال می‌گردد.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card flex items-start gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#004071] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-foreground text-[11px] block">
                  نظارت کیفی سرپرستی
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed block">
                  کلیه تماس‌ها به منظور تضمین کیفیت مشاوره و استانداردهای آموزشی کانون وکلا تحت نظارت سوپروایزر ثبت و پایش می‌شوند.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
