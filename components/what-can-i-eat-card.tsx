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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type {
  AIConfig,
  DailyLog,
  MealPlanBudgetSnapshot,
  MealPlanDisplayMode,
  MealPlanSuggestion,
  MealPlanType,
  UserProfile,
} from "@/lib/types"

type MealSlot = "breakfast" | "lunch" | "dinner" | "snack"

// 餐次 → 粉彩 chip(沿用 globals.css 锁定的 .meal-chip 配色)
const MEAL_VIEW: Record<MealSlot, { short: string; chip: string }> = {
  breakfast: { short: "早", chip: "breakfast" },
  lunch: { short: "午", chip: "lunch" },
  dinner: { short: "晚", chip: "dinner" },
  snack: { short: "加", chip: "snack" },
}

// 方案类型 → 分类点缀色
const PLAN_DOT: Record<MealPlanType, string> = {
  steady: "bg-c-weight",
  craving: "bg-c-food",
  high_protein: "bg-c-exercise",
}

// 炭黑选中态的分段控件,用于结果展示模式切换
const SEGMENT_ITEM_CLASS =
  "rounded-xl border border-border text-xs transition-colors " +
  "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background " +
  "data-[state=on]:hover:bg-foreground data-[state=on]:hover:text-background"

interface Props {
  dailyLog: DailyLog
  userProfile: UserProfile
  aiConfig: AIConfig
  budgetSnapshot: MealPlanBudgetSnapshot
  suggestion?: MealPlanSuggestion
  workbenchHref: string
  onSuggestionSave: (suggestion: MealPlanSuggestion) => void
}

export function WhatCanIEatCard({
  dailyLog,
  userProfile,
  aiConfig,
  budgetSnapshot,
  suggestion,
  workbenchHref,
  onSuggestionSave,
}: Props) {
  const { toast } = useToast()
  const [displayMode, setDisplayMode] =
    useState<MealPlanDisplayMode>("plans")
  const [preference, setPreference] = useState(
    suggestion?.inputPreference ?? "",
  )
  const [isPlanning, setIsPlanning] = useState(false)

  useEffect(() => {
    setPreference(suggestion?.inputPreference ?? "")
  }, [suggestion?.inputPreference])

  const handlePlan = async () => {
    setIsPlanning(true)
    try {
      const response = await fetch("/api/ai/meal-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-config": JSON.stringify(aiConfig),
        },
        body: JSON.stringify({
          dailyLog,
          userProfile,
          budgetSnapshot,
          inputPreference: preference.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`meal-plan failed: ${response.status}`)
      }

      onSuggestionSave((await response.json()) as MealPlanSuggestion)
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
              按今日剩余预算，给出 3 套吃法与单品清单。
            </p>
          ) : null}
        </div>

        {suggestion ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <ToggleGroup
                type="single"
                value={displayMode}
                onValueChange={(value) => {
                  if (value) setDisplayMode(value as MealPlanDisplayMode)
                }}
                className="gap-2"
              >
                <ToggleGroupItem
                  value="plans"
                  className={cn(SEGMENT_ITEM_CLASS, "h-8 px-3")}
                >
                  方案推荐
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="items"
                  className={cn(SEGMENT_ITEM_CLASS, "h-8 px-3")}
                >
                  单品清单
                </ToggleGroupItem>
              </ToggleGroup>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {displayMode === "plans"
                  ? `${suggestion.plans.length} 套方案`
                  : `${suggestion.items.length} 个单品`}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-foreground/85">
              {suggestion.summary}
            </p>

            {displayMode === "plans" ? (
              <div className="space-y-2.5">
                {suggestion.plans.map((plan) => (
                  <div
                    key={plan.type}
                    className="rounded-xl border border-border p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 flex-none rounded-full",
                            PLAN_DOT[plan.type],
                          )}
                        />
                        <span className="truncate text-sm font-semibold">
                          {plan.title}
                        </span>
                      </div>
                      <div className="flex flex-none items-center gap-1.5">
                        <span className="tag">
                          {plan.totalNutrition.calories} kcal
                        </span>
                        <span className="tag">
                          蛋白 {plan.totalNutrition.protein}g
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {plan.rationale}
                    </p>
                    <div className="mt-3 space-y-2.5 border-t border-border pt-3">
                      {plan.meals.map((meal, index) => (
                        <div
                          key={`${plan.type}-${meal.mealType}-${index}`}
                          className="flex items-start gap-2.5"
                        >
                          <span
                            className={`meal-chip ${MEAL_VIEW[meal.mealType].chip} mt-0.5 flex-none`}
                          >
                            {MEAL_VIEW[meal.mealType].short}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium leading-snug">
                              {meal.title}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {meal.portionHint}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {plan.warning ? (
                      <div
                        className="mt-2.5 flex items-start gap-1.5 text-xs"
                        style={{ color: "hsl(var(--c-food))" }}
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                        <span className="leading-relaxed">{plan.warning}</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {suggestion.items.map((item) => (
                  <div
                    key={`${item.title}-${item.portionHint}`}
                    className="flex items-start gap-3 rounded-xl border border-border p-3"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex-none rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold",
                        item.kind === "combo"
                          ? "text-c-status"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.kind === "combo" ? "组合" : "单品"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-semibold">
                          {item.title}
                        </span>
                        <span className="flex-none text-xs tabular-nums text-muted-foreground">
                          {item.nutrition.calories} kcal · 蛋白 {item.nutrition.protein}g
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.portionHint} · {item.bestFor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              营养值为 AI 估算，记录前请在工作台确认份量。
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
