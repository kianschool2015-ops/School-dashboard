"use server";

import { requireRole } from "../auth/guard";
import { memoryRepo } from "../db";
import { sendSystemSms } from "../services/sms";
import { revalidatePath } from "next/cache";
import type { SmsTriggerEvent, SmsSettingsRecord } from "@/types/models";

/**
 * Save Manager SMS Settings & API Provider Config (Kavenegar)
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

  const currentSettings = memoryRepo.getSmsSettings();

  const updatedTriggers = { ...currentSettings.triggers };
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

  memoryRepo.updateSmsSettings({
    provider: payload.provider,
    apiKey: payload.apiKey.trim(),
    senderNumber: line,
    senderLine: line,
    isActive: payload.isActive,
    triggers: updatedTriggers,
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
    event: "LOGIN", // Using an active trigger
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
