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

const inMemoryActiveUserSessions = new Map<string, string>();

/**
 * Enforce Strict Single-Device Session Policy:
 * When a user (especially a student) logs in on a new browser/device,
 * any prior active session is immediately revoked so credentials cannot be shared.
 */
export async function registerActiveUserSession(
  userId: string,
  newSessionId: string
): Promise<void> {
  if (!userId || !newSessionId) return;

  const previousSessionId = inMemoryActiveUserSessions.get(userId);
  inMemoryActiveUserSessions.set(userId, newSessionId);

  try {
    const redis = getRedisClient();
    if (redis) {
      const redisPrev = await redis.get(`user_active_session:${userId}`);
      if (redisPrev && redisPrev !== newSessionId) {
        await revokeSessionToken(redisPrev);
      }
      await redis.set(`user_active_session:${userId}`, newSessionId, "EX", 7 * 24 * 3600);
    }
  } catch {}

  if (previousSessionId && previousSessionId !== newSessionId) {
    await revokeSessionToken(previousSessionId);
  }
}

/**
 * Revoke all active sessions for a user (used upon account suspension or refund detection)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  if (!userId) return;
  const inMem = inMemoryActiveUserSessions.get(userId);
  if (inMem) {
    await revokeSessionToken(inMem);
    inMemoryActiveUserSessions.delete(userId);
  }
  try {
    const redis = getRedisClient();
    if (redis) {
      const activeSessionId = await redis.get(`user_active_session:${userId}`);
      if (activeSessionId) {
        await revokeSessionToken(activeSessionId);
        await redis.del(`user_active_session:${userId}`);
      }
    }
  } catch {}
}

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

    // Single-device check for student accounts
    if (session.role === "STUDENT" && session.userId) {
      try {
        const redis = getRedisClient();
        if (redis) {
          const activeSessionId = await redis.get(`user_active_session:${session.userId}`);
          if (activeSessionId && activeSessionId !== session.sessionId) {
            return null; // A newer login has superseded this session
          }
        }
      } catch {}

      const localActive = inMemoryActiveUserSessions.get(session.userId);
      if (localActive && localActive !== session.sessionId) {
        return null;
      }
    }
  }

  return session;
}
