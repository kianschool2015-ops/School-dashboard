import { memoryRepo } from "../db";
import type { SmsTriggerEvent, SmsLogRecord } from "@/types/models";

interface SendSmsOptions {
  event: SmsTriggerEvent;
  recipientPhone: string;
  recipientName: string;
  customText?: string;
  variables?: Record<string, string>;
  token?: string;
  template?: string;
}

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
 * Dispatches an SMS using configured provider (Kavenegar / Mock / Faraz)
 * 1. Validates trigger switch configuration
 * 2. Uses lookup/verify for OTP tokens to bypass telecom ad blacklist
 * 3. Uses standard REST API endpoint for general notifications
 * 4. Parses genuine Kavenegar status codes
 * 5. Records full audit log in memoryRepo
 */
export async function sendSystemSms(options: SendSmsOptions): Promise<{
  success: boolean;
  message: string;
  logId?: string;
  statusCode?: number;
}> {
  const { event, recipientPhone, recipientName, customText, variables, token, template } = options;

  const settings = memoryRepo.getSmsSettings();
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

  // Genuine Kavenegar REST API Integration
  if (settings.provider === "KAVENEGAR" && settings.apiKey && settings.apiKey.trim().length > 15) {
    const apiKey = settings.apiKey.trim();
    try {
      // If a token is provided or event is LOGIN (OTP), use Kavenegar verify/lookup endpoint (bypasses blacklist)
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
        });

        const data = await res.json();
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
        // Standard SMS Send endpoint
        const kavenegarSendUrl = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const params = new URLSearchParams({
          receptor: recipientPhone.trim(),
          sender: (settings.senderLine || settings.senderNumber || "10008585").trim(),
          message: messageText,
        });

        const res = await fetch(`${kavenegarSendUrl}?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const data = await res.json();
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
    // Development fallback or Mock Provider
    status = "SIMULATED";
    statusCode = 200;
    statusMessage = "پیامک در محیط توسعه شبیه‌سازی و ثبت گردید (کلید کاوه‌نگار فعال نیست).";
    providerMsgId = `dev_sim_${Date.now()}`;

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Kavenegar SMS Service] To: ${recipientPhone} | Event: ${event} | Text: ${messageText.slice(0, 60)}...`);
    }
  }

  // Record into SMS Audit Log
  const logId = `sms_log_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const logRecord: SmsLogRecord = {
    id: logId,
    recipientPhone,
    recipientName,
    event,
    messageText,
    status,
    providerMessageId: providerMsgId,
    sentAt: new Date(),
    createdAt: new Date(),
  };

  memoryRepo.addSmsLog(logRecord);

  return {
    success: status !== "FAILED",
    message: statusMessage,
    logId,
    statusCode,
  };
}
