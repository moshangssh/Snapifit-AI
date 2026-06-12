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

  it("does not read localStorage during the initial render", () => {
    expect(hookSource).toContain("useEffect")
    expect(hookSource).toContain("const [storedValue, setStoredValue] = useState<T>(initialValue)")
    expect(hookSource).not.toMatch(/useState<T>\(\s*\(\)\s*=>/)
  })

  it("exposes a hydration flag for callers that write derived data", () => {
    expect(hookSource).toContain("isHydrated")
    expect(hookSource).toContain("return [storedValue, setValue, isHydrated]")
  })

  it("waits for the stored profile before dashboard writes derived log data", () => {
    expect(dashboardSource).toContain(
      "const [userProfile, setUserProfile, isUserProfileHydrated]",
    )
    expect(dashboardSource).toContain(
      "if (!isLogLoaded || !isUserProfileHydrated) return",
    )
  })

  it("does not allow today weight saves before the profile is hydrated", () => {
    expect(dashboardSource).toContain("disabled={!isUserProfileHydrated}")
  })
})
