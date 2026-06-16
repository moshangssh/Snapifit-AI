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

function completedSummary(
  completedAt: string,
  exercises: ReturnType<typeof generateSession>["exercises"],
  actualRepsForSet: (setIndex: number) => number | undefined,
) {
  return {
    completedAt,
    exercises: exercises.map((exercise) => ({
      catalogExerciseId: exercise.catalogExerciseId,
      exerciseName: exercise.plannedExerciseName,
      phase: exercise.phase,
      completedSets: exercise.sets.length,
      workingSetWeightKg: exercise.sets[0].plannedWeightKg,
      workingSetReps: exercise.sets[0].plannedReps,
      wasReplaced: false,
      wasSkipped: false,
      muscleGroups: exercise.plannedAnalysis.muscleGroups,
      sets: exercise.sets.map((set, index) => ({
        plannedWeightKg: set.plannedWeightKg,
        plannedReps: set.plannedReps,
        actualWeightKg: set.plannedWeightKg,
        actualReps: actualRepsForSet(index),
        isCompleted: true,
        isSkipped: false,
      })),
    })),
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

  it("uses conservative starting weights when a main exercise has no history", () => {
    const upperSession = generateSession(makeState(0), {
      effectiveUserWeightKg: 70,
    })
    const lowerSession = generateSession(makeState(1), {
      effectiveUserWeightKg: 70,
    })
    const chestExercise = upperSession.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )
    const quadExercise = lowerSession.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("quadriceps"),
    )

    expect(chestExercise?.sets.map((set) => set.plannedWeightKg)).toEqual([
      21, 21, 21,
    ])
    expect(quadExercise?.sets.map((set) => set.plannedWeightKg)).toEqual([
      35, 35, 35,
    ])
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
      const expectedDimensions: readonly (readonly string[])[] =
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

  it("adds weight for catalog exercises that completed all target reps last time", () => {
    const upperBaseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const lowerBaseline = generateSession(makeState(5), {
      effectiveUserWeightKg: 72,
    })
    const upperMain = upperBaseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const lowerMain = lowerBaseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = upperMain.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )
    const quadExercise = lowerMain.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("quadriceps"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()
    expect(quadExercise?.catalogExerciseId).toBeTruthy()

    const completedSummary = (exercises: typeof upperMain) => ({
      completedAt: "2026-06-15T08:00:00.000Z",
      exercises: exercises.map((exercise) => ({
        catalogExerciseId: exercise.catalogExerciseId,
        exerciseName: exercise.plannedExerciseName,
        phase: exercise.phase,
        completedSets: 3,
        workingSetWeightKg: exercise.sets[0].plannedWeightKg,
        workingSetReps: 10,
        wasReplaced: false,
        wasSkipped: false,
        muscleGroups: exercise.plannedAnalysis.muscleGroups,
        sets: exercise.sets.map((set) => ({
          plannedWeightKg: set.plannedWeightKg,
          plannedReps: set.plannedReps,
          actualWeightKg: set.plannedWeightKg,
          actualReps: set.plannedReps,
          isCompleted: true,
          isSkipped: false,
        })),
      })),
    })

    const progressedUpper = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [completedSummary(upperMain)],
    })
    const progressedLower = generateSession(makeState(5), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [completedSummary(lowerMain)],
    })

    const progressedChest = progressedUpper.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === chestExercise?.catalogExerciseId,
    )
    const progressedQuad = progressedLower.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === quadExercise?.catalogExerciseId,
    )

    expect(progressedChest?.sets.map((set) => set.plannedWeightKg)).toEqual([
      (chestExercise?.sets[0].plannedWeightKg ?? 0) + 1.25,
      (chestExercise?.sets[0].plannedWeightKg ?? 0) + 1.25,
      (chestExercise?.sets[0].plannedWeightKg ?? 0) + 1.25,
    ])
    expect(progressedQuad?.sets.map((set) => set.plannedWeightKg)).toEqual([
      (quadExercise?.sets[0].plannedWeightKg ?? 0) + 2.5,
      (quadExercise?.sets[0].plannedWeightKg ?? 0) + 2.5,
      (quadExercise?.sets[0].plannedWeightKg ?? 0) + 2.5,
    ])
  })

  it("maintains weight when target reps were not fully completed last time", () => {
    const baseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const mainExercises = baseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = mainExercises.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()

    const incompleteSummary = {
      completedAt: "2026-06-15T08:00:00.000Z",
      exercises: mainExercises.map((exercise) => ({
        catalogExerciseId: exercise.catalogExerciseId,
        exerciseName: exercise.plannedExerciseName,
        phase: exercise.phase,
        completedSets: 3,
        workingSetWeightKg: exercise.sets[0].plannedWeightKg,
        workingSetReps: 8,
        wasReplaced: false,
        wasSkipped: false,
        muscleGroups: exercise.plannedAnalysis.muscleGroups,
        sets: exercise.sets.map((set, idx) => ({
          plannedWeightKg: set.plannedWeightKg,
          plannedReps: set.plannedReps,
          actualWeightKg: set.plannedWeightKg,
          actualReps: idx === 0 ? 10 : 8,
          isCompleted: true,
          isSkipped: false,
        })),
      })),
    }

    const maintained = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [incompleteSummary],
    })

    const maintainedChest = maintained.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === chestExercise?.catalogExerciseId,
    )

    expect(maintainedChest?.sets.map((set) => set.plannedWeightKg)).toEqual([
      chestExercise?.sets[0].plannedWeightKg,
      chestExercise?.sets[0].plannedWeightKg,
      chestExercise?.sets[0].plannedWeightKg,
    ])
    expect(maintainedChest?.sets.map((set) => set.plannedReps)).toEqual([
      10, 10, 10,
    ])
  })

  it("reduces target reps after two consecutive failures at the same weight", () => {
    const baseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const mainExercises = baseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = mainExercises.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()

    const firstFailed = completedSummary(
      "2026-06-15T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 8),
    )
    const secondFailed = completedSummary(
      "2026-06-18T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 8),
    )

    const reduced = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [secondFailed, firstFailed],
    })

    const reducedChest = reduced.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === chestExercise?.catalogExerciseId,
    )

    expect(reducedChest?.sets.map((set) => set.plannedWeightKg)).toEqual([
      chestExercise?.sets[0].plannedWeightKg,
      chestExercise?.sets[0].plannedWeightKg,
      chestExercise?.sets[0].plannedWeightKg,
    ])
    expect(reducedChest?.sets.map((set) => set.plannedReps)).toEqual([8, 8, 8])
  })

  it("replaces an exercise after three consecutive failures at the same weight", () => {
    const baseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const mainExercises = baseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = mainExercises.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()

    const failedAt40Kg = (completedAt: string) => {
      const summary = completedSummary(completedAt, mainExercises, (setIndex) =>
        setIndex === 0 ? 10 : 8,
      )

      return {
        ...summary,
        exercises: summary.exercises.map((exercise) =>
          exercise.catalogExerciseId === chestExercise?.catalogExerciseId
            ? {
                ...exercise,
                workingSetWeightKg: 40,
                sets: exercise.sets.map((set) => ({
                  ...set,
                  plannedWeightKg: 40,
                  actualWeightKg: 40,
                })),
              }
            : exercise,
        ),
      }
    }

    const replaced = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [
        failedAt40Kg("2026-06-21T08:00:00.000Z"),
        failedAt40Kg("2026-06-18T08:00:00.000Z"),
        failedAt40Kg("2026-06-15T08:00:00.000Z"),
      ],
    })
    const replacement = replaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(replacement?.catalogExerciseId).toBeTruthy()
    expect(replacement?.catalogExerciseId).not.toBe(
      chestExercise?.catalogExerciseId,
    )
    expect(
      replaced.exercises.map((exercise) => exercise.catalogExerciseId),
    ).not.toContain(chestExercise?.catalogExerciseId)
    expect(replaced.trainingState.blacklistedExerciseIds).toContain(
      chestExercise?.catalogExerciseId,
    )
    replacement?.sets.forEach((set) => {
      expect(set.plannedWeightKg).toBeCloseTo(21.6)
    })
  })

  it("immediately replaces an exercise marked with discomfort", () => {
    const strengthById = new Map(
      STRENGTH_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    const baseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const mainExercises = baseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = mainExercises.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()

    const discomfortSummary = completedSummary(
      "2026-06-15T08:00:00.000Z",
      mainExercises,
      () => 10,
    )
    discomfortSummary.exercises = discomfortSummary.exercises.map((exercise) =>
      exercise.catalogExerciseId === chestExercise?.catalogExerciseId
        ? { ...exercise, discomfortFlag: true }
        : exercise,
    )

    const replaced = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [discomfortSummary],
    })
    const replacement = replaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )
    const originalCatalog = strengthById.get(
      chestExercise?.catalogExerciseId ?? "",
    )
    const replacementCatalog = strengthById.get(
      replacement?.catalogExerciseId ?? "",
    )

    expect(replacement?.catalogExerciseId).not.toBe(
      chestExercise?.catalogExerciseId,
    )
    expect(
      replaced.exercises.map((exercise) => exercise.catalogExerciseId),
    ).not.toContain(chestExercise?.catalogExerciseId)
    expect(replaced.trainingState.blacklistedExerciseIds).toContain(
      chestExercise?.catalogExerciseId,
    )
    expect(replacementCatalog?.primaryMuscle).toBe(
      originalCatalog?.primaryMuscle,
    )
    expect(replacementCatalog?.mechanics).toBe(originalCatalog?.mechanics)
  })

  it.each([
    { sessionCount: 4, muscleGroup: "chest", incrementKg: 1.25 },
    { sessionCount: 5, muscleGroup: "quadriceps", incrementKg: 2.5 },
  ] as const)(
    "restores normal reps and adds $incrementKg kg after reduced reps are completed",
    ({ sessionCount, muscleGroup, incrementKg }) => {
      const baseline = generateSession(makeState(sessionCount), {
        effectiveUserWeightKg: 72,
      })
      const mainExercises = baseline.exercises.filter(
        (exercise) => exercise.phase === "main",
      )
      const targetExercise = mainExercises.find((exercise) =>
        exercise.plannedAnalysis.muscleGroups.includes(muscleGroup),
      )

      expect(targetExercise?.catalogExerciseId).toBeTruthy()

      const firstFailed = completedSummary(
        "2026-06-15T08:00:00.000Z",
        mainExercises,
        (setIndex) => (setIndex === 0 ? 10 : 8),
      )
      const secondFailed = completedSummary(
        "2026-06-18T08:00:00.000Z",
        mainExercises,
        (setIndex) => (setIndex === 0 ? 10 : 8),
      )
      const reduced = generateSession(makeState(sessionCount), {
        effectiveUserWeightKg: 72,
        recentWorkoutSessionSummaries: [secondFailed, firstFailed],
      })
      const reducedMainExercises = reduced.exercises.filter(
        (exercise) => exercise.phase === "main",
      )
      const completedReduced = completedSummary(
        "2026-06-21T08:00:00.000Z",
        reducedMainExercises,
        () => 8,
      )

      const restored = generateSession(makeState(sessionCount), {
        effectiveUserWeightKg: 72,
        recentWorkoutSessionSummaries: [
          completedReduced,
          secondFailed,
          firstFailed,
        ],
      })

      const restoredExercise = restored.exercises.find(
        (exercise) =>
          exercise.catalogExerciseId === targetExercise?.catalogExerciseId,
      )

      expect(restoredExercise?.sets.map((set) => set.plannedReps)).toEqual([
        10, 10, 10,
      ])
      expect(restoredExercise?.sets.map((set) => set.plannedWeightKg)).toEqual([
        (targetExercise?.sets[0].plannedWeightKg ?? 0) + incrementKg,
        (targetExercise?.sets[0].plannedWeightKg ?? 0) + incrementKg,
        (targetExercise?.sets[0].plannedWeightKg ?? 0) + incrementKg,
      ])
    },
  )

  it("resets consecutive failure count after a successful completion", () => {
    const baseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const mainExercises = baseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = mainExercises.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()

    const firstFailed = completedSummary(
      "2026-06-15T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 8),
    )
    const succeeded = completedSummary(
      "2026-06-18T08:00:00.000Z",
      mainExercises,
      () => 10,
    )
    const secondFailed = completedSummary(
      "2026-06-21T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 9),
    )

    const next = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [secondFailed, succeeded, firstFailed],
    })

    const nextChest = next.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === chestExercise?.catalogExerciseId,
    )

    const succeededWeight =
      succeeded.exercises.find(
        (ex) => ex.catalogExerciseId === chestExercise?.catalogExerciseId,
      )?.workingSetWeightKg ?? 0

    // Should maintain weight and normal reps (not reduce to 8)
    // because the success broke the consecutive failure streak
    // The most recent session (secondFailed) failed, so we maintain the weight from that session
    expect(nextChest?.sets.map((set) => set.plannedWeightKg)).toEqual([
      succeededWeight,
      succeededWeight,
      succeededWeight,
    ])
    expect(nextChest?.sets.map((set) => set.plannedReps)).toEqual([10, 10, 10])
  })

  it("excludes skipped sessions from consecutive failure count", () => {
    const baseline = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
    })
    const mainExercises = baseline.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const chestExercise = mainExercises.find((exercise) =>
      exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(chestExercise?.catalogExerciseId).toBeTruthy()

    const firstFailed = completedSummary(
      "2026-06-15T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 8),
    )

    // Mark chest exercise as skipped in this session
    const skippedSession = completedSummary(
      "2026-06-18T08:00:00.000Z",
      mainExercises,
      () => 0,
    )
    skippedSession.exercises = skippedSession.exercises.map((ex) =>
      ex.catalogExerciseId === chestExercise?.catalogExerciseId
        ? { ...ex, wasSkipped: true }
        : ex,
    )

    const secondFailed = completedSummary(
      "2026-06-21T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 8),
    )

    const next = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [secondFailed, skippedSession, firstFailed],
    })

    const nextChest = next.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === chestExercise?.catalogExerciseId,
    )

    // The skipped session is excluded from progressionExercises filter,
    // so we now have two consecutive failures (secondFailed and firstFailed)
    // which should trigger reduced reps
    expect(nextChest?.sets.map((set) => set.plannedWeightKg)).toEqual([
      chestExercise?.sets[0].plannedWeightKg,
      chestExercise?.sets[0].plannedWeightKg,
      chestExercise?.sets[0].plannedWeightKg,
    ])
    expect(nextChest?.sets.map((set) => set.plannedReps)).toEqual([8, 8, 8])
  })
})
