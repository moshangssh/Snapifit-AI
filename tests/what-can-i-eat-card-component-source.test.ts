import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("what can I eat card component source", () => {
  const source = readFileSync(
    join(process.cwd(), "components/what-can-i-eat-card.tsx"),
    "utf8",
  )

  it("shows calories and protein for eating options", () => {
    expect(source).toContain("item.nutrition.calories")
    expect(source).toContain("item.nutrition.protein")
    expect(source).toContain("蛋白")
  })

  it("renders a single item list without plan or item mode switching", () => {
    expect(source).toContain("suggestionItems.map")
    expect(source).toContain("slice(0, 3)")
    expect(source).toContain("给你 3 种吃法，挑一种")
    expect(source).not.toContain("ToggleGroup")
    expect(source).not.toContain("displayMode")
    expect(source).not.toContain("suggestion.plans")
    expect(source).not.toContain("方案推荐")
    expect(source).not.toContain("单品清单")
  })

  it("shows item warnings and keeps the estimate disclaimer", () => {
    expect(source).toContain("item.warning")
    expect(source).toContain("营养值为 AI 估算")
    expect(source).toContain("记录前请在工作台确认份量")
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
