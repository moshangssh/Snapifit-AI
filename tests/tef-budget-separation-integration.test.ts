import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("TEF budget separation integration", () => {
  it("does not write TEF enhancement into workbench metabolic rate recalculation", () => {
    const workbenchSource = readFileSync(join(process.cwd(), "app/workbench/page.tsx"), "utf8")
    const writerSource = readFileSync(join(process.cwd(), "hooks/use-daily-log-writer.ts"), "utf8")

    expect(workbenchSource).toContain("useDailyLogWriter")
    expect(writerSource).toContain("prepareLogForSave")
    expect(writerSource).toContain('applyDailyLogWrite(candidate, { kind: "reconcile" }')
    expect(workbenchSource).not.toContain("additionalTEF")
    expect(writerSource).not.toContain("additionalTEF")
    expect(workbenchSource).not.toContain("enhancedTEF - log.tefAnalysis.baseTEF")
    expect(writerSource).not.toContain("enhancedTEF - log.tefAnalysis.baseTEF")
  })
})
