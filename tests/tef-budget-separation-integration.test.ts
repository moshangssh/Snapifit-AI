import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("TEF budget separation integration", () => {
  it("keeps metabolic effects out of workbench metabolic rate recalculation", () => {
    const workbenchSource = readFileSync(join(process.cwd(), "app/workbench/page.tsx"), "utf8")
    const writerSource = readFileSync(join(process.cwd(), "hooks/use-daily-log-writer.ts"), "utf8")

    expect(workbenchSource).toContain("useDailyLogWriter")
    expect(workbenchSource).not.toContain("additionalTEF")
    expect(writerSource).not.toContain("additionalTEF")
    // ADR 0015:代谢提示展示时本地派生,不再有任何 TEF 分析写入链路
    expect(workbenchSource).not.toContain("tefAnalysis")
    expect(writerSource).not.toContain("tefAnalysis")
  })
})
