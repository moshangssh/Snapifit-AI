import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { AIError, handleAIError } from "@/lib/ai/errors"
import { WorkoutExerciseEnrichSchema } from "@/lib/ai/schemas/workout-exercise-enrich"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      exerciseName,
      completedSets,
      avgWeightKg,
      avgReps,
      effectiveUserWeightKg,
      userGoal,
    } = body

    if (
      !exerciseName ||
      typeof completedSets !== "number" ||
      completedSets <= 0 ||
      typeof effectiveUserWeightKg !== "number" ||
      effectiveUserWeightKg <= 0
    ) {
      throw new AIError("INVALID_INPUT", "Invalid workout exercise input")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const prompt = `
你是运动记录结构化助手。用户在训练计划中替换了一个动作,现在需要为这个真实执行动作补全运动记录分析字段。

只补全衍生字段,不要修改用户事实。

用户事实:
- 动作名: ${exerciseName}
- 完成组数: ${completedSets}
- 平均重量: ${avgWeightKg ?? "unknown"} kg
- 平均次数: ${avgReps ?? "unknown"}
- 用户体重: ${effectiveUserWeightKg} kg
- 用户目标: ${userGoal ?? "unknown"}

返回 JSON:
{
  "exerciseType": "strength",
  "muscleGroups": ["chest", "triceps"],
  "estimatedMets": 6,
  "estimatedDurationMinutes": 10,
  "caloriesBurnedEstimated": 60,
  "isEstimated": true
}
`

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: WorkoutExerciseEnrichSchema,
      mode: "json",
      prompt,
    })

    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
