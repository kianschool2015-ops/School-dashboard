"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { CoachingMissionRecord } from "@/types/models";

interface CoachingMissionsClientProps {
  missions: CoachingMissionRecord[];
}

export function CoachingMissionsClient({ missions }: CoachingMissionsClientProps) {
  const [missionStates, setMissionStates] = useState<
    Record<string, "NOT_DONE" | "PARTIAL" | "DONE">
  >({
    mis_1: "DONE",
    mis_2: "DONE",
    mis_3: "PARTIAL",
    mis_4: "NOT_DONE",
  });

  const handleToggle = (id: string, status: "NOT_DONE" | "PARTIAL" | "DONE") => {
    setMissionStates((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  const doneCount = Object.values(missionStates).filter((s) => s === "DONE").length;
  const partialCount = Object.values(missionStates).filter((s) => s === "PARTIAL").length;
  const total = missions.length || 1;
  const adherencePercent = Math.round(((doneCount + 0.5 * partialCount) / total) * 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center space-x-2 space-x-reverse">
            <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>ماموریت‌های هفتگی مربیگری تحصیلی (Screen 08)</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            عادات رفتاری، فیزیولوژی مطالعه و تکنیک‌های استانداردسازی روتین آزمون وکالت
          </p>
        </div>

        <div className="bg-card px-4 py-2 rounded-xl border border-border flex items-center space-x-2 space-x-reverse">
          <span className="text-xs text-muted-foreground">نرخ پایبندی به عادات:</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
            %{toPersianDigits(adherencePercent)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {missions.map((mission) => {
          const status = missionStates[mission.id] || "NOT_DONE";

          return (
            <Card
              key={mission.id}
              className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-xs font-bold text-foreground">{mission.title}</span>
                  <Badge variant="tier" className="text-[10px]">
                    {mission.category}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  توصیه شده توسط سرپرستی آموزش برای هفته ۳۰ سال ۱۴۰۳
                </p>
              </div>

              {/* Toggle Buttons */}
              <div className="flex items-center space-x-1.5 space-x-reverse self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleToggle(mission.id, "DONE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    status === "DONE"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  انجام شد
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(mission.id, "PARTIAL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    status === "PARTIAL"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  بخشی
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(mission.id, "NOT_DONE")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    status === "NOT_DONE"
                      ? "bg-rose-500/80 text-white shadow-sm"
                      : "bg-white/5 text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  نشد
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
