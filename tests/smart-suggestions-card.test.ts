import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("SmartSuggestions home card", () => {
  const source = readFileSync(
    join(process.cwd(), "components/smart-suggestions.tsx"),
    "utf8",
  )

  it("imports the shared summary card and period hook", () => {
    expect(source).toContain("SmartAnalysisSummaryCard")
    expect(source).toContain("usePeriodAnalysisData")
  })

  it("renders a segmented pill with day/7d/30d options", () => {
    expect(source).toContain('"day"')
    expect(source).toContain('"7d"')
    expect(source).toContain('"30d"')
    expect(source).toContain("今日")
    expect(source).toContain("7天")
    expect(source).toContain("30天")
  })

  it("tracks selectedRange via useState", () => {
    expect(source).toMatch(/useState[<(]\s*"day"\s*\|\s*"7d"\s*\|\s*"30d"/)
  })

  it("renders an in-card generate button for period ranges", () => {
    expect(source).toMatch(/生成\s*[{$]/)
  })

  it("renders an insufficient-data progress block for period ranges", () => {
    expect(source).toContain("数据不足")
    expect(source).toMatch(/dataDays.*minDataDays/)
  })

  it("includes the selected range in the detail href", () => {
    expect(source).toContain("range=")
  })

  it("can label and link to the fallback suggestion date", () => {
    expect(source).toContain("suggestionDate")
    expect(source).toContain("suggestionDaysAgo")
    expect(source).toContain("formatSmartSuggestionsAge")
  })

  it("uses the fallback age label for the day range pill", () => {
    expect(source).toContain("dayLabel")
    expect(source).toContain('option.value === "day" ? dayLabel : option.label')
  })

  it("uses historical period analysis when current 7d/30d is not generated", () => {
    expect(source).toContain("analysisDaysAgo")
    expect(source).toContain("!analysis && summary.dataDays < summary.minDataDays")
    expect(source).toContain("date=${analysis.endDate}&range=${range}")
    expect(source).toContain("截至${formatSmartSuggestionsAge(analysisDaysAgo)}")
  })

  it("does not render a nested detail link inside a linked shell card", () => {
    expect(source).not.toMatch(
      /<ShellCard[\s\S]*?href={detailHref}[\s\S]*?>[\s\S]*?<SmartAnalysisSummaryCard[\s\S]*?detailHref={detailHref}[\s\S]*?<\/ShellCard>/,
    )
  })
})
