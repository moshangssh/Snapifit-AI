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
  estimatedMets: z
    .number()
    .transform((value) => Math.min(8, Math.max(1, value))),
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

const MUSCLE_HINTS: Array<{
  keywords: string[]
  muscleGroups: MuscleKey[]
}> = [
  // 更具体的肩部束在前:反向飞鸟须先于胸部通用关键词"飞鸟"命中。
  { keywords: ["侧平举"], muscleGroups: ["side-deltoids"] },
  { keywords: ["面拉", "反向飞鸟"], muscleGroups: ["back-deltoids"] },
  { keywords: ["卧推", "俯卧撑", "飞鸟", "夹胸"], muscleGroups: ["chest", "triceps"] },
  { keywords: ["划船", "下拉", "引体", "背"], muscleGroups: ["upper-back", "biceps"] },
  { keywords: ["深蹲", "腿举", "弓步"], muscleGroups: ["quadriceps", "glutes"] },
  { keywords: ["硬拉", "臀桥", "腿弯举"], muscleGroups: ["hamstrings", "glutes"] },
  { keywords: ["肩推", "前平举"], muscleGroups: ["front-deltoids"] },
  { keywords: ["弯举"], muscleGroups: ["biceps"] },
  { keywords: ["下压", "臂屈伸"], muscleGroups: ["triceps"] },
  { keywords: ["卷腹", "平板支撑"], muscleGroups: ["abs"] },
]

function inferMuscleGroups(exerciseName?: string): MuscleKey[] {
  if (!exerciseName) return []
  const matched = MUSCLE_HINTS.find((hint) =>
    hint.keywords.some((keyword) => exerciseName.includes(keyword)),
  )
  return matched?.muscleGroups ?? []
}

export function normalizeWorkoutExerciseAnalysis(
  analysis: WorkoutExerciseEnrichResult,
  effectiveUserWeightKg: number,
  exerciseName?: string,
): WorkoutExerciseEnrichResult {
  const parsed = WorkoutExerciseAnalysisSchema.parse(analysis)
  const muscleGroups =
    parsed.exerciseType === "strength" && parsed.muscleGroups.length === 0
      ? inferMuscleGroups(exerciseName)
      : parsed.muscleGroups

  return {
    ...parsed,
    muscleGroups,
    caloriesBurnedEstimated: Math.round(
      (parsed.estimatedMets *
        effectiveUserWeightKg *
        parsed.estimatedDurationMinutes) /
        60,
    ),
    isEstimated: true,
  }
}
