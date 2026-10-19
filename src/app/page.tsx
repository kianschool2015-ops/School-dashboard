import React from "react";
import Link from "next/link";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { landingContent as landingContentTable } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { LandingContentSettings } from "@/types/models";
import {
  Scale,
  ShieldAlert,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  Trophy,
  Users,
  Clock,
  Headphones,
  CalendarCheck,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SmoothScroll from "@/components/landing/SmoothScroll";
import AudioController from "@/components/landing/AudioController";
import MiladScrollytelling from "@/components/landing/MiladScrollytelling";

const defaultLandingContent: LandingContentSettings = {
  heroBadge: "سامانه پایش هوشمند ۳۶۰ درجه",
  heroTitle: "پشتیبانی آموزشی مشاهیر دانش",
  heroSubtitle: "سامانه هدایت تحصیلی، پایش عملکرد و رفع بحران داوطلبان آزمون‌های وکالت",
  featuresTitle: "خدمات ۳۶۰ درجه آموزشی",
  honorsTitle: "افتخارات و رتبه‌های برتر",
  ctaTitle: "شروع قدرتمند در مشاهیر دانش",
  ctaSubtitle: "با همراهی برترین اساتید و پشتیبانان حقوق کشور، مسیر قبولی را هوشمندانه طی کنید.",
  phoneNumber: "۰۲۱-۸۸۸۸۸۸۸۸",
  brandColor: "#004071",
  accentColor: "#F59E0B",
  features: [],
  honors: [],
  gallery: [],
};

export default async function HomePage() {
  const session = await getSession();

  // If already logged in, redirect immediately to their respective home
  if (session) {
    if (session.role === "STUDENT") redirect("/student/dashboard");
    if (session.role === "MENTOR") redirect("/mentor/triage");
    if (session.role === "SUPERVISOR") redirect("/supervisor");
    if (session.role === "CEO" || session.role === "ADMIN") redirect("/executive");
  }

  // Load dynamic landing CMS settings from Drizzle ORM
  let landingContent = defaultLandingContent;
  try {
    const [landingRow] = await db
      .select()
      .from(landingContentTable)
      .where(eq(landingContentTable.id, "default_landing_cms"))
      .limit(1);

    if (landingRow?.content) {
      landingContent = {
        ...defaultLandingContent,
        ...(landingRow.content as Partial<LandingContentSettings>),
      };
    }
  } catch {}

  const iconMap: Record<string, React.ReactNode> = {
    ShieldAlert: <ShieldAlert className="h-6 w-6" />,
    CalendarCheck: <CalendarCheck className="h-6 w-6" />,
    BarChart3: <BarChart3 className="h-6 w-6" />,
    Headphones: <Headphones className="h-6 w-6" />,
    Scale: <Scale className="h-6 w-6" />,
    BookOpen: <BookOpen className="h-6 w-6" />,
  };

  return (
    <SmoothScroll>
      {/* Floating Audio Controller with ScrollTrigger volume modulation */}
      <AudioController />

      {/* 5-Act Cinematic Milad Tower & Calligraphy Scrollytelling Experience */}
      <MiladScrollytelling />

      {/* =====================================================================
          DYNAMIC LANDING CONTENT (Connected to Executive Backend CMS Engine)
          ===================================================================== */}
      <div className="w-full bg-background text-foreground transition-colors duration-300">
        {/* Section 1: Platform Capabilities & Architecture */}
        <section id="platform-features" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto" dir="rtl">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#004071]/30 bg-[#004071]/10 text-[#004071] dark:text-sky-300 text-xs font-bold">
              <Scale className="h-4 w-4" />
              <span>معماری ۳۶۰ درجه پایش و مربیگری تحصیلی</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {landingContent.featuresTitle || "چرا پشتیبانی مشاهیر دانش؟"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {landingContent.featuresDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {landingContent.features.map((feat, idx) => (
              <div
                key={feat.id || idx}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-[#004071]/40 transition-all space-y-3"
              >
                <div className="h-12 w-12 rounded-xl bg-[#004071]/10 text-[#004071] dark:text-sky-400 flex items-center justify-center">
                  {iconMap[feat.iconName] || <Sparkles className="h-6 w-6" />}
                </div>
                <h3 className="font-bold text-base text-foreground">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Milad Tower Honors & Hall of Fame */}
        <section id="milad-honors" className="py-20 bg-muted/40 border-y border-border" dir="rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold">
                  <Trophy className="h-4 w-4" />
                  <span>تالار افتخارات برج میلاد مشاهیر دانش</span>
                </div>
                <h2 className="text-3xl font-black text-foreground">
                  {landingContent.honorsTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {landingContent.honorsDescription}
                </p>
              </div>

              <Link href="/auth/login">
                <Button className="bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs gap-2">
                  <span>ورود به سامانه ۳۶۰ درجه</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {landingContent.honors.map((honor, idx) => (
                <div
                  key={honor.id || idx}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold text-xs">
                      رتبه
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{honor.rankTitle}</h4>
                      <p className="text-[11px] text-muted-foreground">{honor.candidateName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    «{honor.quote}»
                  </p>
                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-[#004071] dark:text-sky-400 font-medium">
                    <span>{honor.finalScore}</span>
                    <span>{honor.cohortName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Photo Gallery Archive */}
        {landingContent.gallery && landingContent.gallery.length > 0 && (
          <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto" dir="rtl">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-[#004071] dark:text-sky-300 text-xs font-bold">
                <ImageIcon className="h-4 w-4" />
                <span>گالری تصاویر و اسناد یادبود همایش برج میلاد</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground">
                آرشیو با شکوه جشن‌های ملی مشاهیر دانش
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                ثبت ماندگارترین لحظات تجلیل از نخبگان و ستارگان وکالت با حضور اساتید صاحب‌نام
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {landingContent.gallery.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-900 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="font-bold text-sm text-foreground">{img.title}</h3>
                    <p className="text-xs text-muted-foreground">{img.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: National Statistics Counter */}
        <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto" dir="rtl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-2">
              <Users className="h-6 w-6 text-[#004071] dark:text-sky-400 mx-auto" />
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {landingContent.stats?.studentsCount || "۲۰۰,۰۰۰+"}
              </div>
              <p className="text-xs text-muted-foreground font-medium">داوطلب تحت پوشش مشاهیر</p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-2">
              <Trophy className="h-6 w-6 text-amber-600 mx-auto" />
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {landingContent.stats?.ranksCount || "۱,۴۵۰+"}
              </div>
              <p className="text-xs text-muted-foreground font-medium">رتبه تک‌رقمی و دورقمی کانون</p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-2">
              <Clock className="h-6 w-6 text-emerald-600 mx-auto" />
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {landingContent.stats?.checkinSpeed || "< ۶۰ ثانیه"}
              </div>
              <p className="text-xs text-muted-foreground font-medium">میانگین ثبت چک‌این روزانه</p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-2">
              <CheckCircle2 className="h-6 w-6 text-[#004071] dark:text-sky-400 mx-auto" />
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {landingContent.stats?.adherenceRate || "۹۴.۸٪"}
              </div>
              <p className="text-xs text-muted-foreground font-medium">نرخ پایبندی به برنامه راهبردی</p>
            </div>
          </div>
        </section>

        {/* Section 5: Final Call to Action */}
        <section className="py-20 px-4 sm:px-6 max-w-5xl mx-auto" dir="rtl">
          <div className="relative rounded-3xl overflow-hidden border border-[#004071]/40 bg-gradient-to-tr from-slate-950 via-[#002440] to-[#004071] text-white p-8 sm:p-12 text-center space-y-6 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 text-sky-200 text-xs font-bold">
              <Sparkles className="h-4 w-4" />
              <span>پاییز و زمستان ۱۴۰۵ | ثبت‌نام دوره‌های جامع آزمون وکالت</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white max-w-2xl mx-auto leading-snug">
              {landingContent.ctaTitle || "صندلی افتخار شما در جشن برج میلاد منتظر شماست"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              {landingContent.ctaDescription ||
                "با همراهی تیمی از زبده‌ترین رتبه‌های برتر، سرپرستان کوهورت و اساتید دکترین حقوق، موفقیت خود را به قطعیت تبدیل کنید."}
            </p>

            <div className="pt-4 flex flex-wrap justify-center items-center gap-4">
              <Link href="/auth/login">
                <Button size="lg" className="bg-[#004071] hover:bg-[#003157] text-white font-black text-sm px-8 shadow-xl">
                  <span>ورود مستقیم به سامانه ۳۶۰ درجه</span>
                  <ArrowLeft className="h-4 w-4 me-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 6: Institute Footer with Mandatory Copyright Statement */}
        <footer className="border-t border-border bg-card py-12 px-4 sm:px-6" dir="rtl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#004071]/10 text-[#004071] dark:text-sky-400 flex items-center justify-center font-bold">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">پشتیبانی مشاهیر دانش</h4>
                <p className="text-xs text-muted-foreground">
                  سامانه اختصاصی هدایت تحصیلی و پایش بحران‌های آموزشی آزمون وکالت
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex flex-wrap items-center justify-center gap-6">
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                ورود داوطلبان
              </Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                پنل پشتیبانان
              </Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                داشبورد سرپرستان
              </Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                پنل مدیریت ارشد
              </Link>
            </div>

            {/* Exact Required Copyright Statement */}
            <div className="text-xs font-medium text-muted-foreground">
              {landingContent.footerRights || "تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است"}
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}
