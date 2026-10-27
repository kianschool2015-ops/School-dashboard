import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ForensicWatermark } from "@/components/security/forensic-watermark";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  let currentUser: { fullName: string; nationalId: string | null; phoneNumber: string | null } | null = null;

  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const [u] = await db
      .select({
        fullName: users.fullName,
        nationalId: users.nationalId,
        phoneNumber: users.phoneNumber,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    currentUser = u || null;
  } catch (err) {
    console.warn("[StudentLayout] Error fetching user for watermark:", err);
  }

  return (
    <ForensicWatermark
      userFullName={currentUser?.fullName || session.fullName}
      nationalId={currentUser?.nationalId || "••••••••••"}
      phoneNumber={currentUser?.phoneNumber || session.phoneNumber || "۰۹•••••••••"}
    >
      {children}
    </ForensicWatermark>
  );
}
