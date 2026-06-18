import {
  EXERCISE_GUIDE_INLINE,
  type ExerciseGuideInlineEntry,
} from "@/lib/workout/engine/exercise-guide-inline"

export type ExerciseGuide = ExerciseGuideInlineEntry

/**
 * 渲染时按 catalog 动作身份查「动作指南」内联内容。
 *
 * 沿用 exercise-labels.ts 的「按 id 查 catalog」模式：内容不写入 session，
 * 仅渲染时查表。已知 catalog id 返回 { description, tips, commonMistakes }；
 * 未知 / 自定义 / 缺省 id 返回 null（卡片只显示 AS 安全提醒，走回退）。
 *
 * 已替换的动作（带 actualExerciseName）一并回退：replaceWorkoutExercise 出于引擎
 * 追踪需要保留了原 catalogExerciseId，但卡片展示的是用户自填的自由文本动作，
 * 原动作的指南不再适用——否则会把原动作的概述/技巧挂在新名字下，误导用户。
 */
export function getExerciseGuide(input: {
  catalogExerciseId?: string
  actualExerciseName?: string
}): ExerciseGuide | null {
  if (!input.catalogExerciseId || input.actualExerciseName) {
    return null
  }

  return EXERCISE_GUIDE_INLINE[input.catalogExerciseId] ?? null
}
