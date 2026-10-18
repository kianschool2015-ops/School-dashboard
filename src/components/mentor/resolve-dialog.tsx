"use client";

import React, { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { resolveTriageCaseAction } from "@/server/actions/mentor";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface ResolveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  triggerCode: string;
  candidateName: string;
}

export function ResolveDialog({
  isOpen,
  onClose,
  caseId,
  triggerCode,
  candidateName,
}: ResolveDialogProps) {
  const [interventionNotes, setInterventionNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  const handleResolve = () => {
    if (!interventionNotes.trim() || interventionNotes.trim().length < 5) {
      setErrorMessage("لطفاً شرح اقدام مداخله‌ای (حداقل ۵ کاراکتر) را وارد نمایید.");
      return;
    }

    startTransition(async () => {
      setErrorMessage("");
      const res = await resolveTriageCaseAction({
        caseId,
        interventionNotes: interventionNotes.trim(),
      });
      if (res.success) {
        onClose();
      } else {
        setErrorMessage(res.message || "خطا در ثبت مداخله.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border bg-card p-6">
        <DialogHeader>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <DialogTitle className="text-sm font-bold text-foreground">
              حل مانع و مختومه کردن پرونده پایش ({triggerCode})
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            داوطلب: <span className="text-foreground font-medium">{candidateName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          <label className="text-xs text-muted-foreground block">
            شرح اقدام مداخله‌ای و رهنمود ارائه شده توسط پشتیبان (ثبت در پرونده):
          </label>
          <textarea
            value={interventionNotes}
            onChange={(e) => setInterventionNotes(e.target.value)}
            rows={4}
            placeholder="مثال: تماس تلفنی برقرار شد. بودجه‌بندی مبحث مدنی ۳ اصلاح و تست‌های هدفمند برای افزایش تسلط تعیین گردید..."
            className="w-full text-xs rounded-lg border border-border bg-card p-3 text-foreground placeholder-muted-foreground/40 focus:border-emerald-500 focus:outline-none resize-none"
          />
          {errorMessage && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errorMessage}</p>
          )}
        </div>

        <DialogFooter className="mt-4 border-t border-border pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            انصراف
          </Button>
          <Button
            size="sm"
            onClick={handleResolve}
            disabled={isPending}
            className="min-w-28 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? "در حال ثبت..." : "مختومه کردن پرونده"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
