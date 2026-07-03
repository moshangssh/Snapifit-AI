import { describe, expect, it } from "vitest"
import { buildAdvicePrompt } from "@/lib/ai/advice-prompt"
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
  foodEntries: [
    {
      log_id: "food-1",
      food_name: "鸡胸肉",
      consumed_grams: 150,
      total_nutritional_info_consumed: {
        calories: 248,
        protein: 46,
        carbohydrates: 0,
        fat: 5,
      },
      time_period: "午餐",
    } as unknown as DailyLog["foodEntries"][number],
  ],
  exerciseEntries: [
    {
      log_id: "exercise-1",
      exercise_name: "快走",
      duration_minutes: 40,
      calories_burned_estimated: 180,
    } as unknown as DailyLog["exerciseEntries"][number],
  ],
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

describe("buildAdvicePrompt", () => {
  it("renders the profile section with Chinese labels", () => {
    const prompt = buildAdvicePrompt({ dailyLog, userProfile, now })

    expect(prompt).toContain("- 体重: 72 kg")
    expect(prompt).toContain("- 性别: 男")
    expect(prompt).toContain(
      "- 活动水平（日常状态，不含刻意运动）: 中度活跃（体力劳动）",
    )
    expect(prompt).toContain("- 健康目标: 减重")
  })

  it("prefers the daily log weight over the profile weight", () => {
    const prompt = buildAdvicePrompt({
      dailyLog: { ...dailyLog, weight: 70.5 },
      userProfile,
      now,
    })

    expect(prompt).toContain("- 体重: 70.5 kg")
  })

  it("falls back to raw values for unknown activity level or goal", () => {
    const prompt = buildAdvicePrompt({
      dailyLog,
      userProfile: {
        ...userProfile,
        activityLevel: "custom_level",
        goal: "custom_goal",
      },
      now,
    })

    expect(prompt).toContain("custom_level")
    expect(prompt).toContain("custom_goal")
  })

  it("includes professional-mode details only when professionalMode is on", () => {
    const detailedProfile: UserProfile = {
      ...userProfile,
      notes: "乳糖不耐",
      medicalHistory: "强直性脊柱炎",
      lifestyle: "夜班倒班",
      healthAwareness: "希望稳步减脂",
    }

    const withoutProfessional = buildAdvicePrompt({
      dailyLog,
      userProfile: detailedProfile,
      now,
    })
    expect(withoutProfessional).toContain("- 其他注意事项: 乳糖不耐")
    expect(withoutProfessional).not.toContain("详细医疗信息")

    const withProfessional = buildAdvicePrompt({
      dailyLog,
      userProfile: { ...detailedProfile, professionalMode: true },
      now,
    })
    expect(withProfessional).toContain("详细医疗信息:\n强直性脊柱炎")
    expect(withProfessional).toContain("生活方式信息:\n夜班倒班")
    expect(withProfessional).toContain("健康认知与期望:\n希望稳步减脂")
  })

  it("takes energy figures from the daily energy snapshot", () => {
    const prompt = buildAdvicePrompt({ dailyLog, userProfile, now })

    expect(prompt).toContain("今日维持热量: 2300 kcal")
    expect(prompt).toContain("今日热量预算: 1900 kcal")
    expect(prompt).toContain("热量平衡: -500 kcal")
    expect(prompt).toContain("宏量目标: 蛋白质 130g, 碳水 242g, 脂肪 46g")
    expect(prompt).toContain("AI 代谢提示: 咖啡因")
    expect(prompt).toContain("单日热量平衡只是当天决策估算")
    expect(prompt).not.toContain("净卡路里")
  })

  it("lists food and exercise entries", () => {
    const prompt = buildAdvicePrompt({ dailyLog, userProfile, now })

    expect(prompt).toContain("- 鸡胸肉 (150g): 248 kcal - 午餐")
    expect(prompt).toContain("- 快走 (40分钟): 180 kcal")
  })

  it("mentions daily status only when it is recorded", () => {
    const withoutStatus = buildAdvicePrompt({ dailyLog, userProfile, now })
    expect(withoutStatus).not.toContain("每日状态:")
    expect(withoutStatus).not.toContain("请特别考虑用户的每日状态")

    const withStatus = buildAdvicePrompt({
      dailyLog: {
        ...dailyLog,
        dailyStatus: { stress: 3, mood: 4, health: 5 },
      },
      userProfile,
      now,
    })
    expect(withStatus).toContain("每日状态:")
    expect(withStatus).toContain("压力水平: 3/6")
    expect(withStatus).toContain("请特别考虑用户的每日状态")
  })
})
