import { describe, it, expect } from "vitest";
import {
  evaluateStudentRisk,
  calculateProgramExecutionPercent,
  calculateConsistencyPercent,
  calculateCoachingAdherencePercent,
  calculateSlaCompliancePercent,
  calculateSlaDueAt,
  TRIGGER_DEFINITIONS,
} from "../src/server/services/alert-engine";

describe("Alert Engine & Quantitative Formulas", () => {
  describe("Quantitative Metrics Calculations", () => {
    it("calculates program execution percentage correctly", () => {
      // 5 done, 2 partial, out of 10 items => (5 + 0.5*2) / 10 = 6/10 = 60%
      expect(calculateProgramExecutionPercent(5, 2, 10)).toBe(60);
      // All done => 100%
      expect(calculateProgramExecutionPercent(8, 0, 8)).toBe(100);
      // None done => 0%
      expect(calculateProgramExecutionPercent(0, 0, 10)).toBe(0);
      // Empty items => 0%
      expect(calculateProgramExecutionPercent(0, 0, 0)).toBe(0);
    });

    it("calculates consistency percentage based on 7-day study week", () => {
      // 7 active days = 100%
      expect(calculateConsistencyPercent(7)).toBe(100);
      // 5 active days = (5/7)*100 = 71%
      expect(calculateConsistencyPercent(5)).toBe(71);
      // 0 active days = 0%
      expect(calculateConsistencyPercent(0)).toBe(0);
    });

    it("calculates coaching adherence percentage correctly", () => {
      // 3 done, 1 partial out of 4 missions => (3 + 0.5)/4 = 3.5/4 = 88%
      expect(calculateCoachingAdherencePercent(3, 1, 4)).toBe(88);
    });

    it("calculates SLA compliance percentage correctly", () => {
      // 9 resolved in SLA out of 10 cases = 90%
      expect(calculateSlaCompliancePercent(9, 10)).toBe(90);
      // 0 triggered cases = 100%
      expect(calculateSlaCompliancePercent(0, 0)).toBe(100);
    });
  });

  describe("Alert Triggers A01 to A09", () => {
    it("triggers A01 (Help Requested) with Tier 2 and SLA 12 hours", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_1",
        helpRequested: true,
      });

      expect(result.activeTriggers).toHaveLength(1);
      const a01 = result.activeTriggers[0];
      expect(a01.code).toBe("A01");
      expect(a01.tier).toBe(2);
      expect(a01.slaHours).toBe(12);
      expect(result.riskState).toBe("YELLOW");
      expect(result.highestPriorityTier).toBe(2);
    });

    it("triggers A08 (Missed check-in >= 4 days) as Tier 1 (Crisis) with SLA 6 hours -> RED", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_2",
        consecutiveMissedCheckinDays: 4,
      });

      expect(result.activeTriggers).toHaveLength(1);
      const a08 = result.activeTriggers[0];
      expect(a08.code).toBe("A08");
      expect(a08.tier).toBe(1);
      expect(a08.slaHours).toBe(6);
      expect(result.riskState).toBe("RED"); // Any Tier 1 means RED
      expect(result.highestPriorityTier).toBe(1);
    });

    it("triggers A02 (Missing weekly reflection) with Tier 5 and SLA 24 hours", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_3",
        weeklyReflectionSubmitted: false,
      });

      expect(result.activeTriggers).toHaveLength(1);
      const a02 = result.activeTriggers[0];
      expect(a02.code).toBe("A02");
      expect(a02.tier).toBe(5);
      expect(a02.slaHours).toBe(24);
      expect(result.riskState).toBe("YELLOW");
    });

    it("triggers A03 (Weekly execution < 50% vs < 70%) with appropriate tiers", () => {
      // Execution < 50% => Tier 4, SLA 48h
      const severe = evaluateStudentRisk({
        studentProfileId: "stu_4a",
        weeklyExecutionPercent: 42,
      });
      expect(severe.activeTriggers[0].tier).toBe(4);
      expect(severe.activeTriggers[0].slaHours).toBe(48);

      // Execution 50-69% => Tier 6, SLA 72h
      const moderate = evaluateStudentRisk({
        studentProfileId: "stu_4b",
        weeklyExecutionPercent: 65,
      });
      expect(moderate.activeTriggers[0].tier).toBe(6);
      expect(moderate.activeTriggers[0].slaHours).toBe(72);
    });

    it("triggers A04 (Consecutive backlog >= 2 weeks) with Tier 4", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_5",
        consecutiveBacklogWeeks: 2,
      });
      expect(result.activeTriggers[0].code).toBe("A04");
      expect(result.activeTriggers[0].tier).toBe(4);
      expect(result.activeTriggers[0].slaHours).toBe(48);
    });

    it("triggers A05 (Unexcused Mock Exam Absence) with Tier 3 and SLA 24h", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_6",
        missedMockExamUnexcused: true,
      });
      expect(result.activeTriggers[0].code).toBe("A05");
      expect(result.activeTriggers[0].tier).toBe(3);
      expect(result.activeTriggers[0].slaHours).toBe(24);
    });

    it("triggers A06 (Score drop > 15%) with Tier 3 and SLA 48h", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_7",
        mockExamScoreDropPercent: 18,
      });
      expect(result.activeTriggers[0].code).toBe("A06");
      expect(result.activeTriggers[0].tier).toBe(3);
      expect(result.activeTriggers[0].slaHours).toBe(48);
    });

    it("triggers A07 (Exam analysis pending >= 72h) with Tier 3 and SLA 48h", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_8",
        mockExamAnalysisPendingHours: 80,
      });
      expect(result.activeTriggers[0].code).toBe("A07");
      expect(result.activeTriggers[0].tier).toBe(3);
    });

    it("triggers A09 (Overdue unresolved case) with Tier 5 and supervisor escalation flag", () => {
      const result = evaluateStudentRisk({
        studentProfileId: "stu_9",
        hasOverdueUnresolvedCase: true,
      });
      expect(result.activeTriggers[0].code).toBe("A09");
      expect(result.activeTriggers[0].escalateToSupervisor).toBe(true);
    });

    it("evaluates Aggregate Risk State: 0 alerts -> GREEN, 1-2 alerts -> YELLOW, >=3 alerts -> RED", () => {
      // 0 alerts
      const green = evaluateStudentRisk({
        studentProfileId: "stu_green",
      });
      expect(green.riskState).toBe("GREEN");
      expect(green.activeTriggers).toHaveLength(0);

      // 2 alerts -> YELLOW
      const yellow = evaluateStudentRisk({
        studentProfileId: "stu_yellow",
        weeklyExecutionPercent: 60, // A03
        weeklyReflectionSubmitted: false, // A02
      });
      expect(yellow.riskState).toBe("YELLOW");
      expect(yellow.activeTriggers).toHaveLength(2);

      // 3 alerts -> RED
      const redMulti = evaluateStudentRisk({
        studentProfileId: "stu_red",
        weeklyExecutionPercent: 40, // A03
        weeklyReflectionSubmitted: false, // A02
        consecutiveBacklogWeeks: 2, // A04
      });
      expect(redMulti.riskState).toBe("RED");
      expect(redMulti.activeTriggers).toHaveLength(3);
    });

    it("calculates SLA due timestamp accurately", () => {
      const baseDate = new Date("2026-10-13T10:00:00Z");
      const trigger = {
        code: "A01" as const,
        ...TRIGGER_DEFINITIONS.A01,
      };
      const due = calculateSlaDueAt(trigger, baseDate);
      // 10:00 + 12h = 22:00
      expect(due.toISOString()).toBe("2026-10-13T22:00:00.000Z");
    });
  });
});
