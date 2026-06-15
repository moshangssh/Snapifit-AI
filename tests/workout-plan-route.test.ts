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
})
