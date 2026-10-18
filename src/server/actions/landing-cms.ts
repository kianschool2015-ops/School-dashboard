"use server";

import { requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { revalidatePath } from "next/cache";
import type { LandingContentSettings } from "@/types/models";

/**
 * Update Landing Page CMS Settings (CEO / ADMIN only)
 */
export async function updateLandingContentAction(payload: Partial<LandingContentSettings>) {
  await requireRole(["CEO", "ADMIN"]);

  const updated = memoryRepo.updateLandingContent(payload);

  revalidatePath("/");
  revalidatePath("/executive");

  return {
    success: true,
    message: "تنظیمات محتوای صفحه اصلی و هویت بصری با موفقیت ذخیره گردید.",
    data: updated,
  };
}

/**
 * Fetch current Landing Page CMS Settings
 */
export async function getLandingContentAction() {
  const content = memoryRepo.getLandingContent();
  return {
    success: true,
    data: content,
  };
}
