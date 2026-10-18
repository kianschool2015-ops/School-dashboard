process.env.REDIS_URL = "redis://localhost:6379/0";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Redis from "ioredis";
import {
  checkOtpRateLimitDistributed,
  generateOtpDistributed,
  verifyOtpDistributed,
} from "../src/server/auth/otp";

describe("Phase 2: Multi-Replica Shared State & Distributed Rate Limiting Proof", () => {
  let redisA: Redis;
  let redisB: Redis;
  const testPhone = "09129998877";

  beforeAll(async () => {
    // Connect as two distinct client connections representing Replica A and Replica B
    redisA = new Redis("redis://localhost:6379/0");
    redisB = new Redis("redis://localhost:6379/0");

    // Clean test keys
    await redisA.del(`otp:${testPhone}`);
    await redisA.del(`ratelimit:otp:phone:${testPhone}`);
  });

  afterAll(async () => {
    await redisA.del(`otp:${testPhone}`);
    await redisA.del(`ratelimit:otp:phone:${testPhone}`);
    await redisA.quit();
    await redisB.quit();
  });

  it("proves OTP generated on Replica A is instantly verifiable on Replica B", async () => {
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

  it("proves rate-limiting counters increment and block across replicas", async () => {
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
