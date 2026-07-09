import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("smart suggestions route", () => {
  const routeSource = readFileSync(
    join(process.cwd(), "app/api/ai/smart-suggestions/route.ts"),
    "utf8",
  )

  it("imports DaySmartAnalysisOverviewSchema", () => {
    expect(routeSource).toContain("DaySmartAnalysisOverviewSchema")
  })

  it("builds prompts through the shared prompt module", () => {
    expect(routeSource).toContain("buildSmartSuggestionsDataSummary")
    expect(routeSource).toContain("buildCategorySuggestionPrompts")
    expect(routeSource).toContain("buildDayOverviewPrompt")
  })

  it("includes overview generation in the parallel batch", () => {
    expect(routeSource).toContain("Promise.all")
    expect(routeSource).toMatch(/overviewPromise|overviewResult/)
  })

  it("returns top-level summary/highlights/risks alongside suggestions", () => {
    expect(routeSource).toMatch(/summary:\s*overview|summary:\s*overviewResult/)
    expect(routeSource).toMatch(/highlights:\s*overview/)
    expect(routeSource).toMatch(/risks:\s*overview/)
  })
})
