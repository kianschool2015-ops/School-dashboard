"use client";

import React, { useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Users,
} from "lucide-react";
import { importStudentWhitelistFromFileAction } from "@/server/actions/whitelist";
import { toPersianDigits } from "@/lib/jalali";
import * as XLSX from "xlsx";

interface BulkExcelImportProps {
  mentorsList: Array<{ id: string; fullName: string }>;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export function BulkExcelImport({
  mentorsList,
  onSuccess,
  title = "آپلود و ورود دسته‌جمعی داوطلبان با اکسل (Bulk Excel Ingestion)",
  description = "فایل اکسل (.xlsx, .xls, .csv) حاوی مشخصات داوطلبان را بارگذاری فرمایید تا به صورت دسته‌جمعی در فهرست مجاز (لیست سفید) ثبت و پیامک دعوت خودکار برای آنان ارسال گردد.",
}: BulkExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultMentorId, setDefaultMentorId] = useState<string>(mentorsList[0]?.id || "usr_mentor1");
  const [defaultCourseName, setDefaultCourseName] = useState<string>("دوره طلایی آمادگی آزمون وکالت ۳۶۰");
  const [defaultCourseCode, setDefaultCourseCode] = useState<string>("BAR-360");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, unknown>>>([]);
  const [resultBanner, setResultBanner] = useState<{
    type: "success" | "error";
    message: string;
    importedCount?: number;
    skippedCount?: number;
  } | null>(null);

  // Generate and download a standard Excel template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        "نام و نام خانوادگی": "سارا حسینی",
        "کد ملی": "0012345678",
        "شماره موبایل": "09121112233",
        "نام دوره": "دوره جامع ۳۶۰ آزمون وکالت کانون",
        "کد دوره": "BAR-360-GOLD",
        "نام پشتیبان": "استاد علی کاظمی",
      },
      {
        "نام و نام خانوادگی": "محمد رضایی",
        "کد ملی": "0023456789",
        "شماره موبایل": "09192223344",
        "نام دوره": "دوره فشرده آزمون مرکز وکلا",
        "کد دوره": "BAR-MERKAZ-100",
        "نام پشتیبان": "استاد علی کاظمی",
      },
      {
        "نام و نام خانوادگی": "الهام قاسمی",
        "کد ملی": "0034567890",
        "شماره موبایل": "09353334455",
        "نام دوره": "دوره طلایی آمادگی آزمون وکالت ۳۶۰",
        "کد دوره": "BAR-360",
        "نام پشتیبان": "استاد علی کاظمی",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    // Set column widths
    worksheet["!cols"] = [
      { wch: 22 }, // Name
      { wch: 15 }, // National ID
      { wch: 18 }, // Phone
      { wch: 32 }, // Course Name
      { wch: 18 }, // Course Code
      { wch: 20 }, // Mentor
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "داوطلبان_مشاهیر");
    XLSX.writeFile(workbook, "Mashahir_Candidates_Whitelist_Template.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResultBanner(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Read preview of first 5 rows
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (buffer) {
          const wb = XLSX.read(buffer, { type: "binary" });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet);
          setPreviewRows(rows.slice(0, 5));
        }
      } catch {
        setPreviewRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setResultBanner(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(",")?.[1] || (event.target?.result as string);
        if (!base64) {
          setResultBanner({ type: "error", message: "خطا در خواندن محتوای فایل." });
          setIsProcessing(false);
          return;
        }

        const res = await importStudentWhitelistFromFileAction({
          fileBase64: base64,
          fileName: selectedFile.name,
          defaultMentorId,
          defaultCourseName,
          defaultCourseCode,
        });

        if (res.success) {
          setResultBanner({
            type: "success",
            message: res.message,
            importedCount: res.importedCount,
            skippedCount: res.skippedCount,
          });
          setSelectedFile(null);
          setPreviewRows([]);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          if (onSuccess) onSuccess();
        } else {
          setResultBanner({ type: "error", message: res.message });
        }
        setIsProcessing(false);
      };

      reader.onerror = () => {
        setResultBanner({ type: "error", message: "خطا در خواندن فایل از حافظه محلی." });
        setIsProcessing(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch {
      setResultBanner({ type: "error", message: "خطا در برقراری ارتباط با سرور جهت بارگذاری اکسل." });
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border border-border bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="shrink-0 flex items-center gap-1.5 text-xs h-8 border-border"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>دانلود تمپلیت اکسل نمونه (.xlsx)</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {resultBanner && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${
              resultBanner.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
            }`}
          >
            {resultBanner.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p>{resultBanner.message}</p>
              {resultBanner.importedCount !== undefined && (
                <div className="flex items-center gap-3 text-[11px] pt-1">
                  <span>
                    تعداد افزوده‌شده:{" "}
                    <strong className="persian-nums">{toPersianDigits(resultBanner.importedCount)}</strong>
                  </span>
                  {resultBanner.skippedCount !== undefined && (
                    <span>
                      تعداد ردشده (تکراری/ناقص):{" "}
                      <strong className="persian-nums">{toPersianDigits(resultBanner.skippedCount)}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Configuration for Course and Default Mentor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-xl border border-border/60 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              دوره آموزشی پیش‌فرض:
            </label>
            <input
              type="text"
              value={defaultCourseName}
              onChange={(e) => setDefaultCourseName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs"
              placeholder="دوره طلایی آمادگی آزمون وکالت ۳۶۰"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              کد دوره پیش‌فرض:
            </label>
            <input
              type="text"
              value={defaultCourseCode}
              onChange={(e) => setDefaultCourseCode(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-mono"
              placeholder="BAR-360"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              پشتیبان آموزشی پیش‌فرض (در صورت خالی بودن):
            </label>
            <select
              value={defaultMentorId}
              onChange={(e) => setDefaultMentorId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs"
            >
              {mentorsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File Dropzone / Picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-6 border-2 border-dashed border-border hover:border-emerald-500/50 rounded-xl text-center cursor-pointer transition-colors bg-muted/10 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600">
            <Upload className="h-5 w-5" />
          </div>
          {selectedFile ? (
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground flex items-center justify-center gap-1.5">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <span>فایل انتخاب‌شده: {selectedFile.name}</span>
              </span>
              <span className="text-[11px] text-muted-foreground block persian-nums">
                حجم فایل: {toPersianDigits(Math.round(selectedFile.size / 1024))} کیلوبایت
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">
                جهت انتخاب فایل اکسل یا CSV کلیک فرمایید یا فایل را به اینجا بکشید
              </span>
              <span className="text-[11px] text-muted-foreground block">
                فرمت‌های مجاز: XLSX, XLS, CSV (حاوی ستون‌های نام، کدملی، شماره همراه)
              </span>
            </div>
          )}
        </div>

        {/* Preview of Parsed Rows */}
        {previewRows.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden text-xs">
            <div className="p-2.5 bg-muted/40 border-b border-border font-bold text-muted-foreground flex items-center justify-between">
              <span>پیش‌نمایش ردیف‌های فایل ({toPersianDigits(previewRows.length)} ردیف اول):</span>
              <Badge variant="outline" className="text-[10px]">
                بررسی هوشمند ستون‌های فارسی و انگلیسی
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead className="bg-muted/20 border-b border-border text-[11px] text-muted-foreground">
                  <tr>
                    <th className="p-2 text-start">ردیف</th>
                    {Object.keys(previewRows[0] || {}).map((k) => (
                      <th key={k} className="p-2 text-start">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-2 text-muted-foreground font-mono text-[10px]">{idx + 1}</td>
                      {Object.values(row).map((v, cIdx) => (
                        <td key={cIdx} className="p-2 text-foreground font-medium">
                          {String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Button */}
        {selectedFile && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setPreviewRows([]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs h-9"
            >
              انصراف
            </Button>
            <Button
              type="button"
              disabled={isProcessing}
              onClick={handleUpload}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>در حال پردازش و ثبت در پایگاه‌داده...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>تأیید و بارگذاری دسته‌جمعی داوطلبان</span>
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
