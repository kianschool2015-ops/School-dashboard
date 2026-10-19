import { requireAuth } from "@/server/auth/guard";
import { db } from "@/server/db";
import {
  users,
  studentProfiles,
  directMessages,
  chatConversations,
  chatMessages,
} from "@/server/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { MessagesClient } from "./messages-client";
import type {
  DirectMessageRecord,
  ChatConversationRecord,
  ChatMessageRecord,
} from "@/types/models";

export default async function MessagesPage() {
  const session = await requireAuth();

  const allUsers = await db.select().from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // Get allowed contacts based on strict hierarchy
  let contacts: Array<{ id: string; fullName: string; role: string; phoneNumber: string }> = [];

  if (session.role === "STUDENT") {
    const [studentProfile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (studentProfile && studentProfile.mentorId) {
      const mentor = userMap.get(studentProfile.mentorId);
      if (mentor) {
        contacts.push({
          id: mentor.id,
          fullName: mentor.fullName,
          role: "پشتیبان آموزشی اختصاصی",
          phoneNumber: mentor.phoneNumber,
        });
      }
    }
  } else if (session.role === "MENTOR") {
    // Assigned students
    const assignedProfiles = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.mentorId, session.userId));

    for (const sp of assignedProfiles) {
      const u = userMap.get(sp.userId);
      if (u) {
        contacts.push({
          id: u.id,
          fullName: u.fullName,
          role: "داوطلب آزمون وکالت",
          phoneNumber: u.phoneNumber,
        });
      }
    }
    // Cohort Supervisor
    const supervisor = userMap.get("usr_adminsupervisor");
    if (supervisor) {
      contacts.push({
        id: supervisor.id,
        fullName: supervisor.fullName,
        role: "سرپرست کوهورت",
        phoneNumber: supervisor.phoneNumber,
      });
    }
  } else if (session.role === "SUPERVISOR") {
    // Supervisor sees mentors and students in cohort (strictly isolated from manager and other supervisors)
    const mentors = allUsers.filter((u) => u.role === "MENTOR");
    for (const m of mentors) {
      contacts.push({
        id: m.id,
        fullName: m.fullName,
        role: "پشتیبان آموزشی",
        phoneNumber: m.phoneNumber,
      });
    }
    const students = await db.select().from(studentProfiles);
    for (const p of students) {
      const u = userMap.get(p.userId);
      if (u) {
        contacts.push({
          id: u.id,
          fullName: u.fullName,
          role: "داوطلب آزمون وکالت",
          phoneNumber: u.phoneNumber,
        });
      }
    }
  } else {
    // CEO / ADMIN has access to all staff and mentors
    const otherUsers = allUsers.filter((u) => u.id !== session.userId);
    contacts = otherUsers.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role === "SUPERVISOR" ? "سرپرست" : u.role === "MENTOR" ? "پشتیبان" : u.role === "STUDENT" ? "داوطلب" : "مدیر",
      phoneNumber: u.phoneNumber,
    }));
  }

  const userMessages = (await db
    .select()
    .from(directMessages)
    .where(
      or(
        eq(directMessages.senderId, session.userId),
        eq(directMessages.receiverId, session.userId)
      )
    )
    .orderBy(desc(directMessages.createdAt))) as unknown as DirectMessageRecord[];

  const rawConversations = await db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.createdAt));

  const isManager = session.role === "CEO" || session.role === "ADMIN";

  const userConversations = isManager
    ? (rawConversations as unknown as ChatConversationRecord[])
    : (rawConversations.filter((c) => {
        const participants = Array.isArray(c.memberIds) ? (c.memberIds as string[]) : [];
        return participants.includes(session.userId);
      }) as unknown as ChatConversationRecord[]);

  const rawChatMessages = await db
    .select()
    .from(chatMessages)
    .orderBy(desc(chatMessages.createdAt));
  const allChatMessages = rawChatMessages as unknown as ChatMessageRecord[];

  // Omniscient data for Manager (CEO / ADMIN)
  const allConversations = isManager ? (rawConversations as unknown as ChatConversationRecord[]) : [];
  const allDirectMessages = isManager
    ? ((await db.select().from(directMessages).orderBy(desc(directMessages.createdAt))) as unknown as DirectMessageRecord[])
    : [];
  const allUsersList = isManager ? allUsers.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role })) : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <MessagesClient
        currentUser={{
          id: session.userId,
          fullName: session.fullName,
          role: session.role,
        }}
        contacts={contacts}
        initialMessages={userMessages}
        initialConversations={userConversations}
        initialChatMessages={allChatMessages}
        isManager={isManager}
        allConversations={allConversations}
        allDirectMessages={allDirectMessages}
        allUsersList={allUsersList}
      />
    </div>
  );
}
