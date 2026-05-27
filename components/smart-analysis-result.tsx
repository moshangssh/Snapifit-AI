"use client"

import type { ReactNode } from "react"
import { Brain } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { PeriodSmartAnalysisResponse, SmartSuggestionCategory } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Tile } from "@/components/ui/tile"

const PRIORITY_LABEL: Record<string, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
}

const PRIORITY_PILL_CLASS: Record<string, string> = {
  high: "bg-[var(--p-high-bg)] text-[var(--p-high-fg)]",
  medium: "bg-[var(--p-mid-bg)] text-[var(--p-mid-fg)]",
  low: "bg-[var(--p-low-bg)] text-[var(--p-low-fg)]",
}

const CATEGORY_NAME_MAP: Record<string, string> = {
  nutrition: "营养配比优化",
  exercise: "运动处方优化",
  metabolism: "代谢调节优化",
  behavior: "行为习惯优化",
  timing: "时机优化策略",
  wellness: "整体健康优化",
}

const markdownComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-1.5 leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
  code: ({ inline, children }: { inline?: boolean; children?: ReactNode }) =>
    inline ? (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>
    ) : (
      <pre className="my-1.5 overflow-x-auto rounded bg-muted px-2 py-1.5 font-mono text-xs">
        <code>{children}</code>
      </pre>
    ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="my-1 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="my-1 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="flex items-start gap-1.5">
      <span className="flex-shrink-0 leading-relaxed text-primary">•</span>
      <span className="flex-1 leading-relaxed">{children}</span>
    </li>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      className="text-primary underline-offset-2 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
}

interface SmartAnalysisResultProps {
  title: string
  meta: string
  generatedAt: string
  suggestions: SmartSuggestionCategory[]
  periodAnalysis?: PeriodSmartAnalysisResponse
}

export function SmartAnalysisResult({
  title,
  meta,
  generatedAt,
  suggestions,
}: SmartAnalysisResultProps) {
  return (
    <>
      <Card className="mb-4 rounded-2xl border-border sm720:mb-6">
        <CardContent className="p-5 sm720:p-7">
          <div className="card-head !mb-0">
            <div className="card-title-row">
              <Tile variant="ai" size={36}>
                <Brain />
              </Tile>
              <div>
                <div className="text-base font-semibold">{title}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              生成于 {new Date(generatedAt).toLocaleString("zh-CN")}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 sm720:space-y-4">
        {suggestions.map((category, idx) => {
          const displayCategory = CATEGORY_NAME_MAP[category.category] || category.category
          const headIcon = category.suggestions[0]?.icon || "💡"
          return (
            <Card key={category.key || idx} className="rounded-2xl border-border">
              <CardContent className="p-5 sm720:p-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-lg leading-none">{headIcon}</span>
                  <h3 className="flex-1 text-[15px] font-semibold">{displayCategory}</h3>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      PRIORITY_PILL_CLASS[category.priority] ||
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {PRIORITY_LABEL[category.priority] || category.priority}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">
                  {category.summary}
                </p>

                {category.suggestions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {category.suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex-shrink-0 text-sm">{suggestion.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold">{suggestion.title}</h4>
                              {suggestion.actionable && (
                                <span className="inline-flex items-center rounded bg-[var(--meal-snack-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--meal-snack-fg)]">
                                  可执行建议
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                              >
                                {suggestion.description}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
