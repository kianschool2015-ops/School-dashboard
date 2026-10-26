/**
 * Mashahir Danesh Law School Platform - Session JWT Layer (Server / Node Runtime)
 * Extends Edge-safe JWT service from @/lib/jwt with Redis-backed distributed revocation
 */
export * from "@/lib/jwt";
import {
  verifySessionToken as verifyBaseToken,
  revokeSessionToken as revokeInMemory,
  isSessionRevoked as isRevokedInMemory,
  type SessionPayload,
} from "@/lib/jwt";
import { getRedisClient } from "../redis";

export async function revokeSessionToken(sessionId: string, ttlSeconds = 8 * 3600): Promise<void> {
  if (!sessionId) return;
  await revokeInMemory(sessionId);
  try {
    const redis = getRedisClient();
    if (redis) {
      await redis.set(`revoked_session:${sessionId}`, "1", "EX", ttlSeconds);
    }
  } catch {}
}

export const revokeSession = revokeSessionToken;

export async function isSessionRevoked(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  if (await isRevokedInMemory(sessionId)) return true;

  try {
    const redis = getRedisClient();
    if (redis) {
      const exists = await redis.get(`revoked_session:${sessionId}`);
      return Boolean(exists);
    }
  } catch {}

  return false;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const session = await verifyBaseToken(token);
  if (!session) return null;

  if (session.sessionId) {
    const revoked = await isSessionRevoked(session.sessionId);
    if (revoked) return null;
  }

  return session;
}
