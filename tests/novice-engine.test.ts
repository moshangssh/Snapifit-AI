import { describe, expect, it } from "vitest"
import { AS_CORE_EXERCISES } from "@/lib/workout/engine/catalog"
import { generateSession } from "@/lib/workout/engine/novice-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"

function makeState(completedSessionCount: number): TrainingState {
  return {
    phase: "novice",
    completedSessionCount,
    blacklistedExerciseIds: [],
  }
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

  it("puts two AS core movements in warmup with upper or lower focus", () => {
    const asCoreById = new Map(
      AS_CORE_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    const upperSession = generateSession(makeState(0))
    const lowerSession = generateSession(makeState(1))

    const upperWarmupAS = upperSession.exercises
      .filter((exercise) => exercise.phase === "warmup")
      .map((exercise) =>
        exercise.catalogExerciseId
          ? asCoreById.get(exercise.catalogExerciseId)
          : undefined,
      )
      .filter(Boolean)
    const lowerWarmupAS = lowerSession.exercises
      .filter((exercise) => exercise.phase === "warmup")
      .map((exercise) =>
        exercise.catalogExerciseId
          ? asCoreById.get(exercise.catalogExerciseId)
          : undefined,
      )
      .filter(Boolean)

    expect(upperWarmupAS).toHaveLength(2)
    expect(upperWarmupAS.map((exercise) => exercise?.primaryMuscle)).toEqual([
      "SHOULDERS",
      "SHOULDERS",
    ])
    expect(lowerWarmupAS).toHaveLength(2)
    expect(lowerWarmupAS.map((exercise) => exercise?.primaryMuscle)).toEqual([
      "QUADS",
      "GLUTES",
    ])
  })
})
