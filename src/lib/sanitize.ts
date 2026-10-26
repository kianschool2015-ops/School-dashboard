import crypto from "crypto";
import type { UserRole } from "@/types/models";

/**
 * Mashahir Danesh Law School Platform - Centralized PII & User Sanitization Utility
 * Implements C-05, H-14, M-03, E-01
 */

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.trim();
  if (clean.length < 7) return "***";
  // Format: 0912***0005
  return clean.slice(0, 4) + "***" + clean.slice(-4);
}

export function maskNationalId(natId?: string | null): string {
  if (!natId) return "";
  const clean = natId.trim();
  if (clean.length < 7) return "***";
  // Format: 002***6789
  return clean.slice(0, 3) + "***" + clean.slice(-4);
}

export function hmacPhoneForAudit(phone: string): string {
  const secret = process.env.JWT_SECRET || "mashahir_audit_salt_2026";
  return crypto.createHmac("sha256", secret).update(phone.trim()).digest("hex");
}

/**
 * Validate attachment URL scheme (H-10)
 * Rejects dangerous URI schemes like javascript:, data:, vbscript:, blob:
 */
export function isValidAttachmentUrl(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("blob:")
  ) {
    return false;
  }
  return trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://");
}

/**
 * Sanitize text content against XSS (M-04)
 * Strips dangerous HTML script tags and inline event handlers
 */
export function sanitizeTextContent(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
}

export function sanitizeUserForClient<T extends Record<string, unknown>>(
  user: T,
  viewerRole?: UserRole | string
): Omit<T, "passwordHash" | "password_hash"> {
  if (!user) return user;

  const sanitized = { ...user } as Record<string, unknown>;

  // Always strip password hashes under all conditions
  delete sanitized.passwordHash;
  delete sanitized.password_hash;

  // Mask PII if viewer is not CEO / ADMIN
  const isPrivileged = viewerRole === "CEO" || viewerRole === "ADMIN";

  if (!isPrivileged) {
    if (typeof sanitized.phoneNumber === "string") {
      sanitized.phoneNumber = maskPhoneNumber(sanitized.phoneNumber);
    }
    if (typeof sanitized.phone_number === "string") {
      sanitized.phone_number = maskPhoneNumber(sanitized.phone_number);
    }
    if (typeof sanitized.nationalId === "string") {
      sanitized.nationalId = maskNationalId(sanitized.nationalId);
    }
    if (typeof sanitized.national_id === "string") {
      sanitized.national_id = maskNationalId(sanitized.national_id);
    }
  }

  return sanitized as Omit<T, "passwordHash" | "password_hash">;
}
