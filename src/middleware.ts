import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/server/auth/jwt";

const JWT_SECRET_STRING =
  process.env.JWT_SECRET ||
  "super_secret_jwt_key_at_least_32_chars_mashahir_danesh_2026_law_school";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mashahir_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, public assets, and public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/sample-docs") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/auth/login" ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let session: SessionPayload | null = null;
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    session = payload as unknown as SessionPayload;
  } catch {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const role = session.role;

  // ============================================================================
  // STRICT 4-LEVEL DOWNWARD-ONLY HIERARCHY ENFORCEMENT
  // ============================================================================

  // Helper redirect to role home
  const redirectToRoleHome = () => {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    if (role === "MENTOR") {
      return NextResponse.redirect(new URL("/mentor/triage", request.url));
    }
    if (role === "SUPERVISOR") {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }
    return NextResponse.redirect(new URL("/executive", request.url));
  };

  // Rule 1: /executive - Permitted ONLY for CEO and ADMIN (Level 4)
  if (pathname.startsWith("/executive")) {
    if (role !== "CEO" && role !== "ADMIN") {
      return redirectToRoleHome();
    }
  }

  // Rule 2: /settings - Permitted ONLY for CEO and ADMIN (Telecom, AMI, SMS API, Billing)
  if (pathname.startsWith("/settings")) {
    if (role !== "CEO" && role !== "ADMIN") {
      return redirectToRoleHome();
    }
  }

  // Rule 3: /supervisor - Permitted for SUPERVISOR (Level 3), CEO and ADMIN (Level 4)
  // Forbidden for STUDENT (Level 1) and MENTOR (Level 2)
  if (pathname.startsWith("/supervisor")) {
    if (role !== "SUPERVISOR" && role !== "CEO" && role !== "ADMIN") {
      return redirectToRoleHome();
    }
  }

  // Rule 4: /mentor - Permitted for MENTOR (Level 2), SUPERVISOR (Level 3 audit), CEO and ADMIN (Level 4)
  // Strictly Forbidden for STUDENT (Level 1)
  if (pathname.startsWith("/mentor")) {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  // Rule 5: /plans & /tasks - Permitted for Staff (MENTOR, SUPERVISOR, CEO, ADMIN)
  // Forbidden for STUDENT (Level 1)
  if (pathname.startsWith("/plans") || pathname.startsWith("/tasks")) {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  // Rule 6: Student personal spaces (/student/dashboard, /student/weekly-review, /student/onboarding)
  // Mentors and Supervisors have their own portals and should not view the raw student personal workspace
  if (
    pathname === "/student/dashboard" ||
    pathname === "/student/weekly-review" ||
    pathname === "/student/onboarding"
  ) {
    if (role === "MENTOR") {
      return NextResponse.redirect(new URL("/mentor/triage", request.url));
    }
    if (role === "SUPERVISOR") {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/mentor/:path*",
    "/supervisor/:path*",
    "/executive/:path*",
    "/settings/:path*",
    "/messages/:path*",
    "/plans/:path*",
    "/exams/:path*",
    "/tasks/:path*",
  ],
};
