"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SmartAnalysisSummaryCardProps {
  summary?: string
  highlights?: string[]
  risks?: string[]
  categoryCount: number
  highPriorityCount: number
  actionableCount: number
  detailHref?: string
  meta?: string
  className?: string
}

export function SmartAnalysisSummaryCard({
  summary,
  highlights = [],
  risks = [],
  categoryCount,
  highPriorityCount,
  actionableCount,
  detailHref,
  meta,
  className,
}: SmartAnalysisSummaryCardProps) {
  const hasSummary = Boolean(summary && summary.trim())
  const hasHighlights = highlights.length > 0
  const hasRisks = risks.length > 0

  return (
    <div className={cn("space-y-3", className)}>
      {meta && <p className="text-xs text-muted-foreground">{meta}</p>}

      {hasSummary ? (
        <p className="text-sm leading-relaxed text-foreground/85">{summary}</p>
      ) : (
        <p className="text-xs italic text-muted-foreground">
          点击右上角刷新可生成今日摘要
        </p>
      )}

      {(hasHighlights || hasRisks) && (
        <div className="grid gap-2 sm720:grid-cols-2">
          {hasHighlights && (
            <SummaryList tone="positive" title="表现亮点" items={highlights} />
          )}
          {hasRisks && (
            <SummaryList tone="warning" title="需要注意" items={risks} />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-t border-border pt-3">
        <Stat value={categoryCount} label="方向" />
        {highPriorityCount > 0 && (
          <Stat
            value={highPriorityCount}
            label="高优"
            valueClassName="text-[var(--p-high-fg)]"
          />
        )}
        {actionableCount > 0 && <Stat value={actionableCount} label="可执行" />}
        {detailHref && (
          <Link
            href={detailHref}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-c-ai hover:underline"
          >
            查看完整
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}

function SummaryList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: "positive" | "warning"
}) {
  const titleClass =
    tone === "positive"
      ? "text-[var(--c-exercise)]"
      : "text-[var(--p-high-fg)]"
  const icon = tone === "positive" ? "✓" : "⚠"

  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] px-3 py-2.5">
      <div className={cn("mb-1.5 text-[11px] font-semibold", titleClass)}>
        {icon} {title}
      </div>
      <ul className="space-y-1 text-[12px] leading-relaxed text-foreground/80">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-1.5">
            <span className="text-muted-foreground">•</span>
            <span className="flex-1">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({
  value,
  label,
  valueClassName,
}: {
  value: number
  label: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={cn("text-xl font-bold tabular-nums", valueClassName)}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}
