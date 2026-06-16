import { describe, expect, it } from "vitest"
import {
  DEFAULT_TRAINING_STATE,
  readTrainingState,
  recordCompletedTrainingSession,
  setExerciseBlacklisted,
  TRAINING_STATE_STORAGE_KEY,
  writeTrainingState,
} from "@/lib/workout/engine/training-state"

function createStorage() {
  const items = new Map<string, string>()

  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
    removeItem: (key: string) => {
      items.delete(key)
    },
    clear: () => {
      items.clear()
    },
    key: (index: number) => Array.from(items.keys())[index] ?? null,
    get length() {
      return items.size
    },
  } satisfies Storage
}

describe("training state storage", () => {
  it("persists completed session count in localStorage-compatible storage", () => {
    const storage = createStorage()
    const nextState = {
      ...recordCompletedTrainingSession(DEFAULT_TRAINING_STATE),
      blacklistedExerciseIds: ["exercise-a", "exercise-b"],
    }

    writeTrainingState(nextState, storage)

    expect(JSON.parse(storage.getItem(TRAINING_STATE_STORAGE_KEY) ?? "{}")).toEqual(
      {
        phase: "novice",
        completedSessionCount: 1,
        blacklistedExerciseIds: ["exercise-a", "exercise-b"],
      },
    )
    expect(readTrainingState(storage)).toEqual(nextState)
  })

  it("adds and removes blacklisted exercise ids without duplicates", () => {
    const withExercise = setExerciseBlacklisted(
      DEFAULT_TRAINING_STATE,
      "exercise-a",
      true,
    )
    const deduped = setExerciseBlacklisted(withExercise, "exercise-a", true)
    const removed = setExerciseBlacklisted(deduped, "exercise-a", false)

    expect(withExercise.blacklistedExerciseIds).toEqual(["exercise-a"])
    expect(deduped.blacklistedExerciseIds).toEqual(["exercise-a"])
    expect(removed.blacklistedExerciseIds).toEqual([])
  })

  it("falls back to novice state when stored data is missing or invalid", () => {
    const storage = createStorage()
    storage.setItem(TRAINING_STATE_STORAGE_KEY, "{")

    expect(readTrainingState(storage)).toEqual(DEFAULT_TRAINING_STATE)
  })
})
