import { describe, expect, it } from "vitest"
import {
  buildCategorySuggestionPrompts,
  buildDayOverviewPrompt,
  buildSmartSuggestionsDataSummary,
} from "@/lib/ai/smart-suggestions-prompt"
import type { DailyLog, UserProfile } from "@/lib/types"

const userProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "lose_weight",
}

const dailyLog: DailyLog = {
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
}

const now = new Date("2026-06-24T12:00:00.000Z")

describe("buildSmartSuggestionsDataSummary", () => {
  it("takes today's energy figures from the daily energy snapshot", () => {
    const summary = buildSmartSuggestionsDataSummary({
      dailyLog,
      userProfile,
      now,
    })

    expect(summary.today.baselineExpenditure).toBe(2000)
    expect(summary.today.dailyTotalExpenditure).toBe(2300)
    expect(summary.today.exercise).toBe(300)
  })

  it("does not carry TEF analysis data in the summary", () => {
    const summary = buildSmartSuggestionsDataSummary({
      dailyLog: {
        ...dailyLog,
        tefAnalysis: {
          baseTEF: 180,
          baseTEFPercentage: 10,
          enhancementMultiplier: 1.25,
          enhancedTEF: 230,
          enhancementFactors: ["咖啡因"],
          analysisTimestamp: "2026-06-24T04:00:00.000Z",
        },
      },
      userProfile,
      now,
    })

    expect(summary.today).not.toHaveProperty("tefAnalysis")
    expect(JSON.stringify(summary)).not.toContain("tefAnalysis")
  })

  it("uses profile inference before legacy calculatedTDEE fallback", () => {
    const legacyLog: DailyLog = {
      ...dailyLog,
      baselineExpenditure: undefined,
      calculatedTDEE: 2200,
      tefAnalysis: {
        baseTEF: 180,
        baseTEFPercentage: 10,
        enhancementMultiplier: 1.25,
        enhancedTEF: 230,
        enhancementFactors: ["咖啡因"],
        analysisTimestamp: "2026-06-24T04:00:00.000Z",
      },
    }

    const summary = buildSmartSuggestionsDataSummary({
      dailyLog: legacyLog,
      userProfile,
      now,
    })

    expect(summary.today.baselineExpenditure).toBe(2596)
    expect(summary.today.dailyTotalExpenditure).toBe(2896)
  })

  it("uses legacy calculatedTDEE minus TEF only when profile inference is unavailable", () => {
    // ADR-0010 口径:遗留 calculatedTDEE 需先扣除 TEF 增强,而不是直接采用
    const legacyLog: DailyLog = {
      ...dailyLog,
      baselineExpenditure: undefined,
      calculatedTDEE: 2200,
      tefAnalysis: {
        baseTEF: 180,
        baseTEFPercentage: 10,
        enhancementMultiplier: 1.25,
        enhancedTEF: 230,
        enhancementFactors: ["咖啡因"],
        analysisTimestamp: "2026-06-24T04:00:00.000Z",
      },
    }

    const summary = buildSmartSuggestionsDataSummary({
      dailyLog: legacyLog,
      userProfile: { ...userProfile, weight: 0 },
      now,
    })

    expect(summary.today.baselineExpenditure).toBe(2150)
    expect(summary.today.dailyTotalExpenditure).toBe(2450)
  })

  it("builds the profile from the shared profile summary", () => {
    const summary = buildSmartSuggestionsDataSummary({
      dailyLog,
      userProfile: {
        ...userProfile,
        professionalMode: true,
        medicalHistory: "强直性脊柱炎",
      },
      now,
    })

    expect(summary.profile).toMatchObject({ age: 30, goal: "lose_weight" })
    expect(summary.profile.notes).toContain("医疗信息: 强直性脊柱炎")
  })

  it("caps recent logs at 7 entries", () => {
    const recentLogs = Array.from({ length: 10 }, (_, index) => ({
      ...dailyLog,
      date: `2026-06-${14 + index}`,
    }))

    const summary = buildSmartSuggestionsDataSummary({
      dailyLog,
      userProfile,
      recentLogs,
      now,
    })

    expect(summary.recent).toHaveLength(7)
  })
})

describe("suggestion prompts", () => {
  const dataSummary = buildSmartSuggestionsDataSummary({
    dailyLog,
    userProfile,
    now,
  })

  it("builds six category prompts embedding the data summary", () => {
    const prompts = buildCategorySuggestionPrompts(dataSummary)

    expect(Object.keys(prompts)).toEqual([
      "nutrition",
      "exercise",
      "metabolism",
      "behavior",
      "timing",
      "wellness",
    ])
    for (const prompt of Object.values(prompts)) {
      expect(prompt).toContain('"dailyTotalExpenditure": 2300')
      expect(prompt).toContain("JSON格式")
    }
    expect(prompts.nutrition).toContain("注册营养师")
    expect(prompts.exercise).toContain("运动生理学家")
  })

  it("keeps the metabolism dimension without claiming TEF analysis data", () => {
    const prompts = buildCategorySuggestionPrompts(dataSummary)

    expect(prompts.metabolism).toContain("代谢调节优化")
    expect(prompts.metabolism).not.toContain("基于食物热效应数据")
    expect(prompts.metabolism).toContain("基于食物记录推断")
  })

  it("builds a today-focused overview prompt", () => {
    const prompt = buildDayOverviewPrompt(dataSummary)

    expect(prompt).toContain("聚焦今天")
    expect(prompt).toContain('"summary"')
    expect(prompt).toContain('"highlights"')
    expect(prompt).toContain('"risks"')
  })
})
