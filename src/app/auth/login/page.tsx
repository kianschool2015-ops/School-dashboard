"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  Smartphone,
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  requestOtpAction,
  verifyOtpAction,
  loginWithPasswordAction,
} from "@/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"PASSWORD" | "OTP">("PASSWORD");

  // OTP State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"PHONE" | "OTP">("PHONE");

  // Password State (Production Ready: completely clean initial state)
  const [passwordIdentifier, setPasswordIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    startTransition(async () => {
      try {
        const res = await requestOtpAction(phoneNumber);
        if (res.success) {
          setStatusMessage(res.message || "کد تایید پیامک شد.");
          setOtpStep("OTP");
        } else {
          setErrorMessage(res.message || "خطا در ارسال کد تایید.");
        }
      } catch (err) {
        setErrorMessage("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    startTransition(async () => {
      try {
        const res = await verifyOtpAction(phoneNumber, otpCode);
        if (res.success && res.redirectUrl) {
          router.push(res.redirectUrl);
          router.refresh();
        } else {
          setErrorMessage(res.message || "کد تایید نادرست است.");
        }
      } catch (err) {
        setErrorMessage("خطا در اعتبارسنجی کد تایید. لطفاً مجدداً تلاش فرمایید.");
      }
    });
  };

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    startTransition(async () => {
      try {
        const res = await loginWithPasswordAction(passwordIdentifier, password);
        if (res.success && res.redirectUrl) {
          router.push(res.redirectUrl);
          router.refresh();
        } else {
          setErrorMessage(res.message || "نام کاربری/شماره موبایل یا رمز عبور نادرست است.");
        }
      } catch (err) {
        setErrorMessage("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");
      }
    });
  };

  const fillTestCredentials = (identifier: string, pwd: string) => {
    setAuthMode("PASSWORD");
    setPasswordIdentifier(identifier);
    setPassword(pwd);
    setErrorMessage("");
    setStatusMessage("");
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004071] text-white shadow-xl shadow-[#004071]/25">
            <Scale className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            پشتیبانی مشاهیر دانش
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-light">
            سامانه رسمی هدایت تحصیلی و مربیگری نخبگان آزمون وکالت
          </p>
        </div>

        {/* Main Login Card */}
        <Card className="border-border bg-card shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("PASSWORD");
                  setErrorMessage("");
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "PASSWORD"
                    ? "bg-[#004071] text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-4 w-4" />
                ورود با کلمه عبور
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("OTP");
                  setErrorMessage("");
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "OTP"
                    ? "bg-[#004071] text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                رمز یکبار مصرف (SMS)
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-6 px-6">
            {/* Password Flow (Default and Primary) */}
            {authMode === "PASSWORD" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    نام کاربری یا شماره همراه:
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute end-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      dir="ltr"
                      value={passwordIdentifier}
                      onChange={(e) => setPasswordIdentifier(e.target.value)}
                      placeholder="شناسه کاربری یا شماره تماس"
                      className="w-full rounded-xl border border-input bg-background/50 h-11 pe-10 ps-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    کلمه عبور:
                  </label>
                  <div className="relative">
                    <Lock className="absolute end-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-input bg-background/50 h-11 pe-10 ps-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all"
                      required
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20"
                >
                  {isPending ? "در حال احراز هویت..." : "ورود به سامانه"}
                </Button>
              </form>
            )}

            {/* OTP Flow */}
            {authMode === "OTP" && (
              <>
                {otpStep === "PHONE" ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">
                        شماره تلفن همراه داوطلب یا پرسنل:
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute end-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="tel"
                          dir="ltr"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="0912..."
                          className="w-full rounded-xl border border-input bg-background/50 h-11 pe-10 ps-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all"
                          required
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20"
                    >
                      {isPending ? "در حال ارسال پیامک..." : "دریافت کد تایید یکبار مصرف"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-foreground block">
                          کد ۵ رقمی ارسال شده:
                        </label>
                        <button
                          type="button"
                          onClick={() => setOtpStep("PHONE")}
                          className="text-[11px] text-[#004071] dark:text-sky-400 hover:underline font-medium"
                        >
                          تغییر شماره
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute end-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={5}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="•••••"
                          className="w-full text-center tracking-[0.5em] text-lg font-bold rounded-xl border border-input bg-background/50 h-11 pe-10 ps-3.5 text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all"
                          required
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}
                    {statusMessage && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{statusMessage}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20"
                    >
                      {isPending ? "در حال اعتبارسنجی..." : "تایید و ورود به سامانه"}
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* Quick-Fill Demo Roles for Testing */}
            <div className="mt-5 pt-4 border-t border-border space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground text-center">
                حساب‌های سازمانی پیش‌فرض (انتخاب سریع جهت تست):
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => fillTestCredentials("admin", "Admin@123456")}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-all flex items-center justify-between hover:border-[#004071]/40"
                >
                  <span>مدیرعامل / ادمین</span>
                  <span className="text-[10px] text-muted-foreground font-mono">admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCredentials("supervisor", "Supervisor@123456")}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-all flex items-center justify-between hover:border-[#004071]/40"
                >
                  <span>سرپرست کوهورت</span>
                  <span className="text-[10px] text-muted-foreground font-mono">supervisor</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCredentials("mentor", "Mentor@123456")}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-all flex items-center justify-between hover:border-[#004071]/40"
                >
                  <span>پشتیبان علمی</span>
                  <span className="text-[10px] text-muted-foreground font-mono">mentor</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillTestCredentials("student", "Student@123456")}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-all flex items-center justify-between hover:border-[#004071]/40"
                >
                  <span>داوطلب وکالت</span>
                  <span className="text-[10px] text-muted-foreground font-mono">student</span>
                </button>
              </div>
            </div>

            {/* Whitelist Policy Notice */}
            <div className="mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed text-center">
              ورود داوطلبان جدید بر اساس فهرست رسمی پذیرش مؤسسه مشاهیر دانش انجام می‌پذیرد.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
