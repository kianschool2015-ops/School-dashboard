"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected runtime error to client console
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center p-4"
      dir="rtl"
    >
      <Card className="max-w-lg w-full border-border/80 bg-card shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center pb-2 pt-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <CardTitle className="text-lg font-bold text-foreground">
            خطا در بارگذاری اطلاعات سامانه
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 text-center px-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            متأسفانه در برقراری ارتباط با پایگاه داده یا پردازش درخواست شما خطایی رخ داده است.
            سامانه به‌صورت خودکار در حال بازیابی و همگام‌سازی است.
          </p>

          {error.digest && (
            <div className="inline-block px-3 py-1.5 rounded-lg bg-muted/70 text-[11px] font-mono text-muted-foreground border border-border/50">
              کد پیگیری خطا (Digest): {error.digest}
            </div>
          )}

          {process.env.NODE_ENV === "development" && error.message && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 font-mono text-left overflow-x-auto max-h-36">
              {error.message}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pt-2 pb-6 px-6">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs px-5 py-2.5 rounded-xl shadow"
          >
            <RefreshCw className="w-4 h-4 ml-1" />
            <span>تلاش مجدد (بارگذاری دوباره)</span>
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2 text-xs px-5 py-2.5 rounded-xl border-border hover:bg-muted"
            >
              <Home className="w-4 h-4 ml-1" />
              <span>بازگشت به صفحه اصلی</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
