import { SignJWT, jwtVerify } from "jose";

/**
 * Mashahir Danesh Law School Platform - Hardened JWT & Session Token Service (Edge-Compatible)
 * Addresses C-01, M-01, H-01, H-03, L-02
 */

export type UserRole = "STUDENT" | "MENTOR" | "SUPERVISOR" | "CEO" | "ADMIN";

export interface SessionPayload {
  userId: string;
  role: UserRole;
  username: string;
  sessionId: string;
  fullName: string;
  studentProfileId?: string;
  mentorId?: string;
  iat?: number;
  exp?: number;
  // phoneNumber is intentionally excluded from stored payload (M-01)
  phoneNumber?: string;
}

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable is missing or empty in production! (C-01)");
    }
    return new TextEncoder().encode("dev_jwt_secret_64_bytes_mashahir_danesh_super_hardened_key_2026_law_school");
  }
  return new TextEncoder().encode(secret.trim());
}

export function isCookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

const inMemoryRevokedSessions = new Set<string>();

export async function createSessionToken(
  payload: {
    userId: string;
    role: UserRole;
    username?: string;
    fullName?: string;
    studentProfileId?: string;
    mentorId?: string;
    sessionId?: string;
    phoneNumber?: string; // Accepted for backward compatibility but stripped from JWT
  },
  expiresIn: string = "8h"
): Promise<string> {
  const secretKey = getJwtSecret();
  const randomUuid =
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
  const sessionId = payload.sessionId || `sess_${randomUuid}`;

  // M-01: Exclude phoneNumber from token payload
  const tokenPayload: Record<string, unknown> = {
    userId: payload.userId,
    role: payload.role,
    username: payload.username || "",
    sessionId,
    fullName: payload.fullName || "کاربر مشاهیر دانش",
    studentProfileId: payload.studentProfileId,
    mentorId: payload.mentorId,
  };

  return new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey);
    const session = payload as unknown as SessionPayload;

    // L-02: Check token revocation
    if (session.sessionId) {
      const revoked = await isSessionRevoked(session.sessionId);
      if (revoked) return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function revokeSessionToken(sessionId: string): Promise<void> {
  if (!sessionId) return;
  inMemoryRevokedSessions.add(sessionId);
}

export const revokeSession = revokeSessionToken;

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  return inMemoryRevokedSessions.has(sessionId);
}
