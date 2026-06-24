import { describe, expect, it } from "vitest"
import { buildDailyEnergySnapshot } from "@/lib/daily-energy-snapshot"
import type { DailyLog, UserProfile } from "@/lib/types"

const baseProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
}

function makeLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2026-06-24",
    foodEntries: [],
    exerciseEntries: [],
    summary: {
      totalCaloriesConsumed: 1800,
      totalCaloriesBurned: 300,
      macros: { carbs: 180, protein: 120, fat: 60 },
      micronutrients: {},
    },
    baselineExpenditure: 2000,
    ...overrides,
  }
}

describe("daily energy snapshot", () => {
  it("builds a neutral deficit snapshot from recorded intake and exercise", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog(),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.baselineExpenditure).toBe(2000)
    expect(snapshot.recordedExerciseCalories).toBe(300)
    expect(snapshot.maintenanceCalories).toBe(2300)
    expect(snapshot.consumedCalories).toBe(1800)
    expect(snapshot.calorieDelta).toBe(-500)
    expect(snapshot.state).toBe("deficit")
  })

  it("treats small daily differences as balanced", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 2285,
          totalCaloriesBurned: 300,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.calorieDelta).toBe(-15)
    expect(snapshot.state).toBe("balanced")
  })

  it("reports surplus when intake is above today's maintenance calories", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 2450,
          totalCaloriesBurned: 300,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.calorieDelta).toBe(150)
    expect(snapshot.state).toBe("surplus")
  })

  it("reports no-record before any intake or exercise has been logged", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 0,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: baseProfile,
      now: new Date("2026-06-24T08:00:00+08:00"),
    })

    expect(snapshot.maintenanceCalories).toBe(2000)
    expect(snapshot.state).toBe("no-record")
  })

  it("reports missing config instead of treating absent baseline as zero expenditure", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({ baselineExpenditure: undefined, calculatedTDEE: undefined }),
      userProfile: { ...baseProfile, weight: 0 },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.baselineExpenditure).toBe(0)
    expect(snapshot.maintenanceCalories).toBe(300)
    expect(snapshot.state).toBe("missing-config")
    expect(snapshot.confidence).toBe("low")
    expect(snapshot.missing).toContain("基础配置")
  })

  it("infers baseline expenditure from the profile when the log has no stored baseline", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({ baselineExpenditure: undefined, calculatedTDEE: undefined }),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.baselineExpenditure).toBe(2596)
    expect(snapshot.maintenanceCalories).toBe(2896)
    expect(snapshot.state).toBe("deficit")
    expect(snapshot.missing).toEqual([])
  })

  it("does not add AI metabolic hints to maintenance calories", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        baselineExpenditure: undefined,
        calculatedTDEE: undefined,
        tefAnalysis: {
          baseTEF: 20,
          baseTEFPercentage: 10,
          enhancementMultiplier: 1.3,
          enhancedTEF: 120,
          enhancementFactors: ["咖啡因"],
          analysisTimestamp: "2026-06-24T04:00:00.000Z",
        },
      }),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.baselineExpenditure).toBe(2596)
    expect(snapshot.maintenanceCalories).toBe(2896)
  })
})
