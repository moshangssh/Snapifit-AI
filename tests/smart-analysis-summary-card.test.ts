import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("SmartAnalysisSummaryCard component", () => {
  const source = readFileSync(
    join(process.cwd(), "components/smart-analysis-summary-card.tsx"),
    "utf8",
  )

  it("exports SmartAnalysisSummaryCard", () => {
    expect(source).toMatch(/export\s+(function|const)\s+SmartAnalysisSummaryCard/)
  })

  it("accepts the documented props", () => {
    expect(source).toContain("summary?:")
    expect(source).toContain("highlights?:")
    expect(source).toContain("risks?:")
    expect(source).toContain("categoryCount")
    expect(source).toContain("highPriorityCount")
    expect(source).toContain("actionableCount")
    expect(source).toContain("detailHref")
  })

  it("renders highlights and risks columns with semantic labels", () => {
    expect(source).toContain("表现亮点")
    expect(source).toContain("需要注意")
  })

  it("provides a refresh hint when summary is missing (degraded mode)", () => {
    expect(source).toMatch(/刷新.*摘要|生成.*摘要/)
  })

  it("renders the bottom stats row with three counts", () => {
    expect(source).toContain("方向")
    expect(source).toContain("高优")
    expect(source).toContain("可执行")
  })

  it("conditionally renders the detail link when detailHref is provided", () => {
    expect(source).toContain("查看完整")
  })
})
