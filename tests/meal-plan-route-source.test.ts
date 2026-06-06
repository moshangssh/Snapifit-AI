import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("meal plan route source", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/ai/meal-plan/route.ts"),
    "utf8",
  )

  it("uses structured generation with the meal plan schema", () => {
    expect(source).toContain("generateObject")
    expect(source).toContain("MealPlanResponseSchema")
  })

  it("validates budget and retries once", () => {
    expect(source).toContain("validateMealPlanBudget")
    expect(source).toContain("attempt < 2")
  })

  it("uses agent model configuration from request headers", () => {
    expect(source).toContain("extractAIConfig")
    expect(source).toContain("validateModelConfig(aiConfig.agentModel)")
    expect(source).toContain("createAIClient(aiConfig.agentModel)")
  })
})
