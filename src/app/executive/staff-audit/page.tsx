import React from "react";
import { requireRole } from "@/server/auth/guard";
import { getStaffAuditDataAction } from "@/server/actions/admin-staff-audit";
import { StaffAuditClient } from "./staff-audit-client";

export default async function ExecutiveStaffAuditPage() {
  await requireRole(["CEO", "ADMIN"]);
  const data = await getStaffAuditDataAction();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <StaffAuditClient initialData={data} />
    </div>
  );
}
