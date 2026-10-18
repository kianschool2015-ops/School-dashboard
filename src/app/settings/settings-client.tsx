"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  KeyRound,
  MessageSquare,
  ShieldAlert,
  Send,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
  FileText,
  Clock,
  History,
  Trash2,
  Lock,
  PhoneCall,
  Video,
  PhoneOutgoing,
  Server,
  Wifi,
} from "lucide-react";
import { changePasswordAction } from "@/server/actions/auth";
import { saveSmsSettingsAction, testSmsDispatchAction } from "@/server/actions/sms";
import { importStudentWhitelistAction, removeWhitelistRecordAction } from "@/server/actions/whitelist";
import { submitEscalationTicketAction } from "@/server/actions/messages";
import { saveVoipSettingsAction, testVoipConnectionAction } from "@/server/actions/voip";
import { saveVideoSettingsAction } from "@/server/actions/video";
import type {
  SmsSettingsRecord,
  SmsLogRecord,
  StudentWhitelistRecord,
  EscalationTicketRecord,
  SmsTriggerEvent,
  VoipAmiSettings,
  VideoConferenceSettings,
} from "@/types/models";

interface SettingsClientProps {
  currentUser: {
    id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    nationalId?: string;
    hasPassword: boolean;
  };
  smsSettings: SmsSettingsRecord | null;
  smsLogs: SmsLogRecord[];
  whitelist: StudentWhitelistRecord[];
  escalationTickets: EscalationTicketRecord[];
  assignedMentor: { id: string; fullName: string; phoneNumber: string } | null;
  mentorsList: Array<{ id: string; fullName: string }>;
  voipSettings: VoipAmiSettings | null;
  videoSettings: VideoConferenceSettings | null;
}

export function SettingsClient({
  currentUser,
  smsSettings: initialSmsSettings,
  smsLogs: initialSmsLogs,
  whitelist: initialWhitelist,
  escalationTickets: initialTickets,
  assignedMentor,
  mentorsList,
  voipSettings: initialVoipSettings,
  videoSettings: initialVideoSettings,
}: SettingsClientProps) {
  // Tabs: "PROFILE" | "PASSWORD" | "ESCALATION" | "WHITELIST" | "SMS"
  const defaultTab = currentUser.role === "CEO" || currentUser.role === "ADMIN" ? "SMS" : "PROFILE";
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  // Status message banners
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ type: "error", text: "رمز عبور جدید و تکرار آن همخوانی ندارند." });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: "error", text: "کلمه عبور باید حداقل ۶ کاراکتر باشد." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePasswordAction(newPassword, oldPassword || "");
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "کلمه عبور با موفقیت به‌روزرسانی شد." });
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setFeedback({ type: "error", text: res.message || "خطا در تغییر کلمه عبور." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در برقراری ارتباط با سرور." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Escalation Ticket State (Student -> Supervisor)
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState<EscalationTicketRecord["reasonCategory"]>("MENTOR_UNRESPONSIVE");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketFile, setTicketFile] = useState<{ name: string; size: number; base64?: string } | null>(null);

  const handleTicketFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("حجم فایل نباید بیش از ۱۰ مگابایت باشد.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTicketFile({
        name: file.name,
        size: file.size,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!ticketSubject || !ticketDesc) {
      setFeedback({ type: "error", text: "لطفاً موضوع و شرح تیکت را وارد نمایید." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitEscalationTicketAction({
        subject: ticketSubject,
        reasonCategory: ticketCategory,
        description: ticketDesc,
        attachmentName: ticketFile?.name,
        attachmentUrl: ticketFile?.base64,
      });
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
        setTicketSubject("");
        setTicketDesc("");
        setTicketFile(null);
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ثبت تیکت ارجاع." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Whitelist / Excel Import State
  const [whitelistRows, setWhitelistRows] = useState<Array<{ fullName: string; nationalId: string; phoneNumber: string; assignedMentorId?: string }>>([
    { fullName: "", nationalId: "", phoneNumber: "", assignedMentorId: mentorsList[0]?.id || "usr_mentor1" },
  ]);

  const addWhitelistRow = () => {
    setWhitelistRows([...whitelistRows, { fullName: "", nationalId: "", phoneNumber: "", assignedMentorId: mentorsList[0]?.id || "usr_mentor1" }]);
  };

  const updateWhitelistRow = (index: number, field: string, value: string) => {
    const updated = [...whitelistRows];
    updated[index] = { ...updated[index], [field]: value };
    setWhitelistRows(updated);
  };

  const handleDownloadCsvTemplate = () => {
    const headers = "نام و نام خانوادگی,کد ملی,شماره موبایل,شناسه پشتیبان\n";
    const sample = "علی محمدی,0012345678,09121111111,usr_mentor1\nزهرا احمدی,0087654321,09122222222,usr_mentor1\n";
    const blob = new Blob(["﻿" + headers + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "mashahir_students_whitelist_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhitelistImport = async () => {
    setFeedback(null);
    const validRows = whitelistRows.filter((r) => r.fullName && r.nationalId && r.phoneNumber);
    if (validRows.length === 0) {
      setFeedback({ type: "error", text: "حداقل یک سطر کامل (نام، کد ملی، شماره موبایل) وارد نمایید." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await importStudentWhitelistAction(validRows);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
        setWhitelistRows([{ fullName: "", nationalId: "", phoneNumber: "", assignedMentorId: mentorsList[0]?.id || "usr_mentor1" }]);
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در بارگذاری فهرست مجاز." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. SMS Settings State (Manager / CEO)
  const [smsSettings, setSmsSettings] = useState<SmsSettingsRecord>(
    initialSmsSettings || {
      id: "sms_conf_default",
      provider: "KAVENEGAR",
      apiKey: "",
      senderNumber: "10008585",
      senderLine: "10008585",
      isActive: true,
      triggers: {
        LOGIN: {
          event: "LOGIN",
          title: "ورود به سامانه",
          description: "ارسال پیامک کد یکبار مصرف یا ورود به سامانه",
          isEnabled: true,
          templateMessage: "کد ورود شما به پشتیبانی مشاهیر دانش: {token}",
        },
        MENTOR_CONTACT: {
          event: "MENTOR_CONTACT",
          title: "تماس پشتیبان",
          description: "ثبت تماس و مشاوره پشتیبان",
          isEnabled: true,
          templateMessage: "داوطلب گرامی، گزارش تماس پشتیبان شما ثبت شد. پشتیبانی مشاهیر دانش",
        },
        TRIAGE_RESOLVED: {
          event: "TRIAGE_RESOLVED",
          title: "حل موانع و پایش",
          description: "ثبت راهکار و رفع چالش تحصیلی",
          isEnabled: true,
          templateMessage: "پرونده تحصیلی شما توسط پشتیبان بررسی و رفع هشدار شد. پشتیبانی مشاهیر دانش",
        },
        WEEKLY_PLAN_ASSIGNED: {
          event: "WEEKLY_PLAN_ASSIGNED",
          title: "برنامه هفتگی",
          description: "تخصیص یا ویرایش برنامه هفتگی",
          isEnabled: true,
          templateMessage: "برنامه مطالعاتی هفته جدید شما در سامانه پشتیبانی مشاهیر دانش بارگذاری شد.",
        },
        TASK_ASSIGNED: {
          event: "TASK_ASSIGNED",
          title: "ارجاع تسک",
          description: "ارجاع تسک سازمانی جدید",
          isEnabled: true,
          templateMessage: "یک تسک سازمانی جدید برای شما ثبت گردید. پشتیبانی مشاهیر دانش",
        },
        EXAM_PUBLISHED: {
          event: "EXAM_PUBLISHED",
          title: "انتشار آزمون",
          description: "انتشار آزمون ارزیابی زمان‌دار",
          isEnabled: true,
          templateMessage: "آزمون ارزیابی جدید پشتیبانی مشاهیر دانش فعال شد. مهلت شرکت محدود است.",
        },
        MESSAGE_RECEIVED: {
          event: "MESSAGE_RECEIVED",
          title: "دریافت پیام",
          description: "دریافت پیام یا تیکت جدید",
          isEnabled: true,
          templateMessage: "شما یک پیام جدید در سامانه پشتیبانی مشاهیر دانش دارید.",
        },
        WHITELIST_INVITE: {
          event: "WHITELIST_INVITE",
          title: "دعوتنامه ثبت‌نام",
          description: "دعوتنامه ثبت‌نام از فهرست مجاز",
          isEnabled: true,
          templateMessage: "داوطلب گرامی، پروفایل شما در سامانه پشتیبانی مشاهیر دانش فعال گردید. جهت ورود: {link}",
        },
      },
      updatedAt: new Date(),
    }
  );

  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("پیامک آزمایشی از سامانه پشتیبانی مشاهیر دانش");

  const handleSmsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await saveSmsSettingsAction(smsSettings);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ذخیره تنظیمات کاوه‌نگار." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhone) {
      alert("لطفاً شماره تلفن همراه را وارد نمایید.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await testSmsDispatchAction(testPhone, testMessage);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در تست ارسال پیامک." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Issabel Asterisk AMI VoIP State (Manager Only)
  const [voipSettings, setVoipSettings] = useState<VoipAmiSettings>(
    initialVoipSettings || {
      id: "voip_default",
      host: "192.168.1.50",
      port: 5038,
      username: "msh_ami",
      secret: "",
      context: "from-internal",
      channelTech: "SIP",
      trunk: "TRUNK_IRANCELL_E1",
      callerId: "02191000000",
      isActive: true,
      mentorExtensions: { usr_mentor_1: "101", usr_mentor_2: "102" },
      updatedAt: new Date(),
    }
  );
  const [amiTestResult, setAmiTestResult] = useState<{ success: boolean; message: string; rawResponse?: string } | null>(null);
  const [isTestingAmi, setIsTestingAmi] = useState(false);

  const handleVoipSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await saveVoipSettingsAction(voipSettings);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: "خطا در ذخیره تنظیمات ویپ." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در برقراری ارتباط با سرور." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmiTest = async () => {
    setAmiTestResult(null);
    setIsTestingAmi(true);
    try {
      const res = await testVoipConnectionAction(voipSettings);
      setAmiTestResult(res);
    } catch (err: unknown) {
      setAmiTestResult({
        success: false,
        message: err instanceof Error ? err.message : "خطای ناشناخته در تست AMI",
      });
    } finally {
      setIsTestingAmi(false);
    }
  };

  // 6. Custom Video Platform State (Manager Only)
  const [videoSettings, setVideoSettings] = useState<VideoConferenceSettings>(
    initialVideoSettings || {
      id: "vconf_default",
      platformName: "سامانه اختصاصی وبینار و وب‌کنفرانس مشاهیر دانش",
      serverUrl: "https://live.mashahirdanesh.com",
      apiKey: "",
      isEnabled: true,
    }
  );

  const handleVideoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await saveVideoSettingsAction(videoSettings);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
      } else {
        setFeedback({ type: "error", text: "خطا در ذخیره تنظیمات وبینار." });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در برقراری ارتباط با سرور." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isManager = currentUser.role === "CEO" || currentUser.role === "ADMIN";
  const isSupervisorOrAbove = isManager || currentUser.role === "SUPERVISOR";
  const isStudent = currentUser.role === "STUDENT";

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">مرکز تنظیمات و پیکربندی سامانه</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مدیریت دسترسی‌ها، رمز عبور، لیست سفید اکسل، درگاه پیامک کاوه‌نگار و تیکتینگ ارجاع
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 font-semibold">
            نقش فعال: {currentUser.role === "CEO" ? "مدیر ارشد / مدیرعامل" : currentUser.role === "SUPERVISOR" ? "سرپرست کوهورت" : currentUser.role === "MENTOR" ? "پشتیبان آموزشی" : "داوطلب آزمون وکالت"}
          </Badge>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => { setActiveTab("PROFILE"); setFeedback(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "PROFILE" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="h-4 w-4" />
          پروفایل کاربری
        </button>

        <button
          onClick={() => { setActiveTab("PASSWORD"); setFeedback(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "PASSWORD" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          رمز عبور ثابت
        </button>

        {isStudent && (
          <button
            onClick={() => { setActiveTab("ESCALATION"); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "ESCALATION" ? "bg-amber-600 text-white shadow-xs" : "text-amber-700 dark:text-amber-400 hover:bg-amber-50"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            ارجاع به سرپرست کوهورت (اضطراری)
          </button>
        )}

        {isSupervisorOrAbove && (
          <button
            onClick={() => { setActiveTab("WHITELIST"); setFeedback(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "WHITELIST" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            فهرست داوطلبان مجاز (Whitelist)
          </button>
        )}

        {isManager && (
          <>
            <button
              onClick={() => { setActiveTab("SMS"); setFeedback(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "SMS" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Radio className="h-4 w-4" />
              سامانه پیامک کاوه‌نگار و رویدادها
            </button>

            <button
              onClick={() => { setActiveTab("VOIP"); setFeedback(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "VOIP" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <PhoneCall className="h-4 w-4" />
              تلفن گویا و پروتکل AMI ایزابل (Zoiper)
            </button>

            <button
              onClick={() => { setActiveTab("VIDEO"); setFeedback(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "VIDEO" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Video className="h-4 w-4" />
              کلاس و وبینار مجازی اختصاصی
            </button>
          </>
        )}
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === "PROFILE" && (
        <Card className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              اطلاعات هویتی و پرسنلی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">نام و نام‌خانوادگی</p>
                <p className="text-base font-bold mt-1">{currentUser.fullName}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">شماره تلفن همراه (شناسه ورود)</p>
                <p className="text-base font-bold mt-1 font-mono">{currentUser.phoneNumber}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">کد ملی</p>
                <p className="text-base font-bold mt-1 font-mono">{currentUser.nationalId || "ثبت نشده"}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg border border-border/60">
                <p className="text-xs text-muted-foreground">وضعیت رمز عبور ثابت</p>
                <p className="text-base font-bold mt-1 flex items-center gap-1.5">
                  {currentUser.hasPassword ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> فعال (امکان لاگین بدون پیامک)
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <Lock className="h-4 w-4" /> غیرفعال (فقط پیامک OTP)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {isStudent && assignedMentor && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mt-4">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                  <User className="h-4 w-4" />
                  پشتیبان آموزشی اختصاصی شما
                </h4>
                <div className="mt-2 text-xs space-y-1 text-foreground">
                  <p>نام پشتیبان: <strong>{assignedMentor.fullName}</strong></p>
                  <p>شماره تماس مستقیم: <span className="font-mono">{assignedMentor.phoneNumber}</span></p>
                  <p className="text-muted-foreground mt-1">
                    * جهت ارسال گزارش و ارتباط روزانه، از بخش «پیام‌ها» استفاده فرمایید.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: FIXED PASSWORD */}
      {activeTab === "PASSWORD" && (
        <Card className="shadow-sm border border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              تنظیم و تغییر کلمه عبور ثابت
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              با تنظیم کلمه عبور ثابت، می‌توانید در کنار رمز یکبار مصرف (OTP)، در هر زمان با شماره موبایل و این پسورد وارد پنل خود شوید.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
              {currentUser.hasPassword && (
                <div>
                  <label className="block text-xs font-semibold mb-1">کلمه عبور فعلی</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="رمز عبور فعلی خود را وارد کنید"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1">کلمه عبور جدید (حداقل ۶ کاراکتر)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="رمز عبور جدید"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">تکرار کلمه عبور جدید</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز عبور جدید"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "در حال ثبت..." : "ذخیره کلمه عبور ثابت"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: STUDENT ESCALATION TO SUPERVISOR */}
      {activeTab === "ESCALATION" && isStudent && (
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              تذکر مهم درباره ارسال تیکت ارجاع به سرپرست کوهورت:
            </div>
            این درگاه نظارتی، مستقیماً توسط سرپرست ارشد کوهورت حقوق و وکالت بررسی می‌شود.
            لطفاً توجه فرمایید که ارتباطات روزانه، ارسال برنامه مطالعاتی و گزارش‌ها باید با پشتیبان اختصاصی صورت پذیرد.
            این بخش تنها در موارد اضطراری نظیر عدم پاسخگویی پشتیبان بیش از ۴۸ ساعت، تعارض جدی در برنامه، یا نیاز به ورود سرپرست طراحی شده است.
          </div>

          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-amber-600" />
                ثبت تیکت ارجاع جدید
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">عنوان تیکت</label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="مثال: عدم پاسخگویی پشتیبان در رفع اشکال ماده ۱۸۳ ق.م"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">دسته‌بندی موضوع</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as EscalationTicketRecord["reasonCategory"])}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    >
                      <option value="MENTOR_UNRESPONSIVE">عدم پاسخگویی یا غیبت پشتیبان</option>
                      <option value="PLAN_CONFLICT">تعارض در برنامه یا عدم تناسب تکالیف</option>
                      <option value="EMOTIONAL_CRISIS">بحران روحی، افت شدید انگیزه یا استرس مفرط</option>
                      <option value="OTHER">سایر موارد نیازمند مداخله سرپرستی</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">شرح کامل موضوع</label>
                  <textarea
                    rows={4}
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                    placeholder="جزییات واقعه، سابقه پیگیری با پشتیبان و درخواست دقیق خود را بیان کنید..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    پیوست مستندات (PDF، Word، تصویر یا اکسل تا سقف ۱۰ مگابایت)
                  </label>
                  <input
                    type="file"
                    onChange={handleTicketFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="text-xs"
                  />
                  {ticketFile && (
                    <p className="text-xs text-emerald-600 mt-1">
                      فایل پیوست شد: {ticketFile.name} ({(ticketFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {isSubmitting ? "در حال ثبت و ارسال به سرپرست..." : "ارسال تیکت به سرپرست کوهورت"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past tickets history */}
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                سوابق تیکت‌های ارجاعی به سرپرست
              </CardTitle>
            </CardHeader>
            <CardContent>
              {initialTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  تاکنون هیچ تیکت ارجاعی به سرپرست ثبت نکرده‌اید.
                </p>
              ) : (
                <div className="space-y-3">
                  {initialTickets.map((t) => (
                    <div key={t.id} className="p-3 bg-muted/30 rounded-lg border border-border/60 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{t.subject}</span>
                        <Badge
                          variant={t.status === "RESOLVED" ? "default" : t.status === "INVESTIGATING" ? "secondary" : "outline"}
                        >
                          {t.status === "RESOLVED" ? "حل شده" : t.status === "INVESTIGATING" ? "در حال بررسی سرپرست" : "در انتظار رسیدگی"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{t.description}</p>
                      {t.supervisorResponse && (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                          <strong>پاسخ سرپرست:</strong> {t.supervisorResponse}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: WHITELIST & EXCEL IMPORT */}
      {activeTab === "WHITELIST" && isSupervisorOrAbove && (
        <div className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  مدیریت فهرست مجاز داوطلبان (Pre-Approved Whitelist)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  طبق سیاست‌های موسسه، دکمه ثبت‌نام برای عموم باز است اما تنها داوطلبانی که نام و کد ملی آن‌ها توسط سرپرست یا مدیر در این لیست ثبت شده باشد مجاز به ایجاد حساب و ورود هستند. پس از ثبت، پیامک دعوت به صورت هوشمند برای داوطلب ارسال می‌گردد.
                </p>
              </div>
              <Button onClick={handleDownloadCsvTemplate} variant="outline" className="shrink-0 flex items-center gap-2">
                <Download className="h-4 w-4" />
                دانلود تمپلیت اکسل نمونه
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Manual/Batch Import Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-foreground">ورود مشخصات داوطلبان جدید:</h4>
                <div className="space-y-2">
                  {whitelistRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="نام و نام خانوادگی داوطلب"
                        value={row.fullName}
                        onChange={(e) => updateWhitelistRow(idx, "fullName", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-background"
                      />
                      <input
                        type="text"
                        placeholder="کد ملی (۱۰ رقم)"
                        value={row.nationalId}
                        onChange={(e) => updateWhitelistRow(idx, "nationalId", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-background font-mono"
                      />
                      <input
                        type="tel"
                        placeholder="شماره موبایل (09...)"
                        value={row.phoneNumber}
                        onChange={(e) => updateWhitelistRow(idx, "phoneNumber", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-background font-mono"
                      />
                      <select
                        value={row.assignedMentorId}
                        onChange={(e) => updateWhitelistRow(idx, "assignedMentorId", e.target.value)}
                        className="px-3 py-2 text-xs border border-border rounded-lg bg-background"
                      >
                        {mentorsList.map((m) => (
                          <option key={m.id} value={m.id}>
                            پشتیبان: {m.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={addWhitelistRow}>
                    + افزودن سطر دیگر
                  </Button>
                  <Button type="button" disabled={isSubmitting} onClick={handleWhitelistImport} className="ms-auto">
                    {isSubmitting ? "در حال ثبت و ارسال پیامک دعوت..." : "ثبت در لیست سفید و ارسال پیامک دعوت"}
                  </Button>
                </div>
              </div>

              {/* Whitelist Current Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-3 bg-muted/40 border-b border-border text-xs font-bold flex items-center justify-between">
                  <span>فهرست داوطلبان ثبت‌شده در لیست سفید ({initialWhitelist.length} نفر)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        <th className="p-2 text-start">نام داوطلب</th>
                        <th className="p-2 text-start">کد ملی</th>
                        <th className="p-2 text-start">شماره موبایل</th>
                        <th className="p-2 text-start">وضعیت حساب</th>
                        <th className="p-2 text-start">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {initialWhitelist.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="p-2 font-medium">{item.fullName}</td>
                          <td className="p-2 font-mono">{item.nationalId}</td>
                          <td className="p-2 font-mono">{item.phoneNumber}</td>
                          <td className="p-2">
                            <Badge variant={item.status === "REGISTERED" ? "default" : "outline"}>
                              {item.status === "REGISTERED" ? "پروفایل تکمیل‌شده" : "در انتظار تکمیل ثبت‌نام"}
                            </Badge>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={async () => {
                                if (confirm("آیا از حذف این داوطلب از فهرست مجاز اطمینان دارید؟")) {
                                  await removeWhitelistRecordAction(item.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                              title="حذف از لیست مجاز"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: KAVENEGAR SMS GATEWAY & EVENT TRIGGERS */}
      {activeTab === "SMS" && isManager && (
        <div className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary" />
                تنظیمات درگاه پیامک کاوه‌نگار (Kavenegar SMS Gateway)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                پیکربندی کلید وب‌سرویس REST API کاوه‌نگار، خط اختصاصی ارسال‌کننده، و سوییچ‌های شلیک پیامک به تفکیک فعالیت‌های سیستم.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSmsSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">ارائه‌دهنده پیامک</label>
                    <select
                      value={smsSettings.provider}
                      onChange={(e) => setSmsSettings({ ...smsSettings, provider: e.target.value as SmsSettingsRecord["provider"] })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    >
                      <option value="KAVENEGAR">کاوه‌نگار (Kavenegar Official REST API)</option>
                      <option value="FARAZ">فراز اس‌ام‌اس (FarazSMS)</option>
                      <option value="MOCK">شبیه‌ساز داخلی (Mock Dev Sandbox)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">کلید API کاوه‌نگار (API Key)</label>
                    <input
                      type="password"
                      value={smsSettings.apiKey}
                      onChange={(e) => setSmsSettings({ ...smsSettings, apiKey: e.target.value })}
                      placeholder="e.g. 7A656...484C"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">سرشماره اختصاصی ارسال</label>
                    <input
                      type="text"
                      value={smsSettings.senderLine}
                      onChange={(e) => setSmsSettings({ ...smsSettings, senderLine: e.target.value })}
                      placeholder="e.g. 10008585"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                    />
                  </div>
                </div>

                {/* Event Triggers Switcher Matrix */}
                <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-foreground">
                    رویدادهای عملیاتی فعال برای ارسال پیامک به داوطلبان:
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    طبق دستورالعمل مدیریت، رویداد «ورود به پنل» به صورت پیش‌فرض فعال است. سایر رویدادها را می‌توانید به دلخواه تنظیم فرمایید:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {Object.entries(smsSettings.triggers).map(([eventKey, trigger]) => {
                      const isLogin = eventKey === "LOGIN";
                      return (
                        <label
                          key={eventKey}
                          className={`flex items-start gap-2 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                            trigger.isEnabled
                              ? "bg-primary/5 border-primary/40 text-foreground"
                              : "bg-background border-border text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={trigger.isEnabled}
                            onChange={(e) => {
                              setSmsSettings({
                                ...smsSettings,
                                triggers: {
                                  ...smsSettings.triggers,
                                  [eventKey]: { ...trigger, isEnabled: e.target.checked },
                                },
                              });
                            }}
                            className="mt-0.5 rounded border-border"
                          />
                          <div>
                            <span className="font-semibold block">{trigger.description}</span>
                            <span className="text-[10px] text-muted-foreground">رویداد: {eventKey}</span>
                            {isLogin && <span className="text-[10px] text-primary block font-bold mt-0.5">(پیش‌فرض سیستم)</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات درگاه پیامک"}
                </Button>
              </form>

              {/* Test SMS Dispatcher */}
              <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  تست زنده ارسال پیامک کاوه‌نگار
                </h4>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="tel"
                    placeholder="شماره موبایل تست (0912...)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="px-3 py-2 text-xs border border-border rounded-lg bg-background font-mono w-full sm:w-60"
                  />
                  <input
                    type="text"
                    placeholder="متن پیامک آزمایشی"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="px-3 py-2 text-xs border border-border rounded-lg bg-background flex-1"
                  />
                  <Button type="button" onClick={handleSendTestSms} disabled={isSubmitting} variant="secondary" size="sm">
                    ارسال آزمایشی
                  </Button>
                </div>
              </div>

              {/* Live SMS Audit Log */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-3 bg-muted/40 border-b border-border text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    تاریخچه لاگ ارسال پیامک‌های سیستمی ({initialSmsLogs.length} پیامک)
                  </span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        <th className="p-2 text-start">گیرنده</th>
                        <th className="p-2 text-start">رویداد شلیک</th>
                        <th className="p-2 text-start">متن ارسالی</th>
                        <th className="p-2 text-start">وضعیت درگاه</th>
                        <th className="p-2 text-start">زمان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {initialSmsLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/10">
                          <td className="p-2 font-mono">{log.recipientPhone}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="text-[10px]">
                              {log.event}
                            </Badge>
                          </td>
                          <td className="p-2 max-w-xs truncate text-muted-foreground">{log.messageText}</td>
                          <td className="p-2">
                            <Badge variant={log.status === "DELIVERED" || log.status === "SENT" ? "default" : "destructive"} className="text-[10px]">
                              {log.status === "DELIVERED" ? "تحویل موفق" : log.status === "SENT" ? "ارسال شد" : "ناموفق"}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground text-[10px]">
                            {new Date(log.createdAt || log.sentAt).toLocaleTimeString("fa-IR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: ISSABEL VOIP & ASTERISK AMI (Manager Only) */}
      {isManager && activeTab === "VOIP" && (
        <div className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-indigo-500" />
                  تنظیمات وب‌سرویس Asterisk AMI و مرکز تماس Issabel (Zoiper)
                </span>
                <Badge variant={voipSettings.isActive ? "default" : "secondary"}>
                  {voipSettings.isActive ? "سرویس فعال" : "سرویس غیرفعال"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Architecture & Zoiper Privacy Notice */}
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2 text-xs text-foreground">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                  <ShieldAlert className="h-4 w-4" />
                  مکانیزم تماس امن دوطرفه با ماسک‌سازی کامل شماره داوطلب (Zero-Knowledge Phone Masking)
                </div>
                <p className="leading-relaxed">
                  پشتیبانان آموزشی، نرم‌افزار سافت‌فون <strong>Zoiper</strong> را روی تلفن همراه هوشمند خود نصب کرده و با شماره داخلی اختصاصی (اکستنشن SIP/PJSIP) به سرور ایزابل مشاهیر دانش متصل هستند. هنگام کلیک روی دکمه «تماس امن با داوطلب» در سامانه، سرور از طریق سوکت TCP پورت ۵۰۳۸ دستور <code>Originate</code> را به استریسک ارسال می‌کند:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pe-2">
                  <li>ابتدا گوشی پشتیبان (نرم‌افزار Zoiper) زنگ می‌خورد.</li>
                  <li>به محض پاسخگویی پشتیبان، ایزابل از طریق ترانک خروجی با شماره همراه داوطلب تماس گرفته و مکالمه را Bridge می‌کند.</li>
                  <li><strong>امنیت مطلق حریم خصوصی:</strong> شماره تلفن همراه داوطلب در کلاینت پشتیبان به شکل <span className="font-mono text-primary font-bold">۰۹۱۲***۰۰۰۵</span> ماسک شده و هرگز به مرورگر ارسال نمی‌گردد. داوطلب نیز تنها سرشماره رسمی مؤسسه مشاهیر دانش را به عنوان CallerID مشاهده می‌نماید.</li>
                </ul>
              </div>

              {/* Main Configuration Form */}
              <form onSubmit={handleVoipSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">آدرس سرور ایزابل / هاست استریسک</label>
                    <input
                      type="text"
                      value={voipSettings.host}
                      onChange={(e) => setVoipSettings({ ...voipSettings, host: e.target.value })}
                      placeholder="192.168.1.50 یا voip.mashahirdanesh.com"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">پورت پروتکل AMI (پیش‌فرض: 5038)</label>
                    <input
                      type="number"
                      value={voipSettings.port}
                      onChange={(e) => setVoipSettings({ ...voipSettings, port: Number(e.target.value) || 5038 })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">نام کاربری AMI (Manager User)</label>
                    <input
                      type="text"
                      value={voipSettings.username}
                      onChange={(e) => setVoipSettings({ ...voipSettings, username: e.target.value })}
                      placeholder="msh_ami"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">رمز عبور AMI (Secret Key)</label>
                    <input
                      type="password"
                      value={voipSettings.secret}
                      onChange={(e) => setVoipSettings({ ...voipSettings, secret: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">کانتکست دایل‌پلن (Asterisk Context)</label>
                    <input
                      type="text"
                      value={voipSettings.context}
                      onChange={(e) => setVoipSettings({ ...voipSettings, context: e.target.value })}
                      placeholder="from-internal"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">پروتکل داخلی‌ها (Channel Tech)</label>
                    <select
                      value={voipSettings.channelTech}
                      onChange={(e) => setVoipSettings({ ...voipSettings, channelTech: e.target.value as "SIP" | "PJSIP" })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                    >
                      <option value="SIP">SIP (chan_sip)</option>
                      <option value="PJSIP">PJSIP (chan_pjsip)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">ترانک خروجی استریسک (Outbound Trunk)</label>
                    <input
                      type="text"
                      value={voipSettings.trunk}
                      onChange={(e) => setVoipSettings({ ...voipSettings, trunk: e.target.value })}
                      placeholder="TRUNK_IRANCELL_E1"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">شماره نمایش CallerID مؤسسه</label>
                    <input
                      type="text"
                      value={voipSettings.callerId}
                      onChange={(e) => setVoipSettings({ ...voipSettings, callerId: e.target.value })}
                      placeholder="02191000000"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                    />
                  </div>
                </div>

                {/* Mentor Extension Mapping Table */}
                <div className="p-4 bg-muted/20 border border-border rounded-xl space-y-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    تخصیص شماره داخلی (Extension) به پشتیبانان در Zoiper
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    شماره داخلی رجیستر شده در اپلیکیشن Zoiper روی گوشی هر پشتیبان را وارد نمایید:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {mentorsList.map((mentor) => {
                      const currentExt = voipSettings.mentorExtensions[mentor.id] || "";
                      return (
                        <div key={mentor.id} className="p-3 bg-background border border-border rounded-lg space-y-1">
                          <span className="text-xs font-bold block">{mentor.fullName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">داخلی:</span>
                            <input
                              type="text"
                              value={currentExt}
                              onChange={(e) => {
                                setVoipSettings({
                                  ...voipSettings,
                                  mentorExtensions: {
                                    ...voipSettings.mentorExtensions,
                                    [mentor.id]: e.target.value.trim(),
                                  },
                                });
                              }}
                              placeholder="مثال: 101"
                              className="px-2 py-1 text-xs border border-border rounded font-mono w-24 bg-background"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={voipSettings.isActive}
                      onChange={(e) => setVoipSettings({ ...voipSettings, isActive: e.target.checked })}
                      className="rounded border-border"
                    />
                    فعال‌سازی سرویس برقراری تماس امن AMI در سامانه
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "در حال ذخیره..." : "ذخیره تنظیمات ایزابل AMI"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAmiTest}
                    disabled={isTestingAmi}
                    className="flex items-center gap-2 border-indigo-400/40 text-indigo-400 hover:bg-indigo-500/10"
                  >
                    <Wifi className="h-4 w-4" />
                    {isTestingAmi ? "در حال ارسال دستور تست..." : "آزمون زنده اتصال به Issabel AMI (Action: Ping)"}
                  </Button>
                </div>
              </form>

              {/* AMI Connection Test Live Result */}
              {amiTestResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    amiTestResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                      : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {amiTestResult.success ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
                    <span>{amiTestResult.message}</span>
                  </div>
                  {amiTestResult.rawResponse && (
                    <div className="p-2 bg-black/40 rounded font-mono text-[11px] overflow-x-auto text-emerald-400 dir-ltr text-start">
                      <pre>{amiTestResult.rawResponse}</pre>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 6: CUSTOM VIDEO CONFERENCING PLATFORM (Manager Only) */}
      {isManager && activeTab === "VIDEO" && (
        <div className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-purple-500" />
                  اتصال به سامانه اختصاصی وبینار و کلاس مجازی مشاهیر دانش
                </span>
                <Badge variant={videoSettings.isEnabled ? "default" : "secondary"}>
                  {videoSettings.isEnabled ? "سرویس فعال" : "سرویس غیرفعال"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2 text-xs text-foreground">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  پلتفرم آنلاین اختصاصی کلاس‌ها و جلسات هدایت تحصیلی اضطراری
                </div>
                <p className="leading-relaxed">
                  سامانه به بستر وبینار اختصاصی مؤسسه آموزش عالی مشاهیر دانش متصل بوده و امکان ایجاد کلاس‌های رفع اشکال هفتگی، وبینارهای سراسری کوهورت، و اتاق‌های جلسات هدایت تحصیلی و حل موانع با داوطلبان را به صورت بلادرنگ فراهم می‌آورد.
                </p>
              </div>

              <form onSubmit={handleVideoSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">نام سامانه ویدئوکنفرانس</label>
                    <input
                      type="text"
                      value={videoSettings.platformName}
                      onChange={(e) => setVideoSettings({ ...videoSettings, platformName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">آدرس سرور وبینار (Server URL)</label>
                    <input
                      type="url"
                      value={videoSettings.serverUrl}
                      onChange={(e) => setVideoSettings({ ...videoSettings, serverUrl: e.target.value })}
                      placeholder="https://live.mashahirdanesh.com"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1">کلید امنیتی اتصال API (JWT / Token)</label>
                    <input
                      type="password"
                      value={videoSettings.apiKey}
                      onChange={(e) => setVideoSettings({ ...videoSettings, apiKey: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={videoSettings.isEnabled}
                      onChange={(e) => setVideoSettings({ ...videoSettings, isEnabled: e.target.checked })}
                      className="rounded border-border"
                    />
                    فعال‌سازی برگزاری کلاس‌ها و مشاوره تصویری در سامانه
                  </label>
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "در حال ذخیره..." : "ذخیره تنظیمات سامانه کلاس مجازی"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
