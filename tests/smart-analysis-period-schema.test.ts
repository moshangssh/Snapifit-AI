import { describe, expect, it } from "vitest"
import { PeriodSmartAnalysisResponseSchema } from "@/lib/ai/schemas/smart-suggestions"

describe("period smart analysis schema", () => {
  it("accepts a structured weekly period analysis response", () => {
    const result = PeriodSmartAnalysisResponseSchema.parse({
      summary: "本周记录稳定，蛋白质摄入接近目标。",
      highlights: ["连续 4 天有饮食记录", "平均蛋白质达到 110g"],
      risks: ["训练后恢复记录不足"],
      suggestions: [
        {
          key: "nutrition",
          category: "周期营养复盘",
          priority: "high",
          summary: "蛋白质达标，但蔬菜摄入偏少。",
          suggestions: [
            {
              title: "晚餐补一份深色蔬菜",
              description: "优先选择菠菜、西兰花或油麦菜。",
              actionable: true,
              icon: "🥦",
            },
          ],
        },
      ],
    })

    expect(result.highlights).toHaveLength(2)
    expect(result.suggestions[0].suggestions[0].actionable).toBe(true)
  })
})
