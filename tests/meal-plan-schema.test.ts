import { describe, expect, it } from "vitest"
import {
  MealPlanResponseSchema,
  validateMealPlanBudget,
} from "@/lib/ai/schemas/meal-plan"
import type { MealPlanBudgetSnapshot } from "@/lib/types"

const budget: MealPlanBudgetSnapshot = {
  date: "2026-05-28",
  plannedTrainingType: "strength_cardio",
  baselineExpenditure: 2000,
  recordedExerciseCalories: 180,
  plannedTrainingCalories: 300,
  effectiveExerciseCalories: 300,
  targetCalories: 2550,
  consumedCalories: 1900,
  remainingCalories: 650,
  macroTargets: { protein: 137, carbohydrates: 285, fat: 62 },
  remainingMacros: { protein: 45, carbohydrates: 120, fat: 18 },
  remainingMealSlots: ["dinner", "snack"],
  summaryText: "今天还可吃约 650 kcal · 蛋白还差 45g · 脂肪还可约 18g",
}

function makeResponse(calories: number) {
  return {
    summary: "优先补蛋白，控制脂肪，晚餐后保留少量加餐空间。",
    plans: [
      {
        type: "steady",
        title: "稳妥方案",
        rationale: "贴合剩余预算并补足蛋白。",
        meals: [
          {
            mealType: "dinner",
            title: "鸡胸米饭晚餐",
            foods: ["鸡胸肉", "米饭", "绿叶菜"],
            portionHint: "鸡胸肉 120g，米饭 150g，蔬菜一大碗",
            nutrition: {
              calories,
              protein: 45,
              carbohydrates: 62,
              fat: 10,
            },
          },
        ],
        totalNutrition: {
          calories,
          protein: 45,
          carbohydrates: 62,
          fat: 10,
        },
        slightlyOverBudget: false,
      },
      {
        type: "craving",
        title: "想吃方案",
        rationale: "满足口味但不明显超预算。",
        meals: [
          {
            mealType: "dinner",
            title: "清爽日式晚餐",
            foods: ["刺身", "米饭", "味噌汤"],
            portionHint: "刺身 120g，米饭半碗，味噌汤一碗",
            nutrition: {
              calories: 560,
              protein: 42,
              carbohydrates: 55,
              fat: 12,
            },
          },
        ],
        totalNutrition: {
          calories: 560,
          protein: 42,
          carbohydrates: 55,
          fat: 12,
        },
        slightlyOverBudget: false,
      },
      {
        type: "high_protein",
        title: "高蛋白方案",
        rationale: "训练日优先补蛋白。",
        meals: [
          {
            mealType: "snack",
            title: "酸奶蛋白加餐",
            foods: ["希腊酸奶", "香蕉"],
            portionHint: "酸奶 200g，香蕉半根",
            nutrition: {
              calories: 260,
              protein: 25,
              carbohydrates: 32,
              fat: 4,
            },
          },
        ],
        totalNutrition: {
          calories: 260,
          protein: 25,
          carbohydrates: 32,
          fat: 4,
        },
        slightlyOverBudget: false,
      },
    ],
    items: [
      {
        title: "酸奶 + 香蕉",
        kind: "combo",
        foods: ["希腊酸奶", "香蕉"],
        portionHint: "酸奶 200g，香蕉半根",
        bestFor: "训练后加餐",
        nutrition: {
          calories: 260,
          protein: 25,
          carbohydrates: 32,
          fat: 4,
        },
      },
    ],
  }
}

describe("meal plan schema", () => {
  it("parses the structured AI response", () => {
    const parsed = MealPlanResponseSchema.parse(makeResponse(620))

    expect(parsed.plans).toHaveLength(3)
    expect(parsed.plans.map((plan) => plan.type)).toEqual([
      "steady",
      "craving",
      "high_protein",
    ])
    expect(parsed.items[0].kind).toBe("combo")
  })

  it("accepts plans within 5 percent of remaining calories", () => {
    const response = MealPlanResponseSchema.parse(makeResponse(680))

    expect(validateMealPlanBudget(response, budget)).toEqual({
      valid: true,
      maxAllowedCalories: 683,
      invalidPlanTypes: [],
    })
  })

  it("rejects plans above 5 percent of remaining calories", () => {
    const response = MealPlanResponseSchema.parse(makeResponse(720))

    expect(validateMealPlanBudget(response, budget)).toEqual({
      valid: false,
      maxAllowedCalories: 683,
      invalidPlanTypes: ["steady"],
    })
  })
})
