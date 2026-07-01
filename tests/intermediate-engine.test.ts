import { describe, expect, it } from "vitest"
import {
  AS_CORE_EXERCISES,
  STRENGTH_EXERCISES,
  findVariants,
} from "@/lib/workout/engine/catalog"
import { describeVolume, generateSession } from "@/lib/workout/engine/intermediate-engine"
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

const AS_CORE_BY_ID = new Map(
  AS_CORE_EXERCISES.map((exercise) => [exercise.id, exercise]),
)

function asCoreSupport(
  session: ReturnType<typeof generateSession>,
  phase: "warmup" | "cooldown",
) {
  return session.exercises
    .filter((exercise) => exercise.phase === phase)
    .map((exercise) =>
      exercise.catalogExerciseId
        ? AS_CORE_BY_ID.get(exercise.catalogExerciseId)
        : undefined,
    )
    .filter((exercise): exercise is (typeof AS_CORE_EXERCISES)[number] =>
      Boolean(exercise),
    )
}

describe("intermediate workout engine", () => {
  it("returns warmup, main, and cooldown without counting support phases as main strength sets", () => {
    const session = generateSession(makeState(72))
    const warmup = session.exercises.filter(
      (exercise) => exercise.phase === "warmup",
    )
    const main = session.exercises.filter((exercise) => exercise.phase === "main")
    const cooldown = session.exercises.filter(
      (exercise) => exercise.phase === "cooldown",
    )
    const mainStrengthSets = session.exercises
      .filter(
        (exercise) =>
          exercise.phase === "main" &&
          exercise.plannedAnalysis.exerciseType === "strength",
      )
      .reduce((total, exercise) => total + exercise.sets.length, 0)

    expect(warmup).toHaveLength(4)
    expect(main.length).toBeGreaterThanOrEqual(3)
    expect(cooldown).toHaveLength(4)
    expect(session.exercises.map((exercise) => exercise.phase)).toEqual([
      ...warmup.map(() => "warmup" as const),
      ...main.map(() => "main" as const),
      ...cooldown.map(() => "cooldown" as const),
    ])
    expect(mainStrengthSets).toBe(
      main.reduce((total, exercise) => total + exercise.sets.length, 0),
    )
  })

  it("starts the intermediate engine on session 73 with the first six-template slot", () => {
    const session = generateSession(makeState(72))

    expect(session.phase).toBe("intermediate")
    expect(session.templateIndex).toBe(0)
    expect(session.templateName).toBe("上A")
    expect(session.isDeload).toBe(false)
    expect(session.exercises.map((exercise) => exercise.phase)).toEqual([
      "warmup",
      "warmup",
      "warmup",
      "warmup",
      "main",
      "main",
      "main",
      "main",
      "cooldown",
      "cooldown",
      "cooldown",
      "cooldown",
    ])
    expect(session.sessionAudit).toMatchObject({
      status: "pass",
    })
    expect(session.microcycleAudit).toMatchObject({
      sessionCount: 6,
    })
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

  it("infers upper or lower AS support focus from the intermediate main muscles", () => {
    const upperSession = generateSession(makeState(72))
    const lowerSession = generateSession(makeState(73))
    const upperWarmupAS = asCoreSupport(upperSession, "warmup")
    const upperCooldownAS = asCoreSupport(upperSession, "cooldown")
    const lowerWarmupAS = asCoreSupport(lowerSession, "warmup")
    const lowerCooldownAS = asCoreSupport(lowerSession, "cooldown")

    expect(upperWarmupAS).toHaveLength(2)
    expect(upperCooldownAS).toHaveLength(2)
    expect(
      [...upperWarmupAS, ...upperCooldownAS].every((exercise) =>
        ["SHOULDERS", "BACK"].includes(exercise.primaryMuscle),
      ),
    ).toBe(true)
    expect(lowerWarmupAS).toHaveLength(2)
    expect(lowerCooldownAS).toHaveLength(2)
    expect(
      [...lowerWarmupAS, ...lowerCooldownAS].every((exercise) =>
        ["QUADS", "GLUTES"].includes(exercise.primaryMuscle),
      ),
    ).toBe(true)
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

  it("starts intensification on session 91 with benchmark lifts at six reps using accumulation weight", () => {
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
        50.5, 50.5, 50.5,
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
    for (const deloadSession of deloadSessions) {
      expect(
        deloadSession.exercises.filter((exercise) => exercise.phase === "warmup"),
      ).toHaveLength(4)
      expect(
        deloadSession.exercises.filter(
          (exercise) => exercise.phase === "cooldown",
        ),
      ).toHaveLength(4)
    }
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

  // #80 established this invariance for advanced; it must hold here too. {72..77} is
  // one canonical microcycle (all accumulation, all benchmark). A forward window from
  // session 77 reaches past the benchmark→variant switch (session 6) and stacks the
  // same muscle repeatedly, so the per-muscle audit must not depend on the entry point.
  it("audits the same canonical microcycle identically from every member session", () => {
    const audits = [72, 73, 74, 75, 76, 77].map(
      (count) => describeVolume(makeState(count)).microcycle,
    )

    const [reference, ...rest] = audits.map((audit) => audit.muscleGroupAudits)
    for (const muscleGroupAudits of rest) {
      expect(muscleGroupAudits).toEqual(reference)
    }
  })

  // The snapshot's 本轮主训练 N 组 must follow the same canonical rotation as the detailed
  // audit. [108..113] is the deload microcycle, so a forward-window snapshot drifted across
  // entry points before #80's completion (44/48/51/56/59/63); it must now report one value.
  it("reports one microcycle mainSetCount from every member session", () => {
    const mainSetCounts = [108, 109, 110, 111, 112, 113].map(
      (count) => generateSession(makeState(count)).microcycleAudit.mainSetCount,
    )
    expect(new Set(mainSetCounts).size).toBe(1)
  })
})

describe("intermediate workout engine AS safety lock", () => {
  // Anchor the SHOULDERS benchmark on the machine shoulder press (a vertical_push
  // movement) so its matched variants include the lockable dumbbell overhead press.
  const MACHINE_SHOULDER_PRESS_ID = "6b0ffef6-8dd1-4b89-999a-a11d85d9e16f"

  function asBenchmarkIds(): string[] {
    return Array.from(new Set([MACHINE_SHOULDER_PRESS_ID, ...benchmarkIds()]))
  }

  function asState(
    completedSessionCount: number,
    overrides: Partial<TrainingState> = {},
  ): TrainingState {
    return makeState(completedSessionCount, {
      benchmarkExerciseIds: asBenchmarkIds(),
      ...overrides,
    })
  }

  function mainExercisesFor(state: TrainingState) {
    return generateSession(state)
      .exercises.filter((exercise) => exercise.phase === "main")
      .map((exercise) =>
        STRENGTH_EXERCISES.find(
          (item) => item.id === exercise.catalogExerciseId,
        ),
      )
      .filter((exercise): exercise is (typeof STRENGTH_EXERCISES)[number] =>
        exercise !== undefined,
      )
  }

  const isOverheadPress = (exercise: (typeof STRENGTH_EXERCISES)[number]) =>
    exercise.movementPattern === "vertical_push" &&
    (exercise.angle === "overhead" ||
      exercise.equipment === "BARBELL" ||
      exercise.equipment === "DUMBBELL")

  it("never prescribes locked overhead/axial movements across a full block cycle by default", () => {
    for (let count = 72; count < 72 + 42; count++) {
      const exercises = mainExercisesFor(asState(count))

      expect(exercises.some(isOverheadPress)).toBe(false)
      expect(
        exercises.some(
          (exercise) =>
            (exercise.movementPattern === "squat_pattern" ||
              exercise.movementPattern === "hinge_pattern") &&
            exercise.equipment === "BARBELL",
        ),
      ).toBe(false)
    }
  })

  it("allows a dumbbell overhead press variant only once overhead press is unlocked", () => {
    let lockedHits = 0
    let unlockedHits = 0

    for (let count = 72; count < 72 + 42; count++) {
      lockedHits += mainExercisesFor(asState(count)).filter(
        isOverheadPress,
      ).length
      unlockedHits += mainExercisesFor(
        asState(count, { unlockedRiskCategories: ["overhead_press"] }),
      ).filter(isOverheadPress).length
    }

    expect(lockedHits).toBe(0)
    expect(unlockedHits).toBeGreaterThan(0)
  })
})
