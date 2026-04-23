import { z } from "zod"
import { WorkoutExerciseAnalysisSchema } from "@/lib/ai/schemas/workout-exercise-enrich"

const WorkoutPlanSetSchema = z.object({
  plannedWeightKg: z.number().optional(),
  plannedReps: z.number().optional(),
})

const WorkoutPlanExerciseSchema = z.object({
  plannedExerciseName: z.string().min(1),
  notes: z.string().optional(),
  sets: z.array(WorkoutPlanSetSchema).min(1),
  plannedAnalysis: WorkoutExerciseAnalysisSchema,
})

export const WorkoutPlanSchema = z.object({
  exercises: z.array(WorkoutPlanExerciseSchema).min(1),
})

export type WorkoutPlanResult = z.infer<typeof WorkoutPlanSchema>
