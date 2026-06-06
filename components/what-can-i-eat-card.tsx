"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRight, Loader2, Sparkles, Utensils } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tile } from "@/components/ui/tile"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useToast } from "@/hooks/use-toast"
import type {
  AIConfig,
  DailyLog,
  MealPlanBudgetSnapshot,
  MealPlanDisplayMode,
  MealPlanSuggestion,
  PlannedTrainingType,
  UserProfile,
} from "@/lib/types"

const TRAINING_OPTIONS: Array<{
  value: PlannedTrainingType
  label: string
}> = [
  { value: "rest", label: "休息日" },
  { value: "strength", label: "力量" },
  { value: "strength_cardio", label: "力量+有氧" },
  { value: "high_output", label: "高消耗" },
]

interface Props {
  dailyLog: DailyLog
  userProfile: UserProfile
  aiConfig: AIConfig
  budgetSnapshot: MealPlanBudgetSnapshot
  plannedTrainingType: PlannedTrainingType
  suggestion?: MealPlanSuggestion
  workbenchHref: string
  onTrainingTypeChange: (value: PlannedTrainingType) => void
  onSuggestionSave: (suggestion: MealPlanSuggestion) => void
}

export function WhatCanIEatCard({
  dailyLog,
  userProfile,
  aiConfig,
  budgetSnapshot,
  plannedTrainingType,
  suggestion,
  workbenchHref,
  onTrainingTypeChange,
  onSuggestionSave,
}: Props) {
  const { toast } = useToast()
  const [displayMode, setDisplayMode] =
    useState<MealPlanDisplayMode>("plans")
  const [preference, setPreference] = useState(
    suggestion?.inputPreference ?? "",
  )
  const [isPlanning, setIsPlanning] = useState(false)

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

        <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-foreground">
          {budgetSnapshot.summaryText}
        </p>

        <div className="mt-4 space-y-3">
          <ToggleGroup
            type="single"
            value={plannedTrainingType}
            onValueChange={(value) => {
              if (value) onTrainingTypeChange(value as PlannedTrainingType)
            }}
            className="grid grid-cols-2 gap-2 sm720:grid-cols-4"
          >
            {TRAINING_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-9 rounded-xl text-xs"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Textarea
            value={preference}
            onChange={(event) => setPreference(event.target.value)}
            placeholder="今天想吃点什么？例如：日料、热汤面、高蛋白、甜口、外卖"
            className="min-h-[72px] resize-none"
          />

          <Button onClick={handlePlan} disabled={isPlanning} className="w-full">
            {isPlanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            AI 规划
          </Button>
        </div>

        {suggestion ? (
          <div className="mt-5 space-y-4">
            <ToggleGroup
              type="single"
              value={displayMode}
              onValueChange={(value) => {
                if (value) setDisplayMode(value as MealPlanDisplayMode)
              }}
              className="justify-start"
            >
              <ToggleGroupItem value="plans" className="h-8 rounded-xl text-xs">
                方案推荐
              </ToggleGroupItem>
              <ToggleGroupItem value="items" className="h-8 rounded-xl text-xs">
                单品清单
              </ToggleGroupItem>
            </ToggleGroup>

            <p className="text-sm text-muted-foreground">{suggestion.summary}</p>

            {displayMode === "plans" ? (
              <div className="grid gap-3">
                {suggestion.plans.map((plan) => (
                  <div key={plan.type} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{plan.title}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {plan.rationale}
                        </p>
                      </div>
                      <div className="text-right text-xs tabular-nums text-muted-foreground">
                        {plan.totalNutrition.calories} kcal
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {plan.meals.map((meal, index) => (
                        <div key={`${plan.type}-${meal.mealType}-${index}`}>
                          <div className="text-xs font-semibold">{meal.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {meal.portionHint}
                          </div>
                        </div>
                      ))}
                    </div>
                    {plan.warning ? (
                      <p className="mt-2 text-xs text-destructive">{plan.warning}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                {suggestion.items.map((item) => (
                  <div
                    key={`${item.title}-${item.portionHint}`}
                    className="rounded-xl border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{item.title}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {item.nutrition.calories} kcal
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.portionHint} · {item.bestFor}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              营养值为 AI 估算，记录前请在工作台确认份量。
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
