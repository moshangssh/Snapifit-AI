import { describe, expect, it } from "vitest"
import {
  calculateDeloadParams,
  shouldDeload,
} from "@/lib/workout/engine/deload"

describe("novice deload rules", () => {
  it("triggers every twelve completed sessions", () => {
    expect(shouldDeload(11)).toBe(false)
    expect(shouldDeload(12)).toBe(true)
    expect(shouldDeload(24)).toBe(true)
    expect(shouldDeload(36)).toBe(true)
  })

  it("handles edge cases correctly", () => {
    expect(shouldDeload(0)).toBe(false)
    expect(shouldDeload(1)).toBe(false)
    expect(shouldDeload(11)).toBe(false)
  })

  it("lasts for three generated sessions", () => {
    expect([12, 13, 14].map((count) => shouldDeload(count))).toEqual([
      true,
      true,
      true,
    ])
    expect(shouldDeload(15)).toBe(false)
  })

  it("reduces weight by thirty percent and sets from three to two", () => {
    expect(calculateDeloadParams(100, 3)).toEqual({
      weight: 70,
      sets: 2,
    })
  })
})
