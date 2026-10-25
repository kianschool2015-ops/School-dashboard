"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Plus,
  Send,
  UserCheck,
  Calendar,
  Filter,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  XCircle,
  ShieldAlert,
  Eye,
  X,
} from "lucide-react";
import {
  assignHierarchyTaskAction,
  updateHierarchyTaskStatusAction,
  completeHierarchyTaskByMentorAction,
  reviewHierarchyTaskAction,
  markTaskSeenAction,
} from "@/server/actions/tasks";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";
import { toPersianDigits } from "@/lib/jalali";
import type { HierarchyTaskRecord, TaskPriority, TaskStatus } from "@/types/models";

interface TasksClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  tasks: HierarchyTaskRecord[];
  assignees: Array<{ id: string; fullName: string; role: string }>;
}

export function TasksClient({ currentUser, tasks: initialTasks, assignees }: TasksClientProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isCreating, setIsCreating] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const [tasksList, setTasksList] = useState<HierarchyTaskRecord[]>(initialTasks);
  const [activeTaskDetails, setActiveTaskDetails] = useState<HierarchyTaskRecord | null>(null);

  // New task form state
  const [selectedReceivers, setSelectedReceivers] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("HIGH");
  const [dueDate, setDueDate] = useState("1403-08-15");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Status notes dialog state (Mentor completing task)
  const [activeTaskForComplete, setActiveTaskForComplete] = useState<HierarchyTaskRecord | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  // Review dialog state (Supervisor/Admin reviewing task)
  const [activeTaskForReview, setActiveTaskForReview] = useState<{
    task: HierarchyTaskRecord;
    decision: "APPROVED" | "REJECTED";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const isSupervisorOrAdmin =
    currentUser.role === "CEO" || currentUser.role === "ADMIN" || currentUser.role === "SUPERVISOR";
  const canAssign = isSupervisorOrAdmin;

  const handleOpenTaskDetails = async (task: HierarchyTaskRecord) => {
    setActiveTaskDetails(task);
    if (task.status === "PENDING") {
      try {
        const res = await markTaskSeenAction(task.id);
        if (res.success && res.status === "SEEN_IN_PROGRESS") {
          const now = res.seenAt ? new Date(res.seenAt) : new Date();
          setTasksList((prev) =>
            prev.map((t) =>
              t.id === task.id ? { ...t, status: "SEEN_IN_PROGRESS", seenAt: now } : t
            )
          );
          setActiveTaskDetails((prev) =>
            prev && prev.id === task.id
              ? { ...prev, status: "SEEN_IN_PROGRESS", seenAt: now }
              : prev
          );
        }
      } catch (err) {
        console.error("Failed to mark task seen:", err);
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (selectedReceivers.length === 0) {
      setBanner({ type: "error", text: "حداقل یک گیرنده برای وظیفه انتخاب فرمایید." });
      return;
    }
    if (!title || !description) {
      setBanner({ type: "error", text: "عنوان و شرح وظیفه الزامی است." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await assignHierarchyTaskAction({
        receiverIds: selectedReceivers,
        title,
        description,
        priority,
        dueDate,
      });

      if (res.success) {
        setBanner({ type: "success", text: res.message });
        setTitle("");
        setDescription("");
        setSelectedReceivers([]);
        setIsCreating(false);
      } else {
        setBanner({ type: "error", text: res.message });
      }
    } catch {
      setBanner({ type: "error", text: "خطا در ارجاع وظیفه." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    setBanner(null);
    try {
      const res = await updateHierarchyTaskStatusAction({
        taskId,
        status,
      });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        setTasksList((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status } : t))
        );
        if (activeTaskDetails && activeTaskDetails.id === taskId) {
          setActiveTaskDetails((prev) => (prev ? { ...prev, status } : null));
        }
      } else {
        setBanner({ type: "error", text: res.message });
      }
    } catch {
      setBanner({ type: "error", text: "خطا در به‌روزرسانی وضعیت وظیفه." });
    }
  };

  const handleCompleteByMentor = async () => {
    if (!activeTaskForComplete) return;
    if (!completionNote.trim()) {
      setBanner({ type: "error", text: "لطفاً شرح اقدامات و نتیجه انجام کار را وارد نمایید." });
      return;
    }

    try {
      const res = await completeHierarchyTaskByMentorAction({
        taskId: activeTaskForComplete.id,
        resolutionNotes: completionNote,
      });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        setTasksList((prev) =>
          prev.map((t) =>
            t.id === activeTaskForComplete.id
              ? { ...t, status: "COMPLETED_BY_MENTOR", resolutionNotes: completionNote, completedAt: new Date() }
              : t
          )
        );
        setActiveTaskForComplete(null);
        setCompletionNote("");
      } else {
        setBanner({ type: "error", text: res.message });
      }
    } catch {
      setBanner({ type: "error", text: "خطا در ثبت انجام وظیفه." });
    }
  };

  const handleReviewTask = async () => {
    if (!activeTaskForReview) return;

    try {
      const res = await reviewHierarchyTaskAction({
        taskId: activeTaskForReview.task.id,
        decision: activeTaskForReview.decision,
        reviewNotes: reviewNote,
      });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        const finalStatus: TaskStatus = activeTaskForReview.decision === "APPROVED" ? "APPROVED" : "REJECTED";
        setTasksList((prev) =>
          prev.map((t) =>
            t.id === activeTaskForReview.task.id
              ? { ...t, status: finalStatus, reviewNotes: reviewNote, reviewedAt: new Date(), reviewedByName: currentUser.fullName }
              : t
          )
        );
        setActiveTaskForReview(null);
        setReviewNote("");
      } else {
        setBanner({ type: "error", text: res.message });
      }
    } catch {
      setBanner({ type: "error", text: "خطا در ثبت نتیجه بازبینی وظیفه." });
    }
  };

  const pendingCount = tasksList.filter((t) => t.status === "PENDING").length;
  const seenInProgressCount = tasksList.filter((t) => t.status === "SEEN_IN_PROGRESS" || t.status === "IN_PROGRESS").length;
  const pendingApprovalCount = tasksList.filter((t) => t.status === "COMPLETED_BY_MENTOR").length;
  const approvedCount = tasksList.filter((t) => t.status === "APPROVED" || t.status === "COMPLETED").length;
  const rejectedCount = tasksList.filter((t) => t.status === "REJECTED").length;

  const tasksPendingApproval = tasksList.filter((t) => t.status === "COMPLETED_BY_MENTOR");

  const filteredTasks = tasksList.filter((t) => {
    if (filterStatus === "ALL") return true;
    if (filterStatus === "APPROVED") return t.status === "APPROVED" || t.status === "COMPLETED";
    if (filterStatus === "SEEN_IN_PROGRESS") return t.status === "SEEN_IN_PROGRESS" || t.status === "IN_PROGRESS";
    return t.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">کارتابل ارجاع و تأیید دو مرحله‌ای وظایف</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.role === "CEO" || currentUser.role === "ADMIN"
              ? "ارجاع، نظارت عالیه و تأیید نهایی وظایف محوله به سرپرستان و پشتیبانان"
              : currentUser.role === "SUPERVISOR"
              ? "مدیریت تسک‌ها، ارجاع به پشتیبانان و کارتابل بازبینی و تأیید دو مرحله‌ای"
              : "وظایف محوله از سوی سرپرستی و ثبت گزارش جهت تأیید"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowGantt(!showGantt)}
            className="flex items-center gap-2 text-xs"
          >
            <TrendingUp className="h-4 w-4" />
            {showGantt ? "پنهان‌سازی گانت‌چارت" : "مشاهده گانت‌چارت"}
          </Button>

          {canAssign && (
            <Button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 text-xs bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              {isCreating ? "انصراف" : "تعریف و ارجاع وظیفه جدید"}
            </Button>
          )}
        </div>
      </div>

      {banner && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
            banner.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
              : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-200"
          }`}
        >
          {banner.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Optional Embedded Gantt Chart */}
      {showGantt && (
        <MultiHorizonGantt
          entityType={currentUser.role === "SUPERVISOR" ? "MENTOR" : "SUPERVISOR"}
          entityName={currentUser.role === "SUPERVISOR" ? "تیم پشتیبانان گروه آموزشی" : "سرپرستان آموزشی"}
          readOnlyAuditorRole={currentUser.role === "CEO" ? "CEO" : "SUPERVISOR"}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">کل وظایف</p>
            <p className="text-xl font-bold mt-1 persian-nums">{toPersianDigits(tasksList.length)}</p>
          </div>
          <ListTodo className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400">در انتظار اقدام</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1 persian-nums">{toPersianDigits(pendingCount)}</p>
          </div>
          <Clock className="h-5 w-5 text-amber-600" />
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-700 dark:text-blue-400">مشاهده‌شده / در حال پیگیری</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1 persian-nums">{toPersianDigits(seenInProgressCount)}</p>
          </div>
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-purple-700 dark:text-purple-400">نیازمند تأیید سرپرست</p>
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1 persian-nums">{toPersianDigits(pendingApprovalCount)}</p>
          </div>
          <ClipboardCheck className="h-5 w-5 text-purple-600" />
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">تأیید نهایی شده</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 persian-nums">{toPersianDigits(approvedCount)}</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
      </div>

      {/* SUPERVISOR / ADMIN APPROVAL QUEUE (کارتابل وظایف نیازمند تأیید) */}
      {isSupervisorOrAdmin && tasksPendingApproval.length > 0 && (
        <Card className="border-2 border-purple-500/40 bg-purple-500/5 shadow-md">
          <CardHeader className="pb-3 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-sm font-bold text-purple-900 dark:text-purple-300">
                  کارتابل وظایف نیازمند تأیید (مرحله دوم چرخه کار)
                </CardTitle>
              </div>
              <Badge variant="yellow" className="persian-nums">
                {toPersianDigits(tasksPendingApproval.length)} وظیفه در انتظار بازبینی شما
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              این وظایف توسط پشتیبانان تکمیل شده و گزارش کار آنان ثبت گردیده است. لطفاً پس از بررسی، تأیید نهایی یا رد فرمایید.
            </p>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {tasksPendingApproval.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-card border border-purple-500/30 rounded-xl space-y-3 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="tier" className="bg-purple-600 text-white">
                      تکمیل‌شده توسط پشتیبان
                    </Badge>
                    <span className="font-bold text-sm text-foreground">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>پشتیبان مجری: <strong className="text-foreground">{task.receiverName}</strong></span>
                    <span className="font-mono">مهلت: {task.dueDate}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5 border border-border/60">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-semibold text-foreground">گزارش و توضیحات پشتیبان مجری:</span>
                    <span className="text-[10px]">
                      {task.completedAt ? new Date(task.completedAt).toLocaleTimeString("fa-IR") : "ثبت‌شده"}
                    </span>
                  </div>
                  <p className="text-foreground/90 whitespace-pre-wrap">{task.resolutionNotes || "توضیحاتی ثبت نشده است."}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => setActiveTaskForReview({ task, decision: "APPROVED" })}
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>تأیید نهایی وظیفه</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTaskForReview({ task, decision: "REJECTED" })}
                    className="text-xs h-8 border-rose-500/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>رد و ارجاع جهت اصلاح</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* New Task Assignment Drawer / Card */}
      {isCreating && canAssign && (
        <Card className="shadow-sm border-2 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
              <Plus className="h-5 w-5" />
              ارجاع وظیفه سازمانی جدید (ارسال پیامک خودکار به دریافت‌کنندگان)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  انتخاب مخاطبان / دریافت‌کنندگان (یک یا چند نفر):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-background border border-border rounded-lg max-h-48 overflow-y-auto">
                  {assignees.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${
                        selectedReceivers.includes(a.id) ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReceivers.includes(a.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReceivers([...selectedReceivers, a.id]);
                          } else {
                            setSelectedReceivers(selectedReceivers.filter((id) => id !== a.id));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <span>{a.fullName}</span>
                      <span className="text-[10px] text-muted-foreground">({a.role})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">عنوان وظیفه</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: پیگیری فوری وضعیت غیبت داوطلبان آزمون وکالت"
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">اولویت وظیفه</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                  >
                    <option value="CRITICAL">بحرانی / فوری (Critical)</option>
                    <option value="HIGH">اولویت بالا (High)</option>
                    <option value="MEDIUM">متوسط (Medium)</option>
                    <option value="LOW">عادی (Low)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">شرح دقیق تکلیف و خروجی مورد انتظار</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="جزییات کامل، نحوه اقدام و ثبت گزارش در سامانه را درج فرمایید..."
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">مهلت انجام (ددلاین شمسی)</label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="1403-08-20"
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "در حال ثبت و ارسال پیامک..." : "ثبت وظیفه و ارسال پیامک"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  انصراف
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-2">
        <button
          onClick={() => setFilterStatus("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          همه وظایف ({toPersianDigits(tasksList.length)})
        </button>
        <button
          onClick={() => setFilterStatus("PENDING")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "PENDING" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          در انتظار اقدام ({toPersianDigits(pendingCount)})
        </button>
        <button
          onClick={() => setFilterStatus("SEEN_IN_PROGRESS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "SEEN_IN_PROGRESS" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          مشاهده‌شده / در حال پیگیری ({toPersianDigits(seenInProgressCount)})
        </button>
        <button
          onClick={() => setFilterStatus("COMPLETED_BY_MENTOR")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "COMPLETED_BY_MENTOR" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          نیازمند تأیید سرپرست ({toPersianDigits(pendingApprovalCount)})
        </button>
        <button
          onClick={() => setFilterStatus("APPROVED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "APPROVED" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          تأیید نهایی شده ({toPersianDigits(approvedCount)})
        </button>
        {rejectedCount > 0 && (
          <button
            onClick={() => setFilterStatus("REJECTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === "REJECTED" ? "bg-rose-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            رد شده / نیازمند اصلاح ({toPersianDigits(rejectedCount)})
          </button>
        )}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs bg-muted/10 rounded-xl border border-dashed border-border">
            هیچ وظیفه‌ای در این دسته‌بندی یافت نشد.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isAssignedToMe = task.receiverId === currentUser.id;
            const priorityBadge =
              task.priority === "CRITICAL"
                ? "bg-red-500 text-white"
                : task.priority === "HIGH"
                ? "bg-amber-500 text-white"
                : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200";

            return (
              <Card key={task.id} className="shadow-xs border border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${priorityBadge}`}>
                        {task.priority === "CRITICAL" ? "فوری و بحرانی" : task.priority === "HIGH" ? "اولویت بالا" : "عادی"}
                      </span>
                      <h3 className="font-bold text-sm text-foreground">{task.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="h-3.5 w-3.5" />
                        مهلت: {task.dueDate}
                      </span>
                      <Badge
                        variant={
                          task.status === "APPROVED" || task.status === "COMPLETED"
                            ? "green"
                            : task.status === "COMPLETED_BY_MENTOR"
                            ? "yellow"
                            : task.status === "REJECTED"
                            ? "red"
                            : task.status === "SEEN_IN_PROGRESS" || task.status === "IN_PROGRESS"
                            ? "blue"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {task.status === "APPROVED" || task.status === "COMPLETED"
                          ? "تأیید نهایی شده"
                          : task.status === "COMPLETED_BY_MENTOR"
                          ? "در انتظار تأیید سرپرست"
                          : task.status === "REJECTED"
                          ? "رد شده / اصلاح"
                          : task.status === "SEEN_IN_PROGRESS"
                          ? "مشاهده‌شده و در حال پیگیری"
                          : task.status === "IN_PROGRESS"
                          ? "در حال اقدام"
                          : "در انتظار اقدام"}
                      </Badge>
                    </div>
                  </div>

                  {/* Task Description Excerpt (Bounded, anti-overflow) */}
                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">خلاصه شرح وظیفه:</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenTaskDetails(task)}
                        className="text-[11px] h-6 px-2 text-primary hover:bg-primary/10 gap-1 font-medium"
                      >
                        <Eye className="h-3 w-3" />
                        <span>مشاهده متن کامل و جزئیات</span>
                      </Button>
                    </div>
                    <p className="text-muted-foreground leading-relaxed line-clamp-2 break-words">
                      {task.description}
                    </p>
                  </div>

                  {/* Resolution Notes by Mentor */}
                  {task.resolutionNotes && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-800 dark:text-emerald-300">
                      <strong>گزارش انجام پشتیبان:</strong> {task.resolutionNotes}
                    </div>
                  )}

                  {/* Supervisor Review Notes */}
                  {task.reviewNotes && (
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-800 dark:text-purple-300">
                      <strong>بازبینی سرپرست ({task.reviewedByName || "سرپرست"}):</strong> {task.reviewNotes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>ارجاع دهنده: <strong className="text-foreground">{task.senderName}</strong></span>
                      <span>مجری: <strong className="text-foreground">{task.receiverName}</strong></span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* Start In Progress (for receiver) */}
                      {task.status === "PENDING" && isAssignedToMe && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                          className="text-xs h-7"
                        >
                          شروع اقدام
                        </Button>
                      )}

                      {/* Complete by Mentor -> Send for Approval */}
                      {(task.status === "PENDING" || task.status === "IN_PROGRESS" || task.status === "REJECTED") &&
                        (isAssignedToMe || isSupervisorOrAdmin) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setActiveTaskForComplete(task);
                              setCompletionNote(task.resolutionNotes || "");
                            }}
                            className="text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white gap-1"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            <span>ثبت انجام و ارسال جهت تأیید</span>
                          </Button>
                        )}

                      {/* Direct Approval Actions for Supervisor/Admin */}
                      {task.status === "COMPLETED_BY_MENTOR" && isSupervisorOrAdmin && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => setActiveTaskForReview({ task, decision: "APPROVED" })}
                            className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            تأیید نهایی
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTaskForReview({ task, decision: "REJECTED" })}
                            className="text-xs h-7 border-rose-500/40 text-rose-600"
                          >
                            رد
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Mentor Task Completion Modal */}
      {activeTaskForComplete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-background border border-border shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-purple-600" />
                ثبت گزارش انجام وظیفه جهت تأیید سرپرست
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                وظیفه: {activeTaskForComplete.title}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  شرح کامل اقدامات انجام‌شده و نتیجه حاصله (الزامی):
                </label>
                <textarea
                  rows={4}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="اقدامات انجام‌شده، نتایج تماس با داوطلب، اصلاح برنامه هفتگی یا ارجاع به آزمون را دقیق درج نمایید..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCompleteByMentor}
                  className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
                >
                  ارسال به کارتابل تأیید سرپرست
                </Button>
                <Button variant="outline" onClick={() => setActiveTaskForComplete(null)}>
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Supervisor Review Approval / Rejection Modal */}
      {activeTaskForReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-background border border-border shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                {activeTaskForReview.decision === "APPROVED" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600" />
                )}
                {activeTaskForReview.decision === "APPROVED"
                  ? "تأیید نهایی وظیفه سازمانی"
                  : "رد وظیفه و ارجاع جهت اصلاح"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                وظیفه: {activeTaskForReview.task.title} (مجری: {activeTaskForReview.task.receiverName})
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                <span className="font-semibold text-muted-foreground">گزارش ثبت‌شده پشتیبان:</span>
                <p className="text-foreground">{activeTaskForReview.task.resolutionNotes || "بدون توضیح"}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  یادداشت و بازخورد سرپرست (اختیاری جهت آرشیو و ابلاغ به پشتیبان):
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="نکات تکمیلی، تأییدیه یا علت رد و موارد نیازمند اصلاح را درج نمایید..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleReviewTask}
                  className={`flex-1 text-white ${
                    activeTaskForReview.decision === "APPROVED"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {activeTaskForReview.decision === "APPROVED" ? "تأیید و خاتمه نهایی" : "ثبت رد و ارسال به پشتیبان"}
                </Button>
                <Button variant="outline" onClick={() => setActiveTaskForReview(null)}>
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Task Details Bounded Modal (Anti-overflow description & seen tracking) */}
      {activeTaskDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-background border border-border shadow-2xl">
            <CardHeader className="flex flex-row items-start justify-between pb-3 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      activeTaskDetails.priority === "CRITICAL"
                        ? "bg-red-500 text-white"
                        : activeTaskDetails.priority === "HIGH"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {activeTaskDetails.priority === "CRITICAL"
                      ? "فوری و بحرانی"
                      : activeTaskDetails.priority === "HIGH"
                      ? "اولویت بالا"
                      : "عادی"}
                  </span>
                  <CardTitle className="text-base font-bold text-foreground">
                    {activeTaskDetails.title}
                  </CardTitle>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-3">
                  <span>ارجاع‌دهنده: {activeTaskDetails.senderName}</span>
                  <span>مجری: {activeTaskDetails.receiverName}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTaskDetails(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Timing and Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/30 rounded-lg text-xs border border-border/50">
                <div className="flex items-center gap-1 font-mono text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>مهلت اقدام: {activeTaskDetails.dueDate}</span>
                </div>
                <Badge
                  variant={
                    activeTaskDetails.status === "APPROVED" || activeTaskDetails.status === "COMPLETED"
                      ? "green"
                      : activeTaskDetails.status === "COMPLETED_BY_MENTOR"
                      ? "yellow"
                      : activeTaskDetails.status === "REJECTED"
                      ? "red"
                      : activeTaskDetails.status === "SEEN_IN_PROGRESS" || activeTaskDetails.status === "IN_PROGRESS"
                      ? "blue"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {activeTaskDetails.status === "APPROVED" || activeTaskDetails.status === "COMPLETED"
                    ? "تأیید نهایی شده"
                    : activeTaskDetails.status === "COMPLETED_BY_MENTOR"
                    ? "در انتظار تأیید سرپرست"
                    : activeTaskDetails.status === "REJECTED"
                    ? "رد شده / اصلاح"
                    : activeTaskDetails.status === "SEEN_IN_PROGRESS"
                    ? "مشاهده‌شده و در حال پیگیری"
                    : activeTaskDetails.status === "IN_PROGRESS"
                    ? "در حال اقدام"
                    : "در انتظار اقدام"}
                </Badge>
              </div>

              {activeTaskDetails.seenAt && (
                <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5 bg-blue-500/10 p-2 rounded-md border border-blue-500/20">
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    مشاهده‌شده توسط مجری در تاریخ:{" "}
                    {new Date(activeTaskDetails.seenAt).toLocaleDateString("fa-IR")} ساعت{" "}
                    {new Date(activeTaskDetails.seenAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}

              {/* Bounded Full Description Container with Anti-Overflow */}
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">
                  شرح کامل وظیفه سازمانی:
                </label>
                <div className="max-h-[300px] overflow-y-auto break-words p-3 bg-muted/40 rounded-lg text-xs leading-relaxed text-foreground whitespace-pre-wrap border border-border/60">
                  {activeTaskDetails.description}
                </div>
              </div>

              {/* Resolution Notes by Mentor */}
              {activeTaskDetails.resolutionNotes && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <strong className="block">گزارش انجام کار پشتیبان مجری:</strong>
                  <p className="whitespace-pre-wrap">{activeTaskDetails.resolutionNotes}</p>
                </div>
              )}

              {/* Supervisor Review Notes */}
              {activeTaskDetails.reviewNotes && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-800 dark:text-purple-300 space-y-1">
                  <strong className="block">بازبینی و دستور سرپرست ({activeTaskDetails.reviewedByName || "سرپرست"}):</strong>
                  <p className="whitespace-pre-wrap">{activeTaskDetails.reviewNotes}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setActiveTaskDetails(null)}
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
