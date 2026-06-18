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

  function mainPrimaryMuscles(count: number) {
    return generateSession(makeState(count))
      .exercises.filter((exercise) => exercise.phase === "main")
      .map(
        (exercise) =>
          STRENGTH_EXERCISES.find((item) => item.id === exercise.catalogExerciseId)
            ?.primaryMuscle,
      )
  }

  it("fills the 肌肥大下 HAMSTRINGS slot with a hamstrings exercise, not a fallback", () => {
    expect(generateSession(makeState(243)).templateName).toBe("肌肥大下")
    expect(mainPrimaryMuscles(243)).toContain("HAMSTRINGS")
  })

  it("fills the 耐力下 CALVES slot with a calves exercise, not a fallback", () => {
    expect(generateSession(makeState(245)).templateName).toBe("耐力下")
    expect(mainPrimaryMuscles(245)).toContain("CALVES")
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

describe("advanced workout engine AS safety lock", () => {
  function poolState(
    completedSessionCount: number,
    overrides: Partial<TrainingState> = {},
  ): TrainingState {
    // No lifetime benchmarks => every template (including strength) draws from
    // the full strength pool, so the safety lock is exercised everywhere.
    return {
      phase: "advanced",
      completedSessionCount,
      blacklistedExerciseIds: [],
      lastDeloadSession: 240,
      ...overrides,
    }
  }

  function mainCatalogExercises(state: TrainingState) {
    return generateSession(state)
      .exercises.filter((exercise) => exercise.phase === "main")
      .map((exercise) =>
        STRENGTH_EXERCISES.find((item) => item.id === exercise.catalogExerciseId),
      )
      .filter((exercise): exercise is (typeof STRENGTH_EXERCISES)[number] =>
        exercise !== undefined,
      )
  }

  const isAxialBarbell = (exercise: (typeof STRENGTH_EXERCISES)[number]) =>
    (exercise.movementPattern === "squat_pattern" ||
      exercise.movementPattern === "hinge_pattern" ||
      exercise.movementPattern === "calf_raise") &&
    exercise.equipment === "BARBELL"

  const isOverheadPress = (exercise: (typeof STRENGTH_EXERCISES)[number]) =>
    exercise.movementPattern === "vertical_push" &&
    (exercise.angle === "overhead" ||
      exercise.equipment === "BARBELL" ||
      exercise.equipment === "DUMBBELL")

  it("never prescribes barbell squat/hinge/calf raise, overhead press, or the snatch by default", () => {
    for (let count = 240; count < 240 + 60; count++) {
      const exercises = mainCatalogExercises(poolState(count))

      expect(exercises.some(isAxialBarbell)).toBe(false)
      expect(exercises.some(isOverheadPress)).toBe(false)
      expect(exercises.some((exercise) => exercise.nameEn === "Snatch")).toBe(
        false,
      )
    }
  })

  it("keeps every main slot filled with safe alternatives while everything is locked", () => {
    const expectedMainCount = [240, 241, 242, 243, 244, 245].map(
      (count) =>
        generateSession(poolState(count)).exercises.filter(
          (exercise) => exercise.phase === "main",
        ).length,
    )

    // 力量上 4, 力量下 3, 肌肥大上 5, 肌肥大下 4, 耐力上 4, 耐力下 4
    expect(expectedMainCount).toEqual([4, 3, 5, 4, 4, 4])

    for (let count = 240; count < 240 + 24; count++) {
      const exercises = mainCatalogExercises(poolState(count))
      const ids = exercises.map((exercise) => exercise.id)
      // no empty slots collapsed and no duplicate filler
      expect(new Set(ids).size).toBe(ids.length)
      expect(exercises.every((exercise) => exercise.equipment !== "BARBELL" ||
        exercise.movementPattern === "horizontal_push" ||
        exercise.movementPattern === "horizontal_pull" ||
        exercise.movementPattern === "incline_push")).toBe(true)
    }
  })

  it("surfaces barbell axial lifts only after that category is unlocked", () => {
    const lockedHits = []
    const unlockedHits = []

    for (let count = 240; count < 240 + 60; count++) {
      lockedHits.push(...mainCatalogExercises(poolState(count)).filter(isAxialBarbell))
      unlockedHits.push(
        ...mainCatalogExercises(
          poolState(count, { unlockedRiskCategories: ["axial_loaded_lower"] }),
        ).filter(isAxialBarbell),
      )
    }

    expect(lockedHits).toHaveLength(0)
    expect(unlockedHits.length).toBeGreaterThan(0)
  })

  it("labels manually unlocked risk movements so they are distinguishable from default-safe ones", () => {
    for (let count = 240; count < 240 + 60; count++) {
      const plan = generateSession(
        poolState(count, { unlockedRiskCategories: ["axial_loaded_lower"] }),
      )

      for (const draft of plan.exercises) {
        if (draft.phase !== "main") continue
        const exercise = STRENGTH_EXERCISES.find(
          (item) => item.id === draft.catalogExerciseId,
        )
        const isAxial = exercise ? isAxialBarbell(exercise) : false

        if (isAxial) {
          expect(draft.labels ?? []).toContain("AS·已解锁")
        } else {
          expect(draft.labels ?? []).not.toContain("AS·已解锁")
        }
      }
    }
  })

  it("does not re-prescribe a locked movement that appears in history", () => {
    const snatch = STRENGTH_EXERCISES.find((item) => item.nameEn === "Snatch")!
    const history = [
      {
        completedAt: "2026-01-01T00:00:00.000Z",
        exercises: [
          {
            catalogExerciseId: snatch.id,
            exerciseName: snatch.name,
            phase: "main" as const,
            completedSets: 3,
            workingSetWeightKg: 60,
            workingSetReps: 5,
            wasReplaced: false,
            wasSkipped: false,
            muscleGroups: ["quadriceps"],
          },
        ],
      },
    ]

    for (let count = 240; count < 240 + 12; count++) {
      const ids = generateSession(poolState(count), {
        recentWorkoutSessionSummaries: history,
      })
        .exercises.map((exercise) => exercise.catalogExerciseId)

      expect(ids).not.toContain(snatch.id)
    }
  })
})
