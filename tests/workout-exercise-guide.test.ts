import { describe, expect, it } from "vitest"
import { getExerciseGuide } from "@/lib/workout/exercise-guide"

// 机器胸部推举 (Machine Chest Press) —— catalog 中能在源数据精确匹配的动作
const KNOWN_CATALOG_ID = "81112d74-4711-4ddc-9145-a610bf8407c8"
// 自定义动作（在 catalog 但无源内容，应走回退）
const CUSTOM_CATALOG_ID = "e14e762d-0ff7-4ec0-8c64-2da9c9fce21d"

describe("exercise guide lookup", () => {
  it("returns overview, tips and common mistakes for a known catalog exercise", () => {
    const guide = getExerciseGuide({ catalogExerciseId: KNOWN_CATALOG_ID })

    expect(guide).not.toBeNull()
    expect(guide!.description.length).toBeGreaterThan(0)
    expect(guide!.tips.length).toBeGreaterThan(0)
    expect(Array.isArray(guide!.commonMistakes)).toBe(true)
  })

  it("returns null for a custom catalog exercise with no source content", () => {
    expect(
      getExerciseGuide({ catalogExerciseId: CUSTOM_CATALOG_ID }),
    ).toBeNull()
  })

  it("returns null for an unknown / AI-generated exercise id", () => {
    expect(
      getExerciseGuide({ catalogExerciseId: "not-a-catalog-id" }),
    ).toBeNull()
  })

  it("returns null when no catalog id is present (replaced / free-text exercise)", () => {
    expect(getExerciseGuide({})).toBeNull()
  })
})
