import { describe, expect, it } from "vitest"
import { recalculateDailySummary } from "@/lib/daily-summary"
import type { DailyLog } from "@/lib/types"

describe("daily summary recalculation", () => {
  it("recalculates calories, macros, and micronutrients from log entries", () => {
    const log: DailyLog = {
      date: "2026-04-23",
      foodEntries: [
        {
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
        },
        {
          log_id: "food-2",
          food_name: "米饭",
          consumed_grams: 150,
          meal_type: "lunch",
          nutritional_info_per_100g: {
            calories: 116,
            carbohydrates: 26,
            protein: 2.6,
            fat: 0.3,
          },
          total_nutritional_info_consumed: {
            calories: 174,
            carbohydrates: 39,
            protein: 3.9,
            fat: 0.45,
          },
          is_estimated: true,
        },
      ],
      exerciseEntries: [
        {
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
        },
      ],
      summary: {
        totalCaloriesConsumed: 0,
        totalCaloriesBurned: 0,
        macros: { carbs: 0, protein: 0, fat: 0 },
        micronutrients: {},
      },
    }

    expect(recalculateDailySummary(log)).toEqual({
      totalCaloriesConsumed: 339,
      totalCaloriesBurned: 86,
      macros: {
        carbs: 39,
        protein: 34.9,
        fat: 4.1,
      },
      micronutrients: {
        sodium: 74,
      },
    })
  })
})
