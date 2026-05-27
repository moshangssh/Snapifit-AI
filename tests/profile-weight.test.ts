import { describe, expect, it } from "vitest"

import { syncProfileWeightFromDailyLog } from "@/lib/profile-weight"
import type { UserProfile } from "@/lib/types"

describe("syncProfileWeightFromDailyLog", () => {
  const profile: UserProfile = {
    weight: 70,
    height: 170,
    age: 30,
    gender: "male",
    activityLevel: "moderate",
    goal: "maintain",
    targetWeight: 65,
  }

  it("updates profile weight when a positive daily weight is saved", () => {
    expect(syncProfileWeightFromDailyLog(profile, 68.4)).toEqual({
      ...profile,
      weight: 68.4,
    })
  })

  it("keeps profile weight unchanged when daily weight is cleared", () => {
    expect(syncProfileWeightFromDailyLog(profile, undefined)).toBe(profile)
  })
})
