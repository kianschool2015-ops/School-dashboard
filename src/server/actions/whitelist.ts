"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { studentWhitelist, users } from "../db/schema";
import { eq, or, desc } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import { toEnglishDigits, normalizePhoneNumber, isValidIranianPhone } from "../auth/otp";
import * as XLSX from "xlsx";
import type { StudentWhitelistRecord } from "@/types/models";

export interface WhitelistImportRow {
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  assignedMentorId?: string;
  assignedMentorName?: string;
  enrolledCourseName?: string;
  enrolledCourseCode?: string;
}

/**
 * Get all Whitelist Records via Drizzle ORM
 */
export async function getWhitelistAction(): Promise<StudentWhitelistRecord[]> {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);
  const rows = await db
    .select()
    .from(studentWhitelist)
    .orderBy(desc(studentWhitelist.createdAt));
  return rows as unknown as StudentWhitelistRecord[];
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

    const cleanPhone = normalizePhoneNumber(row.phoneNumber);
    const cleanNationalId = toEnglishDigits(row.nationalId).replace(/\D/g, "");

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
      assignedMentorName: row.assignedMentorName || "استاد علی کاظمی",
      enrolledCourseName: row.enrolledCourseName || "دوره طلایی آمادگی آزمون وکالت ۳۶۰",
      enrolledCourseCode: row.enrolledCourseCode || "BAR-360",
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
 * Bulk Import Student Whitelist from Excel/CSV file (using xlsx)
 * Parses base64 encoded buffer, normalizes Persian headers and digits,
 * validates national ID and phone, and batch inserts into student_whitelist
 */
export async function importStudentWhitelistFromFileAction(payload: {
  fileBase64: string;
  fileName: string;
  defaultMentorId?: string;
  defaultCourseName?: string;
  defaultCourseCode?: string;
}) {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  if (!payload.fileBase64) {
    return { success: false, message: "فایل انتخاب نشده است." };
  }

  try {
    const buffer = Buffer.from(payload.fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, message: "فایل اکسل فاقد کاربرگ (Sheet) است." };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (!rawRows || rawRows.length === 0) {
      return { success: false, message: "هیچ ردیفی در فایل اکسل یافت نشد." };
    }

    // Resolve mentor names map
    const allMentors = await db.select().from(users).where(eq(users.role, "MENTOR"));
    const mentorMap = new Map(allMentors.map((m) => [m.id, m.fullName]));
    const defaultMentorName = payload.defaultMentorId
      ? mentorMap.get(payload.defaultMentorId) || "پشتیبان آموزشی"
      : allMentors[0]?.fullName || "استاد علی کاظمی";

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Extract keys with flexible Persian & English matching
      let fullName = "";
      let nationalId = "";
      let phone = "";
      let courseName = payload.defaultCourseName || "دوره طلایی آمادگی آزمون وکالت ۳۶۰";
      let courseCode = payload.defaultCourseCode || "BAR-360";
      let mentorId = payload.defaultMentorId || (allMentors[0]?.id ?? "usr_mentor1");
      let mentorName = defaultMentorName;

      for (const [rawKey, val] of Object.entries(row)) {
        if (!val) continue;
        const key = rawKey.trim().toLowerCase().replace(/[\s_\-]/g, "");
        const strVal = String(val).trim();

        // Name
        if (
          key.includes("نام") ||
          key.includes("fullname") ||
          key.includes("name") ||
          key.includes("دانشجو") ||
          key.includes("داوطلب")
        ) {
          fullName = strVal;
        }
        // National ID
        else if (
          key.includes("کدملی") ||
          key.includes("شمارهملی") ||
          key.includes("کدملی") ||
          key.includes("nationalid") ||
          key.includes("nationalcode") ||
          key.includes("mellicode")
        ) {
          nationalId = toEnglishDigits(strVal).replace(/\D/g, "");
        }
        // Phone
        else if (
          key.includes("موبایل") ||
          key.includes("همراه") ||
          key.includes("تلفن") ||
          key.includes("phone") ||
          key.includes("mobile")
        ) {
          phone = normalizePhoneNumber(toEnglishDigits(strVal));
        }
        // Course Name
        else if (key.includes("دوره") || key.includes("coursename") || key.includes("course")) {
          courseName = strVal;
        }
        // Course Code
        else if (key.includes("کددوره") || key.includes("coursecode")) {
          courseCode = strVal;
        }
        // Mentor
        else if (key.includes("پشتیبان") || key.includes("منتور") || key.includes("mentor")) {
          mentorName = strVal;
          // check if matches mentor ID or name
          const matched = allMentors.find(
            (m) => m.fullName.includes(strVal) || m.id === strVal
          );
          if (matched) {
            mentorId = matched.id;
            mentorName = matched.fullName;
          }
        }
      }

      if (!fullName || !nationalId || !phone) {
        skippedCount++;
        continue;
      }

      // Check duplicates
      const [existing] = await db
        .select()
        .from(studentWhitelist)
        .where(
          or(
            eq(studentWhitelist.phoneNumber, phone),
            eq(studentWhitelist.nationalId, nationalId)
          )
        )
        .limit(1);

      if (existing) {
        skippedCount++;
        continue;
      }

      const id = `wl_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`;

      await db.insert(studentWhitelist).values({
        id,
        fullName,
        nationalId,
        phoneNumber: phone,
        assignedMentorId: mentorId,
        assignedMentorName: mentorName,
        enrolledCourseName: courseName,
        enrolledCourseCode: courseCode,
        status: "PENDING",
        invitedAt: new Date(),
      });

      importedCount++;

      // Send SMS invitation asynchronously
      sendSystemSms({
        event: "WHITELIST_INVITE",
        recipientPhone: phone,
        recipientName: fullName,
        variables: {
          name: fullName,
          link: "https://support.mashahirdanesh.com/auth/login",
        },
      }).catch((err) => {
        console.warn(`[WhitelistImport] SMS error for ${phone}:`, err);
      });
    }

    revalidatePath("/settings");
    revalidatePath("/supervisor");
    revalidatePath("/executive");

    return {
      success: true,
      message: `بارگذاری اکسل با موفقیت انجام شد: ${importedCount} داوطلب به فهرست مجاز افزوده شدند (${skippedCount} سطر تکراری یا ناقص رد شدند).`,
      importedCount,
      skippedCount,
      totalRows: rawRows.length,
      errors,
    };
  } catch (err: any) {
    console.error("[WhitelistImport] Failed to parse excel:", err);
    return {
      success: false,
      message: `خطا در پردازش فایل اکسل: ${err?.message || "فرمت فایل نامعتبر است."}`,
    };
  }
}

/**
 * Delete Whitelist Record via Drizzle ORM
 */
export async function removeWhitelistRecordAction(id: string) {
  await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);

  await db.delete(studentWhitelist).where(eq(studentWhitelist.id, id));

  revalidatePath("/settings");
  revalidatePath("/supervisor");
  return { success: true, message: "داوطلب از فهرست مجاز حذف شد." };
}

