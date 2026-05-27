import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("TEF hero display", () => {
  it("shows every enhancement factor instead of collapsing to the first one", () => {
    const source = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8")

    expect(source).not.toMatch(/enhancementFactors\s*\[\s*0\s*\]/)
    expect(source).toContain('enhancementFactors?.join("、")')
  })
})
