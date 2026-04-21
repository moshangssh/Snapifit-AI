import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { FoodParseSchema, ExerciseParseSchema } from "@/lib/ai/schemas/parse"

export async function POST(req: Request) {
  try {
    const { text, type, userWeight } = await req.json()
    if (!text) throw new AIError("INVALID_INPUT", "No text provided")
    if (type !== "food" && type !== "exercise") {
      throw new AIError("INVALID_INPUT", "Invalid type")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const model = createAIClient(aiConfig.agentModel)

    if (type === "food") {
      const prompt = `
        请分析以下文本中描述的食物，并将其转换为结构化的 JSON 格式。
        文本: "${text}"

        请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

        每个食物项应包含以下字段:
        - log_id: 唯一标识符
        - food_name: 食物名称
        - consumed_grams: 消耗的克数
        - meal_type: 餐次类型 (breakfast, lunch, dinner, snack)
        - time_period: 时间段 (morning, noon, afternoon, evening)，根据文本内容推断
        - nutritional_info_per_100g: 每100克的营养成分，包括 calories, carbohydrates, protein, fat 等
        - total_nutritional_info_consumed: 基于消耗克数计算的总营养成分
        - is_estimated: 是否为估算值

        示例输出格式:
        {
          "food": [
            {
              "log_id": "uuid",
              "food_name": "全麦面包",
              "consumed_grams": 80,
              "meal_type": "breakfast",
              "time_period": "morning",
              "nutritional_info_per_100g": {
                "calories": 265,
                "carbohydrates": 48.5,
                "protein": 9.0,
                "fat": 3.2,
                "fiber": 7.4
              },
              "total_nutritional_info_consumed": {
                "calories": 212,
                "carbohydrates": 38.8,
                "protein": 7.2,
                "fat": 2.56,
                "fiber": 5.92
              },
              "is_estimated": true
            }
          ]
        }
      `

      const { object } = await generateObject({
        model,
        schema: FoodParseSchema,
        mode: "json",
        prompt,
      })
      return Response.json(object)
    }

    // type === "exercise"
    const prompt = `
      请分析以下文本中描述的运动，并将其转换为结构化的 JSON 格式。
      文本: "${text}"
      用户体重: ${userWeight || 70} kg

      请直接输出 JSON，不要有额外文本。如果无法确定数值，请给出合理估算，并在相应字段标记 is_estimated: true。

      每个运动项应包含以下字段:
      - log_id: 唯一标识符
      - exercise_name: 运动名称
      - exercise_type: 运动类型 (cardio, strength, flexibility, other)
      - duration_minutes: 持续时间(分钟)
      - distance_km: 距离(公里，仅适用于有氧运动)
      - sets: 组数(仅适用于力量训练)
      - reps: 次数(仅适用于力量训练)
      - weight_kg: 重量(公斤，仅适用于力量训练)
      - estimated_mets: 代谢当量(MET值)
      - user_weight: 用户体重(公斤)
      - calories_burned_estimated: 估算的卡路里消耗
      - muscle_groups: 锻炼的主要肌肉群,必须从以下固定英文枚举中选择(不要用中文):
          chest, abs, obliques, upper-back, lower-back,
          front-deltoids, back-deltoids, biceps, triceps, forearms,
          quadriceps, hamstrings, glutes, calves
        仅列主要肌群(1-3 个),不列次要协同肌。纯有氧(跑步、骑行)返回空数组。
      - is_estimated: 是否为估算值

      示例输出格式:
      {
        "exercise": [
          {
            "log_id": "uuid",
            "exercise_name": "跑步",
            "exercise_type": "cardio",
            "duration_minutes": 30,
            "distance_km": 5,
            "estimated_mets": 8.3,
            "user_weight": 70,
            "calories_burned_estimated": 290.5,
            "muscle_groups": ["quadriceps", "glutes"],
            "is_estimated": true
          }
        ]
      }
    `

    const { object } = await generateObject({
      model,
      schema: ExerciseParseSchema,
      mode: "json",
      prompt,
    })
    return Response.json(object)
  } catch (error) {
    return handleAIError(error)
  }
}
