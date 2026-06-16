import { describe, expect, it } from "vitest"
import {
  ALL_EXERCISES,
  STRENGTH_EXERCISES,
  findVariants,
  getASCoreExercises,
  getExercisesByMuscle,
  getExercisesByPhase,
} from "@/lib/workout/engine/catalog"

describe("workout exercise catalog", () => {
  it("loads the complete curated catalog with stable ids and required tags", () => {
    // Total catalog size is fixed at 106 exercises for V1
    expect(ALL_EXERCISES).toHaveLength(106)

    // All IDs must be unique
    const ids = new Set(ALL_EXERCISES.map((exercise) => exercise.id))
    expect(ids.size).toBe(ALL_EXERCISES.length)

    // All exercises must have complete metadata
    expect(
      ALL_EXERCISES.every(
        (exercise) =>
          exercise.id &&
          exercise.name &&
          exercise.nameEn &&
          exercise.primaryMuscle &&
          exercise.movementPattern &&
          exercise.angle &&
          exercise.equipment &&
          exercise.mechanics &&
          exercise.laterality &&
          exercise.tags.length > 0,
      ),
    ).toBe(true)
  })

  it("finds variants with the same movement pattern and primary muscle", () => {
    const benchmark = STRENGTH_EXERCISES.find(
      (exercise) => exercise.nameEn === "Floor Dumbbell Press",
    )

    expect(benchmark).toBeDefined()

    const variants = findVariants(benchmark!, STRENGTH_EXERCISES)

    expect(variants.length).toBeGreaterThan(0)
    expect(variants.map((exercise) => exercise.id)).not.toContain(benchmark!.id)
    expect(
      variants.every(
        (exercise) =>
          exercise.movementPattern === benchmark!.movementPattern &&
          exercise.primaryMuscle === benchmark!.primaryMuscle &&
          (exercise.angle !== benchmark!.angle ||
            exercise.equipment !== benchmark!.equipment),
      ),
    ).toBe(true)
  })

  it("excludes requested ids when finding variants", () => {
    const benchmark = STRENGTH_EXERCISES.find(
      (exercise) => exercise.nameEn === "Floor Dumbbell Press",
    )
    const [variant] = findVariants(benchmark!, STRENGTH_EXERCISES)

    const remaining = findVariants(benchmark!, STRENGTH_EXERCISES, [
      variant.id,
    ])

    expect(remaining.map((exercise) => exercise.id)).not.toContain(variant.id)
  })

  it("filters exercises by training phase", () => {
    const novice = getExercisesByPhase("novice")
    const intermediate = getExercisesByPhase("intermediate")
    const advanced = getExercisesByPhase("advanced")

    // Novice phase core exercises are fixed at 20 for Starting Strength style progression
    expect(novice).toHaveLength(20)
    expect(
      novice.every((exercise) => exercise.tags.includes("NOVICE_CORE")),
    ).toBe(true)

    // Intermediate expands beyond novice core
    expect(intermediate.length).toBeGreaterThan(novice.length)
    expect(
      intermediate.every(
        (exercise) =>
          exercise.tags.includes("NOVICE_CORE") ||
          exercise.tags.includes("INTERMEDIATE_VARIANT"),
      ),
    ).toBe(true)

    // Advanced includes all strength exercises
    expect(advanced).toHaveLength(STRENGTH_EXERCISES.length)
  })

  it("filters exercises by primary muscle", () => {
    const chestExercises = getExercisesByMuscle("CHEST")

    expect(chestExercises.length).toBeGreaterThan(0)
    expect(
      chestExercises.every((exercise) => exercise.primaryMuscle === "CHEST"),
    ).toBe(true)
  })

  it("filters AS core exercises by upper or lower focus", () => {
    const upperAS = getASCoreExercises("upper")
    const lowerAS = getASCoreExercises("lower")

    expect(upperAS.length).toBeGreaterThan(0)
    expect(lowerAS.length).toBeGreaterThan(0)
    expect(
      upperAS.every((exercise) =>
        ["SHOULDERS", "BACK"].includes(exercise.primaryMuscle),
      ),
    ).toBe(true)
    expect(
      lowerAS.every((exercise) =>
        ["QUADS", "GLUTES"].includes(exercise.primaryMuscle),
      ),
    ).toBe(true)
  })
})
