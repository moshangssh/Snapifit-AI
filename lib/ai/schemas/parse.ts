import { z } from "zod"
import { v4 as uuidv4 } from "uuid"

/**
 * 营养成分 schema。
 * passthrough 允许 AI 返回额外字段(对齐 lib/types.ts 里的 [key: string]: number | undefined)。
 */
const NutritionalInfoSchema = z
  .object({
    calories: z.number(),
    carbohydrates: z.number(),
    protein: z.number(),
    fat: z.number(),
    fiber: z.number().optional(),
    sugar: z.number().optional(),
    sodium: z.number().optional(),
  })
  .passthrough()

/** 食物解析 schema。log_id 在 Zod transform 阶段自动注入 UUID。 */
export const FoodParseSchema = z.object({
  food: z.array(
    z.object({
      log_id: z.string().optional().transform(() => uuidv4()),
      food_name: z.string(),
      consumed_grams: z.number(),
      meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
      time_period: z.enum(["morning", "noon", "afternoon", "evening"]),
      nutritional_info_per_100g: NutritionalInfoSchema,
      total_nutritional_info_consumed: NutritionalInfoSchema,
      is_estimated: z.boolean(),
    }),
  ),
})

/** 运动解析 schema。同样自动注入 log_id。 */
export const ExerciseParseSchema = z.object({
  exercise: z.array(
    z.object({
      log_id: z.string().optional().transform(() => uuidv4()),
      exercise_name: z.string(),
      exercise_type: z.enum(["cardio", "strength", "flexibility", "other"]),
      duration_minutes: z.number(),
      distance_km: z.number().optional(),
      sets: z.number().optional(),
      reps: z.number().optional(),
      weight_kg: z.number().optional(),
      estimated_mets: z.number(),
      user_weight: z.number(),
      calories_burned_estimated: z.number(),
      muscle_groups: z.array(z.string()).optional(),
      is_estimated: z.boolean(),
    }),
  ),
})

export type FoodParseResult = z.infer<typeof FoodParseSchema>
export type ExerciseParseResult = z.infer<typeof ExerciseParseSchema>
