"use server";

import { headers } from "next/headers";
import { db, ensureDatabaseBootstrap } from "../db";
import { studentProfiles } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth/guard";

export interface LegalTermsStatusResult {
  accepted: boolean;
  acceptedAt?: string | null;
  isProbationary?: boolean;
}

/**
 * Check if the authenticated student has accepted the digital NDA & refund-waiver terms
 */
export async function checkLegalTermsStatusAction(): Promise<LegalTermsStatusResult> {
  try {
    const session = await requireAuth();
    if (session.role !== "STUDENT") {
      return { accepted: true }; // Non-students bypass NDA gate
    }

    await ensureDatabaseBootstrap().catch(() => {});
    const [profile] = await db
      .select({
        acceptedLegalTermsAt: studentProfiles.acceptedLegalTermsAt,
        isProbationary: studentProfiles.isProbationary,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (!profile) {
      return { accepted: true };
    }

    return {
      accepted: Boolean(profile.acceptedLegalTermsAt),
      acceptedAt: profile.acceptedLegalTermsAt?.toISOString() || null,
      isProbationary: profile.isProbationary,
    };
  } catch (error) {
    console.error("[Legal Terms] check status error:", error);
    return { accepted: true }; // Fail-open to avoid blocking if DB has transient error
  }
}

/**
 * Layer 2 DRM: Record digital NDA & refund waiver acceptance with client IP and timestamp
 */
export async function acceptLegalTermsAction(): Promise<{
  success: boolean;
  message?: string;
  acceptedAt?: string;
}> {
  try {
    const session = await requireAuth();
    await ensureDatabaseBootstrap().catch(() => {});

    let clientIp = "127.0.0.1";
    try {
      const h = await headers();
      clientIp =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        "127.0.0.1";
    } catch {}

    const now = new Date();

    const [updated] = await db
      .update(studentProfiles)
      .set({
        acceptedLegalTermsAt: now,
        acceptedLegalTermsIp: clientIp,
        isProbationary: false,
        updatedAt: now,
      })
      .where(eq(studentProfiles.userId, session.userId))
      .returning({ id: studentProfiles.id });

    if (!updated) {
      return {
        success: false,
        message: "پروفایل داوطلب برای ثبت تعهدنامه حقوقی یافت نشد.",
      };
    }

    return {
      success: true,
      message: "تعهدنامه و اقرارنامه حقوقی با موفقیت ثبت گردید.",
      acceptedAt: now.toISOString(),
    };
  } catch (error) {
    console.error("[Legal Terms] accept error:", error);
    return {
      success: false,
      message: "خطا در ثبت پذیرش تعهدنامه دیجیتال.",
    };
  }
}
