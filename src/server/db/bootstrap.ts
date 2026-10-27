import postgres from "postgres";
import { hashPassword } from "@/lib/password";

/**
 * Mashahir Danesh Law School Platform - Comprehensive Programmatic DDL Bootstrap
 *
 * Standalone Next.js Docker containers run without devDependencies (like drizzle-kit and drizzle.config.ts).
 * This module guarantees 100% programmatic schema synchronization at server startup,
 * creating all 22+ tables, composite indexes, and self-healing column migrations idempotently.
 */

export async function runDatabaseBootstrap(client: postgres.Sql): Promise<void> {
  // 1. Create Enums Idempotently
  await client.unsafe(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('STUDENT', 'MENTOR', 'SUPERVISOR', 'CEO', 'ADMIN');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE employment_status AS ENUM ('FULL_TIME', 'PART_TIME', 'FREELANCE', 'UNEMPLOYED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE marital_status AS ENUM ('SINGLE', 'MARRIED', 'ENGAGED', 'IN_RELATIONSHIP', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE risk_status AS ENUM ('GREEN', 'YELLOW', 'RED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE assessment_type AS ENUM ('BASELINE', 'FINAL_BENCHMARK');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE activity_type AS ENUM ('CLASS', 'STUDY', 'REVIEW', 'STATUTE_READ', 'TEST_STUDY', 'TEST_PRACTICE', 'EXAM_ANALYSIS');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE item_status AS ENUM ('NOT_DONE', 'PARTIAL', 'DONE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE analysis_status AS ENUM ('DONE', 'PARTIAL', 'NOT_DONE');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  // 2. Create Core Tables Idempotently
  await client.unsafe(`
    -- 1. Users
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      username text UNIQUE,
      phone_number varchar(20) UNIQUE NOT NULL,
      full_name text NOT NULL,
      national_id varchar(20),
      sip_extension varchar(20),
      role user_role DEFAULT 'STUDENT' NOT NULL,
      password_hash text,
      must_change_password boolean DEFAULT false NOT NULL,
      garnet_user_id text,
      garnet_username text,
      can_create_exams boolean DEFAULT false NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 2. Student Profiles
    CREATE TABLE IF NOT EXISTS student_profiles (
      id text PRIMARY KEY,
      user_id text REFERENCES users(id) NOT NULL,
      mentor_id text REFERENCES users(id),
      employment_status employment_status DEFAULT 'UNEMPLOYED',
      is_student boolean DEFAULT false NOT NULL,
      marital_status marital_status DEFAULT 'SINGLE',
      has_children boolean DEFAULT false NOT NULL,
      children_count integer DEFAULT 0 NOT NULL,
      has_family_care_duty boolean DEFAULT false NOT NULL,
      family_care_detail text,
      workday_study_hours_cap integer DEFAULT 6 NOT NULL,
      holiday_study_hours_cap integer DEFAULT 10 NOT NULL,
      best_study_time text DEFAULT 'MORNING',
      primary_constraint text,
      previous_bar_exam_attempts integer DEFAULT 0 NOT NULL,
      current_daily_study_hours integer DEFAULT 4 NOT NULL,
      self_baseline_assessment text,
      masterclass_goal text,
      risk_status risk_status DEFAULT 'GREEN' NOT NULL,
      risk_reason text,
      last_contact_at timestamp,
      enrolled_course_code text,
      enrolled_course_name text,
      has_active_support boolean DEFAULT true NOT NULL,
      external_user_id text,
      initial_sync_completed boolean DEFAULT false NOT NULL,
      initial_sync_at timestamp,
      provisioning_source varchar(30) DEFAULT 'LOCAL' NOT NULL,
      accepted_legal_terms_at timestamp,
      accepted_legal_terms_ip varchar(64),
      is_probationary boolean DEFAULT true NOT NULL,
      last_entitlement_check_at timestamp,
      suspension_reason text,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 3. Study Preference Profiles
    CREATE TABLE IF NOT EXISTS study_preference_profiles (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      auditory_score integer DEFAULT 0 NOT NULL,
      textual_score integer DEFAULT 0 NOT NULL,
      structural_score integer DEFAULT 0 NOT NULL,
      practical_score integer DEFAULT 0 NOT NULL,
      dominant_preference text NOT NULL,
      actionable_recommendations text NOT NULL
    );

    -- 4. Benchmark Assessments
    CREATE TABLE IF NOT EXISTS benchmark_assessments (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      assessment_type assessment_type NOT NULL,
      overall_score_percent integer NOT NULL,
      subject_scores jsonb NOT NULL,
      academic_notes text,
      taken_at timestamp DEFAULT now() NOT NULL
    );

    -- 5. Student Schedules
    CREATE TABLE IF NOT EXISTS student_schedules (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      jalali_year integer NOT NULL,
      jalali_week_number integer NOT NULL,
      week_start_date text NOT NULL,
      week_end_date text NOT NULL,
      weekly_main_goal text,
      top_priorities jsonb,
      is_template_override boolean DEFAULT false NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 6. Schedule Items
    CREATE TABLE IF NOT EXISTS schedule_items (
      id text PRIMARY KEY,
      schedule_id text REFERENCES student_schedules(id) NOT NULL,
      day_of_week integer NOT NULL,
      subject text NOT NULL,
      activity_type activity_type DEFAULT 'STUDY' NOT NULL,
      topic_description text NOT NULL,
      target_volume text NOT NULL,
      target_duration_minutes integer NOT NULL,
      is_catchup boolean DEFAULT false NOT NULL,
      status item_status DEFAULT 'NOT_DONE' NOT NULL
    );

    -- 7. Daily Check-ins
    CREATE TABLE IF NOT EXISTS daily_checkins (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) ON DELETE CASCADE NOT NULL,
      checkin_date text NOT NULL,
      planned_hours integer DEFAULT 6 NOT NULL,
      actual_hours integer DEFAULT 0 NOT NULL,
      calculated_execution_percent integer NOT NULL,
      root_failure_cause text,
      help_requested boolean DEFAULT false NOT NULL,
      student_notes text,
      logged_at timestamp DEFAULT now() NOT NULL
    );

    -- 8. Weekly Reviews
    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      schedule_id text REFERENCES student_schedules(id) NOT NULL,
      program_execution_percent integer NOT NULL,
      consistency_percent integer NOT NULL,
      backlog_minutes_accumulated integer DEFAULT 0 NOT NULL,
      backlog_minutes_recovered integer DEFAULT 0 NOT NULL,
      coaching_adherence_percent integer NOT NULL,
      primary_obstacle text,
      assistance_needed_domain text,
      self_satisfaction_score integer NOT NULL,
      student_feedback_note text,
      submitted_at timestamp DEFAULT now() NOT NULL
    );

    -- 9. Mock Exams
    CREATE TABLE IF NOT EXISTS mock_exams (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      exam_title text NOT NULL,
      exam_date text NOT NULL,
      has_participated boolean DEFAULT true NOT NULL,
      is_excused_absence boolean DEFAULT false NOT NULL,
      overall_score_percent integer DEFAULT 0 NOT NULL,
      overall_rank integer,
      correct_count integer DEFAULT 0 NOT NULL,
      wrong_count integer DEFAULT 0 NOT NULL,
      unanswered_count integer DEFAULT 0 NOT NULL,
      subject_scores jsonb NOT NULL,
      analysis_status analysis_status DEFAULT 'NOT_DONE' NOT NULL,
      primary_error_cause text,
      priority_review_subject text,
      delta_previous_exam integer DEFAULT 0 NOT NULL,
      delta_baseline integer DEFAULT 0 NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 10. Coaching Missions
    CREATE TABLE IF NOT EXISTS coaching_missions (
      id text PRIMARY KEY,
      title text NOT NULL,
      category text NOT NULL,
      assigned_jalali_week integer NOT NULL,
      assigned_jalali_year integer NOT NULL
    );

    -- 11. Student Mission Logs
    CREATE TABLE IF NOT EXISTS student_mission_logs (
      id text PRIMARY KEY,
      mission_id text REFERENCES coaching_missions(id) NOT NULL,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      adherence_status item_status DEFAULT 'NOT_DONE' NOT NULL,
      obstacle_encountered text,
      notes text,
      logged_at timestamp DEFAULT now() NOT NULL
    );

    -- 12. Mentor Triage Cases
    CREATE TABLE IF NOT EXISTS mentor_triage_cases (
      id text PRIMARY KEY,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      mentor_id text REFERENCES users(id) NOT NULL,
      trigger_code varchar(10) NOT NULL,
      priority_tier integer NOT NULL,
      description text NOT NULL,
      is_resolved boolean DEFAULT false NOT NULL,
      resolved_at timestamp,
      sla_due_at timestamp NOT NULL,
      intervention_notes text,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 13. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id text PRIMARY KEY,
      actor_id text REFERENCES users(id) NOT NULL,
      action text NOT NULL,
      target_entity text NOT NULL,
      target_id text NOT NULL,
      metadata jsonb,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 14. Student Whitelist
    CREATE TABLE IF NOT EXISTS student_whitelist (
      id text PRIMARY KEY,
      national_id varchar(20) NOT NULL,
      phone_number varchar(20) NOT NULL,
      full_name text NOT NULL,
      enrolled_course_name text,
      enrolled_course_code varchar(100),
      assigned_mentor_id text REFERENCES users(id),
      assigned_mentor_name text,
      status varchar(20) DEFAULT 'PENDING' NOT NULL,
      invited_at timestamp,
      registered_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 15. SMS Settings
    CREATE TABLE IF NOT EXISTS sms_settings (
      id text PRIMARY KEY,
      provider varchar(30) DEFAULT 'KAVENEGAR' NOT NULL,
      api_key text NOT NULL,
      sender_number varchar(30) NOT NULL,
      sender_line varchar(30) NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      triggers jsonb NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 16. SMS Logs
    CREATE TABLE IF NOT EXISTS sms_logs (
      id text PRIMARY KEY,
      event varchar(50) NOT NULL,
      recipient_phone varchar(20) NOT NULL,
      recipient_name text NOT NULL,
      message_text text NOT NULL,
      status varchar(20) DEFAULT 'SENT' NOT NULL,
      delivery_time timestamp DEFAULT now() NOT NULL,
      provider_response text
    );

    -- 17. Hierarchy Tasks
    CREATE TABLE IF NOT EXISTS hierarchy_tasks (
      id text PRIMARY KEY,
      sender_id text REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      sender_role varchar(20) NOT NULL,
      sender_name text NOT NULL,
      receiver_id text REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      receiver_role varchar(20) NOT NULL,
      receiver_name text NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      priority varchar(20) NOT NULL,
      status varchar(30) DEFAULT 'PENDING' NOT NULL,
      due_date varchar(30) NOT NULL,
      resolution_notes text,
      seen_at timestamp,
      reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
      reviewed_by_name text,
      review_notes text,
      reviewed_at timestamp,
      completed_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 18. Direct Messages
    CREATE TABLE IF NOT EXISTS direct_messages (
      id text PRIMARY KEY,
      thread_id varchar(100) NOT NULL,
      sender_id text REFERENCES users(id) NOT NULL,
      sender_name text NOT NULL,
      sender_role varchar(20) NOT NULL,
      receiver_id text REFERENCES users(id) NOT NULL,
      receiver_name text NOT NULL,
      receiver_role varchar(20) NOT NULL,
      message text NOT NULL,
      attachment_url text,
      attachment_name text,
      attachment_size integer,
      attachment_type text,
      is_read boolean DEFAULT false NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 19. Escalation Tickets
    CREATE TABLE IF NOT EXISTS escalation_tickets (
      id text PRIMARY KEY,
      student_id text REFERENCES users(id) NOT NULL,
      student_name text NOT NULL,
      student_phone varchar(20) NOT NULL,
      mentor_id text REFERENCES users(id) NOT NULL,
      mentor_name text NOT NULL,
      supervisor_id text REFERENCES users(id) NOT NULL,
      subject text NOT NULL,
      reason_category varchar(50) NOT NULL,
      description text NOT NULL,
      attachment_url text,
      attachment_name text,
      status varchar(20) DEFAULT 'OPEN' NOT NULL,
      supervisor_response text,
      resolved_at timestamp,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 20. Weekly Plan Templates
    CREATE TABLE IF NOT EXISTS weekly_plan_templates (
      id text PRIMARY KEY,
      author_id text REFERENCES users(id) NOT NULL,
      author_name text NOT NULL,
      title text NOT NULL,
      jalali_year integer NOT NULL,
      jalali_week_number integer NOT NULL,
      target_cohort text NOT NULL,
      weekly_main_goal text NOT NULL,
      items jsonb NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 21. Evaluation Exams (Legacy Format)
    CREATE TABLE IF NOT EXISTS evaluation_exams (
      id text PRIMARY KEY,
      creator_id text REFERENCES users(id) NOT NULL,
      creator_role varchar(20) NOT NULL,
      creator_name text NOT NULL,
      title text NOT NULL,
      description text NOT NULL,
      start_time varchar(30) NOT NULL,
      end_time varchar(30) NOT NULL,
      duration_minutes integer NOT NULL,
      total_questions integer DEFAULT 0 NOT NULL,
      subjects_weight jsonb NOT NULL,
      is_published boolean DEFAULT true NOT NULL,
      target_cohort text NOT NULL,
      assigned_student_ids jsonb NOT NULL,
      questions jsonb DEFAULT '[]' NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 22. Production Exams Engine (New Specification)
    CREATE TABLE IF NOT EXISTS exams (
      id text PRIMARY KEY,
      title text NOT NULL,
      course_code text,
      category varchar(50) NOT NULL,
      exam_type varchar(30) DEFAULT 'MOCK_BAR' NOT NULL,
      passing_score integer DEFAULT 50 NOT NULL,
      duration_minutes integer DEFAULT 120 NOT NULL,
      total_questions integer DEFAULT 0 NOT NULL,
      has_negative_marking boolean DEFAULT true NOT NULL,
      is_published boolean DEFAULT false NOT NULL,
      target_audience varchar(30) DEFAULT 'ALL' NOT NULL,
      target_type varchar(30) DEFAULT 'ALL' NOT NULL,
      target_course_codes jsonb DEFAULT '[]'::jsonb NOT NULL,
      target_courses jsonb DEFAULT '[]'::jsonb NOT NULL,
      target_student_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
      target_mentor_id text REFERENCES users(id),
      start_date timestamp,
      expiry_date timestamp,
      created_by_id text REFERENCES users(id) NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 23. Exam Questions
    CREATE TABLE IF NOT EXISTS exam_questions (
      id text PRIMARY KEY,
      exam_id text REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
      question_number integer NOT NULL,
      subject varchar(100) NOT NULL,
      question_text text NOT NULL,
      options jsonb NOT NULL,
      correct_option integer NOT NULL,
      explanation text,
      coefficient integer DEFAULT 1 NOT NULL
    );

    -- 24. Exam Submissions (Production Grade - Resilient High-Concurrency Storage)
    CREATE TABLE IF NOT EXISTS exam_submissions (
      id text PRIMARY KEY,
      exam_id text NOT NULL,
      student_id text NOT NULL,
      student_name text DEFAULT 'داوطلب مشاهیر دانش',
      mentor_id text,
      reviewed_by_id text,
      started_at timestamp DEFAULT now() NOT NULL,
      submitted_at timestamp,
      answers jsonb DEFAULT '{}'::jsonb NOT NULL,
      flagged_questions jsonb DEFAULT '[]'::jsonb NOT NULL,
      eliminated_options jsonb DEFAULT '{}'::jsonb NOT NULL,
      tab_switch_count integer DEFAULT 0 NOT NULL,
      correct_count integer DEFAULT 0 NOT NULL,
      incorrect_count integer DEFAULT 0 NOT NULL,
      wrong_count integer DEFAULT 0 NOT NULL,
      unanswered_count integer DEFAULT 0 NOT NULL,
      blank_count integer DEFAULT 0 NOT NULL,
      total_percentage numeric(5, 2) DEFAULT 0.00 NOT NULL,
      raw_score numeric(5, 2) DEFAULT 0.00 NOT NULL,
      net_score numeric(5, 2) DEFAULT 0.00 NOT NULL,
      subject_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
      status varchar(40) DEFAULT 'AUTO_GRADED_PENDING_MENTOR' NOT NULL,
      mentor_notes text,
      mentor_feedback text,
      reviewed_at timestamp,
      published_at timestamp,
      student_profile_id text,
      exam_title text,
      score_percent integer,
      subject_scores jsonb DEFAULT '{}'::jsonb,
      rank integer,
      delta_from_previous integer DEFAULT 0,
      delta_from_baseline integer DEFAULT 0
    );

    -- 25. VoIP AMI Settings
    CREATE TABLE IF NOT EXISTS voip_settings (
      id text PRIMARY KEY,
      host varchar(100) NOT NULL,
      port integer NOT NULL,
      username text NOT NULL,
      secret text NOT NULL,
      context varchar(50) NOT NULL,
      channel_tech varchar(20) NOT NULL,
      trunk text NOT NULL,
      caller_id varchar(30) NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      mentor_extensions jsonb NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 26. VoIP Calls
    CREATE TABLE IF NOT EXISTS voip_calls (
      id text PRIMARY KEY,
      mentor_id text REFERENCES users(id) NOT NULL,
      mentor_name text NOT NULL,
      mentor_extension varchar(20) NOT NULL,
      student_profile_id text REFERENCES student_profiles(id) NOT NULL,
      student_name text NOT NULL,
      masked_phone varchar(30) NOT NULL,
      status varchar(20) NOT NULL,
      duration_seconds integer DEFAULT 0 NOT NULL,
      call_unique_id text,
      initiated_at timestamp DEFAULT now() NOT NULL,
      notes text
    );

    -- 27. Chat Conversations
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id text PRIMARY KEY,
      type varchar(20) NOT NULL,
      title text NOT NULL,
      description text,
      creator_id text REFERENCES users(id) NOT NULL,
      creator_role varchar(20) NOT NULL,
      creator_name text NOT NULL,
      member_ids jsonb NOT NULL,
      is_channel_read_only_for_students boolean DEFAULT false NOT NULL,
      is_ghost_mode boolean DEFAULT false NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 28. Chat Messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id text PRIMARY KEY,
      conversation_id text REFERENCES chat_conversations(id) NOT NULL,
      sender_id text REFERENCES users(id) NOT NULL,
      sender_name text NOT NULL,
      sender_role varchar(20) NOT NULL,
      message text NOT NULL,
      attachment_url text,
      attachment_name text,
      attachment_size integer,
      attachment_type text,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 29. Video Settings
    CREATE TABLE IF NOT EXISTS video_settings (
      id text PRIMARY KEY,
      platform_name text NOT NULL,
      server_url text NOT NULL,
      api_key text NOT NULL,
      is_enabled boolean DEFAULT true NOT NULL
    );

    -- 30. Video Sessions
    CREATE TABLE IF NOT EXISTS video_sessions (
      id text PRIMARY KEY,
      title text NOT NULL,
      host_id text REFERENCES users(id) NOT NULL,
      host_name text NOT NULL,
      host_role varchar(20) NOT NULL,
      room_code varchar(50) NOT NULL,
      session_type varchar(50) NOT NULL,
      target_cohort text NOT NULL,
      allowed_roles jsonb NOT NULL,
      participant_ids jsonb NOT NULL,
      scheduled_start varchar(30) NOT NULL,
      duration_minutes integer DEFAULT 60 NOT NULL,
      status varchar(20) DEFAULT 'SCHEDULED' NOT NULL,
      join_url text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- 31. Landing Content
    CREATE TABLE IF NOT EXISTS landing_content (
      id text PRIMARY KEY,
      content jsonb NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 32. Mentor Calling Windows
    CREATE TABLE IF NOT EXISTS mentor_calling_windows (
      id text PRIMARY KEY,
      mentor_id text REFERENCES users(id) NOT NULL UNIQUE,
      start_time varchar(10) DEFAULT '17:00' NOT NULL,
      end_time varchar(10) DEFAULT '20:00' NOT NULL,
      days_of_week jsonb DEFAULT '[0, 1, 2, 3, 4]'::jsonb NOT NULL,
      daily_duration_hours integer DEFAULT 3 NOT NULL,
      is_active boolean DEFAULT true NOT NULL,
      announcement text,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 33. Entitled Courses
    CREATE TABLE IF NOT EXISTS entitled_courses (
      id text PRIMARY KEY,
      course_code varchar(100) UNIQUE NOT NULL,
      course_name text NOT NULL,
      description text,
      price_formatted varchar(50) DEFAULT '۵,۸۰۰,۰۰۰ تومان',
      garnet_purchase_url text NOT NULL,
      has_support boolean DEFAULT true NOT NULL,
      support_tier varchar(50) DEFAULT 'GOLD' NOT NULL,
      study_plan_start_date varchar(50),
      study_plan_end_date varchar(50),
      is_active boolean DEFAULT true NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 34. Friday Reports
    CREATE TABLE IF NOT EXISTS friday_reports (
      id text PRIMARY KEY,
      student_id text REFERENCES users(id) NOT NULL,
      student_profile_id text REFERENCES student_profiles(id),
      cohort_id text,
      week_number integer NOT NULL,
      study_hours_civil integer DEFAULT 0 NOT NULL,
      study_hours_criminal integer DEFAULT 0 NOT NULL,
      study_hours_trade integer DEFAULT 0 NOT NULL,
      study_hours_procedure integer DEFAULT 0 NOT NULL,
      total_hours integer DEFAULT 0 NOT NULL,
      tests_count integer DEFAULT 0 NOT NULL,
      weak_points text,
      strengths text,
      student_notes text,
      status varchar(30) DEFAULT 'SUBMITTED' NOT NULL,
      mentor_feedback text,
      mentor_reviewed_at timestamp,
      supervisor_approval boolean DEFAULT false NOT NULL,
      supervisor_notes text,
      supervisor_approved_at timestamp,
      submitted_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS direct_chat_threads (
      id text PRIMARY KEY,
      is_closed boolean DEFAULT false NOT NULL,
      closed_by_id text REFERENCES users(id),
      closed_at timestamp,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 35. SSO API Settings (Mashahir Danesh Central Account)
    CREATE TABLE IF NOT EXISTS sso_api_settings (
      id text PRIMARY KEY DEFAULT 'default',
      is_enabled boolean DEFAULT true NOT NULL,
      service_title text DEFAULT 'حساب کاربری مشاهیر دانش' NOT NULL,
      base_url text DEFAULT 'https://mashahiredanesh.com/GarnetAPI' NOT NULL,
      login_endpoint text DEFAULT '/auth/loginMobile' NOT NULL,
      courses_endpoint text DEFAULT '/user/courses' NOT NULL,
      send_otp_endpoint text DEFAULT '/users/sendVerificationCodeByMobile' NOT NULL,
      verify_otp_endpoint text DEFAULT '/users/checkVerificationCode' NOT NULL,
      products_endpoint text DEFAULT '/invoices/productListByUser' NOT NULL,
      code_count integer DEFAULT 5 NOT NULL,
      api_key_header varchar(100) DEFAULT 'g-api-key' NOT NULL,
      api_key_value text DEFAULT 'AEbk35zB9YfSqw8u9mjH7ykNK4xq2Yq5' NOT NULL,
      mobile_field_name varchar(50) DEFAULT 'mobile' NOT NULL,
      password_field_name varchar(50) DEFAULT 'password' NOT NULL,
      success_status_code integer DEFAULT 2000 NOT NULL,
      timeout_ms integer DEFAULT 8000 NOT NULL,
      auto_create_student boolean DEFAULT true NOT NULL,
      bypass_course_check_if_no_endpoint boolean DEFAULT true NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );

    -- 36. System Audit Logs (Comprehensive audit trail for admin/executive oversight)
    CREATE TABLE IF NOT EXISTS system_audit_logs (
      id text PRIMARY KEY,
      actor_id text NOT NULL,
      actor_name text NOT NULL,
      actor_role varchar(30) NOT NULL,
      event_type varchar(50) NOT NULL,
      action text NOT NULL,
      target_entity varchar(50) NOT NULL,
      target_id text,
      details text,
      metadata jsonb DEFAULT '{}'::jsonb,
      ip_address varchar(45),
      user_agent text,
      created_at timestamp DEFAULT now() NOT NULL
    );

    -- Ensure SSO API Settings columns exist before inserting
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS send_otp_endpoint text DEFAULT '/users/sendVerificationCodeByMobile' NOT NULL;
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS verify_otp_endpoint text DEFAULT '/users/checkVerificationCode' NOT NULL;
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS products_endpoint text DEFAULT '/invoices/productListByUser' NOT NULL;
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS code_count integer DEFAULT 5 NOT NULL;

    -- Pre-seed default SSO API Settings
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

    -- Clean up legacy shadow tables (M-08)
    DROP TABLE IF EXISTS tasks, mentor_call_notes, triage_cases, friday_assessment_reports, internal_tickets CASCADE;
  `);

  // 3. Self-healing Column Migrations
  await client.unsafe(`
    -- Users column migrations
    ALTER TABLE users ADD COLUMN IF NOT EXISTS can_create_exams boolean DEFAULT false NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS garnet_user_id text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS garnet_username text;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id text;

    -- Student profiles column migrations
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS enrolled_course_code text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS enrolled_course_name text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS has_active_support boolean DEFAULT true NOT NULL;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS external_user_id text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS initial_sync_completed boolean DEFAULT false NOT NULL;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS initial_sync_at timestamp;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS provisioning_source varchar(30) DEFAULT 'LOCAL' NOT NULL;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS accepted_legal_terms_at timestamp;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS accepted_legal_terms_ip varchar(64);
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_probationary boolean DEFAULT true NOT NULL;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS last_entitlement_check_at timestamp;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS last_central_check_result text;
    ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS suspension_reason text;
    DO $$ BEGIN
      ALTER TABLE student_profiles ALTER COLUMN mentor_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END $$;

    -- SSO API Settings column migrations
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS send_otp_endpoint text DEFAULT '/users/sendVerificationCodeByMobile' NOT NULL;
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS verify_otp_endpoint text DEFAULT '/users/checkVerificationCode' NOT NULL;
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS products_endpoint text DEFAULT '/invoices/productListByUser' NOT NULL;
    ALTER TABLE sso_api_settings ADD COLUMN IF NOT EXISTS code_count integer DEFAULT 5 NOT NULL;

    -- Student whitelist column migrations
    ALTER TABLE student_whitelist ADD COLUMN IF NOT EXISTS enrolled_course_name text;
    ALTER TABLE student_whitelist ADD COLUMN IF NOT EXISTS enrolled_course_code varchar(100);
    ALTER TABLE student_whitelist ADD COLUMN IF NOT EXISTS assigned_mentor_name text;

    -- Chat conversations column migrations
    ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS is_ghost_mode boolean DEFAULT false NOT NULL;

    -- Hierarchy tasks column migrations
    ALTER TABLE hierarchy_tasks ALTER COLUMN status TYPE varchar(30);
    ALTER TABLE hierarchy_tasks ADD COLUMN IF NOT EXISTS reviewed_by text REFERENCES users(id);
    ALTER TABLE hierarchy_tasks ADD COLUMN IF NOT EXISTS reviewed_by_name text;
    ALTER TABLE hierarchy_tasks ADD COLUMN IF NOT EXISTS review_notes text;
    ALTER TABLE hierarchy_tasks ADD COLUMN IF NOT EXISTS seen_at timestamp;
    ALTER TABLE hierarchy_tasks ADD COLUMN IF NOT EXISTS reviewed_at timestamp;
    ALTER TABLE hierarchy_tasks ADD COLUMN IF NOT EXISTS completed_at timestamp;

    -- Daily check-ins column migrations
    ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS planned_hours integer DEFAULT 6;
    ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS actual_hours integer DEFAULT 0;

    -- Exams target audience & CBT migrations
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_audience VARCHAR(30) DEFAULT 'ALL' NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_type VARCHAR(30) DEFAULT 'ALL' NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type VARCHAR(30) DEFAULT 'MOCK_BAR' NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 50 NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_course_codes JSONB DEFAULT '[]' NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_courses JSONB DEFAULT '[]' NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_student_ids JSONB DEFAULT '[]' NOT NULL;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS target_mentor_id TEXT;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date timestamp;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS expiry_date timestamp;

    -- Exam submissions self-healing migrations (to align legacy submissions table with production specs)
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS student_id text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS student_name text DEFAULT 'داوطلب مشاهیر دانش';
    DO $$ BEGIN
      ALTER TABLE exam_submissions ALTER COLUMN student_name DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
    ALTER TABLE exam_submissions ALTER COLUMN student_name SET DEFAULT 'داوطلب مشاهیر دانش';
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS mentor_id text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS reviewed_by_id text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS started_at timestamp DEFAULT now();
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS flagged_questions jsonb DEFAULT '[]'::jsonb NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS eliminated_options jsonb DEFAULT '{}'::jsonb NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS tab_switch_count integer DEFAULT 0 NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS incorrect_count integer DEFAULT 0;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS wrong_count integer DEFAULT 0 NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS blank_count integer DEFAULT 0 NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS total_percentage numeric(5, 2) DEFAULT 0.00;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS raw_score numeric(5, 2) DEFAULT 0.00 NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS net_score numeric(5, 2) DEFAULT 0.00 NOT NULL;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS subject_breakdown jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS status varchar(40) DEFAULT 'AUTO_GRADED_PENDING_MENTOR';
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS mentor_notes text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS mentor_feedback text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS reviewed_at timestamp;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS published_at timestamp;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS student_profile_id text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS exam_title text;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS score_percent integer;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS subject_scores jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE exam_submissions ALTER COLUMN subject_scores SET DEFAULT '{}'::jsonb;
    DO $$ BEGIN
      ALTER TABLE exam_submissions ALTER COLUMN subject_scores DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END $$;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS rank integer;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS delta_from_previous integer DEFAULT 0;
    ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS delta_from_baseline integer DEFAULT 0;

    -- Drop legacy foreign key constraints from exam_submissions to prevent concurrent insert deadlocks and missing-exam fkey crashes (Requirement 2)
    ALTER TABLE exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_exam_id_fkey;
    ALTER TABLE exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_student_id_fkey;
    ALTER TABLE exam_submissions DROP CONSTRAINT IF EXISTS exam_submissions_mentor_id_fkey;

    ALTER TABLE friday_reports ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'SUBMITTED';
    ALTER TABLE video_settings ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true NOT NULL;

    -- Entitled courses timeline migrations (Module 1)
    ALTER TABLE entitled_courses ADD COLUMN IF NOT EXISTS study_plan_start_date VARCHAR(50);
    ALTER TABLE entitled_courses ADD COLUMN IF NOT EXISTS study_plan_end_date VARCHAR(50);

    -- Student schedules timeline migrations (Module 1)
    ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS week_start_date TEXT;
    ALTER TABLE student_schedules ADD COLUMN IF NOT EXISTS week_end_date TEXT;

    -- Schedule items per-item tracking migrations (Module 3)
    ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER DEFAULT 0;
    ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS student_note TEXT;
    ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

    -- Users supervisor hierarchy migration (Module 8)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id TEXT;
  `);

  // 4. Create Indexes Idempotently
  await client.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS student_week_idx ON student_schedules (student_profile_id, jalali_year, jalali_week_number);
    CREATE INDEX IF NOT EXISTS jalali_week_idx ON student_schedules (jalali_year, jalali_week_number);
    CREATE UNIQUE INDEX IF NOT EXISTS student_checkin_date_idx ON daily_checkins (student_profile_id, checkin_date);
    CREATE UNIQUE INDEX IF NOT EXISTS student_mission_idx ON student_mission_logs (mission_id, student_profile_id);
    CREATE UNIQUE INDEX IF NOT EXISTS student_profiles_user_id_idx ON student_profiles (user_id);
    CREATE INDEX IF NOT EXISTS student_profiles_mentor_id_idx ON student_profiles (mentor_id);
    CREATE INDEX IF NOT EXISTS student_profiles_course_code_idx ON student_profiles (enrolled_course_code);
    CREATE INDEX IF NOT EXISTS schedule_items_schedule_id_idx ON schedule_items (schedule_id);
    CREATE INDEX IF NOT EXISTS mentor_triage_idx ON mentor_triage_cases (mentor_id, is_resolved, priority_tier);
    CREATE INDEX IF NOT EXISTS whitelist_phone_idx ON student_whitelist (phone_number);
    CREATE INDEX IF NOT EXISTS whitelist_national_id_idx ON student_whitelist (national_id);
    CREATE INDEX IF NOT EXISTS sms_logs_phone_idx ON sms_logs (recipient_phone);
    CREATE INDEX IF NOT EXISTS task_receiver_idx ON hierarchy_tasks (receiver_id, status);
    CREATE INDEX IF NOT EXISTS task_sender_idx ON hierarchy_tasks (sender_id);
    CREATE INDEX IF NOT EXISTS direct_thread_idx ON direct_messages (thread_id, created_at);
    CREATE INDEX IF NOT EXISTS direct_sender_idx ON direct_messages (sender_id);
    CREATE INDEX IF NOT EXISTS direct_receiver_idx ON direct_messages (receiver_id);
    CREATE INDEX IF NOT EXISTS ticket_student_idx ON escalation_tickets (student_id);
    CREATE INDEX IF NOT EXISTS ticket_supervisor_idx ON escalation_tickets (supervisor_id);
    CREATE INDEX IF NOT EXISTS exam_creator_idx ON evaluation_exams (creator_id);

    -- Production Exams & Submissions Indexes
    CREATE INDEX IF NOT EXISTS exams_created_by_idx ON exams (created_by_id);
    CREATE INDEX IF NOT EXISTS exams_category_idx ON exams (category);
    CREATE INDEX IF NOT EXISTS exams_published_idx ON exams (is_published);
    CREATE INDEX IF NOT EXISTS exams_target_audience_idx ON exams (target_audience);
    CREATE INDEX IF NOT EXISTS exams_course_code_idx ON exams (course_code);
    CREATE INDEX IF NOT EXISTS exam_questions_exam_id_idx ON exam_questions (exam_id);
    CREATE INDEX IF NOT EXISTS exam_questions_num_idx ON exam_questions (exam_id, question_number);
    CREATE INDEX IF NOT EXISTS exam_sub_exam_student_idx ON exam_submissions (exam_id, student_id);
    CREATE INDEX IF NOT EXISTS exam_sub_student_idx ON exam_submissions (student_id);
    CREATE INDEX IF NOT EXISTS exam_sub_mentor_idx ON exam_submissions (mentor_id);
    CREATE INDEX IF NOT EXISTS exam_sub_status_idx ON exam_submissions (status);
    CREATE INDEX IF NOT EXISTS exam_submissions_status_submitted_idx ON exam_submissions (status, submitted_at);

    -- VoIP & Communication Indexes
    CREATE INDEX IF NOT EXISTS voip_call_mentor_idx ON voip_calls (mentor_id);
    CREATE INDEX IF NOT EXISTS voip_call_student_idx ON voip_calls (student_profile_id);
    CREATE INDEX IF NOT EXISTS chat_msg_conv_idx ON chat_messages (conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS friday_report_student_idx ON friday_reports (student_id, week_number);
    CREATE INDEX IF NOT EXISTS friday_report_week_idx ON friday_reports (week_number);

    -- System Audit Logs Indexes
    CREATE INDEX IF NOT EXISTS sys_audit_actor_idx ON system_audit_logs (actor_id);
    CREATE INDEX IF NOT EXISTS sys_audit_event_idx ON system_audit_logs (event_type);
    CREATE INDEX IF NOT EXISTS sys_audit_created_idx ON system_audit_logs (created_at);
  `);

  // 5. One-time Plaintext Password Migration to scrypt$ (C-02, C-03)
  try {
    const legacyUsers = await client`
      SELECT id, password_hash FROM users
      WHERE password_hash IS NOT NULL
        AND password_hash != ''
        AND password_hash NOT LIKE 'scrypt$%'
        AND password_hash NOT LIKE '$2%'
    `;
    for (const u of legacyUsers) {
      if (u.password_hash) {
        const hashed = hashPassword(u.password_hash);
        await client`UPDATE users SET password_hash = ${hashed} WHERE id = ${u.id}`;
      }
    }
  } catch (migErr) {
    console.warn("[Database] One-time password migration notice:", migErr);
  }

  console.log("✅ [Database] All tables (including exams, questions, submissions, and calling windows) verified/created successfully.");
}
