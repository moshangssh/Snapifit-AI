import { describe, expect, it } from "vitest"
import {
  STRENGTH_EXERCISES,
  findVariants,
} from "@/lib/workout/engine/catalog"
import { generateSession } from "@/lib/workout/engine/intermediate-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"

function benchmarkIds(): string[] {
  const novice = STRENGTH_EXERCISES.filter((exercise) =>
    exercise.tags.includes("NOVICE_CORE"),
  )
  const byMuscle = new Map(novice.map((exercise) => [exercise.primaryMuscle, exercise]))

  return [
    byMuscle.get("CHEST")?.id,
    byMuscle.get("BACK")?.id,
    byMuscle.get("SHOULDERS")?.id,
    byMuscle.get("QUADS")?.id,
    byMuscle.get("GLUTES")?.id,
    byMuscle.get("BICEPS")?.id,
    byMuscle.get("TRICEPS")?.id,
    byMuscle.get("CORE")?.id,
    novice.find(
      (exercise) =>
        exercise.primaryMuscle === "CHEST" && exercise.id !== byMuscle.get("CHEST")?.id,
    )?.id,
    novice.find(
      (exercise) =>
        exercise.primaryMuscle === "BACK" && exercise.id !== byMuscle.get("BACK")?.id,
    )?.id,
  ].filter((id): id is string => typeof id === "string")
}

function makeState(
  completedSessionCount: number,
  overrides: Partial<TrainingState> = {},
): TrainingState {
  return {
    phase: "intermediate",
    completedSessionCount,
    blacklistedExerciseIds: [],
    benchmarkExerciseIds: benchmarkIds(),
    ...overrides,
  }
}

function completedSummary(
  completedAt: string,
  exercises: ReturnType<typeof generateSession>["exercises"],
  reps: number,
  weightKg?: number,
  plannedReps?: number,
) {
  return {
    completedAt,
    exercises: exercises.map((exercise) => ({
      catalogExerciseId: exercise.catalogExerciseId,
      exerciseName: exercise.plannedExerciseName,
      phase: exercise.phase,
      completedSets: exercise.sets.length,
      workingSetWeightKg: exercise.sets[0]?.plannedWeightKg,
      workingSetReps: plannedReps ?? exercise.sets[0]?.plannedReps,
      wasReplaced: false,
      wasSkipped: false,
      muscleGroups: exercise.plannedAnalysis.muscleGroups,
      sets: exercise.sets.map((set) => ({
        plannedWeightKg: set.plannedWeightKg,
        plannedReps: plannedReps ?? set.plannedReps,
        actualWeightKg: weightKg ?? set.plannedWeightKg,
        actualReps: reps,
        isCompleted: true,
        isSkipped: false,
      })),
    })),
  }
}

describe("intermediate workout engine", () => {
  it("starts the intermediate engine on session 73 with the first six-template slot", () => {
    const session = generateSession(makeState(72))

    expect(session.phase).toBe("intermediate")
    expect(session.templateIndex).toBe(0)
    expect(session.templateName).toBe("上A")
    expect(session.isDeload).toBe(false)
  })

  it("rotates six templates in sessions 73-78 and uses benchmark main lifts for accumulation testing", () => {
    const benchmarks = benchmarkIds()
    const benchmarkSet = new Set(benchmarks)
    const sessions = [72, 73, 74, 75, 76, 77].map((count) =>
      generateSession(makeState(count, { benchmarkExerciseIds: benchmarks })),
    )

    expect(sessions.map((session) => session.templateName)).toEqual([
      "上A",
      "下A",
      "上B",
      "下B",
      "上C",
      "下C",
    ])

    for (const session of sessions) {
      const mainExercises = session.exercises.filter(
        (exercise) => exercise.phase === "main",
      )

      expect(mainExercises.length).toBeGreaterThanOrEqual(3)
      for (const exercise of mainExercises) {
        expect(benchmarkSet.has(exercise.catalogExerciseId ?? "")).toBe(true)
        expect(exercise.sets).toHaveLength(3)
        expect(exercise.sets.map((set) => set.plannedReps)).toEqual([10, 10, 10])
      }
    }
  })

  it("uses matched variants instead of benchmarks during accumulation variant sessions 79-90", () => {
    const benchmarks = benchmarkIds()
    const benchmarkSet = new Set(benchmarks)
    const benchmarkExercises = benchmarks
      .map((id) => STRENGTH_EXERCISES.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is (typeof STRENGTH_EXERCISES)[number] =>
        exercise !== undefined,
      )
    const intermediatePool = STRENGTH_EXERCISES.filter((exercise) =>
      exercise.tags.includes("INTERMEDIATE_VARIANT"),
    )
    const allowedVariantIds = new Set(
      benchmarkExercises.flatMap((benchmark) =>
        findVariants(benchmark, intermediatePool).map((exercise) => exercise.id),
      ),
    )

    const session = generateSession(
      makeState(78, { benchmarkExerciseIds: benchmarks }),
    )
    const mainExercises = session.exercises.filter(
      (exercise) => exercise.phase === "main",
    )

    expect(session.templateName).toBe("上A")
    expect(mainExercises.length).toBeGreaterThanOrEqual(3)
    for (const exercise of mainExercises) {
      expect(benchmarkSet.has(exercise.catalogExerciseId ?? "")).toBe(false)
      expect(allowedVariantIds.has(exercise.catalogExerciseId ?? "")).toBe(true)
      expect(exercise.sets.map((set) => set.plannedReps)).toEqual([10, 10, 10])
    }
  })

  it("progresses accumulation weights by half novice increments after target reps are completed", () => {
    const upperBaseline = generateSession(makeState(78))
    const upperHistory = completedSummary(
      "2026-06-17T08:00:00.000Z",
      upperBaseline.exercises,
      10,
    )
    const progressedUpper = generateSession(makeState(78), {
      recentWorkoutSessionSummaries: [upperHistory],
    })
    const baselineUpperMain = upperBaseline.exercises.find(
      (exercise) => exercise.phase === "main",
    )
    const progressedUpperMain = progressedUpper.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.catalogExerciseId === baselineUpperMain?.catalogExerciseId,
    )

    expect(progressedUpperMain?.sets.map((set) => set.plannedWeightKg)).toEqual(
      baselineUpperMain?.sets.map((set) => (set.plannedWeightKg ?? 0) + 0.5),
    )

    const lowerBaseline = generateSession(makeState(79))
    const lowerHistory = completedSummary(
      "2026-06-18T08:00:00.000Z",
      lowerBaseline.exercises,
      10,
    )
    const progressedLower = generateSession(makeState(79), {
      recentWorkoutSessionSummaries: [lowerHistory],
    })
    const baselineLowerMain = lowerBaseline.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        (exercise.plannedAnalysis.muscleGroups.includes("quadriceps") ||
          exercise.plannedAnalysis.muscleGroups.includes("glutes")),
    )
    const progressedLowerMain = progressedLower.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.catalogExerciseId === baselineLowerMain?.catalogExerciseId,
    )

    expect(progressedLowerMain?.sets.map((set) => set.plannedWeightKg)).toEqual(
      baselineLowerMain?.sets.map((set) => (set.plannedWeightKg ?? 0) + 1),
    )
  })

  it("starts intensification on session 91 with benchmark lifts at six reps and ten percent more weight", () => {
    const benchmarks = benchmarkIds()
    const baseline = generateSession(
      makeState(90, { benchmarkExerciseIds: benchmarks }),
    )
    const history = completedSummary(
      "2026-06-30T08:00:00.000Z",
      baseline.exercises,
      10,
      50,
      10,
    )
    const session = generateSession(
      makeState(90, { benchmarkExerciseIds: benchmarks }),
      { recentWorkoutSessionSummaries: [history] },
    )
    const benchmarkSet = new Set(benchmarks)
    const mainExercises = session.exercises.filter(
      (exercise) => exercise.phase === "main",
    )

    expect(session.templateName).toBe("上A")
    for (const exercise of mainExercises) {
      expect(benchmarkSet.has(exercise.catalogExerciseId ?? "")).toBe(true)
      expect(exercise.sets).toHaveLength(3)
      expect(exercise.sets.map((set) => set.plannedReps)).toEqual([6, 6, 6])
      expect(exercise.sets.map((set) => set.plannedWeightKg)).toEqual([
        55, 55, 55,
      ])
    }
  })

  it("keeps six-rep prescriptions when intensification moves to matched variants in sessions 97-108", () => {
    const benchmarks = benchmarkIds()
    const benchmarkSet = new Set(benchmarks)
    const session = generateSession(
      makeState(96, { benchmarkExerciseIds: benchmarks }),
    )
    const mainExercises = session.exercises.filter(
      (exercise) => exercise.phase === "main",
    )

    expect(session.templateName).toBe("上A")
    expect(session.isDeload).toBe(false)
    for (const exercise of mainExercises) {
      expect(benchmarkSet.has(exercise.catalogExerciseId ?? "")).toBe(false)
      expect(exercise.sets).toHaveLength(3)
      expect(exercise.sets.map((set) => set.plannedReps)).toEqual([6, 6, 6])
    }
  })

  it("deloads sessions 109-114 with benchmark lifts at seventy percent weight and two sets", () => {
    const benchmarks = benchmarkIds()
    const baseline = generateSession(
      makeState(108, { benchmarkExerciseIds: benchmarks }),
    )
    const history = completedSummary(
      "2026-07-20T08:00:00.000Z",
      baseline.exercises,
      6,
      100,
      6,
    )
    const session = generateSession(
      makeState(108, { benchmarkExerciseIds: benchmarks }),
      { recentWorkoutSessionSummaries: [history] },
    )
    const benchmarkSet = new Set(benchmarks)
    const mainExercises = session.exercises.filter(
      (exercise) => exercise.phase === "main",
    )

    expect(session.isDeload).toBe(true)
    expect(session.templateName).toBe("上A")
    for (const exercise of mainExercises) {
      expect(benchmarkSet.has(exercise.catalogExerciseId ?? "")).toBe(true)
      expect(exercise.sets).toHaveLength(2)
      expect(exercise.sets.map((set) => set.plannedWeightKg)).toEqual([
        70, 70,
      ])
    }

    const deloadSessions = [108, 109, 110, 111, 112, 113].map((count) =>
      generateSession(makeState(count, { benchmarkExerciseIds: benchmarks })),
    )

    expect(deloadSessions.map((item) => item.isDeload)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
    ])
    expect(deloadSessions.map((item) => item.templateName)).toEqual([
      "上A",
      "下A",
      "上B",
      "下B",
      "上C",
      "下C",
    ])
  })

  it("starts the next accumulation block on session 115", () => {
    const session = generateSession(makeState(114))
    const mainExercises = session.exercises.filter(
      (exercise) => exercise.phase === "main",
    )

    expect(session.isDeload).toBe(false)
    expect(session.templateName).toBe("上A")
    expect(session.trainingState.currentBlock).toBe("accumulation")
    expect(session.trainingState.blockStartSession).toBe(115)
    for (const exercise of mainExercises) {
      expect(exercise.sets).toHaveLength(3)
      expect(exercise.sets.map((set) => set.plannedReps)).toEqual([10, 10, 10])
    }
  })
})
