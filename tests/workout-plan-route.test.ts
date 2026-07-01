import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

// The route is a thin adapter: parse + 400 guard, then map planWorkout's result kind to
// the wire format. Every prescription / transition / audit rule is covered in-process in
// plan-workout.test.ts; this only checks the transport contract (status + shape).

function createRequest(body: unknown) {
  return new Request("http://localhost/api/ai/workout-plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
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

describe("workout-plan route adapter", () => {
  it("rejects invalid input with 400 INVALID_INPUT", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({ ...createBaseBody(), effectiveUserWeightKg: 0 }),
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.code).toBe("INVALID_INPUT")
  })

  it("maps a prescription result to a 200 plan carrying its 审计快照", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(createRequest(createBaseBody()))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.phase).toBe("novice")
    expect(payload.sessionAudit).toMatchObject({
      status: "pass",
      mainSetCount: expect.any(Number),
    })
    expect(payload.microcycleAudit).toMatchObject({
      status: expect.any(String),
      summary: expect.any(String),
    })
  })

  it("maps a needBenchmarkSelection result to a 200 selection payload", async () => {
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
    expect(payload).toMatchObject({
      needBenchmarkSelection: true,
      nextPhase: "intermediate",
      reason: "novice_session_threshold",
      benchmarkCandidates: expect.any(Array),
      trainingState: { phaseTransitionReady: true },
    })
  })

  it("maps an insufficientHistory result to a 422 with the phase-specific message", async () => {
    const { POST } = await import("@/app/api/ai/workout-plan/route")

    const response = await POST(
      createRequest({
        ...createBaseBody(),
        recentWorkoutSessionSummaries: [],
        trainingState: {
          phase: "novice",
          completedSessionCount: 72,
          blacklistedExerciseIds: [],
        },
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(422)
    expect(payload.code).toBe("INSUFFICIENT_TRAINING_HISTORY")
    expect(payload.error).toContain("训练组")
  })
})
