import { describe, expect, it } from "vitest"
import { calculateMetabolicRates } from "@/lib/health-utils"
import type { UserProfile } from "@/lib/types"

const baseProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
}

describe("health utils", () => {
  it("does not write AI TEF enhancement into baseline expenditure", () => {
    const neutral = calculateMetabolicRates(baseProfile, { weight: 72 })
    const withLegacyTEF = calculateMetabolicRates(baseProfile, {
      weight: 72,
      additionalTEF: 100,
    })

    expect(withLegacyTEF?.baselineExpenditure).toBe(
      neutral?.baselineExpenditure,
    )
    expect(withLegacyTEF?.tdee).toBe(neutral?.tdee)
    expect(withLegacyTEF).not.toHaveProperty("tefEnhancement")
  })
})
