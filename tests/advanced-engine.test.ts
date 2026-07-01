import { describe, expect, it } from "vitest"
import {
  AS_CORE_EXERCISES,
  STRENGTH_EXERCISES,
} from "@/lib/workout/engine/catalog"
import { generateSession } from "@/lib/workout/engine/advanced-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

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

function sessionPhases(session: ReturnType<typeof generateSession>) {
  return session.exercises.map((exercise) => exercise.phase)
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

describe("advanced workout engine", () => {
  it("returns warmup, main, and cooldown while keeping DUP prescriptions on main work", () => {
    const strength = generateSession(makeState(240))
    const warmup = strength.exercises.filter(
      (exercise) => exercise.phase === "warmup",
    )
    const main = strength.exercises.filter((exercise) => exercise.phase === "main")
    const cooldown = strength.exercises.filter(
      (exercise) => exercise.phase === "cooldown",
    )

    expect(warmup).toHaveLength(4)
    expect(main).toHaveLength(4)
    expect(cooldown).toHaveLength(4)
    expect(sessionPhases(strength)).toEqual([
      ...warmup.map(() => "warmup" as const),
      ...main.map(() => "main" as const),
      ...cooldown.map(() => "cooldown" as const),
    ])
    expect(main.every((exercise) => exercise.notes?.includes("RPE 9"))).toBe(
      true,
    )
    expect(
      [...warmup, ...cooldown].every(
        (exercise) => !exercise.notes?.includes("RPE"),
      ),
    ).toBe(true)
  })

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
    expect(sessions[0].exercises.map((exercise) => exercise.phase)).toEqual([
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
    expect(sessions[0].sessionAudit).toMatchObject({
      status: "pass",
      hasThreePhaseStructure: true,
    })
    expect(sessions[0].microcycleAudit).toMatchObject({
      phase: "advanced",
      generatedSessionCount: 6,
    })
  })

  it("audits the same full DUP microcycle consistently from different starting templates", () => {
    // The microcycle audit must describe the canonical rotation, so generating
    // from any session in the cycle yields an identical per-muscle volume audit.
    const audits = [240, 241, 242, 243, 244, 245].map(
      (count) => generateSession(makeState(count)).microcycleAudit,
    )

    const [reference, ...rest] = audits.map((audit) => audit.muscleGroupAudits)
    for (const muscleGroupAudits of rest) {
      expect(muscleGroupAudits).toEqual(reference)
    }
    expect(reference.chest.status).toBe("pass")
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
    expect(
      strength.exercises
        .filter((exercise) => exercise.phase === "main")
        .every((exercise) => exercise.notes?.includes("RPE 9")),
    ).toBe(true)

    expect(
      hypertrophy.exercises
        .filter((exercise) => exercise.phase === "main")
        .flatMap((exercise) => exercise.sets.map((set) => set.plannedReps)),
    ).toEqual(expect.arrayContaining([12]))
    expect(
      hypertrophy.exercises
        .filter((exercise) => exercise.phase === "main")
        .every((exercise) => exercise.notes?.includes("RPE 8")),
    ).toBe(true)

    expect(
      endurance.exercises
        .filter((exercise) => exercise.phase === "main")
        .flatMap((exercise) => exercise.sets.map((set) => set.plannedReps)),
    ).toEqual(expect.arrayContaining([20]))
    expect(
      endurance.exercises
        .filter((exercise) => exercise.phase === "main")
        .every((exercise) => exercise.notes?.includes("RPE 7")),
    ).toBe(true)
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

  it("infers upper or lower AS support focus from the advanced main muscles", () => {
    const upperSession = generateSession(makeState(240))
    const lowerSession = generateSession(makeState(241))
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
      for (const exercise of session.exercises.filter(
        (item) => item.phase === "main",
      )) {
        expect(exercise.sets).toHaveLength(2)
      }
      expect(
        session.exercises.filter((exercise) => exercise.phase === "warmup"),
      ).toHaveLength(4)
      expect(
        session.exercises.filter((exercise) => exercise.phase === "cooldown"),
      ).toHaveLength(4)
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

describe("advanced workout engine e1RM autoregulation", () => {
  function sessionWith(
    exerciseId: string,
    weightKg: number,
    reps: number,
    completedAt = "2026-06-01T00:00:00.000Z",
    sets = 3,
  ): RecentWorkoutSessionSummary {
    return {
      completedAt,
      exercises: [
        {
          catalogExerciseId: exerciseId,
          exerciseName: "benchmark",
          phase: "main",
          completedSets: sets,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: ["chest"],
          sets: Array.from({ length: sets }, () => ({
            plannedWeightKg: weightKg,
            plannedReps: reps,
            actualWeightKg: weightKg,
            actualReps: reps,
            isCompleted: true,
            isSkipped: false,
          })),
        },
      ],
    }
  }

  function mainDraftFor(
    history: RecentWorkoutSessionSummary[],
    completedSessionCount: number,
    exerciseId: string,
  ) {
    return generateSession(makeState(completedSessionCount), {
      recentWorkoutSessionSummaries: history,
    }).exercises.find(
      (exercise) =>
        exercise.phase === "main" && exercise.catalogExerciseId === exerciseId,
    )
  }

  it("autoregulates strength load to e1RM × intensity, not a fixed +kg step", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // e1RM = 50 × (1 + 5/30) = 58.333; strength intensity 0.90 → 52.5 (≠ 50 + 1.25)
    const draft = mainDraftFor([sessionWith(chestId, 50, 5)], 240, chestId)

    expect(draft).toBeDefined()
    expect(draft?.sets[0]?.plannedWeightKg).toBe(52.5)
  })

  it("lowers the next load after an underperforming session, not a fixed ladder", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // Earlier strong session (60×5 → e1RM 70 → 63) then a more recent weak one
    // (50×4 → e1RM 56.667 → 51). Autoregulation tracks the latest, dropping to 51 —
    // a linear "+kg when target met" ladder could never reduce below a prior weight.
    const history = [
      sessionWith(chestId, 60, 5, "2026-06-01T00:00:00.000Z"),
      sessionWith(chestId, 50, 4, "2026-06-08T00:00:00.000Z"),
    ]
    const draft = mainDraftFor(history, 240, chestId)

    expect(draft?.sets[0]?.plannedWeightKg).toBe(51)
  })

  it("makes RPE drive the load: same capacity, heavier on hypertrophy than endurance", () => {
    // An exercise the rotation places on both 肌肥大上 (242, RPE 8) and 耐力上 (244, RPE 7).
    const hypIds = new Set(
      generateSession(makeState(242))
        .exercises.filter((exercise) => exercise.phase === "main")
        .map((exercise) => exercise.catalogExerciseId),
    )
    const sharedId = generateSession(makeState(244))
      .exercises.filter((exercise) => exercise.phase === "main")
      .map((exercise) => exercise.catalogExerciseId)
      .find((id) => typeof id === "string" && hypIds.has(id))
    expect(sharedId).toBeDefined()

    // 40 × 10 → e1RM 53.333; hypertrophy RPE8 ×0.75 = 40.0; endurance RPE7 ×0.62 = 33.0
    const history = [sessionWith(sharedId!, 40, 10)]
    const hypertrophy = mainDraftFor(history, 242, sharedId!)
    const endurance = mainDraftFor(history, 244, sharedId!)

    expect(hypertrophy?.sets[0]?.plannedWeightKg).toBe(40)
    expect(endurance?.sets[0]?.plannedWeightKg).toBe(33)
  })

  it("scales the progression step with load instead of a fixed +kg ladder", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // Hitting the strength rep target lifts load ~5% (e1RM×0.9 at 5 reps), so the
    // absolute step grows with the weight — proportional, not the legacy fixed step
    // that made advanced increments (1.25/2.5kg) larger than intermediate (0.5/1kg).
    const light = mainDraftFor([sessionWith(chestId, 40, 5)], 240, chestId)
    const heavy = mainDraftFor([sessionWith(chestId, 80, 5)], 240, chestId)
    const lightStep = (light?.sets[0]?.plannedWeightKg ?? 0) - 40 // 42 - 40 = 2
    const heavyStep = (heavy?.sets[0]?.plannedWeightKg ?? 0) - 80 // 84 - 80 = 4

    expect(heavyStep).toBeGreaterThan(lightStep)
    expect(heavyStep).toBeCloseTo(lightStep * 2, 5)
  })

  it("frames load as RPE-anchored autoregulation, not 'add weight when reps met'", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    const tips = (mainDraftFor([], 240, chestId)?.tips ?? []).join("")

    expect(tips).toContain("自回归")
    expect(tips).not.toContain("完成目标次数后再加重")
  })
})

describe("advanced workout engine actual RPE correction", () => {
  function sessionWith(
    exerciseId: string,
    weightKg: number,
    reps: number,
    actualRpe?: number,
    completedAt = "2026-06-01T00:00:00.000Z",
    sets = 3,
  ): RecentWorkoutSessionSummary {
    return {
      completedAt,
      exercises: [
        {
          catalogExerciseId: exerciseId,
          exerciseName: "benchmark",
          phase: "main",
          completedSets: sets,
          wasReplaced: false,
          wasSkipped: false,
          actualRpe,
          muscleGroups: ["chest"],
          sets: Array.from({ length: sets }, () => ({
            plannedWeightKg: weightKg,
            plannedReps: reps,
            actualWeightKg: weightKg,
            actualReps: reps,
            isCompleted: true,
            isSkipped: false,
          })),
        },
      ],
    }
  }

  function mainWeightFor(
    history: RecentWorkoutSessionSummary[],
    completedSessionCount: number,
    exerciseId: string,
  ) {
    return generateSession(makeState(completedSessionCount), {
      recentWorkoutSessionSummaries: history,
    }).exercises.find(
      (exercise) =>
        exercise.phase === "main" && exercise.catalogExerciseId === exerciseId,
    )?.sets[0]?.plannedWeightKg
  }

  it("lowers the next load when actual RPE is above target (~3% per point)", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // strength day (target RPE 9), 40×5 → e1RM 46.667 × 0.90 = 42.0 base.
    // Actual RPE 10 (1 over) → −3% → 40.75; RPE 11 (2 over) → −6% → 39.5.
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 10)], 240, chestId)).toBe(
      40.75,
    )
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 11)], 240, chestId)).toBe(
      39.5,
    )
  })

  it("raises the next load when actual RPE is below target (~3% per point)", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // strength day (target RPE 9), 40×5 base 42.0.
    // Actual RPE 8 (1 under) → +3% → 43.25; RPE 7 (2 under) → +6% → 44.5.
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 8)], 240, chestId)).toBe(
      43.25,
    )
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 7)], 240, chestId)).toBe(
      44.5,
    )
  })

  it("caps the total correction at -9% down and +6% up", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // strength day (target RPE 9), 40×5 base 42.0.
    // 4 over would be −12% but the floor is −9% → 38.25 (not 37.0);
    // an even harsher 6 over stays at the same −9% floor.
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 13)], 240, chestId)).toBe(
      38.25,
    )
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 15)], 240, chestId)).toBe(
      38.25,
    )
    // 3 under would be +9% but the ceiling is +6% → 44.5 (not 45.75).
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 6)], 240, chestId)).toBe(
      44.5,
    )
  })

  it("keeps the e1RM base load when actual RPE is missing or equals target", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // Optional field: missing actual RPE must not alter the e1RM autoregulation.
    expect(
      mainWeightFor([sessionWith(chestId, 40, 5, undefined)], 240, chestId),
    ).toBe(42)
    // Actual RPE exactly at target (9) is a zero-point deviation → no correction.
    expect(mainWeightFor([sessionWith(chestId, 40, 5, 9)], 240, chestId)).toBe(
      42,
    )
  })

  it("falls back to the e1RM base load when actual RPE is non-finite", () => {
    const chestId = lifetimeBenchmarkIds()[0]
    // A malformed actual RPE (NaN / Infinity) must never poison the load with
    // NaN — it falls back to the uncorrected e1RM base (42.0), like a missing value.
    expect(
      mainWeightFor([sessionWith(chestId, 40, 5, Number.NaN)], 240, chestId),
    ).toBe(42)
    expect(
      mainWeightFor(
        [sessionWith(chestId, 40, 5, Number.POSITIVE_INFINITY)],
        240,
        chestId,
      ),
    ).toBe(42)
  })

  it("corrects against each training type's own target RPE", () => {
    // An exercise the rotation places on both 肌肥大上 (242, RPE 8) and 耐力上
    // (244, RPE 7), so one actual RPE compares against different targets.
    const hypIds = new Set(
      generateSession(makeState(242))
        .exercises.filter((exercise) => exercise.phase === "main")
        .map((exercise) => exercise.catalogExerciseId),
    )
    const sharedId = generateSession(makeState(244))
      .exercises.filter((exercise) => exercise.phase === "main")
      .map((exercise) => exercise.catalogExerciseId)
      .find((id) => typeof id === "string" && hypIds.has(id))!
    const chestId = lifetimeBenchmarkIds()[0]

    // Same actual RPE 8, one 40×10 performance:
    //  strength target 9 → 1 under → +3% (48.0 → 49.5)
    //  hypertrophy target 8 → on target → base (40.0)
    //  endurance target 7 → 1 over → −3% (33.0 → 32.0)
    expect(
      mainWeightFor([sessionWith(chestId, 40, 10, 8)], 240, chestId),
    ).toBe(49.5)
    expect(
      mainWeightFor([sessionWith(sharedId, 40, 10, 8)], 242, sharedId),
    ).toBe(40)
    expect(
      mainWeightFor([sessionWith(sharedId, 40, 10, 8)], 244, sharedId),
    ).toBe(32)
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

  const isOlympicCompound = (exercise: (typeof STRENGTH_EXERCISES)[number]) =>
    exercise.movementPattern === "compound" && exercise.equipment === "BARBELL"

  it("never prescribes barbell squat/hinge/calf raise, overhead press, or olympic compound lifts by default", () => {
    for (let count = 240; count < 240 + 60; count++) {
      const exercises = mainCatalogExercises(poolState(count))

      expect(exercises.some(isAxialBarbell)).toBe(false)
      expect(exercises.some(isOverheadPress)).toBe(false)
      // olympic_lift category (e.g. 杠铃台阶上步) stays locked — the named 抓举/Snatch
      // was removed in #51, but the structural rule still covers any such lift.
      expect(exercises.some(isOlympicCompound)).toBe(false)
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
    // 杠铃台阶上步 (Barbell Step-up) is an olympic_lift, locked by default.
    const lockedLift = STRENGTH_EXERCISES.find(
      (item) => item.nameEn === "Barbell Step-up",
    )!
    const history = [
      {
        completedAt: "2026-01-01T00:00:00.000Z",
        exercises: [
          {
            catalogExerciseId: lockedLift.id,
            exerciseName: lockedLift.name,
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

      expect(ids).not.toContain(lockedLift.id)
    }
  })
})
