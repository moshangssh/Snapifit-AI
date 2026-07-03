import { describe, expect, it } from "vitest"
import { hasUserRecordedData } from "@/lib/daily-log-record"
import { applyDailyLogWrite } from "@/lib/apply-daily-log-write"
import type { DailyLog, UserProfile } from "@/lib/types"

// Regression for the "reconcile writes on view" bug: applyDailyLogWrite stamps
// 基础消耗 (calculatedBMR/baselineExpenditure) on every load/reconcile per
// ADR-0014, so a day the user only *viewed* gets a stamped-but-empty log. A
// "did the user record something?" predicate must NOT treat those derived
// stamps as a record, or empty viewed days show spurious calendar markers.

function baseLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2026-08-01",
    foodEntries: [],
    exerciseEntries: [],
    summary: {
      totalCaloriesConsumed: 0,
      totalCaloriesBurned: 0,
      macros: { carbs: 0, protein: 0, fat: 0 },
      micronutrients: {},
    },
    ...overrides,
  }
}

const profile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  bmrFormula: "mifflin-st-jeor",
}

describe("hasUserRecordedData", () => {
  it("is false for a truly empty day", () => {
    expect(hasUserRecordedData(baseLog())).toBe(false)
  })

  it("is false for null/undefined", () => {
    expect(hasUserRecordedData(null)).toBe(false)
    expect(hasUserRecordedData(undefined)).toBe(false)
  })

  it("does NOT count derived metabolic stamps as a record", () => {
    expect(hasUserRecordedData(baseLog({ calculatedBMR: 1600 }))).toBe(false)
    expect(hasUserRecordedData(baseLog({ calculatedTDEE: 2100 }))).toBe(false)
    expect(hasUserRecordedData(baseLog({ baselineExpenditure: 2480 }))).toBe(false)
    expect(hasUserRecordedData(baseLog({ dailyTotalExpenditure: 2480 }))).toBe(false)
  })

  it("counts every user-authored field as a record", () => {
    expect(hasUserRecordedData(baseLog({ foodEntries: [{ log_id: "f" } as never] }))).toBe(true)
    expect(hasUserRecordedData(baseLog({ exerciseEntries: [{ log_id: "e" } as never] }))).toBe(true)
    expect(hasUserRecordedData(baseLog({ weight: 70.4 }))).toBe(true)
    expect(hasUserRecordedData(baseLog({ dailyStatus: { stress: 3, mood: 4, health: 4 } }))).toBe(true)
    expect(hasUserRecordedData(baseLog({ mealPlanSuggestion: {} as never }))).toBe(true)
  })

  // End-to-end: the exact bug path. Viewing an empty day reconciles → stamps →
  // and the predicate the calendar/chat use must still say "no record".
  it("stays false after a reconcile-on-view stamps 基础消耗 (the reported bug)", () => {
    const stamped = applyDailyLogWrite(baseLog(), { kind: "reconcile" }, { userProfile: profile })
    expect(stamped.calculatedBMR).toBeGreaterThan(0) // reconcile did stamp
    expect(hasUserRecordedData(stamped)).toBe(false) // …but it's still not a record
  })
})
