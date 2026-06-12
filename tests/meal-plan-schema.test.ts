import { describe, expect, it } from "vitest"
import {
  calculateMinProteinPickGrams,
  markProteinPick,
  MealPlanResponseSchema,
  selectProteinPickIndex,
  toMealPlanSuggestion,
  validateMealPlanBudget,
} from "@/lib/ai/schemas/meal-plan"
import type { MealPlanBudgetSnapshot, MealPlanItem } from "@/lib/types"

const budget: MealPlanBudgetSnapshot = {
  date: "2026-05-28",
  baselineExpenditure: 2000,
  recordedExerciseCalories: 180,
  targetCalories: 2550,
  consumedCalories: 1900,
  remainingCalories: 650,
  macroTargets: { protein: 137, carbohydrates: 285, fat: 62 },
  remainingMacros: { protein: 45, carbohydrates: 120, fat: 18 },
  remainingMealSlots: ["dinner", "snack"],
  summaryText: "今天还可吃约 650 kcal · 蛋白还差 45g · 脂肪还可约 18g",
}

function makeItem(index: number, calories: number): MealPlanItem {
  return {
    title: `吃法 ${index + 1}`,
    kind: index === 1 ? "single" : "combo",
    foods: index === 1 ? ["牛肉汤面"] : ["鸡胸肉", "米饭", "绿叶菜"],
    portionHint:
      index === 1 ? "牛肉汤面 1 碗" : "鸡胸肉 120g，米饭 150g，蔬菜一大碗",
    bestFor: index === 1 ? "想吃热汤面" : "稳妥补充正餐",
    nutrition: {
      calories,
      protein: index === 1 ? 28 : 45,
      carbohydrates: index === 1 ? 70 : 62,
      fat: index === 1 ? 16 : 10,
    },
  }
}

function makeResponse(
  calories: [number, number, number],
  proteins?: [number, number, number],
) {
  return {
    summary: "先把晚餐定下来，晚点如有余量再安排轻加餐。",
    items: calories.map((itemCalories, index) => {
      const item = makeItem(index, itemCalories)

      return {
        ...item,
        nutrition: {
          ...item.nutrition,
          protein: proteins?.[index] ?? item.nutrition.protein,
        },
      }
    }),
  }
}

function makeBudget(remainingCalories: number): MealPlanBudgetSnapshot {
  return {
    ...budget,
    remainingCalories,
  }
}

describe("meal plan schema", () => {
  it("parses a summary plus exactly three eating options", () => {
    const parsed = MealPlanResponseSchema.parse(makeResponse([620, 560, 260]))

    expect(parsed.items).toHaveLength(3)
    expect(parsed.items[0].kind).toBe("combo")
    expect("plans" in parsed).toBe(false)
  })

  it("rejects responses with a plans field", () => {
    expect(
      MealPlanResponseSchema.safeParse({
        ...makeResponse([620, 560, 260]),
        plans: [],
      }).success,
    ).toBe(false)
  })

  it("requires exactly three items", () => {
    expect(
      MealPlanResponseSchema.safeParse({
        summary: "先定晚餐。",
        items: [makeItem(0, 620), makeItem(1, 560)],
      }).success,
    ).toBe(false)

    expect(
      MealPlanResponseSchema.safeParse({
        summary: "先定晚餐。",
        items: [
          makeItem(0, 620),
          makeItem(1, 560),
          makeItem(2, 260),
          makeItem(3, 180),
        ],
      }).success,
    ).toBe(false)
  })

  it("accepts items within 5 percent of remaining calories", () => {
    const response = MealPlanResponseSchema.parse(makeResponse([680, 560, 260]))

    expect(validateMealPlanBudget(response, budget)).toEqual({
      valid: true,
      maxAllowedCalories: 683,
      minProteinGrams: 45,
      invalidItemIndexes: [],
      proteinPickIndex: 0,
      proteinTargetMet: true,
    })
  })

  it("rejects items above 5 percent of remaining calories", () => {
    const response = MealPlanResponseSchema.parse(makeResponse([720, 560, 260]))

    expect(validateMealPlanBudget(response, budget)).toEqual({
      valid: false,
      maxAllowedCalories: 683,
      minProteinGrams: 45,
      invalidItemIndexes: [0],
      proteinPickIndex: 0,
      proteinTargetMet: true,
    })
  })

  it("returns zero max allowed calories when remaining calories are zero", () => {
    const response = MealPlanResponseSchema.parse(makeResponse([10, 10, 10]))

    expect(validateMealPlanBudget(response, makeBudget(0))).toEqual({
      valid: false,
      maxAllowedCalories: 0,
      minProteinGrams: 0,
      invalidItemIndexes: [0, 1, 2],
      proteinPickIndex: 0,
      proteinTargetMet: true,
    })
  })

  it("returns zero max allowed calories when remaining calories are negative", () => {
    const response = MealPlanResponseSchema.parse(makeResponse([10, 10, 10]))

    expect(validateMealPlanBudget(response, makeBudget(-120))).toEqual({
      valid: false,
      maxAllowedCalories: 0,
      minProteinGrams: 0,
      invalidItemIndexes: [0, 1, 2],
      proteinPickIndex: 0,
      proteinTargetMet: true,
    })
  })

  it("rejects items above the rounded 5 percent boundary", () => {
    const response = MealPlanResponseSchema.parse(makeResponse([682, 560, 260]))

    expect(validateMealPlanBudget(response, makeBudget(649))).toEqual({
      valid: false,
      maxAllowedCalories: 681,
      minProteinGrams: 45,
      invalidItemIndexes: [0],
      proteinPickIndex: 0,
      proteinTargetMet: true,
    })
  })

  it("rejects responses when no item reaches the protein floor", () => {
    const response = MealPlanResponseSchema.parse(
      makeResponse([620, 560, 260], [20, 28, 32]),
    )

    expect(validateMealPlanBudget(response, budget)).toEqual({
      valid: false,
      maxAllowedCalories: 683,
      minProteinGrams: 45,
      invalidItemIndexes: [],
      proteinPickIndex: null,
      proteinTargetMet: false,
    })
  })

  it("scales the protein floor for a realistic tight single-meal budget", () => {
    const tightBudget: MealPlanBudgetSnapshot = {
      ...budget,
      remainingCalories: 360,
      remainingMacros: {
        ...budget.remainingMacros,
        protein: 70,
      },
    }
    const response = MealPlanResponseSchema.parse(
      makeResponse([360, 330, 300], [52, 28, 24]),
    )

    expect(calculateMinProteinPickGrams(tightBudget)).toBe(51)
    expect(validateMealPlanBudget(response, tightBudget)).toMatchObject({
      valid: true,
      maxAllowedCalories: 378,
      minProteinGrams: 51,
      invalidItemIndexes: [],
      proteinPickIndex: 0,
      proteinTargetMet: true,
    })
  })

  it("selects the highest-protein item among items that meet the floor", () => {
    const response = MealPlanResponseSchema.parse(
      makeResponse([620, 560, 260], [45, 52, 50]),
    )

    expect(selectProteinPickIndex(response.items, 45)).toBe(1)
  })

  it("marks exactly one protein pick and ignores stale model markers", () => {
    const response = {
      ...makeResponse([620, 560, 260], [45, 52, 50]),
      items: makeResponse([620, 560, 260], [45, 52, 50]).items.map(
        (item, index) => ({
          ...item,
          isProteinPick: index !== 1,
        }),
      ),
    }

    expect(
      markProteinPick(response, 45).items.map((item) => item.isProteinPick),
    ).toEqual([undefined, true, undefined])
  })

  it("does not mark a protein pick when no item reaches the floor", () => {
    const response = makeResponse([620, 560, 260], [20, 28, 32])

    expect(
      markProteinPick(response, 45).items.some((item) => item.isProteinPick),
    ).toBe(false)
  })

  it("does not mark a protein pick when the floor is zero", () => {
    const response = makeResponse([620, 560, 260], [20, 28, 32])

    expect(
      markProteinPick(response, 0).items.some((item) => item.isProteinPick),
    ).toBe(false)
  })

  it("maps parsed responses into meal plan suggestions without plans", () => {
    const response = MealPlanResponseSchema.parse(makeResponse([620, 560, 260]))

    expect(
      toMealPlanSuggestion({
        response,
        generatedAt: "2026-05-28T18:00:00+08:00",
        inputPreference: "想吃点热的",
        budgetSnapshot: budget,
      }),
    ).toEqual({
      generatedAt: "2026-05-28T18:00:00+08:00",
      inputPreference: "想吃点热的",
      budgetSnapshot: budget,
      summary: response.summary,
      items: response.items,
    })
  })
})
