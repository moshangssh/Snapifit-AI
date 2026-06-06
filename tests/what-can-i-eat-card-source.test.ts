import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("what can I eat homepage integration", () => {
  const source = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8")

  it("imports and renders the card", () => {
    expect(source).toContain("WhatCanIEatCard")
    expect(source).toContain("buildMealPlanBudgetSnapshot")
  })

  it("hides the card when AI config is incomplete", () => {
    expect(source).toMatch(/checkAIConfig\(\)\s*&&\s*\(/)
  })

  it("saves planned training type and meal plan suggestion into DailyLog", () => {
    expect(source).toContain("plannedTrainingType")
    expect(source).toContain("mealPlanSuggestion")
    expect(source).toContain("saveDailyLog")
  })

  it("places the card before today's meal section", () => {
    expect(source.indexOf("WhatCanIEatCard")).toBeLessThan(
      source.indexOf("今日膳食"),
    )
  })
})
