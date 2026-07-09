import { streamText } from "ai"
import type { DailyLog, UserProfile } from "@/lib/types"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { buildAdvicePrompt } from "@/lib/ai/advice-prompt"
import { handleAIError, AIError } from "@/lib/ai/errors"

export async function POST(req: Request) {
  try {
    const { dailyLog, userProfile } = (await req.json()) as {
      dailyLog: DailyLog
      userProfile: UserProfile
    }
    if (!dailyLog || !userProfile) {
      throw new AIError("INVALID_INPUT", "Missing required data")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)

    const prompt = buildAdvicePrompt({ dailyLog, userProfile, now: new Date() })

    const result = await streamText({
      model: createAIClient(aiConfig.agentModel),
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    return handleAIError(error)
  }
}
