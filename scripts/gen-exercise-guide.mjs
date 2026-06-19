/**
 * 生成「动作指南」内容模块（提交式）。
 *
 * 读 catalog.ts 当前的动作 id 列表，从 SmartWorkout 源 JSON 过滤出对应动作，
 * 产出两个提交式模块（均置于 lib/workout/engine/）—— 仅含 catalog 用到且能在
 * 源数据中精确匹配的动作：
 *   - exercise-guide-inline.ts ：{ description, tips, commonMistakes }（卡片首屏直接 import）
 *   - exercise-guide-detail.ts ：{ instructions, videoLightUrl, thumbnail }（指南 Dialog 懒加载）
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
const INLINE_OUTPUT_PATH = new URL(
  "lib/workout/engine/exercise-guide-inline.ts",
  REPO_ROOT,
)
const DETAIL_OUTPUT_PATH = new URL(
  "lib/workout/engine/exercise-guide-detail.ts",
  REPO_ROOT,
)

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

  const inlineEntries = {}
  const detailEntries = {}
  const customIds = []
  for (const id of catalogIds) {
    const exercise = sourceById.get(id)
    if (!exercise) {
      customIds.push(id)
      continue
    }
    inlineEntries[id] = {
      description: exercise.descriptionZh ?? "",
      tips: exercise.tipsZh ?? [],
      commonMistakes: exercise.commonMistakesZh ?? [],
    }
    detailEntries[id] = {
      // 仅 videoLightUrl（项目不做暗色，忽略 videoDarkUrl）；无源媒体的动作保留空串走回退
      instructions: exercise.instructionsZh ?? [],
      videoLightUrl: exercise.videoLightUrl ?? "",
      thumbnail: exercise.thumbnail1 || exercise.thumbnail2 || "",
    }
  }

  const inlineBanner = `/**
 * 自动生成 —— 请勿手动编辑。
 *
 * 由 scripts/gen-exercise-guide.mjs 从 SmartWorkout 源数据派生（运行 \`npm run gen:guide\` 重生成）。
 * 内容仅作教学参考，绝不覆盖引擎处方或 AS 安全提醒。无源内容的动作不在此模块中（走回退）。
 *
 * @see docs/adr/0007-exercise-guide-content-from-smartworkout.md
 */
`

  const inlineFile = `${inlineBanner}
export interface ExerciseGuideInlineEntry {
  /** 动作概述（全文）。 */
  description: string
  /** 技巧提示（来自源数据，可多条）。 */
  tips: string[]
  /** 常见错误（来自源数据，部分动作源数据为空）。 */
  commonMistakes: string[]
}

export const EXERCISE_GUIDE_INLINE: Record<string, ExerciseGuideInlineEntry> =
  ${JSON.stringify(inlineEntries, null, 2).replace(/\n/g, "\n  ")}
`

  const detailBanner = `/**
 * 自动生成 —— 请勿手动编辑。
 *
 * 由 scripts/gen-exercise-guide.mjs 从 SmartWorkout 源数据派生（运行 \`npm run gen:guide\` 重生成）。
 * 详情内容（分步骤 / 演示视频 / 缩略图）由「动作指南」Dialog 懒加载（dynamic import），不进首屏包。
 * 仅作教学参考，绝不覆盖引擎处方或 AS 安全提醒。无源内容的动作不在此模块中（走回退）。
 *
 * @see docs/adr/0007-exercise-guide-content-from-smartworkout.md
 */
`

  const detailFile = `${detailBanner}
export interface ExerciseGuideDetailEntry {
  /** 分步骤做法（来自源数据 instructionsZh）。 */
  instructions: string[]
  /** 演示视频热链（仅 videoLightUrl；部分动作源数据为空）。 */
  videoLightUrl: string
  /** 缩略图热链（视频加载失败时回退；部分动作源数据为空）。 */
  thumbnail: string
}

export const EXERCISE_GUIDE_DETAIL: Record<string, ExerciseGuideDetailEntry> =
  ${JSON.stringify(detailEntries, null, 2).replace(/\n/g, "\n  ")}
`

  writeFileSync(fileURLToPath(INLINE_OUTPUT_PATH), inlineFile, "utf8")
  writeFileSync(fileURLToPath(DETAIL_OUTPUT_PATH), detailFile, "utf8")

  console.log(
    `gen:guide → 内联 ${Object.keys(inlineEntries).length} 条 + 详情 ${Object.keys(detailEntries).length} 条` +
      `（catalog ${catalogIds.length} 个 id，其中 ${customIds.length} 个无源内容走回退）`,
  )
}

main()
