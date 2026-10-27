import React from "react";
import { Metadata } from "next";
import { requireRole } from "@/server/auth/guard";
import { db, ensureDatabaseBootstrap } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getMentorCallingStatusAction } from "@/server/actions/voip";
import { CallingScheduleClient } from "./calling-schedule-client";

export const metadata: Metadata = {
  title: "ساعات پاسخگویی تلفنی پشتیبان | مشاهیر دانش",
  description: "تنظیم بازه زمانی پاسخگویی تلفنی مستقیم به داوطلبان آزمون وکالت",
};

export default async function MentorCallingSchedulePage() {
  const session = await requireRole(["MENTOR", "SUPERVISOR", "CEO", "ADMIN"]);
  await ensureDatabaseBootstrap().catch(() => {});

  const [currentUser] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      sipExtension: users.sipExtension,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const callingStatus = await getMentorCallingStatusAction(session.userId);

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <CallingScheduleClient
        initialWindow={callingStatus.window}
        mentorName={currentUser?.fullName || session.fullName}
        mentorId={session.userId}
        sipExtension={currentUser?.sipExtension || null}
        isOpenNow={callingStatus.isOpen}
        liveMessage={callingStatus.message}
      />
    </div>
  );
}
