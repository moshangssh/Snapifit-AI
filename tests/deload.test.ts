import { describe, expect, it } from "vitest"
import {
  calculateDeloadParams,
  shouldDeload,
} from "@/lib/workout/engine/deload"

describe("novice deload rules", () => {
  it("triggers every sixteen completed sessions", () => {
    expect(shouldDeload(15)).toBe(false)
    expect(shouldDeload(16)).toBe(true)
    expect(shouldDeload(32)).toBe(true)
    expect(shouldDeload(48)).toBe(true)
    // #51: the old 12-session cadence was too frequent for linear-progression
    // novices — no deload on those sessions anymore.
    expect(shouldDeload(12)).toBe(false)
    expect(shouldDeload(24)).toBe(false)
  })

  it("handles edge cases correctly", () => {
    expect(shouldDeload(0)).toBe(false)
    expect(shouldDeload(1)).toBe(false)
    expect(shouldDeload(15)).toBe(false)
  })

  it("lasts for three generated sessions", () => {
    expect([16, 17, 18].map((count) => shouldDeload(count))).toEqual([
      true,
      true,
      true,
    ])
    expect(shouldDeload(19)).toBe(false)
  })

  it("reduces weight by thirty percent and sets from three to two", () => {
    expect(calculateDeloadParams(100, 3)).toEqual({
      weight: 70,
      sets: 2,
    })
  })
})
