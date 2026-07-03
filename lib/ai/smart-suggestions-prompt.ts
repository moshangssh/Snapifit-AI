import type { DailyLog, UserProfile } from "@/lib/types"
import { buildDailyEnergySnapshot } from "@/lib/daily-energy-snapshot"
import { buildProfileSummary } from "@/lib/ai/health-profile-prompt"
import { formatDailyStatusForAI } from "@/lib/utils"

export interface SmartSuggestionsDataSummary {
  energyModel: { note: string; formula: string }
  today: Record<string, unknown>
  profile: Record<string, unknown>
  recent: Array<Record<string, unknown>>
}

/**
 * 结构化分析用的数据摘要。今日能量数字一律取自 buildDailyEnergySnapshot,
 * 与首页/advice/chat 共用同一份口径与回退链(ADR-0010)。
 */
export function buildSmartSuggestionsDataSummary(input: {
  dailyLog: DailyLog
  userProfile: UserProfile
  recentLogs?: DailyLog[]
  now: Date
}): SmartSuggestionsDataSummary {
  const { dailyLog, userProfile, recentLogs, now } = input

  const snapshot = buildDailyEnergySnapshot({ log: dailyLog, userProfile, now })
  const baselineKnown = snapshot.state !== "missing-config"

  return {
    energyModel: {
      note: "能量平衡口径采用 NEAT 动态法。PAL 乘数仅覆盖 NEAT+TEF,不含刻意运动;运动消耗单独计入。",
      formula:
        "今日总消耗 = 基础消耗 + 当日运动消耗;热量差额 = 摄入 − 今日总消耗 (负数为缺口)",
    },
    today: {
      date: dailyLog.date,
      calories: dailyLog.summary?.totalCaloriesConsumed ?? 0,
      protein: dailyLog.summary?.macros?.protein ?? 0,
      carbs: dailyLog.summary?.macros?.carbs ?? 0,
      fat: dailyLog.summary?.macros?.fat ?? 0,
      exercise: snapshot.recordedExerciseCalories,
      weight: dailyLog.weight,
      bmr: dailyLog.calculatedBMR,
      baselineExpenditure: baselineKnown ? snapshot.baselineExpenditure : null,
      dailyTotalExpenditure: baselineKnown ? snapshot.maintenanceCalories : null,
      tefAnalysis: dailyLog.tefAnalysis,
      foodEntries: dailyLog.foodEntries.map((entry) => ({
        name: entry.food_name,
        mealType: entry.meal_type,
        calories: entry.total_nutritional_info_consumed?.calories || 0,
        protein: entry.total_nutritional_info_consumed?.protein || 0,
        timestamp: entry.timestamp,
      })),
      exerciseEntries: dailyLog.exerciseEntries.map((entry) => ({
        name: entry.exercise_name,
        calories: entry.calories_burned_estimated ?? 0,
        duration: entry.duration_minutes,
      })),
      dailyStatus: formatDailyStatusForAI(dailyLog.dailyStatus),
    },
    profile: buildProfileSummary(userProfile),
    recent: recentLogs
      ? recentLogs.slice(0, 7).map((log) => ({
          date: log.date,
          calories: log.summary?.totalCaloriesConsumed ?? 0,
          exercise: log.summary?.totalCaloriesBurned ?? 0,
          weight: log.weight,
          foodNames: log.foodEntries
            .map((entry) => entry.food_name)
            .slice(0, 5),
          exerciseNames: log.exerciseEntries
            .map((entry) => entry.exercise_name)
            .slice(0, 3),
          dailyStatus: formatDailyStatusForAI(log.dailyStatus),
        }))
      : [],
  }
}

/** 6 路分类「专家」建议 prompt,key 即分类标识。 */
export function buildCategorySuggestionPrompts(
  dataSummary: SmartSuggestionsDataSummary,
): Record<string, string> {
  const data = JSON.stringify(dataSummary, null, 2)

  return {
    nutrition: `
        你是一位注册营养师(RD)，专精宏量营养素配比和膳食结构优化。

        数据：${data}

        专业分析要点：
        1. 宏量营养素配比评估（蛋白质15-25%，脂肪20-35%，碳水45-65%）
        2. 热量平衡与目标匹配度
        3. 食物选择的营养密度分析
        4. 微量营养素潜在缺口识别
        5. 每日状态对营养需求的影响（压力、心情、健康状况、睡眠质量）

        请提供3-4个具体的营养优化建议，每个建议需包含：
        - 明确的营养学依据
        - 具体的食物替换或添加方案
        - 量化的改进目标

        JSON格式：
        {
          "category": "营养配比优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "具体建议标题",
              "description": "基于营养学原理的详细说明和执行方案",
              "actionable": true,
              "icon": "🥗"
            }
          ],
          "summary": "营养状况专业评价"
        }
      `,

    exercise: `
        你是一位认证的运动生理学家，专精运动处方设计和能量代谢优化。

        数据：${data}

        专业分析要点：
        1. 运动量与今日总消耗目标的匹配度评估(总消耗 = 基线 + 运动)
        2. 有氧vs无氧运动配比优化（基于用户目标）
        3. 运动时机与代谢窗口利用
        4. 运动强度区间建议（基于心率储备）
        5. 每日状态对运动能力的影响（压力水平、心情状态、健康状况、睡眠质量）

        请提供2-3个基于运动科学的训练优化建议：
        - 具体的运动类型、强度、时长
        - 运动时机与营养配合策略
        - 渐进式训练计划

        JSON格式：
        {
          "category": "运动处方优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "具体运动方案",
              "description": "基于运动生理学的详细训练计划",
              "actionable": true,
              "icon": "🏃‍♂️"
            }
          ],
          "summary": "运动效能专业评价"
        }
      `,

    metabolism: `
        你是一位内分泌代谢专家，专精能量代谢调节和体重管理的生理机制。

        数据：${data}

        专业分析要点：
        1. 基础代谢率与实际消耗的匹配度
        2. TEF优化策略（基于食物热效应数据）
        3. 代谢适应性评估（基于体重变化趋势）
        4. 胰岛素敏感性和代谢灵活性指标

        请提供2-3个基于代谢生理学的优化建议：
        - 进餐时机与代谢节律同步
        - 宏量营养素时序分配
        - 代谢率提升的具体策略

        JSON格式：
        {
          "category": "代谢调节优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "代谢优化方案",
              "description": "基于内分泌生理学的详细调节策略",
              "actionable": true,
              "icon": "🔥"
            }
          ],
          "summary": "代谢效率专业评价"
        }
      `,

    behavior: `
        你是一位行为心理学专家，专精健康行为改变和习惯养成的科学方法。

        数据：${data}

        专业分析要点：
        1. 饮食行为模式识别（基于进餐时间和频率）
        2. 行为一致性评估（基于7天数据趋势）
        3. 习惯形成的关键触发点分析
        4. 行为改变的阻力因素识别
        5. 心理状态对行为的影响（压力、心情对饮食和运动习惯的影响）

        请提供2-3个基于行为科学的习惯优化建议：
        - 具体的行为改变策略（基于行为链分析）
        - 环境设计和提示系统
        - 渐进式习惯建立计划

        JSON格式：
        {
          "category": "行为习惯优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "行为改变方案",
              "description": "基于行为心理学的详细习惯养成策略",
              "actionable": true,
              "icon": "🧠"
            }
          ],
          "summary": "行为模式专业评价"
        }
      `,

    timing: `
        你是一位时间营养学专家，专精生物节律与营养时机的优化策略。

        数据：${data}

        专业分析要点：
        1. 进餐时机与昼夜节律的同步性
        2. 运动时机与代谢窗口的匹配
        3. 营养素时序分配的优化空间
        4. 睡眠-代谢-营养的协调性
        5. 睡眠时间和质量对时机安排的影响（基于睡眠数据优化作息）

        请提供2-3个基于时间生物学的时机优化建议：
        - 最佳进餐和运动时间窗口
        - 营养素的时序化摄入策略
        - 生物节律同步的具体方法

        JSON格式：
        {
          "category": "时机优化策略",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "时机优化方案",
              "description": "基于时间营养学的详细时序安排",
              "actionable": true,
              "icon": "⏰"
            }
          ],
          "summary": "时机协调专业评价"
        }
      `,

    wellness: `
        你是一位整体健康专家，专精压力管理、睡眠优化和心理健康的综合调节。

        数据：${data}

        专业分析要点：
        1. 压力水平对代谢和食欲的影响评估
        2. 心情状态与饮食行为的关联分析
        3. 睡眠质量对恢复和代谖的影响
        4. 整体健康状况的综合评价
        5. 压力-睡眠-营养-运动的协调优化

        请提供2-3个基于整体健康的优化建议：
        - 压力管理和情绪调节策略
        - 睡眠质量改善方案
        - 心理健康与身体健康的协调方法

        JSON格式：
        {
          "category": "整体健康优化",
          "priority": "high|medium|low",
          "suggestions": [
            {
              "title": "整体健康方案",
              "description": "基于心理生理学的综合健康优化策略",
              "actionable": true,
              "icon": "🌟"
            }
          ],
          "summary": "整体健康状况专业评价"
        }
      `,
  }
}

/** 今日整体总评 prompt,聚焦今天的事实层总评与当下可调整项。 */
export function buildDayOverviewPrompt(
  dataSummary: SmartSuggestionsDataSummary,
): string {
  return `
      你是一位健康教练,负责对用户今日的饮食、运动和身体状态做事实层的整体总评。

      数据:${JSON.stringify(dataSummary, null, 2)}

      分析要求:
      1. 聚焦今天发生了什么,可以立刻调整什么,不要做"下周/下阶段"这种宏观策略
      2. summary 在 80 字以内,描述今日整体表现 + 接下来几小时可调整的一两件事
      3. highlights 是今日做对的事实(已记录的项目、达标的指标、完成的行为),2-3 条短句,每条 ≤ 20 字
      4. risks 是今日值得注意的短期问题(单日的数值偏差、行为偏差),2-3 条短句,每条 ≤ 20 字
      5. 与具体执行建议错开,综述只做事实总评和当下提醒,不重复 6 个分类里的"做什么"细节
      6. 使用中文,不要 Markdown

      返回 JSON:
      {
        "summary": "今日整体表现 + 当下可调整的事(80 字以内)",
        "highlights": ["今日做对的事实 1", "今日做对的事实 2"],
        "risks": ["今日要注意的偏差 1", "今日要注意的偏差 2"]
      }
    `
}
