import React from "react";
import { Calendar, Clock } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { CourseWeekInfo } from "@/lib/jalali-week";

interface ActiveWeekBadgeProps {
  weekInfo: CourseWeekInfo;
  className?: string;
  variant?: "default" | "compact" | "banner";
}

export function ActiveWeekBadge({
  weekInfo,
  className = "",
  variant = "default",
}: ActiveWeekBadgeProps) {
  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#004071]/10 text-[#004071] dark:text-sky-400 border border-[#004071]/20 text-xs font-bold ${className}`}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>
          هفته {toPersianDigits(weekInfo.weekNumber)} از {toPersianDigits(weekInfo.totalWeeks)}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#004071]/10 via-[#004071]/5 to-transparent border border-[#004071]/20 text-foreground text-xs shadow-xs ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#004071] text-white flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-[#004071] dark:text-sky-300">
              هفته مطالعاتی {toPersianDigits(weekInfo.weekNumber)} از {toPersianDigits(weekInfo.totalWeeks)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              شنبه {toPersianDigits(weekInfo.currentWeekStartJalali)} الی جمعه{" "}
              {toPersianDigits(weekInfo.currentWeekEndJalali)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background/80 px-2.5 py-1 rounded-lg border border-border">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>
            {weekInfo.daysRemainingInWeek === 0
              ? "امروز جمعه (روز ارزیابی هفتگی)"
              : `${toPersianDigits(weekInfo.daysRemainingInWeek)} روز تا پایان هفته مطالعاتی`}
          </span>
        </div>
      </div>
    );
  }

  // Default pill badge
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground text-xs shadow-xs ${className}`}
      title={weekInfo.formattedBadge}
    >
      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className="font-bold text-[#004071] dark:text-sky-300">
        هفته مطالعاتی {toPersianDigits(weekInfo.weekNumber)} از {toPersianDigits(weekInfo.totalWeeks)}
      </span>
      <span className="text-muted-foreground text-[11px]">
        (شنبه {toPersianDigits(weekInfo.currentWeekStartJalali)} الی جمعه{" "}
        {toPersianDigits(weekInfo.currentWeekEndJalali)})
      </span>
    </div>
  );
}
