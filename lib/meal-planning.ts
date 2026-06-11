import type {
  DailyLog,
  MealPlanBudgetSnapshot,
  UserProfile,
} from "@/lib/types"

const PROTEIN_GRAMS_PER_KG: Record<string, number> = {
  lose_weight: 1.8,
  maintain: 1.6,
  gain_weight: 1.7,
  build_muscle: 1.9,
  improve_health: 1.6,
}

const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  lose_weight: -400,
  maintain: 0,
  gain_weight: 250,
  build_muscle: 250,
  improve_health: -150,
}

function getSafetyFloor(userProfile: UserProfile): number {
  if (userProfile.gender === "female") {
    return 1200
  }

  return 1500
}

function clampGoalAdjustedCalories(
  baseCalories: number,
  userProfile: UserProfile,
): number {
  const adjustment = GOAL_CALORIE_ADJUSTMENT[userProfile.goal] ?? 0
  const adjusted = Math.round(baseCalories + adjustment)

  return Math.max(adjusted, getSafetyFloor(userProfile))
}

function clampManualTargetCalories(
  targetCalories: number,
  userProfile: UserProfile,
): number {
  return Math.max(Math.round(targetCalories), getSafetyFloor(userProfile))
}

function buildMacroTargets(targetCalories: number, userProfile: UserProfile) {
  const proteinPerKg =
    PROTEIN_GRAMS_PER_KG[userProfile.goal] ?? PROTEIN_GRAMS_PER_KG.maintain
  const protein = Math.round(userProfile.weight * proteinPerKg)
  const fat = Math.max(
    Math.round((targetCalories * 0.22) / 9),
    Math.round(userProfile.weight * 0.6),
  )
  const caloriesAfterProteinAndFat = Math.max(
    0,
    targetCalories - protein * 4 - fat * 9,
  )
  const carbohydrates = Math.round(caloriesAfterProteinAndFat / 4)

  return { protein, carbohydrates, fat }
}

function clampRemaining(value: number): number {
  return Math.max(0, Math.round(value))
}

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
  const baselineExpenditure =
    input.log.baselineExpenditure ?? input.log.calculatedTDEE ?? 0
  const recordedExerciseCalories = input.log.summary.totalCaloriesBurned ?? 0
  const manualTargetCalories = input.userProfile.targetCalories
  const targetCalories =
    manualTargetCalories && manualTargetCalories > 0
      ? clampManualTargetCalories(manualTargetCalories, input.userProfile)
      : clampGoalAdjustedCalories(
          baselineExpenditure + recordedExerciseCalories,
          input.userProfile,
        )
  const consumedCalories = input.log.summary.totalCaloriesConsumed ?? 0
  const macroTargets = buildMacroTargets(targetCalories, input.userProfile)
  const consumedMacros = input.log.summary.macros ?? {
    carbs: 0,
    protein: 0,
    fat: 0,
  }
  const snapshotWithoutSummary = {
    date: input.log.date,
    baselineExpenditure: Math.round(baselineExpenditure),
    recordedExerciseCalories: Math.round(recordedExerciseCalories),
    targetCalories,
    consumedCalories: Math.round(consumedCalories),
    remainingCalories: Math.round(targetCalories - consumedCalories),
    macroTargets,
    remainingMacros: {
      protein: clampRemaining(macroTargets.protein - (consumedMacros.protein ?? 0)),
      carbohydrates: clampRemaining(
        macroTargets.carbohydrates - (consumedMacros.carbs ?? 0),
      ),
      fat: clampRemaining(macroTargets.fat - (consumedMacros.fat ?? 0)),
    },
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
