import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { planWorkout, type PlanWorkoutRequest } from "@/lib/workout/prescription"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

// Domain tests at the deep module's interface. The HTTP route (workout-plan-route.test.ts)
// only smoke-tests the kind→status mapping; every prescription / transition / audit rule
// is asserted here, in-process, against planWorkout directly.

function baseRequest(): PlanWorkoutRequest {
  return {
    effectiveUserWeightKg: 72,
    fatigueSnapshot: {},
    recentWorkoutSessionSummaries: [],
    trainingState: {
      phase: "novice",
      completedSessionCount: 4,
      blacklistedExerciseIds: [],
    },
  }
}

function findExerciseByName(name: string) {
  const exercise = STRENGTH_EXERCISES.find((item) => item.name === name)
  if (!exercise) throw new Error(`Missing fixture exercise: ${name}`)
  return exercise
}

function createMinimalTrainingHistory(): RecentWorkoutSessionSummary[] {
  // 覆盖六大训练组的最小训练历史
  const groups: Array<[string, number, number]> = [
    ["器械卧推", 60, 10],
    ["单臂坐姿划船", 50, 10],
    ["哑铃坐姿侧平举", 10, 10],
    ["窄距45度腿举", 100, 10],
    ["哑铃蜘蛛弯举", 12, 10],
    ["坐姿腹部绳索卷腹", 0, 15],
  ]

  return groups.map(([name, weight, reps], index) => {
    const exercise = findExerciseByName(name)
    return {
      completedAt: `2026-01-0${index + 1}T08:00:00.000Z`,
      exercises: [
        {
          catalogExerciseId: exercise.id,
          exerciseName: exercise.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: weight,
          workingSetReps: reps,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [exercise.primaryMuscle],
        },
      ],
    }
  })
}

function intermediateBenchmarkIds(): string[] {
  const names = [
    "器械卧推",
    "单臂坐姿划船",
    "哑铃坐姿侧平举",
    "窄距45度腿举",
    "哑铃蜘蛛弯举",
    "坐姿腹部绳索卷腹",
  ]
  const requiredIds = names.map((name) => findExerciseByName(name).id)
  const remainingIds = STRENGTH_EXERCISES.filter(
    (exercise) =>
      exercise.tags.includes("NOVICE_CORE") && !requiredIds.includes(exercise.id),
  )
    .slice(0, 4)
    .map((exercise) => exercise.id)

  return [...requiredIds, ...remainingIds]
}

function expectPrescription(result: ReturnType<typeof planWorkout>) {
  if (result.kind !== "prescription") {
    throw new Error(`expected prescription, got ${result.kind}`)
  }
  return result.plan
}

describe("planWorkout — prescription outcome", () => {
  it("generates a deterministic novice prescription with an attached 审计快照", () => {
    const plan = expectPrescription(planWorkout(baseRequest()))
    const mainSetCount = plan.exercises
      .filter((exercise) => exercise.phase === "main")
      .reduce((sum, exercise) => sum + exercise.sets.length, 0)

    expect(plan.templateIndex).toBe(0)
    expect(plan.phase).toBe("novice")
    expect(plan.sessionAudit).toMatchObject({ status: "pass", mainSetCount })
    expect(plan.microcycleAudit).toMatchObject({
      status: "pass",
      mainSetCount: expect.any(Number),
    })
    expect(plan.microcycleAudit.mainSetCount).toBeGreaterThanOrEqual(mainSetCount)
    expect(plan.exercises.length).toBeGreaterThanOrEqual(12)
    expect(plan.exercises.length).toBeLessThanOrEqual(13)
    expect(
      plan.exercises
        .filter((exercise) => exercise.phase === "main")
        .every((exercise) => exercise.sets.every((set) => set.plannedReps === 10)),
    ).toBe(true)
  })

  it("still prescribes a novice session at 71 completed sessions", () => {
    const result = planWorkout({
      ...baseRequest(),
      trainingState: {
        phase: "novice",
        completedSessionCount: 71,
        blacklistedExerciseIds: [],
      },
    })

    expect(result.kind).toBe("prescription")
    expect(expectPrescription(result).phase).toBe("novice")
  })

  it("audits an intermediate prescription against the actual microcycle rotation", () => {
    const plan = expectPrescription(
      planWorkout({
        ...baseRequest(),
        trainingState: {
          phase: "intermediate",
          completedSessionCount: 72,
          blacklistedExerciseIds: [],
          benchmarkExerciseIds: intermediateBenchmarkIds(),
        },
      }),
    )

    expect(plan.phase).toBe("intermediate")
    expect(plan.sessionAudit).toMatchObject({ status: "pass", mainSetCount: 12 })
    expect(plan.microcycleAudit).toMatchObject({
      status: "pass",
      mainSetCount: 66,
      sessionCount: 6,
    })
  })

  it("audits an advanced prescription against the actual microcycle rotation", () => {
    const plan = expectPrescription(
      planWorkout({
        ...baseRequest(),
        trainingState: {
          phase: "advanced",
          completedSessionCount: 241,
          blacklistedExerciseIds: [],
          lifetimeBenchmarkIds: intermediateBenchmarkIds().slice(0, 5),
          lastDeloadSession: 240,
        },
      }),
    )

    expect(plan.phase).toBe("advanced")
    expect(plan.sessionAudit).toMatchObject({ status: "pass", mainSetCount: 9 })
    expect(plan.microcycleAudit).toMatchObject({
      status: "pass",
      mainSetCount: 72,
      sessionCount: 6,
    })
  })

  it("progresses main weight from recent catalog history", () => {
    const baseline = expectPrescription(planWorkout(baseRequest()))
    const mainExercise = baseline.exercises.find(
      (exercise) => exercise.phase === "main",
    )!

    const plan = expectPrescription(
      planWorkout({
        ...baseRequest(),
        recentWorkoutSessionSummaries: [
          {
            completedAt: "2026-06-15T08:00:00.000Z",
            exercises: [
              {
                catalogExerciseId: mainExercise.catalogExerciseId,
                exerciseName: mainExercise.plannedExerciseName,
                phase: "main",
                completedSets: 3,
                workingSetWeightKg: mainExercise.sets[0].plannedWeightKg,
                workingSetReps: 10,
                wasReplaced: false,
                wasSkipped: false,
                muscleGroups: mainExercise.plannedAnalysis.muscleGroups,
                sets: mainExercise.sets.map((set) => ({
                  plannedWeightKg: set.plannedWeightKg,
                  plannedReps: set.plannedReps,
                  actualWeightKg: set.plannedWeightKg,
                  actualReps: set.plannedReps,
                  isCompleted: true,
                  isSkipped: false,
                })),
              },
            ],
          },
        ],
      }),
    )
    const progressed = plan.exercises.find(
      (exercise) => exercise.catalogExerciseId === mainExercise.catalogExerciseId,
    )!
    const baseWeight = mainExercise.sets[0].plannedWeightKg!

    expect(progressed.sets.map((set) => set.plannedWeightKg)).toEqual([
      baseWeight + 1.25,
      baseWeight + 1.25,
      baseWeight + 1.25,
    ])
  })

  it("reports a constrained microcycle audit when blacklists starve main volume", () => {
    const plan = expectPrescription(
      planWorkout({
        ...baseRequest(),
        trainingState: {
          phase: "intermediate",
          completedSessionCount: 120,
          benchmarkExerciseIds: intermediateBenchmarkIds(),
          blacklistedExerciseIds: STRENGTH_EXERCISES.map((exercise) => exercise.id),
        },
      }),
    )

    expect(plan.microcycleAudit.status).toBe("constrained")
    expect(plan.microcycleAudit.constrainedReasons).toContain("blacklist")
  })

  it("reports an adjusted microcycle audit that explains the bounded set increase", () => {
    const plan = expectPrescription(
      planWorkout({
        ...baseRequest(),
        trainingState: {
          phase: "novice",
          completedSessionCount: 40,
          blacklistedExerciseIds: [],
        },
      }),
    )

    expect(plan.microcycleAudit.status).toBe("adjusted")
    expect(plan.microcycleAudit.adjustment?.addedSets).toBeGreaterThan(0)
    expect(plan.microcycleAudit.adjustment?.addedExercises).toBe(0)
    expect(plan.microcycleAudit.summary).toContain("加组")
  })
})

describe("planWorkout — needBenchmarkSelection outcome", () => {
  it("asks for intermediate benchmarks after 72 completed novice sessions", () => {
    const result = planWorkout({
      ...baseRequest(),
      recentWorkoutSessionSummaries: createMinimalTrainingHistory(),
      trainingState: {
        phase: "novice",
        completedSessionCount: 72,
        blacklistedExerciseIds: [],
      },
    })

    expect(result).toMatchObject({
      kind: "needBenchmarkSelection",
      nextPhase: "intermediate",
      reason: "novice_session_threshold",
      trainingState: { phaseTransitionReady: true },
    })
    if (result.kind !== "needBenchmarkSelection") throw new Error("unreachable")
    expect(result.candidates).toHaveLength(10)
    expect(result.candidates[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      trainingCount: expect.any(Number),
      progressWeightKg: expect.any(Number),
    })
  })

  it("asks for lifetime benchmarks after 240 completed intermediate sessions", () => {
    const benchmarkExerciseIds = intermediateBenchmarkIds()
    const result = planWorkout({
      ...baseRequest(),
      recentWorkoutSessionSummaries: [],
      trainingState: {
        phase: "intermediate",
        completedSessionCount: 240,
        blacklistedExerciseIds: [],
        benchmarkExerciseIds,
      },
    })

    expect(result).toMatchObject({
      kind: "needBenchmarkSelection",
      nextPhase: "advanced",
      reason: "intermediate_session_threshold",
    })
    if (result.kind !== "needBenchmarkSelection") throw new Error("unreachable")
    expect(result.candidates.map((candidate) => candidate.id)).toEqual(
      expect.arrayContaining(benchmarkExerciseIds),
    )
  })

  it("clears the manual-downgrade record once its upgrade window opens", () => {
    const result = planWorkout({
      ...baseRequest(),
      recentWorkoutSessionSummaries: createMinimalTrainingHistory(),
      trainingState: {
        phase: "novice",
        completedSessionCount: 80,
        blacklistedExerciseIds: [],
        manualDowngrade: { from: "intermediate", at: 72, upgradeAfter: 8 },
      },
    })

    expect(result).toMatchObject({
      kind: "needBenchmarkSelection",
      reason: "manual_downgrade_upgrade_window",
      trainingState: { phaseTransitionReady: true, manualDowngrade: undefined },
    })
  })
})

describe("planWorkout — insufficientHistory outcome", () => {
  it("reports insufficient history when advanced benchmark candidates fall below five", () => {
    const result = planWorkout({
      ...baseRequest(),
      recentWorkoutSessionSummaries: [],
      trainingState: {
        phase: "intermediate",
        completedSessionCount: 240,
        blacklistedExerciseIds: [],
        // 高级候选池限定为用户中级基准动作；只给 3 个 → 候选 < 5
        benchmarkExerciseIds: intermediateBenchmarkIds().slice(0, 3),
      },
    })

    expect(result).toMatchObject({
      kind: "insufficientHistory",
      nextPhase: "advanced",
      required: 5,
    })
    if (result.kind !== "insufficientHistory") throw new Error("unreachable")
    expect(result.have).toBeLessThan(5)
  })

  it("reports insufficient history when intermediate training covers fewer than six groups", () => {
    const result = planWorkout({
      ...baseRequest(),
      recentWorkoutSessionSummaries: [],
      trainingState: {
        phase: "novice",
        completedSessionCount: 72,
        blacklistedExerciseIds: [],
      },
    })

    expect(result).toMatchObject({
      kind: "insufficientHistory",
      nextPhase: "intermediate",
      required: 6,
    })
    if (result.kind !== "insufficientHistory") throw new Error("unreachable")
    expect(result.have).toBeLessThan(6)
  })
})
