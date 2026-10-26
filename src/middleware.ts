import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  getJwtSecret,
  isCookieSecure,
  createSessionToken,
  isSessionRevoked,
  type SessionPayload,
} from "@/lib/jwt";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mashahir_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static and Public Routes Allowed Without Authentication
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/sample-docs") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/auth/login" ||
    pathname === "/auth/no-support-access" ||
    pathname === "/" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth/sso/garnet")
  ) {
    return NextResponse.next();
  }

  // 2. [M-06] CSRF Protection: Verify Origin and Host on Mutating Requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return new NextResponse("CSRF validation failed: Origin mismatch", { status: 403 });
        }
      } catch {
        return new NextResponse("CSRF validation failed: Malformed Origin header", { status: 403 });
      }
    }
  }

  // 3. Extract and Verify Session Token
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isApiRoute = pathname.startsWith("/api/");

  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: "UNAUTHORIZED: Session token required" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let session: SessionPayload | null = null;
  try {
    const secretKey = getJwtSecret();
    const { payload } = await jwtVerify(token, secretKey);
    session = payload as unknown as SessionPayload;

    // Check token revocation
    if (session.sessionId) {
      const revoked = await isSessionRevoked(session.sessionId);
      if (revoked) {
        session = null;
      }
    }
  } catch {
    session = null;
  }

  if (!session) {
    if (isApiRoute) {
      return NextResponse.json({ error: "UNAUTHORIZED: Invalid or expired session token" }, { status: 401 });
    }
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. [H-03] Sliding-Window Session Renewal: Refresh Token when < 2 hours remain
  let refreshedToken: string | null = null;
  const nowUnix = Math.floor(Date.now() / 1000);
  if (session.exp && session.exp - nowUnix < 2 * 3600 && session.exp - nowUnix > 0) {
    try {
      refreshedToken = await createSessionToken(
        {
          userId: session.userId,
          role: session.role,
          username: session.username,
          fullName: session.fullName,
          studentProfileId: session.studentProfileId,
          mentorId: session.mentorId,
          sessionId: session.sessionId,
        },
        "8h"
      );
    } catch {
      refreshedToken = null;
    }
  }

  const role = session.role;

  // Helper function for sub-path exact & prefix matching [L-01]
  const isRouteMatch = (baseRoute: string) =>
    pathname === baseRoute || pathname.startsWith(baseRoute + "/");

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
  if (isRouteMatch("/executive")) {
    if (role !== "CEO" && role !== "ADMIN") {
      return redirectToRoleHome();
    }
  }

  // Rule 2: /settings - Permitted ONLY for CEO and ADMIN
  if (isRouteMatch("/settings")) {
    if (role !== "CEO" && role !== "ADMIN") {
      return redirectToRoleHome();
    }
  }

  // Rule 3: /supervisor - Permitted for SUPERVISOR, CEO, and ADMIN
  if (isRouteMatch("/supervisor")) {
    if (role !== "SUPERVISOR" && role !== "CEO" && role !== "ADMIN") {
      return redirectToRoleHome();
    }
  }

  // Rule 4: /mentor - Permitted for MENTOR, SUPERVISOR, CEO, and ADMIN (Forbidden for STUDENT)
  if (isRouteMatch("/mentor")) {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  // Rule 5: /plans & /tasks - Permitted for Staff (Forbidden for STUDENT)
  if (isRouteMatch("/plans") || isRouteMatch("/tasks")) {
    if (role === "STUDENT") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
  }

  // Rule 6: Student personal spaces
  if (
    isRouteMatch("/student/dashboard") ||
    isRouteMatch("/student/weekly-review") ||
    isRouteMatch("/student/onboarding")
  ) {
    if (role === "MENTOR") {
      return NextResponse.redirect(new URL("/mentor/triage", request.url));
    }
    if (role === "SUPERVISOR") {
      return NextResponse.redirect(new URL("/supervisor", request.url));
    }
  }

  const response = NextResponse.next();

  // If token was refreshed, update the session cookie
  if (refreshedToken) {
    response.cookies.set(SESSION_COOKIE_NAME, refreshedToken, {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
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
