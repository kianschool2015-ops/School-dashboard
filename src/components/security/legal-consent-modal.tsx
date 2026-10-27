"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle2, Lock, Scale, AlertTriangle, FileText, Loader2 } from "lucide-react";
import { acceptLegalTermsAction } from "@/server/actions/terms";

interface LegalConsentModalProps {
  isOpen: boolean;
  studentName?: string;
  nationalId?: string;
  onAccepted?: () => void;
}

export function LegalConsentModal({
  isOpen,
  studentName,
  nationalId,
  onAccepted,
}: LegalConsentModalProps) {
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    setVisible(isOpen);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!visible) return null;

  const handleConfirm = async () => {
    if (!acceptedCheckbox || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await acceptLegalTermsAction();
      if (res.success) {
        setVisible(false);
        if (onAccepted) onAccepted();
      } else {
        setErrorMessage(res.message || "خطا در ثبت تاییدیه. لطفاً مجدداً تلاش فرمایید.");
      }
    } catch {
      setErrorMessage("خطای غیرمنتظره در ارتباط با سرور. لطفاً اتصال اینترنت را بررسی نمایید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-300/40 dark:border-amber-600/30 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-r from-[#004071] via-[#005a9e] to-[#002847] p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  اقرارنامه و تعهدنامه حقوقی الزامی
                </span>
                <span className="text-xs text-white/70">سپر امنیتی DRM</span>
              </div>
              <h2 className="text-lg md:text-xl font-black mt-1 text-white">
                تعهدنامه حفظ مالکیت فکری و اسقاط حق استرداد وجه
              </h2>
            </div>
          </div>

          {(studentName || nationalId) && (
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-white/80 gap-2">
              <div>
                داوطلب محترم: <span className="font-bold text-white">{studentName || "داوطلب گرامی"}</span>
              </div>
              {nationalId && (
                <div>
                  کد ملی ثبتی: <span className="font-mono text-amber-300 font-bold">{nationalId}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Terms Body */}
        <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto text-sm leading-relaxed text-slate-700 dark:text-slate-200">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
              توجه مهم: مشاهده و دسترسی به برنامه مطالعاتی، کارگاه‌ها و بانک سوالات آزمون منوط به مطالعه دقیق، پذیرش بندهای حقوقی زیر و اسقاط کافه خیارات می‌باشد. این تعهدنامه دارای آثار قانونی الزام‌آور است.
            </p>
          </div>

          {/* Clause 1 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <FileText className="w-4 h-4 text-[#004071] dark:text-sky-400" />
              <span>بند ۱: مالکیت معنوی، انحصاری و محرمانگی محتوای آموزشی</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal text-justify">
              تمامی برنامه‌ریزی‌های آموزشی، بودجه‌بندی‌های زمانی، سوالات آزمون‌های شبیه‌ساز، مدل‌های تحلیلی و متون راهنمای ارائه‌شده در این سامانه، انحصاراً متعلق به موسسه مشاهیر دانش بوده و اثر فکری دارای حق تکثیر محسوب می‌گردد. هرگونه اسکرین‌شات، بازنشر، واگذاری، اشتراک‌گذاری، خرید گروهی یا در اختیار قراردادن به اشخاص ثالث، مطابق با ماده ۲۳ قانون حمایت از حقوق مؤلفان، مصنفان و هنرمندان جرم تلقی شده و متخلف علاوه بر جبران کلیه خسارات مادی و معنوی، مشمول پیگرد کیفری در دادسرای فرهنگ و رسانه و مراجع قضایی خواهد بود.
            </p>
          </div>

          {/* Clause 2 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>بند ۲: اسقاط کافه خیارات و انصراف قطعی از استرداد وجه (Refund Waiver)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal text-justify">
              با عنایت به ماهیت دانشی، تحلیلی و غیرملموس محتوای خدمات پشتیبانی ۳۶۰ درجه و طبق بند «ج» ماده ۳۸ قانون تجارت الکترونیک، با اولین ورود و مشاهده سرفصل‌ها و آزمون‌ها، ارائه خدمات کلید خورده و داوطلب صراحتاً و منجزاً حق انصراف و تقاضای استرداد تمام یا بخشی از وجه ثبت‌نامی را از خود سلب و ساقط می‌نماید (اسقاط کافه خیارات اعم از خیار غبن فاحش یا افحش). هرگونه اقدام جهت استرداد غیرقانونی یا ابطال پرداخت در وب‌سرویس مرکزی مشاهیر دانش، منجر به قطع آنی دسترسی و ارجاع پرونده خواهد شد.
            </p>
          </div>

          {/* Clause 3 */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>بند ۳: فناوری رهگیری فرنسیک و رمزنگاری واترمارک اختصاصی</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal text-justify">
              داوطلب آگاهی کامل دارد که کلیه صفحات برنامه‌ریزی، آزمون و سوالات، مجهز به فناوری واترمارک نامحسوس و میکرونی شامل مشخصات کامل هویتی (نام و نام‌خانوادگی، کد ملی و شماره همراه اختصاصی) و مهر زمانی ثبت‌شده هستند. در صورت تصویربرداری با گوشی، بازنشر در شبکه‌های اجتماعی یا نشت به رقبای تجاری، منبع افشا با دقت ۱۰۰٪ توسط آزمایشگاه ادله دیجیتال رهگیری شده و به عنوان سند انکارناپذیر علیه متخلف به مراجع قضایی ارائه می‌گردد.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/60 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedCheckbox}
              onChange={(e) => setAcceptedCheckbox(e.target.checked)}
              disabled={isSubmitting}
              className="mt-1 w-5 h-5 rounded border-slate-300 text-[#004071] focus:ring-[#004071] transition-all cursor-pointer"
            />
            <span className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              اینجانب با آگاهی کامل از مفاد قانونی، کلیه بندهای فوق، شرایط عدم استرداد وجه و تعهد حفظ محرمانگی را مطالعه نموده و به صورت منجز می‌پذیرم.
            </span>
          </label>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!acceptedCheckbox || isSubmitting}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                acceptedCheckbox && !isSubmitting
                  ? "bg-[#004071] hover:bg-[#003056] text-white shadow-blue-900/20 active:scale-[0.99]"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>در حال ثبت امضا و تاییدیه دیجیتال...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-amber-300" />
                  <span>تایید نهایی، امضای الکترونیک و ورود به سامانه</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
