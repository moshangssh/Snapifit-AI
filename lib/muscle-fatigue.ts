import { MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"
import type { DailyLog } from "@/lib/types"

export type FatigueState = {
  intensity: 0 | 30 | 60 | 100
  daysAgo: 0 | 1 | 2 | null
  lastExerciseName: string | null
}

export type MuscleFatigueMap = Partial<Record<MuscleKey, FatigueState>>

const INTENSITY_BY_DAYS: Record<0 | 1 | 2, 100 | 60 | 30> = {
  0: 100,
  1: 60,
  2: 30,
}

/**
 * logsByDaysAgo[0] = 基准日, [1] = 前一日, [2] = 前二日。
 * 日期由近到远遍历,同肌群首次命中即采用,实现"取最近一次"。
 * 忽略不在 MUSCLE_KEY_SET 中的旧数据(spec 决策 #8)。
 */
export function computeMuscleFatigue(
  logsByDaysAgo: Array<DailyLog | null>,
): MuscleFatigueMap {
  const result: MuscleFatigueMap = {}

  for (let daysAgo = 0; daysAgo <= 2; daysAgo++) {
    const log = logsByDaysAgo[daysAgo]
    if (!log?.exerciseEntries) continue

    for (const entry of log.exerciseEntries) {
      if (!entry.muscle_groups) continue
      for (const raw of entry.muscle_groups) {
        if (!MUSCLE_KEY_SET.has(raw)) continue
        const key = raw as MuscleKey
        if (result[key]) continue

        result[key] = {
          intensity: INTENSITY_BY_DAYS[daysAgo as 0 | 1 | 2],
          daysAgo: daysAgo as 0 | 1 | 2,
          lastExerciseName: entry.exercise_name,
        }
      }
    }
  }

  return result
}
