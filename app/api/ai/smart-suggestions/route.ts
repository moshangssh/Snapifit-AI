import { generateObject } from "ai"
import {
  createAIClient,
  extractAIConfig,
  validateModelConfig,
} from "@/lib/ai/client"
import { handleAIError, AIError } from "@/lib/ai/errors"
import {
  DaySmartAnalysisOverviewSchema,
  SmartSuggestionCategorySchema,
} from "@/lib/ai/schemas/smart-suggestions"
import {
  buildCategorySuggestionPrompts,
  buildDayOverviewPrompt,
  buildSmartSuggestionsDataSummary,
} from "@/lib/ai/smart-suggestions-prompt"

export async function POST(req: Request) {
  try {
    const { dailyLog, userProfile, recentLogs } = await req.json()
    if (!dailyLog || !userProfile) {
      throw new AIError("INVALID_INPUT", "Missing required data")
    }

    const aiConfig = extractAIConfig(req)
    validateModelConfig(aiConfig.agentModel)
    const model = createAIClient(aiConfig.agentModel)

    const dataSummary = buildSmartSuggestionsDataSummary({
      dailyLog,
      userProfile,
      recentLogs,
      now: new Date(),
    })
    const suggestionPrompts = buildCategorySuggestionPrompts(dataSummary)
    const overviewPrompt = buildDayOverviewPrompt(dataSummary)

    // 并发调用 6 路 category + 1 路 overview。每一路失败时降级,不影响其他路。
    const suggestionPromises = Object.entries(suggestionPrompts).map(
      async ([key, prompt]) => {
        try {
          const { object } = await generateObject({
            model,
            schema: SmartSuggestionCategorySchema,
            mode: "json",
            prompt,
          })
          return { key, ...object }
        } catch (error) {
          console.warn(`Failed to get ${key} suggestions:`, error)
          return {
            key,
            category: key,
            priority: "low" as const,
            suggestions: [],
            summary: "分析暂时不可用",
          }
        }
      },
    )

    const overviewPromise: Promise<{
      summary: string
      highlights: string[]
      risks: string[]
    }> = generateObject({
      model,
      schema: DaySmartAnalysisOverviewSchema,
      mode: "json",
      prompt: overviewPrompt,
    })
      .then((res) => res.object)
      .catch((error) => {
        console.warn("Failed to get day overview:", error)
        return { summary: "", highlights: [], risks: [] }
      })

    const [allSuggestions, overview] = await Promise.all([
      Promise.all(suggestionPromises),
      overviewPromise,
    ])

    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 }
    allSuggestions.sort(
      (a: any, b: any) =>
        (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0),
    )

    return Response.json({
      suggestions: allSuggestions,
      summary: overview.summary || undefined,
      highlights: overview.highlights.length > 0 ? overview.highlights : undefined,
      risks: overview.risks.length > 0 ? overview.risks : undefined,
      generatedAt: new Date().toISOString(),
      dataDate: dailyLog.date,
    })
  } catch (error) {
    return handleAIError(error)
  }
}
