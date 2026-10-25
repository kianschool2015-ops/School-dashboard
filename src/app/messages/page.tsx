import { requireAuth } from "@/server/auth/guard";
import { db } from "@/server/db";
import {
  users,
  studentProfiles,
  directMessages,
  chatConversations,
  chatMessages,
} from "@/server/db/schema";
import { eq, or, asc, desc } from "drizzle-orm";
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

  const userMessages = (await db
    .select()
    .from(directMessages)
    .where(
      or(
        eq(directMessages.senderId, session.userId),
        eq(directMessages.receiverId, session.userId)
      )
    )
    .orderBy(asc(directMessages.createdAt))) as unknown as DirectMessageRecord[];

  // Define contact shape with 3 distinct tabs (Requirement 5)
  type ContactCategory = "STUDENTS" | "MENTORS" | "LEADERSHIP";

  interface ContactItem {
    id: string;
    fullName: string;
    role: string;
    rawRole: "STUDENT" | "MENTOR" | "SUPERVISOR" | "CEO" | "ADMIN";
    category: ContactCategory;
    phoneNumber: string;
    canInitiate: boolean;
  }

  const contactsMap = new Map<string, ContactItem>();

  const addContact = (
    u: typeof users.$inferSelect,
    displayRole?: string
  ) => {
    if (!u || u.id === session.userId) return;

    const rawRole = u.role as "STUDENT" | "MENTOR" | "SUPERVISOR" | "CEO" | "ADMIN";
    let category: ContactCategory = "STUDENTS";
    if (rawRole === "STUDENT") category = "STUDENTS";
    else if (rawRole === "MENTOR") category = "MENTORS";
    else category = "LEADERSHIP";

    // Downward hierarchy check:
    // Students & mentors cannot initiate direct messages to leadership unless replying to existing thread
    const isLeadership = category === "LEADERSHIP";
    let canInitiate = true;
    if (isLeadership && (session.role === "STUDENT" || session.role === "MENTOR")) {
      const hasIncoming = userMessages.some(
        (m) => m.senderId === u.id && m.receiverId === session.userId
      );
      canInitiate = hasIncoming;
    }

    const defaultRoleLabel =
      rawRole === "STUDENT"
        ? "داوطلب آزمون وکالت"
        : rawRole === "MENTOR"
        ? "پشتیبان آموزشی"
        : rawRole === "SUPERVISOR"
        ? "سرپرست آموزشی"
        : "مدیریت ارشد مؤسسه";

    contactsMap.set(u.id, {
      id: u.id,
      fullName: u.fullName,
      role: displayRole || defaultRoleLabel,
      rawRole,
      category,
      phoneNumber: u.phoneNumber,
      canInitiate,
    });
  };

  if (session.role === "STUDENT") {
    const [studentProfile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.userId))
      .limit(1);

    if (studentProfile && studentProfile.mentorId) {
      const mentor = userMap.get(studentProfile.mentorId);
      if (mentor) addContact(mentor, "پشتیبان آموزشی اختصاصی شما");
    }

    // Cohort Supervisor & Leadership (Admin, CEO, Supervisor)
    // Ensure all leadership members who sent messages appear immediately in student conversations,
    // plus default supervisors for reply capability.
    allUsers
      .filter((u) => u.role === "SUPERVISOR" || u.role === "CEO" || u.role === "ADMIN")
      .forEach((sup) => {
        const hasIncoming = userMessages.some(
          (m) => m.senderId === sup.id && m.receiverId === session.userId
        );
        const label =
          sup.role === "SUPERVISOR"
            ? hasIncoming
              ? "سرپرست آموزشی"
              : "سرپرست آموزشی (فقط پاسخ به پیام)"
            : hasIncoming
            ? "مدیریت ارشد مؤسسه"
            : "مدیریت ارشد مؤسسه (فقط پاسخ به پیام)";
        addContact(sup, label);
      });
  } else if (session.role === "MENTOR") {
    // 1. Assigned students (STUDENTS tab)
    const assignedProfiles = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.mentorId, session.userId));

    for (const sp of assignedProfiles) {
      const u = userMap.get(sp.userId);
      if (u) addContact(u, "داوطلب تحت نظارت مستقیم شما");
    }

    // 2. Colleague mentors (MENTORS tab)
    allUsers
      .filter((u) => u.role === "MENTOR" && u.id !== session.userId)
      .forEach((m) => addContact(m, "همکار پشتیبان"));

    // 3. Supervisor & Admins (LEADERSHIP tab)
    allUsers
      .filter((u) => u.role === "SUPERVISOR" || u.role === "CEO" || u.role === "ADMIN")
      .forEach((sup) => addContact(sup, sup.role === "SUPERVISOR" ? "سرپرست آموزشی" : "مدیریت مؤسسه"));
  } else if (session.role === "SUPERVISOR") {
    // 1. Cohort students (STUDENTS tab)
    const students = await db.select().from(studentProfiles);
    for (const p of students) {
      const u = userMap.get(p.userId);
      if (u) addContact(u, "داوطلب دوره آموزشی");
    }

    // 2. Mentors (MENTORS tab)
    allUsers
      .filter((u) => u.role === "MENTOR")
      .forEach((m) => addContact(m, "پشتیبان آموزشی دوره"));

    // 3. Leadership & other supervisors (LEADERSHIP tab)
    allUsers
      .filter((u) => (u.role === "SUPERVISOR" || u.role === "CEO" || u.role === "ADMIN") && u.id !== session.userId)
      .forEach((l) => addContact(l, l.role === "SUPERVISOR" ? "همکار سرپرست" : "مدیریت ارشد مؤسسه"));
  } else {
    // CEO / ADMIN has omniscient visibility across all 3 tabs
    allUsers
      .filter((u) => u.id !== session.userId)
      .forEach((u) => addContact(u));
  }

  const contacts = Array.from(contactsMap.values());

  const rawConversations = await db
    .select()
    .from(chatConversations)
    .orderBy(desc(chatConversations.createdAt));

  const isManager = session.role === "CEO" || session.role === "ADMIN";
  const isSupervisorOrManager = isManager || session.role === "SUPERVISOR";

  const userConversations = isManager
    ? (rawConversations as unknown as ChatConversationRecord[])
    : (rawConversations.filter((c) => {
        const participants = Array.isArray(c.memberIds) ? (c.memberIds as string[]) : [];
        return participants.includes(session.userId);
      }) as unknown as ChatConversationRecord[]);

  const rawChatMessages = await db
    .select()
    .from(chatMessages)
    .orderBy(asc(chatMessages.createdAt));
  const allChatMessages = rawChatMessages as unknown as ChatMessageRecord[];

  // Omniscient data for Manager (CEO / ADMIN)
  const allConversations = isManager ? (rawConversations as unknown as ChatConversationRecord[]) : [];
  const allDirectMessages = isManager
    ? ((await db.select().from(directMessages).orderBy(desc(directMessages.createdAt))) as unknown as DirectMessageRecord[])
    : [];
  const allUsersList = allUsers.map((u) => ({ id: u.id, fullName: u.fullName, role: u.role }));

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
        canUseGhostMode={isSupervisorOrManager}
        allConversations={allConversations}
        allDirectMessages={allDirectMessages}
        allUsersList={allUsersList}
      />
    </div>
  );
}
