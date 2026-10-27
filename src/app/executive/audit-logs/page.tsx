import React from "react";
import { requireRole } from "@/server/auth/guard";
import { getSystemAuditLogsAction } from "@/server/actions/audit-logs";
import { AuditLogsClient } from "./audit-logs-client";

export default async function ExecutiveAuditLogsPage() {
  await requireRole(["CEO", "ADMIN"]);
  const initialData = await getSystemAuditLogsAction({ limit: 25, offset: 0 });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <AuditLogsClient
        initialLogs={initialData.logs}
        initialTotalCount={initialData.totalCount}
        initialStats={initialData.eventStats}
      />
    </div>
  );
}
