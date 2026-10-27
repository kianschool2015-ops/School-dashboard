"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  QrCode,
  Upload,
  Eye,
  Sliders,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  ArrowRight,
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DecoderMode = "differential" | "contrast" | "binary" | "edge" | "invert";

export default function WatermarkDecoderPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<DecoderMode>("differential");
  const [gain, setGain] = useState<number>(35);
  const [threshold, setThreshold] = useState<number>(128);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [extractedInfoNotice, setExtractedInfoNotice] = useState<string | null>(null);

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const decodedCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image load onto canvases and process
  const processImage = useCallback(() => {
    if (!imageSrc) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const origCanvas = originalCanvasRef.current;
      const decCanvas = decodedCanvasRef.current;
      if (!origCanvas || !decCanvas) return;

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      origCanvas.width = w;
      origCanvas.height = h;
      decCanvas.width = w;
      decCanvas.height = h;

      const origCtx = origCanvas.getContext("2d");
      const decCtx = decCanvas.getContext("2d");
      if (!origCtx || !decCtx) return;

      // Draw original
      origCtx.drawImage(img, 0, 0);

      // Get pixel buffer for forensic decoding
      const imgData = origCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const outputData = decCtx.createImageData(w, h);
      const out = outputData.data;

      // Apply forensic decoding algorithms based on activeMode
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (activeMode === "differential") {
          // Blue-Red & Green micro-channel subtraction
          // Forensic watermark has high blue-channel bias (0, 40, 255) vs (255, 140, 0)
          const diff = (b - (r * 0.6 + g * 0.4));
          const amplified = 128 + diff * (gain * 1.5);
          const clamped = Math.min(255, Math.max(0, amplified));

          // High contrast inversion so text appears crisp dark on light
          out[i] = clamped;
          out[i + 1] = clamped;
          out[i + 2] = clamped;
          out[i + 3] = a;
        } else if (activeMode === "contrast") {
          // Extreme histogram stretch around mean
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const centered = lum - threshold;
          const amplified = 128 + centered * (gain / 5);
          const clamped = Math.min(255, Math.max(0, amplified));

          out[i] = clamped;
          out[i + 1] = clamped;
          out[i + 2] = clamped;
          out[i + 3] = a;
        } else if (activeMode === "binary") {
          // High-precision adaptive binarization
          const blueBias = b - r;
          const val = blueBias > (threshold - 128) / (gain / 10) ? 0 : 255;
          out[i] = val;
          out[i + 1] = val;
          out[i + 2] = val;
          out[i + 3] = a;
        } else if (activeMode === "edge") {
          // Micro-gradient Laplacian
          const blueVal = b;
          const amplified = Math.min(255, Math.abs(blueVal - r) * (gain * 2));
          out[i] = amplified;
          out[i + 1] = amplified;
          out[i + 2] = amplified;
          out[i + 3] = a;
        } else if (activeMode === "invert") {
          // Negative contrast
          out[i] = 255 - r;
          out[i + 1] = 255 - g;
          out[i + 2] = 255 - b;
          out[i + 3] = a;
        }
      }

      decCtx.putImageData(outputData, 0, 0);
      setIsProcessing(false);
      setExtractedInfoNotice("رمزگشایی پیکسلی انجام شد. متن مورب واترمارک را در تصویر پردازش‌شده بررسی نمایید.");
    };

    img.src = imageSrc;
  }, [imageSrc, activeMode, gain, threshold]);

  useEffect(() => {
    processImage();
  }, [processImage]);

  // Handle file upload
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("لطفاً یک فایل تصویری معتبر (PNG, JPG, WebP) انتخاب فرمایید.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") {
        setImageSrc(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste support (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handleFileSelect(blob);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Download Decoded Image
  const handleDownloadDecoded = () => {
    const canvas = decodedCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "mashahir_decoded_watermark.png";
    link.href = url;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/executive" className="hover:text-primary transition-colors">
              پیشخوان مدیریت ارشد
            </Link>
            <span>/</span>
            <span className="text-foreground font-semibold">امنیت و رمزگشایی اسناد</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-[#004071]" />
            <span>رمزگشای هوشمند واترمارک نامرئی پیکسلی</span>
          </h1>
        </div>

        <Link href="/executive">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowRight className="w-3.5 h-3.5 ms-1.5" />
            <span>بازگشت به پیشخوان کلان</span>
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-[#004071] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-foreground block">
                کشف هویت داوطلب یا کاربر از روی اسکرین‌شات و عکس لو رفته
              </span>
              <p className="text-muted-foreground leading-relaxed">
                سامانه به صورت خودکار اطلاعات هویتی (نام و نام خانوادگی، شماره تماس، کدملی و زمان) را به شکل انحراف نانومتری کانال‌های رنگی (Invisible Pixel Offset) روی تمام صفحات تزریق می‌کند. با بارگذاری هر اسکرین‌شات، فیلترهای تفکیک کانال آبی و کنتراست این مشخصات را آشکار می‌سازند.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="blue" className="text-xs">
              الگوریتم پیکسلی Dual-Channel
            </Badge>
            <Badge variant="outline" className="text-xs">
              نسخه ۴.۲ امنیتی
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone / Controls */}
      {!imageSrc ? (
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/10 p-12 text-center rounded-2xl">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-[#004071]/10 text-[#004071] rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                اسکرین‌شات یا تصویر مشکوک را اینجا رها کنید
              </h3>
              <p className="text-xs text-muted-foreground">
                یا می‌توانید کلید <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[11px] font-mono">Ctrl + V</kbd> را بفشارید تا اسکرین‌شات کپی‌شده مستقیماً چسبانده شود.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#004071] hover:bg-[#003058] text-white text-xs px-6 py-2 rounded-xl"
            >
              <Upload className="w-4 h-4 ms-2" />
              <span>انتخاب فایل تصویر</span>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <Card className="border-border bg-card shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Modes */}
                <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveMode("differential")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeMode === "differential"
                        ? "bg-[#004071] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    تفکیک کانال آبی (پیشنهادی)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("contrast")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeMode === "contrast"
                        ? "bg-[#004071] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    تقویت کنتراست شدید
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("binary")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeMode === "binary"
                        ? "bg-[#004071] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    آستانه‌گیری سیاه و سفید
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("edge")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeMode === "edge"
                        ? "bg-[#004071] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    لبه‌یابی متون (Laplacian)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("invert")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeMode === "invert"
                        ? "bg-[#004071] text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    نگاتیو
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    title="بزرگنمایی"
                    className="p-2"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    title="کوچک‌نمایی"
                    className="p-2"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoomLevel(1)}
                    className="text-xs"
                  >
                    ۱۰۰٪
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setImageSrc(null);
                      setExtractedInfoNotice(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5 ms-1.5" />
                    <span>تصویر جدید</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleDownloadDecoded}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="w-3.5 h-3.5 ms-1.5" />
                    <span>ذخیره نتیجه</span>
                  </Button>
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#004071]" />
                      <span>میزان تقویت سیگنال نامرئی (Gain Multiplier):</span>
                    </span>
                    <span className="font-mono text-muted-foreground">{gain}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={gain}
                    onChange={(e) => setGain(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-[#004071]"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-500" />
                      <span>آستانه روشنایی و تفکیک (Threshold):</span>
                    </span>
                    <span className="font-mono text-muted-foreground">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notice */}
          {extractedInfoNotice && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{extractedInfoNotice}</span>
            </div>
          )}

          {/* Viewports: Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Decoded Target (Processed) */}
            <Card className="border-border bg-card shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>تصویر آشکارسازی‌شده (استخراج واترمارک)</span>
                </CardTitle>
                <Badge variant="green" className="text-[10px]">
                  کانال فرکانسی فعال
                </Badge>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex items-center justify-center overflow-auto bg-slate-950/5 min-h-[400px]">
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease",
                  }}
                  className="max-w-full"
                >
                  <canvas ref={decodedCanvasRef} className="max-w-full h-auto rounded-lg shadow-md border" />
                </div>
              </CardContent>
            </Card>

            {/* Original Input */}
            <Card className="border-border bg-card shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span>اسکرین‌شات اصلی اولیه</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  مدرک اصلی
                </Badge>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex items-center justify-center overflow-auto bg-slate-950/5 min-h-[400px]">
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease",
                  }}
                  className="max-w-full"
                >
                  <canvas ref={originalCanvasRef} className="max-w-full h-auto rounded-lg shadow-md border" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
