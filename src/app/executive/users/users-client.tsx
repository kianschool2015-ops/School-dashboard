"use client";

import React, { useState, useTransition } from "react";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Phone,
  Key,
  GraduationCap,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Power,
  RefreshCw,
  Sparkles,
  FileCheck,
  FileWarning,
  ShieldAlert,
  Globe,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  toggleUserStatusAction,
  toggleMentorExamCreationAction,
  forceCheckStudentEntitlementAction,
  toggleUserSuspensionAction,
  type SanitizedAdminUser,
} from "@/server/actions/admin-users";
import { toPersianDigits, formatJalaliDate } from "@/lib/jalali";
import type { UserRole } from "@/types/models";

interface UsersClientProps {
  initialUsers: SanitizedAdminUser[];
  currentUserId: string;
}

const ROLE_CONFIG: Record<
  UserRole,
  { label: string; bg: string; text: string; border: string }
> = {
  STUDENT: {
    label: "داوطلب آزمون وکالت",
    bg: "bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  MENTOR: {
    label: "پشتیبان علمی (منتور)",
    bg: "bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-500/30",
  },
  SUPERVISOR: {
    label: "سرپرست آموزشی (پشتیبان ارشد)",
    bg: "bg-amber-500/10",
    text: "text-amber-800 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  CEO: {
    label: "مدیر ارشد سامانه",
    bg: "bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-500/30",
  },
  ADMIN: {
    label: "مدیر ارشد سامانه",
    bg: "bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-500/30",
  },
};

export function UsersClient({ initialUsers, currentUserId }: UsersClientProps) {
  const [userList, setUserList] = useState<SanitizedAdminUser[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    username: "",
    phoneNumber: "",
    nationalId: "",
    role: "STUDENT" as UserRole,
    password: "",
    sipExtension: "",
    canCreateExams: false,
  });

  // Edit User Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SanitizedAdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phoneNumber: "",
    role: "STUDENT" as UserRole,
    sipExtension: "",
    canCreateExams: false,
    newPassword: "",
  });

  // Delete confirmation
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<SanitizedAdminUser | null>(null);

  const showNotification = (type: "success" | "error", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // Filter users in memory
  const filteredUsers = userList.filter((u) => {
    if (selectedRole !== "ALL" && u.role !== selectedRole) return false;
    if (selectedStatus === "ACTIVE" && !u.isActive) return false;
    if (selectedStatus === "INACTIVE" && u.isActive) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const match =
        u.fullName.toLowerCase().includes(q) ||
        u.phoneNumber.includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.sipExtension && u.sipExtension.includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Handle Create User
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createUserAction(createForm);
      if (res.success) {
        showNotification("success", res.message);
        setCreateModalOpen(false);
        setCreateForm({
          fullName: "",
          username: "",
          phoneNumber: "",
          nationalId: "",
          role: "STUDENT",
          password: "",
          sipExtension: "",
          canCreateExams: false,
        });
        // Optimistically add user
        const newUser: SanitizedAdminUser = {
          id: `usr_${Date.now()}`,
          fullName: createForm.fullName,
          username: createForm.username,
          phoneNumber: createForm.phoneNumber,
          nationalId: createForm.nationalId || null,
          role: createForm.role,
          sipExtension: createForm.sipExtension || null,
          canCreateExams: createForm.canCreateExams,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUserList((prev) => [newUser, ...prev]);
      } else {
        showNotification("error", res.message);
      }
    });
  };

  // Handle Open Edit Modal
  const openEditModal = (user: SanitizedAdminUser) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      sipExtension: user.sipExtension || "",
      canCreateExams: user.canCreateExams,
      newPassword: "",
    });
    setEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    startTransition(async () => {
      const res = await updateUserAction({
        userId: editingUser.id,
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        role: editForm.role,
        sipExtension: editForm.sipExtension,
        canCreateExams: editForm.canCreateExams,
        newPassword: editForm.newPassword || undefined,
      });

      if (res.success) {
        showNotification("success", res.message);
        setEditModalOpen(false);
        setUserList((prev) =>
          prev.map((u) =>
            u.id === editingUser.id
              ? {
                  ...u,
                  fullName: editForm.fullName,
                  phoneNumber: editForm.phoneNumber,
                  role: editForm.role,
                  sipExtension: editForm.sipExtension || null,
                  canCreateExams: editForm.canCreateExams,
                  updatedAt: new Date(),
                }
              : u
          )
        );
      } else {
        showNotification("error", res.message);
      }
    });
  };

  // Handle Toggle Active Status
  const handleToggleStatus = (user: SanitizedAdminUser) => {
    startTransition(async () => {
      const newStatus = !user.isActive;
      const res = await toggleUserStatusAction(user.id, newStatus);
      if (res.success) {
        showNotification("success", res.message);
        setUserList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
        );
      } else {
        showNotification("error", res.message);
      }
    });
  };

  // Handle Toggle Exam Authoring
  const handleToggleExamAuthoring = (user: SanitizedAdminUser) => {
    startTransition(async () => {
      const newStatus = !user.canCreateExams;
      const res = await toggleMentorExamCreationAction(user.id, newStatus);
      if (res.success) {
        showNotification("success", res.message);
        setUserList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, canCreateExams: newStatus } : u))
        );
      } else {
        showNotification("error", res.message);
      }
    });
  };

  // Handle Delete User
  const handleDeleteUser = () => {
    if (!deleteConfirmUser) return;
    startTransition(async () => {
      const res = await deleteUserAction(deleteConfirmUser.id);
      if (res.success) {
        showNotification("success", res.message);
        setUserList((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
        setDeleteConfirmUser(null);
      } else {
        showNotification("error", res.message);
      }
    });
  };

  // Layer 5 DRM: Live Entitlement Check & Suspension State
  const [checkingEntitlementId, setCheckingEntitlementId] = useState<string | null>(null);

  // Handle Layer 5 DRM: Force check student entitlement from Central Web Service
  const handleForceCheckEntitlement = (user: SanitizedAdminUser) => {
    setCheckingEntitlementId(user.id);
    startTransition(async () => {
      const res = await forceCheckStudentEntitlementAction(user.id);
      setCheckingEntitlementId(null);
      if (res.success) {
        showNotification("success", res.message);
        setUserList((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  hasActiveSupport: res.active,
                  lastCentralCheckAt: res.lastCheckAt ? new Date(res.lastCheckAt) : new Date(),
                  lastCentralCheckResult: res.lastCheckResult || null,
                }
              : u
          )
        );
      } else {
        showNotification("error", res.message);
      }
    });
  };

  // Handle Layer 5 DRM: Toggle User Suspension & Session Eviction
  const handleToggleSuspension = (user: SanitizedAdminUser) => {
    const isCurrentlyActive = user.hasActiveSupport !== false && user.isActive;
    const actionWord = isCurrentlyActive ? "مسدودسازی" : "رفع مسدودسازی";
    if (!confirm(`آیا از ${actionWord} فوری حساب کاربری «${user.fullName}» و قطع دسترسی اطمینان دارید؟`)) {
      return;
    }

    startTransition(async () => {
      const res = await toggleUserSuspensionAction(
        user.id,
        isCurrentlyActive,
        isCurrentlyActive ? "MANUAL_ADMIN_DASHBOARD_SUSPENSION" : undefined
      );
      if (res.success) {
        showNotification("success", res.message);
        setUserList((prev) =>
          prev.map((u) =>
            u.id === user.id
              ? {
                  ...u,
                  hasActiveSupport: !isCurrentlyActive,
                  isActive: !isCurrentlyActive,
                  suspensionReason: isCurrentlyActive ? "MANUAL_ADMIN_DASHBOARD_SUSPENSION" : null,
                }
              : u
          )
        );
      } else {
        showNotification("error", res.message);
      }
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-[#004071] to-[#002847] p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3 backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5 text-amber-300" />
            <span>مدیریت متمرکز کاربران، نقش‌ها و سطوح دسترسی</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">مدیریت کاربران سامانه</h1>
          <p className="text-sm text-blue-100/80 mt-1 max-w-xl">
            تعریف و ویرایش مشخصات پرسنل، سرپرستان، پشتیبانان علمی و داوطلبان، تخصیص شماره داخلی VoIP و کنترل مجوزهای طراحی آزمون.
          </p>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>افزودن کاربر جدید</span>
        </Button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center gap-2.5 border shadow-sm animate-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="font-semibold">{notification.text}</span>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجو بر اساس نام، نام کاربری، شماره همراه یا داخلی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 ps-9 pe-3 rounded-xl border border-border/80 bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedRole("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedRole === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              همه ({toPersianDigits(userList.length)})
            </button>
            {(["STUDENT", "MENTOR", "SUPERVISOR", "CEO", "ADMIN"] as UserRole[]).map((r) => {
              const count = userList.filter((u) => u.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedRole === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {ROLE_CONFIG[r].label} ({toPersianDigits(count)})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
              <tr>
                <th className="py-3.5 px-4 text-start">نام و مشخصات کاربر</th>
                <th className="py-3.5 px-4 text-start">شماره تماس / نام کاربری</th>
                <th className="py-3.5 px-4 text-start">نقش سازمانی</th>
                <th className="py-3.5 px-4 text-start">پایش امنیتی DRM و وب‌سرویس</th>
                <th className="py-3.5 px-4 text-center">داخلی تلفن (VoIP)</th>
                <th className="py-3.5 px-4 text-center">طراحی آزمون</th>
                <th className="py-3.5 px-4 text-center">وضعیت حساب</th>
                <th className="py-3.5 px-4 text-center">تاریخ ثبت</th>
                <th className="py-3.5 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    هیچ کاربری با مشخصات جستجو شده یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const rConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.STUDENT;
                  const isSelf = user.id === currentUserId;
                  const formattedDate = user.createdAt
                    ? formatJalaliDate(new Date(user.createdAt))
                    : "-";

                  return (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{user.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-sm font-semibold">
                              شما
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {user.id}
                        </div>
                      </td>

                      {/* Phone & Username */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-foreground font-semibold">
                          {toPersianDigits(user.phoneNumber)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          @{user.username}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md font-semibold text-[11px] border ${rConfig.bg} ${rConfig.text} ${rConfig.border}`}
                        >
                          {rConfig.label}
                        </span>
                      </td>

                      {/* Layer 5 DRM & Security Monitor */}
                      <td className="py-3 px-4">
                        {user.role === "STUDENT" ? (
                          <div className="space-y-1.5 min-w-[210px]">
                            {/* Digital NDA Status Badge */}
                            {user.acceptedLegalTermsAt ? (
                              <div
                                className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold"
                                title={`امضا شده با IP: ${user.acceptedLegalTermsIp || "ثبت شده"}`}
                              >
                                <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>امضا شده: {toPersianDigits(formatJalaliDate(new Date(user.acceptedLegalTermsAt)))}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                                <FileWarning className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>در انتظار امضای تعهدنامه</span>
                              </div>
                            )}

                            {/* Provisioning Source Badge */}
                            <div className="flex items-center gap-1.5">
                              {user.provisioningSource === "CENTRAL_API" || user.provisioningSource === "GARNET_API" ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                                  <Globe className="w-2.5 h-2.5" />
                                  <span>سفارش سازمانی مشاهیر</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                                  <span>افزوده‌شده دستی / وایت‌لیست</span>
                                </span>
                              )}
                            </div>

                            {/* Last Central API Check */}
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <span>استعلام:</span>
                              {user.lastCentralCheckAt ? (
                                <span className="font-mono">
                                  {toPersianDigits(formatJalaliDate(new Date(user.lastCentralCheckAt)))}
                                  {user.hasActiveSupport === false && (
                                    <span className="text-rose-500 font-bold ms-1">(فاقد دوره/ابطال)</span>
                                  )}
                                </span>
                              ) : (
                                <span>انجام نشده</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>

                      {/* VoIP Extension */}
                      <td className="py-3 px-4 text-center">
                        {user.sipExtension ? (
                          <span className="font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            {toPersianDigits(user.sipExtension)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>

                      {/* Exam Creator Toggle */}
                      <td className="py-3 px-4 text-center">
                        {user.role === "MENTOR" || user.role === "SUPERVISOR" || user.role === "ADMIN" || user.role === "CEO" ? (
                          <button
                            type="button"
                            onClick={() => handleToggleExamAuthoring(user)}
                            disabled={isPending}
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border transition-colors ${
                              user.canCreateExams
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            }`}
                            title="تغییر دسترسی طراحی و بارگذاری آزمون"
                          >
                            {user.canCreateExams ? "مجاز" : "غیرمجاز"}
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">-</span>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          disabled={isPending || isSelf}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[10px] border transition-colors ${
                            user.isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-destructive/10 text-destructive border-destructive/30"
                          } ${isSelf ? "opacity-60 cursor-not-allowed" : "hover:opacity-80"}`}
                          title={isSelf ? "امکان تغییر وضعیت حساب جاری وجود ندارد" : "تغییر وضعیت فعال بودن"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-destructive"}`} />
                          <span>{user.isActive ? "فعال" : "مسدود"}</span>
                        </button>
                      </td>

                      {/* Creation Date */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground">
                        {toPersianDigits(formattedDate)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {user.role === "STUDENT" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleForceCheckEntitlement(user)}
                                disabled={isPending || checkingEntitlementId === user.id}
                                className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                                title="استعلام فوری خرید از وب‌سرویس مشاهیر دانش"
                              >
                                <RefreshCw
                                  className={`h-3.5 w-3.5 ${
                                    checkingEntitlementId === user.id ? "animate-spin text-sky-600" : ""
                                  }`}
                                />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleSuspension(user)}
                                disabled={isPending}
                                className={`h-7 w-7 ${
                                  user.hasActiveSupport === false || !user.isActive
                                    ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                }`}
                                title={
                                  user.hasActiveSupport === false || !user.isActive
                                    ? "رفع مسدودسازی و فعال‌سازی مجدد حساب داوطلب"
                                    : "مسدودسازی فوری حساب داوطلب و ابطال نشست"
                                }
                              >
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(user)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="ویرایش کاربر"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmUser(user)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="حذف کاربر"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create User */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span>افزودن کاربر جدید به سامانه</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                نام و نام خانوادگی <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: دکتر مریم باقری"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  شماره تلفن همراه <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="09121234567"
                  value={createForm.phoneNumber}
                  onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  نام کاربری <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  placeholder="username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  نقش سازمانی <span className="text-destructive">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, role: e.target.value as UserRole })
                  }
                  className="w-full h-9 px-2 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="STUDENT">داوطلب آزمون وکالت</option>
                  <option value="MENTOR">پشتیبان علمی (منتور)</option>
                  <option value="SUPERVISOR">سرپرست آموزشی (پشتیبان ارشد)</option>
                  <option value="ADMIN">مدیر ارشد سامانه (Admin)</option>
                  <option value="CEO">مدیر ارشد سامانه (CEO)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  داخلی VoIP (استریسک)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="مثال: 103"
                  value={createForm.sipExtension}
                  onChange={(e) => setCreateForm({ ...createForm, sipExtension: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                رمز عبور (اختیاری - پیش‌فرض استاندارد نقش تنظیم می‌شود)
              </label>
              <input
                type="password"
                dir="ltr"
                placeholder="حداقل ۶ کاراکتر"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="createCanExams"
                checked={createForm.canCreateExams}
                onChange={(e) => setCreateForm({ ...createForm, canCreateExams: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="createCanExams" className="text-xs font-medium text-foreground cursor-pointer">
                مجوز طراحی و بارگذاری آزمون‌های آزمایشی
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs"
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isPending} className="text-xs font-bold">
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ms-1" />
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  <span>ثبت کاربر جدید</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit User */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="h-4 w-4 text-primary" />
              <span>ویرایش مشخصات کاربر ({editingUser?.fullName})</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-3.5 py-2">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">نام و نام خانوادگی</label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">شماره همراه</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">نقش سازمانی</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full h-9 px-2 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="STUDENT">داوطلب آزمون وکالت</option>
                  <option value="MENTOR">پشتیبان علمی (منتور)</option>
                  <option value="SUPERVISOR">سرپرست آموزشی (پشتیبان ارشد)</option>
                  <option value="ADMIN">مدیر ارشد سامانه (Admin)</option>
                  <option value="CEO">مدیر ارشد سامانه (CEO)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">داخلی تلفن VoIP</label>
              <input
                type="text"
                dir="ltr"
                placeholder="مثال: 102"
                value={editForm.sipExtension}
                onChange={(e) => setEditForm({ ...editForm, sipExtension: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                تغییر رمز عبور (در صورت نیاز به بازنشانی وارد نمایید)
              </label>
              <input
                type="password"
                dir="ltr"
                placeholder="رمز عبور جدید (اختیاری)"
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 text-end"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editCanExams"
                checked={editForm.canCreateExams}
                onChange={(e) => setEditForm({ ...editForm, canCreateExams: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="editCanExams" className="text-xs font-medium text-foreground cursor-pointer">
                مجوز طراحی و بارگذاری آزمون‌های آزمایشی
              </label>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="text-xs"
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isPending} className="text-xs font-bold">
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin ms-1" />
                    <span>در حال ذخیره...</span>
                  </>
                ) : (
                  <span>ذخیره تغییرات</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Confirmation */}
      <Dialog
        open={Boolean(deleteConfirmUser)}
        onOpenChange={(open) => !open && setDeleteConfirmUser(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              <span>تایید حذف کاربر</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 text-xs text-muted-foreground leading-relaxed">
            آیا از حذف دائم کاربر «{deleteConfirmUser?.fullName}» با نام کاربری @{deleteConfirmUser?.username} اطمینان دارید؟ این عملیات قابل بازگشت نیست.
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmUser(null)}
              className="text-xs"
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isPending}
              className="text-xs font-bold"
            >
              {isPending ? "در حال حذف..." : "حذف قطعی کاربر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
