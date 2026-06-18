import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("WorkoutExerciseCard component", () => {
  const source = readFileSync(
    join(process.cwd(), "components/workout/workout-exercise-card.tsx"),
    "utf8",
  )

  it("wires in the render-time exercise guide lookup and renders the overview", () => {
    expect(source).toContain('from "@/lib/workout/exercise-guide"')
    expect(source).toMatch(/getExerciseGuide\(/)
    expect(source).toMatch(/guide[?.]\.?description|guide\.description/)
  })

  it("renders the AS safety reminder unconditionally (not gated on guide content)", () => {
    // AS 安全提醒(引擎 tips)始终渲染:不再用 tips.length 守卫,也不依赖 guide 是否命中
    expect(source).toContain("注意事项")
    expect(source).not.toMatch(/tips\.length\s*>\s*0\s*&&/)
  })

  it("renders the SmartWorkout guide block only when source content is found", () => {
    // 无源内容(自定义/AI 生成动作) → guide 为 null → 区块不渲染,只剩 AS 提醒
    expect(source).toMatch(/\{\s*guide\s*&&/)
  })

  it("truncates guide tips and common mistakes to a few items", () => {
    expect(source).toContain("GUIDE_SUMMARY_LIMIT")
    expect(source).toMatch(/\.slice\(0,\s*GUIDE_SUMMARY_LIMIT\)/)
  })

  it("labels the guide tip and common-mistake summary sections", () => {
    expect(source).toContain("技巧")
    expect(source).toContain("常见错误")
  })
})
