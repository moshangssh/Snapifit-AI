import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("homepage daily energy snapshot integration", () => {
  const source = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8")

  it("reads homepage energy balance numbers from the daily energy snapshot", () => {
    expect(source).toContain("buildDailyEnergySnapshot")
    expect(source).toContain("dailyEnergySnapshot")
    expect(source).not.toContain(
      "const dailyTotalExpenditure = baselineExpenditure + totalCaloriesBurned",
    )
  })

  it("reads homepage macro targets from the daily energy snapshot budget", () => {
    expect(source).toContain(
      "const macroTargets = dailyEnergySnapshot.macroTargets",
    )
  })

  it("labels recorded exercise separately from baseline daily activity", () => {
    expect(source).toContain("已记录运动消耗")
    expect(source).not.toContain('<div className="formula-label">活动消耗</div>')
  })

  it("frames single-day energy balance as an estimate", () => {
    expect(source).toContain("单日估算")
  })

  it("shows the metabolic hint as a low-confidence explanation, not extra budget", () => {
    expect(source).toContain("dailyEnergySnapshot.metabolicHint")
    expect(source).toContain("低置信度提示")
    expect(source).toContain("不增加预算")
    expect(source).not.toContain("const tefExtra")
  })

  it("renders the metabolic hint card with two states and no analysis countdown", () => {
    // 卡片更名为「代谢提示」,不再带 AI 前缀
    expect(source).toContain('"twin-label">代谢提示')
    expect(source).not.toContain("AI 代谢提示")
    // 两态:有食物即时显示(含"未检测到提示"),无食物空态引导;没有"分析中"倒计时态
    expect(source).toContain("未检测到提示")
    expect(source).toContain("记录食物后即时显示")
    expect(source).not.toContain("分析中…")
    expect(source).not.toContain("tefAnalysisCountdown")
  })
})
