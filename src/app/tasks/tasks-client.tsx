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
} from "lucide-react";
import { assignHierarchyTaskAction, updateHierarchyTaskStatusAction } from "@/server/actions/tasks";
import { MultiHorizonGantt } from "@/components/analytics/gantt-chart";
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

  // New task form state
  const [selectedReceivers, setSelectedReceivers] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("HIGH");
  const [dueDate, setDueDate] = useState("1403-08-15");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Status notes dialog state
  const [activeTaskForNote, setActiveTaskForNote] = useState<HierarchyTaskRecord | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const canAssign = currentUser.role === "CEO" || currentUser.role === "ADMIN" || currentUser.role === "SUPERVISOR";

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

  const handleUpdateStatus = async (taskId: string, status: TaskStatus, note?: string) => {
    setBanner(null);
    try {
      const res = await updateHierarchyTaskStatusAction({
        taskId,
        status,
        resolutionNotes: note,
      });
      if (res.success) {
        setBanner({ type: "success", text: res.message });
        setActiveTaskForNote(null);
        setResolutionNote("");
      } else {
        setBanner({ type: "error", text: res.message });
      }
    } catch {
      setBanner({ type: "error", text: "خطا در به‌روزرسانی وضعیت وظیفه." });
    }
  };

  const filteredTasks = initialTasks.filter((t) => {
    if (filterStatus === "ALL") return true;
    return t.status === filterStatus;
  });

  const pendingCount = initialTasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount = initialTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const completedCount = initialTasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">کارتابل ارجاع وظایف سازمانی (Hierarchy Tasks)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.role === "CEO"
              ? "ارجاع و نظارت بر وظایف محوله به سرپرستان و پشتیبانان آموزشی"
              : currentUser.role === "SUPERVISOR"
              ? "مدیریت تسک‌های ابلاغی از مدیریت ارشد و ارجاع وظایف به پشتیبانان کوهورت"
              : "وظایف محوله از سوی سرپرستی و مدیریت"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowGantt(!showGantt)}
            className="flex items-center gap-2 text-xs"
          >
            <TrendingUp className="h-4 w-4" />
            {showGantt ? "پنهان‌سازی گانت‌چارت عملکرد" : "مشاهده گانت‌چارت عملکرد"}
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
          entityName={currentUser.role === "SUPERVISOR" ? "تیم پشتیبانان کوهورت" : "سرپرستان آموزشی"}
          readOnlyAuditorRole={currentUser.role === "CEO" ? "CEO" : "SUPERVISOR"}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-muted/30 rounded-xl border border-border flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">کل وظایف</p>
            <p className="text-xl font-bold mt-1">{initialTasks.length}</p>
          </div>
          <ListTodo className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-800 dark:text-amber-300">در انتظار اقدام</p>
            <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">{pendingCount}</p>
          </div>
          <Clock className="h-6 w-6 text-amber-600" />
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-800 dark:text-blue-300">در حال انجام</p>
            <p className="text-xl font-bold text-blue-900 dark:text-blue-200 mt-1">{inProgressCount}</p>
          </div>
          <Clock className="h-6 w-6 text-blue-600" />
        </div>
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">تکمیل شده</p>
            <p className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{completedCount}</p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
      </div>

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
                  {isSubmitting ? "در حال ثبت و ارسال پیامک..." : "ارجاع وظیفه و شلیک پیامک"}
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
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setFilterStatus("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "ALL" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          همه وظایف ({initialTasks.length})
        </button>
        <button
          onClick={() => setFilterStatus("PENDING")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "PENDING" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          در انتظار اقدام ({pendingCount})
        </button>
        <button
          onClick={() => setFilterStatus("IN_PROGRESS")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "IN_PROGRESS" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          در حال انجام ({inProgressCount})
        </button>
        <button
          onClick={() => setFilterStatus("COMPLETED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterStatus === "COMPLETED" ? "bg-emerald-600 text-white shadow-xs" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          تکمیل شده ({completedCount})
        </button>
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
                          task.status === "COMPLETED" ? "default" : task.status === "IN_PROGRESS" ? "secondary" : "outline"
                        }
                        className="text-xs"
                      >
                        {task.status === "COMPLETED" ? "تکمیل شده" : task.status === "IN_PROGRESS" ? "در حال اقدام" : "در انتظار"}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {task.description}
                  </p>

                  {task.resolutionNotes && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-900 dark:text-emerald-200">
                      <strong>گزارش انجام:</strong> {task.resolutionNotes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>ارجاع دهنده: <strong className="text-foreground">{task.senderName}</strong></span>
                      <span>گیرنده: <strong className="text-foreground">{task.receiverName}</strong></span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {task.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                          className="text-xs h-7"
                        >
                          شروع اقدام
                        </Button>
                      )}

                      {task.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          onClick={() => setActiveTaskForNote(task)}
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          ثبت خاتمه و تکمیل
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Resolution Note Modal */}
      {activeTaskForNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg bg-background border border-border shadow-xl">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ثبت خاتمه وظیفه ({activeTaskForNote.title})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  توضیحات و گزارش نحوه انجام (اختیاری جهت آرشیو):
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="اقدامات انجام‌شده، نتایج تماس با داوطلب و مستندات را بنویسید..."
                  className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleUpdateStatus(activeTaskForNote.id, "COMPLETED", resolutionNote)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                >
                  تایید و ثبت وضعیت نهایی
                </Button>
                <Button variant="outline" onClick={() => setActiveTaskForNote(null)}>
                  انصراف
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
