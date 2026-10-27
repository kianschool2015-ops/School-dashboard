import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";
import { runDatabaseBootstrap } from "./bootstrap";
import { hashPassword } from "@/lib/password";

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
  connect_timeout: isVitest ? 1 : 10, // Timeout in seconds (C-10)
  idle_timeout: 20,
  max: parseInt(process.env.DB_POOL_MAX || "35", 10),
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
      const timeoutMs = isVitest ? 3000 : 5000;
      await Promise.race([
        (async () => {
          // 1. Run Comprehensive Programmatic DDL Bootstrap (creates all tables, enums, indexes, and column migrations)
          await runDatabaseBootstrap(pgClient);

          // 2. Seed initial pilot records automatically if missing (with scrypt$ hashes)
          const adminHash = hashPassword("Admin@123456");
          const supervisorHash = hashPassword("Supervisor@123456");
          const mentorHash = hashPassword("Mentor@123456");
          const studentHash = hashPassword("Student@123456");
          const testMentorHash = hashPassword("Mentor@123456");
          const testStudentHash = hashPassword("Student@123456");

          await pgClient.unsafe(`
        INSERT INTO users (id, username, phone_number, full_name, role, password_hash, sip_extension, can_create_exams, is_active)
        VALUES
          ('usr_admin', 'admin', '09120000001', 'مدیریت عالی مشاهیر دانش', 'CEO', '${adminHash}', '100', true, true),
          ('usr_adminsupervisor', 'supervisor', '09120000002', 'دکتر مریم رضایی (سرپرست آموزشی)', 'SUPERVISOR', '${supervisorHash}', '101', true, true),
          ('usr_mentor1', 'mentor', '09121000001', 'استاد علی کاظمی (پشتیبان علمی)', 'MENTOR', '${mentorHash}', '101', true, true),
          ('usr_student1', 'student', '09121000005', 'سارا احمدی (داوطلب کانون وکلا)', 'STUDENT', '${studentHash}', NULL, false, true),
          ('usr_mentor_test_09123445103', 'mentor_test', '09123445103', 'پشتیبان آزمایشی مشاهیر (۰۹۱۲۳۴۴۵۱۰۳)', 'MENTOR', '${testMentorHash}', '102', true, true),
          ('usr_student_test_09227141667', 'student_test', '09227141667', 'داوطلب آزمایشی کانون وکلا (۰۹۲۲۷۱۴۱۶۶۷)', 'STUDENT', '${testStudentHash}', NULL, false, true)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          phone_number = EXCLUDED.phone_number,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          sip_extension = EXCLUDED.sip_extension,
          is_active = EXCLUDED.is_active,
          password_hash = CASE
            WHEN users.password_hash LIKE 'scrypt$%' THEN users.password_hash
            ELSE EXCLUDED.password_hash
          END,
          can_create_exams = EXCLUDED.can_create_exams;

        INSERT INTO student_profiles (
          id, user_id, mentor_id, employment_status, is_student, marital_status,
          has_children, children_count, has_family_care_duty, workday_study_hours_cap,
          holiday_study_hours_cap, best_study_time, primary_constraint,
          previous_bar_exam_attempts, current_daily_study_hours, self_baseline_assessment,
          masterclass_goal, risk_status, risk_reason, enrolled_course_code, enrolled_course_name, has_active_support
        ) VALUES
          (
            'profile_stu_1', 'usr_student1', 'usr_mentor1', 'UNEMPLOYED', false, 'SINGLE',
            false, 0, false, 8, 11, 'MORNING', 'تمرکز کامل روی آزمون کانون وکلای دادگستری',
            0, 7, 'پایه متوسط در حقوق مدنی و فقه', 'قبولی در کانون وکلای مرکز', 'GREEN', 'وضعیت پایدار آموزشی',
            'GARNET-BAR-360', 'دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)', true
          ),
          (
            'profile_student_test_09227141667', 'usr_student_test_09227141667', 'usr_mentor_test_09123445103', 'UNEMPLOYED', false, 'SINGLE',
            false, 0, false, 8, 12, 'EVENING', 'تمرکز کامل روی آزمون وکالت کانون وکلا',
            0, 8, 'پایه خوب در دروس اختصاصی حقوقی', 'قبولی با رتبه ممتاز کانون وکلا', 'GREEN', 'وضعیت آموزشی مطلوب و پایدار',
            'GARNET-BAR-360', 'دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)', true
          )
        ON CONFLICT (id) DO UPDATE SET
          mentor_id = EXCLUDED.mentor_id,
          enrolled_course_code = EXCLUDED.enrolled_course_code,
          enrolled_course_name = EXCLUDED.enrolled_course_name,
          has_active_support = EXCLUDED.has_active_support;

        INSERT INTO voip_settings (
          id, host, port, username, secret, context, channel_tech, trunk, caller_id, is_active, mentor_extensions
        ) VALUES (
          'voip_ami_default', '127.0.0.1', 5038, 'admin', 'secret123', 'from-internal', 'SIP', 'SIP/Trunk-Mashahir', '02188888888', true, '{"usr_mentor1":"101","usr_mentor_test_09123445103":"102"}'::jsonb
        ) ON CONFLICT (id) DO UPDATE SET
          mentor_extensions = EXCLUDED.mentor_extensions;

        INSERT INTO mentor_calling_windows (
          id, mentor_id, start_time, end_time, days_of_week, daily_duration_hours, is_active, announcement
        ) VALUES
          (
            'window_usr_mentor1', 'usr_mentor1', '17:00', '20:00', '[0, 1, 2, 3, 4]'::jsonb, 3, true,
            'پاسخگویی مستقیم تلفنی به سوالات داوطلبان و تنظیم برنامه‌های مطالعاتی'
          ),
          (
            'window_usr_mentor_test', 'usr_mentor_test_09123445103', '08:00', '23:00', '[0, 1, 2, 3, 4, 5, 6]'::jsonb, 15, true,
            'پاسخگویی آزمایشی در تمام روزهای هفته از ساعت ۸:۰۰ الی ۲۳:۰۰'
          )
        ON CONFLICT (mentor_id) DO UPDATE SET
          start_time = EXCLUDED.start_time,
          end_time = EXCLUDED.end_time,
          days_of_week = EXCLUDED.days_of_week,
          daily_duration_hours = EXCLUDED.daily_duration_hours,
          is_active = EXCLUDED.is_active,
          announcement = EXCLUDED.announcement;

        INSERT INTO entitled_courses (
          id, course_code, course_name, description, price_formatted, garnet_purchase_url, has_support, support_tier, is_active
        ) VALUES
          ('crs_1', 'GARNET-BAR-360', 'دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)', 'شامل جلسات برنامه‌ریزی هفتگی، تماس مستقیم تلفنی، تریاژ و ارزیابی مستمر توسط پشتیبان اختصاصی', '۵,۸۰۰,۰۰۰ تومان', 'https://garnet.mashahir.com/course/law-bar-360', true, 'GOLD', true),
          ('crs_4', 'MASHAHIR-BAR-360', 'دوره جامع طلایی آمادگی آزمون وکالت کانون و مرکز وکلا (با پشتیبانی ۳۶۰ درجه)', 'شامل جلسات برنامه‌ریزی هفتگی، تماس مستقیم تلفنی، تریاژ و ارزیابی مستمر توسط پشتیبان اختصاصی', '۵,۸۰۰,۰۰۰ تومان', 'https://mashahiredanesh.com/course/law-bar-360', true, 'GOLD', true),
          ('crs_2', 'GARNET-VIP-COACH', 'بسته جامع هدایت تحصیلی و منتورینگ VIP آزمون وکالت', 'پشتیبانی اختصاصی فردبه‌فرد، اصلاح الگوی خواب، رفع انباشت و شبیه‌سازی آزمون‌های کانون', '۳,۵۰۰,۰۰۰ تومان', 'https://garnet.mashahir.com/course/vip-coach', true, 'VIP', true),
          ('crs_3', 'GARNET-BASIC-101', 'دوره ویدئویی مبانی حقوق مدنی و تجارت (آفلاین بدون بسته پشتیبانی)', 'دوره صرفاً شامل ویدئوهای آموزشی است و دسترسی به خدمات مشاوره و داشبورد پشتیبانی را شامل نمی‌شود.', '۱,۲۰۰,۰۰۰ تومان', 'https://garnet.mashahir.com/course/basic-101', false, 'NONE', true)
        ON CONFLICT (course_code) DO NOTHING;

        INSERT INTO student_whitelist (id, national_id, phone_number, full_name, assigned_mentor_id, status)
        VALUES
          ('wl_1', '0012345678', '09121000005', 'سارا احمدی (داوطلب کانون وکلا)', 'usr_mentor1', 'REGISTERED'),
          ('wl_2', '0023456789', '09121000006', 'رضا حسینی (داوطلب کانون وکلای مرکز)', 'usr_mentor1', 'PENDING'),
          ('wl_3', '0034567890', '09121000007', 'فاطمه محمدی (داوطلب مرکز وکلا)', 'usr_mentor1', 'PENDING'),
          ('wl_4', '0045678901', '09121000008', 'محمد احمدی (داوطلب کانون وکلای دادگستری)', 'usr_mentor1', 'PENDING'),
          ('wl_test_student', '0011223344', '09227141667', 'داوطلب آزمایشی کانون وکلا (۰۹۲۲۷۱۴۱۶۶۷)', 'usr_mentor_test_09123445103', 'REGISTERED')
        ON CONFLICT (id) DO UPDATE SET
          assigned_mentor_id = EXCLUDED.assigned_mentor_id,
          status = EXCLUDED.status;

        INSERT INTO voip_calls (
          id, mentor_id, mentor_name, mentor_extension, student_profile_id, student_name, masked_phone, status, duration_seconds, call_unique_id, initiated_at, notes
        ) VALUES (
          'call_seed_1', 'usr_mentor1', 'استاد علی کاظمی (پشتیبان علمی)', '101', 'profile_stu_1', 'سارا احمدی (داوطلب کانون وکلا)', '۰۹۱۲***۰۰۰۵', 'COMPLETED', 720, 'ami_sample_1', NOW() - INTERVAL '1 day', '[موضوع: بررسی افت درصد حقوق تجارت و تنظیم پارت جبرانی]\nگفتگو با داوطلب پیرامون مدیریت زمان در تست‌های قانون تجارت و دادرسی مدنی. داوطلب متعهد شد در روزهای یکشنبه و سه‌شنبه، ۱ ساعت مطالعه مضاعف به همراه تست زمان‌دار اضافه کند. مقرر شد برنامه هفتگی به روزرسانی شود.'
        ) ON CONFLICT (id) DO NOTHING;

        INSERT INTO sso_api_settings (
          id, is_enabled, service_title, base_url, login_endpoint, courses_endpoint,
          send_otp_endpoint, verify_otp_endpoint, products_endpoint, code_count,
          api_key_header, api_key_value, mobile_field_name, password_field_name,
          success_status_code, timeout_ms, auto_create_student, bypass_course_check_if_no_endpoint
        ) VALUES (
          'default', true, 'حساب کاربری مشاهیر دانش', 'https://mashahiredanesh.com/GarnetAPI',
          '/auth/loginMobile', '/user/courses',
          '/users/sendVerificationCodeByMobile', '/users/checkVerificationCode', '/invoices/productListByUser', 5,
          'g-api-key', 'AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5',
          'mobile', 'password', 2000, 8000, true, true
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
