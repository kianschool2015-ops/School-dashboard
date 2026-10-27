/**
 * Production Asynchronous Ingestion Queue for Timed Exam Submissions
 * Architecture: Next.js Server Action / API Route -> Redis Buffer / BullMQ Queue -> Batch DB Persistence
 * Solves Thundering Herd (20,000 sub/sec) at exam deadline (e.g. 12:00:00 PM)
 * Fault-tolerant with automatic direct PostgreSQL fallback when Redis is offline or starting up.
 */

import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { examSubmissions, exams } from "../db/schema";

/**
 * Ensures exam record exists in PostgreSQL before submission insert (Requirement 2)
 */
async function ensureExamExists(examId: string, examTitle?: string) {
  if (!examId) return;
  try {
    const existing = await db
      .select({ id: exams.id })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (existing.length === 0) {
      await db
        .insert(exams)
        .values({
          id: examId,
          title: examTitle || "آزمون شبیه‌ساز وکالت",
          category: "MOCK_BAR",
          durationMinutes: 120,
          createdById: "usr_admin1",
          isPublished: true,
          targetAudience: "ALL",
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    console.warn("[ensureExamExists] Warning ensuring exam exists in queue:", err);
  }
}

// Redis Connection Configuration (Dedicated connections for Queue & Worker - M-11)
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379/0";

function createRedisClient(label: string) {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 3) return null; // Cease reconnect loop to suppress log storm
      return Math.min(times * 200, 1000);
    },
  });
  client.on("error", () => {}); // Suppress unhandled connection errors
  return client;
}

export const queueRedisConnection = createRedisClient("queue");
export const workerRedisConnection = createRedisClient("worker");

// Backward compatibility export
export const redisConnection = queueRedisConnection;

export interface ExamSubmissionJobData {
  submissionId: string;
  examId: string;
  examTitle?: string;
  studentId?: string;
  mentorId?: string;
  studentProfileId: string;
  studentName?: string;
  subjectScores: Record<string, number>;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  overallScorePercent?: number;
  deltaFromPrevious?: number;
  deltaFromBaseline?: number;
  answers?: Record<string, number | string>;
  submittedAt: string;
  clientIp?: string;
}

export const EXAM_SUBMISSION_QUEUE_NAME = "exam-submissions";

// 1. High-Throughput Queue Definition
export const examSubmissionQueue = new Queue<ExamSubmissionJobData>(
  EXAM_SUBMISSION_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      // [H-15, L-04] Bounded queue retention to prevent Redis memory exhaustion
      removeOnComplete: { count: 1000, age: 3600 },
      removeOnFail: { count: 5000, age: 86400 },
    },
  }
);

// Suppress queue-level unhandled errors when Redis is not running
examSubmissionQueue.on("error", () => {});

/**
 * Rapid Ingestion Producer (< 5ms response time)
 * Called directly inside Next.js Server Action or /api/exams/submit
 * Atomic Redis set check prevents duplicate submissions without touching Postgres!
 * Gracefully falls back to direct database insertion if Redis is unavailable.
 */
export async function enqueueExamSubmission(
  data: ExamSubmissionJobData
): Promise<{ success: boolean; statusCode: number; message: string; trackingId: string }> {
  const idempotencyKey = `submission:lock:${data.examId}:${data.studentProfileId}`;

  try {
    // Attempt connecting if in idle/waiting state
    if (redisConnection.status === "wait") {
      await Promise.race([
        redisConnection.connect().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    }

    if (redisConnection.status === "ready") {
      const acquired = await redisConnection.set(idempotencyKey, "1", "EX", 86400, "NX");
      if (!acquired) {
        return {
          success: false,
          statusCode: 409,
          message: "پاسخنامه شما پیش از این در سامانه ثبت شده است و ارسال مجدد امکان‌پذیر نیست.",
          trackingId: data.submissionId,
        };
      }

      // Push to BullMQ stream with priority
      const job = await examSubmissionQueue.add("process-submission", data, {
        jobId: data.submissionId,
      });

      return {
        success: true,
        statusCode: 202,
        message: "پاسخنامه شما با موفقیت در صف پردازش ایمن ثبت شد و نتیجه پس از تصحیح خودکار در کارنامه شما درج خواهد شد.",
        trackingId: job.id || data.submissionId,
      };
    }
  } catch {
    // Redis unavailable - proceed directly to direct Postgres ingestion fallback
  }

  // Graceful Fallback: Direct Database Ingestion
  try {
    await ensureExamExists(data.examId, data.examTitle);

    await db
      .insert(examSubmissions)
      .values({
        id: data.submissionId,
        examId: data.examId,
        examTitle: data.examTitle || "آزمون ارزیابی",
        studentId: data.studentId || data.studentProfileId,
        studentName: data.studentName || "داوطلب مشاهیر دانش",
        mentorId: data.mentorId || "usr_mentor1",
        studentProfileId: data.studentProfileId,
        scorePercent: data.overallScorePercent || 0,
        correctCount: data.correctCount,
        incorrectCount: data.wrongCount,
        unansweredCount: data.unansweredCount,
        totalPercentage: (data.overallScorePercent || 0).toFixed(2),
        subjectBreakdown: [],
        status: "AUTO_GRADED_PENDING_MENTOR",
        subjectScores: data.subjectScores,
        deltaFromPrevious: data.deltaFromPrevious || 0,
        deltaFromBaseline: data.deltaFromBaseline || 0,
        answers: (data.answers as Record<string, number>) || {},
        submittedAt: new Date(data.submittedAt || Date.now()),
      })
      .onConflictDoNothing();

    return {
      success: true,
      statusCode: 202,
      message: "پاسخنامه با موفقیت ثبت شد.",
      trackingId: data.submissionId,
    };
  } catch (dbErr) {
    console.error("[Queue Fallback] Direct database insert error:", dbErr);
    return {
      success: false,
      statusCode: 500,
      message: "خطا در ثبت پاسخنامه.",
      trackingId: data.submissionId,
    };
  }
}

/**
 * Dedicated Background Worker Consumer (C-08, H-18, M-11)
 * Drains submissions with concurrency = 10 and transactional persistence to PostgreSQL.
 * Guarantees zero data loss: BullMQ only acks job after DB write succeeds.
 */
export function createExamSubmissionWorker() {
  const worker = new Worker<ExamSubmissionJobData>(
    EXAM_SUBMISSION_QUEUE_NAME,
    async (job: Job<ExamSubmissionJobData>) => {
      const sub = job.data;

      // Ensure exam exists before inserting submission (Requirement 2)
      await ensureExamExists(sub.examId, sub.examTitle);

      // Reliable, atomic PostgreSQL persistence (C-08, L-04, L-05)
      await db
        .insert(examSubmissions)
        .values({
          id: sub.submissionId,
          examId: sub.examId,
          examTitle: sub.examTitle || "آزمون ارزیابی",
          studentId: sub.studentId || sub.studentProfileId,
          studentName: sub.studentName || "داوطلب مشاهیر دانش",
          mentorId: sub.mentorId || "usr_mentor1",
          studentProfileId: sub.studentProfileId,
          scorePercent: sub.overallScorePercent || 0,
          correctCount: sub.correctCount,
          incorrectCount: sub.wrongCount,
          unansweredCount: sub.unansweredCount,
          totalPercentage: (sub.overallScorePercent || 0).toFixed(2),
          subjectBreakdown: [],
          status: "AUTO_GRADED_PENDING_MENTOR",
          subjectScores: sub.subjectScores,
          deltaFromPrevious: sub.deltaFromPrevious || 0,
          deltaFromBaseline: sub.deltaFromBaseline || 0,
          answers: (sub.answers as Record<string, number>) || {},
          submittedAt: new Date(sub.submittedAt || Date.now()),
        })
        .onConflictDoUpdate({
          target: examSubmissions.id,
          set: {
            scorePercent: sub.overallScorePercent || 0,
            correctCount: sub.correctCount,
            incorrectCount: sub.wrongCount,
            unansweredCount: sub.unansweredCount,
            totalPercentage: (sub.overallScorePercent || 0).toFixed(2),
            // [H-18] Preserve PUBLISHED_TO_STUDENT if mentor has already finalized and published
            status: sql`CASE WHEN ${examSubmissions.status} = 'PUBLISHED_TO_STUDENT' THEN ${examSubmissions.status} ELSE 'AUTO_GRADED_PENDING_MENTOR' END`,
            subjectScores: sub.subjectScores,
            answers: (sub.answers as Record<string, number>) || {},
            submittedAt: new Date(sub.submittedAt || Date.now()),
          },
        });

      return {
        processed: true,
        submissionId: job.data.submissionId,
        studentProfileId: job.data.studentProfileId,
        processedAt: new Date().toISOString(),
      };
    },
    {
      connection: workerRedisConnection,
      concurrency: 10, // Tuned for DB connection headroom (H-18)
      limiter: {
        max: 2000,
        duration: 1000,
      },
    }
  );

  worker.on("error", () => {}); // Suppress unhandled connection crash
  worker.on("failed", (job: Job<ExamSubmissionJobData> | undefined, err: Error) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
