"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Brain, Loader2, RefreshCw, Sparkles } from "lucide-react"
import type {
  SmartSuggestionsResponse,
  UserProfile,
} from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SectionCardHeader } from "@/components/ui/section-card-header"
import { SmartAnalysisSummaryCard } from "@/components/smart-analysis-summary-card"
import { usePeriodAnalysisData } from "@/hooks/use-period-analysis-data"
import {
  getPeriodAnalysisRequirement,
  type PeriodAnalysisRange,
  type PeriodAnalysisSummary,
} from "@/lib/smart-analysis-period"
import {
  formatSmartSuggestionsAge,
  formatSmartSuggestionsDate,
} from "@/lib/smart-suggestions-history"
import { cn } from "@/lib/utils"

type SmartSuggestionsRange = "day" | "7d" | "30d"

interface SmartSuggestionsProps {
  suggestions?: SmartSuggestionsResponse
  suggestionDate?: string
  suggestionDaysAgo?: number
  isLoading?: boolean
  onRefresh?: () => void
  currentDate?: string
  userProfile: UserProfile
}

const RANGE_OPTIONS: Array<{ value: SmartSuggestionsRange; label: string }> = [
  { value: "day", label: "今日" },
  { value: "7d", label: "7天" },
  { value: "30d", label: "30天" },
]

function RangePill({
  selected,
  dayLabel,
  onChange,
}: {
  selected: SmartSuggestionsRange
  dayLabel: string
  onChange: (value: SmartSuggestionsRange) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="分析周期"
      className="inline-flex h-8 items-center rounded-md bg-muted p-0.5 text-muted-foreground"
      onClick={(event) => event.stopPropagation()}
    >
      {RANGE_OPTIONS.map((option) => {
        const active = selected === option.value
        const label = option.value === "day" ? dayLabel : option.label
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onChange(option.value)
            }}
            className={cn(
              "inline-flex h-7 items-center justify-center whitespace-nowrap rounded-[6px] px-2.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-[0_0_0_1px_hsl(var(--border))_inset]"
                : "hover:text-foreground",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function ShellCard({
  selectedRange,
  dayLabel = "今日",
  onRangeChange,
  action,
  children,
}: {
  selectedRange: SmartSuggestionsRange
  dayLabel?: string
  onRangeChange: (value: SmartSuggestionsRange) => void
  action?: ReactNode
  children: ReactNode
}) {
  const base = "rounded-2xl border-border"

  return (
    <Card className={base}>
      <CardContent className="p-5 sm720:p-7">
        <SectionCardHeader
          tileVariant="ai"
          icon={<Brain />}
          title="智能建议"
          action={
            <div
              className="flex items-center gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <RangePill
                selected={selectedRange}
                dayLabel={dayLabel}
                onChange={onRangeChange}
              />
              {action}
            </div>
          }
          className="flex-wrap gap-3"
        />
        {children}
      </CardContent>
    </Card>
  )
}

export function SmartSuggestions({
  suggestions,
  suggestionDate,
  suggestionDaysAgo,
  isLoading,
  onRefresh,
  currentDate,
  userProfile,
}: SmartSuggestionsProps) {
  const [isClient, setIsClient] = useState(false)
  const [selectedRange, setSelectedRange] =
    useState<"day" | "7d" | "30d">("day")
  const dayLabel =
    typeof suggestionDaysAgo === "number"
      ? formatSmartSuggestionsAge(suggestionDaysAgo)
      : "今日"

  useEffect(() => {
    setIsClient(true)
  }, [])

  const effectiveDate = currentDate ?? new Date().toISOString().slice(0, 10)

  if (!isClient) {
    return (
      <ShellCard selectedRange="day" onRangeChange={() => {}}>
        <p className="py-6 text-center text-sm text-muted-foreground">加载中...</p>
      </ShellCard>
    )
  }

  if (selectedRange === "day") {
    return (
      <DayPanel
        suggestions={suggestions}
        suggestionDate={suggestionDate}
        suggestionDaysAgo={suggestionDaysAgo}
        dayLabel={dayLabel}
        isLoading={isLoading}
        onRefresh={onRefresh}
        currentDate={currentDate}
        selectedRange={selectedRange}
        onRangeChange={setSelectedRange}
      />
    )
  }

  return (
    <PeriodPanel
      range={selectedRange}
      endDate={effectiveDate}
      userProfile={userProfile}
      dayLabel={dayLabel}
      selectedRange={selectedRange}
      onRangeChange={setSelectedRange}
    />
  )
}

function DayPanel({
  suggestions,
  suggestionDate,
  suggestionDaysAgo,
  dayLabel,
  isLoading,
  onRefresh,
  currentDate,
  selectedRange,
  onRangeChange,
}: {
  suggestions?: SmartSuggestionsResponse
  suggestionDate?: string
  suggestionDaysAgo?: number
  dayLabel: string
  isLoading?: boolean
  onRefresh?: () => void
  currentDate?: string
  selectedRange: SmartSuggestionsRange
  onRangeChange: (value: SmartSuggestionsRange) => void
}) {
  const displayDate = suggestionDate ?? currentDate
  const detailHref = displayDate
    ? `/smart-analysis?date=${displayDate}&range=day`
    : "/smart-analysis?range=day"

  const refreshAction = onRefresh && (
    <Button
      variant="ghost"
      size="sm"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onRefresh()
      }}
      disabled={isLoading}
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
    </Button>
  )

  if (isLoading) {
    return (
      <ShellCard
        selectedRange={selectedRange}
        dayLabel={dayLabel}
        onRangeChange={onRangeChange}
        action={<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      >
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex animate-pulse items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-muted" />
              <div className="flex-1">
                <div className="mb-1.5 h-3 w-1/3 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </ShellCard>
    )
  }

  if (!suggestions || !suggestions.suggestions.length) {
    return (
      <ShellCard
        selectedRange={selectedRange}
        dayLabel={dayLabel}
        onRangeChange={onRangeChange}
        action={refreshAction}
      >
        <div className="flex flex-col items-center justify-center py-8">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">暂无智能建议</p>
          <p className="mt-1 text-sm text-muted-foreground">
            添加更多数据后将获得个性化建议
          </p>
        </div>
      </ShellCard>
    )
  }

  const categoryCount = suggestions.suggestions.length
  const highPriorityCount = suggestions.suggestions.filter(
    (category) => category.priority === "high",
  ).length
  const actionableCount = suggestions.suggestions
    .flatMap((category) => category.suggestions)
    .filter((suggestion) => suggestion.actionable).length

  const meta = displayDate
    ? `${dayLabel} · ${formatSmartSuggestionsDate(displayDate)}`
    : dayLabel

  return (
    <ShellCard
      selectedRange={selectedRange}
      dayLabel={dayLabel}
      onRangeChange={onRangeChange}
      action={refreshAction}
    >
      <div className="mt-4">
        <SmartAnalysisSummaryCard
          summary={suggestions.summary}
          highlights={suggestions.highlights}
          risks={suggestions.risks}
          categoryCount={categoryCount}
          highPriorityCount={highPriorityCount}
          actionableCount={actionableCount}
          detailHref={detailHref}
          meta={meta}
        />
      </div>
    </ShellCard>
  )
}

function PeriodPanel({
  range,
  endDate,
  userProfile,
  dayLabel,
  selectedRange,
  onRangeChange,
}: {
  range: PeriodAnalysisRange
  endDate: string
  userProfile: UserProfile
  dayLabel: string
  selectedRange: SmartSuggestionsRange
  onRangeChange: (value: SmartSuggestionsRange) => void
}) {
  const { summary, analysis, analysisDaysAgo, isReady, isGenerating, generate } =
    usePeriodAnalysisData({ range, endDate, userProfile })
  const requirement = getPeriodAnalysisRequirement(range)

  const refreshAction = analysis && summary && summary.dataDays >= summary.minDataDays && (
    <Button
      variant="ghost"
      size="sm"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        generate()
      }}
      disabled={isGenerating}
    >
      <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
    </Button>
  )

  if (!isReady || !summary) {
    return (
      <ShellCard
        selectedRange={selectedRange}
        dayLabel={dayLabel}
        onRangeChange={onRangeChange}
        action={<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      >
        <p className="py-6 text-center text-sm text-muted-foreground">加载中...</p>
      </ShellCard>
    )
  }

  if (!analysis && summary.dataDays < summary.minDataDays) {
    return (
      <ShellCard
        selectedRange={selectedRange}
        dayLabel={dayLabel}
        onRangeChange={onRangeChange}
      >
        <InsufficientDataState
          summary={summary}
          requirementLabel={requirement.label}
        />
      </ShellCard>
    )
  }

  if (!analysis) {
    return (
      <ShellCard
        selectedRange={selectedRange}
        dayLabel={dayLabel}
        onRangeChange={onRangeChange}
      >
        <UngeneratedState
          requirementLabel={requirement.label}
          dataDays={summary.dataDays}
          isGenerating={isGenerating}
          onGenerate={generate}
        />
      </ShellCard>
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
  const detailHref = `/smart-analysis?date=${analysis.endDate}&range=${range}`
  const meta = `${periodAge}${requirement.label} · ${analysis.startDate} - ${analysis.endDate}`

  return (
    <ShellCard
      selectedRange={selectedRange}
      dayLabel={dayLabel}
      onRangeChange={onRangeChange}
      action={refreshAction}
    >
      <div className="mt-4">
        <SmartAnalysisSummaryCard
          summary={analysis.summary}
          highlights={analysis.highlights}
          risks={analysis.risks}
          categoryCount={categoryCount}
          highPriorityCount={highPriorityCount}
          actionableCount={actionableCount}
          detailHref={detailHref}
          meta={meta}
        />
      </div>
    </ShellCard>
  )
}

function UngeneratedState({
  requirementLabel,
  dataDays,
  isGenerating,
  onGenerate,
}: {
  requirementLabel: string
  dataDays: number
  isGenerating: boolean
  onGenerate: () => void
}) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
      <Sparkles className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-sm font-medium">已读取 {dataDays} 天真实记录</p>
      <p className="mt-1 text-xs text-muted-foreground">可生成{requirementLabel}</p>
      <Button
        className="mt-4"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onGenerate()
        }}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 h-4 w-4" />
        )}
        生成{requirementLabel}
      </Button>
    </div>
  )
}

function InsufficientDataState({
  summary,
  requirementLabel,
}: {
  summary: PeriodAnalysisSummary
  requirementLabel: string
}) {
  const progress = Math.min(
    100,
    Math.round((summary.dataDays / summary.minDataDays) * 100),
  )
  const need = Math.max(0, summary.minDataDays - summary.dataDays)

  return (
    <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
      <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/60" />
      <p className="text-sm font-medium">{requirementLabel} · 数据不足</p>
      <p className="mt-1 text-xs text-muted-foreground">
        已有 {summary.dataDays} 天,还需 {need} 天
      </p>
      <div className="mt-3 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-foreground/80 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {summary.dataDays} / {summary.minDataDays} 最低要求
      </p>
    </div>
  )
}
