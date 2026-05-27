"use client"

import { useCallback, useEffect, useState } from "react"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useToast } from "@/hooks/use-toast"
import {
  buildPeriodAnalysisSummary,
  getPeriodAnalysisDateKeys,
  type PeriodAnalysisRange,
  type PeriodAnalysisSummary,
} from "@/lib/smart-analysis-period"
import type {
  AIConfig,
  DailyLog,
  PeriodSmartAnalysisResponse,
  UserProfile,
} from "@/lib/types"
import { resolvePeriodSmartAnalysisForDate } from "@/lib/smart-suggestions-history"

interface UsePeriodAnalysisDataOptions {
  range: PeriodAnalysisRange
  endDate: string
  userProfile: UserProfile
  aiConfig: AIConfig
}

interface UsePeriodAnalysisDataResult {
  summary: PeriodAnalysisSummary | null
  analysis: PeriodSmartAnalysisResponse | null
  analysisDaysAgo: number | null
  isReady: boolean
  isGenerating: boolean
  generate: () => Promise<void>
}

function cacheKey(range: PeriodAnalysisRange, endDate: string): string {
  return `${range}:${endDate}`
}

export function usePeriodAnalysisData(
  options: UsePeriodAnalysisDataOptions,
): UsePeriodAnalysisDataResult {
  const { range, endDate, userProfile, aiConfig } = options
  const { toast } = useToast()
  const { getData: getDailyLog, isInitializing: dbInitializing } =
    useIndexedDB("healthLogs")
  const [cache, setCache] = useLocalStorage<
    Record<string, PeriodSmartAnalysisResponse>
  >("periodSmartSuggestions", {})

  const [summary, setSummary] = useState<PeriodAnalysisSummary | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    let isActive = true
    setIsReady(false)

    async function loadSummary() {
      if (dbInitializing) return

      const dateKeys = getPeriodAnalysisDateKeys(range, endDate)
      const logs: DailyLog[] = []

      for (const dateKey of dateKeys) {
        const log = (await getDailyLog(dateKey)) as DailyLog | null
        if (log) logs.push(log)
      }

      const built = buildPeriodAnalysisSummary({ range, endDate, logs })
      if (!isActive) return

      setSummary(built)
      setIsReady(true)
    }

    loadSummary()
    return () => {
      isActive = false
    }
  }, [dbInitializing, endDate, getDailyLog, range])

  const resolvedAnalysis = resolvePeriodSmartAnalysisForDate(cache, range, endDate)
  const analysis = resolvedAnalysis?.analysis ?? null
  const analysisDaysAgo = resolvedAnalysis?.daysAgo ?? null

  const generate = useCallback(async () => {
    if (!summary) return
    if (summary.dataDays < summary.minDataDays) return
    if (
      !aiConfig.agentModel.name ||
      !aiConfig.agentModel.baseUrl ||
      !aiConfig.agentModel.apiKey
    ) {
      toast({
        title: "AI 未配置",
        description:
          "请先在设置中配置代理模型(agentModel)的 API key 和地址。",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/smart-suggestions/period", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-config": JSON.stringify(aiConfig),
        },
        body: JSON.stringify({ summary, userProfile }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        toast({
          title: "周期分析生成失败",
          description: error?.error ?? "请稍后重试。",
          variant: "destructive",
        })
        return
      }

      const data = (await response.json()) as PeriodSmartAnalysisResponse
      setCache({ ...cache, [cacheKey(range, endDate)]: data })
    } catch (error) {
      console.warn("Period smart analysis error:", error)
      toast({
        title: "周期分析生成失败",
        description: "请检查网络或模型配置后重试。",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [aiConfig, cache, endDate, range, setCache, summary, toast, userProfile])

  return { summary, analysis, analysisDaysAgo, isReady, isGenerating, generate }
}
