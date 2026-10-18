import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  "super_secret_jwt_key_at_least_32_chars_mashahir_danesh_2026_law_school";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export type UserRole = "STUDENT" | "MENTOR" | "SUPERVISOR" | "CEO" | "ADMIN";

export interface SessionPayload {
  userId: string;
  phoneNumber: string;
  fullName: string;
  role: UserRole;
  studentProfileId?: string; // Present if user is a student
  mentorId?: string; // If user is student, their mentor's userId
}

export async function createSessionToken(
  payload: SessionPayload,
  expiresIn: string = "7d"
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET_KEY);
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
