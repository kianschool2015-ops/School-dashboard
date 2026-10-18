"use server";

import { requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
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
 * Import Student Whitelist (by Supervisor or Manager)
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

    // Check if already in whitelist
    const existing = memoryRepo.isPhoneOrNationalIdWhitelisted(cleanPhone, cleanNationalId);
    if (existing) {
      continue;
    }

    const id = `wl_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newEntry: StudentWhitelistRecord = {
      id,
      fullName: row.fullName.trim(),
      nationalId: cleanNationalId,
      phoneNumber: cleanPhone,
      assignedMentorId: row.assignedMentorId || "usr_mentor1",
      status: "PENDING",
      invitedAt: new Date(),
      createdAt: new Date(),
    };

    memoryRepo.addWhitelistRecord(newEntry);
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
 * Delete Whitelist Record
 */
export async function removeWhitelistRecordAction(id: string) {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);
  memoryRepo.studentWhitelist.delete(id);
  revalidatePath("/settings");
  return { success: true, message: "داوطلب از فهرست مجاز حذف شد." };
}
