import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("usePeriodAnalysisData hook", () => {
  const source = readFileSync(
    join(process.cwd(), "hooks/use-period-analysis-data.ts"),
    "utf8",
  )

  it("exports usePeriodAnalysisData", () => {
    expect(source).toMatch(/export\s+(function|const)\s+usePeriodAnalysisData/)
  })

  it("uses IndexedDB hook to load daily logs", () => {
    expect(source).toContain('useIndexedDB("healthLogs")')
  })

  it("reads cached analysis from localStorage", () => {
    expect(source).toContain('"periodSmartSuggestions"')
  })

  it("resolves the latest historical period analysis from cache", () => {
    expect(source).toContain("resolvePeriodSmartAnalysisForDate")
    expect(source).toContain("analysisDaysAgo")
  })

  it("builds period summary using buildPeriodAnalysisSummary", () => {
    expect(source).toContain("buildPeriodAnalysisSummary")
    expect(source).toContain("getPeriodAnalysisDateKeys")
  })

  it("exposes a generate function that posts to the period route", () => {
    expect(source).toContain("/api/ai/smart-suggestions/period")
    expect(source).toMatch(/generate\s*[:=]/)
  })

  it("returns isReady and isGenerating flags", () => {
    expect(source).toContain("isReady")
    expect(source).toContain("isGenerating")
  })
})
