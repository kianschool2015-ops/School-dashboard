"use client";

import React, { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Sparkles,
  Trophy,
  GraduationCap,
  Scale,
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  Award,
  Zap,
} from "lucide-react";

export default function MiladScrollytelling() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();

      // =========================================================================
      // 1. DESKTOP EXPERIENCE (min-width: 768px): 5-Act Pinned Virtual Scrollytelling
      // =========================================================================
      mm.add("(min-width: 768px)", () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "+=4000",
            pin: true,
            scrub: 1.2,
            anticipatePin: 1,
          },
        });

        // -----------------------------------------------------------------------
        // Act 1 & 2: Golden Calligraphy Logo scales to 22x with blur and fades out
        // -----------------------------------------------------------------------
        tl.to(".scrolly-logo-wrapper", {
          scale: 22,
          filter: "blur(24px)",
          opacity: 0,
          ease: "power2.inOut",
          duration: 3,
        })
          .to(
            ".scrolly-act1-text",
            {
              opacity: 0,
              y: -60,
              ease: "power2.in",
              duration: 1.5,
            },
            "<"
          )

          // -----------------------------------------------------------------------
          // Act 3: Milad Tower ascends from bottom with gold glow & Persian title
          // -----------------------------------------------------------------------
          .fromTo(
            ".scrolly-tower-wrapper",
            {
              yPercent: 120,
              opacity: 0,
              scale: 0.85,
            },
            {
              yPercent: 0,
              opacity: 1,
              scale: 1,
              ease: "power2.out",
              duration: 3.2,
            },
            "-=0.6"
          )
          .fromTo(
            ".scrolly-tower-glow",
            {
              opacity: 0,
              scale: 0.4,
            },
            {
              opacity: 0.85,
              scale: 1.2,
              duration: 2.5,
            },
            "<"
          )
          .fromTo(
            ".scrolly-act3-text",
            {
              opacity: 0,
              y: 40,
            },
            {
              opacity: 1,
              y: 0,
              duration: 2,
            },
            "-=1.8"
          )
          // Fade tower out into gala
          .to(
            [".scrolly-tower-wrapper", ".scrolly-act3-text", ".scrolly-tower-glow"],
            {
              opacity: 0,
              y: -80,
              duration: 1.8,
              delay: 0.6,
            }
          )

          // -----------------------------------------------------------------------
          // Act 4: Gala panorama reveals via expanding clipPath circle with pan
          // -----------------------------------------------------------------------
          .fromTo(
            ".scrolly-gala-container",
            {
              clipPath: "circle(0% at 50% 50%)",
              opacity: 1,
            },
            {
              clipPath: "circle(125% at 50% 50%)",
              duration: 3.5,
              ease: "power2.inOut",
            }
          )
          .fromTo(
            ".scrolly-gala-img",
            {
              xPercent: 0,
              scale: 1.0,
              transformOrigin: "50% 50%",
            },
            {
              xPercent: 0,
              scale: 1.14,
              duration: 4.5,
              ease: "power1.out",
            },
            "<"
          )
          .fromTo(
            ".scrolly-act4-text",
            {
              opacity: 0,
              y: 35,
            },
            {
              opacity: 1,
              y: 0,
              duration: 2,
            },
            "-=2.5"
          )

          // -----------------------------------------------------------------------
          // Act 5: Panorama darkens into backdrop; 3 action cards glide into view
          // -----------------------------------------------------------------------
          .to(".scrolly-gala-dim", {
            opacity: 0.88,
            duration: 2,
          })
          .to(
            ".scrolly-act4-text",
            {
              opacity: 0,
              y: -30,
              duration: 1,
            },
            "<"
          )
          .fromTo(
            ".scrolly-act5-content",
            {
              opacity: 0,
              y: 70,
            },
            {
              opacity: 1,
              y: 0,
              duration: 2.5,
              ease: "power3.out",
            },
            "-=0.5"
          )
          .fromTo(
            ".scrolly-card-item",
            {
              opacity: 0,
              y: 50,
              scale: 0.95,
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              stagger: 0.25,
              duration: 2,
              ease: "power2.out",
            },
            "-=1.8"
          );
      });

      // =========================================================================
      // 2. MOBILE & WEBVIEW SAFETY (max-width: 767px)
      // Zero virtual scroll pinning to prevent Capacitor users getting trapped
      // =========================================================================
      mm.add("(max-width: 767px)", () => {
        const mobileElements = gsap.utils.toArray<HTMLElement>(".mobile-reveal");
        mobileElements.forEach((el) => {
          gsap.fromTo(
            el,
            {
              opacity: 0,
              y: 30,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: "power2.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                end: "top 60%",
                toggleActions: "play none none reverse",
              },
            }
          );
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      id="milad-scrolly-container"
      className="relative w-full bg-slate-950 text-white overflow-hidden selection:bg-amber-500/30 selection:text-amber-200"
      dir="rtl"
    >
      {/* =====================================================================
          DESKTOP SCENE (Pinned 100vh Stage)
          ===================================================================== */}
      <div className="hidden md:block relative h-screen w-full overflow-hidden">
        {/* Background Ambient Starfield & Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,80,20,0.25),rgba(2,6,23,0.98))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

        {/* -------------------------------------------------------------------
            ACT 1 & 2: Golden Calligraphy Logo & Dramatic Entrance
            ------------------------------------------------------------------- */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 px-6">
          <div className="scrolly-logo-wrapper will-change-transform flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/logo-symbol.svg"
              alt="نشان رسمی مشاهیر دانش"
              className="w-48 h-48 sm:w-64 sm:h-64 drop-shadow-[0_0_35px_rgba(245,158,11,0.5)]"
            />
          </div>

          <div className="scrolly-act1-text text-center mt-8 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-300">
                پلتفرم ۳۶۰ درجه هدایت تحصیلی و پایش علمی وکالت
              </span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600">
              پشتیبانی مشاهیر دانش
            </h1>
            <p className="text-sm lg:text-base text-slate-300 leading-relaxed font-light">
              آغاز سفر تحول‌آفرین برای بیش از ۲۰۰,۰۰۰ داوطلب کانون وکلای دادگستری و مرکز وکلای قوه قضائیه
            </p>

            <div className="pt-6 flex flex-col items-center gap-2 text-amber-400/80 animate-bounce">
              <span className="text-[11px] font-medium">به سوی قله افتخار اسکرول کنید</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            ACT 3: Milad Tower Ascending & Golden Radiant Glow
            ------------------------------------------------------------------- */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none z-10">
          {/* Radial Ambient Gold Spotlight */}
          <div className="scrolly-tower-glow absolute bottom-0 w-[800px] h-[800px] rounded-full bg-gradient-to-t from-amber-500/30 via-yellow-500/10 to-transparent blur-3xl pointer-events-none" />

          {/* Persian Typography for Tower */}
          <div className="scrolly-act3-text absolute top-16 text-center space-y-3 z-30 px-6">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-amber-500/30 bg-black/60 backdrop-blur-md">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-300">میعادگاه نخبگان حقوقی کشور</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
              بر فراز برج میلاد، جشن پیروزی مشاهیری‌ها
            </h2>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              جشن با شکوه تقدیر از رتبه‌های تک‌رقمی و پذیرفته‌شدگان کانون وکلا در بلندترین قله پایتخت
            </p>
          </div>

          {/* Tower Cutout */}
          <div className="scrolly-tower-wrapper will-change-transform relative z-20 flex justify-center w-full max-w-3xl h-[88vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/milad-cutout.png"
              alt="برج میلاد تهران - جشن افتخار مشاهیر"
              className="h-full w-auto object-contain filter drop-shadow-[0_0_50px_rgba(245,158,11,0.35)]"
            />
          </div>
        </div>

        {/* -------------------------------------------------------------------
            ACT 4 & 5: Gala Panorama & Action Cards
            ------------------------------------------------------------------- */}
        <div className="scrolly-gala-container absolute inset-0 z-30 overflow-hidden pointer-events-auto">
          {/* Gala Panorama Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/milad-gala.webp"
            alt="تالار همایش‌های بین‌المللی برج میلاد"
            className="scrolly-gala-img absolute inset-0 w-full h-full object-cover will-change-transform"
          />

          {/* Dynamic Dark Dim Overlay for Act 5 */}
          <div className="scrolly-gala-dim absolute inset-0 bg-slate-950/40 pointer-events-none transition-opacity duration-700" />

          {/* Act 4 Typography: The Gala Grandeur */}
          <div className="scrolly-act4-text absolute top-20 inset-x-0 text-center pointer-events-none z-40 px-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/40 bg-black/70 backdrop-blur-md shadow-2xl">
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-200">
                همایش سالانه ستارگان وکالت
              </span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-white mt-3 drop-shadow-2xl">
              شکوه تالار همایش‌های برج میلاد؛ تجلیل از ستارگان وکالت
            </h2>
            <p className="text-sm text-slate-200 mt-2 max-w-xl mx-auto drop-shadow">
              حضور بیش از ۱,۶۰۰ وکیل، استاد برجسته و مشاور رتبه‌ساز در بزرگترین رویداد حقوقی ایران
            </p>
          </div>

          {/* Act 5: Modern Glassmorphic Action Cards and Portals */}
          <div className="scrolly-act5-content absolute inset-0 flex flex-col justify-center items-center z-50 px-6 max-w-6xl mx-auto pointer-events-auto">
            <div className="text-center mb-8 space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">درگاه‌های هوشمند خدمات آموزشی</span>
              </div>
              <h3 className="text-2xl lg:text-4xl font-extrabold text-white">
                مسیر موفقیت خود در آزمون وکالت را انتخاب کنید
              </h3>
              <p className="text-xs lg:text-sm text-slate-300 max-w-lg mx-auto">
                اتصال یکپارچه به پنل‌های داوطلبان، سرپرستان کوهورت و خدمات جامع پایش آموزشی
              </p>
            </div>

            {/* 3 Glassmorphic Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {/* Card 1: پرتال داوطلبان وکالت */}
              <Link
                href="/auth/login"
                className="scrolly-card-item group relative rounded-2xl border border-white/10 bg-slate-900/75 p-6 backdrop-blur-xl hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-300 shadow-2xl hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  پرتال داوطلبان وکالت
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  برنامه راهبردی هفتگی اختصاصی، ثبت سریع چک‌این روزانه زیر ۶۰ ثانیه، آزمون‌های تحلیلی و ارتباط مستقیم با پشتیبان رتبه‌برتر.
                </p>
                <div className="flex items-center text-xs font-semibold text-emerald-400 gap-1.5 pt-2 border-t border-white/5">
                  <span>ورود مستقیم به سامانه داوطلبان</span>
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Card 2: تالار افتخارات برج میلاد */}
              <a
                href="#milad-honors"
                className="scrolly-card-item group relative rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 to-slate-900/85 p-6 backdrop-blur-xl hover:border-amber-400/60 transition-all duration-300 shadow-2xl hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                  <Trophy className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                  تالار افتخارات برج میلاد
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  مشاهده فیلم، تصاویر و کارنامه‌های درخشان پذیرفته‌شدگان تک‌رقمی و رتبه‌برترهای کانون وکلا در جشن رسمی برج میلاد.
                </p>
                <div className="flex items-center text-xs font-semibold text-amber-400 gap-1.5 pt-2 border-t border-white/5">
                  <span>مشاهده اسناد و تصاویر جشن</span>
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                </div>
              </a>

              {/* Card 3: ثبت‌نام طرح‌های جامع */}
              <Link
                href="/auth/login"
                className="scrolly-card-item group relative rounded-2xl border border-white/10 bg-slate-900/75 p-6 backdrop-blur-xl hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all duration-300 shadow-2xl hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">
                  ثبت‌نام طرح‌های جامع
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  عضویت در طرح‌های هدایت تحصیلی ۳۶۰ درجه، پایش بحران‌های مطالعاتی، آزمون‌های ارزیابی و برنامه راهبردی تطبیقی.
                </p>
                <div className="flex items-center text-xs font-semibold text-indigo-400 gap-1.5 pt-2 border-t border-white/5">
                  <span>ثبت نام و شروع فرآیند مشاوره</span>
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>

            {/* Quick Actions Footer */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/auth/login"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2"
              >
                <span>ورود به سامانه پشتیبانی مشاهیر دانش</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <a
                href="#platform-features"
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs backdrop-blur-md transition-all"
              >
                امکانات سامانه ۳۶۰ درجه
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MOBILE EXPERIENCE (Clean Non-Pinned Vertical Presentation)
          Ensures Capacitor Android WebView users are NEVER trapped in 4000px
          ===================================================================== */}
      <div className="md:hidden flex flex-col space-y-12 py-12 px-4">
        {/* Mobile Act 1: Brand & Logo */}
        <div className="mobile-reveal text-center space-y-4">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/logo-symbol.svg"
              alt="پشتیبانی مشاهیر دانش"
              className="w-32 h-32 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>سامانه ۳۶۰ درجه هدایت تحصیلی وکالت</span>
          </div>
          <h1 className="text-3xl font-black text-white">پشتیبانی مشاهیر دانش</h1>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
            پلتفرم هدایت تحصیلی، رفع موانع علمی و مربیگری بیش از ۲۰۰,۰۰۰ داوطلب آزمون وکالت کانون و مرکز وکلا
          </p>
        </div>

        {/* Mobile Act 3: Milad Tower Hero Showcase */}
        <div className="mobile-reveal rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
            <Trophy className="h-3.5 w-3.5" />
            <span>میعادگاه پیروزی مشاهیری‌ها</span>
          </div>
          <h2 className="text-xl font-bold text-white">
            بر فراز برج میلاد، جشن افتخار نخبگان وکالت
          </h2>
          <div className="relative flex justify-center py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/landing/milad-cutout.png"
              alt="برج میلاد تهران"
              className="h-64 w-auto object-contain drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            />
          </div>
          <p className="text-xs text-slate-300">
            میزبانی و تجلیل از صدها رتبه تک‌رقمی و پذیرفته‌شده آزمون وکالت در تالار همایش‌های بین‌المللی برج میلاد
          </p>
        </div>

        {/* Mobile Act 4: Gala Photo Snapshot */}
        <div className="mobile-reveal rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing/milad-gala.webp"
            alt="تالار همایش‌های برج میلاد"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-4 flex flex-col justify-end">
            <span className="text-[10px] font-bold text-amber-400">شکوه تالار همایش‌ها</span>
            <h3 className="text-sm font-bold text-white">
              بزرگترین اجتماع سالانه پذیرفته‌شدگان وکالت کشور
            </h3>
          </div>
        </div>

        {/* Mobile Act 5: Direct Action Links */}
        <div className="mobile-reveal space-y-3">
          <h3 className="text-base font-bold text-white text-center mb-2">درگاه‌های ورود سریع</h3>

          <Link
            href="/auth/login"
            className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-slate-900/90 hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="text-start">
                <h4 className="text-xs font-bold text-white">پرتال داوطلبان وکالت</h4>
                <p className="text-[10px] text-slate-400">برنامه هفتگی، چک‌این روزانه و آزمون‌ها</p>
              </div>
            </div>
            <ArrowLeft className="h-4 w-4 text-emerald-400" />
          </Link>

          <a
            href="#milad-honors"
            className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-slate-900/90 hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="text-start">
                <h4 className="text-xs font-bold text-white">تالار افتخارات برج میلاد</h4>
                <p className="text-[10px] text-slate-400">تصاویر و اسناد جشن رتبه‌برترها</p>
              </div>
            </div>
            <ArrowLeft className="h-4 w-4 text-amber-400" />
          </a>

          <Link
            href="/auth/login"
            className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/30 bg-slate-900/90 hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-start">
                <h4 className="text-xs font-bold text-white">ثبت‌نام طرح‌های جامع ۳۶۰</h4>
                <p className="text-[10px] text-slate-400">هدایت تحصیلی و رفع موانع آموزشی</p>
              </div>
            </div>
            <ArrowLeft className="h-4 w-4 text-indigo-400" />
          </Link>

          <div className="pt-2">
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
            >
              <span>ورود به سامانه پشتیبانی مشاهیر دانش</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
