"use server";

import { cookies } from "next/headers";
import { db, ensureDatabaseBootstrap } from "../db";
import { users, studentProfiles, entitledCourses } from "../db/schema";
import { eq, or } from "drizzle-orm";
import { createSessionToken } from "../auth/jwt";
import {
  authenticateWithGarnetCredentials,
  fetchGarnetUserAndCourses,
  verifyCourseSupportEntitlement,
} from "../services/garnet";
import type { UserRole, EntitledCourseRecord } from "@/types/models";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mashahir_session";

/**
 * Handle SSO Authentication with Garnet LMS JWT Token
 * Protocol:
 * 1. Receive JWT from Garnet
 * 2. Send JWT back to Garnet API to fetch enrolled courses
 * 3. Verify course entitlement against admin-configured courses in DB
 * 4. If entitled: grant access to dashboard
 * 5. If not entitled: redirect to upsell page showing courses with support
 */
export async function loginWithGarnetSsoAction(garnetJwt: string): Promise<{
  success: boolean;
  message?: string;
  redirectUrl?: string;
  notEntitled?: boolean;
  eligibleCourses?: EntitledCourseRecord[];
}> {
  try {
    await ensureDatabaseBootstrap().catch(() => {});

    // 1. Send JWT to Garnet API to get user profile and enrolled courses
    const verification = await fetchGarnetUserAndCourses(garnetJwt);

    if (!verification.success || !verification.user) {
      return {
        success: false,
        message: verification.message || "اعتبارسنجی توکن ورود گارنت با خطا مواجه شد.",
      };
    }

    const { user: garnetUser, courses } = verification;
    const enrolledCodes = courses.map((c) => c.code);

    // 2. Check if user is enrolled in a course with support entitlement
    const entitlement = await verifyCourseSupportEntitlement(enrolledCodes);

    if (!entitlement.isEntitled) {
      // User is registered in Garnet, but their course lacks 360 Support!
      // Direct them to the upsell / support purchase page
      return {
        success: false,
        notEntitled: true,
        message: "داوطلب گرامی، دوره ثبت‌نامی شما فاقد بسته پشتیبانی آموزشی ۳۶۰ درجه مشاهیر دانش است.",
        redirectUrl: "/auth/no-support-access",
        eligibleCourses: entitlement.eligibleCourses,
      };
    }

    // 3. User is entitled! Provision or update user in PostgreSQL
    const cleanPhone = garnetUser.phoneNumber.replace(/\s+/g, "");
    let dbUser: typeof users.$inferSelect | null = null;

    try {
      const [existing] = await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.phoneNumber, cleanPhone),
            eq(users.garnetUserId, garnetUser.id)
          )
        )
        .limit(1);
      dbUser = existing || null;
    } catch {}

    const newUserId = dbUser?.id || `usr_${Date.now()}`;
    const matchedCourse = entitlement.matchedCourse;

    if (!dbUser) {
      const [created] = await db
        .insert(users)
        .values({
          id: newUserId,
          phoneNumber: cleanPhone,
          fullName: garnetUser.fullName,
          nationalId: garnetUser.nationalId || null,
          username: garnetUser.username || cleanPhone,
          role: "STUDENT",
          garnetUserId: garnetUser.id,
          garnetUsername: garnetUser.username || null,
          isActive: true,
        })
        .returning();
      dbUser = created;
    } else {
      await db
        .update(users)
        .set({
          fullName: garnetUser.fullName,
          garnetUserId: garnetUser.id,
          garnetUsername: garnetUser.username || dbUser.garnetUsername,
          updatedAt: new Date(),
        })
        .where(eq(users.id, dbUser.id));
    }

    // Ensure student profile exists
    let studentProfileId: string = `profile_${Date.now()}`;
    try {
      const [existingProfile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, dbUser.id))
        .limit(1);

      if (existingProfile) {
        studentProfileId = existingProfile.id;
        await db
          .update(studentProfiles)
          .set({
            enrolledCourseCode: matchedCourse?.courseCode || "GARNET-BAR-360",
            enrolledCourseName: matchedCourse?.courseName || "دوره پشتیبانی وکالت",
            hasActiveSupport: true,
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.id, existingProfile.id));
      } else {
        await db.insert(studentProfiles).values({
          id: studentProfileId,
          userId: dbUser.id,
          mentorId: "usr_mentor1", // Default institutional mentor
          employmentStatus: "UNEMPLOYED",
          isStudent: false,
          maritalStatus: "SINGLE",
          hasChildren: false,
          childrenCount: 0,
          hasFamilyCareDuty: false,
          workdayStudyHoursCap: 8,
          holidayStudyHoursCap: 12,
          bestStudyTime: "MORNING",
          previousBarExamAttempts: 0,
          currentDailyStudyHours: 6,
          masterclassGoal: "قبولی در آزمون وکالت کانون و مرکز وکلا",
          riskStatus: "GREEN",
          riskReason: "ورود موفق از طریق گارنت LMS با بسته پشتیبانی فعال",
          enrolledCourseCode: matchedCourse?.courseCode || "GARNET-BAR-360",
          enrolledCourseName: matchedCourse?.courseName || "دوره پشتیبانی وکالت",
          hasActiveSupport: true,
          lastContactAt: new Date(),
        });
      }
    } catch {}

    // 4. Generate Session Token & Cookie
    const token = await createSessionToken({
      userId: dbUser.id,
      phoneNumber: dbUser.phoneNumber,
      fullName: dbUser.fullName,
      role: "STUDENT" as UserRole,
      studentProfileId,
    });

    const isCookieSecure = process.env.COOKIE_SECURE === "true";
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isCookieSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return {
      success: true,
      message: `ورود با موفقیت انجام شد. خوش آمدید، ${dbUser.fullName}`,
      redirectUrl: "/student/dashboard",
    };
  } catch (error) {
    console.error("[GarnetSSO] Error processing login:", error);
    return {
      success: false,
      message: "خطای سیستمی در فرآیند احراز هویت با سامانه گارنت.",
    };
  }
}

/**
 * Login with Garnet LMS Username & Password
 */
export async function loginWithGarnetCredentialsAction(
  identifier: string,
  pass: string
): Promise<{
  success: boolean;
  message?: string;
  redirectUrl?: string;
  notEntitled?: boolean;
  eligibleCourses?: EntitledCourseRecord[];
}> {
  const authRes = await authenticateWithGarnetCredentials(identifier, pass);
  if (!authRes.success || !authRes.token) {
    return {
      success: false,
      message: authRes.message || "اطلاعات ورود به سامانه گارنت نامعتبر است.",
    };
  }

  return loginWithGarnetSsoAction(authRes.token);
}

/**
 * Get List of Active Courses with Support (For upsell/explanation page)
 */
export async function getEligibleSupportCoursesAction(): Promise<EntitledCourseRecord[]> {
  try {
    await ensureDatabaseBootstrap().catch(() => {});
    const rows = await db
      .select()
      .from(entitledCourses)
      .where(eq(entitledCourses.isActive, true));
    return (rows as unknown as EntitledCourseRecord[]).filter((c) => c.hasSupport);
  } catch {
    return [];
  }
}
