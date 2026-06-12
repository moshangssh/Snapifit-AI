import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// 结构性断言:app/page.tsx 真渲染需要 IndexedDB / next-router / 一打 client hook,
// 代价与收益不成比例。这里只锚定卡片接线(导入、渲染门槛、props、防陈旧保存),
// 卡片自身的渲染行为由 what-can-i-eat-card.test.tsx 真渲染覆盖。
describe("what can I eat homepage integration", () => {
  const source = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8")

  it("imports and renders the card", () => {
    expect(source).toContain("WhatCanIEatCard")
    expect(source).toContain("buildMealPlanBudgetSnapshot")
  })

  it("hides the card when AI config is incomplete", () => {
    const renderGuardStart = source.lastIndexOf("{checkAIConfig()", source.indexOf("<WhatCanIEatCard"))

    expect(renderGuardStart).toBeGreaterThan(-1)
  })

  it("waits for the current log and database before rendering the card", () => {
    expect(source).toContain("isCurrentLogReady")
    expect(source).toContain("isLogLoaded && !dbInitializing")
    expect(source).toMatch(/checkAIConfig\(\)\s*&&\s*isCurrentLogReady\s*&&\s*\(/)
  })

  it("saves meal plan suggestion into DailyLog", () => {
    expect(source).toContain("mealPlanSuggestion")
    expect(source).toContain("saveDailyLog")
  })

  it("guards stale meal plan saves by date", () => {
    expect(source).toContain("currentDateParamRef")
    expect(source).toContain("suggestion.budgetSnapshot.date")
  })

  it("places the card before today's meal section", () => {
    const renderIndex = source.indexOf("<WhatCanIEatCard")

    expect(renderIndex).toBeGreaterThan(source.indexOf("Hero"))
    expect(renderIndex).toBeLessThan(source.indexOf("今日膳食"))
  })

  it("passes the required props to the card", () => {
    const renderBlock = source.slice(
      source.indexOf("<WhatCanIEatCard"),
      source.indexOf("/>", source.indexOf("<WhatCanIEatCard")),
    )

    expect(renderBlock).toContain("budgetSnapshot={mealPlanBudgetSnapshot}")
    expect(renderBlock).toContain("suggestion={dailyLog.mealPlanSuggestion}")
    expect(renderBlock).toContain("onSuggestionSave={handleMealPlanSuggestionSave}")
  })

  it("does not pass duplicated local budget or planned training controls to the card", () => {
    const renderBlock = source.slice(
      source.indexOf("<WhatCanIEatCard"),
      source.indexOf("/>", source.indexOf("<WhatCanIEatCard")),
    )

    expect(renderBlock).toContain("budgetSnapshot={mealPlanBudgetSnapshot}")
    expect(renderBlock).not.toContain("balanceOverview=")
    expect(renderBlock).not.toContain("plannedTrainingType=")
    expect(renderBlock).not.toContain("onTrainingTypeChange=")
  })
})
