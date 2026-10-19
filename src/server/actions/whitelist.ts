"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { studentWhitelist } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { StudentWhitelistRecord } from "@/types/models";

export interface WhitelistImportRow {
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  assignedMentorId?: string;
}

/**
 * Import Student Whitelist (by Supervisor or Manager) via Drizzle ORM
 * Automatically triggers SMS invitation to newly imported candidates
 */
export async function importStudentWhitelistAction(rows: WhitelistImportRow[]) {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  let importedCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.fullName || !row.phoneNumber || !row.nationalId) {
      continue;
    }

    const cleanPhone = row.phoneNumber.trim();
    const cleanNationalId = row.nationalId.trim();

    // Check if already in whitelist via Drizzle ORM
    const [existing] = await db
      .select()
      .from(studentWhitelist)
      .where(
        or(
          eq(studentWhitelist.phoneNumber, cleanPhone),
          eq(studentWhitelist.nationalId, cleanNationalId)
        )
      )
      .limit(1);

    if (existing) {
      continue;
    }

    const id = `wl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    await db.insert(studentWhitelist).values({
      id,
      fullName: row.fullName.trim(),
      nationalId: cleanNationalId,
      phoneNumber: cleanPhone,
      assignedMentorId: row.assignedMentorId || "usr_mentor1",
      status: "PENDING",
      invitedAt: new Date(),
    });

    importedCount++;

    // Fire Invitation SMS via SMS Engine
    await sendSystemSms({
      event: "WHITELIST_INVITE",
      recipientPhone: cleanPhone,
      recipientName: row.fullName,
      variables: {
        name: row.fullName,
        link: "https://support.mashahirdanesh.com/auth/login",
      },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/supervisor");

  return {
    success: true,
    message: `${importedCount} داوطلب با موفقیت به فهرست مجاز افزوده شدند و پیامک دعوت ارسال گردید.`,
    importedCount,
    errors,
  };
}

/**
 * Delete Whitelist Record via Drizzle ORM
 */
export async function removeWhitelistRecordAction(id: string) {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  await db.delete(studentWhitelist).where(eq(studentWhitelist.id, id));

  revalidatePath("/settings");
  return { success: true, message: "داوطلب از فهرست مجاز حذف شد." };
}
