import { describe, expect, it } from "vitest"
import {
  buildPeriodAnalysisSummary,
  getPeriodAnalysisDateKeys,
  getPeriodAnalysisRequirement,
  hasPeriodAnalysisData,
} from "@/lib/smart-analysis-period"
import type { DailyLog } from "@/lib/types"

function makeLog(
  date: string,
  overrides: Partial<DailyLog> = {},
): DailyLog {
  return {
    date,
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

const periodIgnoredOnlyLogCases: Array<[string, Partial<DailyLog>]> = [
  ["meal suggestions", { mealPlanSuggestion: {} as never }],
  ["legacy planned training", { plannedTrainingType: "high_output" }],
]

describe("smart analysis period helpers", () => {
  it("builds inclusive date keys ending at the selected date", () => {
    expect(getPeriodAnalysisDateKeys("7d", "2026-05-23")).toEqual([
      "2026-05-17",
      "2026-05-18",
      "2026-05-19",
      "2026-05-20",
      "2026-05-21",
      "2026-05-22",
      "2026-05-23",
    ])

    const monthlyKeys = getPeriodAnalysisDateKeys("30d", "2026-05-23")
    expect(monthlyKeys).toHaveLength(30)
    expect(monthlyKeys[0]).toBe("2026-04-24")
    expect(monthlyKeys[29]).toBe("2026-05-23")
  })

  it("uses stricter data requirements for monthly analysis", () => {
    expect(getPeriodAnalysisRequirement("7d")).toEqual({
      days: 7,
      minDataDays: 3,
      label: "7天复盘",
    })
    expect(getPeriodAnalysisRequirement("30d")).toEqual({
      days: 30,
      minDataDays: 14,
      label: "30天趋势",
    })
  })

  it("treats user-recorded food, exercise, weight, and status as real records", () => {
    const logs = [
      makeLog("2026-05-17"),
      makeLog("2026-05-18", {
        foodEntries: [
          {
            log_id: "food-1",
            food_name: "米饭",
            consumed_grams: 200,
            meal_type: "lunch",
            nutritional_info_per_100g: {
              calories: 116,
              carbohydrates: 26,
              protein: 2.6,
              fat: 0.3,
            },
            total_nutritional_info_consumed: {
              calories: 232,
              carbohydrates: 52,
              protein: 5.2,
              fat: 0.6,
            },
            is_estimated: true,
          },
        ],
        summary: {
          totalCaloriesConsumed: 232,
          totalCaloriesBurned: 0,
          macros: { carbs: 52, protein: 5.2, fat: 0.6 },
          micronutrients: {},
        },
      }),
      makeLog("2026-05-19", {
        exerciseEntries: [
          {
            log_id: "exercise-1",
            exercise_name: "慢跑",
            exercise_type: "cardio",
            duration_minutes: 30,
            estimated_mets: 7,
            user_weight: 70,
            calories_burned_estimated: 250,
            is_estimated: true,
          },
        ],
      }),
      makeLog("2026-05-20", { weight: 70.4 }),
      makeLog("2026-05-21", {
        dailyStatus: { stress: 3, mood: 4, health: 4, sleepQuality: 5 },
      }),
      makeLog("2026-05-22", { calculatedBMR: 1600 }),
    ]

    expect(hasPeriodAnalysisData(logs[0])).toBe(false)
    expect(hasPeriodAnalysisData(logs[5])).toBe(false)
    expect(logs.filter(hasPeriodAnalysisData)).toHaveLength(4)
  })

  it("summarizes only real records and rounds period metrics", () => {
    const logs = [
      makeLog("2026-05-17"),
      makeLog("2026-05-18", {
        weight: 71,
        baselineExpenditure: 1900,
        summary: {
          totalCaloriesConsumed: 1801,
          totalCaloriesBurned: 300,
          macros: { carbs: 210, protein: 105, fat: 55 },
          micronutrients: {},
        },
        foodEntries: [
          {
            log_id: "food-1",
            food_name: "鸡胸肉",
            consumed_grams: 150,
            meal_type: "lunch",
            nutritional_info_per_100g: {
              calories: 165,
              carbohydrates: 0,
              protein: 31,
              fat: 3.6,
            },
            total_nutritional_info_consumed: {
              calories: 248,
              carbohydrates: 0,
              protein: 46.5,
              fat: 5.4,
            },
            is_estimated: true,
          },
        ],
      }),
      makeLog("2026-05-19", {
        weight: 70.4,
        baselineExpenditure: 1900,
        summary: {
          totalCaloriesConsumed: 2100,
          totalCaloriesBurned: 100,
          macros: { carbs: 250, protein: 120, fat: 65 },
          micronutrients: {},
        },
        exerciseEntries: [
          {
            log_id: "exercise-1",
            exercise_name: "力量训练",
            exercise_type: "strength",
            duration_minutes: 45,
            estimated_mets: 5,
            user_weight: 70.4,
            calories_burned_estimated: 100,
            is_estimated: true,
          },
        ],
      }),
      makeLog("2026-05-20", {
        weight: 70.2,
        calculatedTDEE: 2000,
        summary: {
          totalCaloriesConsumed: 1900,
          totalCaloriesBurned: 0,
          macros: { carbs: 220, protein: 110, fat: 60 },
          micronutrients: {},
        },
      }),
    ]

    const summary = buildPeriodAnalysisSummary({
      range: "7d",
      endDate: "2026-05-23",
      logs,
    })

    expect(summary).toMatchObject({
      range: "7d",
      label: "7天复盘",
      startDate: "2026-05-17",
      endDate: "2026-05-23",
      totalDays: 7,
      dataDays: 3,
      averages: {
        calories: 1933.7,
        exercise: 133.3,
        protein: 111.7,
        carbs: 226.7,
        fat: 60,
        energyBalance: -133,
      },
      totals: {
        calories: 5801,
        exercise: 400,
        protein: 335,
      },
      weightTrend: {
        startWeight: 71,
        endWeight: 70.2,
        change: -0.8,
      },
    })
    expect(summary.dailyRecords).toHaveLength(3)
    expect(summary.dailyRecords[0].foodNames).toEqual(["鸡胸肉"])
    expect(summary.dailyRecords[1].exerciseNames).toEqual(["力量训练"])
  })

  it.each(periodIgnoredOnlyLogCases)(
    "does not count %s as period samples",
    (_label, ignoredOnlyLog) => {
      const recordedLog = makeLog("2026-05-18", {
        summary: {
          totalCaloriesConsumed: 600,
          totalCaloriesBurned: 0,
          macros: { carbs: 70, protein: 30, fat: 20 },
          micronutrients: {},
        },
        foodEntries: [
          {
            log_id: "food-1",
            food_name: "燕麦",
            consumed_grams: 100,
            meal_type: "breakfast",
            nutritional_info_per_100g: {
              calories: 600,
              carbohydrates: 70,
              protein: 30,
              fat: 20,
            },
            total_nutritional_info_consumed: {
              calories: 600,
              carbohydrates: 70,
              protein: 30,
              fat: 20,
            },
            is_estimated: true,
          },
        ],
      })

      const summary = buildPeriodAnalysisSummary({
        range: "7d",
        endDate: "2026-05-23",
        logs: [recordedLog, makeLog("2026-05-19", ignoredOnlyLog)],
      })

      expect(summary.dataDays).toBe(1)
      expect(summary.averages.calories).toBe(600)
      expect(summary.dailyRecords.map((record) => record.date)).toEqual([
        "2026-05-18",
      ])
    },
  )
})
