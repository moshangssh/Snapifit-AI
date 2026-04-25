import { z } from "zod"
import { MUSCLE_KEY_SET, type MuscleKey } from "@/lib/muscle-groups"

export const WorkoutExerciseTypeSchema = z.enum([
  "cardio",
  "strength",
  "flexibility",
  "other",
])

export const WorkoutExerciseAnalysisSchema = z.object({
  exerciseType: WorkoutExerciseTypeSchema,
  muscleGroups: z
    .array(z.string())
    .default([])
    .transform((items) =>
      items
        .map((item) => item.trim())
        .filter((item): item is MuscleKey => MUSCLE_KEY_SET.has(item)),
    ),
  estimatedMets: z.number().transform((value) => Math.max(1, value)),
  estimatedDurationMinutes: z
    .number()
    .transform((value) => Math.max(1, Math.round(value))),
  caloriesBurnedEstimated: z.number().transform((value) => Math.max(0, value)),
  isEstimated: z.boolean().default(true),
})

export const WorkoutExerciseEnrichSchema = WorkoutExerciseAnalysisSchema

export type WorkoutExerciseEnrichResult = z.infer<
  typeof WorkoutExerciseEnrichSchema
>
