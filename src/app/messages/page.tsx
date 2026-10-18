import { requireAuth } from "@/server/auth/guard";
import { memoryRepo } from "@/server/db";
import { MessagesClient } from "./messages-client";
import type { DirectMessageRecord, UserRecord } from "@/types/models";

export default async function MessagesPage() {
  const session = await requireAuth();

  // Get allowed contacts based on strict hierarchy
  let contacts: Array<{ id: string; fullName: string; role: string; phoneNumber: string }> = [];

  if (session.role === "STUDENT") {
    const studentProfile = memoryRepo.getStudentProfileByUserId(session.userId);
    if (studentProfile) {
      const mentor = memoryRepo.getUserById(studentProfile.mentorId);
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
    const studentProfiles = memoryRepo.getStudentProfilesByMentorId(session.userId);
    for (const sp of studentProfiles) {
      const u = memoryRepo.getUserById(sp.userId);
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
    const supervisor = memoryRepo.getUserById("usr_adminsupervisor");
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
    const mentors = memoryRepo.getAllMentors();
    for (const m of mentors) {
      contacts.push({
        id: m.id,
        fullName: m.fullName,
        role: "پشتیبان آموزشی",
        phoneNumber: m.phoneNumber,
      });
    }
    const students = memoryRepo.getAllStudentProfiles();
    for (const p of students) {
      const u = memoryRepo.getUserById(p.userId);
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
    const users = memoryRepo.getAllUsers().filter((u) => u.id !== session.userId);
    contacts = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role === "SUPERVISOR" ? "سرپرست" : u.role === "MENTOR" ? "پشتیبان" : u.role === "STUDENT" ? "داوطلب" : "مدیر",
      phoneNumber: u.phoneNumber,
    }));
  }

  const userMessages = memoryRepo.getMessagesForUser(session.userId);
  const userConversations = memoryRepo.getConversationsForUser(session.userId, session.role);
  const allChatMessages = memoryRepo.getAllChatMessages();

  // Omniscient data for Manager (CEO / ADMIN)
  const isManager = session.role === "CEO" || session.role === "ADMIN";
  const allConversations = isManager ? memoryRepo.getAllChatConversations() : [];
  const allDirectMessages = isManager ? memoryRepo.getAllMessages() : [];
  const allUsersList = isManager ? memoryRepo.getAllUsers().map((u) => ({ id: u.id, fullName: u.fullName, role: u.role })) : [];

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
