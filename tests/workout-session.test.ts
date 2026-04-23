import { describe, expect, it } from "vitest"
import { createWorkoutSessionFromPlan } from "@/lib/workout/session"

describe("workout session core", () => {
  it("creates a current draft session for first use", () => {
    const session = createWorkoutSessionFromPlan({
      sessionRole: "current",
      effectiveUserWeightKg: 72,
      planContext: {
        generatedAt: "2026-04-23T00:00:00.000Z",
        userGoal: "gain_muscle",
        recentWorkoutSessionSummaries: [],
        recentExerciseEntries: [],
        fatigueSnapshot: {},
      },
      exercises: [
        {
          plannedExerciseName: "卧推",
          notes: "保持肩胛稳定",
          sets: [
            { plannedWeightKg: 60, plannedReps: 8 },
            { plannedWeightKg: 60, plannedReps: 8 },
          ],
          plannedAnalysis: {
            exerciseType: "strength",
            muscleGroups: ["chest", "triceps"],
            estimatedMets: 6,
            estimatedDurationMinutes: 12,
            caloriesBurnedEstimated: 86,
            isEstimated: true,
          },
        },
      ],
      now: "2026-04-23T09:00:00.000Z",
    })

    expect(session.sessionRole).toBe("current")
    expect(session.status).toBe("draft")
    expect(session.exercises[0].sets[0].actualWeightKg).toBe(60)
    expect(session.derived.totalSetCount).toBe(2)
  })
})
