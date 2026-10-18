import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import { memoryRepo } from "@/server/db";
import { CoachingMissionsClient } from "./coaching-missions-client";

export default async function CoachingMissionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const missions = memoryRepo.getCoachingMissions();

  return <CoachingMissionsClient missions={missions} />;
}
