import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ExerciseGuideDialog } from "@/components/workout/exercise-guide-dialog"

// 源码级组件测试（仿 tests/smart-analysis-summary-card.test.ts）：Dialog 的真正行为
// （打开后懒加载、播放视频、失败回退）只在浏览器里显现，这里断言源码满足 #42 的契约。
describe("ExerciseGuideDialog component", () => {
  const source = readFileSync(
    join(process.cwd(), "components/workout/exercise-guide-dialog.tsx"),
    "utf8",
  )

  it("exports ExerciseGuideDialog", () => {
    expect(source).toMatch(/export\s+(function|const)\s+ExerciseGuideDialog/)
  })

  it("accepts the documented props", () => {
    expect(source).toContain("catalogExerciseId")
    expect(source).toContain("displayName")
    expect(source).toContain("guide")
    expect(source).toContain("muscleLabels")
  })

  it("renders a '动作指南' trigger styled like the other card actions", () => {
    expect(source).toContain("动作指南")
    expect(source).toContain("DialogTrigger")
  })

  it("lazy-loads the detail module via dynamic import (kept out of the first-load bundle)", () => {
    expect(source).toMatch(
      /import\(\s*["']@\/lib\/workout\/engine\/exercise-guide-detail["']\s*\)/,
    )
    // 详情模块只能动态 import，不能静态 import 进首屏
    expect(source).not.toMatch(
      /import\s+\{[^}]*\}\s+from\s+["']@\/lib\/workout\/engine\/exercise-guide-detail["']/,
    )
  })

  it("uses only videoLightUrl for the demo video (project has no dark mode)", () => {
    expect(source).toContain("videoLightUrl")
    expect(source).toMatch(/<video/)
    expect(source).not.toContain("videoDarkUrl")
  })

  it("falls back to the thumbnail when the video fails to load", () => {
    expect(source).toContain("onError")
    expect(source).toContain("thumbnail")
  })

  it("renders the full step-by-step instructions, all tips and all common mistakes", () => {
    expect(source).toContain("分步骤")
    expect(source).toContain("技巧")
    expect(source).toContain("常见错误")
    expect(source).toContain("instructions.map(")
    expect(source).toContain("tips.map(")
    expect(source).toContain("commonMistakes.map(")
  })

  it("renders the target muscle groups", () => {
    expect(source).toContain("目标肌群")
    expect(source).toContain("muscleLabels")
  })
})

describe("ExerciseGuideDialog render (closed state smoke)", () => {
  const html = renderToStaticMarkup(
    createElement(ExerciseGuideDialog, {
      catalogExerciseId: "81112d74-4711-4ddc-9145-a610bf8407c8",
      displayName: "机器胸部推举",
      guide: { description: "概述", tips: ["技巧一"], commonMistakes: ["错误一"] },
      muscleLabels: "胸部",
    }),
  )

  it("mounts and renders the '动作指南' trigger without throwing", () => {
    expect(html).toContain("动作指南")
  })

  it("does not eagerly render heavy detail content while closed (lazy)", () => {
    // 详情走懒加载，关闭态不应渲染分步骤等重内容
    expect(html).not.toContain("分步骤做法")
  })
})
