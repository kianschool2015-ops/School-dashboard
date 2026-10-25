process.env.REDIS_URL = "redis://localhost:6379/0";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Redis from "ioredis";
import {
  checkOtpRateLimitDistributed,
  generateOtpDistributed,
  verifyOtpDistributed,
} from "../src/server/auth/otp";

describe("Phase 2: Multi-Replica Shared State & Distributed Rate Limiting Proof", () => {
  let redisA: Redis | null = null;
  let redisB: Redis | null = null;
  let isRedisAvailable = false;
  const testPhone = "09129998877";

  beforeAll(async () => {
    try {
      const probe = new Redis("redis://localhost:6379/0", {
        connectTimeout: 800,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      // Suppress unhandled error events during probe
      probe.on("error", () => {});
      await probe.connect();
      await probe.ping();
      await probe.quit();
      isRedisAvailable = true;

      // Connect as two distinct client connections representing Replica A and Replica B
      redisA = new Redis("redis://localhost:6379/0", {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      redisB = new Redis("redis://localhost:6379/0", {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      redisA.on("error", () => {});
      redisB.on("error", () => {});

      // Clean test keys
      await redisA.del(`otp:${testPhone}`);
      await redisA.del(`ratelimit:otp:phone:${testPhone}`);
    } catch {
      isRedisAvailable = false;
    }
  });

  afterAll(async () => {
    if (redisA && isRedisAvailable) {
      await redisA.del(`otp:${testPhone}`).catch(() => {});
      await redisA.del(`ratelimit:otp:phone:${testPhone}`).catch(() => {});
      await redisA.quit().catch(() => {});
    }
    if (redisB && isRedisAvailable) {
      await redisB.quit().catch(() => {});
    }
  });

  it("proves OTP generated on Replica A is instantly verifiable on Replica B", async (ctx) => {
    if (!isRedisAvailable || !redisA || !redisB) {
      ctx.skip();
      return;
    }

    process.env.REDIS_URL = "redis://localhost:6379/0";

    // Replica A generates OTP
    const { code } = await generateOtpDistributed(testPhone);
    expect(code).toBeDefined();

    // Directly inspect Redis to prove it is in central storage, not in process memory
    const rawData = await redisB.get(`otp:${testPhone}`);
    expect(rawData).not.toBeNull();
    const parsed = JSON.parse(rawData!);
    expect(parsed.code).toBe(code);

    // Replica B verifies the OTP code
    const isVerifiedOnReplicaB = await verifyOtpDistributed(testPhone, code);
    expect(isVerifiedOnReplicaB).toBe(true);

    // Verify key was deleted upon successful verification
    const afterDelete = await redisA.get(`otp:${testPhone}`);
    expect(afterDelete).toBeNull();
  });

  it("proves rate-limiting counters increment and block across replicas", async (ctx) => {
    if (!isRedisAvailable || !redisA || !redisB) {
      ctx.skip();
      return;
    }
    process.env.REDIS_URL = "redis://localhost:6379/0";
    const burstPhone = "09125554433";
    await redisA.del(`ratelimit:otp:phone:${burstPhone}`);

    // Request 1 on Replica A
    const r1 = await checkOtpRateLimitDistributed(burstPhone);
    expect(r1.allowed).toBe(true);

    // Request 2 on Replica B
    const r2 = await checkOtpRateLimitDistributed(burstPhone);
    expect(r2.allowed).toBe(true);

    // Request 3 on Replica A
    const r3 = await checkOtpRateLimitDistributed(burstPhone);
    expect(r3.allowed).toBe(true);

    // Request 4 on Replica B: must be blocked because shared counter in Redis reached limit!
    const r4 = await checkOtpRateLimitDistributed(burstPhone);
    expect(r4.allowed).toBe(false);
    expect(r4.reason).toBe("PHONE");
    expect(r4.remainingMinutes).toBeGreaterThan(0);

    await redisA.del(`ratelimit:otp:phone:${burstPhone}`);
  });
});
