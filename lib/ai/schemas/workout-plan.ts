import { z } from "zod"
import { MUSCLE_KEYS } from "@/lib/muscle-groups"
import {
  normalizeWorkoutExerciseAnalysis,
  WorkoutExerciseTypeSchema,
} from "@/lib/ai/schemas/workout-exercise-enrich"

const WorkoutPlanSetSchema = z.object({
  plannedWeightKg: z.number().positive().optional(),
  plannedReps: z.number().int().positive().optional(),
})

const WorkoutPlanPhaseSchema = z.enum(["warmup", "main", "cooldown"])

const WorkoutPlanMuscleGroupSchema = z.enum(MUSCLE_KEYS)

const WorkoutPlanAnalysisSchema = z.object({
  exerciseType: WorkoutExerciseTypeSchema,
  muscleGroups: z.array(WorkoutPlanMuscleGroupSchema).min(1).max(3),
  estimatedMets: z
    .number()
    .transform((value) => Math.min(8, Math.max(1, value))),
  estimatedDurationMinutes: z
    .number()
    .transform((value) => Math.max(1, Math.round(value))),
  caloriesBurnedEstimated: z.number().transform((value) => Math.max(0, value)),
  isEstimated: z.boolean().default(true),
})

const PHASE_ORDER = {
  warmup: 0,
  main: 1,
  cooldown: 2,
} as const

const WorkoutPlanExerciseSchema = z.object({
  plannedExerciseName: z.string().min(1),
  phase: WorkoutPlanPhaseSchema,
  notes: z.string().optional(),
  tips: z.array(z.string().min(1)).min(2).max(4),
  sets: z.array(WorkoutPlanSetSchema).min(1),
  plannedAnalysis: WorkoutPlanAnalysisSchema,
})

export const WorkoutPlanSchema = z.object({
  exercises: z.array(WorkoutPlanExerciseSchema).min(7).max(9),
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

  if (phaseCounts.warmup !== 2 || phaseCounts.main < 2 || phaseCounts.main > 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Workout plan requires 2 warmup, 2-4 main exercises",
      path: ["exercises"],
    })
  }

  if (phaseCounts.cooldown !== 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Workout plan requires 3 cooldown exercises",
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
      plannedAnalysis: normalizeWorkoutExerciseAnalysis(
        exercise.plannedAnalysis,
        effectiveUserWeightKg,
        exercise.plannedExerciseName,
      ),
    })),
  }
}
