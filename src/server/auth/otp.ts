import crypto from "crypto";

interface OtpEntry {
  code: string;
  expiresAt: number; // Unix timestamp in ms
}

interface RateLimitEntry {
  attempts: number[]; // Array of request timestamps
}

// In-memory sliding window store (compatible with Redis or standalone local dev)
const otpStore = new Map<string, OtpEntry>();
const rateLimitStore = new Map<string, RateLimitEntry>();

const OTP_EXPIRY_MS = 120 * 1000; // 120 seconds
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

/**
 * Validates Iranian mobile phone number format (09xxxxxxxxx)
 */
export function isValidIranianPhone(phone: string): boolean {
  return /^09[0-9]{9}$/.test(phone.trim());
}

/**
 * Checks sliding window rate limit for phone number
 */
export function checkOtpRateLimit(phone: string): { allowed: boolean; remainingMinutes?: number } {
  const normalizedPhone = phone.trim();
  const now = Date.now();
  const entry = rateLimitStore.get(normalizedPhone) || { attempts: [] };

  // Filter out attempts outside the 10-minute sliding window
  const recentAttempts = entry.attempts.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  rateLimitStore.set(normalizedPhone, { attempts: recentAttempts });

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    const oldestAttempt = recentAttempts[0];
    const timeUntilWindowResets = RATE_LIMIT_WINDOW_MS - (now - oldestAttempt);
    const remainingMinutes = Math.ceil(timeUntilWindowResets / 60000);
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true };
}

/**
 * Generates and stores a 5-digit cryptographic OTP code
 */
export function generateOtp(phone: string): { code: string; expiresInSeconds: number } {
  const normalizedPhone = phone.trim();
  const now = Date.now();

  // Record rate limit attempt
  const rateEntry = rateLimitStore.get(normalizedPhone) || { attempts: [] };
  rateEntry.attempts.push(now);
  rateLimitStore.set(normalizedPhone, rateEntry);

  // Generate cryptographic 5-digit number: 10000 - 99999
  const randomInt = crypto.randomInt(10000, 100000);
  const code = randomInt.toString();

  otpStore.set(normalizedPhone, {
    code,
    expiresAt: now + OTP_EXPIRY_MS,
  });

  // In development mode, log OTP to console for immediate developer access
  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`);
    console.log(`[Mashahir Danesh SMS OTP Gateway (DEV)]`);
    console.log(`Target Phone: ${normalizedPhone}`);
    console.log(`OTP Code: ${code} (Expires in 120s)`);
    console.log(`Master Demo Code: 12345`);
    console.log(`========================================\n`);
  }

  return {
    code,
    expiresInSeconds: 120,
  };
}

/**
 * Verifies OTP code for a phone number
 */
export function verifyOtp(phone: string, inputCode: string): boolean {
  const normalizedPhone = phone.trim();
  const trimmedCode = inputCode.trim();

  // Master Mock OTP for testing and demo
  const isMockAllowed =
    process.env.ENABLE_MOCK_OTP !== "false" &&
    (process.env.NODE_ENV !== "production" || process.env.ENABLE_MOCK_OTP === "true");

  if (isMockAllowed && trimmedCode === "12345") {
    // Delete pending OTP if any
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

  return false;
}
