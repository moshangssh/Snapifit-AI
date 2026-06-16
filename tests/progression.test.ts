import { describe, expect, it } from "vitest"
import { evaluateProgression } from "@/lib/workout/engine/progression"
import type { MuscleGroup } from "@/lib/workout/engine/catalog"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

const EXERCISE_ID = "machine-chest-press"

// Synthetic dates for deterministic testing
function completedExercise(input: {
  completedAt: string
  actualReps: [number, number, number]
  actualWeightKg?: number
  plannedReps?: number
  primaryMuscle?: MuscleGroup
}): RecentWorkoutSessionSummary {
  const weight = input.actualWeightKg ?? 40
  const plannedReps = input.plannedReps ?? 10

  return {
    completedAt: input.completedAt,
    exercises: [
      {
        catalogExerciseId: EXERCISE_ID,
        exerciseName: "器械卧推",
        phase: "main",
        completedSets: 3,
        workingSetWeightKg: weight,
        workingSetReps: plannedReps,
        wasReplaced: false,
        wasSkipped: false,
        muscleGroups: [input.primaryMuscle ?? "CHEST"],
        sets: input.actualReps.map((actualReps) => ({
          plannedWeightKg: weight,
          plannedReps,
          actualWeightKg: weight,
          actualReps,
          isCompleted: true,
          isSkipped: false,
        })),
      },
    ],
  }
}

function evaluate(history: RecentWorkoutSessionSummary[]) {
  return evaluateProgression(history, EXERCISE_ID, {
    primaryMuscle: "CHEST",
    effectiveUserWeightKg: 70,
  })
}

describe("novice progression rules", () => {
  it("adds upper-body weight after completing all target reps", () => {
    expect(
      evaluate([
        completedExercise({
          completedAt: "2026-06-15T08:00:00.000Z",
          actualReps: [10, 10, 10],
        }),
      ]),
    ).toEqual({
      action: "add_weight",
      weight: 41.25, // 40kg + 1.25kg (upper body standard increment)
      plannedReps: 10,
    })
  })

  it("maintains weight after one failed attempt", () => {
    expect(
      evaluate([
        completedExercise({
          completedAt: "2026-06-15T08:00:00.000Z",
          actualReps: [10, 8, 8],
        }),
      ]),
    ).toEqual({
      action: "maintain",
      weight: 40,
      plannedReps: 10,
    })
  })

  it("reduces target reps after two consecutive failures", () => {
    expect(
      evaluate([
        completedExercise({
          completedAt: "2026-06-18T08:00:00.000Z",
          actualReps: [10, 8, 8],
        }),
        completedExercise({
          completedAt: "2026-06-15T08:00:00.000Z",
          actualReps: [10, 8, 8],
        }),
      ]),
    ).toEqual({
      action: "reduce_reps",
      weight: 40,
      plannedReps: 8,
    })
  })

  it("replaces the exercise after three consecutive failures", () => {
    const result = evaluate([
      completedExercise({
        completedAt: "2026-06-21T08:00:00.000Z",
        actualReps: [10, 8, 8],
      }),
      completedExercise({
        completedAt: "2026-06-18T08:00:00.000Z",
        actualReps: [10, 8, 8],
      }),
      completedExercise({
        completedAt: "2026-06-15T08:00:00.000Z",
        actualReps: [10, 8, 8],
      }),
    ])

    expect(result.action).toBe("replace")
    expect(result.weight).toBe(40)
    // After multiple failures, reps are reduced before replacement
    expect(result.plannedReps).toBe(8)
  })
})
