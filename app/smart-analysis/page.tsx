"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react"
import type {
  SmartSuggestionsResponse,
  UserProfile,
} from "@/lib/types"
import {
  getPeriodAnalysisRequirement,
  type PeriodAnalysisRange,
} from "@/lib/smart-analysis-period"
import { cn } from "@/lib/utils"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { usePeriodAnalysisData } from "@/hooks/use-period-analysis-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { SmartAnalysisResult } from "@/components/smart-analysis-result"
import { SmartAnalysisSummaryCard } from "@/components/smart-analysis-summary-card"
import { formatDateParam, parseDateParam } from "@/lib/date-params"
import {
  formatSmartSuggestionsAge,
  formatSmartSuggestionsDate,
  resolveSmartSuggestionsForDate,
  type ResolvedSmartSuggestions,
} from "@/lib/smart-suggestions-history"

type AnalysisRange = "day" | PeriodAnalysisRange

const RANGE_OPTIONS: Array<{ value: AnalysisRange; label: string }> = [
  { value: "day", label: "今日分析" },
  { value: "7d", label: "7天复盘" },
  { value: "30d", label: "30天趋势" },
]

const DEFAULT_USER_PROFILE: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  bmrFormula: "mifflin-st-jeor",
}

function parseRange(value: string | null): AnalysisRange {  return value === "7d" || value === "30d" ? value : "day"
}

function readLocalRecord<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Record<string, T>) : {}
  } catch (error) {
    console.warn(`Failed to parse ${key}:`, error)
    return {}
  }
}

function SmartAnalysisContent() {
  const searchParams = useSearchParams()
  const selectedDate = parseDateParam(searchParams.get("date"))
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd")
  const selectedRange = parseRange(searchParams.get("range"))
  const [userProfile] = useLocalStorage<UserProfile>(
    "userProfile",
    DEFAULT_USER_PROFILE,
  )
  const [daySuggestions, setDaySuggestions] =
    useState<ResolvedSmartSuggestions | null>(null)
  const [isDayReady, setIsDayReady] = useState(false)

  useEffect(() => {
    if (selectedRange !== "day") {
      setIsDayReady(true)
      return
    }

    const all = readLocalRecord<SmartSuggestionsResponse>("smartSuggestions")
    setDaySuggestions(resolveSmartSuggestionsForDate(all, selectedDateKey))
    setIsDayReady(true)
  }, [selectedDateKey, selectedRange])

  const header = (
    <PageHeader
      title="智能分析"
      subtitle={format(selectedDate, "PPP (eeee)", { locale: zhCN })}
      actions={
        <Link href={`/?date=${formatDateParam(selectedDate)}`}>
          <Button variant="bare" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回总览
          </Button>
        </Link>
      }
    />
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm720:px-8 sm720:py-10">
        {header}
        <RangeSwitch
          selectedDateKey={selectedDateKey}
          selectedRange={selectedRange}
        />
        {selectedRange === "day" ? (
          <DayDetail
            isReady={isDayReady}
            resolvedSuggestions={daySuggestions}
          />
        ) : (
          <PeriodDetail
            range={selectedRange}
            endDate={selectedDateKey}
            userProfile={userProfile}
          />
        )}
      </div>
    </div>
  )
}

function RangeSwitch({
  selectedDateKey,
  selectedRange,
}: {
  selectedDateKey: string
  selectedRange: AnalysisRange
}) {
  return (
    <div className="mb-4 inline-flex rounded-xl bg-muted p-1 text-sm text-muted-foreground">
      {RANGE_OPTIONS.map((option) => (
        <Link
          key={option.value}
          href={`/smart-analysis?date=${selectedDateKey}&range=${option.value}`}
          className={cn(
            "rounded-lg px-3 py-1.5 font-medium transition",
            selectedRange === option.value
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}

function DayDetail({
  isReady,
  resolvedSuggestions,
}: {
  isReady: boolean
  resolvedSuggestions: ResolvedSmartSuggestions | null
}) {
  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!resolvedSuggestions) {
    return (
      <EmptyState
        title="该日期暂无智能建议"
        description="请回到总览页生成今日建议"
      />
    )
  }

  const { suggestions, date, daysAgo } = resolvedSuggestions
  const categoryCount = suggestions.suggestions.length
  const highPriorityCount = suggestions.suggestions.filter(
    (category) => category.priority === "high",
  ).length
  const actionableCount = suggestions.suggestions
    .flatMap((category) => category.suggestions)
    .filter((suggestion) => suggestion.actionable).length

  return (
    <>
      <Card className="mb-4 rounded-2xl border-border sm720:mb-6">
        <CardContent className="p-5 sm720:p-7">
          <SmartAnalysisSummaryCard
            summary={suggestions.summary}
            highlights={suggestions.highlights}
            risks={suggestions.risks}
            categoryCount={categoryCount}
            highPriorityCount={highPriorityCount}
            actionableCount={actionableCount}
            meta={`${formatSmartSuggestionsAge(daysAgo)} · ${formatSmartSuggestionsDate(date)} · 生成于 ${new Date(suggestions.generatedAt).toLocaleString("zh-CN")}`}
          />
        </CardContent>
      </Card>

      <SmartAnalysisResult
        title="完整智能分析"
        meta={`${formatSmartSuggestionsAge(daysAgo)} · ${categoryCount} 个优化方向 · ${actionableCount} 条可执行建议`}
        generatedAt={suggestions.generatedAt}
        suggestions={suggestions.suggestions}
      />
    </>
  )
}

function PeriodDetail({
  range,
  endDate,
  userProfile,
}: {
  range: PeriodAnalysisRange
  endDate: string
  userProfile: UserProfile
}) {
  const { summary, analysis, analysisDaysAgo, isReady, isGenerating, generate } =
    usePeriodAnalysisData({ range, endDate, userProfile })
  const requirement = getPeriodAnalysisRequirement(range)

  if (!isReady || !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!analysis && summary.dataDays < summary.minDataDays) {
    return (
      <EmptyState
        title={`${requirement.label} 数据不足`}
        description={`需要至少 ${summary.minDataDays} 天真实记录,当前为 ${summary.dataDays} 天。`}
      />
    )
  }

  if (!analysis || !analysis.suggestions.length) {
    return (
      <Card className="rounded-2xl border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">{requirement.label} 尚未生成</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            已读取 {summary.dataDays} 天真实记录,可生成周期复盘。
          </p>
          <Button className="mt-5" onClick={generate} disabled={isGenerating}>
            {isGenerating ? (
              <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            生成{requirement.label}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const categoryCount = analysis.suggestions.length
  const highPriorityCount = analysis.suggestions.filter(
    (category) => category.priority === "high",
  ).length
  const actionableCount = analysis.suggestions
    .flatMap((category) => category.suggestions)
    .filter((suggestion) => suggestion.actionable).length
  const periodAge =
    typeof analysisDaysAgo === "number" && analysisDaysAgo > 0
      ? `截至${formatSmartSuggestionsAge(analysisDaysAgo)} · `
      : ""

  return (
    <>
      <Card className="mb-4 rounded-2xl border-border sm720:mb-6">
        <CardContent className="p-5 sm720:p-7">
          <SmartAnalysisSummaryCard
            summary={analysis.summary}
            highlights={analysis.highlights}
            risks={analysis.risks}
            categoryCount={categoryCount}
            highPriorityCount={highPriorityCount}
            actionableCount={actionableCount}
            meta={`${periodAge}${analysis.startDate} 至 ${analysis.endDate} · ${analysis.dataDays}/${summary.totalDays} 天记录`}
          />
        </CardContent>
      </Card>

      <SmartAnalysisResult
        title={requirement.label}
        meta={`${periodAge}${analysis.startDate} 至 ${analysis.endDate} · ${analysis.dataDays}/${summary.totalDays} 天记录 · ${actionableCount} 条可执行建议`}
        generatedAt={analysis.generatedAt}
        suggestions={analysis.suggestions}
        periodAnalysis={analysis}
      />
    </>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function SmartAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SmartAnalysisContent />
    </Suspense>
  )
}
