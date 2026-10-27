"use client";

import React, { useEffect, useState, useMemo, useRef, createContext, useContext } from "react";
import { toPersianDigits } from "@/lib/jalali";

export interface ForensicWatermarkProps {
  userFullName?: string;
  nationalId?: string;
  phoneNumber?: string;
  user?: {
    name?: string;
    phoneNumber?: string;
    nationalId?: string;
  };
  children?: React.ReactNode;
  disableCopy?: boolean;
}

const ForensicWatermarkContext = createContext<boolean>(false);

export function ForensicWatermark({
  userFullName = "کاربر مشاهیر دانش",
  nationalId = "••••••••••",
  phoneNumber = "۰۹•••••••••",
  user,
  children,
  disableCopy = true,
}: ForensicWatermarkProps) {
  const isNested = useContext(ForensicWatermarkContext);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const userName = user?.name || userFullName || "کاربر مشاهیر دانش";
  const userPhone = user?.phoneNumber || phoneNumber || "۰۹•••••••••";
  const userNatId = user?.nationalId || nationalId || "ثبت‌شده";

  // Dynamic forensic stamp with timestamp and identity
  const stampText = useMemo(() => {
    return `${userName} • ${toPersianDigits(userPhone)} • کدملی: ${toPersianDigits(userNatId)} • مشاهیر دانش`;
  }, [userName, userPhone, userNatId]);

  // Render invisible dual-channel watermark onto overlay canvas
  useEffect(() => {
    if (isNested) return;

    const renderWatermarkCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.font = "bold 13px Vazirmatn, Tahoma, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      // Rotate canvas by -25 degrees
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-25 * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);

      const xStep = 320;
      const yStep = 90;
      const diagonalBound = Math.max(width, height) * 2;

      for (let y = -diagonalBound; y < diagonalBound; y += yStep) {
        for (let x = -diagonalBound; x < diagonalBound; x += xStep) {
          const offsetX = (Math.floor(y / yStep) % 2) * (xStep / 2);

          // Dual-channel micro-offset technique:
          // Pass 1: Subtle blue channel shift (opacity 0.012)
          ctx.fillStyle = "rgba(0, 40, 255, 0.012)";
          ctx.fillText(stampText, x + offsetX, y);

          // Pass 2: Complementary amber/red offset by 1px (opacity 0.012)
          ctx.fillStyle = "rgba(255, 140, 0, 0.012)";
          ctx.fillText(stampText, x + offsetX + 1, y + 1);
        }
      }

      ctx.restore();
    };

    renderWatermarkCanvas();
    window.addEventListener("resize", renderWatermarkCanvas);

    // MutationObserver to prevent tampering with or removing the watermark canvas
    let observer: MutationObserver | null = null;
    const targetNode = containerRef.current;
    if (targetNode) {
      observer = new MutationObserver(() => {
        const canvas = canvasRef.current;
        if (!canvas || !document.body.contains(canvas) || canvas.style.display === "none" || canvas.style.opacity === "0") {
          renderWatermarkCanvas();
        }
      });
      observer.observe(targetNode, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }

    return () => {
      window.removeEventListener("resize", renderWatermarkCanvas);
      if (observer) observer.disconnect();
    };
  }, [stampText, isNested]);

  // Anti-Copy and Screen Recording Protection
  useEffect(() => {
    if (!disableCopy || isNested) return;

    const showWarning = (msg: string) => {
      setToastMessage(msg);
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showWarning("کپی‌برداری و ذخیره محتوا به دلیل حفظ حقوق معنوی موسسه مشاهیر دانش غیرفعال است.");
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (
        (isCtrl && (key === "c" || key === "s" || key === "p" || key === "u" || key === "a")) ||
        e.key === "F12"
      ) {
        e.preventDefault();
        showWarning("ذخیره، کپی و چاپ محتوای این صفحه به دلایل حقوقی و امنیتی مسدود گردیده است.");
        return false;
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [disableCopy, isNested]);

  if (isNested) {
    return <>{children}</>;
  }

  return (
    <ForensicWatermarkContext.Provider value={true}>
      <div ref={containerRef} className="relative w-full min-h-full select-none forensic-protected-wrapper">
        <style jsx global>{`
          @media print {
            body {
              display: none !important;
            }
            html {
              display: none !important;
            }
          }
          .forensic-protected-wrapper {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
          }
        `}</style>

        {/* 100% Invisible Dual-Channel Pixel Watermark Canvas Overlay */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none select-none z-[9999] opacity-100"
        />

        {/* Non-intrusive DRM toast warning */}
        {toastMessage && (
          <div
            role="alert"
            className="fixed bottom-8 start-1/2 -translate-x-1/2 z-[10000] px-5 py-3 rounded-2xl bg-slate-900/95 text-white text-xs md:text-sm font-semibold shadow-2xl border border-amber-400/40 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Content */}
        {children ? <div className="relative z-10">{children}</div> : null}
      </div>
    </ForensicWatermarkContext.Provider>
  );
}
