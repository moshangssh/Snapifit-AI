import { describe, expect, it } from "vitest"
import { FoodParseSchema } from "@/lib/ai/schemas/parse"

const baseFood = {
  food_name: "iced americano",
  consumed_grams: 350,
  meal_type: "breakfast",
  time_period: "morning",
  nutritional_info_per_100g: { calories: 1, carbohydrates: 0.2, protein: 0.1, fat: 0 },
  total_nutritional_info_consumed: { calories: 4, carbohydrates: 0.7, protein: 0.4, fat: 0 },
  is_estimated: true,
}

describe("food parse schema", () => {
  it("carries metabolic_flags on parsed food entries", () => {
    const parsed = FoodParseSchema.parse({
      food: [{ ...baseFood, metabolic_flags: ["caffeine", "cold"] }],
    })

    expect(parsed.food[0].metabolic_flags).toEqual(["caffeine", "cold"])
  })

  it("drops unknown metabolic_flags values instead of failing the whole parse", () => {
    const parsed = FoodParseSchema.parse({
      food: [{ ...baseFood, metabolic_flags: ["caffeine", "sugar-free", "espresso"] }],
    })

    expect(parsed.food[0].metabolic_flags).toEqual(["caffeine"])
  })

  it("keeps metabolic_flags absent when the parser reports no factors", () => {
    const parsed = FoodParseSchema.parse({ food: [baseFood] })

    expect(parsed.food[0].metabolic_flags).toBeUndefined()
  })
})
