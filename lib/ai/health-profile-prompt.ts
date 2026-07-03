import type { UserProfile } from "@/lib/types"

export const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: "久坐少动（办公室 / 通勤坐车）",
  light: "轻度活跃（站立工作 / 经常走动）",
  moderate: "中度活跃（体力劳动）",
  active: "高度活跃（重体力劳动）",
  very_active: "极重活跃（农忙 / 矿工）",
}

export const GOAL_LABELS: Record<string, string> = {
  lose_weight: "减重",
  maintain: "保持体重",
  gain_weight: "增重",
  build_muscle: "增肌",
  improve_health: "改善健康",
}

export function formatGenderLabel(gender: UserProfile["gender"]): string {
  return gender === "male" ? "男" : gender === "female" ? "女" : "其他"
}

function buildNotesContent(
  userProfile: UserProfile,
  labels: { medical: string; lifestyle: string; awareness: string },
): string {
  return [
    userProfile.notes,
    userProfile.professionalMode && userProfile.medicalHistory
      ? `\n\n${labels.medical}${userProfile.medicalHistory}`
      : "",
    userProfile.professionalMode && userProfile.lifestyle
      ? `\n\n${labels.lifestyle}${userProfile.lifestyle}`
      : "",
    userProfile.professionalMode && userProfile.healthAwareness
      ? `\n\n${labels.awareness}${userProfile.healthAwareness}`
      : "",
  ]
    .filter(Boolean)
    .join("")
}

/**
 * 用户资料的中文 bullet 段,供对话式 prompt(advice / chat)嵌入。
 * weightKg 允许调用方用当日体重覆盖 profile 体重。
 */
export function buildProfilePromptSection(input: {
  userProfile: UserProfile
  weightKg?: number
}): string {
  const { userProfile } = input
  const weight = input.weightKg ?? userProfile.weight

  const lines = [
    `- 体重: ${weight ?? "未知"} kg`,
    `- 身高: ${userProfile.height ?? "未知"} cm`,
    `- 年龄: ${userProfile.age ?? "未知"} 岁`,
    `- 性别: ${formatGenderLabel(userProfile.gender)}`,
    `- 活动水平（日常状态，不含刻意运动）: ${
      ACTIVITY_LEVEL_LABELS[userProfile.activityLevel] ||
      userProfile.activityLevel ||
      "未知"
    }`,
    `- 健康目标: ${GOAL_LABELS[userProfile.goal] || userProfile.goal || "未知"}`,
  ]

  if (userProfile.targetWeight) {
    lines.push(`- 目标体重: ${userProfile.targetWeight} kg`)
  }
  if (userProfile.targetCalories) {
    lines.push(`- 目标每日卡路里: ${userProfile.targetCalories} kcal`)
  }

  const notesContent = buildNotesContent(userProfile, {
    medical: "详细医疗信息:\n",
    lifestyle: "生活方式信息:\n",
    awareness: "健康认知与期望:\n",
  })
  if (notesContent) {
    lines.push(`- 其他注意事项: ${notesContent}`)
  }

  return lines.join("\n")
}

/**
 * 用户资料的 JSON 对象形态,供结构化分析 prompt(smart-suggestions / period)
 * 直接 JSON.stringify 嵌入。
 */
export function buildProfileSummary(userProfile: UserProfile): {
  age: UserProfile["age"]
  gender: UserProfile["gender"]
  height: UserProfile["height"]
  weight: UserProfile["weight"]
  activityLevel: UserProfile["activityLevel"]
  goal: UserProfile["goal"]
  targetWeight: UserProfile["targetWeight"]
  targetCalories: UserProfile["targetCalories"]
  notes: string | undefined
} {
  return {
    age: userProfile.age,
    gender: userProfile.gender,
    height: userProfile.height,
    weight: userProfile.weight,
    activityLevel: userProfile.activityLevel,
    goal: userProfile.goal,
    targetWeight: userProfile.targetWeight,
    targetCalories: userProfile.targetCalories,
    notes:
      buildNotesContent(userProfile, {
        medical: "医疗信息: ",
        lifestyle: "生活方式: ",
        awareness: "健康认知: ",
      }) || undefined,
  }
}
