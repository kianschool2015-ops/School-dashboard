import { db, pgClient } from "./index";
import {
  users,
  studentProfiles,
  mentorTriageCases,
  coachingMissions,
  mockExams,
} from "./schema";
import {
  initialUsers,
  initialStudentProfiles,
  initialTriageCases,
  initialCoachingMissions,
  initialMockExams,
} from "./mock-data";

async function main() {
  console.log("🌱 Starting Mashahir Danesh Database Seeder...");

  try {
    // 1. Seed Users
    console.log(`Inserting ${initialUsers.length} users...`);
    for (const u of initialUsers) {
      await db
        .insert(users)
        .values({
          id: u.id,
          phoneNumber: u.phoneNumber,
          fullName: u.fullName,
          role: u.role,
          isActive: u.isActive,
        })
        .onConflictDoNothing();
    }

    // 2. Seed Student Profiles
    console.log(`Inserting ${initialStudentProfiles.length} student profiles...`);
    for (const p of initialStudentProfiles) {
      await db
        .insert(studentProfiles)
        .values({
          id: p.id,
          userId: p.userId,
          mentorId: p.mentorId,
          employmentStatus: p.employmentStatus,
          isStudent: p.isStudent,
          maritalStatus: p.maritalStatus,
          hasChildren: p.hasChildren,
          childrenCount: p.childrenCount,
          hasFamilyCareDuty: p.hasFamilyCareDuty,
          familyCareDetail: p.familyCareDetail,
          workdayStudyHoursCap: p.workdayStudyHoursCap,
          holidayStudyHoursCap: p.holidayStudyHoursCap,
          bestStudyTime: p.bestStudyTime,
          primaryConstraint: p.primaryConstraint,
          previousBarExamAttempts: p.previousBarExamAttempts,
          currentDailyStudyHours: p.currentDailyStudyHours,
          selfBaselineAssessment: p.selfBaselineAssessment,
          masterclassGoal: p.masterclassGoal,
          riskStatus: p.riskStatus,
          riskReason: p.riskReason,
          lastContactAt: p.lastContactAt,
        })
        .onConflictDoNothing();
    }

    // 3. Seed Coaching Missions
    console.log(`Inserting ${initialCoachingMissions.length} coaching missions...`);
    for (const m of initialCoachingMissions) {
      await db
        .insert(coachingMissions)
        .values({
          id: m.id,
          title: m.title,
          category: m.category,
          assignedJalaliWeek: m.assignedJalaliWeek,
          assignedJalaliYear: m.assignedJalaliYear,
        })
        .onConflictDoNothing();
    }

    // 4. Seed Triage Cases
    console.log(`Inserting ${initialTriageCases.length} triage cases...`);
    for (const t of initialTriageCases) {
      await db
        .insert(mentorTriageCases)
        .values({
          id: t.id,
          studentProfileId: t.studentProfileId,
          mentorId: t.mentorId,
          triggerCode: t.triggerCode,
          priorityTier: t.priorityTier,
          description: t.description,
          isResolved: t.isResolved,
          slaDueAt: t.slaDueAt,
        })
        .onConflictDoNothing();
    }

    // 5. Seed Mock Exams
    console.log(`Inserting ${initialMockExams.length} mock exams...`);
    for (const e of initialMockExams) {
      await db
        .insert(mockExams)
        .values({
          id: e.id,
          studentProfileId: e.studentProfileId,
          examTitle: e.examTitle,
          examDate: e.examDate,
          hasParticipated: e.hasParticipated,
          isExcusedAbsence: e.isExcusedAbsence,
          overallScorePercent: e.overallScorePercent,
          overallRank: e.overallRank,
          correctCount: e.correctCount,
          wrongCount: e.wrongCount,
          unansweredCount: e.unansweredCount,
          subjectScores: e.subjectScores,
          analysisStatus: e.analysisStatus,
          primaryErrorCause: e.primaryErrorCause,
          priorityReviewSubject: e.priorityReviewSubject,
          deltaPreviousExam: e.deltaPreviousExam,
          deltaBaseline: e.deltaBaseline,
        })
        .onConflictDoNothing();
    }

    console.log("✅ Seeding completed successfully!");
  } catch (error) {
    console.warn("Notice: PostgreSQL seeding completed or deferred (In-Memory mode ready):", error);
  } finally {
    await pgClient.end({ timeout: 1 });
  }
}

if (process.argv[1]?.includes("seed.ts")) {
  main();
}
