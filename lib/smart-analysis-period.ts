import { format, parseISO, subDays } from "date-fns"
import type { DailyLog } from "@/lib/types"

export type PeriodAnalysisRange = "7d" | "30d"

export interface PeriodAnalysisRequirement {
  days: number
  minDataDays: number
  label: string
}

export interface PeriodDailyRecord {
  date: string
  calories: number
  exercise: number
  protein: number
  carbs: number
  fat: number
  energyBalance: number | null
  weight?: number
  foodNames: string[]
  exerciseNames: string[]
  hasDailyStatus: boolean
}

export interface PeriodAnalysisSummary {
  range: PeriodAnalysisRange
  label: string
  startDate: string
  endDate: string
  totalDays: number
  dataDays: number
  minDataDays: number
  averages: {
    calories: number
    exercise: number
    protein: number
    carbs: number
    fat: number
    energyBalance: number | null
  }
  totals: {
    calories: number
    exercise: number
    protein: number
  }
  weightTrend: {
    startWeight: number | null
    endWeight: number | null
    change: number | null
  }
  dailyRecords: PeriodDailyRecord[]
}

const PERIOD_REQUIREMENTS: Record<PeriodAnalysisRange, PeriodAnalysisRequirement> = {
  "7d": { days: 7, minDataDays: 3, label: "7天复盘" },
  "30d": { days: 30, minDataDays: 14, label: "30天趋势" },
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return roundOneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function sum(values: number[]): number {
  return roundOneDecimal(values.reduce((total, value) => total + value, 0))
}

function getTotalExpenditure(log: DailyLog): number | null {
  const baseline = log.baselineExpenditure ?? log.calculatedTDEE
  if (!baseline) return null
  return baseline + (log.summary?.totalCaloriesBurned ?? 0)
}

function buildDailyRecord(log: DailyLog): PeriodDailyRecord {
  const totalExpenditure = getTotalExpenditure(log)
  const calories = log.summary?.totalCaloriesConsumed ?? 0

  return {
    date: log.date,
    calories,
    exercise: log.summary?.totalCaloriesBurned ?? 0,
    protein: log.summary?.macros?.protein ?? 0,
    carbs: log.summary?.macros?.carbs ?? 0,
    fat: log.summary?.macros?.fat ?? 0,
    energyBalance:
      totalExpenditure === null ? null : roundOneDecimal(calories - totalExpenditure),
    weight: log.weight,
    foodNames: log.foodEntries.map((entry) => entry.food_name).slice(0, 6),
    exerciseNames: log.exerciseEntries.map((entry) => entry.exercise_name).slice(0, 4),
    hasDailyStatus: Boolean(log.dailyStatus),
  }
}

export function getPeriodAnalysisRequirement(
  range: PeriodAnalysisRange,
): PeriodAnalysisRequirement {
  return PERIOD_REQUIREMENTS[range]
}

export function getPeriodAnalysisDateKeys(
  range: PeriodAnalysisRange,
  endDate: string,
): string[] {
  const { days } = getPeriodAnalysisRequirement(range)
  const end = parseISO(endDate)

  return Array.from({ length: days }, (_, index) => {
    const daysAgo = days - 1 - index
    return format(subDays(end, daysAgo), "yyyy-MM-dd")
  })
}

export function hasPeriodAnalysisData(log: DailyLog | null | undefined): log is DailyLog {
  if (!log) return false
  return Boolean(
    log.foodEntries?.length ||
      log.exerciseEntries?.length ||
      log.weight !== undefined ||
      log.dailyStatus,
  )
}

export function buildPeriodAnalysisSummary(input: {
  range: PeriodAnalysisRange
  endDate: string
  logs: DailyLog[]
}): PeriodAnalysisSummary {
  const requirement = getPeriodAnalysisRequirement(input.range)
  const dateKeys = getPeriodAnalysisDateKeys(input.range, input.endDate)
  const allowedDates = new Set(dateKeys)
  const dailyRecords = input.logs
    .filter((log) => allowedDates.has(log.date))
    .filter(hasPeriodAnalysisData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(buildDailyRecord)

  const weights = dailyRecords
    .filter((record) => record.weight !== undefined)
    .map((record) => ({ date: record.date, weight: record.weight as number }))
  const energyBalances = dailyRecords
    .map((record) => record.energyBalance)
    .filter((value): value is number => value !== null)

  return {
    range: input.range,
    label: requirement.label,
    startDate: dateKeys[0],
    endDate: dateKeys[dateKeys.length - 1],
    totalDays: requirement.days,
    dataDays: dailyRecords.length,
    minDataDays: requirement.minDataDays,
    averages: {
      calories: average(dailyRecords.map((record) => record.calories)),
      exercise: average(dailyRecords.map((record) => record.exercise)),
      protein: average(dailyRecords.map((record) => record.protein)),
      carbs: average(dailyRecords.map((record) => record.carbs)),
      fat: average(dailyRecords.map((record) => record.fat)),
      energyBalance: energyBalances.length > 0 ? average(energyBalances) : null,
    },
    totals: {
      calories: sum(dailyRecords.map((record) => record.calories)),
      exercise: sum(dailyRecords.map((record) => record.exercise)),
      protein: sum(dailyRecords.map((record) => record.protein)),
    },
    weightTrend: {
      startWeight: weights[0]?.weight ?? null,
      endWeight: weights[weights.length - 1]?.weight ?? null,
      change:
        weights.length >= 2
          ? roundOneDecimal(weights[weights.length - 1].weight - weights[0].weight)
          : null,
    },
    dailyRecords,
  }
}
