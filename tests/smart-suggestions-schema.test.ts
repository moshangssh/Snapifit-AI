import { describe, expect, it } from "vitest"
import { DaySmartAnalysisOverviewSchema } from "@/lib/ai/schemas/smart-suggestions"

describe("day smart analysis overview schema", () => {
  it("accepts a valid overview payload", () => {
    const parsed = DaySmartAnalysisOverviewSchema.parse({
      summary: "今日蛋白质摄入偏低,运动消耗达标,建议晚餐补充优质蛋白。",
      highlights: ["运动消耗 320 kcal", "已记录体重"],
      risks: ["蛋白质仅 45g", "晚餐占比 55%"],
    })

    expect(parsed.summary).toContain("今日")
    expect(parsed.highlights).toHaveLength(2)
    expect(parsed.risks).toHaveLength(2)
  })

  it("rejects missing required fields", () => {
    expect(() =>
      DaySmartAnalysisOverviewSchema.parse({ summary: "x" }),
    ).toThrow()
  })

  it("accepts empty highlights/risks arrays", () => {
    const parsed = DaySmartAnalysisOverviewSchema.parse({
      summary: "今日数据较少",
      highlights: [],
      risks: [],
    })

    expect(parsed.highlights).toEqual([])
    expect(parsed.risks).toEqual([])
  })
})
