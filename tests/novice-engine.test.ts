import { describe, expect, it } from "vitest"
import {
  AS_CORE_EXERCISES,
  STRENGTH_EXERCISES,
} from "@/lib/workout/engine/catalog"
import { generateSession } from "@/lib/workout/engine/novice-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import { AS_DIMENSIONS } from "@/tests/fixtures/as-dimensions"

function makeState(
  completedSessionCount: number,
  blacklistedExerciseIds: string[] = [],
): TrainingState {
  return {
    phase: "novice",
    completedSessionCount,
    blacklistedExerciseIds,
  }
}

function asCoreNames(
  session: ReturnType<typeof generateSession>,
  phase: "warmup" | "cooldown",
): string[] {
  const asCoreIds = new Set(AS_CORE_EXERCISES.map((exercise) => exercise.id))

  return session.exercises
    .filter(
      (exercise) =>
        exercise.phase === phase &&
        exercise.catalogExerciseId &&
        asCoreIds.has(exercise.catalogExerciseId),
    )
    .map((exercise) => exercise.plannedExerciseName)
}

describe("novice workout engine", () => {
  it("rotates through the four novice templates by completed session count", () => {
    const sessions = [0, 1, 2, 3, 4].map((count) =>
      generateSession(makeState(count)),
    )

    expect(sessions.map((session) => session.templateIndex)).toEqual([
      0, 1, 2, 3, 0,
    ])
    expect(sessions.map((session) => session.templateName)).toEqual([
      "上A",
      "下A",
      "上B",
      "下B",
      "上A",
    ])

    for (const session of sessions) {
      const warmup = session.exercises.filter(
        (exercise) => exercise.phase === "warmup",
      )
      const main = session.exercises.filter(
        (exercise) => exercise.phase === "main",
      )
      const cooldown = session.exercises.filter(
        (exercise) => exercise.phase === "cooldown",
      )

      expect(session.phase).toBe("novice")
      expect(session.exercises.length).toBeGreaterThanOrEqual(12)
      expect(session.exercises.length).toBeLessThanOrEqual(13)
      expect(warmup).toHaveLength(4)
      expect(main.length).toBeGreaterThanOrEqual(4)
      expect(main.length).toBeLessThanOrEqual(5)
      expect(cooldown).toHaveLength(4)
    }
  })

  it("prescribes three sets of ten reps for every main exercise", () => {
    const session = generateSession(makeState(1))
    const mainExercises = session.exercises.filter(
      (exercise) => exercise.phase === "main",
    )

    expect(mainExercises.length).toBeGreaterThanOrEqual(4)
    for (const exercise of mainExercises) {
      expect(exercise.sets).toHaveLength(3)
      expect(exercise.sets.map((set) => set.plannedReps)).toEqual([
        10, 10, 10,
      ])
    }
  })

  it("rotates exercises within the same template across cycles", () => {
    const firstUpperA = generateSession(makeState(0))
    const secondUpperA = generateSession(makeState(4))

    expect(firstUpperA.templateName).toBe("上A")
    expect(secondUpperA.templateName).toBe("上A")
    expect(
      firstUpperA.exercises.map((exercise) => exercise.catalogExerciseId),
    ).not.toEqual(
      secondUpperA.exercises.map((exercise) => exercise.catalogExerciseId),
    )
  })

  it("keeps upper and lower templates on their intended main muscles", () => {
    const strengthById = new Map(
      STRENGTH_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    const upperA = generateSession(makeState(0))
    const lowerA = generateSession(makeState(1))

    const upperMainMuscles = upperA.exercises
      .filter((exercise) => exercise.phase === "main")
      .map((exercise) =>
        exercise.catalogExerciseId
          ? strengthById.get(exercise.catalogExerciseId)?.primaryMuscle
          : undefined,
      )
    const lowerMainMuscles = lowerA.exercises
      .filter((exercise) => exercise.phase === "main")
      .map((exercise) =>
        exercise.catalogExerciseId
          ? strengthById.get(exercise.catalogExerciseId)?.primaryMuscle
          : undefined,
      )

    expect(upperMainMuscles).toContain("CHEST")
    expect(upperMainMuscles).toEqual(
      expect.arrayContaining(["SHOULDERS", "TRICEPS", "BICEPS"]),
    )
    expect(lowerMainMuscles).toEqual(
      expect.arrayContaining(["QUADS", "GLUTES", "CORE"]),
    )
  })

  it("puts two AS core movements in warmup and cooldown with upper or lower focus", () => {
    const asCoreById = new Map(
      AS_CORE_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    const upperSession = generateSession(makeState(0))
    const lowerSession = generateSession(makeState(1))

    const upperAS = upperSession.exercises
      .filter(
        (exercise) =>
          exercise.phase === "warmup" || exercise.phase === "cooldown",
      )
      .map((exercise) =>
        exercise.catalogExerciseId
          ? asCoreById.get(exercise.catalogExerciseId)
          : undefined,
      )
      .filter(Boolean)
    const lowerAS = lowerSession.exercises
      .filter(
        (exercise) =>
          exercise.phase === "warmup" || exercise.phase === "cooldown",
      )
      .map((exercise) =>
        exercise.catalogExerciseId
          ? asCoreById.get(exercise.catalogExerciseId)
          : undefined,
      )
      .filter(Boolean)

    expect(upperAS).toHaveLength(4)
    expect(upperAS.map((exercise) => exercise?.primaryMuscle)).toEqual(
      expect.arrayContaining(["SHOULDERS", "BACK"]),
    )
    expect(
      upperAS.every((exercise) =>
        ["SHOULDERS", "BACK"].includes(exercise?.primaryMuscle ?? ""),
      ),
    ).toBe(true)
    expect(lowerAS).toHaveLength(4)
    expect(lowerAS.map((exercise) => exercise?.primaryMuscle)).toEqual(
      expect.arrayContaining(["QUADS", "GLUTES"]),
    )
    expect(
      lowerAS.every((exercise) =>
        ["QUADS", "GLUTES"].includes(exercise?.primaryMuscle ?? ""),
      ),
    ).toBe(true)
  })

  it("embeds the expected AS dimensions in every warmup and cooldown", () => {
    const sessions = [0, 1, 2, 3].map((count) =>
      generateSession(makeState(count)),
    )

    for (const session of sessions) {
      const expectedDimensions =
        session.templateName === "上A" || session.templateName === "上B"
          ? [AS_DIMENSIONS.upperThoracic, AS_DIMENSIONS.upperScapular]
          : [AS_DIMENSIONS.lowerHip, AS_DIMENSIONS.lowerSpine]

      for (const phase of ["warmup", "cooldown"] as const) {
        const names = asCoreNames(session, phase)

        expect(names).toHaveLength(2)
        for (const dimension of expectedDimensions) {
          expect(names.some((name) => dimension.includes(name))).toBe(true)
        }
      }
    }
  })

  it("covers all four AS core dimensions across one full template rotation", () => {
    const asNames = [0, 1, 2, 3].flatMap((count) => {
      const session = generateSession(makeState(count))
      return [
        ...asCoreNames(session, "warmup"),
        ...asCoreNames(session, "cooldown"),
      ]
    })

    expect(
      AS_DIMENSIONS.upperThoracic.some((name) => asNames.includes(name)),
    ).toBe(true)
    expect(
      AS_DIMENSIONS.upperScapular.some((name) => asNames.includes(name)),
    ).toBe(true)
    expect(AS_DIMENSIONS.lowerHip.some((name) => asNames.includes(name))).toBe(
      true,
    )
    expect(
      AS_DIMENSIONS.lowerSpine.some((name) => asNames.includes(name)),
    ).toBe(true)
  })

  it("excludes blacklisted catalog exercises from generated sessions", () => {
    const blacklistedExerciseId = "81112d74-4711-4ddc-9145-a610bf8407c8"
    const session = generateSession(makeState(0, [blacklistedExerciseId]))

    expect(
      session.exercises.map((exercise) => exercise.catalogExerciseId),
    ).not.toContain(blacklistedExerciseId)
  })

  it("does not select duplicate exercises between warmup and main phases", () => {
    const session = generateSession(makeState(0))
    const warmupIds = session.exercises
      .filter((exercise) => exercise.phase === "warmup")
      .map((exercise) => exercise.catalogExerciseId)
      .filter(Boolean)
    const mainIds = session.exercises
      .filter((exercise) => exercise.phase === "main")
      .map((exercise) => exercise.catalogExerciseId)
      .filter(Boolean)

    const duplicates = warmupIds.filter((id) => mainIds.includes(id))
    expect(duplicates).toHaveLength(0)
  })
})
