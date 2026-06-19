import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ALL_EXERCISES } from "@/lib/workout/engine/catalog"
import { EXERCISE_GUIDE_DETAIL } from "@/lib/workout/engine/exercise-guide-detail"
import { EXERCISE_GUIDE_INLINE } from "@/lib/workout/engine/exercise-guide-inline"

interface SourceExercise {
  id: string
  instructionsZh?: string[]
  videoLightUrl?: string | null
  thumbnail1?: string
  thumbnail2?: string
}

const SOURCE = JSON.parse(
  readFileSync(
    join(
      process.cwd(),
      "docs/smartworkout-exercise-comparison-2026-06-02/smartworkout_exercises_zh.json",
    ),
    "utf8",
  ),
) as SourceExercise[]

const SOURCE_BY_ID = new Map(SOURCE.map((exercise) => [exercise.id, exercise]))
const CATALOG_IDS = ALL_EXERCISES.map((exercise) => exercise.id)
const MATCHED_IDS = CATALOG_IDS.filter((id) => SOURCE_BY_ID.has(id))
const CUSTOM_IDS = CATALOG_IDS.filter((id) => !SOURCE_BY_ID.has(id))

// 集中锤式弯举：catalog 能匹配，但源数据 videoLightUrl/thumbnail 本就为空——
// 有完整分步骤、无演示媒体。详情模块如实保留空串（不杜撰），Dialog 走回退。
const MEDIA_LESS_ID = "b866a8c1-4083-403a-9a68-ba6846f85a87"

describe("exercise guide detail module", () => {
  it("covers every catalog id, all of which now have source content", () => {
    // #51 removed the 2 spurious non-source copies, so every catalog id is
    // source-backed: MATCHED == catalog, CUSTOM == 0, and the detail module
    // mirrors the catalog exactly.
    expect(CUSTOM_IDS).toHaveLength(0)
    expect(MATCHED_IDS).toHaveLength(CATALOG_IDS.length)

    const moduleIds = new Set(Object.keys(EXERCISE_GUIDE_DETAIL))
    expect(moduleIds.size).toBe(CATALOG_IDS.length)
    for (const id of MATCHED_IDS) {
      expect(moduleIds.has(id)).toBe(true)
    }
  })

  it("has no fallback-only custom catalog ids after #51 dedup", () => {
    expect(CUSTOM_IDS).toEqual([])
  })

  it("does not bundle the 718 unused source exercises", () => {
    const moduleIds = Object.keys(EXERCISE_GUIDE_DETAIL)
    expect(moduleIds).toHaveLength(MATCHED_IDS.length)
    expect(moduleIds.every((id) => SOURCE_BY_ID.has(id))).toBe(true)
  })

  it("carries non-empty step-by-step instructions for every entry", () => {
    for (const [id, entry] of Object.entries(EXERCISE_GUIDE_DETAIL)) {
      expect(entry.instructions.length, id).toBeGreaterThan(0)
      expect(entry.instructions.every((step) => step.length > 0), id).toBe(true)
    }
  })

  it("carries a videoLightUrl where the source has one (1 entry legitimately has none)", () => {
    const withVideo = Object.values(EXERCISE_GUIDE_DETAIL).filter(
      (entry) => entry.videoLightUrl.length > 0,
    )
    const withoutVideo = Object.values(EXERCISE_GUIDE_DETAIL).filter(
      (entry) => entry.videoLightUrl.length === 0,
    )

    expect(withoutVideo).toHaveLength(1)
    expect(withVideo).toHaveLength(
      Object.keys(EXERCISE_GUIDE_DETAIL).length - 1,
    )

    // 该动作有分步骤、无演示媒体：video 与 thumbnail 都为空，但步骤保留
    expect(EXERCISE_GUIDE_DETAIL[MEDIA_LESS_ID].videoLightUrl).toBe("")
    expect(EXERCISE_GUIDE_DETAIL[MEDIA_LESS_ID].thumbnail).toBe("")
    expect(
      EXERCISE_GUIDE_DETAIL[MEDIA_LESS_ID].instructions.length,
    ).toBeGreaterThan(0)
  })

  it("mirrors the source fields faithfully (no fabricated content, videoDarkUrl ignored)", () => {
    for (const [id, entry] of Object.entries(EXERCISE_GUIDE_DETAIL)) {
      const source = SOURCE_BY_ID.get(id)!
      expect(entry.instructions).toEqual(source.instructionsZh)
      expect(entry.videoLightUrl).toBe(source.videoLightUrl ?? "")
      expect(entry.thumbnail).toBe(source.thumbnail1 || source.thumbnail2 || "")
    }
  })

  // inline 与 detail 由同一脚本单次写出，键必须 1:1。卡片以 inline（guide 非空）为开关，
  // 却用同一 id 懒加载 detail——若两者漂移（有人只重生成/手改其一），按钮会显示但详情查空。
  // 这条用例把那条隐性约定钉成断言。
  it("has detail keys exactly matching the inline module (no drift)", () => {
    const inlineKeys = Object.keys(EXERCISE_GUIDE_INLINE).sort()
    const detailKeys = Object.keys(EXERCISE_GUIDE_DETAIL).sort()
    expect(detailKeys).toEqual(inlineKeys)
  })
})
