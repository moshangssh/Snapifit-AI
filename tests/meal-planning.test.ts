import { describe, expect, it } from "vitest"
import {
  buildMealPlanBudgetSnapshot,
  inferRemainingMealSlots,
} from "@/lib/meal-planning"
import type { DailyLog, UserProfile } from "@/lib/types"

const baseProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "build_muscle",
}

function makeLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2026-05-28",
    foodEntries: [],
    exerciseEntries: [],
    summary: {
      totalCaloriesConsumed: 900,
      totalCaloriesBurned: 180,
      macros: { carbs: 95, protein: 62, fat: 28 },
      micronutrients: {},
    },
    baselineExpenditure: 2000,
    ...overrides,
  }
}

describe("meal planning budget", () => {
  it("ignores legacy planned training type and uses only recorded exercise calories", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({ plannedTrainingType: "high_output" }),
      userProfile: baseProfile,
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.recordedExerciseCalories).toBe(180)
    expect(snapshot.targetCalories).toBe(2430)
    expect(snapshot).not.toHaveProperty("plannedTrainingCalories")
    expect(snapshot).not.toHaveProperty("effectiveExerciseCalories")
  })

  it("applies goal adjustment and male safety floor", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
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
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(1500)
    expect(snapshot.remainingCalories).toBe(1400)
  })

  it("applies the female rest-day safety floor at 1200 kcal", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({
        baselineExpenditure: 1000,
        summary: {
          totalCaloriesConsumed: 100,
          totalCaloriesBurned: 0,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: {
        ...baseProfile,
        gender: "female",
        goal: "lose_weight",
      },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(1200)
    expect(snapshot.remainingCalories).toBe(1100)
  })

  it("uses manual target calories when they are above the safety floor", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog(),
      userProfile: { ...baseProfile, targetCalories: 2100 },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(2100)
  })

  it("does not stack weight-loss adjustment on top of manual target calories", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog(),
      userProfile: {
        ...baseProfile,
        goal: "lose_weight",
        targetCalories: 2000,
      },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(2000)
  })

  it("raises manual target calories below the safety floor", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog(),
      userProfile: { ...baseProfile, targetCalories: 1200 },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(1500)
  })

  it("falls back to inferred goal-adjusted budget when manual target calories are absent", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({
        baselineExpenditure: 2100,
        summary: {
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 200,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, goal: "lose_weight" },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(1900)
  })

  it("keeps protein weight-based when manual target calories change", () => {
    const emptyLog = makeLog({
      summary: {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 0,
        macros: { carbs: 0, protein: 0, fat: 0 },
        micronutrients: {},
      },
    })
    const lowerBudget = buildMealPlanBudgetSnapshot({
      log: emptyLog,
      userProfile: { ...baseProfile, targetCalories: 1800 },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })
    const higherBudget = buildMealPlanBudgetSnapshot({
      log: emptyLog,
      userProfile: { ...baseProfile, targetCalories: 2400 },
      now: new Date("2026-05-28T09:00:00+08:00"),
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
    expect(higherBudget.remainingMacros).toEqual(higherBudget.macroTargets)
  })

  it("prioritizes protein, keeps a fat floor, and assigns remaining calories to carbs", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog(),
      userProfile: baseProfile,
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.macroTargets.protein).toBeGreaterThanOrEqual(130)
    expect(snapshot.macroTargets.fat).toBeGreaterThanOrEqual(50)
    expect(snapshot.macroTargets.carbohydrates).toBeGreaterThan(0)
    expect(snapshot.remainingMacros.protein).toBeGreaterThan(0)
  })

  it("maps consumed carbs into remaining carbohydrate budget", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 900,
          totalCaloriesBurned: 180,
          macros: { carbs: 95, protein: 62, fat: 28 },
          micronutrients: {},
        },
      }),
      userProfile: baseProfile,
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.macroTargets.carbohydrates).toBeGreaterThan(95)
    expect(snapshot.remainingMacros.carbohydrates).toBe(
      snapshot.macroTargets.carbohydrates - 95,
    )
  })

  it("clamps remaining macros to zero when consumption exceeds targets", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 4000,
          totalCaloriesBurned: 0,
          macros: { carbs: 500, protein: 300, fat: 200 },
          micronutrients: {},
        },
      }),
      userProfile: baseProfile,
      now: new Date("2026-05-28T19:00:00+08:00"),
    })

    expect(snapshot.remainingMacros).toEqual({
      protein: 0,
      carbohydrates: 0,
      fat: 0,
    })
  })

  it("uses over-budget wording in summary text when remaining calories are negative", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 2600,
          totalCaloriesBurned: 0,
          macros: { carbs: 260, protein: 160, fat: 90 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, goal: "maintain" },
      now: new Date("2026-05-28T20:00:00+08:00"),
    })

    expect(snapshot.remainingCalories).toBeLessThan(0)
    expect(snapshot.summaryText).toContain("今天已超出约")
    expect(snapshot.summaryText).not.toContain("今天还可吃约 -")
  })

  it("clamps carbohydrate target to zero when protein and fat already exhaust an aggressive target", () => {
    // 体重大 + 高 g/kg 系数 + 手填目标贴健康下限时,蛋白与脂肪下限会吃光预算,
    // 碳水目标被 clamp 到 0。这是「优先保蛋白」的刻意取舍,需固化而非回归成负数。
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog({
        summary: {
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 0,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: {
        ...baseProfile,
        weight: 95,
        gender: "female",
        goal: "build_muscle",
        targetCalories: 1200,
      },
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.macroTargets.protein).toBeGreaterThan(0)
    expect(snapshot.macroTargets.fat).toBeGreaterThan(0)
    expect(snapshot.macroTargets.carbohydrates).toBe(0)
    expect(snapshot.remainingMacros.carbohydrates).toBe(0)
  })

  it("infers remaining meal slots from current time and already logged meals", () => {
    expect(
      inferRemainingMealSlots({
        now: new Date("2026-05-28T15:30:00+08:00"),
        consumedMealTypes: ["breakfast", "lunch"],
      }),
    ).toEqual(["dinner", "snack"])
  })
})
