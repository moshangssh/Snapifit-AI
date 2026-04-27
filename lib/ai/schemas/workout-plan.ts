import { z } from "zod"
import { WorkoutExerciseAnalysisSchema } from "@/lib/ai/schemas/workout-exercise-enrich"

const WorkoutPlanSetSchema = z.object({
  plannedWeightKg: z.number().positive().optional(),
  plannedReps: z.number().int().positive().optional(),
})

const WorkoutPlanPhaseSchema = z.enum(["warmup", "main", "cooldown"])
const PHASE_ORDER = {
  warmup: 0,
  main: 1,
  cooldown: 2,
} as const

const WorkoutPlanExerciseSchema = z.object({
  plannedExerciseName: z.string().min(1),
  phase: WorkoutPlanPhaseSchema,
  notes: z.string().optional(),
  sets: z.array(WorkoutPlanSetSchema).min(1),
  plannedAnalysis: WorkoutExerciseAnalysisSchema,
})

export const WorkoutPlanSchema = z.object({
  exercises: z.array(WorkoutPlanExerciseSchema).min(4).max(6),
}).superRefine((plan, ctx) => {
  const phaseCounts = {
    warmup: 0,
    main: 0,
    cooldown: 0,
  }
  let previousPhaseOrder = -1

  plan.exercises.forEach((exercise, exerciseIndex) => {
    phaseCounts[exercise.phase] += 1

    const currentPhaseOrder = PHASE_ORDER[exercise.phase]
    if (currentPhaseOrder < previousPhaseOrder) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Workout phases must be ordered warmup, main, cooldown",
        path: ["exercises", exerciseIndex, "phase"],
      })
    }
    previousPhaseOrder = currentPhaseOrder

    const setCount = exercise.sets.length
    const isMain = exercise.phase === "main"
    const minSets = isMain ? 3 : 1
    const maxSets = isMain ? 5 : 2
    if (setCount < minSets || setCount > maxSets) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${exercise.phase} exercises require ${minSets}-${maxSets} sets`,
        path: ["exercises", exerciseIndex, "sets"],
      })
    }

    if (exercise.plannedAnalysis.estimatedMets > 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "estimatedMets must not exceed 8",
        path: ["exercises", exerciseIndex, "plannedAnalysis", "estimatedMets"],
      })
    }

    exercise.sets.forEach((set, setIndex) => {
      if (typeof set.plannedReps !== "number") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "plannedReps is required",
          path: ["exercises", exerciseIndex, "sets", setIndex, "plannedReps"],
        })
      }

      if (
        exercise.plannedAnalysis.exerciseType === "strength" &&
        typeof set.plannedWeightKg !== "number"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "plannedWeightKg is required for strength exercises",
          path: ["exercises", exerciseIndex, "sets", setIndex, "plannedWeightKg"],
        })
      }
    })
  })

  if (phaseCounts.warmup !== 1 || phaseCounts.main < 2 || phaseCounts.main > 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Workout plan requires 1 warmup, 2-4 main exercises",
      path: ["exercises"],
    })
  }

  if (phaseCounts.cooldown !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Workout plan requires 1 cooldown exercise",
      path: ["exercises"],
    })
  }
})

export type WorkoutPlanResult = z.infer<typeof WorkoutPlanSchema>

export function recalculateWorkoutPlanCalories(
  plan: WorkoutPlanResult,
  effectiveUserWeightKg: number,
): WorkoutPlanResult {
  return {
    ...plan,
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      plannedAnalysis: {
        ...exercise.plannedAnalysis,
        caloriesBurnedEstimated: Math.round(
          (exercise.plannedAnalysis.estimatedMets *
            effectiveUserWeightKg *
            exercise.plannedAnalysis.estimatedDurationMinutes) /
            60,
        ),
        isEstimated: true,
      },
    })),
  }
}
