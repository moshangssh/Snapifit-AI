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

  it("treats malformed logs without summary as an empty summary", () => {
    const logWithoutSummary: Partial<DailyLog> = { ...makeLog() }
    delete logWithoutSummary.summary
    const snapshot = buildDailyEnergySnapshot({
      log: logWithoutSummary as DailyLog,
      userProfile: baseProfile,
      now: new Date("2026-06-24T08:00:00+08:00"),
    })

    expect(snapshot.recordedExerciseCalories).toBe(0)
    expect(snapshot.consumedCalories).toBe(0)
    expect(snapshot.maintenanceCalories).toBe(2000)
    expect(snapshot.remainingBudgetCalories).toBe(2000)
    expect(snapshot.remainingMacros).toEqual(snapshot.macroTargets)
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

  it("opens historical logs that only stored legacy total expenditure without double-counting exercise", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        baselineExpenditure: undefined,
        calculatedTDEE: undefined,
        dailyTotalExpenditure: 2300,
        summary: {
          totalCaloriesConsumed: 1800,
          totalCaloriesBurned: 300,
          macros: { carbs: 180, protein: 120, fat: 60 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, weight: 0 },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.baselineExpenditure).toBe(2000)
    expect(snapshot.recordedExerciseCalories).toBe(300)
    expect(snapshot.maintenanceCalories).toBe(2300)
    expect(snapshot.state).toBe("deficit")
    expect(snapshot.missing).toEqual([])
  })

  it("keeps AI metabolic hints visible without changing maintenance or budget", () => {
    const logWithoutHint = makeLog({
      baselineExpenditure: undefined,
      calculatedTDEE: undefined,
    })
    const logWithHint = makeLog({
      baselineExpenditure: undefined,
      calculatedTDEE: undefined,
      tefAnalysis: {
        baseTEF: 20,
        baseTEFPercentage: 10,
        enhancementMultiplier: 1.3,
        enhancedTEF: 120,
        enhancementFactors: ["咖啡因", "辛辣食物", "绿茶儿茶素"],
        analysisTimestamp: "2026-06-24T04:00:00.000Z",
      },
    })
    const withoutHint = buildDailyEnergySnapshot({
      log: logWithoutHint,
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })
    const withHint = buildDailyEnergySnapshot({
      log: logWithHint,
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(withHint.baselineExpenditure).toBe(withoutHint.baselineExpenditure)
    expect(withHint.maintenanceCalories).toBe(withoutHint.maintenanceCalories)
    expect(withHint.budgetCalories).toBe(withoutHint.budgetCalories)
    expect(withHint.remainingBudgetCalories).toBe(
      withoutHint.remainingBudgetCalories,
    )
    expect(withHint.metabolicHint).toEqual({
      factors: ["咖啡因", "辛辣食物", "绿茶儿茶素"],
      estimatedEffectCalories: 100,
      confidence: "low",
      warning: "AI 代谢提示仅作解释,不改变今日维持热量或今日热量预算",
    })
  })

  it("recalculates historical TEF-enhanced legacy TDEE as neutral baseline", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        baselineExpenditure: undefined,
        calculatedTDEE: 2696,
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
    expect(snapshot.budgetCalories).toBe(2896)
  })

  it("removes old TEF enhancement from legacy TDEE fallback when profile recalculation is unavailable", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        baselineExpenditure: undefined,
        calculatedTDEE: 2100,
        tefAnalysis: {
          baseTEF: 20,
          baseTEFPercentage: 10,
          enhancementMultiplier: 1.3,
          enhancedTEF: 120,
          enhancementFactors: ["咖啡因"],
          analysisTimestamp: "2026-06-24T04:00:00.000Z",
        },
        summary: {
          totalCaloriesConsumed: 1800,
          totalCaloriesBurned: 0,
          macros: { carbs: 180, protein: 120, fat: 60 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, weight: 0 },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.baselineExpenditure).toBe(2000)
    expect(snapshot.maintenanceCalories).toBe(2000)
    expect(snapshot.budgetCalories).toBe(2000)
    expect(snapshot.metabolicHint?.estimatedEffectCalories).toBe(100)
  })

  it("uses manual target calories as the eating budget without goal double adjustment", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog(),
      userProfile: {
        ...baseProfile,
        goal: "lose_weight",
        targetCalories: 2100,
      },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.budgetCalories).toBe(2100)
    expect(snapshot.remainingBudgetCalories).toBe(300)
  })

  it("infers eating budgets from maintenance plus the health goal adjustment", () => {
    const log = makeLog({
      baselineExpenditure: 2000,
      summary: {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 200,
        macros: { carbs: 0, protein: 0, fat: 0 },
        micronutrients: {},
      },
    })
    const now = new Date("2026-06-24T12:00:00+08:00")

    expect(
      buildDailyEnergySnapshot({
        log,
        userProfile: { ...baseProfile, goal: "lose_weight" },
        now,
      }).budgetCalories,
    ).toBe(1800)
    expect(
      buildDailyEnergySnapshot({
        log,
        userProfile: { ...baseProfile, goal: "maintain" },
        now,
      }).budgetCalories,
    ).toBe(2200)
    expect(
      buildDailyEnergySnapshot({
        log,
        userProfile: { ...baseProfile, goal: "build_muscle" },
        now,
      }).budgetCalories,
    ).toBe(2450)
  })

  it("counts recorded exercise in inferred budget but ignores planned training", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        plannedTrainingType: "high_output",
        summary: {
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 180,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, goal: "build_muscle" },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.recordedExerciseCalories).toBe(180)
    expect(snapshot.maintenanceCalories).toBe(2180)
    expect(snapshot.budgetCalories).toBe(2430)
    expect(snapshot).not.toHaveProperty("plannedTrainingCalories")
  })

  it("attaches macro targets to the eating budget while anchoring protein to body weight and goal", () => {
    const emptyLog = makeLog({
      summary: {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 0,
        macros: { carbs: 0, protein: 0, fat: 0 },
        micronutrients: {},
      },
    })
    const lowerBudget = buildDailyEnergySnapshot({
      log: emptyLog,
      userProfile: {
        ...baseProfile,
        goal: "build_muscle",
        targetCalories: 1800,
      },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })
    const higherBudget = buildDailyEnergySnapshot({
      log: emptyLog,
      userProfile: {
        ...baseProfile,
        goal: "build_muscle",
        targetCalories: 2400,
      },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(lowerBudget.macroTargets.protein).toBe(
      higherBudget.macroTargets.protein,
    )
    expect(higherBudget.macroTargets.fat).toBeGreaterThan(
      lowerBudget.macroTargets.fat,
    )
    expect(higherBudget.macroTargets.carbohydrates).toBeGreaterThan(
      lowerBudget.macroTargets.carbohydrates,
    )
    expect(lowerBudget.remainingMacros).toEqual(lowerBudget.macroTargets)
    expect(lowerBudget.macroTargets.fat).toBeGreaterThanOrEqual(
      Math.round(baseProfile.weight * 0.6),
    )
  })

  it("keeps inferred weight-loss budget from rising above maintenance when applying the safety floor", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog({
        baselineExpenditure: 1300,
        summary: {
          totalCaloriesConsumed: 100,
          totalCaloriesBurned: 0,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, goal: "lose_weight" },
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.maintenanceCalories).toBe(1300)
    expect(snapshot.budgetCalories).toBe(1300)
    expect(snapshot.remainingBudgetCalories).toBe(1200)
  })

  it("reserves future multi-day calibration without adjusting today's budget", () => {
    const snapshot = buildDailyEnergySnapshot({
      log: makeLog(),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(snapshot.individualCalibration).toEqual({
      status: "not-enabled",
      windowDays: { min: 14, max: 28 },
      maintenanceAdjustmentCalories: 0,
      basis: "future-multi-day-trend",
      warning: "未来多日个体校准未启用,当前不调整今日维持热量或今日热量预算",
    })
    expect(snapshot.maintenanceCalories).toBe(2300)
    expect(snapshot.budgetCalories).toBe(2300)
  })
})
