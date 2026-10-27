import React from "react";
import { requireRole } from "@/server/auth/guard";
import { getSupervisorMentorEvaluationsAction } from "@/server/actions/supervisor";
import { SupervisorMentorsClient } from "./supervisor-mentors-client";

export default async function SupervisorMentorsPage() {
  const session = await requireRole(["SUPERVISOR", "CEO", "ADMIN"]);
  const mentors = await getSupervisorMentorEvaluationsAction();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SupervisorMentorsClient
        initialMentors={mentors}
        currentUserRole={session.role}
      />
    </div>
  );
}
