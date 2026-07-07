import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("workbench daily log writer wiring", () => {
  const source = readFileSync(join(process.cwd(), "app/workbench/page.tsx"), "utf8")

  it("reads user profile hydration from the third localStorage tuple slot", () => {
    // useLocalStorage 刻意在 effect 中才 hydrate,首帧是默认 profile;
    // 硬编码 isUserProfileHydrated: true 会架空 hook 内的 reconcile 盖章守卫。
    expect(source).toMatch(
      /const\s+\[\s*userProfile\s*,\s*,\s*isUserProfileHydrated\s*\]\s*=\s*useLocalStorage\("userProfile"/,
    )
    expect(source).not.toContain("isUserProfileHydrated: true")
  })

  it("aliases IndexedDB initialization state for daily log loading", () => {
    expect(source).toContain(
      "saveData: saveDailyLog, isInitializing: dbInitializing",
    )
  })
})
