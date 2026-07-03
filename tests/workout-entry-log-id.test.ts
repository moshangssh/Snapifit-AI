import { describe, expect, it } from "vitest"
import {
  getWorkoutExerciseEntryLogId,
  isWorkoutSessionEntry,
} from "@/lib/workout/entry-log-id"
import type { ExerciseEntry } from "@/lib/types"

// workout: log_id 前缀格式的唯一叶子模块(issue #100)。核心契约是往返一致:
// isWorkoutSessionEntry 必须识别 getWorkoutExerciseEntryLogId 生成的 ID——
// 生成器与谓词同源,格式改动不可能只改其一造成静默漂移。

function exerciseEntry(log_id: string): ExerciseEntry {
  return {
    log_id,
    exercise_name: "卧推",
    exercise_type: "strength",
    duration_minutes: 12,
    estimated_mets: 6,
    user_weight: 70,
    calories_burned_estimated: 88,
    is_estimated: true,
  }
}

describe("workout entry log_id", () => {
  it("recognizes entries whose log_id it generated for the same session", () => {
    const logId = getWorkoutExerciseEntryLogId("session-1", "bench")

    expect(isWorkoutSessionEntry(exerciseEntry(logId), "session-1")).toBe(true)
  })

  it("rejects entries from other sessions and manual entries", () => {
    const otherSession = exerciseEntry(getWorkoutExerciseEntryLogId("session-2", "squat"))
    const manual = exerciseEntry("manual-entry")

    expect(isWorkoutSessionEntry(otherSession, "session-1")).toBe(false)
    expect(isWorkoutSessionEntry(manual, "session-1")).toBe(false)
  })
})
