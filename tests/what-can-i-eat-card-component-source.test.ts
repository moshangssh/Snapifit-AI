import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("what can I eat card component source", () => {
  const source = readFileSync(
    join(process.cwd(), "components/what-can-i-eat-card.tsx"),
    "utf8",
  )

  it("shows protein totals for plans and items", () => {
    expect(source).toContain("plan.totalNutrition.protein")
    expect(source).toContain("item.nutrition.protein")
    expect(source).toContain("蛋白")
  })

  it("does not show duplicated local budget calories, macros, or training controls", () => {
    expect(source).not.toContain("balanceOverview")
    expect(source).not.toContain("budgetSnapshot.remainingCalories")
    expect(source).not.toContain("budgetSnapshot.macroTargets")
    expect(source).not.toContain("budgetSnapshot.remainingMacros")
    expect(source).not.toContain("budgetSnapshot.remainingMealSlots")
    expect(source).not.toContain("今日训练强度")
    expect(source).not.toContain("今日还可吃")
  })

  it("still feeds budgetSnapshot to the AI", () => {
    expect(source).toContain("/api/ai/meal-plan")
    expect(source).toContain("budgetSnapshot,")
  })
})
