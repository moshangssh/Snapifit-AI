import { describe, expect, it } from "vitest"
import {
  AS_CORE_EXERCISES,
  STRENGTH_EXERCISES,
} from "@/lib/workout/engine/catalog"
import { selectASCore, selectExercises } from "@/lib/workout/engine/selection"

describe("workout exercise selection", () => {
  it("selects exercises by muscle and tags from the provided pool", () => {
    const chestExercises = selectExercises({
      muscle: "CHEST",
      tags: ["NOVICE_CORE"],
      pool: STRENGTH_EXERCISES,
    })

    expect(chestExercises).toHaveLength(3)
    expect(
      chestExercises.every(
        (exercise) =>
          exercise.primaryMuscle === "CHEST" &&
          exercise.tags.includes("NOVICE_CORE"),
      ),
    ).toBe(true)
  })

  it("rotates selection by offset and excludes blocked exercise ids", () => {
    const [firstChest] = selectExercises({
      muscle: "CHEST",
      tags: ["NOVICE_CORE"],
      pool: STRENGTH_EXERCISES,
      count: 1,
    })
    const [rotatedChest] = selectExercises({
      muscle: "CHEST",
      tags: ["NOVICE_CORE"],
      pool: STRENGTH_EXERCISES,
      count: 1,
      offset: 1,
      excludeIds: [firstChest.id],
    })

    expect(rotatedChest.id).not.toBe(firstChest.id)
  })

  it("selects AS core exercises by upper or lower focus", () => {
    const upperAS = selectASCore({ focus: "upper" })
    const lowerAS = selectASCore({ focus: "lower" })

    expect(upperAS).toHaveLength(2)
    expect(
      upperAS.every((exercise) =>
        ["SHOULDERS", "BACK"].includes(exercise.primaryMuscle),
      ),
    ).toBe(true)
    expect(lowerAS).toHaveLength(2)
    expect(
      lowerAS.every((exercise) =>
        ["QUADS", "GLUTES"].includes(exercise.primaryMuscle),
      ),
    ).toBe(true)
  })

  it("does not return blacklisted AS core exercises", () => {
    const [blacklisted] = AS_CORE_EXERCISES
    const selected = selectASCore({
      focus: "upper",
      blacklist: [blacklisted.id],
    })

    expect(selected.map((exercise) => exercise.id)).not.toContain(
      blacklisted.id,
    )
  })
})
