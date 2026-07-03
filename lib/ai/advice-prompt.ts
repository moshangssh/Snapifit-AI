import type { DailyLog, UserProfile } from "@/lib/types"
import { buildDailyEnergySnapshotPrompt } from "@/lib/ai/daily-energy-prompt"
import { formatDailyStatusForAI } from "@/lib/utils"

const ACTIVITY_LEVEL_LABELS: Record<string, string> = {
  sedentary: "久坐少动（办公室 / 通勤坐车）",
  light: "轻度活跃（站立工作 / 经常走动）",
  moderate: "中度活跃（体力劳动）",
  active: "高度活跃（重体力劳动）",
  very_active: "极重活跃（农忙 / 矿工）",
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "减重",
  maintain: "保持体重",
  gain_weight: "增重",
  build_muscle: "增肌",
  improve_health: "改善健康",
}

function buildNotesSection(userProfile: UserProfile): string {
  const notesContent = [
    userProfile.notes,
    userProfile.professionalMode && userProfile.medicalHistory
      ? `\n\n详细医疗信息:\n${userProfile.medicalHistory}`
      : "",
    userProfile.professionalMode && userProfile.lifestyle
      ? `\n\n生活方式信息:\n${userProfile.lifestyle}`
      : "",
    userProfile.professionalMode && userProfile.healthAwareness
      ? `\n\n健康认知与期望:\n${userProfile.healthAwareness}`
      : "",
  ]
    .filter(Boolean)
    .join("")
  return notesContent ? `- 其他注意事项: ${notesContent}` : ""
}

export function buildAdvicePrompt(input: {
  dailyLog: DailyLog
  userProfile: UserProfile
  now: Date
}): string {
  const { dailyLog, userProfile, now } = input

  const currentWeight =
    dailyLog.weight && dailyLog.weight > 0 ? dailyLog.weight : userProfile.weight

  return `
      你是一个专业的健康顾问，请根据用户的健康数据提供个性化的建议。

      用户资料:
      - 体重: ${currentWeight} kg
      - 身高: ${userProfile.height} cm
      - 年龄: ${userProfile.age} 岁
      - 性别: ${
        userProfile.gender === "male"
          ? "男"
          : userProfile.gender === "female"
          ? "女"
          : "其他"
      }
      - 活动水平（日常状态，不含刻意运动）: ${
        ACTIVITY_LEVEL_LABELS[userProfile.activityLevel] || userProfile.activityLevel
      }
      - 健康目标: ${GOAL_LABELS[userProfile.goal] || userProfile.goal}
      ${userProfile.targetWeight ? `- 目标体重: ${userProfile.targetWeight} kg` : ""}
      ${userProfile.targetCalories ? `- 目标每日卡路里: ${userProfile.targetCalories} kcal` : ""}
      ${buildNotesSection(userProfile)}

      今日健康数据 (${dailyLog.date}):
      ${buildDailyEnergySnapshotPrompt({
        log: dailyLog,
        userProfile,
        now,
      })}

      食物记录:
      ${dailyLog.foodEntries
        .map(
          (entry) =>
            `- ${entry.food_name} (${entry.consumed_grams}g): ${entry.total_nutritional_info_consumed.calories.toFixed(
              0,
            )} kcal${entry.time_period ? ` - ${entry.time_period}` : ""}`,
        )
        .join("\n")}

      运动记录:
      ${dailyLog.exerciseEntries
        .map(
          (entry) =>
            `- ${entry.exercise_name} (${entry.duration_minutes}分钟): ${entry.calories_burned_estimated.toFixed(
              0,
            )} kcal`,
        )
        .join("\n")}

      ${
        dailyLog.dailyStatus
          ? `每日状态:\n${formatDailyStatusForAI(dailyLog.dailyStatus)}\n`
          : ""
      }

      请提供个性化、可操作的健康建议，包括饮食和运动方面的具体建议。建议应该是积极、鼓励性的，并且与用户的健康目标相符。
      ${
        dailyLog.dailyStatus
          ? "请特别考虑用户的每日状态（压力、心情、健康状况、睡眠质量）对建议的影响。"
          : ""
      }
      请用中文回答，不超过300字，不需要分段，直接给出建议内容。
    `
}
