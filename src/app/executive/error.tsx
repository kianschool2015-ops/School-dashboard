"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ExecutivePortalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Executive Portal Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full border-border/80 bg-card shadow-lg rounded-2xl">
        <CardHeader className="text-center pb-2 pt-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <CardTitle className="text-base font-bold text-foreground">
            خطا در بارگذاری میز مدیریت عالی و بازرسی
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 text-center px-6">
          <p className="text-xs text-muted-foreground leading-relaxed">
            در دریافت شاخص‌های کلان مؤسسه، بازرسی یا گزارش‌های جامع خطایی رخ داده است.
          </p>

          {error.digest && (
            <div className="inline-block px-2.5 py-1 rounded bg-muted/60 text-[10px] font-mono text-muted-foreground">
              شناسه پیگیری: {error.digest}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-2 justify-center pt-2 pb-6 px-6">
          <Button
            onClick={() => reset()}
            className="w-full sm:w-auto gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5 ml-1" />
            <span>تلاش مجدد (بارگذاری دوباره)</span>
          </Button>

          <Link href="/executive" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-1.5 text-xs rounded-xl"
            >
              <BarChart3 className="w-3.5 h-3.5 ml-1" />
              <span>میز مدیریت عالی</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
