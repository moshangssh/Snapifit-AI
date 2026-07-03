import type { ExerciseEntry } from "@/lib/types"

/**
 * workout: log_id 前缀格式的唯一定义处(issue #100)。训练 session 落到
 * DailyLog 的运动条目以 `workout:${sessionId}:${exerciseId}` 为 log_id,
 * 生成(session 完成入账)与识别(写入核心按 session 去重)都从这里导入,
 * 格式不再散落多处。无运行时依赖的叶子模块,纯核心可安全引用。
 */

function workoutSessionEntryLogIdPrefix(sessionId: string): string {
  return `workout:${sessionId}:`
}

export function getWorkoutExerciseEntryLogId(
  sessionId: string,
  exerciseId: string,
): string {
  return `${workoutSessionEntryLogIdPrefix(sessionId)}${exerciseId}`
}

export function isWorkoutSessionEntry(
  entry: ExerciseEntry,
  sessionId: string,
): boolean {
  return entry.log_id.startsWith(workoutSessionEntryLogIdPrefix(sessionId))
}
