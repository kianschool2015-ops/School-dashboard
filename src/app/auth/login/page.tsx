"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Scale,
  Smartphone,
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserPlus,
  ShieldCheck,
  User,
  Info,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  requestOtpAction,
  verifyOtpAction,
  loginWithPasswordAction,
  registerWhitelistedStudentAction,
} from "@/server/actions/auth";
import {
  sendSsoOtpAction,
  verifySsoOtpAction,
  loginWithGarnetSsoAction,
} from "@/server/actions/garnet";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Primary Two-Choice UX: "PASSWORD" or "OTP" (plus "REGISTER" for whitelisted manual onboarding)
  const [authMode, setAuthMode] = useState<"PASSWORD" | "OTP" | "REGISTER">("PASSWORD");

  // Choice 1: Password State
  const [passwordIdentifier, setPasswordIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Choice 2: SMS OTP State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"PHONE" | "OTP">("PHONE");

  // Whitelisted Student Direct Registration State
  const [regPhone, setRegPhone] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check URL query parameters for SSO token or redirect messages
  useEffect(() => {
    const ssoToken = searchParams.get("token") || searchParams.get("jwt");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setErrorMessage(decodeURIComponent(errorParam));
    }

    if (ssoToken) {
      setIsLoading(true);
      setStatusMessage("در حال اعتبارسنجی ورود یکپارچه از حساب کاربری مشاهیر دانش...");
      loginWithGarnetSsoAction(ssoToken)
        .then((res) => {
          if (res.success && res.redirectUrl) {
            setStatusMessage("ورود با موفقیت انجام شد. در حال انتقال به داشبورد...");
            window.location.href = res.redirectUrl;
          } else if (res.notEntitled && res.redirectUrl) {
            window.location.href = res.redirectUrl;
          } else {
            setErrorMessage(res.message || "خطا در احراز هویت با حساب کاربری مشاهیر دانش.");
            setIsLoading(false);
          }
        })
        .catch(() => {
          setErrorMessage("خطا در برقراری ارتباط با وب‌سرویس مشاهیر دانش.");
          setIsLoading(false);
        });
    }
  }, [searchParams]);

  // Choice 1: Password Login Waterfall (Local-First <15ms + External Central API Onboarding)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsLoading(true);

    try {
      const res = await loginWithPasswordAction(passwordIdentifier, password);
      if (res.success && res.redirectUrl) {
        setStatusMessage(res.message || "احراز هویت موفقیت‌آمیز بود. در حال انتقال به سامانه...");
        window.location.href = res.redirectUrl;
      } else if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        setErrorMessage(res.message || "نام کاربری/شماره موبایل یا رمز عبور نادرست است.");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      console.error("[Login] Auth error:", err);
      setErrorMessage("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");
      setIsLoading(false);
    }
  };

  // Choice 2 Stage 1: Request SMS OTP via Central API
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsLoading(true);

    try {
      const ssoRes = await sendSsoOtpAction(phoneNumber);
      if (ssoRes.success) {
        setStatusMessage(ssoRes.message || "کد تایید پیامکی ارسال شد.");
        setOtpStep("OTP");
      } else {
        // Fallback to internal OTP service if central service returned specific error
        const internalRes = await requestOtpAction(phoneNumber);
        if (internalRes.success) {
          setStatusMessage(internalRes.message || "کد تایید پیامکی ارسال شد.");
          setOtpStep("OTP");
        } else {
          setErrorMessage(ssoRes.message || internalRes.message || "خطا در ارسال پیامک کد تایید.");
        }
      }
    } catch {
      setErrorMessage("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");
    } finally {
      setIsLoading(false);
    }
  };

  // Choice 2 Stage 2 & 3: Check SMS OTP & Local-First Provisioning
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsLoading(true);

    try {
      const ssoRes = await verifySsoOtpAction(phoneNumber, otpCode);
      if (ssoRes.success && ssoRes.redirectUrl) {
        setStatusMessage("احراز هویت با موفقیت انجام شد. در حال انتقال به داشبورد...");
        window.location.href = ssoRes.redirectUrl;
        return;
      } else if (ssoRes.notEntitled && ssoRes.redirectUrl) {
        window.location.href = ssoRes.redirectUrl;
        return;
      }

      // Fallback check against internal OTP
      const internalRes = await verifyOtpAction(phoneNumber, otpCode);
      if (internalRes.success && internalRes.redirectUrl) {
        setStatusMessage("ورود موفقیت‌آمیز بود. در حال انتقال به سامانه...");
        window.location.href = internalRes.redirectUrl;
      } else {
        setErrorMessage(ssoRes.message || internalRes.message || "کد تایید وارد شده نادرست است.");
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("خطا در اعتبارسنجی کد تایید. لطفاً مجدداً تلاش فرمایید.");
      setIsLoading(false);
    }
  };

  // Whitelisted Student Direct Registration Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (regPassword.length < 6) {
      setErrorMessage("کلمه عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("کلمه عبور با تکرار آن مطابقت ندارد.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerWhitelistedStudentAction({
        phoneNumber: regPhone,
        nationalId: regNationalId,
        fullName: regFullName,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      if (res.success && res.redirectUrl) {
        setStatusMessage(res.message || "ثبت‌نام با موفقیت انجام شد. در حال انتقال به داشبورد...");
        window.location.href = res.redirectUrl;
      } else {
        setErrorMessage(res.message || "خطا در ثبت‌نام داوطلب.");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      console.error("[Register] Error:", err);
      setErrorMessage("خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش فرمایید.");
      setIsLoading(false);
    }
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
            سامانه جامع هدایت تحصیلی و مشاوره‌ای داوطلبان آزمون وکالت
          </p>
        </div>

        {/* Candidate Guidance Callout Box (Module 6) */}
        <div className="rounded-2xl border-2 border-[#004071]/20 bg-linear-to-b from-[#004071]/10 via-[#004071]/5 to-background p-4 text-xs space-y-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-[#004071] dark:text-sky-300">
            <GraduationCap className="h-4 w-4 shrink-0 text-[#004071] dark:text-sky-300" />
            <span>راهنمای ورود داوطلبان مؤسسه مشاهیر دانش</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            داوطلبان گرامی می‌توانند با استفاده از همان مشخصات و شماره همراه ثبت‌شده در وب‌سایت اصلی مشاهیر دانش، از طریق رمز عبور یا دریافت کد پیامکی وارد شوند. پروفایل و بسته‌های آموزشی شما به صورت خودکار شناسایی و همگام‌سازی می‌گردد.
          </p>
        </div>

        {/* Main Authentication Card */}
        <Card className="border-border bg-card shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            {/* Mode Switcher Tabs - Strictly 2 Clean Options */}
            <div className="grid grid-cols-2 gap-1 bg-muted p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("PASSWORD");
                  setErrorMessage("");
                  setStatusMessage("");
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "PASSWORD"
                    ? "bg-[#004071] text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>ورود با رمز عبور</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("OTP");
                  setErrorMessage("");
                  setStatusMessage("");
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  authMode === "OTP"
                    ? "bg-[#004071] text-white shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>ورود با کد پیامکی</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-6 px-6">
            {/* CHOICE 1: PASSWORD LOGIN */}
            {authMode === "PASSWORD" && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/50 p-3 text-[11px] text-[#004071] dark:text-blue-300 leading-relaxed flex items-start gap-2">
                  <GraduationCap className="h-4 w-4 shrink-0 mt-0.5 text-[#004071] dark:text-blue-400" />
                  <span>
                    می‌توانید با شماره موبایل و رمز عبور حساب کاربری مشاهیر دانش یا کلمه عبور پرتال وارد شوید.
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    نام کاربری یا شماره تلفن همراه:
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      dir="ltr"
                      value={passwordIdentifier}
                      onChange={(e) => setPasswordIdentifier(e.target.value)}
                      placeholder="0912... یا نام کاربری"
                      className="w-full rounded-xl border border-input bg-background/50 h-11 pr-10 pl-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    کلمه عبور:
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="password"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-input bg-background/50 h-11 pr-10 pl-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start"
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
                  disabled={isLoading}
                  className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isLoading ? "در حال احراز هویت..." : "ورود به سامانه"}
                </Button>
              </form>
            )}

            {/* CHOICE 2: SMS OTP LOGIN */}
            {authMode === "OTP" && (
              <>
                {otpStep === "PHONE" ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/50 p-3 text-[11px] text-[#004071] dark:text-blue-300 leading-relaxed flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#004071] dark:text-blue-400" />
                      <span>
                        کد تایید یک‌بارمصرف به شماره همراه ثبت‌شده در حساب کاربری مشاهیر دانش ارسال خواهد شد.
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground block">
                        شماره تلفن همراه داوطلب:
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="tel"
                          dir="ltr"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          className="w-full rounded-xl border border-input bg-background/50 h-11 pr-10 pl-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start font-mono"
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
                      disabled={isLoading}
                      className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20 flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isLoading ? "در حال ارسال پیامک..." : "ارسال کد تایید پیامکی"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-foreground block">
                          کد ۵ رقمی ارسال شده به شماره {phoneNumber}:
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setOtpStep("PHONE");
                            setErrorMessage("");
                            setStatusMessage("");
                          }}
                          className="text-[11px] text-[#004071] dark:text-blue-400 hover:underline font-medium"
                        >
                          تغییر شماره
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={5}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="•••••"
                          className="w-full text-center tracking-[0.5em] text-lg font-bold rounded-xl border border-input bg-background/50 h-11 pr-10 pl-3.5 text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all font-mono"
                          required
                          autoFocus
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
                      disabled={isLoading}
                      className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20 flex items-center justify-center gap-2"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isLoading ? "در حال اعتبارسنجی..." : "تایید کد و ورود به سامانه"}
                    </Button>
                  </form>
                )}
              </>
            )}

            {/* WHITELIST STUDENT REGISTRATION FLOW */}
            {authMode === "REGISTER" && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div className="rounded-xl bg-[#004071]/5 border border-[#004071]/20 p-3 text-[11px] text-[#004071] leading-relaxed flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#004071]" />
                  <span>
                    ثبت‌نام در این بخش ویژه داوطلبانی است که مشخصات آن‌ها قبلاً در فهرست پذیرش مؤسسه مشاهیر دانش ثبت گردیده است.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    شماره تلفن همراه (ثبت‌شده در مؤسسه):
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="tel"
                      dir="ltr"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="09123456789"
                      className="w-full rounded-xl border border-input bg-background/50 h-10 pr-10 pl-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    کد ملی داوطلب:
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={10}
                      value={regNationalId}
                      onChange={(e) => setRegNationalId(e.target.value)}
                      placeholder="کد ملی ۱۰ رقمی"
                      className="w-full rounded-xl border border-input bg-background/50 h-10 pr-10 pl-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    نام و نام خانوادگی <span className="text-muted-foreground font-normal">(اختیاری):</span>
                  </label>
                  <div className="relative">
                    <User className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="نام و نام خانوادگی"
                      className="w-full rounded-xl border border-input bg-background/50 h-10 pr-10 pl-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      کلمه عبور اختصاصی:
                    </label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="password"
                        dir="ltr"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="حداقل ۶ کاراکتر"
                        className="w-full rounded-xl border border-input bg-background/50 h-10 pr-9 pl-3 text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground block">
                      تکرار کلمه عبور:
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <input
                        type="password"
                        dir="ltr"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="تکرار کلمه عبور"
                        className="w-full rounded-xl border border-input bg-background/50 h-10 pr-9 pl-3 text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-[#004071] focus:ring-2 focus:ring-[#004071]/20 focus:outline-hidden transition-all text-start"
                        required
                      />
                    </div>
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
                  disabled={isLoading}
                  className="w-full h-11 text-sm font-bold bg-[#004071] hover:bg-[#003259] text-white shadow-lg shadow-[#004071]/20 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <UserPlus className="h-4 w-4" />
                  {isLoading ? "در حال ثبت‌نام..." : "تکمیل ثبت‌نام و ورود به داشبورد"}
                </Button>
              </form>
            )}

            {/* Footer Notice */}
            <div className="mt-5 pt-4 border-t border-border/60 text-[11px] text-muted-foreground leading-relaxed text-center">
              سامانه رسمی پشتیبانی آموزشی مؤسسه آموزش عالی آزاد مشاهیر دانش
            </div>
          </CardContent>
        </Card>

        {/* Clean Registration & Switcher Link Below Card */}
        <div className="text-center pt-1">
          {authMode !== "REGISTER" ? (
            <button
              type="button"
              onClick={() => {
                setAuthMode("REGISTER");
                setErrorMessage("");
                setStatusMessage("");
              }}
              className="text-xs text-muted-foreground hover:text-[#004071] dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>داوطلب جدید با مشخصات در لیست سفید هستید؟ ثبت‌نام و فعال‌سازی حساب</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode("PASSWORD");
                setErrorMessage("");
                setStatusMessage("");
              }}
              className="text-xs text-muted-foreground hover:text-[#004071] dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-medium"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              <span>بازگشت به صفحه ورود اصلی</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
