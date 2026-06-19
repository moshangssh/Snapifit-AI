import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ALL_EXERCISES } from "@/lib/workout/engine/catalog"
import { EXERCISE_GUIDE_INLINE } from "@/lib/workout/engine/exercise-guide-inline"

interface SourceExercise {
  id: string
  descriptionZh?: string
  tipsZh?: string[]
  commonMistakesZh?: string[]
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

describe("exercise guide inline module", () => {
  it("covers every catalog id, all of which now have source content", () => {
    // #51 removed the 2 spurious non-source copies, so every catalog id is
    // source-backed: MATCHED == catalog, CUSTOM == 0, and the inline module
    // mirrors the catalog exactly.
    expect(CUSTOM_IDS).toHaveLength(0)
    expect(MATCHED_IDS).toHaveLength(CATALOG_IDS.length)

    const moduleIds = new Set(Object.keys(EXERCISE_GUIDE_INLINE))
    expect(moduleIds.size).toBe(CATALOG_IDS.length)
    for (const id of MATCHED_IDS) {
      expect(moduleIds.has(id)).toBe(true)
    }
  })

  it("has no fallback-only custom catalog ids after #51 dedup", () => {
    // The 2 former custom ids were duplicate copies of source-backed movements;
    // removing them leaves no catalog id without source content.
    expect(CUSTOM_IDS).toEqual([])
  })

  it("does not bundle the 718 unused source exercises", () => {
    const moduleIds = Object.keys(EXERCISE_GUIDE_INLINE)
    expect(moduleIds).toHaveLength(MATCHED_IDS.length)
    expect(moduleIds.every((id) => SOURCE_BY_ID.has(id))).toBe(true)
  })

  it("carries a non-empty overview and tips for every entry", () => {
    for (const [id, entry] of Object.entries(EXERCISE_GUIDE_INLINE)) {
      expect(entry.description.length, id).toBeGreaterThan(0)
      expect(entry.tips.length, id).toBeGreaterThan(0)
      expect(entry.tips.every((tip) => tip.length > 0), id).toBe(true)
    }
  })

  it("carries common mistakes where the source has them (4 entries legitimately have none)", () => {
    const withMistakes = Object.values(EXERCISE_GUIDE_INLINE).filter(
      (entry) => entry.commonMistakes.length > 0,
    )
    const withoutMistakes = Object.values(EXERCISE_GUIDE_INLINE).filter(
      (entry) => entry.commonMistakes.length === 0,
    )

    expect(withoutMistakes).toHaveLength(4)
    expect(withMistakes).toHaveLength(
      Object.keys(EXERCISE_GUIDE_INLINE).length - 4,
    )
  })

  it("mirrors the source fields faithfully (no fabricated content)", () => {
    for (const [id, entry] of Object.entries(EXERCISE_GUIDE_INLINE)) {
      const source = SOURCE_BY_ID.get(id)!
      expect(entry.description).toBe(source.descriptionZh)
      expect(entry.tips).toEqual(source.tipsZh)
      expect(entry.commonMistakes).toEqual(source.commonMistakesZh ?? [])
    }
  })
})
