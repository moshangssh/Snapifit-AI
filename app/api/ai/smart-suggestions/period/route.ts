import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { AIError, handleAIError } from "@/lib/ai/errors"
import { PeriodSmartAnalysisResponseSchema } from "@/lib/ai/schemas/smart-suggestions"
import type { PeriodAnalysisSummary } from "@/lib/smart-analysis-period"
import type { UserProfile } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const { summary, userProfile } = (await req.json()) as {
      summary?: PeriodAnalysisSummary
      userProfile?: UserProfile
    }

    if (!summary || !userProfile) {
      throw new AIError("INVALID_INPUT", "Missing required period analysis data")
    }
    if (summary.dataDays < summary.minDataDays) {
      throw new AIError("INVALID_INPUT", "Not enough data for period analysis")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const periodLabel = summary.range === "7d" ? "7天复盘" : "30天趋势"
    const prompt = `
      你是一位专业健康管理顾问,正在生成${periodLabel}。

      用户资料:
      ${JSON.stringify(
        {
          age: userProfile.age,
          gender: userProfile.gender,
          height: userProfile.height,
          weight: userProfile.weight,
          activityLevel: userProfile.activityLevel,
          goal: userProfile.goal,
          targetWeight: userProfile.targetWeight,
          targetCalories: userProfile.targetCalories,
          notes:
            [
              userProfile.notes,
              userProfile.professionalMode && userProfile.medicalHistory
                ? `医疗信息: ${userProfile.medicalHistory}`
                : "",
              userProfile.professionalMode && userProfile.lifestyle
                ? `生活方式: ${userProfile.lifestyle}`
                : "",
              userProfile.professionalMode && userProfile.healthAwareness
                ? `健康认知: ${userProfile.healthAwareness}`
                : "",
            ]
              .filter(Boolean)
              .join("\\n") || undefined,
        },
        null,
        2,
      )}

      周期数据摘要:
      ${JSON.stringify(summary, null, 2)}

      分析要求:
      1. 不要把单日波动夸大成趋势,只基于已有 ${summary.dataDays} 天真实记录判断。
      2. ${summary.range === "7d" ? "重点输出下周最该执行的纠偏动作。" : "重点判断长期趋势、执行稳定性和下阶段策略。"}
      3. 明确区分已经做得好的地方、主要风险和下一步行动。
      4. 建议必须具体、可执行、可量化,避免泛泛而谈。
      5. 使用中文,允许在 description 中使用简短 Markdown。

      返回 JSON:
      {
        "summary": "120字以内的周期总评",
        "highlights": ["亮点1", "亮点2", "亮点3"],
        "risks": ["风险1", "风险2"],
        "suggestions": [
          {
            "key": "nutrition",
            "category": "周期营养复盘",
            "priority": "high|medium|low",
            "summary": "该方向的简短判断",
            "suggestions": [
              {
                "title": "具体行动标题",
                "description": "执行方法、数量或频率、触发条件",
                "actionable": true,
                "icon": "🥗"
              }
            ]
          }
        ]
      }
    `

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: PeriodSmartAnalysisResponseSchema,
      mode: "json",
      prompt,
    })

    return Response.json({
      ...object,
      range: summary.range,
      startDate: summary.startDate,
      endDate: summary.endDate,
      dataDays: summary.dataDays,
      minDataDays: summary.minDataDays,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return handleAIError(error)
  }
}
