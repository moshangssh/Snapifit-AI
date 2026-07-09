import type { DailyLog, UserProfile } from "@/lib/types"
import { buildDailyEnergySnapshotPrompt } from "@/lib/ai/daily-energy-prompt"
import { expertDisplayName } from "@/lib/ai/experts"
import { buildProfilePromptSection } from "@/lib/ai/health-profile-prompt"
import { formatDailyStatusForAI } from "@/lib/utils"

export interface ChatExpertRole {
  id?: string
  name?: string
  title?: string
  description?: string
}

export interface ChatExpertMemory {
  content?: string
  lastUpdated?: string
  version?: number
}

export type ChatAIMemory = ChatExpertMemory | Record<string, ChatExpertMemory>

const DEFAULT_SYSTEM_PROMPT =
  "你是SnapFit AI健康助手，一个专业的健康管理AI。你可以基于用户的健康数据提供个性化的建议，包括营养、运动、生活方式等各个方面。请用专业但易懂的语言回答用户问题。"

function buildMemorySection(aiMemory: ChatAIMemory): string {
  if (typeof aiMemory === "object" && !("content" in aiMemory && aiMemory.content)) {
    // 处理多个专家的记忆
    const memories = Object.entries(aiMemory as Record<string, ChatExpertMemory>).filter(
      ([, memory]) => memory?.content,
    )
    if (memories.length === 0) {
      return ""
    }

    return `

        团队记忆 (各专家关于用户的重要信息):
        ${memories
          .map(([expertId, memory]) => {
            const expertName = expertDisplayName(expertId)
            const updateTime = memory.lastUpdated
              ? new Date(memory.lastUpdated).toLocaleString("zh-CN")
              : "未知"
            const version = memory.version || 1
            return `
        【${expertName}的记忆】
        ${memory.content}
        (更新时间: ${updateTime}, 版本: ${version})`
          })
          .join("\n")}

        注意:
        1. 你可以查看所有专家的记忆来提供更全面的建议
        2. 但你只能更新自己专业领域的记忆
        3. 如果本次对话中有重要的新信息需要记住，可以在回答末尾提出更新记忆的请求

        记忆更新格式要求:
        - 记忆内容必须极度精简，不超过500字
        - 只记录核心事实，避免冗余描述
        - 不能包含特殊符号，使用简洁的中文表达
        - 避免复杂句式
        `
  }

  const memory = aiMemory as ChatExpertMemory
  if (!memory.content) {
    return ""
  }

  // 处理单个专家的记忆（向后兼容）
  return `

        我的记忆 (关于用户的重要信息):
        ${memory.content}

        记忆更新时间: ${memory.lastUpdated ? new Date(memory.lastUpdated).toLocaleString("zh-CN") : "未知"}
        记忆版本: ${memory.version || 1}

        注意: 请基于这些记忆信息提供更个性化的建议。如果本次对话中有重要的新信息需要记住，可以在回答末尾提出更新记忆的请求。

        记忆更新格式要求:
        - 记忆内容必须极度精简，不超过500字
        - 只记录核心事实，避免冗余描述
        - 不能包含特殊符号，使用简洁的中文表达
        - 避免复杂句式
        `
}

export function buildChatSystemPrompt(input: {
  userProfile?: UserProfile
  healthData?: DailyLog
  recentHealthData?: DailyLog[]
  customSystemPrompt?: string
  expertRole?: ChatExpertRole
  aiMemory?: ChatAIMemory
  now: Date
}): string {
  const {
    userProfile,
    healthData,
    recentHealthData,
    customSystemPrompt,
    expertRole,
    aiMemory,
    now,
  } = input

  let systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT

  const hasHealthContext =
    userProfile || healthData || (recentHealthData && recentHealthData.length > 0)
  if (!hasHealthContext) {
    return systemPrompt
  }

  if (userProfile) {
    systemPrompt += `

        用户资料:
        ${buildProfilePromptSection({ userProfile })}
        `
  }

  if (healthData && userProfile) {
    systemPrompt += `

        今日健康数据:
        ${buildDailyEnergySnapshotPrompt({
          log: healthData,
          userProfile,
          now,
        })}
        - 食物记录数: ${healthData.foodEntries?.length || 0} 条
        - 运动记录数: ${healthData.exerciseEntries?.length || 0} 条
        ${healthData.dailyStatus ? `
        - 每日状态: ${formatDailyStatusForAI(healthData.dailyStatus)}
        ` : ""}
        `
  }

  if (healthData && healthData.foodEntries.length > 0) {
    systemPrompt += `
        今日食物记录:
        ${healthData.foodEntries.map(entry => {
          const nutrition = entry.total_nutritional_info_consumed;
          return `- ${entry.food_name} (${entry.consumed_grams}g): ${nutrition?.calories?.toFixed(0) || 0} kcal
          蛋白质: ${nutrition?.protein?.toFixed(1) || 0}g, 碳水: ${nutrition?.carbohydrates?.toFixed(1) || 0}g, 脂肪: ${nutrition?.fat?.toFixed(1) || 0}g
          ${entry.meal_type ? `餐次: ${entry.meal_type}` : ""}${entry.time_period ? `, 时间: ${entry.time_period}` : ""}${entry.timestamp ? `, 记录时间: ${new Date(entry.timestamp).toLocaleTimeString('zh-CN')}` : ""}`
        }).join('\n')}
        `
  }

  if (healthData && healthData.exerciseEntries.length > 0) {
    systemPrompt += `
        今日运动记录:
        ${healthData.exerciseEntries.map(entry =>
          `- ${entry.exercise_name} (${entry.duration_minutes}分钟): ${entry.calories_burned_estimated?.toFixed(0) || 0} kcal`
        ).join('\n')}
        `
  }

  // 添加历史数据趋势（排除今天）
  if (recentHealthData && recentHealthData.length > 0) {
    const historicalData = recentHealthData.filter((_dayLog, index) => index > 0)

    if (historicalData.length > 0 && userProfile) {
      systemPrompt += `

        历史健康数据趋势 (最近${historicalData.length}天):
        ${historicalData.map((dayLog, index) => {
          const dayLabel = index === 0 ? "昨天" : `${index + 1}天前`
          return `
        ${dayLabel} (${dayLog.date}):
        ${buildDailyEnergySnapshotPrompt({
          log: dayLog,
          userProfile,
          now,
        })}
        - 体重: ${dayLog.weight ? `${dayLog.weight} kg` : "未记录"}
        - 食物记录: ${dayLog.foodEntries?.length || 0}条, 运动记录: ${dayLog.exerciseEntries?.length || 0}条
        ${dayLog.dailyStatus ? `- 状态: ${formatDailyStatusForAI(dayLog.dailyStatus)}` : ""}
        ${dayLog.foodEntries?.length > 0 ? `
        主要食物: ${dayLog.foodEntries.slice(0, 3).map(entry => `${entry.food_name}(${entry.consumed_grams}g)`).join(", ")}${dayLog.foodEntries.length > 3 ? "..." : ""}` : ""}
        ${dayLog.exerciseEntries?.length > 0 ? `
        主要运动: ${dayLog.exerciseEntries.slice(0, 2).map(entry => `${entry.exercise_name}(${entry.duration_minutes}分钟)`).join(", ")}${dayLog.exerciseEntries.length > 2 ? "..." : ""}` : ""}
          `
        }).join('\n')}
        `
    }
  }

  if (aiMemory) {
    systemPrompt += buildMemorySection(aiMemory)
  }

  systemPrompt += `

        请根据以上详细信息，以${expertRole?.name || "专业健康助手"}的身份提供个性化的回答和建议。
        ${expertRole?.description ? `专业领域: ${expertRole.description}` : ""}

        回答格式说明:
        你可以选择以下回答格式之一：

        1. 普通回答格式：直接提供回答内容

        2. 带思考过程的回答格式（推荐用于复杂问题、需要分析的健康建议）：
        <think>
        在这里详细描述你的分析思路、考虑的因素、推理过程等。例如：
        - 分析用户的健康数据和目标
        - 考虑的营养学/运动学原理
        - 权衡不同建议的利弊
        - 个性化考虑因素
        这部分内容会被特殊显示，用户可以选择查看你的专业思考过程。
        </think>

        在这里提供最终的回答和建议。这是用户会直接看到的主要内容。

        注意：思考过程会实时流式显示，让用户看到你的专业分析过程。对于涉及健康建议、数据分析、复杂推理的问题，建议使用思考过程格式。

        重要提示: 如果在对话中发现了关于用户的重要新信息（如新的健康目标、偏好、限制条件、重要的健康变化等），
        并且这些信息对未来的建议很有价值，你可以在回答的最后添加一个特殊标记来请求更新记忆：

        [MEMORY_UPDATE_REQUEST]
        新记忆内容：[在这里写入需要记住的重要信息，限制在500字以内]
        更新原因：[简要说明为什么需要更新记忆]
        [/MEMORY_UPDATE_REQUEST]

        记忆更新的原则：
        1. 只记录对长期健康管理有价值的信息
        2. 避免记录临时性的数据（如今天吃了什么）
        3. 重点记录用户的偏好、限制、目标变化、重要的健康状况等
        4. 保持记忆内容简洁明了，不超过500字

        记忆更新示例：
        [MEMORY_UPDATE_REQUEST]
        新记忆内容：用户有LC后遗症（脑雾/慢性疲劳），工作依赖外卖且社交聚餐频繁，需持续关注炎症控制与执行便利性的平衡。对肉类接受度高，但需强化植物性营养摄入。
        更新原因：这些是制定长期LC康复方案的核心约束条件
        [/MEMORY_UPDATE_REQUEST]
        `

  return systemPrompt
}
