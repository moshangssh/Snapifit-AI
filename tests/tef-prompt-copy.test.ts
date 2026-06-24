import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("TEF prompt copy", () => {
  it("does not encourage caffeine, spicy food, or green tea as budget-raising tactics", () => {
    const source = readFileSync(
      join(process.cwd(), "app/api/ai/tef-analysis/route.ts"),
      "utf8",
    )

    expect(source).toContain("AI 代谢提示")
    expect(source).toContain("不直接增加今日维持热量或今日热量预算")
    expect(source).not.toContain("建议在运动前30分钟饮用咖啡")
    expect(source).not.toContain("可以适量增加辛辣调料")
    expect(source).not.toContain("最大化TEF")
  })
})
