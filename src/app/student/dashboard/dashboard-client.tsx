"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { DailyCheckinDrawer } from "@/components/student/daily-checkin-drawer";
import type { ScheduleItemRecord } from "@/types/models";

interface StudentDashboardClientProps {
  studentProfileId: string;
  items: ScheduleItemRecord[];
}

export function StudentDashboardClient({
  studentProfileId,
  items,
}: StudentDashboardClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25 flex items-center space-x-2 space-x-reverse"
      >
        <Zap className="h-4 w-4" />
        <span>ثبت گزارش روزانه (چک‌این زیر ۶۰ ثانیه)</span>
      </Button>

      <DailyCheckinDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        studentProfileId={studentProfileId}
        items={items}
      />
    </>
  );
}
