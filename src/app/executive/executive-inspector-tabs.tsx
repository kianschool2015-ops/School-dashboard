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
  X,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";
import { updateLandingContentAction } from "@/server/actions/landing-cms";
import {
  saveEntitledCourseAction,
  toggleEntitledCourseStatusAction,
  deleteEntitledCourseAction,
} from "@/server/actions/admin-courses";
import { toggleMentorExamCreationAction } from "@/server/actions/admin-users";
import type {
  LandingContentSettings,
  LandingFeatureItem,
  LandingHonorsItem,
  LandingGalleryImage,
  EntitledCourseRecord,
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
  canCreateExams?: boolean;
}

interface StudentInfo {
  id: string;
  fullName: string;
  phoneNumber: string;
  mentorName: string;
  riskStatus: "GREEN" | "YELLOW" | "RED";
  weeklyHours: number;
  goal?: string | null;
  enrolledCourseName?: string | null;
  enrolledCourseCode?: string | null;
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
  initialEntitledCourses?: EntitledCourseRecord[];
}

export function ExecutiveInspectorTabs({
  supervisors,
  mentors,
  students,
  subjectGrowth,
  initialLandingContent,
  initialEntitledCourses,
}: ExecutiveInspectorTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "MACRO" | "SUPERVISORS" | "MENTORS" | "CRITICAL_STUDENTS" | "LANDING_CMS" | "MASHAHIR_COURSES"
  >("MACRO");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "RED" | "YELLOW">("ALL");
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [inspectingSupervisor, setInspectingSupervisor] = useState<SupervisorInfo | null>(null);
  const [inspectingMentor, setInspectingMentor] = useState<MentorInfo | null>(null);

  // Extract unique courses for filtering
  const uniqueCourses = Array.from(
    new Set(
      students
        .map((s) => s.enrolledCourseName)
        .filter((c): c is string => Boolean(c))
    )
  );

  // Entitled Courses State (Garnet LMS Integration)
  const [coursesList, setCoursesList] = useState<EntitledCourseRecord[]>(
    initialEntitledCourses || []
  );
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [newCoursePrice, setNewCoursePrice] = useState("۵,۸۰۰,۰۰۰ تومان");
  const [newCourseUrl, setNewCourseUrl] = useState("https://mashahiredanesh.com/courses/");
  const [newCourseHasSupport, setNewCourseHasSupport] = useState(true);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [courseFeedback, setCourseFeedback] = useState<string | null>(null);

  const handleSaveCourse = async () => {
    if (!newCourseCode.trim() || !newCourseName.trim()) {
      setCourseFeedback("لطفاً کد دوره و نام دوره را وارد نمایید.");
      return;
    }
    setIsSavingCourse(true);
    setCourseFeedback(null);
    try {
      const res = await saveEntitledCourseAction({
        courseCode: newCourseCode.trim(),
        courseName: newCourseName.trim(),
        description: newCourseDesc.trim() || undefined,
        priceFormatted: newCoursePrice.trim() || "۵,۸۰۰,۰۰۰ تومان",
        garnetPurchaseUrl: newCourseUrl.trim() || "https://mashahiredanesh.com",
        hasSupport: newCourseHasSupport,
        isActive: true,
      });

      if (res.success) {
        setCourseFeedback(res.message);
        setCoursesList((prev) => {
          const normCode = newCourseCode.trim().toUpperCase();
          const filtered = prev.filter((c) => c.courseCode !== normCode);
          return [
            {
              id: `crs_${normCode.toLowerCase()}`,
              courseCode: normCode,
              courseName: newCourseName.trim(),
              description: newCourseDesc.trim() || null,
              priceFormatted: newCoursePrice.trim() || "۵,۸۰۰,۰۰۰ تومان",
              garnetPurchaseUrl: newCourseUrl.trim() || "https://mashahiredanesh.com",
              hasSupport: newCourseHasSupport,
              supportTier: "GOLD",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            ...filtered,
          ];
        });
        setNewCourseCode("");
        setNewCourseName("");
        setNewCourseDesc("");
      } else {
        setCourseFeedback(res.message || "خطا در ثبت دوره.");
      }
    } catch {
      setCourseFeedback("خطا در برقراری ارتباط با پایگاه داده.");
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleToggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const res = await toggleEntitledCourseStatusAction(courseId, nextStatus);
      if (res.success) {
        setCoursesList((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, isActive: nextStatus } : c))
        );
      }
    } catch {}
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("آیا از حذف این دوره از فهرست دوره‌های مجاز اطمینان دارید؟")) return;
    try {
      const res = await deleteEntitledCourseAction(courseId);
      if (res.success) {
        setCoursesList((prev) => prev.filter((c) => c.id !== courseId));
      }
    } catch {}
  };

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
        "ترکیب دانش عمیق حقوقی اساتید تراز اول با سیستم‌های نوین شناسایی مشکلات مطالعاتی و هدایت تحصیلی گام‌به‌گام تا کسب قبولی.",
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
        "با همراهی تیمی از زبده‌ترین رتبه‌های برتر، سرپرستان گروه آموزشی داوطلبان و اساتید دکترین حقوق، موفقیت خود را به قطعیت تبدیل کنید.",
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

  // Mentor Exam Authoring Privilege State
  const [mentorExamPrivileges, setMentorExamPrivileges] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    mentors.forEach((m) => {
      map[m.id] = Boolean(m.canCreateExams);
    });
    return map;
  });
  const [togglingMentorId, setTogglingMentorId] = useState<string | null>(null);
  const [privilegeFeedback, setPrivilegeFeedback] = useState<string | null>(null);

  const handleToggleMentorExamPrivilege = async (mentorId: string, currentVal: boolean) => {
    setTogglingMentorId(mentorId);
    setPrivilegeFeedback(null);
    try {
      const newVal = !currentVal;
      const res = await toggleMentorExamCreationAction(mentorId, newVal);
      if (res.success) {
        setMentorExamPrivileges((prev) => ({ ...prev, [mentorId]: newVal }));
        setPrivilegeFeedback(res.message);
      } else {
        setPrivilegeFeedback(res.message || "خطا در تغییر دسترسی");
      }
    } catch {
      setPrivilegeFeedback("خطای سیستمی در تغییر مجوز");
    } finally {
      setTogglingMentorId(null);
    }
  };

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
    const matchRisk = riskFilter === "ALL" ? true : st.riskStatus === riskFilter;
    const matchCourse = selectedCourse === "ALL" ? true : st.enrolledCourseName === selectedCourse;
    return matchRisk && matchCourse;
  });

  return (
    <Card className="border-border bg-card shadow-xl overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Eye className="h-5 w-5 text-indigo-400" />
              <span>داشبورد مدیریتی موسسه</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              نظارت بر عملکرد تمام سطوح سازمانی
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
              <span>نمای کلی پایش</span>
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
              <span>پیگیری داوطلبان نیازمند رسیدگی ({toPersianDigits(students.filter((s) => s.riskStatus !== "GREEN").length)})</span>
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

            {/* Tab 6: Mashahir Entitled Courses */}
            <button
              onClick={() => setActiveTab("MASHAHIR_COURSES")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "MASHAHIR_COURSES"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>دوره‌های آموزشی مشاهیر دانش ({toPersianDigits(coursesList.length)})</span>
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
                  <span>میانگین رشد تراز</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 persian-nums">
                  +{toPersianDigits(27.5)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">فاصله از سنجش پایه تا آخرین آزمون</p>
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
                    <span>میزان پیشرفت نمرات از آزمون اولیه تا کارنامه فعلی</span>
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
                          +{toPersianDigits(item.delta)}% رشد نمره
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
                <span>پایش سلامت گروه‌های آموزشی داوطلبان و تخصیص منابع سرپرستی</span>
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
                          سرپرست ارشد گروه آموزشی
                        </Badge>
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        شناسه: <strong className="text-foreground">{sup.username}</strong> • موبایل: {sup.phoneNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingSupervisor(sup)}
                        className="text-xs flex items-center gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>اشراف و بازرسی مستقیم</span>
                      </Button>
                      <Link href="/supervisor">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>ورود به پنل</span>
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border text-center text-xs">
                    <div className="p-2.5 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">پشتیبانان گروه آموزشی</span>
                      <strong className="text-sm text-foreground font-mono">{toPersianDigits(sup.mentorsCount)} نفر</strong>
                    </div>
                    <div className="p-2.5 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">داوطلبان فعال</span>
                      <strong className="text-sm text-foreground font-mono">{toPersianDigits(sup.studentsCount)} نفر</strong>
                    </div>
                    <div className="p-2.5 bg-card rounded-lg border border-border">
                      <span className="text-muted-foreground block text-[10px]">پرونده‌های نیازمند رسیدگی</span>
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
                <span>ارزیابی زمان‌بندی پاسخگویی، ظرفیت پذیرش و تماس‌های امن تلفنی پشتیبانان</span>
              </h3>
              <span className="text-xs text-muted-foreground font-mono">
                کل پشتیبانان فعال: {toPersianDigits(mentors.length)} نفر
              </span>
            </div>

            {privilegeFeedback && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                <span>{privilegeFeedback}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPrivilegeFeedback(null)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

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
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingMentor(mentor)}
                        className="text-xs flex items-center gap-1 border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>اشراف مستقیم</span>
                      </Button>
                      <Link href="/mentor/students">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>ورود</span>
                        </Button>
                      </Link>
                    </div>
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
                      <span className="text-muted-foreground">نرخ رعایت سقف زمانی پاسخگویی:</span>
                      <span className="text-emerald-400 font-bold persian-nums">۹۶.۴٪</span>
                    </div>
                    <Progress value={96.4} className="h-1.5" indicatorClassName="bg-emerald-500" />
                  </div>

                  {/* Exam Authoring Privilege (مجوز طراحی آزمون) */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        مجوز طراحی آزمون
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {(mentorExamPrivileges[mentor.id] ?? Boolean(mentor.canCreateExams))
                          ? "مجاز به ایجاد و ویرایش آزمون"
                          : "غیرفعال (فاقد دسترسی طراحی)"}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={(mentorExamPrivileges[mentor.id] ?? Boolean(mentor.canCreateExams)) ? "default" : "outline"}
                      disabled={togglingMentorId === mentor.id}
                      onClick={() =>
                        handleToggleMentorExamPrivilege(
                          mentor.id,
                          mentorExamPrivileges[mentor.id] ?? Boolean(mentor.canCreateExams)
                        )
                      }
                      className={`text-xs h-7 px-3 flex items-center gap-1.5 ${
                        (mentorExamPrivileges[mentor.id] ?? Boolean(mentor.canCreateExams))
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {(mentorExamPrivileges[mentor.id] ?? Boolean(mentor.canCreateExams)) ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>فعال</span>
                        </>
                      ) : (
                        <span>غیرفعال</span>
                      )}
                    </Button>
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
                <span>پیگیری داوطلبان نیازمند رسیدگی (هشدار و اولویت بالا)</span>
              </h3>

              {/* Course & Risk Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {uniqueCourses.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-semibold">دوره:</span>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="ALL">همه دوره‌ها</option>
                      {uniqueCourses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
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
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-muted border-b border-border text-muted-foreground">
                  <tr>
                    <th className="p-3 text-start">نام داوطلب</th>
                    <th className="p-3 text-start">دوره آموزشی</th>
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
                      <td className="p-3 text-muted-foreground text-[11px] font-medium">
                        {st.enrolledCourseName || "دوره طلایی آمادگی وکالت ۳۶۰"}
                      </td>
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
                    <option value="ShieldAlert">نماد پایش و نظارت</option>
                    <option value="CalendarCheck">نماد برنامه راهبردی</option>
                    <option value="BarChart3">نماد آمار و نمودار زمان‌بندی</option>
                    <option value="Headphones">نماد مشاوره و تماس تلفنی</option>
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
                    placeholder="نام دوره آموزشی یا طرح"
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

        {/* ==================================================================== */}
        {/* TAB 6: MASHAHIR ENTITLED COURSES MANAGEMENT                          */}
        {/* ==================================================================== */}
        {activeTab === "MASHAHIR_COURSES" && (
          <div className="space-y-6">
            {/* Header & Instructions */}
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  <span>پیکربندی دوره‌های دارای بسته پشتیبانی ۳۶۰ درجه مشاهیر دانش</span>
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  کدهای دوره‌هایی که در سامانه مرکزی مشاهیر دانش ثبت‌نام می‌شوند در این بخش تنظیم می‌گردند. در صورتی که دوره خریداری‌شده داوطلب در این فهرست با پرچم پشتیبانی فعال ثبت شده باشد، دسترسی به داشبورد پشتیبانی به وی اعطا می‌شود؛ در غیر این صورت به صفحه راهنمای ارتقا هدایت می‌گردد.
                </p>
              </div>
              <Badge variant="green" className="shrink-0 text-xs px-3 py-1">
                {toPersianDigits(coursesList.length)} دوره ثبت‌شده
              </Badge>
            </div>

            {courseFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                  courseFeedback.includes("موفقیت")
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{courseFeedback}</span>
              </div>
            )}

            {/* Add New Course Form */}
            <Card className="border border-border bg-card p-5 rounded-2xl space-y-4 shadow-sm">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>افزودن یا به‌روزرسانی کد دوره مشاهیر دانش</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    کد دوره مشاهیر دانش (Course Code):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="مثال: MASHAHIR-BAR-360"
                    className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block">
                    عنوان کامل دوره مشاهیر دانش:
                  </label>
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="مثال: دوره طلایی جامع آمادگی آزمون وکالت کانون و مرکز وکلا"
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <label className="text-xs font-semibold text-foreground block">
                    توضیحات تکمیلی دوره (جهت نمایش در صفحه ارتقا):
                  </label>
                  <input
                    type="text"
                    value={newCourseDesc}
                    onChange={(e) => setNewCourseDesc(e.target.value)}
                    placeholder="توضیح مختصر خدمات پشتیبانی، آزمون‌ها و مشاوران این دوره"
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground block">
                    مبلغ و شهریه دوره:
                  </label>
                  <input
                    type="text"
                    value={newCoursePrice}
                    onChange={(e) => setNewCoursePrice(e.target.value)}
                    placeholder="مثال: ۵,۸۰۰,۰۰۰ تومان"
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block">
                    لینک ثبت‌نام دوره در وب‌سایت مشاهیر دانش:
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={newCourseUrl}
                    onChange={(e) => setNewCourseUrl(e.target.value)}
                    placeholder="https://mashahiredanesh.com/courses/bar-exam"
                    className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={newCourseHasSupport}
                    onChange={(e) => setNewCourseHasSupport(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>این دوره شامل بسته پشتیبانی آموزشی ۳۶۰ درجه مشاهیر دانش است</span>
                </label>

                <Button
                  onClick={handleSaveCourse}
                  disabled={isSavingCourse}
                  className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  <Plus className="h-4 w-4 me-1.5" />
                  {isSavingCourse ? "در حال ثبت..." : "ذخیره و فعال‌سازی دوره"}
                </Button>
              </div>
            </Card>

            {/* Configured Courses List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground">
                فهرست دوره‌های ثبت‌شده در سامانه ({toPersianDigits(coursesList.length)} دوره):
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coursesList.map((course) => (
                  <Card
                    key={course.id}
                    className={`border p-4 rounded-xl flex flex-col justify-between transition-all ${
                      course.isActive
                        ? "border-border bg-card shadow-xs"
                        : "border-border/50 bg-muted/20 opacity-70"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold bg-muted text-foreground px-2 py-0.5 rounded border border-border">
                          {course.courseCode}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={course.hasSupport ? "green" : "outline"} className="text-[10px]">
                            {course.hasSupport ? "دارای پشتیبانی ۳۶۰" : "دوره عادی"}
                          </Badge>
                          <Badge variant={course.isActive ? "default" : "secondary"} className="text-[10px]">
                            {course.isActive ? "فعال" : "غیرفعال"}
                          </Badge>
                        </div>
                      </div>

                      <h5 className="font-bold text-sm text-foreground">{course.courseName}</h5>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}

                      <div className="text-xs text-muted-foreground flex items-center justify-between pt-1">
                        <span>شهریه: <strong className="text-foreground">{course.priceFormatted}</strong></span>
                        <a
                          href={course.garnetPurchaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#004071] hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>مشاهده در سامانه مشاهیر دانش</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleCourseStatus(course.id, course.isActive)}
                        className="text-xs h-8"
                      >
                        {course.isActive ? "غیرفعال‌سازی" : "فعال‌سازی مجدد"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCourse(course.id)}
                        className="text-xs h-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 me-1" />
                        <span>حذف دوره</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* ==================================================================== */}
      {/* MODAL 1: SUPERVISOR READ-ONLY MIRROR INSPECTOR (Requirement 8)       */}
      {/* ==================================================================== */}
      {inspectingSupervisor && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border-2 border-amber-500/40 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative my-8 animate-in fade-in-50 zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-bold text-foreground">
                    اشراف و بازرسی زنده گروه آموزشی سرپرستی: {inspectingSupervisor.fullName}
                  </h3>
                  <Badge variant="outline" className="text-amber-500 border-amber-500/40 bg-amber-500/10 text-xs">
                    حالت اشراف مستقیم مدیریت (Mirror Mode)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  مشاهده مستقیم اطلاعات، بار کاری پشتیبانان و وضعیت داوطلبان این گروه آموزشی بدون مداخله در دسترسی‌ها
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectingSupervisor(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">نام کاربری سرپرست</span>
                <span className="text-xs font-bold text-foreground font-mono">{inspectingSupervisor.username}</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">پشتیبانان گروه آموزشی</span>
                <span className="text-sm font-bold text-foreground persian-nums">{toPersianDigits(inspectingSupervisor.mentorsCount)} نفر</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">کل داوطلبان دوره</span>
                <span className="text-sm font-bold text-foreground persian-nums">{toPersianDigits(inspectingSupervisor.studentsCount)} نفر</span>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/30">
                <span className="text-[11px] text-rose-700 dark:text-rose-400 block">پرونده‌های بحرانی باز</span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 persian-nums">{toPersianDigits(inspectingSupervisor.openTriageCount)} مورد</span>
              </div>
            </div>

            {/* Cohort Mentors Overview */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>فهرست پشتیبانان زیرمجموعه این سرپرستی:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
                {mentors.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-foreground">{m.fullName}</p>
                      <p className="text-[11px] text-muted-foreground">داخلی {m.sipExtension} • {toPersianDigits(m.studentsCount)} داوطلب</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setInspectingSupervisor(null);
                        setInspectingMentor(m);
                      }}
                      className="text-[11px] h-7 px-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-300"
                    >
                      اشراف پشتیبان
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingSupervisor(null)}
                className="text-xs"
              >
                بستن پنجره بازرسی
              </Button>
              <Link href="/supervisor">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>ورود مستقیم به پنل کامل سرپرست</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: MENTOR READ-ONLY MIRROR INSPECTOR (Requirement 8)           */}
      {/* ==================================================================== */}
      {inspectingMentor && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border-2 border-indigo-500/40 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative my-8 animate-in fade-in-50 zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-foreground">
                    اشراف و بازرسی مستقیم کارتابل پشتیبان: {inspectingMentor.fullName}
                  </h3>
                  <Badge variant="outline" className="text-indigo-500 border-indigo-500/40 bg-indigo-500/10 text-xs">
                    حالت اشراف مستقیم مدیریت (Mirror Mode)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  بررسی عملکرد، تماس‌های امن زویپر، رعایت استانداردهای مکالمه و پرونده‌های تحت نظر این پشتیبان
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setInspectingMentor(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mentor Performance Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">داخلی Zoiper AMI</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">{inspectingMentor.sipExtension}</span>
              </div>
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <span className="text-[11px] text-muted-foreground block">داوطلبان تحت نظر</span>
                <span className="text-sm font-bold text-foreground persian-nums">{toPersianDigits(inspectingMentor.studentsCount)} نفر</span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">تماس‌های امن برقرارشده</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 persian-nums">{toPersianDigits(inspectingMentor.callsCount)} تماس</span>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/30">
                <span className="text-[11px] text-indigo-700 dark:text-indigo-400 block">بحران‌های حل‌شده</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 persian-nums">{toPersianDigits(inspectingMentor.resolvedTriageCount)} مورد</span>
              </div>
            </div>

            {/* Students List under this mentor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>داوطلبان منتسب به این پشتیبان:</span>
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  تعداد داوطلبان: {toPersianDigits(students.filter((s) => s.mentorName === inspectingMentor.fullName).length)} نفر
                </span>
              </div>

              <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-muted text-muted-foreground border-b border-border sticky top-0">
                    <tr>
                      <th className="p-2.5 text-start">نام داوطلب</th>
                      <th className="p-2.5 text-start">دوره ثبت‌نامی</th>
                      <th className="p-2.5 text-start">مطالعه هفتگی</th>
                      <th className="p-2.5 text-start">وضعیت ریسک</th>
                      <th className="p-2.5 text-start">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students
                      .filter((s) => s.mentorName === inspectingMentor.fullName)
                      .map((st) => (
                        <tr key={st.id} className="hover:bg-muted/40">
                          <td className="p-2.5 font-bold text-foreground">{st.fullName}</td>
                          <td className="p-2.5 text-muted-foreground text-[11px]">{st.enrolledCourseName || "دوره وکالت"}</td>
                          <td className="p-2.5 persian-nums">{toPersianDigits(st.weeklyHours)} ساعت</td>
                          <td className="p-2.5">
                            <Badge
                              variant={st.riskStatus === "GREEN" ? "green" : st.riskStatus === "YELLOW" ? "yellow" : "red"}
                              className="text-[10px]"
                            >
                              {st.riskStatus === "GREEN" ? "پایدار" : st.riskStatus === "YELLOW" ? "هشدار" : "بحران"}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Link href={`/mentor/student/${st.id}`}>
                              <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-primary">
                                پرونده ۳۶۰°
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {students.filter((s) => s.mentorName === inspectingMentor.fullName).length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">
                          داوطلبی با انتساب مستقیم به این پشتیبان در این گروه آموزشی یافت نشد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingMentor(null)}
                className="text-xs"
              >
                بستن پنجره بازرسی
              </Button>
              <div className="flex items-center gap-2">
                <Link href="/mentor/students">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                  >
                    <span>داشبورد داوطلبان پشتیبان</span>
                  </Button>
                </Link>
                <Link href="/mentor/triage">
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>کارتابل عارضه‌یابی و تریاژ</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
