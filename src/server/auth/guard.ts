import { cookies } from "next/headers";
import { verifySessionToken, type SessionPayload, type UserRole } from "./jwt";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mashahir_session";

/**
 * Retrieves and validates the current session from HTTP-only cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Ensures user is authenticated. Throws or returns user session.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: احراز هویت الزامی است. لطفاً وارد حساب خود شوید.");
  }
  return session;
}

/**
 * Ensures user has one of the allowed roles.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionPayload> {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.role)) {
    throw new Error(
      `FORBIDDEN: شما دسترسی لازم برای این عملیات را ندارید. (نقش شما: ${session.role})`
    );
  }
  return session;
}

/**
 * Zero-Trust Ownership Guard:
 * Ensures a STUDENT can only access their OWN studentProfileId.
 * Mentors, Supervisors, and Admins can also access if authorized.
 */
export async function requireStudentOwnership(targetStudentProfileId: string): Promise<SessionPayload> {
  const session = await requireAuth();

  // If user is a student, target must strictly match their own profile
  if (session.role === "STUDENT") {
    if (session.studentProfileId !== targetStudentProfileId) {
      throw new Error("FORBIDDEN: داوطلب مجاز به مشاهده یا ویرایش پرونده دیگران نیست.");
    }
    return session;
  }

  // Mentors, Supervisors, Admins, CEO have access by role
  return session;
}

/**
 * Checks mentor ownership for a student profile
 */
export async function requireMentorOwnership(
  assignedMentorId: string | null | undefined
): Promise<SessionPayload> {
  const session = await requireAuth();

  if (session.role === "MENTOR") {
    if (assignedMentorId !== session.userId) {
      throw new Error("FORBIDDEN: این داوطلب به پشتیبان دیگری تخصیص داده شده است.");
    }
  }

  return session;
}
