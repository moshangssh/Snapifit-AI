import type { DailyStatus } from "@/lib/types"

export type StatusScoreKey = "stress" | "mood" | "health" | "sleepQuality"

export const STATUS_LEVEL_TEXT: Record<number, string> = {
  1: "很差",
  2: "较差",
  3: "一般",
  4: "良好",
  5: "很好",
  6: "极佳",
}

export const STATUS_SCORE_ITEMS: Array<{ key: StatusScoreKey; label: string }> = [
  { key: "stress", label: "压力" },
  { key: "mood", label: "心情" },
  { key: "health", label: "健康" },
  { key: "sleepQuality", label: "睡眠质量" },
]

export const STATUS_SCORE_MAX = 6

export function getStatusScore(status: DailyStatus | undefined, key: StatusScoreKey): number {
  const raw = Number(status?.[key] ?? 0)
  return Math.min(Math.max(raw, 0), STATUS_SCORE_MAX)
}
