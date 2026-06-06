import { z } from "zod"
import type {
  MealPlanBudgetSnapshot,
  MealPlanOption,
  MealPlanSuggestion,
} from "@/lib/types"

const MealPlanNutritionEstimateSchema = z.object({
  calories: z.number().min(0).transform((value) => Math.round(value)),
  protein: z.number().min(0).transform((value) => Math.round(value)),
  carbohydrates: z.number().min(0).transform((value) => Math.round(value)),
  fat: z.number().min(0).transform((value) => Math.round(value)),
})

const MealPlanMealSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  title: z.string().min(1),
  foods: z.array(z.string().min(1)).min(1).max(6),
  portionHint: z.string().min(1),
  nutrition: MealPlanNutritionEstimateSchema,
})

const MealPlanOptionSchema = z.object({
  type: z.enum(["steady", "craving", "high_protein"]),
  title: z.string().min(1),
  rationale: z.string().min(1),
  meals: z.array(MealPlanMealSchema).min(1).max(4),
  totalNutrition: MealPlanNutritionEstimateSchema,
  slightlyOverBudget: z.boolean().default(false),
  warning: z.string().optional(),
})

const MealPlanItemSchema = z.object({
  title: z.string().min(1),
  kind: z.enum(["combo", "single"]),
  foods: z.array(z.string().min(1)).min(1).max(5),
  portionHint: z.string().min(1),
  bestFor: z.string().min(1),
  nutrition: MealPlanNutritionEstimateSchema,
})

export const MealPlanResponseSchema = z
  .object({
    summary: z.string().min(1),
    plans: z.array(MealPlanOptionSchema).length(3),
    items: z.array(MealPlanItemSchema).min(1).max(8),
  })
  .superRefine((value, ctx) => {
    const types = value.plans.map((plan) => plan.type)
    for (const required of ["steady", "craving", "high_protein"] as const) {
      if (!types.includes(required)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `missing ${required} plan`,
          path: ["plans"],
        })
      }
    }
  })

export type MealPlanResponse = z.infer<typeof MealPlanResponseSchema>

export function validateMealPlanBudget(
  response: MealPlanResponse,
  budget: MealPlanBudgetSnapshot,
): {
  valid: boolean
  maxAllowedCalories: number
  invalidPlanTypes: MealPlanOption["type"][]
} {
  const maxAllowedCalories = Math.round(
    Math.max(0, budget.remainingCalories) * 1.05,
  )
  const invalidPlanTypes = response.plans
    .filter((plan) => {
      const summedMealCalories = plan.meals.reduce(
        (sum, meal) => sum + meal.nutrition.calories,
        0,
      )
      const budgetCalories = Math.max(
        plan.totalNutrition.calories,
        summedMealCalories,
      )
      return budgetCalories > maxAllowedCalories
    })
    .map((plan) => plan.type)

  return {
    valid: invalidPlanTypes.length === 0,
    maxAllowedCalories,
    invalidPlanTypes,
  }
}

export function toMealPlanSuggestion(input: {
  response: MealPlanResponse
  generatedAt: string
  inputPreference: string
  budgetSnapshot: MealPlanBudgetSnapshot
}): MealPlanSuggestion {
  return {
    generatedAt: input.generatedAt,
    inputPreference: input.inputPreference,
    plannedTrainingType: input.budgetSnapshot.plannedTrainingType,
    budgetSnapshot: input.budgetSnapshot,
    summary: input.response.summary,
    plans: input.response.plans,
    items: input.response.items,
  }
}
