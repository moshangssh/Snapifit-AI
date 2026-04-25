import { describe, expect, it } from "vitest"
import { WorkoutExerciseEnrichSchema } from "@/lib/ai/schemas/workout-exercise-enrich"
import { WorkoutPlanSchema } from "@/lib/ai/schemas/workout-plan"

describe("workout AI schemas", () => {
  it("parses a workout plan with analysis values", () => {
    const parsed = WorkoutPlanSchema.parse({
      exercises: [
        {
          plannedExerciseName: "深蹲",
          notes: "控制下放",
          sets: [
            { plannedWeightKg: 80, plannedReps: 5 },
            { plannedWeightKg: 80, plannedReps: 5 },
          ],
          plannedAnalysis: {
            exerciseType: "strength",
            muscleGroups: ["quadriceps", "glutes"],
            estimatedMets: 6.5,
            estimatedDurationMinutes: 14,
            caloriesBurnedEstimated: 110,
            isEstimated: true,
          },
        },
      ],
    })

    expect(parsed.exercises[0].plannedAnalysis.muscleGroups).toEqual([
      "quadriceps",
      "glutes",
    ])
  })

  it("filters empty muscle groups and clamps unsafe numeric values", () => {
    const parsed = WorkoutExerciseEnrichSchema.parse({
      exerciseType: "strength",
      muscleGroups: ["chest", ""],
      estimatedMets: -1,
      estimatedDurationMinutes: 0,
      caloriesBurnedEstimated: -20,
      isEstimated: true,
    })

    expect(parsed.muscleGroups).toEqual(["chest"])
    expect(parsed.estimatedMets).toBe(1)
    expect(parsed.estimatedDurationMinutes).toBe(1)
    expect(parsed.caloriesBurnedEstimated).toBe(0)
  })

  it("filters muscleGroups outside the MuscleKey enum and trims whitespace", () => {
    const parsed = WorkoutExerciseEnrichSchema.parse({
      exerciseType: "strength",
      muscleGroups: ["chest", "胸大肌", "  triceps  ", "fake_muscle", ""],
      estimatedMets: 6,
      estimatedDurationMinutes: 10,
      caloriesBurnedEstimated: 60,
      isEstimated: true,
    })

    expect(parsed.muscleGroups).toEqual(["chest", "triceps"])
  })
})
