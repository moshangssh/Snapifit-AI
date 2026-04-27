import type { DailyLog, DailySummaryType } from "@/lib/types"

const MACRO_KEYS = new Set(["calories", "carbohydrates", "protein", "fat"])

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

export function recalculateDailySummary(log: DailyLog): DailySummaryType {
  const totalCaloriesConsumed = log.foodEntries.reduce(
    (sum, entry) =>
      sum + (entry.total_nutritional_info_consumed.calories ?? 0),
    0,
  )
  const totalCaloriesBurned = log.exerciseEntries.reduce(
    (sum, entry) => sum + (entry.calories_burned_estimated || 0),
    0,
  )

  const macros = log.foodEntries.reduce(
    (acc, entry) => {
      const totals = entry.total_nutritional_info_consumed
      return {
        carbs: acc.carbs + (totals.carbohydrates ?? 0),
        protein: acc.protein + (totals.protein ?? 0),
        fat: acc.fat + (totals.fat ?? 0),
      }
    },
    { carbs: 0, protein: 0, fat: 0 },
  )

  const micronutrients = log.foodEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      for (const [key, value] of Object.entries(
        entry.total_nutritional_info_consumed,
      )) {
        if (MACRO_KEYS.has(key) || typeof value !== "number") continue
        acc[key] = roundOneDecimal((acc[key] ?? 0) + value)
      }
      return acc
    },
    {},
  )

  return {
    totalCaloriesConsumed: roundOneDecimal(totalCaloriesConsumed),
    totalCaloriesBurned: roundOneDecimal(totalCaloriesBurned),
    macros: {
      carbs: roundOneDecimal(macros.carbs),
      protein: roundOneDecimal(macros.protein),
      fat: roundOneDecimal(macros.fat),
    },
    micronutrients,
  }
}
