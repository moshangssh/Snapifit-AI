import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

function createRequest(body: unknown) {
  return new Request("http://localhost/api/ai/workout-plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

function createBaseBody() {
  return {
    effectiveUserWeightKg: 72,
    userProfile: {
      weight: 72,
      height: 175,
      age: 30,
      gender: "male",
      activityLevel: "moderate",
      goal: "build_muscle",
    },
    generatedAt: "2026-06-15T08:00:00.000Z",
    recentWorkoutSessionSummaries: [],
    recentExerciseEntries: [],
    fatigueSnapshot: {},
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
  // 创建覆盖六大训练组的最小训练历史
  const chest = findExerciseByName("器械卧推")
  const back = findExerciseByName("单臂坐姿划船")
  const shoulders = findExerciseByName("哑铃坐姿侧平举")
  const quads = findExerciseByName("窄距45度腿举")
  const biceps = findExerciseByName("哑铃蜘蛛弯举")
  const core = findExerciseByName("坐姿腹部绳索卷腹")

  return [
    {
      completedAt: "2026-01-01T08:00:00.000Z",
      exercises: [
        {
          catalogExerciseId: chest.id,
          exerciseName: chest.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: 60,
          workingSetReps: 10,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [chest.primaryMuscle],
        },
        {
          catalogExerciseId: back.id,
          exerciseName: back.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: 50,
          workingSetReps: 10,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [back.primaryMuscle],
        },
      ],
    },
    {
      completedAt: "2026-01-03T08:00:00.000Z",
      exercises: [
        {
          catalogExerciseId: shoulders.id,
          exerciseName: shoulders.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: 10,
          workingSetReps: 10,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [shoulders.primaryMuscle],
        },
        {
          catalogExerciseId: quads.id,
          exerciseName: quads.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: 100,
          workingSetReps: 10,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [quads.primaryMuscle],
        },
      ],
    },
    {
      completedAt: "2026-01-05T08:00:00.000Z",
      exercises: [
        {
          catalogExerciseId: biceps.id,
          exerciseName: biceps.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: 12,
          workingSetReps: 10,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [biceps.primaryMuscle],
        },
        {
          catalogExerciseId: core.id,
          exerciseName: core.name,
          phase: "main",
          completedSets: 3,
          workingSetWeightKg: 0,
          workingSetReps: 15,
          wasReplaced: false,
          wasSkipped: false,
          muscleGroups: [core.primaryMuscle],
        },
      ],
    },
  ]
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

describe("workout plan route", () => {
  it("returns a deterministic novice plan without AI config", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(createRequest(createBaseBody()))
    const payload = await response.json()
    const mainSetCount = payload.exercises
      .filter((exercise: { phase: string }) => exercise.phase === "main")
      .reduce(
        (sum: number, exercise: { sets: Array<unknown> }) =>
          sum + exercise.sets.length,
        0,
      )

    expect(response.status).toBe(200)
    expect(payload.templateIndex).toBe(0)
    expect(payload.phase).toBe("novice")
    expect(payload.sessionAudit).toMatchObject({
      status: "pass",
      mainSetCount,
    })
    expect(payload.microcycleAudit).toMatchObject({
      status: "pass",
      mainSetCount: expect.any(Number),
    })
    expect(payload.microcycleAudit.mainSetCount).toBeGreaterThanOrEqual(
      mainSetCount,
    )
    expect(payload.exercises.length).toBeGreaterThanOrEqual(12)
    expect(payload.exercises.length).toBeLessThanOrEqual(13)
    expect(
      payload.exercises
        .filter((exercise: { phase: string }) => exercise.phase === "main")
        .every((exercise: { sets: Array<{ plannedReps?: number }> }) =>
          exercise.sets.every((set) => set.plannedReps === 10),
      ),
    ).toBe(true)
  })

  it("returns benchmark selection response after 72 completed novice sessions", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        recentWorkoutSessionSummaries: createMinimalTrainingHistory(),
        trainingState: {
          phase: "novice",
          completedSessionCount: 72,
          blacklistedExerciseIds: [],
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      needBenchmarkSelection: true,
      nextPhase: "intermediate",
      reason: "novice_session_threshold",
      benchmarkCandidates: expect.any(Array),
      trainingState: {
        phase: "novice",
        completedSessionCount: 72,
        blacklistedExerciseIds: [],
        phaseTransitionReady: true,
      },
    })
    expect(payload.benchmarkCandidates).toHaveLength(10)
    expect(payload.benchmarkCandidates[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      trainingCount: expect.any(Number),
      progressWeightKg: expect.any(Number),
    })
  })

  it("still returns a novice plan after 71 completed sessions", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        trainingState: {
          phase: "novice",
          completedSessionCount: 71,
          blacklistedExerciseIds: [],
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.needBenchmarkSelection).toBeUndefined()
    expect(payload.trainingState.phaseTransitionReady).toBeUndefined()
    expect(payload.phase).toBe("novice")
    expect(payload.exercises.length).toBeGreaterThan(0)
  })

  it("returns benchmark selection response after a manual downgrade upgrade window", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        recentWorkoutSessionSummaries: createMinimalTrainingHistory(),
        trainingState: {
          phase: "novice",
          completedSessionCount: 80,
          blacklistedExerciseIds: [],
          manualDowngrade: {
            from: "intermediate",
            at: 72,
            upgradeAfter: 8,
          },
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.needBenchmarkSelection).toBe(true)
    expect(payload.reason).toBe("manual_downgrade_upgrade_window")
    expect(payload.trainingState.phaseTransitionReady).toBe(true)
    expect(payload.trainingState.manualDowngrade).toBeUndefined()
  })

  it("returns lifetime benchmark selection response after 240 completed intermediate sessions", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")
    const benchmarkExerciseIds = intermediateBenchmarkIds()

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        recentWorkoutSessionSummaries: [],
        trainingState: {
          phase: "intermediate",
          completedSessionCount: 240,
          blacklistedExerciseIds: [],
          benchmarkExerciseIds,
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      needBenchmarkSelection: true,
      nextPhase: "advanced",
      reason: "intermediate_session_threshold",
      benchmarkCandidates: expect.any(Array),
      trainingState: {
        phase: "intermediate",
        completedSessionCount: 240,
        blacklistedExerciseIds: [],
        benchmarkExerciseIds,
        phaseTransitionReady: true,
      },
    })
    expect(payload.benchmarkCandidates).toHaveLength(10)
    expect(
      payload.benchmarkCandidates.map((candidate: { id: string }) => candidate.id),
    ).toEqual(expect.arrayContaining(benchmarkExerciseIds))
  })

  it("audits intermediate plans against phase structure and the actual microcycle rotation", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        trainingState: {
          phase: "intermediate",
          completedSessionCount: 72,
          blacklistedExerciseIds: [],
          benchmarkExerciseIds: intermediateBenchmarkIds(),
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.phase).toBe("intermediate")
    expect(payload.sessionAudit).toMatchObject({
      status: "pass",
      mainSetCount: 12,
    })
    expect(payload.microcycleAudit).toMatchObject({
      status: "pass",
      mainSetCount: 66,
      sessionCount: 6,
    })
  })

  it("audits advanced plans against phase structure and the actual microcycle rotation", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        trainingState: {
          phase: "advanced",
          completedSessionCount: 241,
          blacklistedExerciseIds: [],
          lifetimeBenchmarkIds: intermediateBenchmarkIds().slice(0, 5),
          lastDeloadSession: 240,
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.phase).toBe("advanced")
    expect(payload.sessionAudit).toMatchObject({
      status: "pass",
      mainSetCount: 9,
    })
    expect(payload.microcycleAudit).toMatchObject({
      status: "pass",
      mainSetCount: 72,
      sessionCount: 6,
    })
  })

  it("uses recent catalog exercise history when calculating next weights", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const baselineResponse = await POST(createRequest(createBaseBody()))
    const baseline = await baselineResponse.json()
    const mainExercise = baseline.exercises.find(
      (exercise: { phase: string }) => exercise.phase === "main",
    )

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        recentWorkoutSessionSummaries: [
          {
            completedAt: "2026-06-15T08:00:00.000Z",
            exercises: [
              {
                catalogExerciseId: mainExercise.catalogExerciseId,
                exerciseName: mainExercise.plannedExerciseName,
                phase: mainExercise.phase,
                completedSets: 3,
                workingSetWeightKg: mainExercise.sets[0].plannedWeightKg,
                workingSetReps: 10,
                wasReplaced: false,
                wasSkipped: false,
                muscleGroups: mainExercise.plannedAnalysis.muscleGroups,
                sets: mainExercise.sets.map(
                  (set: { plannedWeightKg?: number; plannedReps?: number }) => ({
                    plannedWeightKg: set.plannedWeightKg,
                    plannedReps: set.plannedReps,
                    actualWeightKg: set.plannedWeightKg,
                    actualReps: set.plannedReps,
                    isCompleted: true,
                    isSkipped: false,
                  }),
                ),
              },
            ],
          },
        ],
      }),
    )
    const payload = await response.json()
    const progressedExercise = payload.exercises.find(
      (exercise: { catalogExerciseId?: string }) =>
        exercise.catalogExerciseId === mainExercise.catalogExerciseId,
    )

    expect(response.status).toBe(200)
    expect(
      progressedExercise.sets.map(
        (set: { plannedWeightKg?: number }) => set.plannedWeightKg,
      ),
    ).toEqual([
      mainExercise.sets[0].plannedWeightKg + 1.25,
      mainExercise.sets[0].plannedWeightKg + 1.25,
      mainExercise.sets[0].plannedWeightKg + 1.25,
    ])
  })

  it("returns constrained audit reasons when blacklists prevent enough main volume", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")
    const benchmarkExerciseIds = intermediateBenchmarkIds()
    const fullStrengthBlacklist = STRENGTH_EXERCISES.map((exercise) => exercise.id)

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        trainingState: {
          phase: "intermediate",
          completedSessionCount: 120,
          benchmarkExerciseIds,
          blacklistedExerciseIds: fullStrengthBlacklist,
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.phase).toBe("intermediate")
    expect(payload.microcycleAudit.status).toBe("constrained")
    expect(payload.microcycleAudit.constrainedReasons).toContain("blacklist")
  })
})
