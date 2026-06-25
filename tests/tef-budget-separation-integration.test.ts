import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("TEF budget separation integration", () => {
  it("does not write TEF enhancement into workbench metabolic rate recalculation", () => {
    const source = readFileSync(join(process.cwd(), "app/workbench/page.tsx"), "utf8")

    expect(source).toContain("prepareLogWithMetabolicRates")
    expect(source).not.toContain("additionalTEF")
    expect(source).not.toContain("enhancedTEF - log.tefAnalysis.baseTEF")
  })
})
