import { requireRole } from "@/server/auth/guard";
import { ensureDatabaseBootstrap } from "@/server/db";
import { getMentorFridayReportsAction } from "@/server/actions/friday-report";
import {
  FridayReportsReviewClient,
  type FridayReportWithStudent,
} from "./friday-reports-review-client";

export default async function MentorFridayReportsPage() {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);
  await ensureDatabaseBootstrap().catch(() => {});

  const reports = (await getMentorFridayReportsAction()) as FridayReportWithStudent[];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <FridayReportsReviewClient
        initialReports={reports}
        userRole={session.role}
        currentUserId={session.userId}
        currentUserName={session.fullName}
      />
    </div>
  );
}
