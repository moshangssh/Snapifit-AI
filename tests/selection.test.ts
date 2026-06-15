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

  it("selects one AS core movement from each focus dimension", () => {
    const upperAS = selectASCore({ focus: "upper", count: 2, offset: 0 })
    const lowerAS = selectASCore({ focus: "lower", count: 2, offset: 0 })

    expect(upperAS.map((exercise) => exercise.name)).toEqual([
      "手臂环绕",
      "坐姿肩外旋",
    ])
    expect(lowerAS.map((exercise) => exercise.name)).toEqual([
      "弓步拉伸",
      "站立前屈",
    ])
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

  it("handles rotation with heavy blacklisting by skipping to available exercises", () => {
    const chestExercises = selectExercises({
      muscle: "CHEST",
      tags: ["NOVICE_CORE"],
      pool: STRENGTH_EXERCISES,
    })

    // 只拉黑前 2 个，确保至少还剩 1 个可选
    const blacklistFirst2 = chestExercises.slice(0, 2).map((ex) => ex.id)
    const [selected] = selectExercises({
      muscle: "CHEST",
      tags: ["NOVICE_CORE"],
      pool: STRENGTH_EXERCISES,
      count: 1,
      blacklist: blacklistFirst2,
      offset: 0,
    })

    expect(selected).toBeDefined()
    expect(blacklistFirst2).not.toContain(selected.id)
  })
})
