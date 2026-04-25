import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { AIError, handleAIError } from "@/lib/ai/errors"
import { WorkoutPlanSchema } from "@/lib/ai/schemas/workout-plan"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      effectiveUserWeightKg,
      userProfile,
      recentWorkoutSessionSummaries,
      recentExerciseEntries,
      fatigueSnapshot,
    } = body

    if (!effectiveUserWeightKg || !userProfile || !fatigueSnapshot) {
      throw new AIError("INVALID_INPUT", "Invalid workout plan input")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const prompt = `
你是 SnapFit AI 的力量训练计划教练。请基于用户资料、本地历史训练、最近运动记录和肌肉疲劳快照,生成一份单次力量训练计划。

硬性要求:
- 只返回 JSON
- 只生成单次训练计划,不要生成周计划
- 每个动作必须包含组级计划值
- 每个动作必须同时返回 plannedAnalysis,用于训练完成后写入运动记录
- plannedAnalysis.muscleGroups 必须从以下固定英文枚举中选择(不要用中文):
    chest, abs, obliques, upper-back, lower-back,
    front-deltoids, back-deltoids, biceps, triceps, forearms,
    quadriceps, hamstrings, glutes, calves
  仅列主要肌群(1-3 个),不列次要协同肌。纯有氧返回空数组。
- fatigueSnapshot 是软约束:高疲劳肌群应减少训练量或避开,但不是绝对禁止
- 如果历史不足,生成保守的全身基础训练

用户体重: ${effectiveUserWeightKg} kg
用户资料:
${JSON.stringify(userProfile, null, 2)}

最近训练 session 摘要:
${JSON.stringify(recentWorkoutSessionSummaries ?? [], null, 2)}

最近 exerciseEntries:
${JSON.stringify(recentExerciseEntries ?? [], null, 2)}

肌肉疲劳快照:
${JSON.stringify(fatigueSnapshot, null, 2)}

输出结构:
{
  "exercises": [
    {
      "plannedExerciseName": "卧推",
      "notes": "保持肩胛稳定",
      "sets": [
        { "plannedWeightKg": 60, "plannedReps": 8 }
      ],
      "plannedAnalysis": {
        "exerciseType": "strength",
        "muscleGroups": ["chest", "triceps"],
        "estimatedMets": 6,
        "estimatedDurationMinutes": 12,
        "caloriesBurnedEstimated": 86,
        "isEstimated": true
      }
    }
  ]
}
`

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: WorkoutPlanSchema,
      mode: "json",
      prompt,
    })

    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
