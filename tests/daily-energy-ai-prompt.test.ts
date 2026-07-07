import { describe, expect, it } from "vitest"
import { buildDailyEnergySnapshotPrompt } from "@/lib/ai/daily-energy-prompt"
import type { DailyLog, UserProfile } from "@/lib/types"

const baseProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "lose_weight",
}

function makeLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    date: "2026-06-24",
    foodEntries: [],
    exerciseEntries: [],
    summary: {
      totalCaloriesConsumed: 1800,
      totalCaloriesBurned: 300,
      macros: { carbs: 180, protein: 120, fat: 60 },
      micronutrients: {},
    },
    baselineExpenditure: 2000,
    tefAnalysis: {
      baseTEF: 180,
      baseTEFPercentage: 10,
      enhancementMultiplier: 1.25,
      enhancedTEF: 230,
      enhancementFactors: ["咖啡因", "辛辣食物"],
      analysisTimestamp: "2026-06-24T04:00:00.000Z",
    },
    ...overrides,
  }
}

describe("daily energy AI prompt", () => {
  it("describes advice context from the daily energy snapshot", () => {
    const prompt = buildDailyEnergySnapshotPrompt({
      log: makeLog(),
      userProfile: baseProfile,
      now: new Date("2026-06-24T12:00:00+08:00"),
    })

    expect(prompt).toContain("今日维持热量: 2300 kcal")
    expect(prompt).toContain("今日热量预算: 1900 kcal")
    expect(prompt).toContain("摄入: 1800 kcal")
    expect(prompt).toContain("已记录运动: 300 kcal")
    expect(prompt).toContain("热量平衡: -500 kcal")
    expect(prompt).toContain("状态: deficit")
    expect(prompt).toContain("宏量目标: 蛋白质 130g, 碳水 242g, 脂肪 46g")
    expect(prompt).not.toContain("代谢提示")
    expect(prompt).not.toContain("提示估计影响")
    expect(prompt).not.toContain("提示置信度")
    expect(prompt).toContain("个体校准: 未启用")
    expect(prompt).toContain("未来多日个体校准未启用")
    expect(prompt).toContain("单日热量平衡只是当天决策估算")
  })

  it("carries warnings for missing config and empty daily records", () => {
    const prompt = buildDailyEnergySnapshotPrompt({
      log: makeLog({
        baselineExpenditure: undefined,
        calculatedTDEE: undefined,
        tefAnalysis: undefined,
        summary: {
          totalCaloriesConsumed: 0,
          totalCaloriesBurned: 0,
          macros: { carbs: 0, protein: 0, fat: 0 },
          micronutrients: {},
        },
      }),
      userProfile: { ...baseProfile, weight: 0 },
      now: new Date("2026-06-24T08:00:00+08:00"),
    })

    expect(prompt).toContain("状态: missing-config")
    expect(prompt).toContain("置信度: low")
    expect(prompt).toContain("缺少基础配置: 基础配置")
    expect(prompt).toContain("当前快照置信度较低")
    expect(prompt).not.toContain("代谢提示")
  })
})
