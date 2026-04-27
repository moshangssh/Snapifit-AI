import { describe, expect, it } from "vitest"
import {
  normalizeWorkoutExerciseAnalysis,
  WorkoutExerciseEnrichSchema,
} from "@/lib/ai/schemas/workout-exercise-enrich"
import {
  recalculateWorkoutPlanCalories,
  WorkoutPlanSchema,
} from "@/lib/ai/schemas/workout-plan"

function makePlan(overrides = {}) {
  return {
    exercises: [
      {
        plannedExerciseName: "肩胛俯卧撑",
        phase: "warmup",
        notes: "激活肩胛控制",
        sets: [{ plannedWeightKg: 5, plannedReps: 12 }],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["chest", "front-deltoids"],
          estimatedMets: 4,
          estimatedDurationMinutes: 4,
          caloriesBurnedEstimated: 20,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "卧推",
        phase: "main",
        notes: "保持肩胛稳定",
        sets: [
          { plannedWeightKg: 60, plannedReps: 8 },
          { plannedWeightKg: 60, plannedReps: 8 },
          { plannedWeightKg: 60, plannedReps: 8 },
        ],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["chest", "triceps"],
          estimatedMets: 6,
          estimatedDurationMinutes: 10,
          caloriesBurnedEstimated: 70,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "上斜哑铃卧推",
        phase: "main",
        notes: "补充上胸容量",
        sets: [
          { plannedWeightKg: 20, plannedReps: 10 },
          { plannedWeightKg: 20, plannedReps: 10 },
          { plannedWeightKg: 20, plannedReps: 10 },
        ],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["chest", "front-deltoids"],
          estimatedMets: 5,
          estimatedDurationMinutes: 9,
          caloriesBurnedEstimated: 55,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "绳索下压",
        phase: "main",
        notes: "控制肘部位置",
        sets: [
          { plannedWeightKg: 25, plannedReps: 12 },
          { plannedWeightKg: 25, plannedReps: 12 },
          { plannedWeightKg: 25, plannedReps: 12 },
        ],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["triceps"],
          estimatedMets: 4,
          estimatedDurationMinutes: 8,
          caloriesBurnedEstimated: 40,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "胸大肌拉伸",
        phase: "cooldown",
        notes: "恢复胸肩活动度",
        sets: [{ plannedReps: 10 }],
        plannedAnalysis: {
          exerciseType: "flexibility",
          muscleGroups: ["chest"],
          estimatedMets: 3,
          estimatedDurationMinutes: 4,
          caloriesBurnedEstimated: 14,
          isEstimated: true,
        },
      },
    ],
    ...overrides,
  }
}

describe("workout AI schemas", () => {
  it("parses a workout plan with analysis values", () => {
    const parsed = WorkoutPlanSchema.parse(makePlan())

    expect(parsed.exercises).toHaveLength(5)
    expect(parsed.exercises[1].plannedAnalysis.muscleGroups).toEqual([
      "chest",
      "triceps",
    ])
    expect(parsed.exercises.map((exercise) => exercise.phase)).toEqual([
      "warmup",
      "main",
      "main",
      "main",
      "cooldown",
    ])
  })

  it("requires a structured phase for each workout plan exercise", () => {
    expect(() =>
      WorkoutPlanSchema.parse({
        exercises: [
          {
            plannedExerciseName: "胸椎伸展",
            notes: "热身活动度",
            sets: [{ plannedReps: 10 }],
            plannedAnalysis: {
              exerciseType: "flexibility",
              muscleGroups: ["upper-back"],
              estimatedMets: 3,
              estimatedDurationMinutes: 5,
              caloriesBurnedEstimated: 18,
              isEstimated: true,
            },
          },
        ],
      }),
    ).toThrow()
  })

  it("requires a warmup-main-cooldown workout structure", () => {
    expect(() =>
      WorkoutPlanSchema.parse(
        makePlan({
          exercises: makePlan().exercises.slice(1),
        }),
      ),
    ).toThrow()
  })

  it("requires positive weight and reps for strength sets", () => {
    const plan = makePlan()
    plan.exercises[1].sets[0] = { plannedReps: 8 }

    expect(() => WorkoutPlanSchema.parse(plan)).toThrow()
  })

  it("recalculates workout plan calories from effective body weight", () => {
    const plan = WorkoutPlanSchema.parse(makePlan())
    const normalized = recalculateWorkoutPlanCalories(plan, 80)

    expect(normalized.exercises[1].plannedAnalysis.caloriesBurnedEstimated).toBe(
      80,
    )
    expect(normalized.exercises[1].plannedAnalysis.isEstimated).toBe(true)
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

  it("normalizes analysis calories and clamps MET values", () => {
    const parsed = WorkoutExerciseEnrichSchema.parse({
      exerciseType: "strength",
      muscleGroups: ["chest"],
      estimatedMets: 12,
      estimatedDurationMinutes: 10.4,
      caloriesBurnedEstimated: 999,
      isEstimated: false,
    })

    const normalized = normalizeWorkoutExerciseAnalysis(parsed, 80, "卧推")

    expect(normalized.estimatedMets).toBe(8)
    expect(normalized.estimatedDurationMinutes).toBe(10)
    expect(normalized.caloriesBurnedEstimated).toBe(107)
    expect(normalized.isEstimated).toBe(true)
  })

  it("infers main muscle groups for strength exercises when model output is empty", () => {
    const parsed = WorkoutExerciseEnrichSchema.parse({
      exerciseType: "strength",
      muscleGroups: ["unknown-muscle"],
      estimatedMets: 6,
      estimatedDurationMinutes: 10,
      caloriesBurnedEstimated: 60,
      isEstimated: true,
    })

    const normalized = normalizeWorkoutExerciseAnalysis(parsed, 72, "杠铃划船")

    expect(normalized.muscleGroups).toEqual(["upper-back", "biceps"])
  })
})
