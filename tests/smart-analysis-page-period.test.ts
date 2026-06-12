import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("smart analysis page period wiring", () => {
  const source = readFileSync(
    join(process.cwd(), "app/smart-analysis/page.tsx"),
    "utf8",
  )

  it("supports range-based period analysis from health logs", () => {
    expect(source).toContain('searchParams.get("range")')
    expect(source).toContain("usePeriodAnalysisData")
  })

  it("renders the shared summary card at the top", () => {
    expect(source).toContain("SmartAnalysisSummaryCard")
  })

  it("preserves the range switch for url-driven navigation", () => {
    expect(source).toContain("RangeSwitch")
  })

  it("falls back to the nearest previous day suggestion for day analysis", () => {
    expect(source).toContain("resolveSmartSuggestionsForDate")
    expect(source).toContain("ResolvedSmartSuggestions")
  })

  it("labels historical period analysis when the selected range falls back", () => {
    expect(source).toContain("analysisDaysAgo")
    expect(source).toContain("!analysis && summary.dataDays < summary.minDataDays")
    expect(source).toContain("截至${formatSmartSuggestionsAge(analysisDaysAgo)}")
  })

  it("retains buildPeriodAnalysisSummary import for type/utility access", () => {
    expect(source).toMatch(
      /from "@\/lib\/smart-analysis-period"|smart-analysis-period/,
    )
  })
})
