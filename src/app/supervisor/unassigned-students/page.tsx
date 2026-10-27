import React from "react";
import { getSession } from "@/server/auth/guard";
import { redirect } from "next/navigation";
import {
  getUnassignedStudentsAction,
  getActiveMentorsAction,
} from "@/server/actions/supervisor-assignment";
import { UnassignedStudentsClient } from "./unassigned-students-client";

export const metadata = {
  title: "تعیین پشتیبان داوطلبان جدید | پشتیبانی مشاهیر دانش",
  description: "کارتابل نظارت و تخصیص هوشمند پشتیبان به داوطلبان جدید آزمون وکالت",
};

export default async function UnassignedStudentsPage() {
  const session = await getSession();

  if (
    !session ||
    (session.role !== "SUPERVISOR" && session.role !== "ADMIN" && session.role !== "CEO")
  ) {
    redirect("/auth/login");
  }

  const [students, mentors] = await Promise.all([
    getUnassignedStudentsAction(),
    getActiveMentorsAction(),
  ]);

  return <UnassignedStudentsClient initialStudents={students} mentors={mentors} />;
}
