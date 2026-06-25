import type {
  DailyLog,
  MealPlanBudgetSnapshot,
  UserProfile,
} from "@/lib/types"
import { buildDailyEnergySnapshot } from "@/lib/daily-energy-snapshot"

export function inferRemainingMealSlots(input: {
  now: Date
  consumedMealTypes: string[]
}): Array<"breakfast" | "lunch" | "dinner" | "snack"> {
  const hour = input.now.getHours()
  const consumed = new Set(input.consumedMealTypes)
  const slots: Array<"breakfast" | "lunch" | "dinner" | "snack"> = []

  if (hour < 10 && !consumed.has("breakfast")) slots.push("breakfast")
  if (hour < 14 && !consumed.has("lunch")) slots.push("lunch")
  if (hour < 21 && !consumed.has("dinner")) slots.push("dinner")
  slots.push("snack")

  return [...new Set(slots)]
}

function buildSummaryText(
  snapshot: Omit<MealPlanBudgetSnapshot, "summaryText">,
): string {
  const calorieText =
    snapshot.remainingCalories >= 0
      ? `今天还可吃约 ${snapshot.remainingCalories} kcal`
      : `今天已超出约 ${Math.abs(snapshot.remainingCalories)} kcal`
  const proteinText =
    snapshot.remainingMacros.protein > 0
      ? `蛋白还差 ${snapshot.remainingMacros.protein}g`
      : "蛋白已达标"
  const fatText =
    snapshot.remainingMacros.fat <= 10
      ? "脂肪空间偏紧"
      : `脂肪还可约 ${snapshot.remainingMacros.fat}g`

  return `${calorieText} · ${proteinText} · ${fatText}`
}

export function buildMealPlanBudgetSnapshot(input: {
  log: DailyLog
  userProfile: UserProfile
  now: Date
}): MealPlanBudgetSnapshot {
  const dailyEnergySnapshot = buildDailyEnergySnapshot(input)
  const snapshotWithoutSummary = {
    date: input.log.date,
    baselineExpenditure: dailyEnergySnapshot.baselineExpenditure,
    recordedExerciseCalories: dailyEnergySnapshot.recordedExerciseCalories,
    targetCalories: dailyEnergySnapshot.budgetCalories,
    consumedCalories: dailyEnergySnapshot.consumedCalories,
    remainingCalories: dailyEnergySnapshot.remainingBudgetCalories,
    macroTargets: dailyEnergySnapshot.macroTargets,
    remainingMacros: dailyEnergySnapshot.remainingMacros,
    remainingMealSlots: inferRemainingMealSlots({
      now: input.now,
      consumedMealTypes: input.log.foodEntries.map((entry) => entry.meal_type),
    }),
  }

  return {
    ...snapshotWithoutSummary,
    summaryText: buildSummaryText(snapshotWithoutSummary),
  }
}
