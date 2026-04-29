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
        plannedExerciseName: "靠墙胸椎伸展",
        phase: "warmup",
        notes: "为主训练准备胸椎活动度",
        tips: ["保持自然呼吸", "不要强行追求大幅度后伸"],
        sets: [{ plannedReps: 10 }],
        plannedAnalysis: {
          exerciseType: "flexibility",
          muscleGroups: ["upper-back"],
          estimatedMets: 2,
          estimatedDurationMinutes: 4,
          caloriesBurnedEstimated: 10,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "弹力带肩外旋",
        phase: "warmup",
        notes: "激活肩袖以准备推类动作",
        tips: ["肘部贴近身体", "使用轻阻力避免耸肩代偿"],
        sets: [{ plannedReps: 12 }],
        plannedAnalysis: {
          exerciseType: "other",
          muscleGroups: ["back-deltoids"],
          estimatedMets: 2,
          estimatedDurationMinutes: 4,
          caloriesBurnedEstimated: 10,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "卧推",
        phase: "main",
        notes: "作为本次胸部主训练",
        tips: ["保持肩胛稳定", "推起时呼气避免憋气"],
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
        tips: ["手腕保持中立", "肩部不适时降低重量"],
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
        tips: ["肘部保持固定", "避免身体前后摆动借力"],
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
        tips: ["拉伸到轻微牵拉感即可", "不要压到疼痛范围"],
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
      {
        plannedExerciseName: "跪姿髋屈肌拉伸",
        phase: "cooldown",
        notes: "恢复髋前侧活动度",
        tips: ["骨盆轻微后倾", "避免塌腰代偿"],
        sets: [{ plannedReps: 8 }],
        plannedAnalysis: {
          exerciseType: "flexibility",
          muscleGroups: ["quadriceps"],
          estimatedMets: 2,
          estimatedDurationMinutes: 4,
          caloriesBurnedEstimated: 10,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "仰卧腹式呼吸",
        phase: "cooldown",
        notes: "降低训练后紧张度",
        tips: ["呼吸保持平稳", "腰背不适时缩短保持时间"],
        sets: [{ plannedReps: 8 }],
        plannedAnalysis: {
          exerciseType: "other",
          muscleGroups: ["abs"],
          estimatedMets: 1,
          estimatedDurationMinutes: 3,
          caloriesBurnedEstimated: 5,
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

    expect(parsed.exercises).toHaveLength(8)
    expect(parsed.exercises[2].plannedAnalysis.muscleGroups).toEqual([
      "chest",
      "triceps",
    ])
    expect(parsed.exercises[2].tips).toEqual([
      "保持肩胛稳定",
      "推起时呼气避免憋气",
    ])
    expect(parsed.exercises.map((exercise) => exercise.phase)).toEqual([
      "warmup",
      "warmup",
      "main",
      "main",
      "main",
      "cooldown",
      "cooldown",
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
            tips: ["保持自然呼吸", "避免疼痛范围"],
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

  it("requires 2 warmup exercises and 3 cooldown exercises", () => {
    expect(() =>
      WorkoutPlanSchema.parse(
        makePlan({
          exercises: makePlan().exercises.filter(
            (exercise) =>
              exercise.plannedExerciseName !== "弹力带肩外旋" &&
              exercise.plannedExerciseName !== "仰卧腹式呼吸",
          ),
        }),
      ),
    ).toThrow()
  })

  it("requires 2-4 tips for each workout plan exercise", () => {
    const plan = makePlan()
    plan.exercises[2] = {
      ...plan.exercises[2],
      tips: ["保持肩胛稳定"],
    }

    expect(() => WorkoutPlanSchema.parse(plan)).toThrow()
  })

  it("requires positive weight and reps for strength sets", () => {
    const plan = makePlan()
    plan.exercises[2].sets[0] = { plannedReps: 8 }

    expect(() => WorkoutPlanSchema.parse(plan)).toThrow()
  })

  it("rejects invalid workout plan muscle groups before normalization", () => {
    const plan = makePlan()
    plan.exercises[2] = {
      ...plan.exercises[2],
      plannedAnalysis: {
        ...plan.exercises[2].plannedAnalysis,
        muscleGroups: ["胸部"],
      },
    }

    expect(() => WorkoutPlanSchema.parse(plan)).toThrow()
  })

  it("rejects mixed valid and invalid workout plan muscle groups", () => {
    const plan = makePlan()
    plan.exercises[2] = {
      ...plan.exercises[2],
      plannedAnalysis: {
        ...plan.exercises[2].plannedAnalysis,
        muscleGroups: ["chest", "胸部"],
      },
    }

    expect(() => WorkoutPlanSchema.parse(plan)).toThrow()
  })

  it("requires at least one workout plan muscle group", () => {
    const plan = makePlan()
    plan.exercises[2] = {
      ...plan.exercises[2],
      plannedAnalysis: {
        ...plan.exercises[2].plannedAnalysis,
        muscleGroups: [],
      },
    }

    expect(() => WorkoutPlanSchema.parse(plan)).toThrow()
  })

  it("keeps workout exercise enrich muscle group normalization lenient", () => {
    const parsed = WorkoutExerciseEnrichSchema.parse({
      exerciseType: "strength",
      muscleGroups: ["chest", "胸部"],
      estimatedMets: 5,
      estimatedDurationMinutes: 10,
      caloriesBurnedEstimated: 50,
      isEstimated: true,
    })

    expect(parsed.muscleGroups).toEqual(["chest"])
  })

  it("recalculates workout plan calories from effective body weight", () => {
    const plan = WorkoutPlanSchema.parse(makePlan())
    const normalized = recalculateWorkoutPlanCalories(plan, 80)

    expect(normalized.exercises[2].plannedAnalysis.caloriesBurnedEstimated).toBe(
      80,
    )
    expect(normalized.exercises[2].plannedAnalysis.isEstimated).toBe(true)
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
