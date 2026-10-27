import "server-only";
import net from "node:net";
import { db } from "../db";
import {
  voipSettings as voipSettingsTable,
  voipCalls as voipCallsTable,
  mentorCallingWindows as mentorCallingWindowsTable,
} from "../db/schema";
import { eq } from "drizzle-orm";
import type { VoipAmiSettings, VoipCallRecord, MentorCallingWindowRecord } from "@/types/models";
import { toPersianDigits, getPersianDayOfWeek, PERSIAN_WEEKDAYS, getIranTimeInfo } from "@/lib/jalali";

const WEEKDAY_TO_PERSIAN_INDEX: Record<string, number> = {
  Saturday: 0,
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
  Friday: 6,
};

/**
 * Mask phone number for zero-knowledge privacy:
 * Example: 09121000005 -> ۰۹۱۲***۰۰۰۵
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return "۰۹۱۲***۰۰۰۰";
  const start = phone.substring(0, 4);
  const end = phone.substring(phone.length - 4);
  return toPersianDigits(`${start}***${end}`);
}

/**
 * Sanitize Iranian mobile number into standard national format 09XXXXXXXXX
 * Strips whitespace, dashes, plus sign, and replaces Persian/Arabic digits
 */
export function sanitizeIranianPhone(phone: string): string {
  if (!phone) return "";
  let p = phone
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");
  if (p.startsWith("0098")) p = "0" + p.slice(4);
  else if (p.startsWith("98")) p = "0" + p.slice(2);
  else if (p.length === 10 && p.startsWith("9")) p = "0" + p;
  return p;
}

/**
 * Sanitize AMI parameter against CRLF injection (H-08)
 * Strips \r, \n, and null bytes to prevent Asterisk command injection
 */
export function sanitizeAmiParam(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[\r\n\0]/g, "").trim();
}

export interface AmiResponse {
  success: boolean;
  message: string;
  actionId?: string;
  rawResponse?: string;
}

export interface AmiPacket {
  headers: Record<string, string>;
  raw: string;
}

/**
 * Production-grade Node.js TCP Socket Client for Asterisk Manager Interface (AMI)
 * Protocol: Asterisk AMI on Issabel PBX (default port 5038)
 */
export class AsteriskAmiClient {
  private host: string;
  private port: number;
  private username: string;
  private secret: string;
  private socket: net.Socket | null = null;
  private buffer: string = "";
  private banner: string = "";
  private isConnected: boolean = false;
  private bannerReceived: boolean = false;
  private bannerResolver: ((value: string) => void) | null = null;
  private bannerRejecter: ((reason: Error) => void) | null = null;
  private pendingActions: Map<
    string,
    {
      resolve: (packet: AmiPacket) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
    }
  > = new Map();

  constructor(settings: VoipAmiSettings) {
    this.host = settings.host ? settings.host.trim() : "127.0.0.1";
    this.port = Number(settings.port) || 5038;
    this.username = settings.username ? settings.username.trim() : "";
    this.secret = settings.secret ? settings.secret.trim() : "";
  }

  /**
   * Establish raw TCP connection to Asterisk AMI server and await handshake banner
   */
  public async connect(timeoutMs = 5000): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.bannerResolver = resolve;
      this.bannerRejecter = reject;

      const socket = new net.Socket();
      this.socket = socket;

      socket.setTimeout(timeoutMs);

      socket.on("timeout", () => {
        socket.destroy();
        const err = new Error(
          `Connection Timed Out: Issabel host (${this.host}) is unreachable. Check network/IP.`
        );
        this.cleanupAndRejectAll(err);
      });

      socket.on("error", (err: NodeJS.ErrnoException) => {
        socket.destroy();
        let formattedError: Error;
        if (err.code === "ECONNREFUSED") {
          formattedError = new Error(
            `Connection Refused: Issabel port ${this.port} on ${this.host} is unreachable or blocked.`
          );
        } else if (err.code === "ETIMEDOUT" || err.code === "EHOSTUNREACH" || err.code === "ENETUNREACH") {
          formattedError = new Error(
            `Connection Timed Out: Issabel host (${this.host}) is unreachable. Check network/IP.`
          );
        } else {
          formattedError = new Error(
            `Asterisk AMI Socket Error (${err.code || "UNKNOWN"}): ${err.message}`
          );
        }
        this.cleanupAndRejectAll(formattedError);
      });

      socket.on("data", (chunk: Buffer) => {
        this.buffer += chunk.toString("utf8");

        // 1. Initial Handshake Banner (e.g. "Asterisk Call Manager/X.X.X\r\n")
        if (!this.bannerReceived) {
          const newlineIdx = this.buffer.indexOf("\n");
          if (newlineIdx !== -1) {
            const line = this.buffer.slice(0, newlineIdx).replace(/\r$/, "");
            this.buffer = this.buffer.slice(newlineIdx + 1);

            if (line.toLowerCase().includes("asterisk")) {
              this.banner = line;
              this.bannerReceived = true;
              this.isConnected = true;
              if (this.bannerResolver) {
                this.bannerResolver(line);
                this.bannerResolver = null;
                this.bannerRejecter = null;
              }
            } else {
              const err = new Error(`Invalid Asterisk AMI banner received: "${line}"`);
              socket.destroy();
              this.cleanupAndRejectAll(err);
              return;
            }
          }
        }

        // 2. Subsequent AMI packets delimited by \r\n\r\n
        let delimiterMatch: RegExpMatchArray | null;
        while ((delimiterMatch = this.buffer.match(/\r?\n\r?\n/))) {
          const matchIdx = delimiterMatch.index!;
          const matchLen = delimiterMatch[0].length;
          const packetRaw = this.buffer.slice(0, matchIdx);
          this.buffer = this.buffer.slice(matchIdx + matchLen);

          if (packetRaw.trim().length > 0) {
            const packet = this.parsePacket(packetRaw);
            this.handlePacket(packet);
          }
        }
      });

      socket.on("close", () => {
        this.isConnected = false;
        if (this.pendingActions.size > 0) {
          const err = new Error("AMI socket closed by Asterisk remote server.");
          this.cleanupAndRejectAll(err);
        }
      });

      socket.connect(this.port, this.host);
    });
  }

  /**
   * Parse raw Asterisk AMI message packet into key-value headers
   */
  private parsePacket(raw: string): AmiPacket {
    const headers: Record<string, string> = {};
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        headers[key] = value;
        headers[key.toLowerCase()] = value;
      }
    }
    return { headers, raw };
  }

  /**
   * Dispatch parsed AMI packet to awaiting Action promise
   */
  private handlePacket(packet: AmiPacket): void {
    const actionId = packet.headers["actionid"] || packet.headers["ActionID"];

    if (actionId && this.pendingActions.has(actionId)) {
      const pending = this.pendingActions.get(actionId)!;
      this.pendingActions.delete(actionId);
      clearTimeout(pending.timer);

      const resp = packet.headers["response"]?.toLowerCase();
      if (resp === "error") {
        const msg = packet.headers["message"] || "Asterisk AMI returned an error response.";
        pending.reject(new Error(msg));
      } else {
        pending.resolve(packet);
      }
      return;
    }

    // Fallback: If only 1 action is awaiting response and Asterisk didn't echo ActionID
    if (!actionId && this.pendingActions.size === 1) {
      const [pendingId, pending] = this.pendingActions.entries().next().value!;
      this.pendingActions.delete(pendingId);
      clearTimeout(pending.timer);

      const resp = packet.headers["response"]?.toLowerCase();
      if (resp === "error") {
        const msg = packet.headers["message"] || "Asterisk AMI returned an error response.";
        pending.reject(new Error(msg));
      } else {
        pending.resolve(packet);
      }
    }
  }

  /**
   * Clean up pending timers and reject all awaiting promises
   */
  private cleanupAndRejectAll(err: Error): void {
    if (this.bannerRejecter) {
      this.bannerRejecter(err);
      this.bannerResolver = null;
      this.bannerRejecter = null;
    }
    for (const [_, pending] of this.pendingActions) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pendingActions.clear();
  }

  /**
   * Send arbitrary AMI Action packet with custom ActionID and await response
   */
  public async sendAction(
    actionName: string,
    params: Record<string, string> = {},
    timeoutMs = 10000
  ): Promise<AmiPacket> {
    if (!this.socket || !this.isConnected) {
      throw new Error("AMI client is not connected to Asterisk server.");
    }

    const actionId = `msh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    return new Promise<AmiPacket>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingActions.delete(actionId);
        reject(new Error(`Timeout waiting for Asterisk response to Action: ${actionName}`));
      }, timeoutMs);

      this.pendingActions.set(actionId, { resolve, reject, timer });

      const safeAction = sanitizeAmiParam(actionName);
      let commandStr = `Action: ${safeAction}\r\nActionID: ${actionId}\r\n`;
      for (const [k, v] of Object.entries(params)) {
        const safeK = sanitizeAmiParam(k);
        const safeV = sanitizeAmiParam(v);
        if (safeK) {
          commandStr += `${safeK}: ${safeV}\r\n`;
        }
      }
      commandStr += "\r\n";

      this.socket!.write(commandStr);
    });
  }

  /**
   * Action: Login
   */
  public async login(): Promise<AmiPacket> {
    try {
      const packet = await this.sendAction("Login", {
        Username: this.username,
        Secret: this.secret,
        Events: "off",
      });
      return packet;
    } catch (err: unknown) {
      const originalMessage = err instanceof Error ? err.message : String(err);
      throw new Error(
        `AMI Authentication Failed: Invalid Asterisk username or secret. (${originalMessage})`
      );
    }
  }

  /**
   * Action: Ping (Live Connection Verification)
   */
  public async ping(): Promise<{ success: boolean; raw: string }> {
    const packet = await this.sendAction("Ping");
    const pingValue = packet.headers["ping"]?.toLowerCase();
    const isSuccess =
      packet.headers["response"]?.toLowerCase() === "success" ||
      pingValue === "pong" ||
      packet.raw.toLowerCase().includes("pong");

    if (!isSuccess) {
      throw new Error(
        packet.headers["message"] || "Asterisk Ping failed to receive Pong response."
      );
    }

    return {
      success: true,
      raw: packet.raw,
    };
  }

  /**
   * Action: Originate (Two-Way Click-to-Call with Student Number Masking)
   */
  public async originate(options: {
    mentorChannel: string;
    destinationPhone: string;
    context: string;
    callerId: string;
    timeoutMs?: number;
  }): Promise<{ success: boolean; actionId: string; raw: string; message: string }> {
    const packet = await this.sendAction(
      "Originate",
      {
        Channel: options.mentorChannel,
        Context: options.context,
        Exten: options.destinationPhone,
        Priority: "1",
        CallerID: options.callerId,
        Timeout: "30000",
        Async: "true",
      },
      options.timeoutMs || 15000
    );

    const isSuccess = packet.headers["response"]?.toLowerCase() === "success";
    const msg = packet.headers["message"] || "Originate dispatched";

    if (!isSuccess) {
      throw new Error(msg);
    }

    return {
      success: true,
      actionId: packet.headers["actionid"] || `orig_${Date.now()}`,
      raw: packet.raw,
      message: msg,
    };
  }

  /**
   * Graceful Logoff & Socket Disconnect
   */
  public async logoff(): Promise<void> {
    if (this.socket && this.isConnected) {
      try {
        this.socket.write("Action: Logoff\r\n\r\n");
      } catch {
        // Ignore write error on close
      }
    }
    this.disconnect();
  }

  /**
   * Terminate socket immediately
   */
  public disconnect(): void {
    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.destroy();
      } catch {
        // Ignore
      }
      this.socket = null;
    }
    this.isConnected = false;
    this.buffer = "";
    this.bannerReceived = false;
    for (const [_, pending] of this.pendingActions) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Socket disconnected."));
    }
    this.pendingActions.clear();
  }
}

/**
 * Ping / Test AMI Connection to Issabel Server over real TCP socket
 */
export async function testIssabelAmiConnection(settings: VoipAmiSettings): Promise<AmiResponse> {
  const client = new AsteriskAmiClient(settings);
  try {
    // Step 1: Raw TCP Handshake & Banner
    await client.connect(5000);

    // Step 2: Authenticate with configured credentials
    await client.login();

    // Step 3: Send Ping Action and verify Pong
    const pingResult = await client.ping();

    // Step 4: Graceful termination
    await client.logoff().catch(() => {});

    return {
      success: true,
      message: "اتصال زنده سوکت TCP با وب‌سرویس Issabel Asterisk AMI با موفقیت برقرار و تایید گردید (Response: Success / Ping: Pong).",
      actionId: `ami_test_${Date.now()}`,
      rawResponse: pingResult.raw,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: errorMsg,
      rawResponse: err instanceof Error && err.stack ? err.stack : undefined,
    };
  } finally {
    client.disconnect();
  }
}

/**
 * Initiate Click-to-Call with Student Phone Masking
 * 1. Rings Mentor's Zoiper softphone app (e.g. SIP/101 or PJSIP/101)
 * 2. Bridges to Student's mobile via Issabel outbound trunk
 * 3. Enforces Zero-Knowledge: student's real phone is never revealed to the mentor client
 */
export async function originateSecureMentorCall(params: {
  mentorId: string;
  mentorName: string;
  studentProfileId: string;
  studentName: string;
  studentRealPhone: string;
}): Promise<{
  success: boolean;
  message: string;
  maskedPhone: string;
  callRecordId?: string;
}> {
  let voipSettings: VoipAmiSettings = {
    id: "voip_settings_1",
    host: "127.0.0.1",
    port: 5038,
    username: "admin",
    secret: "secret123",
    context: "from-internal",
    channelTech: "SIP",
    trunk: "SIP/Trunk-Mashahir",
    callerId: "02188888888",
    isActive: true,
    mentorExtensions: {
      usr_mentor1: "101",
    },
    updatedAt: new Date(),
  };

  try {
    const [row] = await db
      .select()
      .from(voipSettingsTable)
      .where(eq(voipSettingsTable.id, "voip_ami_default"))
      .limit(1);

    if (row) {
      voipSettings = {
        id: "voip_settings_1",
        host: row.host,
        port: row.port,
        username: row.username,
        secret: row.secret,
        context: row.context,
        channelTech: row.channelTech as "SIP" | "PJSIP",
        trunk: row.trunk,
        callerId: row.callerId,
        isActive: row.isActive,
        mentorExtensions: (row.mentorExtensions as Record<string, string>) || {},
        updatedAt: new Date(),
      };
    }
  } catch {}

  const maskedPhone = maskPhoneNumber(params.studentRealPhone);

  if (!voipSettings.isActive) {
    return {
      success: false,
      message: "سرویس برقراری تماس امن Asterisk AMI در سامانه غیرفعال است.",
      maskedPhone,
    };
  }

  const sanitizedPhone = sanitizeIranianPhone(params.studentRealPhone);
  if (!sanitizedPhone || sanitizedPhone.length !== 11) {
    return {
      success: false,
      message: "شماره موبایل داوطلب نامعتبر است (فرمت مجاز: ۰۹۱۲۳۴۵۶۷۸۹).",
      maskedPhone,
    };
  }

  // Find mentor's assigned SIP extension (e.g. 101, 102)
  const mentorExtension = voipSettings.mentorExtensions[params.mentorId] || "101";
  const channelPrefix = voipSettings.channelTech === "PJSIP" ? "PJSIP" : "SIP";
  const mentorChannel = `${channelPrefix}/${mentorExtension}`;
  const context = voipSettings.context || "from-internal";
  const callerIdNumber = voipSettings.callerId || "02191000000";
  const callerId = `"پشتیبانی مشاهیر دانش" <${callerIdNumber}>`;

  const client = new AsteriskAmiClient(voipSettings);
  let callSuccess = false;
  let callMessage = "";
  let actionId = "";
  let rawResponse = "";

  try {
    await client.connect(5000);
    await client.login();
    const res = await client.originate({
      mentorChannel,
      destinationPhone: sanitizedPhone,
      context,
      callerId,
      timeoutMs: 30000,
    });
    callSuccess = true;
    callMessage = `تماس امن دوطرفه آغاز شد. ابتدا نرم‌افزار Zoiper گوشی شما (داخلی ${mentorExtension}) به صدا درمی‌آید و به محض پاسخگویی، به داوطلب متصل می‌گردد.`;
    actionId = res.actionId;
    rawResponse = res.raw;
  } catch (err: unknown) {
    callSuccess = false;
    callMessage = err instanceof Error ? err.message : String(err);
  } finally {
    await client.logoff().catch(() => {});
    client.disconnect();
  }

  const callId = `call_${Date.now()}`;
  const callRecord: VoipCallRecord = {
    id: callId,
    mentorId: params.mentorId,
    mentorName: params.mentorName,
    mentorExtension,
    studentProfileId: params.studentProfileId,
    studentName: params.studentName,
    maskedPhone,
    status: callSuccess ? "RINGING" : "FAILED",
    durationSeconds: 0,
    callUniqueId: actionId || `call_err_${Date.now()}`,
    initiatedAt: new Date(),
    notes: callSuccess
      ? `تماس از طریق اکستنشن ${mentorExtension} در نرم‌افزار Zoiper به شماره مقصد ارسال گردید. (Raw: ${rawResponse.slice(0, 100)})`
      : `خطای برقراری تماس سوکت AMI: ${callMessage}`,
  };

  try {
    await db.insert(voipCallsTable).values({
      id: callId,
      mentorId: params.mentorId,
      mentorName: params.mentorName,
      mentorExtension,
      studentProfileId: params.studentProfileId,
      studentName: params.studentName,
      maskedPhone,
      status: callSuccess ? "RINGING" : "FAILED",
      durationSeconds: 0,
      callUniqueId: actionId || `call_err_${Date.now()}`,
      initiatedAt: new Date(),
      notes: callRecord.notes,
    });
  } catch {}

  return {
    success: callSuccess,
    message: callMessage,
    maskedPhone,
    callRecordId: callId,
  };
}

/**
 * Check if the mentor's calling window is currently open for student-initiated calls
 */
export async function checkMentorCallingWindowAvailability(mentorId: string): Promise<{
  isOpen: boolean;
  window: MentorCallingWindowRecord | null;
  message: string;
  scheduleDescription: string;
}> {
  try {
    const [row] = await db
      .select()
      .from(mentorCallingWindowsTable)
      .where(eq(mentorCallingWindowsTable.mentorId, mentorId))
      .limit(1);

    if (!row) {
      // Default institutional window: 17:00 to 20:00, Saturday to Wednesday
      return {
        isOpen: false,
        window: null,
        message: "پشتیبان شما هنوز پنجره زمانی پاسخگویی تلفنی تعیین نکرده است.",
        scheduleDescription: "شنبه تا چهارشنبه — ساعت ۱۷:۰۰ الی ۲۰:۰۰",
      };
    }

    const windowData: MentorCallingWindowRecord = {
      id: row.id,
      mentorId: row.mentorId,
      startTime: row.startTime,
      endTime: row.endTime,
      daysOfWeek: (row.daysOfWeek as number[]) || [0, 1, 2, 3, 4],
      dailyDurationHours: row.dailyDurationHours,
      isActive: row.isActive,
      announcement: row.announcement,
      updatedAt: row.updatedAt,
    };

    if (!windowData.isActive) {
      return {
        isOpen: false,
        window: windowData,
        message: "پاسخگویی تلفنی مستقیم پشتیبان در حال حاضر غیرفعال است.",
        scheduleDescription: "غیرفعال موقت توسط پشتیبان",
      };
    }

    // Strict Asia/Tehran timezone calculation
    const iranInfo = getIranTimeInfo(new Date());
    const dayOfWeek = WEEKDAY_TO_PERSIAN_INDEX[iranInfo.weekday] ?? 0;
    const currentMinutes = iranInfo.hour * 60 + iranInfo.minute;

    const [startH, startM] = windowData.startTime.split(":").map(Number);
    const [endH, endM] = windowData.endTime.split(":").map(Number);
    const startMinutes = (startH || 17) * 60 + (startM || 0);
    const endMinutes = (endH || 20) * 60 + (endM || 0);

    const isAllowedDay = windowData.daysOfWeek.includes(dayOfWeek);
    const isAllowedTime = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

    const dayNames = windowData.daysOfWeek
      .map((d) => PERSIAN_WEEKDAYS[d])
      .filter(Boolean)
      .join("، ");

    const scheduleDescription = `${dayNames} — ساعت ${toPersianDigits(windowData.startTime)} الی ${toPersianDigits(windowData.endTime)}`;

    if (isAllowedDay && isAllowedTime) {
      return {
        isOpen: true,
        window: windowData,
        message: `پشتیبان شما هم‌اکنون در بازه پاسخگویی تلفنی قرار دارد (تا ساعت ${toPersianDigits(windowData.endTime)}).`,
        scheduleDescription,
      };
    }

    let nextNotice = "";
    if (!isAllowedDay) {
      nextNotice = `امروز (${PERSIAN_WEEKDAYS[dayOfWeek]}) روز پاسخگویی تلفنی پشتیبان نیست.`;
    } else if (currentMinutes < startMinutes) {
      nextNotice = `پاسخگویی تلفنی امروز از ساعت ${toPersianDigits(windowData.startTime)} آغاز می‌شود.`;
    } else {
      nextNotice = `زمان پاسخگویی امروز در ساعت ${toPersianDigits(windowData.endTime)} به پایان رسیده است.`;
    }

    return {
      isOpen: false,
      window: windowData,
      message: nextNotice,
      scheduleDescription,
    };
  } catch (err) {
    console.warn("[VoIP] checkMentorCallingWindowAvailability error:", err);
    return {
      isOpen: false,
      window: null,
      message: "خطا در استعلام ساعات کاری پشتیبان.",
      scheduleDescription: "روزهای کاری: ۱۷:۰۰ الی ۲۰:۰۰",
    };
  }
}

/**
 * Initiate Reverse Call from Student to Coach via Asterisk AMI
 * Step 1: System calls Coach's Zoiper / extension first (Channel: SIP/{mentorExtension})
 * Step 2: When Coach picks up, Asterisk immediately calls the Learner (Exten: {studentPhone})
 * Step 3: Zero-Knowledge Privacy: PBX CallerID is used, real numbers never displayed
 */
export async function originateReverseStudentCall(params: {
  studentProfileId: string;
  studentName: string;
  studentRealPhone: string;
  mentorId: string;
  mentorName: string;
}): Promise<{
  success: boolean;
  message: string;
  maskedStudentPhone: string;
  maskedMentorPhone: string;
  callRecordId?: string;
}> {
  // 1. Check availability window
  const availability = await checkMentorCallingWindowAvailability(params.mentorId);
  if (!availability.isOpen) {
    return {
      success: false,
      message: availability.message || "پشتیبان شما در حال حاضر خارج از ساعات تعیین‌شده پاسخگویی تلفنی است.",
      maskedStudentPhone: maskPhoneNumber(params.studentRealPhone),
      maskedMentorPhone: "۰۹۱۲***۰۰۰۰",
    };
  }

  // 2. Fetch VoIP settings
  let voipSettings: VoipAmiSettings = {
    id: "voip_settings_1",
    host: "127.0.0.1",
    port: 5038,
    username: "admin",
    secret: "secret123",
    context: "from-internal",
    channelTech: "SIP",
    trunk: "SIP/Trunk-Mashahir",
    callerId: "02188888888",
    isActive: true,
    mentorExtensions: {
      usr_mentor1: "101",
    },
    updatedAt: new Date(),
  };

  try {
    const [row] = await db
      .select()
      .from(voipSettingsTable)
      .where(eq(voipSettingsTable.id, "voip_ami_default"))
      .limit(1);

    if (row) {
      voipSettings = {
        id: "voip_settings_1",
        host: row.host,
        port: row.port,
        username: row.username,
        secret: row.secret,
        context: row.context,
        channelTech: row.channelTech as "SIP" | "PJSIP",
        trunk: row.trunk,
        callerId: row.callerId,
        isActive: row.isActive,
        mentorExtensions: (row.mentorExtensions as Record<string, string>) || {},
        updatedAt: new Date(),
      };
    }
  } catch {}

  const maskedStudentPhone = maskPhoneNumber(params.studentRealPhone);
  const mentorExtension = voipSettings.mentorExtensions[params.mentorId] || "101";
  const maskedMentorPhone = `داخلی ${toPersianDigits(mentorExtension)}`;

  if (!voipSettings.isActive) {
    return {
      success: false,
      message: "سرویس وب‌سرویس تماس امن Asterisk AMI در سامانه موقتاً غیرفعال است.",
      maskedStudentPhone,
      maskedMentorPhone,
    };
  }

  const sanitizedStudentPhone = sanitizeIranianPhone(params.studentRealPhone);
  if (!sanitizedStudentPhone || sanitizedStudentPhone.length !== 11) {
    return {
      success: false,
      message: "شماره موبایل داوطلب در پروفایل معتبر نیست.",
      maskedStudentPhone,
      maskedMentorPhone,
    };
  }

  // Asterisk AMI Two-Leg Reverse Call:
  // Leg 1: Dial Coach's softphone/Zoiper extension
  // Leg 2: Upon Coach answering, dial Student's mobile number
  const channelPrefix = voipSettings.channelTech === "PJSIP" ? "PJSIP" : "SIP";
  const coachChannel = `${channelPrefix}/${mentorExtension}`;
  const context = voipSettings.context || "from-internal";
  const callerIdNumber = voipSettings.callerId || "02191000000";
  const callerId = `"مشاهیر دانش - تماس داوطلب" <${callerIdNumber}>`;

  const client = new AsteriskAmiClient(voipSettings);
  let callSuccess = false;
  let callMessage = "";
  let actionId = "";
  let rawResponse = "";

  try {
    await client.connect(5000);
    await client.login();
    const res = await client.originate({
      mentorChannel: coachChannel,
      destinationPhone: sanitizedStudentPhone,
      context,
      callerId,
      timeoutMs: 30000,
    });
    callSuccess = true;
    callMessage = `درخواست تماس ثبت شد. ابتدا زویپر پشتیبان شما به صدا درمی‌آید و به محض پاسخگویی ایشان، گوشی شما زنگ خواهد خورد.`;
    actionId = res.actionId;
    rawResponse = res.raw;
  } catch (err: unknown) {
    callSuccess = false;
    callMessage = err instanceof Error ? err.message : String(err);
  } finally {
    await client.logoff().catch(() => {});
    client.disconnect();
  }

  const callId = `call_rev_${Date.now()}`;
  const callRecord: VoipCallRecord = {
    id: callId,
    mentorId: params.mentorId,
    mentorName: params.mentorName,
    mentorExtension,
    studentProfileId: params.studentProfileId,
    studentName: params.studentName,
    maskedPhone: maskedStudentPhone,
    status: callSuccess ? "RINGING" : "FAILED",
    durationSeconds: 0,
    callUniqueId: actionId || `call_err_${Date.now()}`,
    initiatedAt: new Date(),
    notes: callSuccess
      ? `تماس از جانب داوطلب در ساعت مجاز ثبت شد. ابتدا با داخلی مربی (${mentorExtension}) تماس گرفته شد و سپس به شماره همراه داوطلب متصل می‌شود.`
      : `خطا در برقراری تماس معکوس AMI: ${callMessage}`,
  };

  try {
    await db.insert(voipCallsTable).values({
      id: callId,
      mentorId: params.mentorId,
      mentorName: params.mentorName,
      mentorExtension,
      studentProfileId: params.studentProfileId,
      studentName: params.studentName,
      maskedPhone: maskedStudentPhone,
      status: callSuccess ? "RINGING" : "FAILED",
      durationSeconds: 0,
      callUniqueId: actionId || `call_err_${Date.now()}`,
      initiatedAt: new Date(),
      notes: callRecord.notes,
    });
  } catch {}

  return {
    success: callSuccess,
    message: callMessage,
    maskedStudentPhone,
    maskedMentorPhone,
    callRecordId: callId,
  };
}
