import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { AIError, handleAIError } from "@/lib/ai/errors"
import { buildPeriodAnalysisPrompt } from "@/lib/ai/period-analysis-prompt"
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

    const prompt = buildPeriodAnalysisPrompt({ summary, userProfile })

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
