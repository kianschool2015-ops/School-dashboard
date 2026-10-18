import { createExamSubmissionWorker } from "./exam-queue";

console.log("🚀 [Exam Worker] Starting BullMQ Exam Ingestion Worker service...");
const worker = createExamSubmissionWorker();

process.on("SIGTERM", async () => {
  console.log("🛑 [Exam Worker] Gracefully shutting down BullMQ worker...");
  await worker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 [Exam Worker] Interrupted. Closing worker...");
  await worker.close();
  process.exit(0);
});
