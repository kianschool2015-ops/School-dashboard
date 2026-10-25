import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";
import { runDatabaseBootstrap } from "./bootstrap";

/**
 * Mashahir Danesh Law School Platform - Database Layer (Track 1)
 * 100% Parameterized Drizzle ORM on PostgreSQL 16
 * Configured for PgBouncer connection pooling and high concurrency (200k+ candidates)
 */

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Attempt to load from .env.local if running on host
  try {
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, "utf8");
      const match = content.match(/^DATABASE_URL\s*=\s*["']?([^\r\n"']+)["']?/m);
      if (match && match[1]) {
        process.env.DATABASE_URL = match[1].trim();
        return process.env.DATABASE_URL;
      }
    }
  } catch {}

  // Fallback default: Docker PostgreSQL container mapped to host port 5433
  return "postgresql://postgres:staging_secret_password_2026@localhost:5433/mashahir_staging_db";
}

const connectionString = resolveDatabaseUrl();

const isVitest = Boolean(process.env.VITEST);

export const pgClient = postgres(connectionString, {
  prepare: false, // CRITICAL: disables prepared statements for PgBouncer / transaction mode
  connect_timeout: isVitest ? 1 : 5, // Timeout in seconds (never hang indefinitely)
  idle_timeout: 10,
  max: 10,
  onnotice: () => {}, // Suppress notices
});

export const db = drizzle(pgClient, { schema });
export type Database = typeof db;

export let isDbOnline = true;
let isBootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

/**
 * Self-healing DDL & Seed Initializer
 * Guarantees that even if Docker starts with an unmigrated or wiped database volume,
 * all PostgreSQL tables, enums, indexes, and primary pilot accounts exist immediately.
 */
export async function ensureDatabaseBootstrap(): Promise<void> {
  if (isBootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const timeoutMs = isVitest ? 600 : 5000;
      await Promise.race([
        (async () => {
          // 1. Run Comprehensive Programmatic DDL Bootstrap (creates all tables, enums, indexes, and column migrations)
          await runDatabaseBootstrap(pgClient);

          // 2. Seed initial pilot records automatically if missing
          await pgClient.unsafe(`
        INSERT INTO users (id, username, phone_number, full_name, role, password_hash, can_create_exams, is_active)
        VALUES
          ('usr_admin', 'admin', '09120000001', 'مدیریت عالی مشاهیر دانش', 'CEO', 'Admin@123456', true, true),
          ('usr_adminsupervisor', 'supervisor', '09120000002', 'دکتر مریم رضایی (سرپرست آموزشی)', 'SUPERVISOR', 'Supervisor@123456', true, true),
          ('usr_mentor1', 'mentor', '09121000001', 'استاد علی کاظمی (پشتیبان علمی)', 'MENTOR', 'Mentor@123456', true, true),
          ('usr_student1', 'student', '09121000005', 'سارا احمدی (داوطلب کانون وکلا)', 'STUDENT', 'Student@123456', false, true)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          password_hash = EXCLUDED.password_hash,
          can_create_exams = EXCLUDED.can_create_exams;

        INSERT INTO student_profiles (
          id, user_id, mentor_id, employment_status, is_student, marital_status,
          has_children, children_count, has_family_care_duty, workday_study_hours_cap,
          holiday_study_hours_cap, best_study_time, primary_constraint,
          previous_bar_exam_attempts, current_daily_study_hours, self_baseline_assessment,
          masterclass_goal, risk_status, risk_reason, enrolled_course_code, enrolled_course_name, has_active_support
        ) VALUES (
          'profile_stu_1', 'usr_student1', 'usr_mentor1', 'UNEMPLOYED', false, 'SINGLE',
          false, 0, false, 8, 11, 'MORNING', 'تمرکز کامل روی آزمون کانون وکلای دادگستری',
          0, 7, 'پایه متوسط در حقوق مدنی و فقه', 'قبولی در کانون وکلای مرکز', 'GREEN', 'وضعیت پایدار آموزشی',
          'GARNET-BAR-360', 'دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)', true
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO voip_settings (
          id, host, port, username, secret, context, channel_tech, trunk, caller_id, is_active, mentor_extensions
        ) VALUES (
          'voip_ami_default', '127.0.0.1', 5038, 'admin', 'secret123', 'from-internal', 'SIP', 'SIP/Trunk-Mashahir', '02188888888', true, '{"usr_mentor1":"101"}'::jsonb
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO mentor_calling_windows (
          id, mentor_id, start_time, end_time, days_of_week, daily_duration_hours, is_active, announcement
        ) VALUES (
          'window_usr_mentor1', 'usr_mentor1', '17:00', '20:00', '[0, 1, 2, 3, 4]'::jsonb, 3, true,
          'پاسخگویی مستقیم تلفنی به سوالات داوطلبان و تنظیم برنامه‌های مطالعاتی'
        ) ON CONFLICT (mentor_id) DO NOTHING;

        INSERT INTO entitled_courses (
          id, course_code, course_name, description, price_formatted, garnet_purchase_url, has_support, support_tier, is_active
        ) VALUES
          ('crs_1', 'GARNET-BAR-360', 'دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)', 'شامل جلسات برنامه‌ریزی هفتگی، تماس مستقیم تلفنی، تریاژ و ارزیابی مستمر توسط پشتیبان اختصاصی', '۵,۸۰۰,۰۰۰ تومان', 'https://garnet.mashahir.com/course/law-bar-360', true, 'GOLD', true),
          ('crs_2', 'GARNET-VIP-COACH', 'بسته جامع هدایت تحصیلی و منتورینگ VIP آزمون وکالت', 'پشتیبانی اختصاصی فردبه‌فرد، اصلاح الگوی خواب، رفع انباشت و شبیه‌سازی آزمون‌های کانون', '۳,۵۰۰,۰۰۰ تومان', 'https://garnet.mashahir.com/course/vip-coach', true, 'VIP', true),
          ('crs_3', 'GARNET-BASIC-101', 'دوره ویدئویی مبانی حقوق مدنی و تجارت (آفلاین بدون بسته پشتیبانی)', 'دوره صرفاً شامل ویدئوهای آموزشی است و دسترسی به خدمات مشاوره و داشبورد پشتیبانی را شامل نمی‌شود.', '۱,۲۰۰,۰۰۰ تومان', 'https://garnet.mashahir.com/course/basic-101', false, 'NONE', true)
        ON CONFLICT (course_code) DO NOTHING;

        INSERT INTO student_whitelist (id, national_id, phone_number, full_name, assigned_mentor_id, status)
        VALUES
          ('wl_1', '0012345678', '09121000005', 'سارا احمدی (داوطلب کانون وکلا)', 'usr_mentor1', 'REGISTERED'),
          ('wl_2', '0023456789', '09121000006', 'رضا حسینی (داوطلب کانون وکلای مرکز)', 'usr_mentor1', 'PENDING'),
          ('wl_3', '0034567890', '09121000007', 'فاطمه محمدی (داوطلب مرکز وکلا)', 'usr_mentor1', 'PENDING'),
          ('wl_4', '0045678901', '09121000008', 'محمد احمدی (داوطلب کانون وکلای دادگستری)', 'usr_mentor1', 'PENDING')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO voip_calls (
          id, mentor_id, mentor_name, mentor_extension, student_profile_id, student_name, masked_phone, status, duration_seconds, call_unique_id, initiated_at, notes
        ) VALUES (
          'call_seed_1', 'usr_mentor1', 'استاد علی کاظمی (پشتیبان علمی)', '101', 'profile_stu_1', 'سارا احمدی (داوطلب کانون وکلا)', '۰۹۱۲***۰۰۰۵', 'COMPLETED', 720, 'ami_sample_1', NOW() - INTERVAL '1 day', '[موضوع: بررسی افت درصد حقوق تجارت و تنظیم پارت جبرانی]\nگفتگو با داوطلب پیرامون مدیریت زمان در تست‌های قانون تجارت و دادرسی مدنی. داوطلب متعهد شد در روزهای یکشنبه و سه‌شنبه، ۱ ساعت مطالعه مضاعف به همراه تست زمان‌دار اضافه کند. مقرر شد برنامه هفتگی به روزرسانی شود.'
        ) ON CONFLICT (id) DO NOTHING;
      `);
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("PostgreSQL connection timed out")), timeoutMs)
        ),
      ]);

      isBootstrapped = true;
      isDbOnline = true;
      console.log("✅ [Database] PostgreSQL schema and initial pilot records bootstrapped successfully.");
    } catch (err) {
      isBootstrapped = true;
      isDbOnline = false;
      if (!isVitest) {
        console.warn("⚠️ [Database] Self-healing bootstrap notice (PostgreSQL might be initializing or unreachable):", err);
      }
    }
  })();

  return bootstrapPromise;
}

// Automatically trigger bootstrap in background on module load
ensureDatabaseBootstrap().catch(() => {});
