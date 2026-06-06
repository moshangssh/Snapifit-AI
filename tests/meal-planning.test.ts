import { describe, expect, it } from "vitest"
import {
  buildMealPlanBudgetSnapshot,
  getPlannedTrainingCalories,
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
  it("maps planned training types to conservative calories", () => {
    expect(getPlannedTrainingCalories("rest")).toBe(0)
    expect(getPlannedTrainingCalories("strength")).toBe(150)
    expect(getPlannedTrainingCalories("strength_cardio")).toBe(300)
    expect(getPlannedTrainingCalories("high_output")).toBe(500)
  })

  it("uses the larger of recorded exercise and planned training calories", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog(),
      userProfile: baseProfile,
      plannedTrainingType: "strength_cardio",
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.recordedExerciseCalories).toBe(180)
    expect(snapshot.plannedTrainingCalories).toBe(300)
    expect(snapshot.effectiveExerciseCalories).toBe(300)
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
      plannedTrainingType: "rest",
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.targetCalories).toBe(1500)
    expect(snapshot.remainingCalories).toBe(1400)
  })

  it("prioritizes protein, keeps a fat floor, and assigns remaining calories to carbs", () => {
    const snapshot = buildMealPlanBudgetSnapshot({
      log: makeLog(),
      userProfile: baseProfile,
      plannedTrainingType: "strength_cardio",
      now: new Date("2026-05-28T09:00:00+08:00"),
    })

    expect(snapshot.macroTargets.protein).toBeGreaterThanOrEqual(130)
    expect(snapshot.macroTargets.fat).toBeGreaterThanOrEqual(50)
    expect(snapshot.macroTargets.carbohydrates).toBeGreaterThan(0)
    expect(snapshot.remainingMacros.protein).toBeGreaterThan(0)
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
