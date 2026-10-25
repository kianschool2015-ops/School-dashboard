"use server";

import { requireRole } from "../auth/guard";
import { db, ensureDatabaseBootstrap } from "../db";
import { entitledCourses } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { EntitledCourseRecord } from "@/types/models";

/**
 * Get all configured entitled courses for Admin/Executive view
 */
export async function getAdminEntitledCoursesAction(): Promise<EntitledCourseRecord[]> {
  await requireRole(["CEO", "ADMIN"]);
  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const rows = await db
      .select()
      .from(entitledCourses)
      .orderBy(desc(entitledCourses.createdAt));
    return rows as unknown as EntitledCourseRecord[];
  } catch (error) {
    console.error("[AdminCourses] Error fetching courses:", error);
    return [];
  }
}

/**
 * Add or update an entitled course configuration
 */
export async function saveEntitledCourseAction(payload: {
  id?: string;
  courseCode: string;
  courseName: string;
  description?: string;
  priceFormatted?: string;
  garnetPurchaseUrl: string;
  hasSupport: boolean;
  supportTier?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; message: string; course?: EntitledCourseRecord }> {
  await requireRole(["CEO", "ADMIN"]);

  const normalizedCode = payload.courseCode.trim().toUpperCase();
  const courseId = payload.id || `crs_${normalizedCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;

  try {
    await ensureDatabaseBootstrap().catch(() => {});

    const recordValues = {
      id: courseId,
      courseCode: normalizedCode,
      courseName: payload.courseName.trim(),
      description: payload.description?.trim() || null,
      priceFormatted: payload.priceFormatted?.trim() || "۵,۸۰۰,۰۰۰ تومان",
      garnetPurchaseUrl: payload.garnetPurchaseUrl.trim(),
      hasSupport: payload.hasSupport,
      supportTier: payload.supportTier || "GOLD",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      updatedAt: new Date(),
    };

    await db
      .insert(entitledCourses)
      .values({
        ...recordValues,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: entitledCourses.courseCode,
        set: recordValues,
      });

    revalidatePath("/executive");
    revalidatePath("/auth/no-support-access");

    return {
      success: true,
      message: `دوره «${payload.courseName}» با موفقیت در فهرست دوره‌های مجاز ذخیره شد.`,
    };
  } catch (error) {
    console.error("[AdminCourses] Error saving course:", error);
    return {
      success: false,
      message: "خطا در ثبت دوره در پایگاه داده.",
    };
  }
}

/**
 * Toggle active status of a course
 */
export async function toggleEntitledCourseStatusAction(courseId: string, isActive: boolean) {
  await requireRole(["CEO", "ADMIN"]);

  try {
    await db
      .update(entitledCourses)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(entitledCourses.id, courseId));

    revalidatePath("/executive");
    revalidatePath("/auth/no-support-access");
    return { success: true, message: "وضعیت دوره به‌روزرسانی شد." };
  } catch (error) {
    return { success: false, message: "خطا در تغییر وضعیت دوره." };
  }
}

/**
 * Delete an entitled course entry
 */
export async function deleteEntitledCourseAction(courseId: string) {
  await requireRole(["CEO", "ADMIN"]);

  try {
    await db.delete(entitledCourses).where(eq(entitledCourses.id, courseId));
    revalidatePath("/executive");
    revalidatePath("/auth/no-support-access");
    return { success: true, message: "دوره از فهرست حذف شد." };
  } catch (error) {
    return { success: false, message: "خطا در حذف دوره." };
  }
}
