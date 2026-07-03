import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("workbench daily log writer wiring", () => {
  const source = readFileSync(join(process.cwd(), "app/workbench/page.tsx"), "utf8")

  it("reads AI config hydration from the third localStorage tuple slot", () => {
    expect(source).toMatch(
      /const\s+\[\s*aiConfig\s*,\s*,\s*isAIConfigHydrated\s*\]\s*=\s*useLocalStorage<AIConfig>\("aiConfig"/,
    )
  })

  it("aliases IndexedDB initialization state for daily log loading", () => {
    expect(source).toContain(
      "saveData: saveDailyLog, isInitializing: dbInitializing",
    )
  })
})
