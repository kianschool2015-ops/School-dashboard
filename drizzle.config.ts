import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  try {
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, "utf8");
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^\r\n"']+)["']?/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch {}

  return "postgresql://postgres:staging_secret_password_2026@localhost:5433/mashahir_staging_db";
}

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: resolveDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});
