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
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  Plus,
  BookOpen,
  ListChecks,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { changePasswordAction } from "@/server/actions/auth";
import { saveSmsSettingsAction, testSmsDispatchAction } from "@/server/actions/sms";
import { importStudentWhitelistAction, removeWhitelistRecordAction } from "@/server/actions/whitelist";
import { submitEscalationTicketAction } from "@/server/actions/messages";
import { saveVoipSettingsAction, testVoipConnectionAction } from "@/server/actions/voip";
import { saveVideoSettingsAction } from "@/server/actions/video";
import {
  updateSsoApiSettingsAction,
  testMashahirSsoConnectionAction,
  testSendSsoOtpAction,
  testVerifySsoOtpAction,
  testFetchUserProductsAction,
} from "@/server/actions/garnet";
import {
  saveEntitledCourseAction,
  toggleEntitledCourseStatusAction,
  deleteEntitledCourseAction,
} from "@/server/actions/admin-courses";
import { BulkExcelImport } from "@/components/supervisor/bulk-excel-import";
import { toPersianDigits } from "@/lib/jalali";
import type {
  SmsSettingsRecord,
  SmsLogRecord,
  StudentWhitelistRecord,
  EscalationTicketRecord,
  SmsTriggerEvent,
  VoipAmiSettings,
  VideoConferenceSettings,
  SsoApiSettingsRecord,
  EntitledCourseRecord,
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
  ssoSettings?: SsoApiSettingsRecord | null;
  entitledCourses?: EntitledCourseRecord[];
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
  ssoSettings: initialSsoSettings,
  entitledCourses: initialEntitledCourses = [],
}: SettingsClientProps) {
  // Tabs: "PROFILE" | "PASSWORD" | "ESCALATION" | "WHITELIST" | "SMS" | "VOIP" | "VIDEO" | "SSO"
  const defaultTab = currentUser.role === "CEO" || currentUser.role === "ADMIN" ? "SSO" : "PROFILE";
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
        MENTOR_ASSIGNED: {
          event: "MENTOR_ASSIGNED",
          title: "تخصیص پشتیبان",
          description: "اطلاع‌رسانی تعیین پشتیبان اختصاصی به داوطلب",
          isEnabled: true,
          templateMessage: "داوطلب گرامی {name}، پشتیبان اختصاصی شما ({mentor}) در مشاهیر دانش تعیین گردید.",
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

  // 6. Central SSO API Settings State (CEO/ADMIN Only)
  const [ssoSettings, setSsoSettings] = useState<SsoApiSettingsRecord>(
    initialSsoSettings || {
      id: "default",
      isEnabled: true,
      serviceTitle: "حساب کاربری مشاهیر دانش",
      baseUrl: "https://mashahiredanesh.com/GarnetAPI",
      loginEndpoint: "/auth/loginMobile",
      coursesEndpoint: "/user/courses",
      sendOtpEndpoint: "/users/sendVerificationCodeByMobile",
      verifyOtpEndpoint: "/users/checkVerificationCode",
      productsEndpoint: "/invoices/productListByUser",
      codeCount: 5,
      apiKeyHeader: "x-api-key",
      apiKeyValue: "d41d8cd98f00b204e9800998ecf8427e",
      mobileFieldName: "mobile",
      passwordFieldName: "password",
      successStatusCode: 2000,
      timeoutMs: 8000,
      autoCreateStudent: true,
      bypassCourseCheckIfNoEndpoint: true,
      updatedAt: new Date(),
    }
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  const [isSavingSso, setIsSavingSso] = useState(false);

  // 3-Stage Live API Connection Tester State
  const [testStageTab, setTestStageTab] = useState<"STAGE1_OTP" | "STAGE2_VERIFY" | "STAGE3_PRODUCTS" | "PASSWORD">("STAGE1_OTP");
  const [testSsoMobile, setTestSsoMobile] = useState("09123445103");
  const [testSsoPassword, setTestSsoPassword] = useState("");
  const [testOtpCode, setTestOtpCode] = useState("");
  const [isTestingSso, setIsTestingSso] = useState(false);
  const [isTestingStage1, setIsTestingStage1] = useState(false);
  const [isTestingStage2, setIsTestingStage2] = useState(false);
  const [isTestingStage3, setIsTestingStage3] = useState(false);

  const [stage1Result, setStage1Result] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
    rawPreview?: string;
  } | null>(null);

  const [stage2Result, setStage2Result] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
    token?: string;
    userInfo?: unknown;
    rawPreview?: string;
  } | null>(null);

  const [stage3Result, setStage3Result] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
    productsCount: number;
    products?: unknown[];
    rawPreview?: string;
  } | null>(null);

  const [ssoTestResult, setSsoTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs: number;
    statusCode?: number;
    extractedUser?: {
      id?: string;
      fullName?: string;
      nationalId?: string;
      mobile?: string;
      email?: string;
    };
    coursesCount?: number;
    rawPreview?: string;
  } | null>(null);

  // 7. Entitled Courses Management State (CEO/ADMIN Only)
  const [courses, setCourses] = useState<EntitledCourseRecord[]>(initialEntitledCourses);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCoursePrice, setNewCoursePrice] = useState("۵,۸۰۰,۰۰۰ تومان");
  const [newCoursePurchaseUrl, setNewCoursePurchaseUrl] = useState("https://mashahiredanesh.com/courses/");
  const [newCourseHasSupport, setNewCourseHasSupport] = useState(true);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [courseActionLoading, setCourseActionLoading] = useState<Record<string, boolean>>({});

  const handleSaveSsoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSso(true);
    setFeedback(null);
    try {
      const res = await updateSsoApiSettingsAction(ssoSettings);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
        if (res.settings) {
          setSsoSettings(res.settings);
        }
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ذخیره تنظیمات وب‌سرویس مشاهیر دانش." });
    } finally {
      setIsSavingSso(false);
    }
  };

  const handleTestSsoConnection = async () => {
    if (!testSsoMobile.trim()) {
      alert("لطفاً شماره موبایل تست را وارد نمایید.");
      return;
    }
    if (!testSsoPassword) {
      alert("لطفاً رمز عبور حساب تست را وارد نمایید.");
      return;
    }
    setIsTestingSso(true);
    setSsoTestResult(null);
    try {
      const res = await testMashahirSsoConnectionAction(
        testSsoMobile.trim(),
        testSsoPassword,
        ssoSettings
      );
      setSsoTestResult(res);
    } catch (err: unknown) {
      setSsoTestResult({
        success: false,
        message: (err as Error)?.message || "خطا در برقراری ارتباط با وب‌سرویس",
        latencyMs: 0,
      });
    } finally {
      setIsTestingSso(false);
    }
  };

  const handleTestStage1 = async () => {
    if (!testSsoMobile.trim()) {
      alert("لطفاً شماره موبایل تست را وارد نمایید.");
      return;
    }
    setIsTestingStage1(true);
    setStage1Result(null);
    try {
      const res = await testSendSsoOtpAction(testSsoMobile.trim(), ssoSettings);
      setStage1Result(res);
    } catch (err: unknown) {
      setStage1Result({
        success: false,
        message: (err as Error)?.message || "خطا در تست ارسال پیامک",
        latencyMs: 0,
      });
    } finally {
      setIsTestingStage1(false);
    }
  };

  const handleTestStage2 = async () => {
    if (!testSsoMobile.trim() || !testOtpCode.trim()) {
      alert("لطفاً شماره موبایل و کد تایید پیامکی را وارد نمایید.");
      return;
    }
    setIsTestingStage2(true);
    setStage2Result(null);
    try {
      const res = await testVerifySsoOtpAction(testSsoMobile.trim(), testOtpCode.trim(), ssoSettings);
      setStage2Result(res);
      if (res.token) {
        // Auto-feed into stage 3 if successful
      }
    } catch (err: unknown) {
      setStage2Result({
        success: false,
        message: (err as Error)?.message || "خطا در تست بررسی کد پیامکی",
        latencyMs: 0,
      });
    } finally {
      setIsTestingStage2(false);
    }
  };

  const handleTestStage3 = async () => {
    if (!testSsoMobile.trim()) {
      alert("لطفاً شماره موبایل تست را وارد نمایید.");
      return;
    }
    setIsTestingStage3(true);
    setStage3Result(null);
    try {
      const res = await testFetchUserProductsAction(testSsoMobile.trim(), ssoSettings);
      setStage3Result(res);
    } catch (err: unknown) {
      setStage3Result({
        success: false,
        message: (err as Error)?.message || "خطا در تست استعلام دوره‌ها",
        latencyMs: 0,
        productsCount: 0,
      });
    } finally {
      setIsTestingStage3(false);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseName.trim()) {
      setFeedback({ type: "error", text: "کد دوره و عنوان دوره الزامی هستند." });
      return;
    }
    setIsSavingCourse(true);
    setFeedback(null);
    try {
      const res = await saveEntitledCourseAction({
        courseCode: newCourseCode.trim(),
        courseName: newCourseName.trim(),
        description: newCourseDescription.trim(),
        priceFormatted: newCoursePrice.trim(),
        garnetPurchaseUrl: newCoursePurchaseUrl.trim(),
        hasSupport: newCourseHasSupport,
      });
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
        const normalizedCode = newCourseCode.trim().toUpperCase();
        setCourses((prev) => {
          const idx = prev.findIndex((c) => c.courseCode === normalizedCode);
          const newRec: EntitledCourseRecord = {
            id: `crs_${normalizedCode.toLowerCase()}`,
            courseCode: normalizedCode,
            courseName: newCourseName.trim(),
            description: newCourseDescription.trim() || null,
            priceFormatted: newCoursePrice.trim(),
            garnetPurchaseUrl: newCoursePurchaseUrl.trim(),
            hasSupport: newCourseHasSupport,
            supportTier: "FULL_360",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = newRec;
            return next;
          }
          return [newRec, ...prev];
        });
        setNewCourseCode("");
        setNewCourseName("");
        setNewCourseDescription("");
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } catch {
      setFeedback({ type: "error", text: "خطا در ذخیره دوره." });
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleToggleCourse = async (courseId: string, currentActive: boolean) => {
    setCourseActionLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await toggleEntitledCourseStatusAction(courseId, !currentActive);
      if (res.success) {
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, isActive: !currentActive } : c))
        );
      }
    } finally {
      setCourseActionLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("آیا از حذف این دوره از فهرست دوره‌های مجاز اطمینان دارید؟")) return;
    setCourseActionLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const res = await deleteEntitledCourseAction(courseId);
      if (res.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        setFeedback({ type: "success", text: res.message });
      }
    } finally {
      setCourseActionLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleCopyApiKey = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ssoSettings.apiKeyValue);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
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
            نقش فعال: {currentUser.role === "CEO" ? "مدیر ارشد / مدیرعامل" : currentUser.role === "SUPERVISOR" ? "سرپرست گروه آموزشی داوطلبان" : currentUser.role === "MENTOR" ? "پشتیبان آموزشی" : "داوطلب آزمون وکالت"}
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
            ارجاع به سرپرست گروه آموزشی (اضطراری)
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
              onClick={() => { setActiveTab("SSO"); setFeedback(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "SSO" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Globe className="h-4 w-4" />
              وب‌سرویس احراز هویت (حساب کاربری مشاهیر دانش)
            </button>

            <button
              onClick={() => { setActiveTab("COURSES"); setFeedback(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "COURSES" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              دوره‌های مجاز پشتیبانی ۳۶۰ درجه
            </button>

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
                      <CheckCircle2 className="h-4 w-4" /> فعال (امکان ورود با رمز عبور بدون پیامک)
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <Lock className="h-4 w-4" /> غیرفعال (فقط کد پیامکی یکبار مصرف)
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
              با تنظیم کلمه عبور ثابت، می‌توانید در کنار کد پیامکی یکبار مصرف، در هر زمان با شماره موبایل و این رمز عبور وارد پنل خود شوید.
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
              تذکر مهم درباره ارسال تیکت ارجاع به سرپرست آموزشی داوطلبان:
            </div>
            این درگاه نظارتی، مستقیماً توسط سرپرست ارشد گروه آموزشی حقوق و وکالت بررسی می‌شود.
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
                  {isSubmitting ? "در حال ثبت و ارسال به سرپرست..." : "ارسال تیکت به سرپرست گروه آموزشی"}
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
          {/* Direct Bulk Excel Upload Card */}
          <BulkExcelImport mentorsList={mentorsList} />

          <Card className="shadow-sm border border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  مدیریت و ثبت انفرادی داوطلبان (Pre-Approved Whitelist)
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
                <h4 className="text-xs font-bold text-foreground">ورود دستی مشخصات داوطلبان جدید:</h4>
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
                پیکربندی کلید وب‌سرویس REST API کاوه‌نگار، خط اختصاصی ارسال‌کننده، و سوییچ‌های ارسال پیامک به تفکیک فعالیت‌های سیستم.
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
                        <th className="p-2 text-start">رویداد ارسال</th>
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
                            {new Date(log.deliveryTime || log.createdAt || log.sentAt || Date.now()).toLocaleTimeString("fa-IR")}
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
                  سامانه به بستر وبینار اختصاصی مؤسسه آموزش عالی مشاهیر دانش متصل بوده و امکان ایجاد کلاس‌های رفع اشکال هفتگی، وبینارهای سراسری گروه آموزشی داوطلبان، و اتاق‌های جلسات هدایت تحصیلی و حل موانع با داوطلبان را به صورت بلادرنگ فراهم می‌آورد.
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
                    <label className="block text-xs font-semibold mb-1">کلید امنیتی اتصال و توکن احراز هویت وب‌سرویس</label>
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

      {/* TAB 7: CENTRAL MASHAHIR DANESH SSO API SETTINGS & LIVE TESTER (Manager Only) */}
      {isManager && activeTab === "SSO" && (
        <div className="space-y-6">
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-sky-500" />
                  تنظیمات وب‌سرویس احراز هویت (حساب کاربری مشاهیر دانش)
                </span>
                <Badge variant={ssoSettings.isEnabled ? "default" : "secondary"}>
                  {ssoSettings.isEnabled ? "وب‌سرویس فعال" : "وب‌سرویس غیرفعال"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Architecture & Security Notice */}
              <div className="p-4 bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-xl space-y-2 text-xs text-foreground">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-400 font-bold text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  معماری ورود یکپارچه سازمانی و اتصال زنده به وب‌سرویس مشاهیر دانش
                </div>
                <p className="leading-relaxed">
                  احراز هویت داوطلبان و مدیران در این پرتال به صورت مستقیم و بدون واسطه از طریق وب‌سرویس مرکزی مشاهیر دانش انجام می‌شود. کلیه درخواست‌ها به صورت خودکار به پروتکل امن <strong>HTTPS</strong> ارتقا یافته و شماره‌های تلفن همراه به صورت استاندارد ۱۱ رقمی (شروع با ۰۹) نرمال‌سازی می‌گردند.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ارتقای خودکار به TLS / HTTPS
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    نرمال‌سازی ارقام فارسی و عربی به ۰۹...
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    اعتبارسنجی هدر کلید امنیتی اختصاصی
                  </span>
                </div>
              </div>

              {/* Main SSO Configuration Form */}
              <form onSubmit={handleSaveSsoSettings} className="space-y-5">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                  <div>
                    <label className="text-xs font-bold text-foreground block">
                      وضعیت وب‌سرویس احراز هویت
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      در صورت فعال بودن، کاربران می‌توانند با شماره موبایل و رمز حساب کاربری مشاهیر دانش خود وارد شوند.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ssoSettings.isEnabled}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, isEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      عنوان نمایشی سرویس در صفحه ورود
                    </label>
                    <input
                      type="text"
                      value={ssoSettings.serviceTitle}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, serviceTitle: e.target.value })}
                      placeholder="حساب کاربری مشاهیر دانش"
                      className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground">
                      آدرس پایه وب‌سرویس (Base URL)
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={ssoSettings.baseUrl}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, baseUrl: e.target.value })}
                      placeholder="https://mashahiredanesh.com/GarnetAPI"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      نشانی وب‌سرویس ورود با رمز عبور
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={ssoSettings.loginEndpoint}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, loginEndpoint: e.target.value })}
                      placeholder="/auth/loginMobile"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      نشانی ارسال کد پیامکی مرحله ۱
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={ssoSettings.sendOtpEndpoint || "/users/sendVerificationCodeByMobile"}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, sendOtpEndpoint: e.target.value })}
                      placeholder="/users/sendVerificationCodeByMobile"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      نشانی بررسی و صحت‌سنجی کد پیامکی مرحله ۲
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={ssoSettings.verifyOtpEndpoint || "/users/checkVerificationCode"}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, verifyOtpEndpoint: e.target.value })}
                      placeholder="/users/checkVerificationCode"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      نشانی استعلام دوره‌های خریداری‌شده مرحله ۳
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={ssoSettings.productsEndpoint || "/invoices/productListByUser"}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, productsEndpoint: e.target.value })}
                      placeholder="/invoices/productListByUser"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      تعداد ارقام کد پیامکی (Code Length)
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      value={ssoSettings.codeCount || 5}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, codeCount: parseInt(e.target.value, 10) || 5 })}
                      placeholder="5"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      نام هدر کلید امنیتی (Header Name)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={ssoSettings.apiKeyHeader}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, apiKeyHeader: e.target.value })}
                      placeholder="x-api-key"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-xs font-semibold text-foreground">
                      مقدار کلید امنیتی (API Key)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showApiKey ? "text" : "password"}
                        dir="ltr"
                        value={ssoSettings.apiKeyValue}
                        onChange={(e) => setSsoSettings({ ...ssoSettings, apiKeyValue: e.target.value })}
                        placeholder="d41d8cd98f00b204e9800998ecf8427e"
                        className="w-full h-10 ps-3 pe-24 text-xs font-mono border border-border rounded-xl bg-background text-foreground tracking-wider"
                        required
                      />
                      <div className="absolute end-1.5 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title={showApiKey ? "مخفی‌سازی کلید" : "نمایش کلید"}
                        >
                          {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyApiKey}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="کپی در حافظه"
                        >
                          {copiedApiKey ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      کد وضعیت موفقیت (Success Status Code)
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      value={ssoSettings.successStatusCode}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, successStatusCode: parseInt(e.target.value, 10) || 2000 })}
                      placeholder="2000"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      مهلت زمانی پاسخ وب‌سرویس (میلی‌ثانیه)
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      value={ssoSettings.timeoutMs}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, timeoutMs: parseInt(e.target.value, 10) || 8000 })}
                      placeholder="8000"
                      className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={ssoSettings.autoCreateStudent}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, autoCreateStudent: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>ساخت خودکار حساب کاربری داوطلب در اولین ورود موفق در پایگاه داده پرتال</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={ssoSettings.bypassCourseCheckIfNoEndpoint}
                      onChange={(e) => setSsoSettings({ ...ssoSettings, bypassCourseCheckIfNoEndpoint: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>نادیده‌گرفتن بررسی دوره در صورت عدم تعریف اندپوینت دوره‌ها یا کاربران مجاز</span>
                  </label>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={isSavingSso} className="px-6 h-10 text-xs font-bold">
                    {isSavingSso ? "در حال ذخیره..." : "ذخیره تغییرات وب‌سرویس"}
                  </Button>
                </div>
              </form>

              {/* Multi-Stage Live Connection Tester Card */}
              <div className="mt-8 p-5 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        آزمایشگاه تست زنده ۳ مرحله‌ای وب‌سرویس مشاهیر دانش
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        ارزیابی مرحله‌به‌مرحله مراحل احراز هویت پیامکی، اعتبارسنجی توکن و دریافت فاکتورهای دوره‌های داوطلب
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sub-Tabs for Stage Testing */}
                <div className="flex flex-wrap gap-2 border-b border-border pb-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTestStageTab("STAGE1_OTP")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      testStageTab === "STAGE1_OTP"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    مرحله ۱: ارسال پیامک کد تایید
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestStageTab("STAGE2_VERIFY")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      testStageTab === "STAGE2_VERIFY"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    مرحله ۲: بررسی و صحت‌سنجی کد تایید
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestStageTab("STAGE3_PRODUCTS")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      testStageTab === "STAGE3_PRODUCTS"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    مرحله ۳: استعلام دوره‌های فعال
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestStageTab("PASSWORD")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      testStageTab === "PASSWORD"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    روش جایگزین: ورود با رمز عبور
                  </button>
                </div>

                {/* STAGE 1: SEND OTP */}
                {testStageTab === "STAGE1_OTP" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      ارسال درخواست به مسیر <code>{ssoSettings.sendOtpEndpoint || "/users/sendVerificationCodeByMobile"}</code> جهت تولید و ارسال کد ۵ رقمی پیامکی به تلفن همراه داوطلب.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      <div className="space-y-1 flex-1">
                        <label className="block text-xs font-semibold text-foreground">
                          شماره تلفن همراه تست
                        </label>
                        <input
                          type="tel"
                          dir="ltr"
                          value={testSsoMobile}
                          onChange={(e) => setTestSsoMobile(e.target.value)}
                          placeholder="09123445103"
                          className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleTestStage1}
                        disabled={isTestingStage1}
                        className="h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        {isTestingStage1 ? "در حال ارسال به وب‌سرویس..." : "تست ارسال پیامک کد تایید (مرحله ۱)"}
                      </Button>
                    </div>

                    {stage1Result && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          stage1Result.success
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            {stage1Result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                            {stage1Result.message}
                          </span>
                          <Badge variant="outline" className="border-current/30 text-current font-mono">
                            {toPersianDigits(stage1Result.latencyMs)} میلی‌ثانیه
                          </Badge>
                        </div>
                        {stage1Result.rawPreview && (
                          <pre dir="ltr" className="p-2.5 bg-black/80 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-36">
                            {stage1Result.rawPreview}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 2: VERIFY OTP */}
                {testStageTab === "STAGE2_VERIFY" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      ارسال شماره همراه و کد تایید دریافتی به مسیر <code>{ssoSettings.verifyOtpEndpoint || "/users/checkVerificationCode"}</code> جهت دریافت توکن احراز هویت.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          شماره موبایل
                        </label>
                        <input
                          type="tel"
                          dir="ltr"
                          value={testSsoMobile}
                          onChange={(e) => setTestSsoMobile(e.target.value)}
                          placeholder="09123445103"
                          className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          کد ۵ رقمی دریافتی
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={testOtpCode}
                          onChange={(e) => setTestOtpCode(e.target.value)}
                          placeholder="12345"
                          className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground tracking-widest text-center"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleTestStage2}
                          disabled={isTestingStage2}
                          className="w-full h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                        >
                          <Zap className="h-4 w-4" />
                          {isTestingStage2 ? "در حال بررسی..." : "تست بررسی و صحت‌سنجی کد (مرحله ۲)"}
                        </Button>
                      </div>
                    </div>

                    {stage2Result && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          stage2Result.success
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            {stage2Result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                            {stage2Result.message}
                          </span>
                          <Badge variant="outline" className="border-current/30 text-current font-mono">
                            {toPersianDigits(stage2Result.latencyMs)} میلی‌ثانیه
                          </Badge>
                        </div>
                        {stage2Result.token && (
                          <div className="p-2 bg-background/80 rounded-lg border border-current/20">
                            <span className="text-[10px] text-muted-foreground block font-bold">توکن احراز هویت دریافتی:</span>
                            <span className="font-mono text-[11px] break-all text-foreground">{stage2Result.token}</span>
                          </div>
                        )}
                        {stage2Result.rawPreview && (
                          <pre dir="ltr" className="p-2.5 bg-black/80 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-36">
                            {stage2Result.rawPreview}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 3: FETCH PRODUCTS */}
                {testStageTab === "STAGE3_PRODUCTS" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      ارسال درخواست به مسیر <code>{ssoSettings.productsEndpoint || "/invoices/productListByUser"}</code> جهت استعلام سبد خرید و دوره‌های خریداری‌شده داوطلب.
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      <div className="space-y-1 flex-1">
                        <label className="block text-xs font-semibold text-foreground">
                          شماره موبایل یا شناسه کاربر
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={testSsoMobile}
                          onChange={(e) => setTestSsoMobile(e.target.value)}
                          placeholder="09123445103"
                          className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleTestStage3}
                        disabled={isTestingStage3}
                        className="h-10 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        {isTestingStage3 ? "در حال دریافت دوره‌ها..." : "استعلام دوره‌ها و فاکتورها (مرحله ۳)"}
                      </Button>
                    </div>

                    {stage3Result && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          stage3Result.success
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5">
                            {stage3Result.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
                            {stage3Result.message} ({toPersianDigits(stage3Result.productsCount)} دوره یافت شد)
                          </span>
                          <Badge variant="outline" className="border-current/30 text-current font-mono">
                            {toPersianDigits(stage3Result.latencyMs)} میلی‌ثانیه
                          </Badge>
                        </div>
                        {stage3Result.rawPreview && (
                          <pre dir="ltr" className="p-2.5 bg-black/80 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48">
                            {stage3Result.rawPreview}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PASSWORD LOGIN TEST */}
                {testStageTab === "PASSWORD" && (
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      تست زنده احراز هویت با نام کاربری/موبایل و رمز عبور مستقیم در مسیر <code>{ssoSettings.loginEndpoint}</code>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          شماره موبایل
                        </label>
                        <input
                          type="tel"
                          dir="ltr"
                          value={testSsoMobile}
                          onChange={(e) => setTestSsoMobile(e.target.value)}
                          placeholder="09123445103"
                          className="w-full h-10 px-3 text-xs font-mono border border-border rounded-xl bg-background text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-foreground">
                          رمز عبور
                        </label>
                        <input
                          type="password"
                          value={testSsoPassword}
                          onChange={(e) => setTestSsoPassword(e.target.value)}
                          placeholder="رمز عبور حساب مشاهیر دانش"
                          className="w-full h-10 px-3 text-xs border border-border rounded-xl bg-background text-foreground"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleTestSsoConnection}
                          disabled={isTestingSso}
                          className="w-full h-10 text-xs font-bold bg-[#004071] hover:bg-blue-900 text-white flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Zap className="h-4 w-4" />
                          {isTestingSso ? "در حال اتصال..." : "تست ورود با رمز عبور"}
                        </Button>
                      </div>
                    </div>

                    {ssoTestResult && (
                      <div
                        className={`p-4 rounded-xl border text-xs space-y-3 ${
                          ssoTestResult.success
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/20 pb-2.5">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            {ssoTestResult.success ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                            )}
                            <span>{ssoTestResult.message}</span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs">
                            <Badge variant="outline" className="border-current/30 text-current">
                              تاخیر: {toPersianDigits(ssoTestResult.latencyMs)} میلی‌ثانیه
                            </Badge>
                            {ssoTestResult.statusCode && (
                              <Badge variant="outline" className="border-current/30 text-current">
                                وضعیت: {toPersianDigits(ssoTestResult.statusCode)}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {ssoTestResult.extractedUser && (
                          <div className="p-3 bg-background/80 rounded-xl border border-current/20 space-y-2 text-foreground">
                            <h5 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-primary" />
                              مشخصات کاربر استخراج‌شده:
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs pt-1">
                              <div className="p-2 bg-muted/40 rounded-lg">
                                <span className="text-[10px] text-muted-foreground block">نام و نام خانوادگی:</span>
                                <strong className="text-foreground">{ssoTestResult.extractedUser.fullName || "---"}</strong>
                              </div>
                              <div className="p-2 bg-muted/40 rounded-lg">
                                <span className="text-[10px] text-muted-foreground block">کد ملی:</span>
                                <strong className="font-mono text-foreground">{toPersianDigits(ssoTestResult.extractedUser.nationalId || "---")}</strong>
                              </div>
                              <div className="p-2 bg-muted/40 rounded-lg">
                                <span className="text-[10px] text-muted-foreground block">شماره موبایل:</span>
                                <strong className="font-mono text-foreground">{toPersianDigits(ssoTestResult.extractedUser.mobile || "---")}</strong>
                              </div>
                              <div className="p-2 bg-muted/40 rounded-lg">
                                <span className="text-[10px] text-muted-foreground block">شناسه یکتا:</span>
                                <strong className="font-mono text-foreground">{toPersianDigits(ssoTestResult.extractedUser.id || "---")}</strong>
                              </div>
                              <div className="p-2 bg-muted/40 rounded-lg">
                                <span className="text-[10px] text-muted-foreground block">تعداد دوره‌ها:</span>
                                <strong className="text-foreground">{toPersianDigits(ssoTestResult.coursesCount ?? 0)} دوره</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        {ssoTestResult.rawPreview && (
                          <pre dir="ltr" className="p-2.5 bg-black/80 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48 text-start">
                            {ssoTestResult.rawPreview}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 8: ENTITLED COURSES MANAGEMENT (Manager Only) */}
      {isManager && activeTab === "COURSES" && (
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="shadow-sm border border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  مدیریت کدهای دوره دارای بسته پشتیبانی ۳۶۰ درجه
                </span>
                <Badge variant="outline" className="font-mono">
                  {toPersianDigits(courses.length)} دوره تعریف‌شده
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-1.5 text-foreground">
                <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-400 text-sm">
                  <ShieldCheck className="h-4 w-4" />
                  منطق دروازه دسترسی و تطبیق دوره (Course Entitlement Gate)
                </div>
                <p className="leading-relaxed">
                  هنگامی که داوطلب جدید از طریق حساب کاربری مشاهیر دانش لاگین می‌کند، فهرست دوره‌های ثبت‌نامی وی از مسیر <code>/invoices/productListByUser</code> استعلام شده و با کدهای فعال جدول زیر تطبیق داده می‌شود. در صورت انطباق، حساب به صورت آنی فعال شده و وارد صف تخصیص پشتیبان می‌گردد.
                </p>
              </div>

              {/* Add New Course Form */}
              <form onSubmit={handleSaveCourse} className="p-4 bg-muted/20 border border-border rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  افزودن دوره جدید دارای پشتیبانی ۳۶۰
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      کد دوره (Course Code)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newCourseCode}
                      onChange={(e) => setNewCourseCode(e.target.value)}
                      placeholder="e.g. MASHAHIR-BAR-360"
                      className="w-full h-9 px-3 text-xs font-mono border border-border rounded-lg bg-background text-foreground uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground">
                      عنوان کامل دوره آموزشی
                    </label>
                    <input
                      type="text"
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="دوره جامع طلایی آمادگی آزمون وکالت ۳۶۰ درجه"
                      className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-xs font-semibold text-foreground">
                      توضیحات تکمیلی دوره
                    </label>
                    <input
                      type="text"
                      value={newCourseDescription}
                      onChange={(e) => setNewCourseDescription(e.target.value)}
                      placeholder="شامل هدایت تحصیلی هفتگی، آزمون‌های آزمایشی و جلسات تماس تلفنی"
                      className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-foreground">
                      مبلغ دوره جهت نمایش
                    </label>
                    <input
                      type="text"
                      value={newCoursePrice}
                      onChange={(e) => setNewCoursePrice(e.target.value)}
                      placeholder="۵,۸۰۰,۰۰۰ تومان"
                      className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-xs font-semibold text-foreground">
                      لینک خرید / ارتقا در سایت مشاهیر دانش
                    </label>
                    <input
                      type="url"
                      dir="ltr"
                      value={newCoursePurchaseUrl}
                      onChange={(e) => setNewCoursePurchaseUrl(e.target.value)}
                      placeholder="https://mashahiredanesh.com/courses/bar-360"
                      className="w-full h-9 px-3 text-xs font-mono border border-border rounded-lg bg-background text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={newCourseHasSupport}
                      onChange={(e) => setNewCourseHasSupport(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>شامل بسته پشتیبانی آموزشی ۳۶۰ درجه مشاهیر دانش است</span>
                  </label>

                  <Button type="submit" disabled={isSavingCourse} className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                    {isSavingCourse ? "در حال ثبت..." : "افزودن دوره به فهرست مجاز"}
                  </Button>
                </div>
              </form>

              {/* Courses Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
                    <tr>
                      <th className="py-3 px-4 text-start">کد دوره</th>
                      <th className="py-3 px-4 text-start">عنوان دوره</th>
                      <th className="py-3 px-4 text-start">وضعیت پشتیبانی</th>
                      <th className="py-3 px-4 text-start">لینک خرید</th>
                      <th className="py-3 px-4 text-start">وضعیت</th>
                      <th className="py-3 px-4 text-start">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {courses.map((c) => {
                      const isLoading = !!courseActionLoading[c.id];
                      return (
                        <tr key={c.id} className="hover:bg-muted/20 transition">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {c.courseCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-foreground">{c.courseName}</div>
                            {c.description && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">{c.description}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {c.hasSupport ? (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                پشتیبانی ۳۶۰ فعال
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                فاقد پشتیبانی
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <a
                              href={c.garnetPurchaseUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <span>مشاهده</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleCourse(c.id, c.isActive)}
                              disabled={isLoading}
                              className="flex items-center gap-1 text-xs"
                            >
                              {c.isActive ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <ToggleRight className="w-5 h-5" />
                                  فعال
                                </span>
                              ) : (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <ToggleLeft className="w-5 h-5" />
                                  غیرفعال
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(c.id)}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="حذف دوره"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
