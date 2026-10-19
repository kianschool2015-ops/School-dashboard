import crypto from "crypto";
import { getRedisClient } from "../redis";

interface OtpEntry {
  code: string;
  expiresAt: number; // Unix timestamp in ms
  failedAttempts: number;
}

interface RateLimitEntry {
  attempts: number[]; // Array of request timestamps
}

// In-memory fallback sliding window stores
const otpStore = new Map<string, OtpEntry>();
const phoneRateLimitStore = new Map<string, RateLimitEntry>();
const ipRateLimitStore = new Map<string, RateLimitEntry>();

const OTP_EXPIRY_MS = 120 * 1000; // 120 seconds
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PHONE_ATTEMPTS = 3;
const MAX_IP_ATTEMPTS = 10;
const MAX_VERIFY_FAILURES = 5;

/**
 * Converts Persian and Arabic digits to standard ASCII English digits (0-9)
 */
export function toEnglishDigits(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let res = str.toString();
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persianDigits[i], i.toString()).replaceAll(arabicDigits[i], i.toString());
  }
  return res;
}

/**
 * Normalizes Iranian phone numbers:
 * Converts Persian/Arabic digits, strips whitespace/symbols, and handles +98, 0098, 98 prefixes.
 * Output: standard 11-digit "09xxxxxxxxx" format.
 */
export function normalizePhoneNumber(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";
  let clean = toEnglishDigits(rawPhone).trim();
  clean = clean.replace(/[\s\-\(\)\._]/g, "");

  if (clean.startsWith("+98")) {
    clean = "0" + clean.slice(3);
  } else if (clean.startsWith("0098")) {
    clean = "0" + clean.slice(4);
  } else if (clean.startsWith("98") && clean.length === 12) {
    clean = "0" + clean.slice(2);
  } else if (clean.length === 10 && clean.startsWith("9")) {
    clean = "0" + clean;
  }
  return clean;
}

/**
 * Validates Iranian mobile phone number format (09xxxxxxxxx)
 */
export function isValidIranianPhone(phone: string): boolean {
  const norm = normalizePhoneNumber(phone);
  return /^09[0-9]{9}$/.test(norm);
}

/**
 * Reset all stores (utility for test suites)
 */
export function _clearOtpStores(): void {
  otpStore.clear();
  phoneRateLimitStore.clear();
  ipRateLimitStore.clear();
}

/**
 * Checks sliding window rate limit for phone number and IP address
 */
export function checkOtpRateLimit(
  phone: string,
  ip?: string
): { allowed: boolean; remainingMinutes?: number; reason?: "PHONE" | "IP" } {
  const normalizedPhone = normalizePhoneNumber(phone);
  const now = Date.now();

  // 1. Check Phone Rate Limit (Max 3 attempts per 10 mins)
  const phoneEntry = phoneRateLimitStore.get(normalizedPhone) || { attempts: [] };
  const recentPhoneAttempts = phoneEntry.attempts.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  phoneRateLimitStore.set(normalizedPhone, { attempts: recentPhoneAttempts });

  if (recentPhoneAttempts.length >= MAX_PHONE_ATTEMPTS) {
    const oldestAttempt = recentPhoneAttempts[0];
    const timeUntilWindowResets = RATE_LIMIT_WINDOW_MS - (now - oldestAttempt);
    const remainingMinutes = Math.ceil(timeUntilWindowResets / 60000);
    return { allowed: false, remainingMinutes, reason: "PHONE" };
  }

  // 2. Check IP Rate Limit (Max 10 attempts per 10 mins to prevent SMS toll fraud)
  if (ip) {
    const cleanIp = ip.trim();
    const ipEntry = ipRateLimitStore.get(cleanIp) || { attempts: [] };
    const recentIpAttempts = ipEntry.attempts.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    ipRateLimitStore.set(cleanIp, { attempts: recentIpAttempts });

    if (recentIpAttempts.length >= MAX_IP_ATTEMPTS) {
      const oldestAttempt = recentIpAttempts[0];
      const timeUntilWindowResets = RATE_LIMIT_WINDOW_MS - (now - oldestAttempt);
      const remainingMinutes = Math.ceil(timeUntilWindowResets / 60000);
      return { allowed: false, remainingMinutes, reason: "IP" };
    }
  }

  return { allowed: true };
}

/**
 * Generates and stores a 5-digit cryptographic OTP code
 */
export function generateOtp(
  phone: string,
  ip?: string
): { code: string; expiresInSeconds: number } {
  const normalizedPhone = normalizePhoneNumber(phone);
  const now = Date.now();

  // Record rate limit attempt
  const phoneEntry = phoneRateLimitStore.get(normalizedPhone) || { attempts: [] };
  phoneEntry.attempts.push(now);
  phoneRateLimitStore.set(normalizedPhone, phoneEntry);

  if (ip) {
    const cleanIp = ip.trim();
    const ipEntry = ipRateLimitStore.get(cleanIp) || { attempts: [] };
    ipEntry.attempts.push(now);
    ipRateLimitStore.set(cleanIp, ipEntry);
  }

  // Generate cryptographic 5-digit number: 10000 - 99999
  const randomInt = crypto.randomInt(10000, 100000);
  const code = randomInt.toString();

  otpStore.set(normalizedPhone, {
    code,
    expiresAt: now + OTP_EXPIRY_MS,
    failedAttempts: 0,
  });

  // In development mode only, log OTP to console
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`);
    console.log(`[Mashahir Danesh SMS OTP Gateway (DEV)]`);
    console.log(`Target Phone: ${normalizedPhone}`);
    console.log(`OTP Code: ${code} (Expires in 120s)`);
    console.log(`========================================\n`);
  }

  return {
    code,
    expiresInSeconds: 120,
  };
}

/**
 * Verifies OTP code for a phone number
 * Hardened:
 * 1. Strict zero-trust mock code check (NEVER allowed in production)
 * 2. Revoked upon 5 failed attempts (prevents 5-digit brute force)
 */
export function verifyOtp(phone: string, inputCode: string): boolean {
  const normalizedPhone = normalizePhoneNumber(phone);
  const trimmedCode = toEnglishDigits(inputCode).trim();

  // Master Mock OTP: Strictly disabled in production environment
  const isMockAllowed =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_MOCK_OTP === "true";

  if (isMockAllowed && trimmedCode === "12345") {
    otpStore.delete(normalizedPhone);
    return true;
  }

  const stored = otpStore.get(normalizedPhone);
  if (!stored) {
    return false;
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(normalizedPhone);
    return false;
  }

  if (stored.code === trimmedCode) {
    otpStore.delete(normalizedPhone);
    return true;
  }

  // Increment failure counter; delete if threshold reached
  stored.failedAttempts += 1;
  if (stored.failedAttempts >= MAX_VERIFY_FAILURES) {
    otpStore.delete(normalizedPhone);
    return false;
  }

  return false;
}

// -----------------------------------------------------------------------------
// Distributed Redis-Backed OTP Engine (Multi-Replica Cluster Support)
// -----------------------------------------------------------------------------

export async function checkOtpRateLimitDistributed(
  phone: string,
  ip?: string
): Promise<{ allowed: boolean; remainingMinutes?: number; reason?: "PHONE" | "IP" }> {
  const redis = getRedisClient();
  if (!redis) {
    return checkOtpRateLimit(phone, ip);
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const phoneKey = `ratelimit:otp:phone:${normalizedPhone}`;
    const phoneCount = await redis.incr(phoneKey);
    if (phoneCount === 1) {
      await redis.expire(phoneKey, 600); // 10 minutes
    }
    if (phoneCount > MAX_PHONE_ATTEMPTS) {
      const ttl = await redis.ttl(phoneKey);
      return { allowed: false, remainingMinutes: Math.max(1, Math.ceil(ttl / 60)), reason: "PHONE" };
    }

    if (ip) {
      const cleanIp = ip.trim();
      const ipKey = `ratelimit:otp:ip:${cleanIp}`;
      const ipCount = await redis.incr(ipKey);
      if (ipCount === 1) {
        await redis.expire(ipKey, 600);
      }
      if (ipCount > MAX_IP_ATTEMPTS) {
        const ttl = await redis.ttl(ipKey);
        return { allowed: false, remainingMinutes: Math.max(1, Math.ceil(ttl / 60)), reason: "IP" };
      }
    }

    return { allowed: true };
  } catch {
    return checkOtpRateLimit(phone, ip);
  }
}

export async function generateOtpDistributed(
  phone: string,
  ip?: string
): Promise<{ code: string; expiresInSeconds: number }> {
  const redis = getRedisClient();
  if (!redis) {
    return generateOtp(phone, ip);
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phone);
    const randomInt = crypto.randomInt(10000, 100000);
    const code = randomInt.toString();

    const otpKey = `otp:${normalizedPhone}`;
    const otpData = JSON.stringify({ code, failedAttempts: 0 });
    await redis.set(otpKey, otpData, "EX", 120);

    return { code, expiresInSeconds: 120 };
  } catch {
    return generateOtp(phone, ip);
  }
}

export async function verifyOtpDistributed(
  phone: string,
  inputCode: string
): Promise<boolean> {
  const isMockAllowed =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_MOCK_OTP === "true";

  const normalizedPhone = normalizePhoneNumber(phone);
  const trimmedCode = toEnglishDigits(inputCode).trim();

  if (isMockAllowed && trimmedCode === "12345") {
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`otp:${normalizedPhone}`).catch(() => {});
    } else {
      otpStore.delete(normalizedPhone);
    }
    return true;
  }

  const redis = getRedisClient();
  if (!redis) {
    return verifyOtp(phone, inputCode);
  }

  try {
    const otpKey = `otp:${normalizedPhone}`;
    const raw = await redis.get(otpKey);
    if (!raw) return false;

    const stored = JSON.parse(raw) as { code: string; failedAttempts: number };
    if (stored.code === trimmedCode) {
      await redis.del(otpKey);
      return true;
    }

    stored.failedAttempts += 1;
    if (stored.failedAttempts >= MAX_VERIFY_FAILURES) {
      await redis.del(otpKey);
    } else {
      const ttl = await redis.ttl(otpKey);
      if (ttl > 0) {
        await redis.set(otpKey, JSON.stringify(stored), "EX", ttl);
      }
    }
    return false;
  } catch {
    return verifyOtp(phone, inputCode);
  }
}
