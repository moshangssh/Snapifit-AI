import { describe, expect, it } from "vitest"
import { buildChatSystemPrompt } from "@/lib/ai/chat-system-prompt"
import type { DailyLog, UserProfile } from "@/lib/types"

const userProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "lose_weight",
}

const healthData: DailyLog = {
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
    enhancementFactors: ["咖啡因"],
    analysisTimestamp: "2026-06-24T04:00:00.000Z",
  },
}

const now = new Date("2026-06-24T12:00:00.000Z")

describe("buildChatSystemPrompt", () => {
  it("returns only the base prompt when no health context is provided", () => {
    const prompt = buildChatSystemPrompt({ now })

    expect(prompt).toContain("你是SnapFit AI健康助手")
    expect(prompt).not.toContain("用户资料")
    expect(prompt).not.toContain("[MEMORY_UPDATE_REQUEST]")
  })

  it("prefers the custom system prompt as the base", () => {
    const prompt = buildChatSystemPrompt({
      customSystemPrompt: "你是营养师小助手",
      userProfile,
      now,
    })

    expect(prompt).toContain("你是营养师小助手")
    expect(prompt).not.toContain("你是SnapFit AI健康助手")
  })

  it("embeds the shared profile section and the daily energy snapshot", () => {
    const prompt = buildChatSystemPrompt({ userProfile, healthData, now })

    expect(prompt).toContain("- 体重: 72 kg")
    expect(prompt).toContain("- 健康目标: 减重")
    expect(prompt).toContain("今日维持热量: 2300 kcal")
    expect(prompt).toContain("今日热量预算: 1900 kcal")
    expect(prompt).toContain("热量平衡: -500 kcal")
    expect(prompt).toContain("AI 代谢提示: 咖啡因")
    expect(prompt).not.toContain("净卡路里")
  })

  it("summarizes historical trends excluding today", () => {
    const yesterday: DailyLog = {
      ...healthData,
      date: "2026-06-23",
      foodEntries: [
        {
          food_name: "燕麦",
          consumed_grams: 60,
          total_nutritional_info_consumed: {
            calories: 220,
            protein: 8,
            carbohydrates: 40,
            fat: 4,
          },
        } as unknown as DailyLog["foodEntries"][number],
      ],
    }

    const prompt = buildChatSystemPrompt({
      userProfile,
      healthData,
      recentHealthData: [healthData, yesterday],
      now,
    })

    expect(prompt).toContain("历史健康数据趋势 (最近1天)")
    expect(prompt).toContain("昨天 (2026-06-23)")
    expect(prompt).toContain("主要食物: 燕麦(60g)")
  })

  it("renders multi-expert team memory with expert names", () => {
    const prompt = buildChatSystemPrompt({
      userProfile,
      now,
      aiMemory: {
        nutrition: {
          content: "用户乳糖不耐",
          lastUpdated: "2026-06-20T08:00:00.000Z",
          version: 3,
        },
        fitness: { content: "" },
      },
    })

    expect(prompt).toContain("团队记忆")
    expect(prompt).toContain("【营养师的记忆】")
    expect(prompt).toContain("用户乳糖不耐")
    expect(prompt).not.toContain("【健身教练的记忆】")
  })

  it("names memories for every real chat expert id (regression: exercise 曾渲染成裸 id)", () => {
    const prompt = buildChatSystemPrompt({
      userProfile,
      now,
      aiMemory: {
        exercise: { content: "深蹲膝盖不适,改箱式深蹲" },
        metabolism: { content: "咖啡因敏感" },
        timing: { content: "夜班倒班作息" },
      },
    })

    expect(prompt).toContain("【运动专家的记忆】")
    expect(prompt).toContain("【代谢专家的记忆】")
    expect(prompt).toContain("【时机专家的记忆】")
    expect(prompt).not.toContain("【exercise的记忆】")
  })

  it("renders single-expert memory for backward compatibility", () => {
    const prompt = buildChatSystemPrompt({
      userProfile,
      now,
      aiMemory: { content: "用户偏好晨练", version: 2 },
    })

    expect(prompt).toContain("我的记忆")
    expect(prompt).toContain("用户偏好晨练")
    expect(prompt).toContain("记忆版本: 2")
  })

  it("signs off with the expert role identity", () => {
    const prompt = buildChatSystemPrompt({
      userProfile,
      expertRole: { name: "运动教练", description: "运动处方设计" },
      now,
    })

    expect(prompt).toContain("以运动教练的身份")
    expect(prompt).toContain("专业领域: 运动处方设计")
    expect(prompt).toContain("[MEMORY_UPDATE_REQUEST]")
  })
})
