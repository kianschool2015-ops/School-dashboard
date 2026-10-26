/**
 * Next.js Server Lifecycle Instrumentation (C-09)
 * Auto-registers background BullMQ queue workers when running on Node.js runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { createExamSubmissionWorker } = await import("@/server/queue/exam-queue");
      createExamSubmissionWorker();
      console.log("[Instrumentation] BullMQ Exam Submission Worker successfully registered.");
    } catch (err) {
      console.error("[Instrumentation] Failed to initialize exam submission worker:", err);
    }
  }
}
