"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS,
  toPersianDigits,
  jalaliToGregorian,
  gregorianToJalali,
  formatJalaliDate,
} from "@/lib/jalali";
import { Calendar as CalendarIcon, Clock, ChevronRight, ChevronLeft, Check, X } from "lucide-react";
import { Button } from "./button";

interface JalaliDatePickerProps {
  label?: string;
  value?: string; // Jalali format: "1405/07/15 10:00" or ISO / date string
  onChange: (value: string, dateObj?: Date) => void;
  placeholder?: string;
  baseYear?: number; // Default 1405
  includeTime?: boolean;
  required?: boolean;
  minDate?: string;
}

export function JalaliDatePicker({
  label,
  value,
  onChange,
  placeholder = "انتخاب تاریخ و ساعت شمسی...",
  baseYear = 1405,
  includeTime = true,
  required = false,
}: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse initial state from value or default to baseYear
  const parsed = useMemo(() => {
    if (!value) {
      return { year: baseYear, month: 1, day: 1, hour: 9, minute: 0 };
    }

    // Try parsing "YYYY/MM/DD HH:mm" or "YYYY-MM-DD HH:mm"
    const clean = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).trim();
    const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: Math.min(12, Math.max(1, parseInt(match[2], 10))),
        day: Math.min(31, Math.max(1, parseInt(match[3], 10))),
        hour: match[4] ? parseInt(match[4], 10) : 9,
        minute: match[5] ? parseInt(match[5], 10) : 0,
      };
    }

    // Fallback: try parsing standard Gregorian date
    try {
      const gDate = new Date(value);
      if (!isNaN(gDate.getTime())) {
        const j = gregorianToJalali(gDate.getFullYear(), gDate.getMonth() + 1, gDate.getDate());
        return {
          year: j.jy,
          month: j.jm,
          day: j.jd,
          hour: gDate.getHours(),
          minute: gDate.getMinutes(),
        };
      }
    } catch {}

    return { year: baseYear, month: 1, day: 1, hour: 9, minute: 0 };
  }, [value, baseYear]);

  const [selectedYear, setSelectedYear] = useState(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState(parsed.month);
  const [selectedDay, setSelectedDay] = useState(parsed.day);
  const [selectedHour, setSelectedHour] = useState(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);

  useEffect(() => {
    setSelectedYear(parsed.year);
    setSelectedMonth(parsed.month);
    setSelectedDay(parsed.day);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
  }, [parsed]);

  // Available Years around baseYear
  const yearsList = useMemo(() => {
    const years: number[] = [];
    for (let y = baseYear - 3; y <= baseYear + 3; y++) {
      years.push(y);
    }
    return years;
  }, [baseYear]);

  // Days count for selected month & year
  const daysInMonth = useMemo(() => {
    if (selectedMonth <= 6) return 31;
    if (selectedMonth <= 11) return 30;
    // Esfand leap calculation
    const jy = selectedYear - 979;
    const isLeap = ((jy + 38) * 31) % 128 < 31;
    return isLeap ? 30 : 29;
  }, [selectedYear, selectedMonth]);

  // Compute first day of the month (weekday index 0=Shanbeh to 6=Jomeh)
  const firstDayWeekday = useMemo(() => {
    const { gy, gm, gd } = jalaliToGregorian(selectedYear, selectedMonth, 1);
    const d = new Date(gy, gm - 1, gd);
    const jsDay = d.getDay(); // 0 is Sunday, 6 is Saturday
    return (jsDay + 1) % 7; // 0=Shanbeh, 6=Jomeh
  }, [selectedYear, selectedMonth]);

  const handleApply = () => {
    const mm = selectedMonth < 10 ? `0${selectedMonth}` : `${selectedMonth}`;
    const dd = selectedDay < 10 ? `0${selectedDay}` : `${selectedDay}`;
    const hh = selectedHour < 10 ? `0${selectedHour}` : `${selectedHour}`;
    const min = selectedMinute < 10 ? `0${selectedMinute}` : `${selectedMinute}`;

    const formattedStr = includeTime
      ? `${selectedYear}/${mm}/${dd} ${hh}:${min}`
      : `${selectedYear}/${mm}/${dd}`;

    const { gy, gm, gd } = jalaliToGregorian(selectedYear, selectedMonth, selectedDay);
    const dateObj = new Date(gy, gm - 1, gd, selectedHour, selectedMinute, 0);

    onChange(formattedStr, dateObj);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const now = new Date();
    const j = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    setSelectedYear(j.jy);
    setSelectedMonth(j.jm);
    setSelectedDay(j.jd);
    setSelectedHour(now.getHours());
    setSelectedMinute(Math.floor(now.getMinutes() / 5) * 5);
  };

  const displayFormatted = useMemo(() => {
    if (!value) return "";
    const clean = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).trim();
    const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      const h = match[4] ? match[4] : null;
      const min = match[5] ? match[5] : null;

      const monthName = PERSIAN_MONTHS[m - 1] || "";
      if (h !== null && min !== null) {
        return `${toPersianDigits(d)} ${monthName} ${toPersianDigits(y)} - ساعت ${toPersianDigits(h)}:${toPersianDigits(min)}`;
      }
      return `${toPersianDigits(d)} ${monthName} ${toPersianDigits(y)}`;
    }
    return value;
  }, [value]);

  return (
    <div className="space-y-1 relative" dir="rtl">
      {label && (
        <label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs border border-border rounded-lg bg-background text-foreground hover:border-amber-500/50 transition-all focus:outline-hidden focus:ring-1 focus:ring-amber-500"
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className={displayFormatted ? "text-foreground font-medium" : "text-muted-foreground"}>
            {displayFormatted || placeholder}
          </span>
        </span>
        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>

      {/* Modal / Popover Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-80 sm:w-88 p-4 bg-card border border-border rounded-2xl shadow-2xl space-y-4 backdrop-blur-md animate-in fade-in zoom-in-95">
          {/* Header Controls: Year & Month Selectors */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear((y) => y - 1);
                } else {
                  setSelectedMonth((m) => m - 1);
                }
              }}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2 py-1 text-xs font-bold rounded-lg border border-border bg-background text-foreground"
              >
                {PERSIAN_MONTHS.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1 text-xs font-bold rounded-lg border border-border bg-background text-foreground font-mono"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear((y) => y + 1);
                } else {
                  setSelectedMonth((m) => m + 1);
                }
              }}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {PERSIAN_WEEKDAYS.map((wd, i) => (
              <span
                key={wd}
                className={`text-[10px] font-semibold py-1 rounded-sm ${
                  i === 6 ? "text-rose-500 font-bold" : "text-muted-foreground"
                }`}
              >
                {wd[0]}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-7 w-7" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = selectedDay === dayNum;
              const dayWeekday = (firstDayWeekday + i) % 7;
              const isFriday = dayWeekday === 6;

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-amber-600 text-white font-bold shadow-xs scale-105"
                      : isFriday
                      ? "text-rose-500 hover:bg-rose-500/10 font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {toPersianDigits(dayNum)}
                </button>
              );
            })}
          </div>

          {/* Time Picker (Hour & Minute) */}
          {includeTime && (
            <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>ساعت برگزاری:</span>
              </span>

              <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(Number(e.target.value))}
                  className="px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {h < 10 ? `0${h}` : h}
                    </option>
                  ))}
                </select>
                <span className="font-bold text-muted-foreground">:</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => setSelectedMinute(Number(e.target.value))}
                  className="px-2 py-1 text-xs rounded-lg border border-border bg-background text-foreground"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 41, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {m < 10 ? `0${m}` : m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-[11px] text-amber-600 hover:underline"
            >
              امروز / اکنون
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs h-7 px-2.5"
              >
                <X className="w-3.5 h-3.5 ml-1" />
                <span>انصراف</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="text-xs h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Check className="w-3.5 h-3.5 ml-1" />
                <span>تأیید تاریخ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
