import { describe, expect, it } from "vitest"
import { generateTEFAnalysis } from "@/lib/tef-utils"
import type { FoodEntry } from "@/lib/types"

const createFoodEntry = (foodName: string): FoodEntry => ({
  log_id: "food-1",
  food_name: foodName,
  consumed_grams: 100,
  meal_type: "lunch",
  nutritional_info_per_100g: {
    calories: 200,
    carbohydrates: 20,
    protein: 20,
    fat: 4,
  },
  total_nutritional_info_consumed: {
    calories: 200,
    carbohydrates: 20,
    protein: 20,
    fat: 4,
  },
  is_estimated: false,
  timestamp: "2026-05-22T12:00:00.000Z",
})

describe("TEF utils", () => {
  it("clamps externally provided TEF multipliers to the supported range", () => {
    const analysis = generateTEFAnalysis([createFoodEntry("米饭鸡胸肉")], 2)

    expect(analysis.enhancementMultiplier).toBe(1.3)
    expect(analysis.enhancedTEF).toBe(35.3)
  })

  it("counts green tea only once when its name also contains the caffeine keyword '茶'", () => {
    const greenTea: FoodEntry = {
      log_id: "food-1",
      food_name: "绿茶",
      consumed_grams: 200,
      meal_type: "breakfast",
      nutritional_info_per_100g: {
        calories: 1,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      },
      total_nutritional_info_consumed: {
        calories: 2,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      },
      is_estimated: true,
      timestamp: "2026-05-22T08:00:00.000Z",
    }

    const analysis = generateTEFAnalysis([greenTea])

    expect(analysis.enhancementMultiplier).toBe(1.12)
    expect(analysis.enhancementFactors).toContain("绿茶儿茶素")
    expect(analysis.enhancementFactors).not.toContain("咖啡因")
  })

  it("applies green tea (not caffeine) when the entry contains both keywords on the same line", () => {
    const greenTeaLatte: FoodEntry = {
      log_id: "food-2",
      food_name: "抹茶拿铁",
      consumed_grams: 300,
      meal_type: "breakfast",
      nutritional_info_per_100g: {
        calories: 60,
        carbohydrates: 5,
        protein: 2,
        fat: 3,
      },
      total_nutritional_info_consumed: {
        calories: 180,
        carbohydrates: 15,
        protein: 6,
        fat: 9,
      },
      is_estimated: true,
      timestamp: "2026-05-22T08:00:00.000Z",
    }

    const analysis = generateTEFAnalysis([greenTeaLatte])

    expect(analysis.enhancementMultiplier).toBe(1.12)
    expect(analysis.enhancementFactors).toEqual(["绿茶儿茶素"])
  })

  it("still adds caffeine when a different entry has plain coffee alongside green tea", () => {
    const coffee: FoodEntry = {
      log_id: "food-3",
      food_name: "美式咖啡",
      consumed_grams: 200,
      meal_type: "breakfast",
      nutritional_info_per_100g: {
        calories: 1,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      },
      total_nutritional_info_consumed: {
        calories: 2,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
      },
      is_estimated: true,
      timestamp: "2026-05-22T08:00:00.000Z",
    }
    const matcha: FoodEntry = { ...coffee, log_id: "food-4", food_name: "抹茶" }

    const analysis = generateTEFAnalysis([coffee, matcha])

    expect(analysis.enhancementFactors).toEqual(
      expect.arrayContaining(["咖啡因", "绿茶儿茶素"])
    )
    expect(analysis.enhancementMultiplier).toBeCloseTo(1.23, 2)
  })

  it("detects spicy crayfish and cola as separate TEF enhancement factors", () => {
    const spicyCrayfish = createFoodEntry("麻辣小龙虾")
    const cola = { ...createFoodEntry("可乐"), log_id: "food-2" }

    const analysis = generateTEFAnalysis([spicyCrayfish, cola])

    expect(analysis.enhancementFactors).toEqual(
      expect.arrayContaining(["辛辣食物", "咖啡因"])
    )
    expect(analysis.enhancementMultiplier).toBeCloseTo(1.19, 2)
  })
})
