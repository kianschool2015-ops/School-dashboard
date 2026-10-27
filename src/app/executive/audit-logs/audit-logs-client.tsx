"use client";

import React, { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Search,
  Filter,
  Download,
  Shield,
  Phone,
  Calendar,
  User,
  Radio,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  RefreshCw,
} from "lucide-react";
import {
  getSystemAuditLogsAction,
  type SystemAuditLogRecord,
  type AuditLogFilters,
} from "@/server/actions/audit-logs";
import { toPersianDigits } from "@/lib/jalali";

interface AuditLogsClientProps {
  initialLogs: SystemAuditLogRecord[];
  initialTotalCount: number;
  initialStats: Record<string, number>;
}

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  AUTH: {
    label: "احراز هویت و سشن",
    bg: "bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  EXAM: {
    label: "آزمون شبیه‌ساز",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  VOIP_CALL: {
    label: "تماس تلفنی VoIP",
    bg: "bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-500/30",
  },
  VOICE: {
    label: "پیام صوتی (Voice)",
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  MESSAGE: {
    label: "پیام متنی",
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500/30",
  },
  STUDY_PLAN: {
    label: "برنامه و چک‌این",
    bg: "bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-500/30",
  },
  TASK: {
    label: "وظیفه سازمانی",
    bg: "bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  USER_MGMT: {
    label: "مدیریت کاربران",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/30",
  },
  COURSE: {
    label: "دسترسی دوره",
    bg: "bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-500/30",
  },
  CHANNEL: {
    label: "کانال و گروه",
    bg: "bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-500/30",
  },
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "داوطلب آزمون وکالت",
  MENTOR: "پشتیبان علمی (منتور)",
  SUPERVISOR: "سرپرست آموزشی (پشتیبان ارشد)",
  CEO: "مدیر ارشد سامانه",
  ADMIN: "مدیر ارشد سامانه",
};

export function AuditLogsClient({
  initialLogs,
  initialTotalCount,
  initialStats,
}: AuditLogsClientProps) {
  const [logs, setLogs] = useState<SystemAuditLogRecord[]>(initialLogs);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [actorRole, setActorRole] = useState("ALL");
  const [eventType, setEventType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Selected Log Details Modal
  const [activeModalLog, setActiveModalLog] = useState<SystemAuditLogRecord | null>(null);

  const fetchFilteredLogs = (overridePage?: number) => {
    const targetPage = overridePage !== undefined ? overridePage : page;
    startTransition(async () => {
      const filters: AuditLogFilters = {
        actorRole: actorRole !== "ALL" ? actorRole : undefined,
        eventType: eventType !== "ALL" ? eventType : undefined,
        searchQuery: searchQuery.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        limit: pageSize,
        offset: (targetPage - 1) * pageSize,
      };

      const result = await getSystemAuditLogsAction(filters);
      setLogs(result.logs);
      setTotalCount(result.totalCount);
      setStats(result.eventStats);
      if (overridePage !== undefined) {
        setPage(overridePage);
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredLogs(1);
  };

  const handleResetFilters = () => {
    setActorRole("ALL");
    setEventType("ALL");
    setSearchQuery("");
    setPhoneNumber("");
    setPage(1);
    startTransition(async () => {
      const result = await getSystemAuditLogsAction({ limit: pageSize, offset: 0 });
      setLogs(result.logs);
      setTotalCount(result.totalCount);
      setStats(result.eventStats);
    });
  };

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    const headers = [
      "شناسه لاگ",
      "تاریخ و ساعت",
      "نام کاربر",
      "شناسه کاربر",
      "نقش کاربر",
      "نوع رخداد",
      "اکشن",
      "موجودیت هدف",
      "شرح و جزئیات",
      "آدرس IP",
    ];

    const rows = logs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.createdAt).toLocaleString("fa-IR")}"`,
      `"${l.actorName.replace(/"/g, '""')}"`,
      `"${l.actorId}"`,
      `"${ROLE_LABELS[l.actorRole] || l.actorRole}"`,
      `"${EVENT_TYPE_CONFIG[l.eventType]?.label || l.eventType}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.targetEntity}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.ipAddress || ""}"`,
    ]);

    const csvContent =
      "﻿" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `mashahir_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-foreground">
              مرکز جامع لاگ و ممیزی سامانه
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ثبت و رصد ممیزی کامل تمامی رخدادهای کلیدی: احراز هویت، مکالمات VoIP، آزمون‌ها، چت و پیام‌های صوتی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>خروجی اکسل / CSV</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchFilteredLogs()}
            disabled={isPending}
            className="text-xs flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>تازه‌سازی</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="p-3 bg-muted/40 rounded-xl border border-border">
          <p className="text-[11px] text-muted-foreground font-medium">کل رخدادهای ثبت‌شده</p>
          <p className="text-xl font-bold mt-1 text-foreground persian-nums">
            {toPersianDigits(totalCount)}
          </p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
          <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">ورود و احراز هویت</p>
          <p className="text-xl font-bold mt-1 text-blue-800 dark:text-blue-300 persian-nums">
            {toPersianDigits(stats["AUTH"] || 0)}
          </p>
        </div>
        <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
          <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">تماس‌های تلفنی VoIP</p>
          <p className="text-xl font-bold mt-1 text-teal-800 dark:text-teal-300 persian-nums">
            {toPersianDigits(stats["VOIP_CALL"] || 0)}
          </p>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">آزمون‌های وکالت</p>
          <p className="text-xl font-bold mt-1 text-emerald-800 dark:text-emerald-300 persian-nums">
            {toPersianDigits(stats["EXAM"] || 0)}
          </p>
        </div>
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <p className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">پیام‌ها و ویس‌ها</p>
          <p className="text-xl font-bold mt-1 text-purple-800 dark:text-purple-300 persian-nums">
            {toPersianDigits((stats["MESSAGE"] || 0) + (stats["VOICE"] || 0))}
          </p>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">وظایف سازمانی</p>
          <p className="text-xl font-bold mt-1 text-amber-800 dark:text-amber-300 persian-nums">
            {toPersianDigits(stats["TASK"] || 0)}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="shadow-xs border border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                  فیلتر بر اساس نقش کاربر:
                </label>
                <select
                  value={actorRole}
                  onChange={(e) => {
                    setActorRole(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                >
                  <option value="ALL">همه نقش‌ها (جامع)</option>
                  <option value="STUDENT">داوطلب آزمون وکالت (STUDENT)</option>
                  <option value="MENTOR">پشتیبان علمی (MENTOR)</option>
                  <option value="SUPERVISOR">سرپرست آموزشی (SUPERVISOR)</option>
                  <option value="ADMIN">مدیر ارشد سامانه (ADMIN/CEO)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                  نوع رخداد (Event Type):
                </label>
                <select
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                >
                  <option value="ALL">همه رخدادها (کل دسته‌ها)</option>
                  <option value="AUTH">ورود و احراز هویت (AUTH)</option>
                  <option value="EXAM">ثبت و شرکت در آزمون (EXAM)</option>
                  <option value="VOIP_CALL">تماس‌های تلفنی VoIP و مشاوره</option>
                  <option value="VOICE">پیام صوتی (Voice)</option>
                  <option value="MESSAGE">پیام متنی در چت</option>
                  <option value="STUDY_PLAN">برنامه هفتگی و چک‌این</option>
                  <option value="TASK">وظایف و کارتابل سازمانی</option>
                  <option value="USER_MGMT">مدیریت کاربران و دسترسی</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                  شماره همراه کاربر:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="مثال: 0912..."
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background pe-8 font-mono text-start"
                  />
                  <Phone className="h-3.5 w-3.5 absolute end-2.5 top-2.5 text-muted-foreground/60" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">
                  جستجو در نام، شرح و اکشن:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="کلمه کلیدی یا نام کاربر..."
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background pe-8"
                  />
                  <Search className="h-3.5 w-3.5 absolute end-2.5 top-2.5 text-muted-foreground/60" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                نمایش {logs.length} مورد از مجموع {toPersianDigits(totalCount)} رخداد یافت‌شده
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs h-8 px-3 text-muted-foreground"
                >
                  پاکسازی فیلترها
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs h-8 px-4 bg-primary text-primary-foreground gap-1.5"
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>اعمال فیلتر</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="shadow-xs border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3 text-start">زمان رخداد</th>
                <th className="p-3 text-start">کاربر مجری</th>
                <th className="p-3 text-start">نوع رخداد</th>
                <th className="p-3 text-start">اکشن</th>
                <th className="p-3 text-start">شرح و جزئیات</th>
                <th className="p-3 text-start">آدرس IP</th>
                <th className="p-3 text-center">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    هیچ رخدادی با فیلترهای جاری یافت نشد.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const eventCfg =
                    EVENT_TYPE_CONFIG[log.eventType] || {
                      label: log.eventType,
                      bg: "bg-muted",
                      text: "text-muted-foreground",
                      border: "border-border",
                    };

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        <div>{new Date(log.createdAt).toLocaleDateString("fa-IR")}</div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {new Date(log.createdAt).toLocaleTimeString("fa-IR")}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-foreground">{log.actorName}</div>
                        <span className="text-[10px] text-muted-foreground">
                          {ROLE_LABELS[log.actorRole] || log.actorRole}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${eventCfg.bg} ${eventCfg.text} ${eventCfg.border}`}
                        >
                          {eventCfg.label}
                        </span>
                      </td>

                      <td className="p-3 font-medium text-foreground max-w-[200px] truncate" title={log.action}>
                        {log.action}
                      </td>

                      <td className="p-3 text-muted-foreground max-w-[280px] truncate" title={log.details || ""}>
                        {log.details || "—"}
                      </td>

                      <td className="p-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {log.ipAddress || "—"}
                      </td>

                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveModalLog(log)}
                          className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                          title="مشاهده متادیتا و جزئیات کامل"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs bg-muted/20">
            <span className="text-muted-foreground">
              صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFilteredLogs(page - 1)}
                disabled={page <= 1 || isPending}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5 me-1" />
                <span>قبلی</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchFilteredLogs(page + 1)}
                disabled={page >= totalPages || isPending}
                className="h-7 px-2 text-xs"
              >
                <span>بعدی</span>
                <ChevronLeft className="h-3.5 w-3.5 ms-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Audit Log Detail Modal */}
      {activeModalLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-xl bg-background border border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">
                  جزئیات کامل رخداد ممیزی
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModalLog(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">شناسه رخداد:</span>
                  <span className="font-mono font-bold text-foreground">{activeModalLog.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">زمان وقوع:</span>
                  <span className="font-mono text-foreground">
                    {new Date(activeModalLog.createdAt).toLocaleString("fa-IR")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">کاربر مجری:</span>
                  <span className="font-bold text-foreground">{activeModalLog.actorName}</span>{" "}
                  <span className="text-[10px] text-muted-foreground">({activeModalLog.actorId})</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">نقش کاربر:</span>
                  <span className="text-foreground">
                    {ROLE_LABELS[activeModalLog.actorRole] || activeModalLog.actorRole}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">نوع رخداد:</span>
                  <span className="font-bold text-foreground">{activeModalLog.eventType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">موجودیت هدف:</span>
                  <span className="font-mono text-foreground">
                    {activeModalLog.targetEntity} {activeModalLog.targetId ? `(${activeModalLog.targetId})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">آدرس IP:</span>
                  <span className="font-mono text-foreground">{activeModalLog.ipAddress || "نامشخص"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">مرورگر / کلاینت:</span>
                  <span className="truncate block font-mono text-[10px] text-muted-foreground" title={activeModalLog.userAgent || ""}>
                    {activeModalLog.userAgent || "نامشخص"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  شرح و اکشن انجام‌شده:
                </label>
                <div className="p-3 bg-muted/30 rounded-lg text-xs border border-border/50 text-foreground font-medium">
                  {activeModalLog.action}
                </div>
              </div>

              {activeModalLog.details && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    جزئیات تکمیلی:
                  </label>
                  <div className="p-3 bg-muted/30 rounded-lg text-xs border border-border/50 text-muted-foreground leading-relaxed">
                    {activeModalLog.details}
                  </div>
                </div>
              )}

              {activeModalLog.metadata && Object.keys(activeModalLog.metadata).length > 0 && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-foreground">
                    متادیتا (JSON Payload):
                  </label>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-40 border border-slate-800 dir-ltr text-left">
                    {JSON.stringify(activeModalLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex items-center justify-end pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setActiveModalLog(null)}
                  className="text-xs"
                >
                  بستن
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
