import { streamText } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import {
  buildChatSystemPrompt,
  type ChatAIMemory,
  type ChatExpertRole,
} from "@/lib/ai/chat-system-prompt"
import { handleAIError, AIError } from "@/lib/ai/errors"
import type { DailyLog, UserProfile } from "@/lib/types"

interface ChatRequestBody {
  messages?: Array<{ role: string; content: string }>
  userProfile?: UserProfile
  healthData?: DailyLog
  recentHealthData?: DailyLog[]
  systemPrompt?: string
  expertRole?: ChatExpertRole
  aiMemory?: ChatAIMemory
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody
    const {
      messages,
      userProfile,
      healthData,
      recentHealthData,
      systemPrompt: customSystemPrompt,
      expertRole,
      aiMemory,
    } = body

    if (!messages || !Array.isArray(messages)) {
      throw new AIError("INVALID_INPUT", "Invalid messages format")
    }

    const aiConfig = extractAIConfig(req)
    const modelConfig = aiConfig.chatModel
    validateModelConfig(modelConfig)

    const systemPrompt = buildChatSystemPrompt({
      userProfile,
      healthData,
      recentHealthData,
      customSystemPrompt,
      expertRole,
      aiMemory,
      now: new Date(),
    })

    // 清理消息格式，移除AI SDK添加的额外字段
    const cleanMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    const result = await streamText({
      model: createAIClient(modelConfig),
      system: systemPrompt,
      messages: cleanMessages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    return handleAIError(error)
  }
}
