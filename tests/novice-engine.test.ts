import { describe, expect, it } from "vitest"
import {
  AS_CORE_EXERCISES,
  STRENGTH_EXERCISES,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import { describeVolume, generateSession } from "@/lib/workout/engine/novice-engine"
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

  it("labels AS core exercises in generated plans", () => {
    const session = generateSession(makeState(0))
    const asCoreIds = new Set(AS_CORE_EXERCISES.map((exercise) => exercise.id))
    const asExercises = session.exercises.filter(
      (exercise) =>
        exercise.catalogExerciseId && asCoreIds.has(exercise.catalogExerciseId),
    )

    expect(asExercises).toHaveLength(4)
    for (const exercise of asExercises) {
      expect(exercise.labels).toEqual(["AS"])
    }
  })

  it("deloads for three sessions after every sixteen completed sessions", () => {
    // Harvest the first deload session's main-exercise identities (session 16)
    // so the history below lines up with the exercises that session prescribes.
    const firstDeloadTemplate = generateSession(makeState(16), {
      effectiveUserWeightKg: 72,
    })
    const normalMain = firstDeloadTemplate.exercises.filter(
      (exercise) => exercise.phase === "main",
    )
    const completedNormal = {
      completedAt: "2026-06-15T08:00:00.000Z",
      exercises: normalMain.map((exercise) => ({
        catalogExerciseId: exercise.catalogExerciseId,
        exerciseName: exercise.plannedExerciseName,
        phase: exercise.phase,
        completedSets: 3,
        workingSetWeightKg: 100,
        workingSetReps: 10,
        wasReplaced: false,
        wasSkipped: false,
        muscleGroups: exercise.plannedAnalysis.muscleGroups,
        sets: Array.from({ length: 3 }, () => ({
          plannedWeightKg: 100,
          plannedReps: 10,
          actualWeightKg: 100,
          actualReps: 10,
          isCompleted: true,
          isSkipped: false,
        })),
      })),
    }

    const deloadWindows = [16, 17, 18, 32, 33, 34].map((count) =>
      generateSession(makeState(count), {
        effectiveUserWeightKg: 72,
        recentWorkoutSessionSummaries: [completedNormal],
      }),
    )
    const normalAfterDeload = generateSession(makeState(19), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [completedNormal],
    })

    expect(deloadWindows.map((session) => session.templateName)).toEqual([
      "上A",
      "下A",
      "上B",
      "上A",
      "下A",
      "上B",
    ])
    expect(normalAfterDeload.templateName).toBe("下B")

    for (const session of deloadWindows) {
      expect(session.isDeload).toBe(true)

      const mainExercises = session.exercises.filter(
        (exercise) => exercise.phase === "main",
      )
      expect(mainExercises.length).toBeGreaterThanOrEqual(4)

      for (const exercise of mainExercises) {
        expect(exercise.sets).toHaveLength(2)
      }
    }

    const matchingDeloadExercise = deloadWindows[0].exercises.find(
      (exercise) =>
        exercise.catalogExerciseId === normalMain[0].catalogExerciseId,
    )

    expect(
      matchingDeloadExercise?.sets.map((set) => set.plannedWeightKg),
    ).toEqual([70, 70])
    expect(normalAfterDeload.isDeload).toBe(false)
    for (const exercise of normalAfterDeload.exercises.filter(
      (item) => item.phase === "main",
    )) {
      expect(exercise.sets).toHaveLength(3)
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

  it("trains every major muscle group at least twice per four-template microcycle", () => {
    const strengthById = new Map(
      STRENGTH_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    // One microcycle = sessions 0-3 (上A → 下A → 上B → 下B), i.e. one week
    // when the user trains 4 days/week. PRD user story 14 promises each muscle
    // group is trained twice per week, so it must show up in ≥2 of these sessions.
    const sessionsByMuscle = new Map<MuscleGroup, Set<number>>()
    for (const count of [0, 1, 2, 3]) {
      const session = generateSession(makeState(count))
      for (const exercise of session.exercises) {
        if (exercise.phase !== "main" || !exercise.catalogExerciseId) continue
        const muscle = strengthById.get(exercise.catalogExerciseId)?.primaryMuscle
        if (!muscle) continue
        const sessions = sessionsByMuscle.get(muscle) ?? new Set<number>()
        sessions.add(session.templateIndex)
        sessionsByMuscle.set(muscle, sessions)
      }
    }

    const majorMuscles: MuscleGroup[] = [
      "CHEST",
      "BACK",
      "SHOULDERS",
      "QUADS",
      "HAMSTRINGS",
      "GLUTES",
      "BICEPS",
      "TRICEPS",
      "CORE",
    ]
    for (const muscle of majorMuscles) {
      const weeklyFrequency = sessionsByMuscle.get(muscle)?.size ?? 0
      expect(weeklyFrequency, `${muscle} weekly frequency`).toBeGreaterThanOrEqual(2)
    }
  })

  it("gives chest and back at least six main working sets across the microcycle", () => {
    const strengthById = new Map(
      STRENGTH_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    // #49: chest used to sit at a single upper day (1 exercise × 3 sets = 3 sets/week),
    // far below the evidence-based hypertrophy range. Spreading it across both upper
    // days lifts chest to ~6 sets/week while keeping back at ~6 (now 2×/week, not 1×).
    const weeklyWorkingSets: Record<"CHEST" | "BACK", number> = { CHEST: 0, BACK: 0 }
    for (const count of [0, 1, 2, 3]) {
      const session = generateSession(makeState(count))
      for (const exercise of session.exercises) {
        if (exercise.phase !== "main" || !exercise.catalogExerciseId) continue
        const muscle = strengthById.get(exercise.catalogExerciseId)?.primaryMuscle
        if (muscle === "CHEST" || muscle === "BACK") {
          weeklyWorkingSets[muscle] += exercise.sets.length
        }
      }
    }

    expect(weeklyWorkingSets.CHEST).toBeGreaterThanOrEqual(6)
    expect(weeklyWorkingSets.BACK).toBeGreaterThanOrEqual(6)
  })

  it("varies the chest and back movements between the two upper days", () => {
    const strengthById = new Map(
      STRENGTH_EXERCISES.map((exercise) => [exercise.id, exercise]),
    )
    // #49: both upper days now train chest and back. The rotation offset is meant
    // to pick *different* movements on each day (e.g. a pulldown on 上A, a row on
    // 上B), so each muscle gets pattern variety instead of the same lift twice a week.
    const upperA = generateSession(makeState(0))
    const upperB = generateSession(makeState(2))
    expect(upperA.templateName).toBe("上A")
    expect(upperB.templateName).toBe("上B")

    const mainMovementId = (
      session: ReturnType<typeof generateSession>,
      muscle: MuscleGroup,
    ) =>
      session.exercises.find(
        (exercise) =>
          exercise.phase === "main" &&
          exercise.catalogExerciseId &&
          strengthById.get(exercise.catalogExerciseId)?.primaryMuscle === muscle,
      )?.catalogExerciseId

    for (const muscle of ["CHEST", "BACK"] as const) {
      const idA = mainMovementId(upperA, muscle)
      const idB = mainMovementId(upperB, muscle)
      expect(idA, `${muscle} on 上A`).toBeDefined()
      expect(idB, `${muscle} on 上B`).toBeDefined()
      expect(idA, `${muscle} should differ between the two upper days`).not.toBe(
        idB,
      )
    }
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

  it("audits blacklisted-away template muscle groups as constrained zero volume", () => {
    const gluteNoviceCoreIds = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "GLUTES",
    ).map((exercise) => exercise.id)

    const session = generateSession(makeState(0, gluteNoviceCoreIds))
    const volume = describeVolume(makeState(0, gluteNoviceCoreIds))

    expect(gluteNoviceCoreIds.length).toBeGreaterThan(0)
    expect(session.microcycleAudit.status).toBe("constrained")
    expect(volume.microcycle.muscleGroupAudits.glutes).toMatchObject({
      status: "constrained",
      sets: 0,
      constrainedReasons: ["blacklist"],
    })
  })

  it("adjusts a later-novice microcycle below the eight-set target by adding sets", () => {
    // Sessions 25-72 target 8-12 sets per major muscle group, but the four-template
    // rotation only prescribes 6 sets each. Bounded volume adjustment closes the gap
    // by adding sets to existing main work rather than padding with new exercises.
    // (Session 40's microcycle window avoids the deload weeks at 32-34 and 48-50.)
    const session = generateSession(makeState(40))
    const volume = describeVolume(makeState(40))

    expect(session.microcycleAudit.status).toBe("adjusted")
    expect(volume.microcycle.muscleGroupAudits.chest).toMatchObject({
      status: "adjusted",
      sets: 6,
      targetMinSets: 8,
      adjustment: { addedExercise: false, adjustedSets: 8 },
    })
  })

  it("stays constrained at the later-novice target when a muscle pool is fully blacklisted", () => {
    const gluteNoviceCoreIds = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "GLUTES",
    ).map((exercise) => exercise.id)

    const session = generateSession(makeState(40, gluteNoviceCoreIds))
    const volume = describeVolume(makeState(40, gluteNoviceCoreIds))

    // Other muscles are below the eight-set target and get adjusted, but glutes have
    // no safe pool left, so the microcycle reads constrained rather than bypassing it.
    expect(session.microcycleAudit.status).toBe("constrained")
    expect(volume.microcycle.muscleGroupAudits.glutes).toMatchObject({
      status: "constrained",
      sets: 0,
      constrainedReasons: ["blacklist"],
    })
    expect(
      volume.microcycle.muscleGroupAudits.glutes.adjustment,
    ).toBeUndefined()
  })

  it("never places two main-strength exercises on the same audit key in one session", () => {
    // Guard for the bounded-adjustment per-session cap: computeMicrocycleAdjustment-
    // Capacity stays safe only because each novice session touches every audit muscle
    // key at most once (one exercise per distinct primary muscle; one shoulder slot).
    // If a future template or muscle-key mapping breaks that, two mains could share a
    // key in one session and the capacity model could over-count past the per-session
    // cap — this test goes red the moment that becomes reachable.
    const auditKey = (muscleGroup: string) =>
      muscleGroup === "side-deltoids" || muscleGroup === "back-deltoids"
        ? "front-deltoids"
        : muscleGroup

    for (let completedSessionCount = 0; completedSessionCount < 72; completedSessionCount++) {
      const session = generateSession(makeState(completedSessionCount))
      const exercisesPerKey = new Map<string, number>()

      for (const exercise of session.exercises) {
        if (
          exercise.phase !== "main" ||
          exercise.plannedAnalysis.exerciseType !== "strength"
        ) {
          continue
        }
        for (const key of new Set(
          exercise.plannedAnalysis.muscleGroups.map(auditKey),
        )) {
          exercisesPerKey.set(key, (exercisesPerKey.get(key) ?? 0) + 1)
        }
      }

      for (const [key, count] of exercisesPerKey) {
        expect(
          count,
          `session ${completedSessionCount} has ${count} main exercises on "${key}"`,
        ).toBeLessThanOrEqual(1)
      }
    }
  })

  it("keeps more than five blacklisted exercises out across ten generated sessions", () => {
    const blacklistedExerciseIds = Array.from(
      new Set(
        [0, 1, 2, 3].flatMap((completedSessionCount) =>
          generateSession(makeState(completedSessionCount)).exercises
            .map((exercise) => exercise.catalogExerciseId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    ).slice(0, 6)

    expect(blacklistedExerciseIds.length).toBeGreaterThan(5)

    const generatedExerciseIds = Array.from({ length: 10 }, (_, index) =>
      generateSession(makeState(index, blacklistedExerciseIds)).exercises
        .map((exercise) => exercise.catalogExerciseId)
        .filter((id): id is string => Boolean(id)),
    ).flat()

    for (const blacklistedExerciseId of blacklistedExerciseIds) {
      expect(generatedExerciseIds).not.toContain(blacklistedExerciseId)
    }
  })

  // Two full template rotations: catches offset-dependent picks, not just 上A.
  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    "does not select duplicate exercises between warmup and main phases (session %i)",
    (completedSessionCount) => {
      const session = generateSession(makeState(completedSessionCount))
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
    },
  )

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

  it("handles blacklist exhaustion by clearing same-muscle blacklist", () => {
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

    const allChestCompounds = STRENGTH_EXERCISES.filter(
      (exercise) =>
        exercise.tags.includes("NOVICE_CORE") &&
        exercise.primaryMuscle === "CHEST" &&
        exercise.mechanics === "COMPOUND",
    )

    const blacklistAllButOne = allChestCompounds
      .slice(0, -1)
      .map((exercise) => exercise.id)

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

    const replaced = generateSession(
      { ...makeState(4), blacklistedExerciseIds: blacklistAllButOne },
      {
        effectiveUserWeightKg: 72,
        recentWorkoutSessionSummaries: [
          failedAt40Kg("2026-06-21T08:00:00.000Z"),
          failedAt40Kg("2026-06-18T08:00:00.000Z"),
          failedAt40Kg("2026-06-15T08:00:00.000Z"),
        ],
      },
    )
    const replacement = replaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(replacement?.catalogExerciseId).toBeTruthy()
    expect(replacement?.catalogExerciseId).not.toBe(
      chestExercise?.catalogExerciseId,
    )
  })

  it("discomfort flag and consecutive failures both trigger replacement", () => {
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

    const failedOnce = completedSummary(
      "2026-06-15T08:00:00.000Z",
      mainExercises,
      (setIndex) => (setIndex === 0 ? 10 : 8),
    )
    failedOnce.exercises = failedOnce.exercises.map((exercise) =>
      exercise.catalogExerciseId === chestExercise?.catalogExerciseId
        ? { ...exercise, discomfortFlag: true }
        : exercise,
    )

    const replaced = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [failedOnce],
    })
    const replacement = replaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(replacement?.catalogExerciseId).not.toBe(
      chestExercise?.catalogExerciseId,
    )
    expect(replaced.trainingState.blacklistedExerciseIds).toContain(
      chestExercise?.catalogExerciseId,
    )
  })

  it("replacement itself can be replaced if it also fails", () => {
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

    const failedOriginalAt40Kg = (completedAt: string) => {
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

    const firstReplaced = generateSession(makeState(4), {
      effectiveUserWeightKg: 72,
      recentWorkoutSessionSummaries: [
        failedOriginalAt40Kg("2026-06-21T08:00:00.000Z"),
        failedOriginalAt40Kg("2026-06-18T08:00:00.000Z"),
        failedOriginalAt40Kg("2026-06-15T08:00:00.000Z"),
      ],
    })
    const firstReplacement = firstReplaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(firstReplacement?.catalogExerciseId).not.toBe(
      chestExercise?.catalogExerciseId,
    )
    expect(firstReplaced.trainingState.blacklistedExerciseIds).toContain(
      chestExercise?.catalogExerciseId,
    )

    const failedReplacementAt40Kg = (completedAt: string) => {
      const summary = completedSummary(
        completedAt,
        firstReplaced.exercises.filter((exercise) => exercise.phase === "main"),
        (setIndex) => (setIndex === 0 ? 10 : 8),
      )
      return {
        ...summary,
        exercises: summary.exercises.map((exercise) =>
          exercise.catalogExerciseId === firstReplacement?.catalogExerciseId
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

    const secondReplaced = generateSession(
      firstReplaced.trainingState,
      {
        effectiveUserWeightKg: 72,
        recentWorkoutSessionSummaries: [
          failedReplacementAt40Kg("2026-06-27T08:00:00.000Z"),
          failedReplacementAt40Kg("2026-06-24T08:00:00.000Z"),
          failedReplacementAt40Kg("2026-06-21T08:00:00.000Z"),
        ],
      },
    )
    const secondReplacement = secondReplaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )

    expect(secondReplacement?.catalogExerciseId).not.toBe(
      firstReplacement?.catalogExerciseId,
    )
    expect(secondReplacement?.catalogExerciseId).not.toBe(
      chestExercise?.catalogExerciseId,
    )
    expect(secondReplaced.trainingState.blacklistedExerciseIds).toContain(
      chestExercise?.catalogExerciseId,
    )
    // The first replacement should be blacklisted after it fails 3 times
    // This test verifies that the replacement logic works recursively
    const chestReplacementInSecond = secondReplaced.exercises.find(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.muscleGroups.includes("chest"),
    )
    expect(chestReplacementInSecond?.catalogExerciseId).toBeTruthy()
    expect(
      [chestExercise?.catalogExerciseId, firstReplacement?.catalogExerciseId],
    ).not.toContain(chestReplacementInSecond?.catalogExerciseId)
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

  // #80 established this invariance for advanced; it must hold for every engine.
  // A canonical microcycle (4 sessions aligned to the rotation boundary) must audit
  // identically regardless of which member session generates the plan. {12,13,14,15}
  // is the tightest repro: a forward window from session 13 drags deload-16 — which
  // belongs to the *next* microcycle — into the audit, flipping pass → constrained.
  it("audits the same canonical microcycle identically from every member session", () => {
    const audits = [12, 13, 14, 15].map(
      (count) => describeVolume(makeState(count)).microcycle,
    )

    const [reference, ...rest] = audits.map((audit) => audit.muscleGroupAudits)
    for (const muscleGroupAudits of rest) {
      expect(muscleGroupAudits).toEqual(reference)
    }
    for (const audit of audits) {
      expect(audit.status).toBe(audits[0].status)
    }
    expect(audits[0].status).toBe("pass")
  })

  // The snapshot's 本轮主训练 N 组 must follow the same canonical rotation as the detailed
  // audit above. Before #80 was completed the snapshot summed a forward window and drifted
  // across entry points (54/49/45/40 for one microcycle); it must now be invariant.
  it("reports one microcycle mainSetCount from every member session", () => {
    const mainSetCounts = [12, 13, 14, 15].map(
      (count) => generateSession(makeState(count)).microcycleAudit.mainSetCount,
    )
    expect(new Set(mainSetCounts).size).toBe(1)
  })
})
