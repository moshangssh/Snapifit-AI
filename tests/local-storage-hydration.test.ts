import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("localStorage hydration safety", () => {
  const hookSource = readFileSync(
    join(process.cwd(), "hooks/use-local-storage.ts"),
    "utf8",
  )
  const dashboardSource = readFileSync(
    join(process.cwd(), "app/page.tsx"),
    "utf8",
  )
  // 派生写入(基础消耗对账/盖章)已随 ADR-0014 折进写入 hook,
  // 门控守卫也随之迁入;首页原独立 BMR effect 已删除。
  const writerSource = readFileSync(
    join(process.cwd(), "hooks/use-daily-log-writer.ts"),
    "utf8",
  )

  it("does not read localStorage during the initial render", () => {
    expect(hookSource).toContain("useEffect")
    expect(hookSource).toContain("const [storedValue, setStoredValue] = useState<T>(initialValue)")
    expect(hookSource).not.toMatch(/useState<T>\(\s*\(\)\s*=>/)
  })

  it("exposes a hydration flag for callers that write derived data", () => {
    expect(hookSource).toContain("isHydrated")
    expect(hookSource).toContain("return [storedValue, setValue, isHydrated]")
  })

  it("waits for the stored profile before the writer writes derived log data", () => {
    expect(dashboardSource).toContain(
      "const [userProfile, setUserProfile, isUserProfileHydrated]",
    )
    // 基础消耗对账 effect 在 hook 内,加载与 profile 未 hydrate 前不写入派生数据。
    expect(writerSource).toContain(
      "if (!isLogLoaded || !isUserProfileHydrated) return",
    )
  })

  it("does not allow today weight saves before the profile is hydrated", () => {
    expect(dashboardSource).toContain("disabled={!isUserProfileHydrated}")
  })
})
