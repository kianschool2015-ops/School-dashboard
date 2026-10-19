import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { coachingMissions as coachingMissionsTable } from "@/server/db/schema";
import { CoachingMissionsClient } from "./coaching-missions-client";
import type { CoachingMissionRecord } from "@/types/models";

export default async function CoachingMissionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const missionsRows = await db.select().from(coachingMissionsTable);
  const missions = missionsRows as unknown as CoachingMissionRecord[];

  return <CoachingMissionsClient missions={missions} />;
}
