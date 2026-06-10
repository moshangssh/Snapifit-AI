import { z } from "zod"
import type {
  MealPlanBudgetSnapshot,
  MealPlanItem,
  MealPlanSuggestion,
} from "@/lib/types"

const MealPlanNutritionEstimateSchema = z.object({
  calories: z.number().min(0).transform((value) => Math.round(value)),
  protein: z.number().min(0).transform((value) => Math.round(value)),
  carbohydrates: z.number().min(0).transform((value) => Math.round(value)),
  fat: z.number().min(0).transform((value) => Math.round(value)),
})

const MealPlanItemSchema = z
  .object({
    title: z.string().min(1),
    kind: z.enum(["combo", "single"]),
    foods: z.array(z.string().min(1)).min(1).max(5),
    portionHint: z.string().min(1),
    bestFor: z.string().min(1),
    nutrition: MealPlanNutritionEstimateSchema,
  })
  .strict()

export const MealPlanResponseSchema = z
  .object({
    summary: z.string().min(1),
    items: z.array(MealPlanItemSchema).length(3),
  })
  .strict()

export type MealPlanResponse = z.infer<typeof MealPlanResponseSchema>

type MealPlanValidation = {
  valid: boolean
  maxAllowedCalories: number
  invalidItemIndexes: number[]
}

function calculateMaxAllowedCalories(budget: MealPlanBudgetSnapshot): number {
  return Math.round(Math.max(0, budget.remainingCalories) * 1.05)
}

function getInvalidItemIndexes(
  response: MealPlanResponse,
  maxAllowedCalories: number,
): number[] {
  return response.items.flatMap((item, index) =>
    item.nutrition.calories > maxAllowedCalories ? [index] : [],
  )
}

export function validateMealPlanBudget(
  response: MealPlanResponse,
  budget: MealPlanBudgetSnapshot,
): MealPlanValidation {
  const maxAllowedCalories = calculateMaxAllowedCalories(budget)
  const invalidItemIndexes = getInvalidItemIndexes(response, maxAllowedCalories)

  return {
    valid: invalidItemIndexes.length === 0,
    maxAllowedCalories,
    invalidItemIndexes,
  }
}

export function toMealPlanSuggestion(input: {
  response: {
    summary: string
    items: MealPlanItem[]
  }
  generatedAt: string
  inputPreference: string
  budgetSnapshot: MealPlanBudgetSnapshot
}): MealPlanSuggestion {
  return {
    generatedAt: input.generatedAt,
    inputPreference: input.inputPreference,
    budgetSnapshot: input.budgetSnapshot,
    summary: input.response.summary,
    items: input.response.items,
  }
}
