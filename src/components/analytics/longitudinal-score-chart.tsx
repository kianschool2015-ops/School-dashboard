"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Award, Target, HelpCircle } from "lucide-react";
import { toPersianDigits, formatJalaliHuman } from "@/lib/jalali";

export interface LongitudinalChartPoint {
  id: string;
  title: string;
  category?: string;
  scorePercent: number;
  deltaFromPrevious?: number;
  deltaFromBaseline?: number;
  date?: Date | string | null;
  mentorNotes?: string | null;
}

export interface LongitudinalScoreChartProps {
  data: LongitudinalChartPoint[];
  passingScore?: number; // e.g. 50% for Iranian Bar Exam standard
  title?: string;
  subtitle?: string;
  className?: string;
  showSummaryCards?: boolean;
}

export function LongitudinalScoreChart({
  data,
  passingScore = 50,
  title = "نمودار طولی رشد و پیشرفت تراز شبیه‌سازها",
  subtitle = "تحلیل روند آمادگی و سنجش مهارت‌های حقوقی در طول زمان",
  className = "",
  showSummaryCards = true,
}: LongitudinalScoreChartProps) {
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <Card className={`border-border bg-card shadow-xs ${className}`}>
        <CardContent className="p-8 text-center">
          <Award className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-bold text-foreground">داده‌ای جهت رسم نمودار طولی تراز یافت نشد</h3>
          <p className="text-xs text-muted-foreground mt-1">
            پس از برگزاری و تایید کارنامه اولین آزمون آزمایشی، روند رشد تحصیلی شما در این بخش رسم خواهد شد.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Chart dimensions & viewBox coordinates
  const svgWidth = 660;
  const svgHeight = 220;
  const padLeft = 55;
  const padRight = 50;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Grid steps (0%, 25%, 50%, 75%, 100%)
  const ySteps = [0, 25, 50, 75, 100];

  // Helper to map score (0-100) to Y pixel coordinate
  const getY = (score: number) => {
    const clamped = Math.max(0, Math.min(100, score));
    return padTop + (1 - clamped / 100) * plotHeight;
  };

  // Helper to map index (0..N-1) to X pixel coordinate
  // In RTL coordinates: rightmost is stage 1 (first), leftmost is latest stage,
  // or standard chronological L-to-R progression where left = Stage 1, right = latest.
  // In standard scientific and Persian dashboards, chronological time flows left-to-right on X axis.
  const getX = (idx: number) => {
    if (data.length <= 1) {
      return padLeft + plotWidth / 2;
    }
    return padLeft + (idx / (data.length - 1)) * plotWidth;
  };

  // Points coordinates
  const points = data.map((item, idx) => ({
    ...item,
    x: getX(idx),
    y: getY(item.scorePercent),
  }));

  // Build SVG path string for area and line
  let linePath = "";
  let areaPath = "";

  if (points.length === 1) {
    const p = points[0];
    linePath = `M ${p.x - 30} ${p.y} L ${p.x + 30} ${p.y}`;
    areaPath = `M ${p.x - 30} ${getY(0)} L ${p.x - 30} ${p.y} L ${p.x + 30} ${p.y} L ${p.x + 30} ${getY(0)} Z`;
  } else {
    // Generate smooth cubic bezier curve
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      linePath += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    areaPath = `${linePath} L ${lastPoint.x} ${getY(0)} L ${firstPoint.x} ${getY(0)} Z`;
  }

  // Summary statistics
  const baselineScore = data[0]?.scorePercent ?? 0;
  const latestScore = data[data.length - 1]?.scorePercent ?? 0;
  const cumulativeGrowth = latestScore - baselineScore;
  const highestScore = Math.max(...data.map((d) => d.scorePercent));
  const avgScore = data.reduce((acc, d) => acc + d.scorePercent, 0) / data.length;

  const passingY = getY(passingScore);
  const activePoint = activePointIndex !== null ? points[activePointIndex] : null;

  return (
    <Card className={`border-border bg-card shadow-xs overflow-hidden ${className}`}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>{title}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>تراز هدف قبولی: {toPersianDigits(passingScore)}٪</span>
            </Badge>
            <Badge variant="outline" className="text-[11px] gap-1 font-mono">
              <span>{toPersianDigits(data.length)} آزمون ثبت‌شده</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* KPI Score Cards */}
        {showSummaryCards && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">آخرین تراز ثبت‌شده</span>
              <strong className="text-base font-mono font-bold text-[#004071] dark:text-blue-400 mt-0.5 block">
                {toPersianDigits(latestScore.toFixed(1))}٪
              </strong>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">رشد تجمعی از پایه</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {cumulativeGrowth >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-rose-500" />
                )}
                <strong
                  className={`text-base font-mono font-bold ${
                    cumulativeGrowth >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {cumulativeGrowth >= 0 ? "+" : ""}
                  {toPersianDigits(cumulativeGrowth.toFixed(1))}٪
                </strong>
              </div>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">بالاترین تراز کسب‌شده</span>
              <strong className="text-base font-mono font-bold text-foreground mt-0.5 block">
                {toPersianDigits(highestScore.toFixed(1))}٪
              </strong>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-[10px] text-muted-foreground block">میانگین تراز کل</span>
              <strong className="text-base font-mono font-bold text-foreground mt-0.5 block">
                {toPersianDigits(avgScore.toFixed(1))}٪
              </strong>
            </div>
          </div>
        )}

        {/* SVG Responsive Area/Line Chart */}
        <div className="relative w-full overflow-x-auto">
          <div className="min-w-[500px] w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-52 select-none overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#004071" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#004071" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#004071" stopOpacity="0.0" />
                </linearGradient>

                {/* Line Gradient */}
                <linearGradient id="scoreLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#004071" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {ySteps.map((step) => {
                const y = getY(step);
                return (
                  <g key={step} className="opacity-70">
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeDasharray={step === 0 ? "none" : "3 3"}
                      className="text-border"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      className="fill-muted-foreground font-mono"
                    >
                      {toPersianDigits(step)}٪
                    </text>
                  </g>
                );
              })}

              {/* Target Passing Score Benchmark Line (Dashed) */}
              <g>
                <line
                  x1={padLeft}
                  y1={passingY}
                  x2={svgWidth - padRight}
                  y2={passingY}
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  strokeOpacity="0.8"
                />
                <text
                  x={svgWidth - padRight + 6}
                  y={passingY + 3}
                  textAnchor="start"
                  fontSize="9"
                  fill="#10b981"
                  fontWeight="bold"
                >
                  حد نصاب قبولی
                </text>
              </g>

              {/* Gradient Filled Area */}
              <path d={areaPath} fill="url(#scoreAreaGradient)" />

              {/* Stroke Curve Line */}
              <path
                d={linePath}
                fill="none"
                stroke="url(#scoreLineGradient)"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Points */}
              {points.map((p, idx) => {
                const isSelected = activePointIndex === idx;
                const isBaseline = idx === 0;
                const hasGrown = (p.deltaFromPrevious ?? 0) >= 0;

                const pointColor = isBaseline
                  ? "#6366f1" // indigo for baseline
                  : hasGrown
                  ? "#10b981" // emerald for growth
                  : "#f43f5e"; // rose for drop

                return (
                  <g
                    key={p.id}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setActivePointIndex(idx)}
                    onClick={() => setActivePointIndex(idx)}
                  >
                    {/* Pulsing ring on active */}
                    {isSelected && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="11"
                        fill={pointColor}
                        fillOpacity="0.2"
                      />
                    )}

                    {/* Outer border ring */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isSelected ? "6.5" : "5"}
                      fill="var(--background, #fff)"
                      stroke={pointColor}
                      strokeWidth={isSelected ? "3" : "2"}
                    />

                    {/* Inner core dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="2.5"
                      fill={pointColor}
                    />

                    {/* Score Label above point */}
                    <text
                      x={p.x}
                      y={p.y - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="bold"
                      className="fill-foreground font-mono"
                    >
                      {toPersianDigits(p.scorePercent.toFixed(1))}٪
                    </text>

                    {/* X-Axis Stage Label below */}
                    <text
                      x={p.x}
                      y={svgHeight - padBottom + 18}
                      textAnchor="middle"
                      fontSize="9"
                      className="fill-muted-foreground"
                    >
                      {isBaseline ? "پایه" : `آزمون ${toPersianDigits(idx + 1)}`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Selected Point Callout Tooltip */}
        {activePoint ? (
          <div className="p-3 bg-muted/30 border border-[#004071]/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in-50 duration-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <strong className="text-foreground font-bold">{activePoint.title}</strong>
                {activePoint.category && (
                  <Badge variant="outline" className="text-[10px]">
                    {activePoint.category}
                  </Badge>
                )}
              </div>
              {activePoint.date && (
                <span className="text-[11px] text-muted-foreground block font-mono">
                  تاریخ برگزاری: {formatJalaliHuman(new Date(activePoint.date))}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <div className="text-center px-2.5 py-1 bg-card rounded-lg border border-border">
                <span className="text-[9px] text-muted-foreground block">تراز کل</span>
                <strong className="text-xs font-mono font-bold text-[#004071] dark:text-blue-400">
                  {toPersianDigits(activePoint.scorePercent.toFixed(1))}٪
                </strong>
              </div>

              {activePoint.deltaFromPrevious !== undefined && (
                <div className="text-center px-2.5 py-1 bg-card rounded-lg border border-border">
                  <span className="text-[9px] text-muted-foreground block">تغییر از قبلی</span>
                  <strong
                    className={`text-xs font-mono font-bold ${
                      activePoint.deltaFromPrevious >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {activePoint.deltaFromPrevious >= 0 ? "+" : ""}
                    {toPersianDigits(activePoint.deltaFromPrevious.toFixed(1))}٪
                  </strong>
                </div>
              )}

              {activePoint.deltaFromBaseline !== undefined && (
                <div className="text-center px-2.5 py-1 bg-card rounded-lg border border-border">
                  <span className="text-[9px] text-muted-foreground block">رشد از بدو ورود</span>
                  <strong
                    className={`text-xs font-mono font-bold ${
                      activePoint.deltaFromBaseline >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {activePoint.deltaFromBaseline >= 0 ? "+" : ""}
                    {toPersianDigits(activePoint.deltaFromBaseline.toFixed(1))}٪
                  </strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-[11px] text-muted-foreground py-1 flex items-center justify-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 opacity-60" />
            <span>جهت مشاهده جزئیات تراز، بر روی نقاط نمودار بروید یا روی مرحله مورد نظر کلیک کنید.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
