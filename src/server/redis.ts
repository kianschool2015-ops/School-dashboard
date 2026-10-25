import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: true,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 1000)),
    });

    redisClient.on("error", (err) => {
      // Log connection error without crashing process
      if (process.env.NODE_ENV !== "test") {
        console.warn("[Redis] Connection error:", err.message);
      }
    });

    return redisClient;
  } catch (err) {
    console.warn("[Redis] Initialization failed:", err);
    return null;
  }
}
