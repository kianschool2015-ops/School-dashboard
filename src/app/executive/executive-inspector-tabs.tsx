"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserCheck,
  GraduationCap,
  Eye,
  ExternalLink,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Award,
  ArrowUpRight,
  BarChart,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";
import { updateLandingContentAction } from "@/server/actions/landing-cms";
import type {
  LandingContentSettings,
  LandingFeatureItem,
  LandingHonorsItem,
  LandingGalleryImage,
} from "@/types/models";

interface SupervisorInfo {
  id: string;
  fullName: string;
  username: string;
  phoneNumber: string;
  mentorsCount: number;
  studentsCount: number;
  openTriageCount: number;
}

interface MentorInfo {
  id: string;
  fullName: string;
  phoneNumber: string;
  sipExtension: string;
  studentsCount: number;
  activeTriageCount: number;
  resolvedTriageCount: number;
  callsCount: number;
}

interface StudentInfo {
  id: string;
  fullName: string;
  phoneNumber: string;
  mentorName: string;
  riskStatus: "GREEN" | "YELLOW" | "RED";
  weeklyHours: number;
  goal?: string | null;
}

interface SubjectGrowthInfo {
  subject: string;
  baseline: number;
  current: number;
  delta: number;
}

interface ExecutiveInspectorTabsProps {
  supervisors: SupervisorInfo[];
  mentors: MentorInfo[];
  students: StudentInfo[];
  subjectGrowth: SubjectGrowthInfo[];
  initialLandingContent?: LandingContentSettings;
}

export function ExecutiveInspectorTabs({
  supervisors,
  mentors,
  students,
  subjectGrowth,
  initialLandingContent,
}: ExecutiveInspectorTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "MACRO" | "SUPERVISORS" | "MENTORS" | "CRITICAL_STUDENTS" | "LANDING_CMS"
  >("MACRO");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "RED" | "YELLOW">("ALL");

  // Landing CMS State
  const [cmsContent, setCmsContent] = useState<LandingContentSettings>(
    initialLandingContent || {
      heroTagline: "پلتفرم ۳۶۰ درجه هدایت تحصیلی و پایش علمی وکالت",
      heroTitle: "پشتیبانی مشاهیر دانش",
      heroDescription:
        "آغاز سفر تحول‌آفرین برای بیش از ۲۰۰,۰۰۰ داوطلب کانون وکلای دادگستری و مرکز وکلای قوه قضائیه",
      towerTitle: "بر فراز برج میلاد، جشن پیروزی مشاهیری‌ها",
      towerSubtitle:
        "جشن با شکوه تقدیر از رتبه‌های تک‌رقمی و پذیرفته‌شدگان کانون وکلا در بلندترین قله پایتخت",
      galaTitle: "شکوه تالار همایش‌های برج میلاد؛ تجلیل از ستارگان وکالت",
      galaSubtitle:
        "حضور بیش از ۱,۶۰۰ وکیل، استاد برجسته و مشاور رتبه‌ساز در بزرگترین رویداد حقوقی ایران",
      featuresTitle: "چرا پشتیبانی مشاهیر دانش متفاوت است؟",
      featuresDescription:
        "ترکیب دانش عمیق حقوقی اساتید تراز اول با سیستم‌های نوین پایش بحران‌های مطالعاتی و هدایت تحصیلی گام‌به‌گام تا کسب قبولی.",
      features: [],
      honorsTitle: "ثمره همراهی مشاهیر؛ تندیس‌های زرین بر فراز برج میلاد",
      honorsDescription:
        "جشن سالانه مشاهیر دانش در مرکز همایش‌های بین‌المللی برج میلاد با حضور رتبه‌های برتر، مدیران عالی‌رتبه قضایی و خانواده‌های محترم داوطلبان.",
      honors: [],
      stats: {
        studentsCount: "۲۰۰,۰۰۰+",
        ranksCount: "۱,۴۵۰+",
        checkinSpeed: "< ۶۰ ثانیه",
        adherenceRate: "۹۴.۸٪",
      },
      gallery: [],
      ctaTitle: "صندلی افتخار شما در جشن برج میلاد منتظر شماست",
      ctaDescription:
        "با همراهی تیمی از زبده‌ترین رتبه‌های برتر، سرپرستان کوهورت و اساتید دکترین حقوق، موفقیت خود را به قطعیت تبدیل کنید.",
      footerRights:
        "تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است",
    }
  );

  const [cmsFeedback, setCmsFeedback] = useState<string | null>(null);
  const [isSavingCms, setIsSavingCms] = useState(false);

  // New Feature Item Form State
  const [newFeatTitle, setNewFeatTitle] = useState("");
  const [newFeatDesc, setNewFeatDesc] = useState("");
  const [newFeatIcon, setNewFeatIcon] = useState("ShieldAlert");

  // New Honor Item Form State
  const [newHonorRank, setNewHonorRank] = useState("");
  const [newHonorCandidate, setNewHonorCandidate] = useState("");
  const [newHonorQuote, setNewHonorQuote] = useState("");
  const [newHonorScore, setNewHonorScore] = useState("");
  const [newHonorCohort, setNewHonorCohort] = useState("");

  // New Gallery Image Form State
  const [newImgTitle, setNewImgTitle] = useState("");
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newImgCaption, setNewImgCaption] = useState("");

  const handleSaveLandingCms = async () => {
    setIsSavingCms(true);
    setCmsFeedback(null);
    try {
      const res = await updateLandingContentAction(cmsContent);
      if (res.success) {
        setCmsFeedback("تغییرات صفحه اصلی با موفقیت در سراسر پلتفرم اعمال و ذخیره شد.");
      } else {
        setCmsFeedback("خطا در ذخیره تغییرات صفحه اصلی.");
      }
    } catch {
      setCmsFeedback("خطای سیستمی در ثبت تنظیمات.");
    } finally {
      setIsSavingCms(false);
    }
  };

  const filteredStudents = students.filter((st) => {
    if (riskFilter === "ALL") return true;
    return st.riskStatus === riskFilter;
  });

  return (
    <Card className="border-border bg-card shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-400" />
              <span>مرکز نظارت و ممیزی عالیه ۳۶۰ درجه مدیر ارشد</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              اشراف عالیه و بازرسی مستقل ۴ لایه سازمانی با ممیزی بی‌درنگ سرپرستان، پشتیبانان و داوطلبان
            </p>
          </div>

          {/* 4 Structured Drill-Down Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-muted p-1 rounded-xl border border-border">
            {/* Tab 1: Macro Metrics */}
            <button
              onClick={() => setActiveTab("MACRO")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "MACRO"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>دید کلان و آزمون‌ها</span>
            </button>

            {/* Tab 2: Supervisors */}
            <button
              onClick={() => setActiveTab("SUPERVISORS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "SUPERVISORS"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>نظارت بر سرپرستان ({toPersianDigits(supervisors.length)})</span>
            </button>

            {/* Tab 3: Mentors */}
            <button
              onClick={() => setActiveTab("MENTORS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "MENTORS"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>ارزیابی پشتیبانان ({toPersianDigits(mentors.length)})</span>
            </button>

            {/* Tab 4: Critical Students */}
            <button
              onClick={() => setActiveTab("CRITICAL_STUDENTS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "CRITICAL_STUDENTS"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>پایش داوطلبان بحرانی ({toPersianDigits(students.filter((s) => s.riskStatus !== "GREEN").length)})</span>
            </button>

            {/* Tab 5: Landing CMS */}
            <button
              onClick={() => setActiveTab("LANDING_CMS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "LANDING_CMS"
                  ? "bg-[#004071] text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>مدیریت صفحه اصلی (CMS)</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* ==================================================================== */}
        {/* TAB 1: MACRO INSTITUTIONAL METRICS & DELTAS                          */}
        {/* ==================================================================== */}
        {activeTab === "MACRO" && (
          <div className="space-y-6">
            {/* Macro Institutional Executive KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="border-border bg-card p-5">
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                  <span>کل داوطلبان تحت پوشش</span>
                  <Users className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-foreground persian-nums">
                  {toPersianDigits(204500)} <span className="text-xs font-normal text-muted-foreground">نفر</span>
                </div>
                <p className="text-[10px] text-emerald-400 mt-1 flex items-center space-x-0.5 space-x-reverse">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>+۱۲.۴٪ رشد سالانه ثبت‌نام</span>
                </p>
              </Card>

              <Card className="border-border bg-card p-5">
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                  <span>میانگین جهش تراز (Delta)</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 persian-nums">
                  +{toPersianDigits(27.5)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">فاصله از سنجش پایه تا آزمون نهایی</p>
              </Card>

              <Card className="border-border bg-card p-5">
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                  <span>نرخ ماندگاری و استمرار</span>
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-foreground persian-nums">
                  %{toPersianDigits(91.8)}
                </div>
                <p className="text-[10px] text-emerald-400 mt-1">تنها ۸.۲٪ داوطلب منفصل</p>
              </Card>

              <Card className="border-border bg-card p-5">
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                  <span>پیش‌بینی قبولی کانون وکلا</span>
                  <Award className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 persian-nums">
                  %{toPersianDigits(84.3)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">بر اساس مدل آماری ۵ دوره گذشته</p>
              </Card>
            </div>

            {/* 5-Level Gantt Chart for Executive Oversight */}
            <MultiHorizonGantt
              entityType="SUPERVISOR"
              entityName="شبکه سرپرستان و پشتیبانان پشتیبانی مشاهیر دانش"
              readOnlyAuditorRole="CEO"
            />

            {/* Macro Subject Growth Radar */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center space-x-2 space-x-reverse">
                    <BarChart className="h-4 w-4 text-emerald-400" />
                    <span>دلتا و جهش نمرات از آزمون تشخیصی پایه (Baseline) تا کارنامه جاری</span>
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    جامعه آماری: کل داوطلبان فعال موسسه
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjectGrowth.map((item) => (
                    <div
                      key={item.subject}
                      className="bg-muted p-4 rounded-xl border border-border space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">{item.subject}</span>
                        <span className="text-xs font-bold text-emerald-400 persian-nums">
                          +{toPersianDigits(item.delta)}% جهش نمره
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 space-x-reverse text-xs text-muted-foreground">
                        <span>
                          پایه: <strong className="text-foreground/80 persian-nums">%{toPersianDigits(item.baseline)}</strong>
                        </span>
                        <span>←</span>
                        <span>
                          میانگین فعلی: <strong className="text-emerald-400 persian-nums">%{toPersianDigits(item.current)}</strong>
                        </span>
                      </div>
                      <div className="space-y-1">
                        <Progress value={item.current} className="h-2" indicatorClassName="bg-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: SUPERVISORS HEALTH & COHORT ALLOCATIONS                       */}
        {/* ==================================================================== */}
        {activeTab === "SUPERVISORS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-400" />
                <span>پایش سلامت کوهورت‌ها و تخصیص منابع سرپرستی</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                کل سرپرستان فعال: {toPersianDigits(supervisors.length)} نفر
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supervisors.map((sup) => (
                <div
                  key={sup.id}
                  className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <span>{sup.fullName}</span>
                        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-400/30">
                          سرپرست ارشد کوهورت
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        شناسه: <strong className="text-foreground">{sup.username}</strong> • موبایل: {sup.phoneNumber}
                      </p>
                    </div>
                    <Link href="/supervisor">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex items-center gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>بازرسی داشبورد سرپرست</span>
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border text-center text-xs">
                    <div className="p-2.5 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">پشتیبانان کوهورت</span>
                      <strong className="text-sm text-foreground font-mono">{toPersianDigits(sup.mentorsCount)} نفر</strong>
                    </div>
                    <div className="p-2.5 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">داوطلبان فعال</span>
                      <strong className="text-sm text-foreground font-mono">{toPersianDigits(sup.studentsCount)} نفر</strong>
                    </div>
                    <div className="p-2.5 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">پرونده‌های بحرانی</span>
                      <strong className="text-sm text-rose-400 font-mono">{toPersianDigits(sup.openTriageCount)} مورد</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: MENTORS SLA COMPLIANCE & LOAD BALANCING                       */}
        {/* ==================================================================== */}
        {activeTab === "MENTORS" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                <span>ارزیابی رعایت SLA، ظرفیت پذیرش و تماس‌های امن Zoiper پشتیبانان</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                کل پشتیبانان فعال: {toPersianDigits(mentors.length)} نفر
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{mentor.fullName}</h4>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        داخلی Zoiper: <strong className="text-indigo-400">{mentor.sipExtension}</strong> • موبایل: {mentor.phoneNumber}
                      </p>
                    </div>
                    <Link href="/mentor/triage">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex items-center gap-1 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                        <span>پایش و عارضه‌یابی</span>
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-center text-xs">
                    <div className="p-2 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">داوطلبان تحت نظر</span>
                      <strong className="text-sm text-foreground font-mono">{toPersianDigits(mentor.studentsCount)} نفر</strong>
                    </div>
                    <div className="p-2 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">تماس‌های AMI</span>
                      <strong className="text-sm text-emerald-400 font-mono">{toPersianDigits(mentor.callsCount)} تماس</strong>
                    </div>
                    <div className="p-2 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">بحران حل‌شده</span>
                      <strong className="text-sm text-indigo-400 font-mono">{toPersianDigits(mentor.resolvedTriageCount)}</strong>
                    </div>
                  </div>

                  {/* SLA Compliance Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">نرخ رعایت سقف زمانی SLA:</span>
                      <span className="text-emerald-400 font-bold persian-nums">۹۶.۴٪</span>
                    </div>
                    <Progress value={96.4} className="h-1.5" indicatorClassName="bg-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 4: HIGH-RISK STUDENTS AUDIT                                      */}
        {/* ==================================================================== */}
        {activeTab === "CRITICAL_STUDENTS" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span>پایش و مداخله داوطلبان دارای ریسک بالا (هشدار و بحران حاد)</span>
              </h3>

              {/* Risk Filter Buttons */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setRiskFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    riskFilter === "ALL"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  همه ({toPersianDigits(students.length)})
                </button>
                <button
                  onClick={() => setRiskFilter("RED")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    riskFilter === "RED"
                      ? "bg-rose-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-rose-400"
                  }`}
                >
                  بحران حاد ({toPersianDigits(students.filter((s) => s.riskStatus === "RED").length)})
                </button>
                <button
                  onClick={() => setRiskFilter("YELLOW")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    riskFilter === "YELLOW"
                      ? "bg-amber-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-amber-400"
                  }`}
                >
                  هشدار ({toPersianDigits(students.filter((s) => s.riskStatus === "YELLOW").length)})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-muted border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 text-start">نام داوطلب</th>
                    <th className="p-3 text-start">شماره تماس (ماسک‌شده)</th>
                    <th className="p-3 text-start">پشتیبان مسئول</th>
                    <th className="p-3 text-start">هدف آزمون</th>
                    <th className="p-3 text-start">ساعت مطالعه هفتگی</th>
                    <th className="p-3 text-start">وضعیت ریسک</th>
                    <th className="p-3 text-start">عملیات نظارتی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-bold text-foreground">{st.fullName}</td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {toPersianDigits(`${st.phoneNumber.slice(0, 4)}***${st.phoneNumber.slice(-4)}`)}
                      </td>
                      <td className="p-3 text-indigo-400 font-medium">{st.mentorName}</td>
                      <td className="p-3 text-muted-foreground">{st.goal}</td>
                      <td className="p-3 font-mono text-foreground">
                        {toPersianDigits(st.weeklyHours)} ساعت
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            st.riskStatus === "GREEN"
                              ? "green"
                              : st.riskStatus === "YELLOW"
                              ? "yellow"
                              : "red"
                          }
                        >
                          {st.riskStatus === "GREEN" ? "پایدار" : st.riskStatus === "YELLOW" ? "هشدار" : "بحران حاد"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Link href={`/mentor/student/${st.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] flex items-center gap-1 text-primary hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>پرونده ۳۶۰°</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 5: LANDING PAGE CMS (مدیریت محتوای صفحه اصلی و هویت بصری)          */}
        {/* ==================================================================== */}
        {activeTab === "LANDING_CMS" && (
          <div className="space-y-8" dir="rtl">
            {/* Header & Save Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#004071]/10 border border-[#004071]/20">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Globe className="h-5 w-5 text-[#004071]" />
                  <span>سامانه مدیریت محتوای صفحه اصلی (Landing CMS)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  ویرایش آنلاین تیترها، ویژگی‌های اختصاصی، رتبه‌برترها، گالری تصاویر و آمار صفحه اول سایت
                </p>
              </div>

              <Button
                onClick={handleSaveLandingCms}
                disabled={isSavingCms}
                className="h-11 px-6 bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs shadow-md flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {isSavingCms ? "در حال ذخیره..." : "ذخیره تغییرات در صفحه اصلی"}
              </Button>
            </div>

            {cmsFeedback && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>{cmsFeedback}</span>
              </div>
            )}

            {/* Section 1: Hero & Stage Headlines */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Sparkles className="h-4 w-4 text-[#004071]" />
                ۱. تیترها و عناوین اصلی صفحه اول
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">تگ‌لاین و شعار بالای عنوان:</label>
                  <input
                    type="text"
                    value={cmsContent.heroTagline}
                    onChange={(e) => setCmsContent({ ...cmsContent, heroTagline: e.target.value })}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">عنوان بزرگ هدر (Title):</label>
                  <input
                    type="text"
                    value={cmsContent.heroTitle}
                    onChange={(e) => setCmsContent({ ...cmsContent, heroTitle: e.target.value })}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">توضیحات معرفی سامانه:</label>
                <textarea
                  rows={2}
                  value={cmsContent.heroDescription}
                  onChange={(e) => setCmsContent({ ...cmsContent, heroDescription: e.target.value })}
                  className="w-full p-3 text-xs border border-border rounded-xl bg-background"
                />
              </div>
            </Card>

            {/* Section 2: Features Cards ("چرا پشتیبانی مشاهیر دانش متفاوت است؟") */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#004071]" />
                  ۲. بخش ویژگی‌ها: «چرا پشتیبانی مشاهیر دانش؟»
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">تیتر بخش ویژگی‌ها:</label>
                  <input
                    type="text"
                    value={cmsContent.featuresTitle}
                    onChange={(e) => setCmsContent({ ...cmsContent, featuresTitle: e.target.value })}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">توضیحات سرفصل ویژگی‌ها:</label>
                  <input
                    type="text"
                    value={cmsContent.featuresDescription}
                    onChange={(e) => setCmsContent({ ...cmsContent, featuresDescription: e.target.value })}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                  />
                </div>
              </div>

              {/* Existing Features List */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-foreground">کارت‌های ویژگی فعال:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cmsContent.features.map((feat, idx) => (
                    <div
                      key={feat.id || idx}
                      className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{feat.title}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = cmsContent.features.filter((_, i) => i !== idx);
                            setCmsContent({ ...cmsContent, features: updated });
                          }}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Feature Card Form */}
              <div className="p-4 rounded-xl border border-dashed border-[#004071]/30 bg-[#004071]/5 space-y-3">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-[#004071]" />
                  افزودن کارت ویژگی جدید:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="عنوان ویژگی (مثلاً: پایش و عارضه‌یابی علمی)"
                    value={newFeatTitle}
                    onChange={(e) => setNewFeatTitle(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                  <select
                    value={newFeatIcon}
                    onChange={(e) => setNewFeatIcon(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  >
                    <option value="ShieldAlert">آیکون پایش و هدایت (ShieldAlert)</option>
                    <option value="CalendarCheck">آیکون برنامه راهبردی (CalendarCheck)</option>
                    <option value="BarChart3">آیکون آمار و گانت (BarChart3)</option>
                    <option value="Headphones">آیکون مشاوره و تلفن (Headphones)</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  placeholder="توضیحات کوتاه کارت ویژگی..."
                  value={newFeatDesc}
                  onChange={(e) => setNewFeatDesc(e.target.value)}
                  className="w-full p-2.5 text-xs border border-border rounded-lg bg-background"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newFeatTitle.trim() || !newFeatDesc.trim()) return;
                    const newItem: LandingFeatureItem = {
                      id: `feat_${Date.now()}`,
                      title: newFeatTitle.trim(),
                      description: newFeatDesc.trim(),
                      iconName: newFeatIcon,
                    };
                    setCmsContent({ ...cmsContent, features: [...cmsContent.features, newItem] });
                    setNewFeatTitle("");
                    setNewFeatDesc("");
                  }}
                  className="h-9 text-xs bg-[#004071] hover:bg-[#003157] text-white"
                >
                  اضافه کردن کارت ویژگی
                </Button>
              </div>
            </Card>

            {/* Section 3: Honors & Testimonials */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Award className="h-4 w-4 text-amber-500" />
                ۳. تالار افتخارات و رتبه‌برترهای برج میلاد
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">تیتر تالار افتخارات:</label>
                  <input
                    type="text"
                    value={cmsContent.honorsTitle}
                    onChange={(e) => setCmsContent({ ...cmsContent, honorsTitle: e.target.value })}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">توضیحات تالار افتخارات:</label>
                  <input
                    type="text"
                    value={cmsContent.honorsDescription}
                    onChange={(e) => setCmsContent({ ...cmsContent, honorsDescription: e.target.value })}
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background"
                  />
                </div>
              </div>

              {/* Honors List */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-foreground">کارت‌های تندیس و افتخار ثبت‌شده:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cmsContent.honors.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{h.rankTitle}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const updated = cmsContent.honors.filter((_, i) => i !== idx);
                            setCmsContent({ ...cmsContent, honors: updated });
                          }}
                          className="h-7 w-7 text-rose-500 hover:text-rose-700 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">{h.candidateName}</p>
                      <p className="text-[11px] text-muted-foreground italic leading-relaxed">«{h.quote}»</p>
                      <div className="pt-1 border-t border-border flex justify-between text-[10px] text-amber-600 font-semibold">
                        <span>{h.finalScore}</span>
                        <span>{h.cohortName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Honor Form */}
              <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 space-y-3">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-amber-500" />
                  افزودن رتبه برتر جدید:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="عنوان رتبه (مثلاً: رتبه ۵ کانون وکلای مرکز)"
                    value={newHonorRank}
                    onChange={(e) => setNewHonorRank(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                  <input
                    type="text"
                    placeholder="نام داوطلب یا سال پذیرش"
                    value={newHonorCandidate}
                    onChange={(e) => setNewHonorCandidate(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="متن نقل‌قول یا پیام رتبه‌برتر..."
                  value={newHonorQuote}
                  onChange={(e) => setNewHonorQuote(e.target.value)}
                  className="w-full p-2.5 text-xs border border-border rounded-lg bg-background"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="معدل یا تراز (مثلاً: تراز ۱۱,۴۰۰)"
                    value={newHonorScore}
                    onChange={(e) => setNewHonorScore(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                  <input
                    type="text"
                    placeholder="نام کوهورت یا طرح"
                    value={newHonorCohort}
                    onChange={(e) => setNewHonorCohort(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    if (!newHonorRank.trim() || !newHonorQuote.trim()) return;
                    const newItem: LandingHonorsItem = {
                      id: `honor_${Date.now()}`,
                      rankTitle: newHonorRank.trim(),
                      candidateName: newHonorCandidate.trim(),
                      quote: newHonorQuote.trim(),
                      finalScore: newHonorScore.trim(),
                      cohortName: newHonorCohort.trim(),
                    };
                    setCmsContent({ ...cmsContent, honors: [...cmsContent.honors, newItem] });
                    setNewHonorRank("");
                    setNewHonorCandidate("");
                    setNewHonorQuote("");
                    setNewHonorScore("");
                    setNewHonorCohort("");
                  }}
                  className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  اضافه کردن رتبه‌برتر
                </Button>
              </div>
            </Card>

            {/* Section 4: Photo Gallery & Archive ("آرشیو عکس‌ها") */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <ImageIcon className="h-4 w-4 text-[#004071]" />
                ۴. آرشیو تصاویر و گالری جشن‌های ملی
              </h4>

              {/* Gallery Images List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-foreground">تصاویر ثبت‌شده در گالری:</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {cmsContent.gallery.map((img, idx) => (
                    <div
                      key={img.id || idx}
                      className="rounded-xl border border-border overflow-hidden bg-muted/20 space-y-2 relative"
                    >
                      <div className="aspect-video w-full bg-slate-900 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const updated = cmsContent.gallery.filter((_, i) => i !== idx);
                            setCmsContent({ ...cmsContent, gallery: updated });
                          }}
                          className="absolute top-2 start-2 h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-xs text-foreground">{img.title}</p>
                        <p className="text-[11px] text-muted-foreground">{img.caption}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Gallery Image Form */}
              <div className="p-4 rounded-xl border border-dashed border-[#004071]/30 bg-[#004071]/5 space-y-3">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-[#004071]" />
                  افزودن تصویر جدید به گالری:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="عنوان تصویر (مثلاً: استیج تالار همایش‌های برج میلاد)"
                    value={newImgTitle}
                    onChange={(e) => setNewImgTitle(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                  <input
                    type="text"
                    placeholder="آدرس یا مسیر تصویر (مثلاً: /images/landing/milad-gala.webp)"
                    value={newImgUrl}
                    onChange={(e) => setNewImgUrl(e.target.value)}
                    className="h-9 px-3 text-xs border border-border rounded-lg bg-background"
                  />
                </div>
                <input
                  type="text"
                  placeholder="توضیح کوتاه تصویر..."
                  value={newImgCaption}
                  onChange={(e) => setNewImgCaption(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (!newImgTitle.trim() || !newImgUrl.trim()) return;
                    const newImage: LandingGalleryImage = {
                      id: `img_${Date.now()}`,
                      title: newImgTitle.trim(),
                      imageUrl: newImgUrl.trim(),
                      caption: newImgCaption.trim(),
                      orderIndex: cmsContent.gallery.length + 1,
                    };
                    setCmsContent({ ...cmsContent, gallery: [...cmsContent.gallery, newImage] });
                    setNewImgTitle("");
                    setNewImgUrl("");
                    setNewImgCaption("");
                  }}
                  className="h-9 text-xs bg-[#004071] hover:bg-[#003157] text-white"
                >
                  اضافه کردن تصویر به گالری
                </Button>
              </div>
            </Card>

            {/* Section 5: Statistics Counter */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <BarChart3 className="h-4 w-4 text-[#004071]" />
                ۵. آمار و ارقام سراسری مؤسسه در صفحه اول
              </h4>

              {(() => {
                const stats = {
                  studentsCount: cmsContent.stats?.studentsCount ?? "",
                  ranksCount: cmsContent.stats?.ranksCount ?? "",
                  checkinSpeed: cmsContent.stats?.checkinSpeed ?? "",
                  adherenceRate: cmsContent.stats?.adherenceRate ?? "",
                };

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground block">تعداد داوطلبان:</label>
                      <input
                        type="text"
                        value={stats.studentsCount}
                        onChange={(e) =>
                          setCmsContent({
                            ...cmsContent,
                            stats: { ...stats, studentsCount: e.target.value },
                          })
                        }
                        className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground block">تعداد رتبه‌های برتر:</label>
                      <input
                        type="text"
                        value={stats.ranksCount}
                        onChange={(e) =>
                          setCmsContent({
                            ...cmsContent,
                            stats: { ...stats, ranksCount: e.target.value },
                          })
                        }
                        className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground block">سرعت ثبت چک‌این:</label>
                      <input
                        type="text"
                        value={stats.checkinSpeed}
                        onChange={(e) =>
                          setCmsContent({
                            ...cmsContent,
                            stats: { ...stats, checkinSpeed: e.target.value },
                          })
                        }
                        className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground block">نرخ پایبندی به برنامه:</label>
                      <input
                        type="text"
                        value={stats.adherenceRate}
                        onChange={(e) =>
                          setCmsContent({
                            ...cmsContent,
                            stats: { ...stats, adherenceRate: e.target.value },
                          })
                        }
                        className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background font-mono"
                      />
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Section 6: Footer Copyright & Mandatory Legal Text */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Check className="h-4 w-4 text-emerald-600" />
                ۶. متن رسمی کپی‌رایت و حقوق معنوی در فوتر سایت
              </h4>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  عبارت درج‌شده در فوتر تمام صفحات (Mandatory Statement):
                </label>
                <input
                  type="text"
                  value={cmsContent.footerRights}
                  onChange={(e) => setCmsContent({ ...cmsContent, footerRights: e.target.value })}
                  placeholder="تمامی حقوق این وب‌سایت برای مؤسسه حقوقی مشاهیر دانش محفوظ است"
                  className="w-full h-11 px-3.5 text-xs font-medium border border-border rounded-xl bg-background"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSaveLandingCms}
                  disabled={isSavingCms}
                  className="h-11 px-8 bg-[#004071] hover:bg-[#003157] text-white font-bold text-xs shadow-lg"
                >
                  {isSavingCms ? "در حال ذخیره..." : "ذخیره نهایی تنظیمات صفحه اصلی"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
