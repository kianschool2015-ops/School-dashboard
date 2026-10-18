"use client";

import React, { useState, useTransition } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { submitMockExamAction } from "@/server/actions/student";
import type { MockExamRecord } from "@/types/models";

const LAW_SUBJECTS = [
  "حقوق مدنی",
  "حقوق تجارت",
  "آیین دادرسی مدنی",
  "حقوق جزا عمومی و اختصاصی",
  "آیین دادرسی کیفری",
  "متون فقه و اصول فقه",
];

interface MockExamsClientProps {
  studentProfileId: string;
  initialMockExams: MockExamRecord[];
}

export function MockExamsClient({
  studentProfileId,
  initialMockExams,
}: MockExamsClientProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [examTitle, setExamTitle] = useState("آزمون آزمایشی جامع شماره ۵ مشاهیر دانش");
  const [examDate, setExamDate] = useState("1403-07-28");
  const [overallScore, setOverallScore] = useState<number>(72);
  const [subjectScores, setSubjectScores] = useState<Record<string, number>>({
    "حقوق مدنی": 75,
    "حقوق تجارت": 70,
    "آیین دادرسی مدنی": 68,
    "حقوق جزا عمومی و اختصاصی": 74,
    "آیین دادرسی کیفری": 70,
    "متون فقه و اصول فقه": 65,
  });
  const [primaryErrorCause, setPrimaryErrorCause] = useState("کمبود زمان در دور اول پاسخگویی به سوالات");
  const [priorityReviewSubject, setPriorityReviewSubject] = useState("آیین دادرسی مدنی");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState("");

  const handleScoreChange = (subject: string, val: number) => {
    setSubjectScores((prev) => ({
      ...prev,
      [subject]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await submitMockExamAction({
        studentProfileId,
        examTitle,
        examDate,
        overallScorePercent: overallScore,
        subjectScores,
        primaryErrorCause,
        priorityReviewSubject,
      });
      if (res.success) {
        setStatusMessage("کارنامه آزمون با موفقیت ثبت شد!");
        setTimeout(() => {
          setShowAddForm(false);
          setStatusMessage("");
        }, 1200);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="h-4 w-4 ms-1" />
          <span>{showAddForm ? "بستن فرم" : "ثبت کارنامه جدید"}</span>
        </Button>
      </div>

      {/* Add New Mock Exam Form */}
      {showAddForm && (
        <Card className="border-indigo-500/30 p-6 space-y-4">
          <CardTitle className="text-sm font-bold text-foreground">
            ورود درصدها و تحلیل آزمون آزمایشی:
          </CardTitle>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">عنوان آزمون:</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">میانگین کل (درصد):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={overallScore}
                  onChange={(e) => setOverallScore(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:border-indigo-500 focus:outline-none persian-nums"
                  required
                />
              </div>
            </div>

            {/* Subject Percentage Sliders */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-foreground block">
                تفکیک درصد دروس آزمون وکالت:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LAW_SUBJECTS.map((subj) => (
                  <div key={subj} className="bg-muted/50 p-3 rounded-lg border border-border space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground">{subj}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 persian-nums">
                        %{toPersianDigits(subjectScores[subj] || 50)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={subjectScores[subj] || 50}
                      onChange={(e) => handleScoreChange(subj, Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Classifier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">علت اصلی خطاها و تست‌های غلط:</label>
                <input
                  type="text"
                  value={primaryErrorCause}
                  onChange={(e) => setPrimaryErrorCause(e.target.value)}
                  placeholder="مثال: بی‌دقتی در استثنائات قانونی یا کمبود وقت..."
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">درس اولویت‌دار جهت مرور جبرانی:</label>
                <select
                  value={priorityReviewSubject}
                  onChange={(e) => setPriorityReviewSubject(e.target.value)}
                  className="w-full text-xs rounded-lg border border-border bg-card p-2.5 text-foreground focus:border-indigo-500 focus:outline-none"
                >
                  {LAW_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {statusMessage && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{statusMessage}</p>
            )}

            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {isPending ? "در حال ثبت..." : "تایید و ثبت نهایی کارنامه"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Historical Exam Cards */}
      <div className="space-y-4">
        {initialMockExams.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            هنوز کارنامه‌ای برای این داوطلب ثبت نشده است. با کلیک بر روی «ثبت کارنامه جدید» اولین نتیجه آزمون خود را وارد نمایید.
          </Card>
        ) : (
          initialMockExams.map((exam) => (
            <Card key={exam.id} className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border gap-2">
                <div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <h3 className="font-bold text-sm text-foreground">{exam.examTitle}</h3>
                    <Badge variant={exam.analysisStatus === "DONE" ? "green" : "yellow"}>
                      {exam.analysisStatus === "DONE" ? "تحلیل شده" : "نیازمند تحلیل"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    تاریخ: {exam.examDate} • رتبه:{" "}
                    <span className="persian-nums text-foreground">
                      {exam.overallRank ? toPersianDigits(exam.overallRank) : "-"}
                    </span>
                  </p>
                </div>
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="text-end">
                    <span className="text-xs text-muted-foreground block">میانگین کل:</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 persian-nums">
                      %{toPersianDigits(exam.overallScorePercent)}
                    </span>
                  </div>
                  {exam.deltaPreviousExam !== undefined && (
                    <div className="text-end">
                      <span className="text-xs text-muted-foreground block">تغییر نسبت به قبل:</span>
                      <span
                        className={`text-xs font-bold flex items-center space-x-0.5 space-x-reverse persian-nums ${
                          exam.deltaPreviousExam >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {exam.deltaPreviousExam >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {exam.deltaPreviousExam > 0 ? "+" : ""}
                          {toPersianDigits(exam.deltaPreviousExam)}٪
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {exam.subjectScores && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                  {Object.entries(exam.subjectScores).map(([subj, score]) => (
                    <div key={subj} className="bg-muted/50 p-2.5 rounded-lg border border-border">
                      <span className="text-[11px] text-muted-foreground block">{subj}</span>
                      <span
                        className={`text-xs font-bold persian-nums ${
                          score >= 70
                            ? "text-emerald-600 dark:text-emerald-400"
                            : score >= 50
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        %{toPersianDigits(score)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
