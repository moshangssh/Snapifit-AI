import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card"
import type { WorkoutSessionExercise } from "@/lib/workout/types"

// 机器胸部推举 —— catalog 中能在源数据精确匹配、且 tips/常见错误均超过 3 条（用于截断断言）
const KNOWN_CATALOG_ID = "81112d74-4711-4ddc-9145-a610bf8407c8"
// 自定义动作（在 catalog 但无源内容，走回退）
const CUSTOM_CATALOG_ID = "e14e762d-0ff7-4ec0-8c64-2da9c9fce21d"

// 源指南内容片段（来自生成模块，用于精确断言命中 / 截断）
const GUIDE_OVERVIEW_FRAGMENT = "提供了一个可控的运动路径"
const GUIDE_TIP_3 = "在向前推时专注于挤压胸肌，以最大化激活。"
const GUIDE_TIP_4 = "避免在完全伸展时锁住肘部，以保持肌肉的持续紧张。"
const GUIDE_MISTAKE_3 = "让肩膀离开靠背，减少胸部参与。"
const GUIDE_MISTAKE_4 = "利用惯性推重物，影响肌肉激活。"

const ENGINE_TIP = "保持动作可控。"
// 与卡片里的 AS_SAFETY_FALLBACK_TIP 对齐
const AS_SAFETY_FALLBACK_TIP = "出现不适就降低幅度或停止。"

function makeExercise(
  overrides: Partial<WorkoutSessionExercise> = {},
): WorkoutSessionExercise {
  return {
    exerciseId: "ex-1",
    plannedExerciseName: "机器胸部推举",
    phase: "main",
    tips: [ENGINE_TIP, AS_SAFETY_FALLBACK_TIP],
    // 全部组完成 → 卡片视为 done，动作行（含替换/不适弹窗）不渲染，聚焦指南/AS 区块
    sets: [
      {
        setIndex: 1,
        plannedReps: 10,
        plannedWeightKg: 20,
        touched: { weight: false, reps: false },
        isCompleted: true,
        isSkipped: false,
      },
    ],
    isExerciseSkipped: false,
    analysisStatus: "planned",
    plannedAnalysis: {
      exerciseType: "strength",
      muscleGroups: ["chest"],
      estimatedMets: 4,
      estimatedDurationMinutes: 5,
      caloriesBurnedEstimated: 30,
      isEstimated: true,
    },
    catalogExerciseId: KNOWN_CATALOG_ID,
    ...overrides,
  }
}

const noop = () => {}
const baseProps = {
  isCurrent: false,
  onUpdateSetValue: noop,
  onCompleteSet: noop,
  onReplaceExercise: noop,
  onToggleDiscomfortFlag: noop,
  onToggleSkipExercise: noop,
}

function render(exercise: WorkoutSessionExercise) {
  return renderToStaticMarkup(
    <WorkoutExerciseCard {...baseProps} exercise={exercise} />,
  )
}

describe("WorkoutExerciseCard", () => {
  describe("known catalog exercise with source content", () => {
    const html = render(makeExercise())

    it("renders the AS safety reminder (engine tips) above the guide", () => {
      expect(html).toContain("注意事项")
      expect(html).toContain(ENGINE_TIP)
    })

    it("renders the guide overview and both section headers", () => {
      expect(html).toContain(GUIDE_OVERVIEW_FRAGMENT)
      expect(html).toContain("技巧")
      expect(html).toContain("常见错误")
    })

    it("truncates guide tips and common mistakes to the first few", () => {
      expect(html).toContain(GUIDE_TIP_3)
      expect(html).not.toContain(GUIDE_TIP_4)
      expect(html).toContain(GUIDE_MISTAKE_3)
      expect(html).not.toContain(GUIDE_MISTAKE_4)
    })
  })

  describe("replaced exercise (retains original catalog id, tips cleared)", () => {
    // 还原 replaceWorkoutExercise 的产物：保留原 catalogExerciseId、带 actualExerciseName、tips 置空
    const html = render(
      makeExercise({ actualExerciseName: "弹力带胸推", tips: [] }),
    )

    it("shows the replacement name but not the original movement's guide", () => {
      expect(html).toContain("弹力带胸推")
      expect(html).toContain("已替换")
      // Fix B：替换后不能把原动作的指南挂在新名字下
      expect(html).not.toContain(GUIDE_OVERVIEW_FRAGMENT)
      expect(html).not.toContain("常见错误")
    })

    it("still renders a non-empty AS safety reminder via the fallback line", () => {
      // Fix A：tips 被清空时不渲染空盒子，回退到通用安全句（脱离处方时最该提醒）
      expect(html).toContain("注意事项")
      expect(html).toContain(AS_SAFETY_FALLBACK_TIP)
    })
  })

  describe("custom exercise with no source content", () => {
    const html = render(
      makeExercise({
        plannedExerciseName: "自定义动作",
        catalogExerciseId: CUSTOM_CATALOG_ID,
        tips: [ENGINE_TIP],
      }),
    )

    it("renders only the AS reminder, no guide block", () => {
      expect(html).toContain("注意事项")
      expect(html).toContain(ENGINE_TIP)
      expect(html).not.toContain(GUIDE_OVERVIEW_FRAGMENT)
      expect(html).not.toContain("常见错误")
    })
  })

  // 动作指南按钮在「未完成」动作的操作行里（与替换/感觉不对/跳过同排）。
  // 上面的用例用「已完成」动作（操作行不渲染），这里改用未完成动作触发操作行。
  describe("exercise guide button in the action row (not done)", () => {
    const activeSets = [
      {
        setIndex: 1,
        plannedReps: 10,
        plannedWeightKg: 20,
        touched: { weight: false, reps: false },
        isCompleted: false,
        isSkipped: false,
      },
    ]

    it("shows the 动作指南 button for a known catalog exercise with source content", () => {
      const html = render(makeExercise({ sets: activeSets }))
      expect(html).toContain("动作指南")
      // 与现有操作行按钮同排出现
      expect(html).toContain("替换动作")
      expect(html).toContain("感觉不对")
    })

    it("hides the 动作指南 button for a custom exercise with no source content", () => {
      const html = render(
        makeExercise({
          sets: activeSets,
          plannedExerciseName: "自定义动作",
          catalogExerciseId: CUSTOM_CATALOG_ID,
          tips: [ENGINE_TIP],
        }),
      )
      expect(html).not.toContain("动作指南")
      // 其它操作仍在（确认是条件隐藏指南按钮，而非整行消失）
      expect(html).toContain("替换动作")
    })

    it("hides the 动作指南 button for a replaced exercise (guide falls back to null)", () => {
      const html = render(
        makeExercise({
          sets: activeSets,
          actualExerciseName: "弹力带胸推",
          tips: [],
        }),
      )
      expect(html).not.toContain("动作指南")
      expect(html).toContain("替换动作")
    })
  })
})
