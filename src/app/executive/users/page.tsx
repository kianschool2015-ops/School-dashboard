import React from "react";
import { Metadata } from "next";
import { requireRole } from "@/server/auth/guard";
import { listUsersAction } from "@/server/actions/admin-users";
import { UsersClient } from "./users-client";

export const metadata: Metadata = {
  title: "مدیریت کاربران و دسترسی‌ها | سامانه مشاهیر دانش",
  description: "مدیریت متمرکز پرسنل، سرپرستان، پشتیبانان و داوطلبان آزمون وکالت کانون و مرکز وکلا",
};

export default async function ExecutiveUsersPage() {
  const session = await requireRole(["CEO", "ADMIN"]);
  const { users: userList } = await listUsersAction();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <UsersClient initialUsers={userList} currentUserId={session.userId} />
    </div>
  );
}
