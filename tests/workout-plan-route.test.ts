import { describe, expect, it } from "vitest"

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

describe("workout plan route", () => {
  it("returns a deterministic novice plan without AI config", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(createRequest(createBaseBody()))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.templateIndex).toBe(0)
    expect(payload.phase).toBe("novice")
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
      trainingState: {
        phase: "novice",
        completedSessionCount: 72,
        blacklistedExerciseIds: [],
        phaseTransitionReady: true,
      },
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
})
