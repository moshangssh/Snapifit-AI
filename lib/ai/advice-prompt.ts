import type { DailyLog, UserProfile } from "@/lib/types"
import { buildDailyEnergySnapshotPrompt } from "@/lib/ai/daily-energy-prompt"
import { buildProfilePromptSection } from "@/lib/ai/health-profile-prompt"
import { formatDailyStatusForAI } from "@/lib/utils"

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
      ${buildProfilePromptSection({ userProfile, weightKg: currentWeight })}

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
