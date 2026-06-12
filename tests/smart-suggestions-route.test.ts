import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("smart suggestions route", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/ai/smart-suggestions/route.ts"),
    "utf8",
  )

  it("imports DaySmartAnalysisOverviewSchema", () => {
    expect(source).toContain("DaySmartAnalysisOverviewSchema")
  })

  it("declares a day-overview prompt with today-focused framing", () => {
    expect(source).toMatch(/overviewPrompt|OVERVIEW_PROMPT|dayOverviewPrompt/)
    expect(source).toContain("聚焦今天")
  })

  it("includes overview generation in the parallel batch", () => {
    expect(source).toContain("Promise.all")
    expect(source).toMatch(/overviewPromise|overviewResult/)
  })

  it("returns top-level summary/highlights/risks alongside suggestions", () => {
    expect(source).toMatch(/summary:\s*overview|summary:\s*overviewResult/)
    expect(source).toMatch(/highlights:\s*overview/)
    expect(source).toMatch(/risks:\s*overview/)
  })
})
