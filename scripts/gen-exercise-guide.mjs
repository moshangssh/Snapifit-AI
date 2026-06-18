/**
 * 生成「动作指南」内联内容模块（提交式）。
 *
 * 读 catalog.ts 当前的动作 id 列表，从 SmartWorkout 源 JSON 过滤出对应动作，
 * 产出 lib/workout/engine/exercise-guide-inline.ts —— 仅含 catalog 用到且能在
 * 源数据中精确匹配的动作的 { description, tips, commonMistakes }。
 *
 * catalog 增删动作后重跑 `npm run gen:guide` 即可同步。
 *
 * @see docs/adr/0007-exercise-guide-content-from-smartworkout.md
 */

import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const REPO_ROOT = new URL("../", import.meta.url)
const CATALOG_PATH = new URL("lib/workout/engine/catalog.ts", REPO_ROOT)
const SOURCE_PATH = new URL(
  "docs/smartworkout-exercise-comparison-2026-06-02/smartworkout_exercises_zh.json",
  REPO_ROOT,
)
const OUTPUT_PATH = new URL("lib/workout/engine/exercise-guide-inline.ts", REPO_ROOT)

/** 从 catalog.ts 源码按 `id: '<uuid>'` 提取动作 id（保留文件顺序，便于稳定 diff）。 */
function extractCatalogIds(catalogSource) {
  const ids = []
  const seen = new Set()
  const pattern = /\bid:\s*'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'/g
  let match
  while ((match = pattern.exec(catalogSource)) !== null) {
    const id = match[1]
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }
  return ids
}

function main() {
  const catalogSource = readFileSync(fileURLToPath(CATALOG_PATH), "utf8")
  const catalogIds = extractCatalogIds(catalogSource)

  const source = JSON.parse(readFileSync(fileURLToPath(SOURCE_PATH), "utf8"))
  const sourceById = new Map(source.map((exercise) => [exercise.id, exercise]))

  const entries = {}
  const customIds = []
  for (const id of catalogIds) {
    const exercise = sourceById.get(id)
    if (!exercise) {
      customIds.push(id)
      continue
    }
    entries[id] = {
      description: exercise.descriptionZh ?? "",
      tips: exercise.tipsZh ?? [],
      commonMistakes: exercise.commonMistakesZh ?? [],
    }
  }

  const banner = `/**
 * 自动生成 —— 请勿手动编辑。
 *
 * 由 scripts/gen-exercise-guide.mjs 从 SmartWorkout 源数据派生（运行 \`npm run gen:guide\` 重生成）。
 * 内容仅作教学参考，绝不覆盖引擎处方或 AS 安全提醒。无源内容的动作不在此模块中（走回退）。
 *
 * @see docs/adr/0007-exercise-guide-content-from-smartworkout.md
 */
`

  const file = `${banner}
export interface ExerciseGuideInlineEntry {
  /** 动作概述（全文）。 */
  description: string
  /** 技巧提示（来自源数据，可多条）。 */
  tips: string[]
  /** 常见错误（来自源数据，部分动作源数据为空）。 */
  commonMistakes: string[]
}

export const EXERCISE_GUIDE_INLINE: Record<string, ExerciseGuideInlineEntry> =
  ${JSON.stringify(entries, null, 2).replace(/\n/g, "\n  ")}
`

  writeFileSync(fileURLToPath(OUTPUT_PATH), file, "utf8")

  console.log(
    `gen:guide → ${Object.keys(entries).length} 条内联动作内容` +
      `（catalog ${catalogIds.length} 个 id，其中 ${customIds.length} 个无源内容走回退）`,
  )
}

main()
