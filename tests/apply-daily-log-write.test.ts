import { describe, expect, it } from "vitest"
import { applyDailyLogWrite } from "@/lib/apply-daily-log-write"
import { calculateMetabolicRates } from "@/lib/health-utils"
import { recalculateDailySummary } from "@/lib/daily-summary"
import type {
  DailyLog,
  ExerciseEntry,
  FoodEntry,
  UserProfile,
} from "@/lib/types"

// Domain tests at the deep module's interface. applyDailyLogWrite is a pure
// (log, write, ctx) → DailyLog function; every write recomputes the summary and
// stamps 基础消耗. The hook (useDailyLogWriter) is React glue and is covered by
// the homepage integration tests, not here. Mirrors tests/plan-workout.test.ts:
// discriminated intents grouped by `describe`, asserted in-process, zero mocks.

const userProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  bmrFormula: "mifflin-st-jeor",
}

function foodEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    log_id: "food-1",
    food_name: "鸡胸肉",
    consumed_grams: 100,
    meal_type: "lunch",
    nutritional_info_per_100g: {
      calories: 165,
      carbohydrates: 0,
      protein: 31,
      fat: 3.6,
      sodium: 74,
    },
    total_nutritional_info_consumed: {
      calories: 165,
      carbohydrates: 0,
      protein: 31,
      fat: 3.6,
      sodium: 74,
    },
    is_estimated: true,
    ...overrides,
  }
}

function exerciseEntry(overrides: Partial<ExerciseEntry> = {}): ExerciseEntry {
  return {
    log_id: "exercise-1",
    exercise_name: "卧推",
    exercise_type: "strength",
    duration_minutes: 12,
    sets: 3,
    reps: 8,
    weight_kg: 60,
    estimated_mets: 6,
    user_weight: 72,
    calories_burned_estimated: 86,
    muscle_groups: ["chest"],
    is_estimated: true,
    ...overrides,
  }
}

function baseLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2026-05-22",
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

function expectedRates(log: DailyLog) {
  const rates = calculateMetabolicRates(userProfile, { weight: log.weight })
  if (!rates) throw new Error("fixture profile must yield rates")
  return rates
}

describe("applyDailyLogWrite — removeEntry", () => {
  it("removes the food entry, recomputes the summary, and stamps 基础消耗", () => {
    const log = baseLog({ foodEntries: [foodEntry(), foodEntry({ log_id: "food-2" })] })

    const result = applyDailyLogWrite(
      log,
      { kind: "removeEntry", id: "food-1", type: "food" },
      { userProfile },
    )

    const rates = expectedRates(result)
    expect(result.foodEntries.map((entry) => entry.log_id)).toEqual(["food-2"])
    expect(result.summary).toEqual(
      recalculateDailySummary({ ...log, foodEntries: [foodEntry({ log_id: "food-2" })] }),
    )
    expect(result.calculatedBMR).toBe(rates.bmr)
    expect(result.baselineExpenditure).toBe(rates.baselineExpenditure)
  })

  it("only touches the array matching the entry type", () => {
    const log = baseLog({
      foodEntries: [foodEntry()],
      exerciseEntries: [exerciseEntry()],
    })

    const result = applyDailyLogWrite(
      log,
      { kind: "removeEntry", id: "exercise-1", type: "exercise" },
      { userProfile },
    )

    expect(result.foodEntries).toHaveLength(1)
    expect(result.exerciseEntries).toHaveLength(0)
  })

  it("does not mutate the input log", () => {
    const log = baseLog({ foodEntries: [foodEntry()] })

    applyDailyLogWrite(log, { kind: "removeEntry", id: "food-1", type: "food" }, { userProfile })

    expect(log.foodEntries).toHaveLength(1)
    expect(log.calculatedBMR).toBeUndefined()
  })
})

describe("applyDailyLogWrite — updateEntry", () => {
  it("replaces the matching food entry and recomputes the summary", () => {
    const log = baseLog({ foodEntries: [foodEntry(), foodEntry({ log_id: "food-2" })] })
    const edited = foodEntry({
      log_id: "food-2",
      total_nutritional_info_consumed: {
        calories: 400,
        carbohydrates: 50,
        protein: 10,
        fat: 12,
      },
    })

    const result = applyDailyLogWrite(
      log,
      { kind: "updateEntry", entry: edited, type: "food" },
      { userProfile },
    )

    expect(result.foodEntries).toEqual([foodEntry(), edited])
    expect(result.summary).toEqual(recalculateDailySummary({ ...log, foodEntries: [foodEntry(), edited] }))
  })

  it("only updates entries of the matching type", () => {
    const log = baseLog({
      foodEntries: [foodEntry()],
      exerciseEntries: [exerciseEntry()],
    })
    const edited = exerciseEntry({ calories_burned_estimated: 200 })

    const result = applyDailyLogWrite(
      log,
      { kind: "updateEntry", entry: edited, type: "exercise" },
      { userProfile },
    )

    expect(result.foodEntries).toEqual([foodEntry()])
    expect(result.exerciseEntries).toEqual([edited])
    expect(result.summary.totalCaloriesBurned).toBe(200)
  })
})

describe("applyDailyLogWrite — setWeight", () => {
  it("sets the day weight and re-stamps 基础消耗 from the new weight", () => {
    const log = baseLog()

    const result = applyDailyLogWrite(log, { kind: "setWeight", weight: 90 }, { userProfile })

    const rates = calculateMetabolicRates(userProfile, { weight: 90 })!
    expect(result.weight).toBe(90)
    expect(result.calculatedBMR).toBe(rates.bmr)
    expect(result.baselineExpenditure).toBe(rates.baselineExpenditure)
    // 更重的体重 → 更高的基础消耗,证明盖章确实用了新体重
    expect(result.baselineExpenditure).toBeGreaterThan(expectedRates(baseLog()).baselineExpenditure)
  })

  it("clears the day weight and falls back to the profile weight for the stamp", () => {
    const log = baseLog({ weight: 90 })

    const result = applyDailyLogWrite(log, { kind: "setWeight", weight: undefined }, { userProfile })

    expect(result.weight).toBeUndefined()
    expect(result.baselineExpenditure).toBe(
      calculateMetabolicRates(userProfile, { weight: undefined })!.baselineExpenditure,
    )
  })
})

describe("applyDailyLogWrite — setDailyStatus & setMealPlanSuggestion", () => {
  it("writes the daily status and stamps 基础消耗", () => {
    const status = { stress: 3, mood: 4, health: 5 }

    const result = applyDailyLogWrite(baseLog(), { kind: "setDailyStatus", status }, { userProfile })

    expect(result.dailyStatus).toEqual(status)
    expect(result.baselineExpenditure).toBe(expectedRates(baseLog()).baselineExpenditure)
  })

  it("writes the meal plan suggestion", () => {
    const suggestion = {
      generatedAt: "2026-05-22T00:00:00.000Z",
      inputPreference: "高蛋白",
      budgetSnapshot: {
        date: "2026-05-22",
        baselineExpenditure: 2500,
        recordedExerciseCalories: 0,
        targetCalories: 2500,
        consumedCalories: 0,
        remainingCalories: 2500,
        macroTargets: { protein: 140, carbohydrates: 250, fat: 70 },
        remainingMacros: { protein: 140, carbohydrates: 250, fat: 70 },
        remainingMealSlots: ["lunch" as const, "dinner" as const],
        summaryText: "还能吃 2500 kcal",
      },
      summary: "推荐鸡胸肉套餐",
      items: [],
    }

    const result = applyDailyLogWrite(
      baseLog(),
      { kind: "setMealPlanSuggestion", suggestion },
      { userProfile },
    )

    expect(result.mealPlanSuggestion).toEqual(suggestion)
  })
})

describe("applyDailyLogWrite — reconcile", () => {
  it("re-stamps 基础消耗 without any structural change", () => {
    const log = baseLog({ foodEntries: [foodEntry()], exerciseEntries: [exerciseEntry()] })

    const result = applyDailyLogWrite(log, { kind: "reconcile" }, { userProfile })

    expect(result.foodEntries).toEqual(log.foodEntries)
    expect(result.exerciseEntries).toEqual(log.exerciseEntries)
    expect(result.baselineExpenditure).toBe(expectedRates(log).baselineExpenditure)
  })

  it("is idempotent: reconciling an already-stamped log yields a deep-equal log", () => {
    const stamped = applyDailyLogWrite(
      baseLog({ foodEntries: [foodEntry()] }),
      { kind: "reconcile" },
      { userProfile },
    )

    const again = applyDailyLogWrite(stamped, { kind: "reconcile" }, { userProfile })

    expect(again).toEqual(stamped)
  })

  it("never writes the deprecated calculatedTDEE field", () => {
    const result = applyDailyLogWrite(baseLog(), { kind: "reconcile" }, { userProfile })

    expect(result.calculatedTDEE).toBeUndefined()
  })
})
