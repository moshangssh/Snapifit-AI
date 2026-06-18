/**
 * AS（强直性脊柱炎）安全锁
 *
 * 为确定性训练引擎提供"预防性、默认安全"的动作约束层：把安全从"事后拉黑"
 * 转为"事前默认排除、显式解锁"。判定**基于动作的结构化标签**
 * （movementPattern / angle / equipment），而非按动作 ID 硬编码，
 * 这样未来新增动作时能自动被正确分类。
 *
 * @see docs/adr/0006-exercise-catalog-96-selected-from-824.md
 * @see GitHub Issue #46
 */

import type { Exercise } from "@/lib/workout/engine/catalog"

/**
 * AS 风险动作类别。每个类别对应一个可被用户（在医生同意后）单独解锁的开关。
 */
export type ASRiskCategory =
  | "axial_loaded_lower" // 重轴向下肢负重：杠铃深蹲 / 硬拉 / 站姿提踵
  | "overhead_press" // 负重过顶按压：杠铃 / 哑铃推举、借力推
  | "olympic_lift" // 爆发性杠铃复合：抓举、扛铃台阶上步

export const AS_RISK_CATEGORIES: ASRiskCategory[] = [
  "axial_loaded_lower",
  "overhead_press",
  "olympic_lift",
]

/** 解锁开关的用户可读文案（HITL UI 用）。 */
export const AS_RISK_CATEGORY_LABELS: Record<ASRiskCategory, string> = {
  axial_loaded_lower: "杠铃下肢轴向（深蹲 / 硬拉 / 提踵）",
  overhead_press: "负重过顶按压（杠铃 / 哑铃推举）",
  olympic_lift: "爆发性杠铃复合（抓举 / 扛铃台阶上步）",
}

/** 计划里给"手动解锁的风险动作"打的标签，便于用户与默认安全动作区分。 */
export const AS_UNLOCKED_LABEL = "AS·已解锁"

const RISK_CATEGORY_SET = new Set<string>(AS_RISK_CATEGORIES)

/**
 * 判定某动作属于哪一类 AS 风险动作模式；若不属于任何风险类别（即默认安全），返回 null。
 *
 * 判定完全基于结构化标签：
 * - 轴向下肢负重：movementPattern ∈ {squat_pattern, hinge_pattern, calf_raise} 且 equipment = BARBELL
 *   （站姿杠铃提踵把杠铃扛在上背，与深蹲同为脊柱轴向压缩，故一并归此类）
 * - 过顶按压：movementPattern = vertical_push 且（angle = overhead 或自由重量 BARBELL/DUMBBELL 过顶）
 * - 奥举/爆发：movementPattern = compound 且 equipment = BARBELL
 *   （抓举与扛铃台阶上步的结构化标签完全相同，无法在不按 ID 硬编码的前提下区分，
 *    二者又都是脊柱高风险的爆发性杠铃复合动作，故一并归此类、默认锁定）
 */
export function classifyASRisk(exercise: Exercise): ASRiskCategory | null {
  const { movementPattern, angle, equipment } = exercise

  if (
    (movementPattern === "squat_pattern" ||
      movementPattern === "hinge_pattern" ||
      movementPattern === "calf_raise") &&
    equipment === "BARBELL"
  ) {
    return "axial_loaded_lower"
  }

  if (
    movementPattern === "vertical_push" &&
    (angle === "overhead" ||
      equipment === "BARBELL" ||
      equipment === "DUMBBELL")
  ) {
    return "overhead_press"
  }

  if (movementPattern === "compound" && equipment === "BARBELL") {
    return "olympic_lift"
  }

  return null
}

/**
 * 在给定解锁集合下，某动作对 AS 是否安全（可进入候选池）。
 * 默认安全动作恒为 true；风险动作仅当其类别被显式解锁时才为 true。
 */
export function isASSafe(
  exercise: Exercise,
  unlockedRiskCategories: readonly string[] = [],
): boolean {
  const risk = classifyASRisk(exercise)
  return risk === null || unlockedRiskCategories.includes(risk)
}

/**
 * 过滤掉在当前解锁状态下对 AS 不安全的动作，保留默认安全动作和已解锁的风险动作。
 */
export function filterASSafe<T extends Exercise>(
  exercises: readonly T[],
  unlockedRiskCategories: readonly string[] = [],
): T[] {
  return exercises.filter((exercise) =>
    isASSafe(exercise, unlockedRiskCategories),
  )
}

/** 若某动作只是因为被解锁才进入候选池，返回其风险类别，否则返回 null（用于 UI 标注）。 */
export function unlockedRiskCategoryOf(
  exercise: Exercise,
  unlockedRiskCategories: readonly string[] = [],
): ASRiskCategory | null {
  const risk = classifyASRisk(exercise)
  return risk !== null && unlockedRiskCategories.includes(risk) ? risk : null
}

/** 校验并规整解锁集合：去重、剔除未知类别。 */
export function normalizeUnlockedRiskCategories(
  value: unknown,
): ASRiskCategory[] {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value.filter(
        (item): item is ASRiskCategory =>
          typeof item === "string" && RISK_CATEGORY_SET.has(item),
      ),
    ),
  )
}
