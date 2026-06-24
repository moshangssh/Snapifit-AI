import { generateObject } from "ai"
import type { FoodEntry } from "@/lib/types"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import { TEFAnalysisSchema } from "@/lib/ai/schemas/tef-analysis"

export async function POST(req: Request) {
  try {
    const { foodEntries } = await req.json()
    if (!foodEntries || !Array.isArray(foodEntries)) {
      throw new AIError("INVALID_INPUT", "Invalid food entries provided")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const mealData = foodEntries.map((entry: FoodEntry) => ({
      food_name: entry.food_name,
      meal_type: entry.meal_type,
      time_period: entry.time_period,
      timestamp: entry.timestamp,
      consumed_grams: entry.consumed_grams,
      macros: {
        protein: entry.total_nutritional_info_consumed?.protein || 0,
        carbs: entry.total_nutritional_info_consumed?.carbohydrates || 0,
        fat: entry.total_nutritional_info_consumed?.fat || 0,
        calories: entry.total_nutritional_info_consumed?.calories || 0,
      },
    }))

    const prompt = `
      作为营养学专家，请分析以下膳食记录，重点关注可作为 AI 代谢提示展示的因素。
      这些因素只用于解释和低置信度提示，不直接增加今日维持热量或今日热量预算。

      膳食记录：
      ${JSON.stringify(mealData, null, 2)}

      请分析以下方面：

      1. **咖啡因摄入分析**：
         - 识别含咖啡因的食物/饮品（咖啡、茶类、巧克力等）
         - 评估摄入时间和可能的持续影响时间
         - 咖啡因可能带来短期低置信度 TEF 变化

      2. **药物和补剂影响**：
         - 识别可能影响代谢的物质（如绿茶提取物、辣椒素、生姜、肉桂、姜黄等）
         - 评估这些物质是否可作为代谢提示展示

      3. **食物特性分析**：
         - 辛辣食物（辣椒、胡椒、生姜等）可能带来短期低置信度 TEF 变化
         - 冷饮加热消耗仅作为解释性提示
         - 代谢增强物质（肉桂、柠檬、MCT油等）

      注意：不要分析高蛋白食物的TEF效果，因为蛋白质的热效应已经在基础计算中考虑了

      4. **时间因素**：
         - 分析各餐的时间间隔
         - TEF效应通常持续3-6小时
         - 考虑叠加效应

      5. **综合评估**：
         - 给出低置信度 TEF 提示乘数估计（1.0-1.3之间）
         - 列出主要影响因素
         - recommendations 只解释谨慎解读方式，不建议用户通过咖啡、辛辣或绿茶提高预算

      请以JSON格式返回分析结果：
      {
        "enhancementMultiplier": 1.15,
        "enhancementFactors": ["咖啡因", "辛辣食物", "代谢增强物质"],
        "detailedAnalysis": {
          "caffeineAnalysis": "检测到咖啡摄入，预计影响3-6小时",
          "spicyFoodAnalysis": "含有辛辣成分，可提高代谢率",
          "coldDrinkAnalysis": "冷饮摄入需要额外热量加热",
          "timingAnalysis": "餐间时间合理，TEF效应可能叠加",
          "medicationAnalysis": "检测到代谢增强物质如肉桂、生姜等"
        },
        "recommendations": [
          "这些因素仅作为 AI 代谢提示展示，不应视为额外可吃额度",
          "今日维持热量和今日热量预算仍以基础消耗、已记录运动和目标设置为准"
        ],
        "confidence": 0.85
      }

      注意：
      - 乘数范围应在1.0-1.3之间
      - 要考虑食物摄入的时间顺序
      - 分析要基于科学证据
      - 如果信息不足，请说明并给出保守估计
      - 不要输出鼓励用户为了提高预算而摄入咖啡、辛辣食物或绿茶的建议
    `

    const { object } = await generateObject({
      model: createAIClient(aiConfig.agentModel),
      schema: TEFAnalysisSchema,
      mode: "json",
      prompt,
    })

    return Response.json({
      ...object,
      analysisTimestamp: new Date().toISOString(),
    })
  } catch (error) {
    return handleAIError(error)
  }
}
