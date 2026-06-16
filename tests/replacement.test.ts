import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { findReplacement } from "@/lib/workout/engine/replacement"

describe("exercise replacement", () => {
  it("falls back to intermediate variants when the novice core pool is exhausted", () => {
    const original = STRENGTH_EXERCISES.find(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "CHEST" &&
        exercise.mechanics === "COMPOUND" &&
        exercise.equipment === "MACHINE",
    )
    const noviceCore = STRENGTH_EXERCISES.filter((exercise) =>
      exercise.tags.includes("NOVICE_CORE"),
    )
    const exhaustedNoviceChestCompounds = noviceCore
      .filter(
        (exercise) =>
          exercise.primaryMuscle === original?.primaryMuscle &&
          exercise.mechanics === original?.mechanics,
      )
      .map((exercise) => exercise.id)

    expect(original).toBeTruthy()

    const replacement = original
      ? findReplacement(original, noviceCore, exhaustedNoviceChestCompounds)
      : undefined

    expect(replacement?.primaryMuscle).toBe(original?.primaryMuscle)
    expect(replacement?.mechanics).toBe(original?.mechanics)
    expect(replacement?.tags).toContain("INTERMEDIATE_VARIANT")
  })
})
