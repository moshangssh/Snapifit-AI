import { describe, expect, it } from "vitest"
import { getExerciseGuide } from "@/lib/workout/exercise-guide"

// 机器胸部推举 (Machine Chest Press) —— catalog 中能在源数据精确匹配的动作
const KNOWN_CATALOG_ID = "81112d74-4711-4ddc-9145-a610bf8407c8"
// 无源指南内容的动作（AI 生成 / 自填，不在精选库源数据中），应走回退（返回 null）。
// (#51 去重后精选库已无"在库但无源内容"的条目。)
const CUSTOM_CATALOG_ID = "ai-generated-no-source-exercise"

describe("exercise guide lookup", () => {
  it("returns overview, tips and common mistakes for a known catalog exercise", () => {
    const guide = getExerciseGuide({ catalogExerciseId: KNOWN_CATALOG_ID })

    expect(guide).not.toBeNull()
    expect(guide!.description.length).toBeGreaterThan(0)
    expect(guide!.tips.length).toBeGreaterThan(0)
    expect(Array.isArray(guide!.commonMistakes)).toBe(true)
  })

  it("returns null for an exercise id with no source content (AI-generated / custom)", () => {
    expect(
      getExerciseGuide({ catalogExerciseId: CUSTOM_CATALOG_ID }),
    ).toBeNull()
  })

  it("returns null for an unknown / AI-generated exercise id", () => {
    expect(
      getExerciseGuide({ catalogExerciseId: "not-a-catalog-id" }),
    ).toBeNull()
  })

  it("returns null when no catalog id is present (free-text exercise)", () => {
    expect(getExerciseGuide({})).toBeNull()
  })

  it("returns null for a replaced exercise even though it retains the original catalog id", () => {
    // replaceWorkoutExercise 出于引擎追踪保留了原 catalogExerciseId，但展示的是
    // 用户自填的自由文本动作；不能再把原动作的指南挂在新名字下（否则误导）。
    expect(
      getExerciseGuide({
        catalogExerciseId: KNOWN_CATALOG_ID,
        actualExerciseName: "弹力带胸推",
      }),
    ).toBeNull()
  })
})
