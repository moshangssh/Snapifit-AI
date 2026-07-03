import { describe, expect, it } from "vitest"
import {
  buildProfilePromptSection,
  buildProfileSummary,
} from "@/lib/ai/health-profile-prompt"
import type { UserProfile } from "@/lib/types"

const userProfile: UserProfile = {
  weight: 72,
  height: 176,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "lose_weight",
}

const detailedProfile: UserProfile = {
  ...userProfile,
  targetWeight: 68,
  targetCalories: 1900,
  notes: "乳糖不耐",
  medicalHistory: "强直性脊柱炎",
  lifestyle: "夜班倒班",
  healthAwareness: "希望稳步减脂",
}

describe("buildProfilePromptSection", () => {
  it("renders profile bullets with Chinese labels", () => {
    const section = buildProfilePromptSection({ userProfile })

    expect(section).toContain("- 体重: 72 kg")
    expect(section).toContain("- 身高: 176 cm")
    expect(section).toContain("- 性别: 男")
    expect(section).toContain(
      "- 活动水平（日常状态，不含刻意运动）: 中度活跃（体力劳动）",
    )
    expect(section).toContain("- 健康目标: 减重")
    expect(section).not.toContain("目标体重")
    expect(section).not.toContain("其他注意事项")
  })

  it("uses the weight override when provided", () => {
    const section = buildProfilePromptSection({ userProfile, weightKg: 70.5 })

    expect(section).toContain("- 体重: 70.5 kg")
  })

  it("falls back to raw values for unknown activity level or goal", () => {
    const section = buildProfilePromptSection({
      userProfile: {
        ...userProfile,
        activityLevel: "custom_level",
        goal: "custom_goal",
      },
    })

    expect(section).toContain("custom_level")
    expect(section).toContain("custom_goal")
  })

  it("gates professional-mode details behind professionalMode", () => {
    const withoutProfessional = buildProfilePromptSection({
      userProfile: detailedProfile,
    })
    expect(withoutProfessional).toContain("- 目标体重: 68 kg")
    expect(withoutProfessional).toContain("- 目标每日卡路里: 1900 kcal")
    expect(withoutProfessional).toContain("- 其他注意事项: 乳糖不耐")
    expect(withoutProfessional).not.toContain("详细医疗信息")

    const withProfessional = buildProfilePromptSection({
      userProfile: { ...detailedProfile, professionalMode: true },
    })
    expect(withProfessional).toContain("详细医疗信息:\n强直性脊柱炎")
    expect(withProfessional).toContain("生活方式信息:\n夜班倒班")
    expect(withProfessional).toContain("健康认知与期望:\n希望稳步减脂")
  })
})

describe("buildProfileSummary", () => {
  it("returns the structured profile with undefined notes when empty", () => {
    const summary = buildProfileSummary(userProfile)

    expect(summary).toMatchObject({
      age: 30,
      gender: "male",
      height: 176,
      weight: 72,
      activityLevel: "moderate",
      goal: "lose_weight",
    })
    expect(summary.notes).toBeUndefined()
  })

  it("joins notes and professional-mode details with compact labels", () => {
    const summary = buildProfileSummary({
      ...detailedProfile,
      professionalMode: true,
    })

    expect(summary.notes).toContain("乳糖不耐")
    expect(summary.notes).toContain("医疗信息: 强直性脊柱炎")
    expect(summary.notes).toContain("生活方式: 夜班倒班")
    expect(summary.notes).toContain("健康认知: 希望稳步减脂")
  })

  it("omits professional-mode details when professionalMode is off", () => {
    const summary = buildProfileSummary(detailedProfile)

    expect(summary.notes).toBe("乳糖不耐")
  })
})
