"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  ArrowRight,
  User,
  Sliders,
} from "lucide-react";
import {
  createWeeklyPlanTemplateAction,
  applyTailoredPlanToStudentAction,
} from "@/server/actions/plans";
import type { WeeklyPlanTemplateRecord, ScheduleItemRecord } from "@/types/models";

interface StudentItem {
  id: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  mentorName: string;
  scheduleItems: Array<{
    dayOfWeek: number;
    subject: string;
    activityType: ScheduleItemRecord["activityType"];
    topicDescription: string;
    targetVolume: string;
    targetDurationMinutes: number;
    isCatchup: boolean;
  }>;
}

interface PlansClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  templates: WeeklyPlanTemplateRecord[];
  students: StudentItem[];
  initialStudentId?: string;
}

const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
const LEGAL_SUBJECTS = [
  "حقوق مدنی",
  "آیین دادرسی مدنی",
  "حقوق تجارت",
  "حقوق جزا (عمومی و اختصاصی)",
  "آیین دادرسی کیفری",
  "اصول و متون فقه",
];

export function PlansClient({ currentUser, templates: initialTemplates, students, initialStudentId }: PlansClientProps) {
  const [activeTab, setActiveTab] = useState<"TEMPLATES" | "STUDENT_TAILOR">("STUDENT_TAILOR");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template creation state (Supervisor/CEO)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateCohort, setTemplateCohort] = useState("دوره جامع کانون وکلا ۱۴۰۳");
  const [templateGoal, setTemplateGoal] = useState("");
  const [templateItems, setTemplateItems] = useState<Array<Omit<ScheduleItemRecord, "id" | "scheduleId">>>([
    {
      dayOfWeek: 0,
      subject: "حقوق مدنی",
      activityType: "STATUTE_READ",
      topicDescription: "عقود معین و تعهدات - ماده ۱۸۳ تا ۲۳۰",
      targetVolume: "۴۵ ماده قانونی + ۳۰ تست",
      targetDurationMinutes: 120,
      isCatchup: false,
      status: "NOT_DONE",
    },
    {
      dayOfWeek: 0,
      subject: "آیین دادرسی مدنی",
      activityType: "TEST_PRACTICE",
      topicDescription: "صلاحیت مراجع دادگستری",
      targetVolume: "۴۰ تست تحلیلی",
      targetDurationMinutes: 90,
      isCatchup: false,
      status: "NOT_DONE",
    },
  ]);

  // Determine initial student based on initialStudentId
  const foundInitialStudent = initialStudentId
    ? students.find((s) => s.id === initialStudentId)
    : null;
  const activeInitialStudent = foundInitialStudent || students[0] || null;

  // Student Tailoring State (Mentor/Supervisor/CEO)
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(activeInitialStudent);
  const [tailoredGoal, setTailoredGoal] = useState("برنامه شخصی‌سازی شده با اولویت تقویت مباحث ضعف");
  const [tailoredItems, setTailoredItems] = useState<Array<Omit<ScheduleItemRecord, "id" | "scheduleId">>>(
    activeInitialStudent?.scheduleItems.map((it) => ({
      dayOfWeek: it.dayOfWeek,
      subject: it.subject,
      activityType: it.activityType as ScheduleItemRecord["activityType"],
      topicDescription: it.topicDescription,
      targetVolume: it.targetVolume,
      targetDurationMinutes: it.targetDurationMinutes,
      isCatchup: it.isCatchup,
      status: "NOT_DONE",
    })) || []
  );

  const isSupervisorOrAbove = currentUser.role === "SUPERVISOR" || currentUser.role === "CEO" || currentUser.role === "ADMIN";

  // Handle switching student
  const handleStudentSelect = (student: StudentItem) => {
    setSelectedStudent(student);
    if (student.scheduleItems.length > 0) {
      setTailoredItems(
        student.scheduleItems.map((it) => ({
          dayOfWeek: it.dayOfWeek,
          subject: it.subject,
          activityType: it.activityType as ScheduleItemRecord["activityType"],
          topicDescription: it.topicDescription,
          targetVolume: it.targetVolume,
          targetDurationMinutes: it.targetDurationMinutes,
          isCatchup: it.isCatchup,
          status: "NOT_DONE",
        }))
      );
    } else {
      setTailoredItems([]);
    }
  };

  // Load from supervisor template into student's plan
  const handleLoadTemplateIntoStudent = (templateId: string) => {
    const tpl = initialTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setTailoredGoal(tpl.weeklyMainGoal);
    setTailoredItems(
      tpl.items.map((it) => ({
        ...it,
        status: "NOT_DONE",
      }))
    );
    setFeedback({
      type: "success",
      text: `تمپلیت «${tpl.title}» با موفقیت در فرم داوطلب بارگذاری شد. اکنون می‌توانید آن را شخصی‌سازی و ثبت فرمایید.`,
    });
  };

  const handleAddTailoredItem = () => {
    setTailoredItems([
      ...tailoredItems,
      {
        dayOfWeek: 0,
        subject: "حقوق مدنی",
        activityType: "STUDY",
        topicDescription: "سرفصل جدید",
        targetVolume: "۲۰ تست و مطالعه متن قانون",
        targetDurationMinutes: 90,
        isCatchup: false,
        status: "NOT_DONE",
      },
    ]);
  };

  const handleRemoveTailoredItem = (index: number) => {
    setTailoredItems(tailoredItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateTailoredItem = <K extends keyof Omit<ScheduleItemRecord, "id" | "scheduleId">>(
    index: number,
    field: K,
    value: Omit<ScheduleItemRecord, "id" | "scheduleId">[K]
  ) => {
    const updated = [...tailoredItems];
    updated[index] = { ...updated[index], [field]: value };
    setTailoredItems(updated);
  };

  const handleSaveTailoredPlan = async () => {
    if (!selectedStudent) return;
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const res = await applyTailoredPlanToStudentAction({
        studentProfileId: selectedStudent.id,
        weeklyMainGoal: tailoredGoal,
        items: tailoredItems,
      });

      if (res.success) {
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ثبت و ارسال برنامه هفتگی داوطلب." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Template creation handler
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!templateTitle || !templateGoal) {
      setFeedback({ type: "error", text: "عنوان تمپلیت و هدف اصلی الزامی است." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createWeeklyPlanTemplateAction({
        title: templateTitle,
        jalaliYear: 1403,
        jalaliWeekNumber: 8,
        targetCohort: templateCohort,
        weeklyMainGoal: templateGoal,
        items: templateItems,
      });

      if (res.success) {
        setFeedback({ type: "success", text: res.message });
        setIsCreatingTemplate(false);
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ایجاد تمپلیت هفتگی." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">موتور طراحی و شخصی‌سازی برنامه‌های هفتگی</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.role === "CEO"
              ? "نظارت و ارزیابی برنامه‌های هفتگی داوطلبین"
              : currentUser.role === "SUPERVISOR"
              ? "طراحی تمپلیت‌های استاندارد هفتگی برای دوره آموزشی داوطلبان و پایش شخصی‌سازی پشتیبانان"
              : "شخصی‌سازی و تنظیم تمپلیت‌های سرپرستی متناسب با محدودیت‌ها و نقاط ضعف هر داوطلب"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-semibold">
            {currentUser.role === "CEO" ? "دسترسی عالیه مدیرعامل" : currentUser.role === "SUPERVISOR" ? "دسترسی سرپرست گروه آموزشی" : "دسترسی پشتیبان آموزشی"}
          </Badge>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
              : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("STUDENT_TAILOR")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "STUDENT_TAILOR" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Sliders className="h-4 w-4" />
          شخصی‌سازی برنامه داوطلبان ({students.length} داوطلب)
        </button>

        <button
          onClick={() => setActiveTab("TEMPLATES")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "TEMPLATES" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Layers className="h-4 w-4" />
          تمپلیت‌های دوره‌های آموزشی سرپرستی ({initialTemplates.length})
        </button>
      </div>

      {/* TAB 1: STUDENT TAILORING */}
      {activeTab === "STUDENT_TAILOR" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Student Selector: 4 cols */}
          <Card className="md:col-span-4 border border-border h-fit">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs font-bold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                انتخاب داوطلب جهت شخصی‌سازی برنامه
              </CardTitle>
            </CardHeader>
            <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
              {students.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handleStudentSelect(st)}
                  className={`p-3 cursor-pointer transition-colors text-xs space-y-1 ${
                    selectedStudent?.id === st.id ? "bg-primary/10 border-s-4 border-primary font-bold" : "hover:bg-muted/40"
                  }`}
                >
                  <p className="text-foreground">{st.fullName}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-normal">
                    <span>کد ملی: <span className="font-mono">{st.nationalId}</span></span>
                    <span>پشتیبان: {st.mentorName}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Plan Editor: 8 cols */}
          <div className="md:col-span-8 space-y-4">
            {selectedStudent ? (
              <Card className="border border-border">
                <CardHeader className="p-4 bg-muted/30 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      تنظیم برنامه هفتگی: {selectedStudent.fullName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      شنبه تا جمعه - دروس ۶ گانه کانون وکلا
                    </p>
                  </div>

                  {/* Load from supervisor template button */}
                  {initialTemplates.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) handleLoadTemplateIntoStudent(e.target.value);
                        }}
                        className="text-xs px-2 py-1.5 border border-border rounded bg-background"
                        defaultValue=""
                      >
                        <option value="" disabled>بارگذاری از تمپلیت سرپرست...</option>
                        {initialTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">هدف محوری هفته</label>
                    <input
                      type="text"
                      value={tailoredGoal}
                      onChange={(e) => setTailoredGoal(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                      placeholder="هدف اصلی مطالعاتی این هفته داوطلب"
                    />
                  </div>

                  {/* Plan Items List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">مباحث برنامه‌ریزی شده ({tailoredItems.length} مبحث):</span>
                      <Button size="sm" variant="outline" onClick={handleAddTailoredItem} className="text-xs h-7">
                        <Plus className="h-3 w-3 ms-1" />
                        افزودن مبحث مطالعاتی
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {tailoredItems.map((item, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 border border-border rounded-lg space-y-2 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-0.5">روز هفته</label>
                              <select
                                value={item.dayOfWeek}
                                onChange={(e) => handleUpdateTailoredItem(idx, "dayOfWeek", Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                              >
                                {DAY_NAMES.map((d, i) => (
                                  <option key={i} value={i}>{d}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-0.5">ماده درسی</label>
                              <select
                                value={item.subject}
                                onChange={(e) => handleUpdateTailoredItem(idx, "subject", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                              >
                                {LEGAL_SUBJECTS.map((s, i) => (
                                  <option key={i} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-0.5">نوع فعالیت</label>
                              <select
                                value={item.activityType}
                                onChange={(e) => handleUpdateTailoredItem(idx, "activityType", e.target.value as ScheduleItemRecord["activityType"])}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                              >
                                <option value="STUDY">مطالعه مفهومی و کتب مرجع</option>
                                <option value="STATUTE_READ">نص‌خوانی و مطالعه مواد قانونی</option>
                                <option value="TEST_PRACTICE">تست‌زنی آموزشی و مهارتی</option>
                                <option value="TEST_STUDY">تحلیل و بررسی تست</option>
                                <option value="REVIEW">مرور و بازخوانی نکات</option>
                                <option value="CLASS">کلاس و تدریس اساتید</option>
                                <option value="EXAM_ANALYSIS">تحلیل آزمون آزمایشی</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-0.5">مدت زمان (دقیقه)</label>
                              <input
                                type="number"
                                value={item.targetDurationMinutes}
                                onChange={(e) => handleUpdateTailoredItem(idx, "targetDurationMinutes", Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-muted-foreground mb-0.5">سرفصل / مبحث تفصیلی</label>
                              <input
                                type="text"
                                value={item.topicDescription}
                                onChange={(e) => handleUpdateTailoredItem(idx, "topicDescription", e.target.value)}
                                placeholder="مثال: ماده ۱۸۳ تا ۲۲۰ قانون مدنی"
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-muted-foreground mb-0.5">حجم تکلیف (تست/صفحه)</label>
                              <input
                                type="text"
                                value={item.targetVolume}
                                onChange={(e) => handleUpdateTailoredItem(idx, "targetVolume", e.target.value)}
                                placeholder="مثال: ۳۵ تست"
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-3">
                              <label className="flex items-center gap-1.5 cursor-pointer text-[10px]">
                                <input
                                  type="checkbox"
                                  checked={item.isCatchup}
                                  onChange={(e) => handleUpdateTailoredItem(idx, "isCatchup", e.target.checked)}
                                  className="rounded border-border"
                                />
                                <span>مبحث جبرانی</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => handleRemoveTailoredItem(idx)}
                                className="text-red-500 hover:text-red-700"
                                title="حذف مبحث"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <Button onClick={handleSaveTailoredPlan} disabled={isSubmitting} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {isSubmitting ? "در حال ثبت و ارسال پیامک..." : "ثبت برنامه هفتگی داوطلب و ارسال پیامک"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-16 text-muted-foreground text-xs">
                داوطلبی انتخاب نشده است.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SUPERVISOR TEMPLATES */}
      {activeTab === "TEMPLATES" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">فهرست تمپلیت‌های دوره‌های آموزشی سرپرستی</h3>
            {isSupervisorOrAbove && (
              <Button size="sm" onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}>
                <Plus className="h-4 w-4 ms-1" />
                {isCreatingTemplate ? "انصراف" : "تعریف تمپلیت جدید سرپرستی"}
              </Button>
            )}
          </div>

          {/* Template Creation Form */}
          {isCreatingTemplate && isSupervisorOrAbove && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  ایجاد تمپلیت هفتگی جدید برای دوره آموزشی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">عنوان تمپلیت</label>
                      <input
                        type="text"
                        value={templateTitle}
                        onChange={(e) => setTemplateTitle(e.target.value)}
                        placeholder="مثال: برنامه استاندارد هفته نهم (تثبیت عقود معین)"
                        className="w-full px-3 py-2 text-xs border border-border rounded bg-background"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">دوره آموزشی هدف</label>
                      <input
                        type="text"
                        value={templateCohort}
                        onChange={(e) => setTemplateCohort(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-border rounded bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">هدف کلان هفته</label>
                    <input
                      type="text"
                      value={templateGoal}
                      onChange={(e) => setTemplateGoal(e.target.value)}
                      placeholder="هدف کلی هفته برای کلیه داوطلبان"
                      className="w-full px-3 py-2 text-xs border border-border rounded bg-background"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "در حال ثبت..." : "ذخیره تمپلیت سرپرستی"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Templates Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {initialTemplates.map((t) => (
              <Card key={t.id} className="border border-border">
                <CardHeader className="p-4 bg-muted/20 border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">{t.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">طراح: {t.authorName} | دوره آموزشی: {t.targetCohort}</p>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-xs">
                  <p className="text-muted-foreground font-medium">هدف اصلی: {t.weeklyMainGoal}</p>
                  <p className="text-muted-foreground">شامل {t.items.length} مبحث درسی شنبه تا جمعه</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
