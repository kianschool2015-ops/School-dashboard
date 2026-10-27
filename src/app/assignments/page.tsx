import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { getAssignmentHubDataAction } from "@/server/actions/assignments";
import { AssignmentsClient } from "./assignments-client";

export default async function AssignmentsHubPage() {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "SUPERVISOR" && session.role !== "CEO" && session.role !== "ADMIN")
  ) {
    redirect("/auth/login");
  }

  const hubData = await getAssignmentHubDataAction();

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl" dir="rtl">
      <AssignmentsClient
        initialData={hubData}
        currentUserRole={session.role}
        currentUserId={session.userId}
      />
    </div>
  );
}
