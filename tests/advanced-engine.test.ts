import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { generateSession } from "@/lib/workout/engine/advanced-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"

function lifetimeBenchmarkIds(): string[] {
  const novice = STRENGTH_EXERCISES.filter((exercise) =>
    exercise.tags.includes("NOVICE_CORE"),
  )
  const byMuscle = new Map(novice.map((exercise) => [exercise.primaryMuscle, exercise]))

  return [
    byMuscle.get("CHEST")?.id,
    byMuscle.get("BACK")?.id,
    byMuscle.get("QUADS")?.id,
    byMuscle.get("SHOULDERS")?.id,
    byMuscle.get("CORE")?.id,
  ].filter((id): id is string => typeof id === "string")
}

function makeState(
  completedSessionCount: number,
  overrides: Partial<TrainingState> = {},
): TrainingState {
  return {
    phase: "advanced",
    completedSessionCount,
    blacklistedExerciseIds: [],
    benchmarkExerciseIds: lifetimeBenchmarkIds(),
    lifetimeBenchmarkIds: lifetimeBenchmarkIds(),
    lastDeloadSession: 240,
    ...overrides,
  }
}

describe("advanced workout engine", () => {
  it("rotates sessions 241-246 through strict DUP templates", () => {
    const sessions = [240, 241, 242, 243, 244, 245].map((count) =>
      generateSession(makeState(count)),
    )

    expect(sessions.map((session) => session.templateName)).toEqual([
      "力量上",
      "力量下",
      "肌肥大上",
      "肌肥大下",
      "耐力上",
      "耐力下",
    ])
    expect(sessions.map((session) => session.templateIndex)).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  it("prescribes strength, hypertrophy, and endurance rep ranges with matching RPE", () => {
    const strength = generateSession(makeState(240))
    const hypertrophy = generateSession(makeState(242))
    const endurance = generateSession(makeState(244))

    expect(
      strength.exercises
        .filter((exercise) => exercise.phase === "main")
        .flatMap((exercise) => exercise.sets.map((set) => set.plannedReps)),
    ).toEqual(expect.arrayContaining([5]))
    expect(strength.exercises.every((exercise) => exercise.notes?.includes("RPE 9")))
      .toBe(true)

    expect(
      hypertrophy.exercises
        .filter((exercise) => exercise.phase === "main")
        .flatMap((exercise) => exercise.sets.map((set) => set.plannedReps)),
    ).toEqual(expect.arrayContaining([12]))
    expect(
      hypertrophy.exercises.every((exercise) => exercise.notes?.includes("RPE 8")),
    ).toBe(true)

    expect(
      endurance.exercises
        .filter((exercise) => exercise.phase === "main")
        .flatMap((exercise) => exercise.sets.map((set) => set.plannedReps)),
    ).toEqual(expect.arrayContaining([20]))
    expect(endurance.exercises.every((exercise) => exercise.notes?.includes("RPE 7")))
      .toBe(true)
  })

  it("places lifetime benchmarks on strength days", () => {
    const lifetimeSet = new Set(lifetimeBenchmarkIds())
    const strengthSessions = [240, 241].map((count) => generateSession(makeState(count)))

    for (const session of strengthSessions) {
      const mainExerciseIds = session.exercises
        .filter((exercise) => exercise.phase === "main")
        .map((exercise) => exercise.catalogExerciseId)

      expect(mainExerciseIds.some((id) => lifetimeSet.has(id ?? ""))).toBe(true)
    }
  })

  it("uses the full strength catalog including advanced pool exercises", () => {
    const generatedExerciseIds = [242, 243, 244, 245].flatMap((count) =>
      generateSession(makeState(count)).exercises.map(
        (exercise) => exercise.catalogExerciseId,
      ),
    )
    const generatedExercises = generatedExerciseIds
      .map((id) => STRENGTH_EXERCISES.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is (typeof STRENGTH_EXERCISES)[number] =>
        exercise !== undefined,
      )

    expect(generatedExercises.some((exercise) => exercise.tags.includes("ADVANCED")))
      .toBe(true)
  })

  it("deloads for six sessions when four muscle groups have fatigue intensity at least sixty", () => {
    const fatigueSnapshot = {
      chest: { intensity: 60, daysAgo: 1, lastExerciseName: "胸" },
      back: { intensity: 60, daysAgo: 1, lastExerciseName: "背" },
      quadriceps: { intensity: 100, daysAgo: 0, lastExerciseName: "腿" },
      glutes: { intensity: 60, daysAgo: 1, lastExerciseName: "臀" },
    } as const
    const firstDeload = generateSession(makeState(246), { fatigueSnapshot })
    const deloadSessions = [246, 247, 248, 249, 250, 251].map((count) =>
      generateSession(
        makeState(count, {
          currentBlock: "deload",
          lastDeloadSession: 246,
        }),
      ),
    )

    expect(firstDeload.isDeload).toBe(true)
    expect(firstDeload.trainingState.currentBlock).toBe("deload")
    expect(firstDeload.trainingState.lastDeloadSession).toBe(246)
    expect(deloadSessions.map((session) => session.isDeload)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ])
    for (const session of deloadSessions) {
      for (const exercise of session.exercises) {
        expect(exercise.sets).toHaveLength(2)
      }
    }
  })

  it("deloads by the eighteenth advanced session even without fatigue threshold", () => {
    const session257 = generateSession(makeState(256))
    const session258 = generateSession(makeState(257))

    expect(session257.isDeload).toBe(false)
    expect(session258.isDeload).toBe(true)
    expect(session258.trainingState.lastDeloadSession).toBe(257)
  })
})
