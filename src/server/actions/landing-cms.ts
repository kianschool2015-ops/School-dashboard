"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { landingContent } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { LandingContentSettings } from "@/types/models";

const defaultLandingContent: LandingContentSettings = {
  heroBadge: "سامانه پایش هوشمند ۳۶۰ درجه",
  heroTitle: "پشتیبانی آموزشی مشاهیر دانش",
  heroSubtitle: "سامانه هدایت تحصیلی، پایش عملکرد و رفع بحران داوطلبان آزمون‌های وکالت",
  featuresTitle: "خدمات ۳۶۰ درجه آموزشی",
  honorsTitle: "افتخارات و رتبه‌های برتر",
  ctaTitle: "شروع قدرتمند در مشاهیر دانش",
  ctaSubtitle: "با همراهی برترین اساتید و پشتیبانان حقوق کشور، مسیر قبولی را هوشمندانه طی کنید.",
  phoneNumber: "۰۲۱-۸۸۸۸۸۸۸۸",
  brandColor: "#004071",
  accentColor: "#F59E0B",
  features: [],
  honors: [],
  gallery: [],
};

/**
 * Update Landing Page CMS Settings (CEO / ADMIN only) via Drizzle ORM
 */
export async function updateLandingContentAction(payload: Partial<LandingContentSettings>) {
  await requireRole(["CEO", "ADMIN"]);

  const [existing] = await db
    .select()
    .from(landingContent)
    .where(eq(landingContent.id, "default_landing_cms"))
    .limit(1);

  const merged = {
    ...defaultLandingContent,
    ...((existing?.content as Partial<LandingContentSettings>) || {}),
    ...payload,
  };

  await db
    .insert(landingContent)
    .values({
      id: "default_landing_cms",
      content: merged,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: landingContent.id,
      set: {
        content: merged,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/");
  revalidatePath("/executive");

  return {
    success: true,
    message: "تنظیمات محتوای صفحه اصلی و هویت بصری با موفقیت ذخیره گردید.",
    data: merged,
  };
}

/**
 * Fetch current Landing Page CMS Settings via Drizzle ORM
 */
export async function getLandingContentAction() {
  const [row] = await db
    .select()
    .from(landingContent)
    .where(eq(landingContent.id, "default_landing_cms"))
    .limit(1);

  return {
    success: true,
    data: (row?.content as LandingContentSettings) || defaultLandingContent,
  };
}
