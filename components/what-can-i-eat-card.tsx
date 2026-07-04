"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  Sparkles,
  Utensils,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tile } from "@/components/ui/tile"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { postAI } from "@/lib/ai/client-fetch"
import type {
  DailyLog,
  MealPlanBudgetSnapshot,
  MealPlanSuggestion,
  UserProfile,
} from "@/lib/types"

interface Props {
  dailyLog: DailyLog
  userProfile: UserProfile
  budgetSnapshot: MealPlanBudgetSnapshot
  suggestion?: MealPlanSuggestion
  workbenchHref: string
  onSuggestionSave: (suggestion: MealPlanSuggestion) => void
}

export function WhatCanIEatCard({
  dailyLog,
  userProfile,
  budgetSnapshot,
  suggestion,
  workbenchHref,
  onSuggestionSave,
}: Props) {
  const { toast } = useToast()
  const [preference, setPreference] = useState(
    suggestion?.inputPreference ?? "",
  )
  const [isPlanning, setIsPlanning] = useState(false)
  const suggestionItems = suggestion?.items?.slice(0, 3) ?? []

  useEffect(() => {
    setPreference(suggestion?.inputPreference ?? "")
  }, [suggestion?.inputPreference])

  const handlePlan = async () => {
    setIsPlanning(true)
    try {
      onSuggestionSave(
        await postAI<MealPlanSuggestion>("/api/ai/meal-plan", {
          dailyLog,
          userProfile,
          budgetSnapshot,
          inputPreference: preference.trim(),
        }),
      )
    } catch (error) {
      toast({
        title: "AI 规划失败",
        description: error instanceof Error ? error.message : "请稍后重试。",
        variant: "destructive",
      })
    } finally {
      setIsPlanning(false)
    }
  }

  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="p-5 sm720:p-7">
        <div className="card-head">
          <div className="card-title-row">
            <Tile variant="food" size={36}>
              <Utensils />
            </Tile>
            <div className="card-title">今天还能吃什么</div>
          </div>
          <Link href={workbenchHref} className="card-action">
            去记录 <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <Textarea
            value={preference}
            onChange={(event) => setPreference(event.target.value)}
            placeholder="今天想吃点什么？例如：日料、热汤面、高蛋白、甜口、外卖"
            className="min-h-[72px] resize-none rounded-xl bg-[var(--surface-subtle)]"
          />

          <Button
            onClick={handlePlan}
            disabled={isPlanning}
            className="w-full rounded-xl"
          >
            {isPlanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isPlanning ? "AI 规划中…" : "AI 规划"}
          </Button>

          {!suggestion ? (
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              按今日剩余预算，给你 3 种吃法，挑一种。
            </p>
          ) : null}
        </div>

        {suggestion ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-foreground/85">
              {suggestion.summary}
            </p>

            <div className="space-y-2.5">
              {suggestionItems.map((item) => (
                <div
                  key={`${item.title}-${item.portionHint}`}
                  className={cn(
                    "rounded-xl border border-border p-3.5",
                    item.slightlyOverBudget && "border-c-food/40 bg-c-food/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "flex-none rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold",
                          item.kind === "combo"
                            ? "text-c-status"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.kind === "combo" ? "组合" : "单点"}
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      {item.isProteinPick ? (
                        <span className="flex-none rounded-md bg-c-exercise/10 px-1.5 py-0.5 text-[10px] font-semibold text-c-exercise">
                          补蛋白之选
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-none items-center gap-1.5">
                      <span className="tag">
                        {item.nutrition.calories} kcal
                      </span>
                      <span className="tag">
                        蛋白 {item.nutrition.protein}g
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.portionHint} · {item.bestFor}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {item.foods.join(" / ")}
                  </div>
                  {item.warning ? (
                    <div
                      className="mt-2.5 flex items-start gap-1.5 text-xs"
                      style={{ color: "hsl(var(--c-food))" }}
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span className="leading-relaxed">{item.warning}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              营养值为 AI 估算，记录前请在工作台确认份量。
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
