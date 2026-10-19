import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Mashahir Danesh Law School Platform - Database Layer (Track 1)
 * 100% Parameterized Drizzle ORM on PostgreSQL 16
 * Configured for PgBouncer connection pooling and high concurrency (200k+ candidates)
 */

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/mashahir_support";

export const pgClient = postgres(connectionString, {
  max: 20, // Connection pool size for 200k+ high throughput via PgBouncer
  idle_timeout: 20,
  connect_timeout: 10,
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(pgClient, { schema });
export type Database = typeof db;
