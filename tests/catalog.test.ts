import { describe, expect, it } from "vitest"
import {
  ALL_EXERCISES,
  STRENGTH_EXERCISES,
  findVariants,
  getASCoreExercises,
  getExercisesByMuscle,
  getExercisesByPhase,
  resolveMuscleKeys,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import { TEMPLATE_MUSCLE_GROUPS as NOVICE_TEMPLATE_MUSCLES } from "@/lib/workout/engine/novice-engine"
import { TEMPLATE_MUSCLE_GROUPS as INTERMEDIATE_TEMPLATE_MUSCLES } from "@/lib/workout/engine/intermediate-engine"
import { TEMPLATE_MUSCLE_GROUPS as ADVANCED_TEMPLATE_MUSCLES } from "@/lib/workout/engine/advanced-engine"

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

    // Novice phase core exercises: 21 after promoting 钢索髋关节外展 (cable hip
    // abduction) to NOVICE_CORE so 下A/下B can fill 2 main glute slots + 1 warmup
    // activation without duplicating a main lift. (issue #47 follow-up)
    expect(novice).toHaveLength(21)
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

  it.each([
    { phase: "novice", muscles: NOVICE_TEMPLATE_MUSCLES },
    { phase: "intermediate", muscles: INTERMEDIATE_TEMPLATE_MUSCLES },
    { phase: "advanced", muscles: ADVANCED_TEMPLATE_MUSCLES },
  ] as const)(
    "provides at least one $phase exercise for every muscle group its templates reference",
    ({ phase, muscles }) => {
      // Every template slot is filled by matching exercise.primaryMuscle within
      // the phase pool. A referenced muscle group with zero matches makes the
      // engine silently fall back to an arbitrary exercise — e.g. the advanced
      // 肌肥大下 HAMSTRINGS slot and 耐力下 CALVES slot used to grab whatever was
      // left because every leg curl / calf raise was mislabeled QUADS. (issue #47)
      const pool = getExercisesByPhase(phase)
      const uncovered = [...new Set<MuscleGroup>(muscles)].filter(
        (muscle) => !pool.some((exercise) => exercise.primaryMuscle === muscle),
      )

      expect(uncovered).toEqual([])
    },
  )
})

describe("resolveMuscleKeys", () => {
  const byPattern = (pattern: string) =>
    STRENGTH_EXERCISES.find((exercise) => exercise.movementPattern === pattern)!
  const byNameEn = (nameEn: string) =>
    STRENGTH_EXERCISES.find((exercise) => exercise.nameEn === nameEn)!

  it("maps lateral raises to the side deltoid (中束) instead of the front deltoid", () => {
    const lateralRaise = byPattern("lateral_raise")
    expect(lateralRaise.primaryMuscle).toBe("SHOULDERS")
    expect(resolveMuscleKeys(lateralRaise)).toEqual(["side-deltoids"])
  })

  it("maps face pulls and reverse flyes to the rear deltoid (后束)", () => {
    const facePull = byPattern("rear_delt")
    expect(resolveMuscleKeys(facePull)).toEqual(["back-deltoids"])
    // Machine Reverse Flyes targets the rear delt — its guide says as much.
    expect(resolveMuscleKeys(byNameEn("Machine Reverse Flyes"))).toEqual([
      "back-deltoids",
    ])
  })

  it("keeps presses and other shoulder work on the front deltoid (前束)", () => {
    const press = STRENGTH_EXERCISES.find(
      (exercise) =>
        exercise.primaryMuscle === "SHOULDERS" &&
        exercise.movementPattern === "vertical_push",
    )!
    expect(resolveMuscleKeys(press)).toEqual(["front-deltoids"])
  })

  it("resolves non-shoulder muscles through the muscle map", () => {
    expect(resolveMuscleKeys(byPattern("leg_curl"))).toEqual(["hamstrings"])
    expect(resolveMuscleKeys(byPattern("calf_raise"))).toEqual(["calves"])
  })
})
