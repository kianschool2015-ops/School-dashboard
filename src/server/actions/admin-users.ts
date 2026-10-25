"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Toggle Exam Authoring Privilege for Mentors
 * Strictly restricted to Admins / CEO
 */
export async function toggleMentorExamCreationAction(
  mentorId: string,
  enabled: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    // Only CEO or ADMIN can grant or revoke exam creation privileges
    await requireRole(["CEO", "ADMIN"]);

    if (!mentorId) {
      return { success: false, message: "شناسه پشتیبان الزامی است." };
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, mentorId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "کاربر مورد نظر یافت نشد." };
    }

    await db
      .update(users)
      .set({
        canCreateExams: enabled,
        updatedAt: new Date(),
      })
      .where(eq(users.id, mentorId));

    revalidatePath("/executive");
    revalidatePath("/settings");
    revalidatePath("/exams");
    revalidatePath("/exams/builder");

    return {
      success: true,
      message: enabled
        ? `مجوز طراحی و بارگذاری آزمون برای «${targetUser.fullName}» فعال گردید.`
        : `مجوز طراحی و بارگذاری آزمون از «${targetUser.fullName}» سلب گردید.`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "خطا در به‌روزرسانی دسترسی پشتیبان.",
    };
  }
}
