import type { PeriodAnalysisRange } from "@/lib/smart-analysis-period"
import type {
  PeriodSmartAnalysisResponse,
  SmartSuggestionsResponse,
} from "@/lib/types"

export interface ResolvedSmartSuggestions {
  suggestions: SmartSuggestionsResponse
  date: string
  daysAgo: number
}

export interface ResolvedPeriodSmartAnalysis {
  analysis: PeriodSmartAnalysisResponse
  endDate: string
  daysAgo: number
}

function parseDateKey(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const value = Date.UTC(year, month - 1, day)
  const date = new Date(value)

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return value
}

function hasSuggestions(
  value: SmartSuggestionsResponse | undefined,
): value is SmartSuggestionsResponse {
  return Boolean(value?.suggestions?.length)
}

function hasPeriodAnalysis(
  value: PeriodSmartAnalysisResponse | undefined,
): value is PeriodSmartAnalysisResponse {
  return Boolean(value?.suggestions?.length)
}

export function resolveSmartSuggestionsForDate(
  allSuggestions: Record<string, SmartSuggestionsResponse>,
  targetDate: string,
): ResolvedSmartSuggestions | null {
  const targetTime = parseDateKey(targetDate)
  if (targetTime === null) return null

  let resolved: ResolvedSmartSuggestions | null = null

  for (const [date, suggestions] of Object.entries(allSuggestions)) {
    if (!hasSuggestions(suggestions)) continue

    const suggestionTime = parseDateKey(date)
    if (suggestionTime === null || suggestionTime > targetTime) continue

    const daysAgo = Math.round((targetTime - suggestionTime) / 86_400_000)
    if (!resolved || daysAgo < resolved.daysAgo) {
      resolved = { suggestions, date, daysAgo }
    }
  }

  return resolved
}

export function resolvePeriodSmartAnalysisForDate(
  allAnalysis: Record<string, PeriodSmartAnalysisResponse>,
  range: PeriodAnalysisRange,
  targetEndDate: string,
): ResolvedPeriodSmartAnalysis | null {
  const targetTime = parseDateKey(targetEndDate)
  if (targetTime === null) return null

  let resolved: ResolvedPeriodSmartAnalysis | null = null
  const keyPrefix = `${range}:`

  for (const [key, analysis] of Object.entries(allAnalysis)) {
    if (!key.startsWith(keyPrefix) || !hasPeriodAnalysis(analysis)) continue
    if (analysis.range !== range) continue

    const endDate = key.slice(keyPrefix.length)
    if (analysis.endDate !== endDate) continue

    const analysisTime = parseDateKey(endDate)
    if (analysisTime === null || analysisTime > targetTime) continue

    const daysAgo = Math.round((targetTime - analysisTime) / 86_400_000)
    if (!resolved || daysAgo < resolved.daysAgo) {
      resolved = { analysis, endDate, daysAgo }
    }
  }

  return resolved
}

export function formatSmartSuggestionsAge(daysAgo: number): string {
  if (daysAgo <= 0) return "今日"
  if (daysAgo === 1) return "昨日"
  if (daysAgo === 2) return "前日"
  return `${daysAgo}天前`
}

export function formatSmartSuggestionsDate(dateKey: string): string {
  const parsed = parseDateKey(dateKey)
  if (parsed === null) return dateKey

  return new Date(parsed).toLocaleDateString("zh-CN", { timeZone: "UTC" })
}
