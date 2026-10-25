import { db, isDbOnline } from "../db";
import { smsSettings, smsLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import type { SmsTriggerEvent, SmsTriggerConfig, SmsLogRecord, SmsSettingsRecord } from "@/types/models";

interface KavenegarApiResponse {
  return?: {
    status?: number;
    message?: string;
  };
  entries?: Array<{
    messageid?: number | string;
    message?: string;
    status?: number;
  }>;
}

interface SendSmsOptions {
  event: SmsTriggerEvent;
  recipientPhone: string;
  recipientName: string;
  customText?: string;
  variables?: Record<string, string>;
  token?: string;
  template?: string;
}

const defaultSmsSettings: SmsSettingsRecord = {
  id: "sms_conf_default",
  provider: "KAVENEGAR",
  apiKey: "kavenegar_api_key_sample_2026",
  senderNumber: "10008585",
  senderLine: "10008585",
  isActive: true,
  updatedAt: new Date(),
  triggers: {
    LOGIN: {
      event: "LOGIN",
      isEnabled: true,
      title: "ورود به سامانه",
      description: "ارسال اعلان امنیتی هنگام ورود به حساب کاربری",
      templateMessage: "ورود به سامانه پایش مشاهیر دانش در تاریخ {date} ثبت شد.",
    },
    MENTOR_CONTACT: {
      event: "MENTOR_CONTACT",
      isEnabled: true,
      title: "ثبت تماس و مشاوره پشتیبان",
      description: "اطلاع‌رسانی به داوطلب پس از ثبت گزارش تماس",
      templateMessage: "گزارش مشاوره جدید توسط پشتیبان شما ({mentor}) در سامانه مشاهیر دانش ثبت گردید.",
    },
    TRIAGE_RESOLVED: {
      event: "TRIAGE_RESOLVED",
      isEnabled: true,
      title: "رفع پرونده پایش و بحران آموزشی",
      description: "اعلام حل چالش درسی و بازگشت به وضعیت نرمال",
      templateMessage: "پرونده پایش آموزشی شما با موفقیت توسط پشتیبان بررسی و مرتفع گردید.",
    },
    WEEKLY_PLAN_ASSIGNED: {
      event: "WEEKLY_PLAN_ASSIGNED",
      isEnabled: true,
      title: "تخصیص برنامه هفتگی جدید",
      description: "اعلان بارگذاری برنامه مطالعاتی شنبه تا جمعه",
      templateMessage: "داوطلب گرامی {name}، برنامه مطالعاتی هفتگی جدید شما در پنل بارگذاری شد.",
    },
    TASK_ASSIGNED: {
      event: "TASK_ASSIGNED",
      isEnabled: true,
      title: "ارجاع وظیفه سازمانی سلسله‌مراتبی",
      description: "پیامک به پشتیبان یا سرپرست پس از دریافت وظیفه",
      templateMessage: "وظیفه سازمانی جدید با اولویت {priority} از طرف {sender} به کارتابل شما ارجاع گردید.",
    },
    EXAM_PUBLISHED: {
      event: "EXAM_PUBLISHED",
      isEnabled: true,
      title: "انتشار آزمون ارزیابی زمان‌دار",
      description: "اطلاع‌رسانی شروع پنجره آزمون آزمایشی",
      templateMessage: "آزمون ارزیابی جدید '{examTitle}' فعال گردید. مهلت شرکت: {endTime}",
    },
    MESSAGE_RECEIVED: {
      event: "MESSAGE_RECEIVED",
      isEnabled: true,
      title: "دریافت پیام و گفتگوی مستقیم",
      description: "اعلان دریافت پیام جدید در گفتگو",
      templateMessage: "پیام جدیدی از طرف {sender} در سامانه پشتیبانی مشاهیر دانش دریافت کردید.",
    },
    WHITELIST_INVITE: {
      event: "WHITELIST_INVITE",
      isEnabled: true,
      title: "دعوت ثبت‌نام داوطلب (لیست سفید)",
      description: "پیامک حاوی لینک لاگین پس از بارگذاری اکسل",
      templateMessage: "داوطلب گرامی {name}، ثبت‌نام شما در سامانه مشاهیر دانش مجاز شد: {link}",
    },
  },
};

/**
 * Maps Kavenegar official HTTP status codes to detailed Persian diagnostic messages
 */
export function getKavenegarStatusDescription(status: number): string {
  switch (status) {
    case 200:
      return "پیامک با موفقیت به درگاه مخابراتی تحویل داده شد (200 OK)";
    case 400:
      return "پارامترهای ارسالی به درگاه کاوه‌نگار نامعتبر است (400 Bad Request)";
    case 401:
      return "اعتبارسنجی ناموفق: کلید API کاوه‌نگار نامعتبر است یا منقضی شده است (401 Unauthorized)";
    case 402:
      return "اعتبار ریالی حساب کاوه‌نگار کافی نیست (402 Insufficient Credit)";
    case 403:
      return "کلید API کاوه‌نگار توسط سامانه مسدود شده است (403 Forbidden)";
    case 404:
      return "فهرست شماره‌های گیرنده خالی است (404 Empty Receptor)";
    case 406:
      return "پارامترهای اجباری ارسال نشده‌اند (406 Missing Parameters)";
    case 407:
      return "دسترسی به خط ارسال‌کننده مجاز نمی‌باشد (407 Line Access Denied)";
    case 411:
      return "شماره گیرنده نامعتبر است (411 Invalid Receptor)";
    case 412:
      return "خط اختصاصی ارسال‌کننده نامعتبر است (412 Invalid Sender)";
    case 413:
      return "طول متن پیام بیش از حد استاندارد است (413 Message Too Long)";
    case 414:
      return "تعداد گیرندگان در یک درخواست بیش از حد مجاز است (414 Too Many Receptors)";
    case 416:
      return "محدودیت IP کاوه‌نگار: آدرس سرور در لیست سفید کاوه‌نگار تعریف نشده است (416 IP Mismatch)";
    case 418:
      return "اعتبار ریالی پنل کاوه‌نگار ناکافی است (418 Low Balance)";
    case 419:
      return "ارسال پیام تکراری به دلیل قوانین ضداسپم کاوه‌نگار مسدود گردید (419 Duplicate)";
    case 420:
      return "شماره تلفن گیرنده در لیست سیاه تبلیغاتی مخابرات قرار دارد (420 Blacklist)";
    case 500:
      return "خطای داخلی سرورهای کاوه‌نگار (500 Internal Server Error)";
    default:
      return `پاسخ وب‌سرویس کاوه‌نگار با کد وضعیت: ${status}`;
  }
}

/**
 * Dispatches an SMS using configured provider (Kavenegar / Mock / Faraz) via Drizzle ORM
 */
export async function sendSystemSms(options: SendSmsOptions): Promise<{
  success: boolean;
  message: string;
  logId?: string;
  statusCode?: number;
}> {
  const { event, recipientPhone, recipientName, customText, variables, token, template } = options;

  let settings = defaultSmsSettings;
  if (isDbOnline) {
    try {
      const [row] = await db
        .select()
        .from(smsSettings)
        .where(eq(smsSettings.id, "sms_conf_default"))
        .limit(1);

      if (row) {
        settings = {
          id: row.id,
          provider: row.provider as "KAVENEGAR" | "FARAZ" | "MOCK",
          apiKey: row.apiKey,
          senderNumber: row.senderNumber,
          senderLine: row.senderLine,
          isActive: row.isActive,
          updatedAt: new Date(),
          triggers: (row.triggers as unknown as Record<SmsTriggerEvent, SmsTriggerConfig>) || defaultSmsSettings.triggers,
        };
      }
    } catch {}
  }

  if (!settings.isActive) {
    return {
      success: false,
      message: "سامانه ارسال پیامک در حال حاضر توسط مدیریت ارشد غیرفعال شده است.",
    };
  }

  const triggerConfig = settings.triggers[event];
  if (!triggerConfig || !triggerConfig.isEnabled) {
    return {
      success: false,
      message: `ارسال پیامک برای رویداد '${event}' در تنظیمات غیرفعال است.`,
    };
  }

  // Build message text
  let messageText = customText || triggerConfig.templateMessage;
  if (variables) {
    for (const [key, val] of Object.entries(variables)) {
      messageText = messageText.replace(new RegExp(`{${key}}`, "g"), val);
    }
  }

  let status: SmsLogRecord["status"] = "SIMULATED";
  let providerMsgId: string | undefined = `sim_${Date.now()}`;
  let statusCode = 200;
  let statusMessage = "پیامک با موفقیت ثبت شد.";

  const isSampleApiKey =
    !settings.apiKey ||
    settings.apiKey.includes("sample") ||
    settings.apiKey.includes("mock") ||
    settings.apiKey.includes("your_api_key") ||
    settings.apiKey === "kavenegar_api_key_sample_2026";

  // Genuine Kavenegar REST API Integration
  if (
    settings.provider === "KAVENEGAR" &&
    settings.apiKey &&
    settings.apiKey.trim().length > 15 &&
    !isSampleApiKey
  ) {
    const apiKey = settings.apiKey.trim();
    try {
      if (token || (variables && variables.token)) {
        const otpToken = token || variables?.token || "12345";
        const lookupTemplate = template || "mashahir-login";
        const kavenegarLookupUrl = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`;

        const params = new URLSearchParams({
          receptor: recipientPhone.trim(),
          token: otpToken,
          template: lookupTemplate,
        });

        const res = await fetch(`${kavenegarLookupUrl}?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000), // 5-second timeout safeguard
        });

        const data = (await res.json()) as KavenegarApiResponse;
        statusCode = data.return?.status || res.status;
        statusMessage = getKavenegarStatusDescription(statusCode);

        if (statusCode === 200) {
          status = "DELIVERED";
          providerMsgId = String(data.entries?.[0]?.messageid || `kave_${Date.now()}`);
        } else {
          status = "FAILED";
          providerMsgId = `err_${statusCode}`;
        }
      } else {
        const kavenegarSendUrl = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const params = new URLSearchParams({
          receptor: recipientPhone.trim(),
          sender: (settings.senderLine || settings.senderNumber || "10008585").trim(),
          message: messageText,
        });

        const res = await fetch(`${kavenegarSendUrl}?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000), // 5-second timeout safeguard
        });

        const data = (await res.json()) as KavenegarApiResponse;
        statusCode = data.return?.status || res.status;
        statusMessage = getKavenegarStatusDescription(statusCode);

        if (statusCode === 200) {
          status = "DELIVERED";
          providerMsgId = String(data.entries?.[0]?.messageid || `kave_${Date.now()}`);
        } else {
          status = "FAILED";
          providerMsgId = `err_${statusCode}`;
        }
      }
    } catch (err: unknown) {
      status = "FAILED";
      statusCode = 500;
      statusMessage = err instanceof Error ? `خطای شبکه در اتصال به کاوه‌نگار: ${err.message}` : "خطای ناشناخته شبکه در اتصال به کاوه‌نگار";
      providerMsgId = `err_network_${Date.now()}`;
    }
  } else {
    status = "SIMULATED";
    statusCode = 200;
    statusMessage = "پیامک در محیط توسعه شبیه‌سازی و ثبت گردید (کلید کاوه‌نگار فعال نیست).";
    providerMsgId = `dev_sim_${Date.now()}`;

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Kavenegar SMS Service] To: ${recipientPhone} | Event: ${event} | Text: ${messageText.slice(0, 60)}...`);
    }
  }

  // Record into SMS Audit Log in PostgreSQL via Drizzle ORM
  const logId = `sms_log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  if (isDbOnline) {
    try {
      await db.insert(smsLogs).values({
        id: logId,
        recipientPhone,
        recipientName,
        event,
        messageText,
        status: status === "FAILED" ? "FAILED" : "SENT",
        providerResponse: statusMessage,
      });
    } catch {}
  }

  return {
    success: status !== "FAILED",
    message: statusMessage,
    logId,
    statusCode,
  };
}
