"use server";

import { requireRole } from "../auth/guard";
import { db } from "../db";
import { smsSettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { SmsTriggerEvent, SmsSettingsRecord } from "@/types/models";

const defaultTriggers: Record<SmsTriggerEvent, { isEnabled: boolean; templateMessage: string }> = {
  LOGIN: {
    isEnabled: true,
    templateMessage: "ورود به سامانه پایش مشاهیر دانش در تاریخ {date} ثبت شد.",
  },
  MENTOR_CONTACT: {
    isEnabled: true,
    templateMessage: "گزارش مشاوره جدید توسط پشتیبان شما ({mentor}) در سامانه مشاهیر دانش ثبت گردید.",
  },
  TRIAGE_RESOLVED: {
    isEnabled: true,
    templateMessage: "پرونده پایش آموزشی شما با موفقیت توسط پشتیبان بررسی و مرتفع گردید.",
  },
  WEEKLY_PLAN_ASSIGNED: {
    isEnabled: true,
    templateMessage: "داوطلب گرامی {name}، برنامه مطالعاتی هفتگی جدید شما در پنل بارگذاری شد.",
  },
  TASK_ASSIGNED: {
    isEnabled: true,
    templateMessage: "وظیفه سازمانی جدید با اولویت {priority} از طرف {sender} به کارتابل شما ارجاع گردید.",
  },
  EXAM_PUBLISHED: {
    isEnabled: true,
    templateMessage: "آزمون ارزیابی جدید '{examTitle}' فعال گردید. مهلت شرکت: {endTime}",
  },
  MESSAGE_RECEIVED: {
    isEnabled: true,
    templateMessage: "پیام جدیدی از طرف {sender} در سامانه پشتیبانی مشاهیر دانش دریافت کردید.",
  },
  WHITELIST_INVITE: {
    isEnabled: true,
    templateMessage: "داوطلب گرامی {name}، ثبت‌نام شما در سامانه مشاهیر دانش مجاز شد: {link}",
  },
  MENTOR_ASSIGNED: {
    isEnabled: true,
    templateMessage: "داوطلب گرامی {name}، پشتیبان اختصاصی شما ({mentor}) در مشاهیر دانش تعیین گردید.",
  },
};

/**
 * Save Manager SMS Settings & API Provider Config (Kavenegar) via Drizzle ORM
 */
export async function saveSmsSettingsAction(payload: {
  provider: "KAVENEGAR" | "FARAZ" | "MOCK";
  apiKey: string;
  senderNumber?: string;
  senderLine?: string;
  isActive: boolean;
  triggers: Record<string, { isEnabled: boolean; templateMessage?: string; description?: string; title?: string }>;
}) {
  await requireRole(["CEO", "ADMIN"]);

  const [existing] = await db
    .select()
    .from(smsSettings)
    .where(eq(smsSettings.id, "sms_conf_default"))
    .limit(1);

  const currentTriggers = ((existing?.triggers as Record<string, any>) || defaultTriggers);
  const updatedTriggers = { ...currentTriggers };

  for (const [evt, conf] of Object.entries(payload.triggers)) {
    const key = evt as SmsTriggerEvent;
    if (updatedTriggers[key]) {
      updatedTriggers[key].isEnabled = conf.isEnabled;
      if (conf.templateMessage) {
        updatedTriggers[key].templateMessage = conf.templateMessage;
      }
    }
  }

  const line = (payload.senderLine || payload.senderNumber || "10008585").trim();

  await db
    .insert(smsSettings)
    .values({
      id: "sms_conf_default",
      provider: payload.provider,
      apiKey: payload.apiKey.trim(),
      senderNumber: line,
      senderLine: line,
      isActive: payload.isActive,
      triggers: updatedTriggers,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: smsSettings.id,
      set: {
        provider: payload.provider,
        apiKey: payload.apiKey.trim(),
        senderNumber: line,
        senderLine: line,
        isActive: payload.isActive,
        triggers: updatedTriggers,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/settings");
  revalidatePath("/executive");

  return {
    success: true,
    message: "تنظیمات درگاه پیامک و رویدادهای اعلان با موفقیت ذخیره گردید.",
  };
}

/**
 * Test SMS Sending using configured settings
 */
export async function sendTestSmsAction(testPhone: string, testMessage: string) {
  await requireRole(["CEO", "ADMIN"]);

  const res = await sendSystemSms({
    event: "LOGIN",
    recipientPhone: testPhone,
    recipientName: "تست مدیریت ارشد",
    customText: testMessage || "تست ارتباط با وب‌سرویس پیامک کاوه‌نگار از سامانه پشتیبانی مشاهیر دانش.",
  });

  revalidatePath("/settings");

  return res;
}

/**
 * Action alias for test SMS dispatch from settings UI
 */
export async function testSmsDispatchAction(testPhone: string, testMessage?: string) {
  return sendTestSmsAction(testPhone, testMessage || "");
}
