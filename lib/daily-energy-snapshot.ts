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
  consumedCalories: number
  calorieDelta: number
  state: DailyEnergySnapshotState
  confidence: "high" | "low"
  missing: string[]
}

const BALANCE_THRESHOLD_KCAL = 20

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
    input.log.calculatedTDEE ??
    inferredRates?.baselineExpenditure ??
    0
  const recordedExerciseCalories =
    input.log.summary.totalCaloriesBurned ?? 0
  const consumedCalories = input.log.summary.totalCaloriesConsumed ?? 0
  const maintenanceCalories = baselineExpenditure + recordedExerciseCalories
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
    consumedCalories: Math.round(consumedCalories),
    calorieDelta: roundedDelta,
    state,
    confidence: missing.length > 0 ? "low" : "high",
    missing,
  }
}
