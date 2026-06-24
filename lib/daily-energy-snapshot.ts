import type { DailyLog, UserProfile } from "@/lib/types"
import { calculateMetabolicRates } from "@/lib/health-utils"

export type DailyEnergySnapshotState =
  | "deficit"
  | "balanced"
  | "surplus"
  | "no-record"
  | "missing-config"

export interface DailyEnergySnapshot {
  date: string
  baselineExpenditure: number
  recordedExerciseCalories: number
  maintenanceCalories: number
  budgetCalories: number
  consumedCalories: number
  remainingBudgetCalories: number
  macroTargets: {
    protein: number
    carbohydrates: number
    fat: number
  }
  remainingMacros: {
    protein: number
    carbohydrates: number
    fat: number
  }
  calorieDelta: number
  state: DailyEnergySnapshotState
  confidence: "high" | "low"
  missing: string[]
  metabolicHint?: {
    factors: string[]
    estimatedEffectCalories: number
    confidence: "low"
    warning: string
  }
}

const BALANCE_THRESHOLD_KCAL = 20
const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  lose_weight: -400,
  maintain: 0,
  gain_weight: 250,
  build_muscle: 250,
  improve_health: -150,
}
const PROTEIN_GRAMS_PER_KG: Record<string, number> = {
  lose_weight: 1.8,
  maintain: 1.6,
  gain_weight: 1.7,
  build_muscle: 1.9,
  improve_health: 1.6,
}

function getSafetyFloor(userProfile: UserProfile): number {
  if (userProfile.gender === "female") {
    return 1200
  }

  return 1500
}

function buildBudgetCalories(input: {
  maintenanceCalories: number
  userProfile: UserProfile
}): number {
  const manualTargetCalories = input.userProfile.targetCalories

  if (manualTargetCalories && manualTargetCalories > 0) {
    return Math.max(
      Math.round(manualTargetCalories),
      getSafetyFloor(input.userProfile),
    )
  }

  const adjustment = GOAL_CALORIE_ADJUSTMENT[input.userProfile.goal] ?? 0
  const adjusted = Math.round(input.maintenanceCalories + adjustment)
  const floored = Math.max(adjusted, getSafetyFloor(input.userProfile))

  if (input.userProfile.goal === "lose_weight") {
    return Math.min(floored, Math.round(input.maintenanceCalories))
  }

  return floored
}

function buildMacroTargets(budgetCalories: number, userProfile: UserProfile) {
  const proteinPerKg =
    PROTEIN_GRAMS_PER_KG[userProfile.goal] ?? PROTEIN_GRAMS_PER_KG.maintain
  const protein = Math.round(userProfile.weight * proteinPerKg)
  const fat = Math.max(
    Math.round((budgetCalories * 0.22) / 9),
    Math.round(userProfile.weight * 0.6),
  )
  const caloriesAfterProteinAndFat = Math.max(
    0,
    budgetCalories - protein * 4 - fat * 9,
  )
  const carbohydrates = Math.round(caloriesAfterProteinAndFat / 4)

  return { protein, carbohydrates, fat }
}

function clampRemaining(value: number): number {
  return Math.max(0, Math.round(value))
}

function buildMetabolicHint(log: DailyLog): DailyEnergySnapshot["metabolicHint"] {
  if (!log.tefAnalysis) return undefined

  return {
    factors: log.tefAnalysis.enhancementFactors,
    estimatedEffectCalories: Math.max(
      0,
      Math.round(log.tefAnalysis.enhancedTEF - log.tefAnalysis.baseTEF),
    ),
    confidence: "low",
    warning: "AI 代谢提示仅作解释,不改变今日维持热量或今日热量预算",
  }
}

export function buildDailyEnergySnapshot(input: {
  log: DailyLog
  userProfile: UserProfile
  now: Date
}): DailyEnergySnapshot {
  const inferredRates = calculateMetabolicRates(input.userProfile, {
    weight: input.log.weight,
  })
  const baselineExpenditure =
    input.log.baselineExpenditure ??
    inferredRates?.baselineExpenditure ??
    input.log.calculatedTDEE ??
    0
  const recordedExerciseCalories =
    input.log.summary.totalCaloriesBurned ?? 0
  const consumedCalories = input.log.summary.totalCaloriesConsumed ?? 0
  const maintenanceCalories = baselineExpenditure + recordedExerciseCalories
  const budgetCalories = buildBudgetCalories({
    maintenanceCalories,
    userProfile: input.userProfile,
  })
  const macroTargets = buildMacroTargets(budgetCalories, input.userProfile)
  const consumedMacros = input.log.summary.macros ?? {
    carbs: 0,
    protein: 0,
    fat: 0,
  }
  const calorieDelta = consumedCalories - maintenanceCalories
  const roundedDelta = Math.round(calorieDelta)
  const missing = baselineExpenditure > 0 ? [] : ["基础配置"]
  const state =
    missing.length > 0
      ? "missing-config"
      : consumedCalories === 0 && recordedExerciseCalories === 0
      ? "no-record"
      : Math.abs(roundedDelta) <= BALANCE_THRESHOLD_KCAL
        ? "balanced"
        : roundedDelta < 0
          ? "deficit"
          : "surplus"

  return {
    date: input.log.date,
    baselineExpenditure: Math.round(baselineExpenditure),
    recordedExerciseCalories: Math.round(recordedExerciseCalories),
    maintenanceCalories: Math.round(maintenanceCalories),
    budgetCalories,
    consumedCalories: Math.round(consumedCalories),
    remainingBudgetCalories: Math.round(budgetCalories - consumedCalories),
    macroTargets,
    remainingMacros: {
      protein: clampRemaining(macroTargets.protein - (consumedMacros.protein ?? 0)),
      carbohydrates: clampRemaining(
        macroTargets.carbohydrates - (consumedMacros.carbs ?? 0),
      ),
      fat: clampRemaining(macroTargets.fat - (consumedMacros.fat ?? 0)),
    },
    calorieDelta: roundedDelta,
    state,
    confidence: missing.length > 0 ? "low" : "high",
    missing,
    metabolicHint: buildMetabolicHint(input.log),
  }
}
