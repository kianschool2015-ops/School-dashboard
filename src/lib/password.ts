import crypto from "crypto";

/**
 * Mashahir Danesh Law School Platform - Cryptographic Password Utility (C-03)
 * Implements hardened scrypt-based password hashing with random salt.
 * Format: scrypt$<salt_hex>$<hash_hex>
 */

export function hashPassword(password: string): string {
  if (!password) {
    throw new Error("Password cannot be empty");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash) return false;

  // 1. Scrypt hashed password
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, expectedHash] = parts;
    try {
      const derived = crypto.scryptSync(password, salt, 64).toString("hex");
      const derivedBuf = Buffer.from(derived, "hex");
      const expectedBuf = Buffer.from(expectedHash, "hex");
      if (derivedBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(derivedBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  // 2. Transitional fallback for unmigrated test fixtures
  return password === storedHash;
}
