import { z } from "zod"
import type {
  MealPlanBudgetSnapshot,
  MealPlanItem,
  MealPlanSuggestion,
} from "@/lib/types"

const SINGLE_MEAL_PROTEIN_CALORIE_SHARE = 0.55

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
  minProteinGrams: number
  invalidItemIndexes: number[]
  proteinPickIndex: number | null
  proteinTargetMet: boolean
}

function calculateMaxAllowedCalories(budget: MealPlanBudgetSnapshot): number {
  return Math.round(Math.max(0, budget.remainingCalories) * 1.05)
}

export function calculateMinProteinPickGrams(
  budget: MealPlanBudgetSnapshot,
  maxAllowedCalories = calculateMaxAllowedCalories(budget),
): number {
  return Math.min(
    Math.max(0, Math.round(budget.remainingMacros.protein)),
    Math.floor((maxAllowedCalories * SINGLE_MEAL_PROTEIN_CALORIE_SHARE) / 4),
  )
}

function getInvalidItemIndexes(
  response: MealPlanResponse,
  maxAllowedCalories: number,
): number[] {
  return response.items.flatMap((item, index) =>
    item.nutrition.calories > maxAllowedCalories ? [index] : [],
  )
}

export function selectProteinPickIndex(
  items: MealPlanItem[],
  minProteinGrams: number,
): number | null {
  return items.reduce<number | null>((selectedIndex, item, index) => {
    if (item.nutrition.protein < minProteinGrams) {
      return selectedIndex
    }

    if (selectedIndex === null) {
      return index
    }

    return item.nutrition.protein > items[selectedIndex].nutrition.protein
      ? index
      : selectedIndex
  }, null)
}

export function markProteinPick<T extends { items: MealPlanItem[] }>(
  response: T,
  minProteinGrams: number,
): T {
  const proteinPickIndex = selectProteinPickIndex(
    response.items,
    minProteinGrams,
  )

  return {
    ...response,
    items: response.items.map((item, index) => {
      const { isProteinPick: _discarded, ...itemWithoutMarker } = item

      return {
        ...itemWithoutMarker,
        ...(index === proteinPickIndex ? { isProteinPick: true } : {}),
      }
    }),
  }
}

export function validateMealPlanBudget(
  response: MealPlanResponse,
  budget: MealPlanBudgetSnapshot,
): MealPlanValidation {
  const maxAllowedCalories = calculateMaxAllowedCalories(budget)
  const minProteinGrams = calculateMinProteinPickGrams(
    budget,
    maxAllowedCalories,
  )
  const invalidItemIndexes = getInvalidItemIndexes(response, maxAllowedCalories)
  const proteinPickIndex = selectProteinPickIndex(
    response.items,
    minProteinGrams,
  )
  const proteinTargetMet = proteinPickIndex !== null

  return {
    valid: invalidItemIndexes.length === 0 && proteinTargetMet,
    maxAllowedCalories,
    minProteinGrams,
    invalidItemIndexes,
    proteinPickIndex,
    proteinTargetMet,
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
