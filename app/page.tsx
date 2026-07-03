"use client"

import type React from "react"

import { Suspense, useState, useEffect, useMemo, useRef } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ClipboardPenLine,
  Utensils,
  Flame,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  Loader2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Tile } from "@/components/ui/tile"
import { Ring } from "@/components/ui/ring"
import { ProgressBar } from "@/components/ui/progress-bar"
import { useToast } from "@/hooks/use-toast"
import type {
  FoodEntry,
  ExerciseEntry,
  AIConfig,
  DailyStatus,
  UserProfile,
  MealPlanSuggestion,
  SmartSuggestionsResponse,
} from "@/lib/types"
import { FoodEntryCard } from "@/components/food-entry-card"
import { ExerciseEntryCard } from "@/components/exercise-entry-card"
import { MuscleFatigueCard } from "@/components/muscle-fatigue-card"
import { WhatCanIEatCard } from "@/components/what-can-i-eat-card"
import { ManagementCharts } from "@/components/management-charts"
import { SmartSuggestions } from "@/components/smart-suggestions"
import { DailyStatusSummary } from "@/components/daily-status-summary"
import { TodayWeightCard } from "@/components/today-weight-card"
import { BackupAlert } from "@/components/backup-alert"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useDateRecords } from "@/hooks/use-date-records"
import { useDailyLogWriter } from "@/hooks/use-daily-log-writer"
import { buildDailyEnergySnapshot } from "@/lib/daily-energy-snapshot"
import { buildMealPlanBudgetSnapshot } from "@/lib/meal-planning"
import { syncProfileWeightFromDailyLog } from "@/lib/profile-weight"
import { formatDateParam, parseDateParam } from "@/lib/date-params"
import { resolveSmartSuggestionsForDate } from "@/lib/smart-suggestions-history"
import { cn } from "@/lib/utils"

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const dateParamRaw = searchParams.get("date")
  const selectedDate = useMemo(() => parseDateParam(dateParamRaw), [dateParamRaw])
  const dateParam = formatDateParam(selectedDate)
  const currentDateParamRef = useRef(dateParam)

  useEffect(() => {
    currentDateParamRef.current = dateParam
  }, [dateParam])

  const setSelectedDate = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", formatDateParam(date))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const jumpToToday = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("date")
    const queryStr = params.toString()
    router.replace(queryStr ? `${pathname}?${queryStr}` : pathname, { scroll: false })
  }

  const isToday = dateParam === formatDateParam(new Date())

  const currentLocale = zhCN
  const { toast } = useToast()
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState<number>(0)
  const [smartSuggestionsLoading, setSmartSuggestionsLoading] = useState(false)
  const [foodListExpanded, setFoodListExpanded] = useState(false)
  const [exerciseListExpanded, setExerciseListExpanded] = useState(false)
  const ENTRY_PREVIEW = 3

  // 使用本地存储钩子获取用户配置
  const [userProfile, setUserProfile, isUserProfileHydrated] =
    useLocalStorage<UserProfile>("userProfile", {
      weight: 70,
      height: 170,
      age: 30,
      gender: "male",
      activityLevel: "moderate",
      goal: "maintain",
      bmrFormula: "mifflin-st-jeor" as "mifflin-st-jeor",
    })

  // 获取AI配置
  const [aiConfig, , isAIConfigHydrated] = useLocalStorage<AIConfig>("aiConfig", {
    agentModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
    },
    chatModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
    },
    visionModel: {
      name: "gpt-4o",
      baseUrl: "https://api.openai.com",
      apiKey: "",
    },
  })

  // 使用 IndexedDB 钩子获取日志数据
  const { getData: getDailyLog, saveData: saveDailyLog, isInitializing: dbInitializing } = useIndexedDB("healthLogs")

  // 使用日期记录检查Hook
  const { hasRecord, refreshRecords } = useDateRecords()

  // DailyLog 写入深模块:持当天状态、加载守卫,暴露 commit(意图)与 TEF 倒计时。
  // 写入顺序、摘要重算、基础消耗盖章、TEF 调度、日历刷新都收进 hook,页面只表达意图。
  const {
    log: dailyLog,
    isLogLoaded,
    commit,
    tefAnalysisCountdown,
  } = useDailyLogWriter({
    date: dateParam,
    userProfile,
    isUserProfileHydrated,
    aiConfig,
    isAIConfigHydrated,
    getDailyLog,
    saveDailyLog,
    dbInitializing,
    refreshRecords,
  })

  // 检查AI配置是否完整(仅在自动 TEF / 智能建议流程中使用,均不涉及视觉模型)
  const checkAIConfig = () => {
    const modelConfig = aiConfig.agentModel

    if (!modelConfig.name || !modelConfig.baseUrl || !modelConfig.apiKey) {
      return false
    }
    return true
  }

  // 智能建议localStorage存储
  const [smartSuggestions, setSmartSuggestions] = useLocalStorage<Record<string, SmartSuggestionsResponse>>('smartSuggestions', {})
  const resolvedSmartSuggestions = useMemo(
    () => resolveSmartSuggestionsForDate(smartSuggestions, dailyLog.date),
    [smartSuggestions, dailyLog.date],
  )

  // 智能建议功能
  const generateSmartSuggestions = async (targetDate?: string) => {
    if (!aiConfig.agentModel.name || !aiConfig.agentModel.baseUrl || !aiConfig.agentModel.apiKey) {
      toast({
        title: (
          <span className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-c-exercise" />
            AI 未配置
          </span>
        ),
        description: "请先在设置中配置代理模型(agentModel)的 API key 和地址。",
        variant: "destructive",
      })
      return
    }
    if (!checkAIConfig()) return

    const analysisDate = targetDate || dailyLog.date
    const targetLog = targetDate ? await getDailyLog(targetDate) : dailyLog

    if (!targetLog || targetLog.foodEntries.length === 0) {
      console.warn("No data available for smart suggestions on", analysisDate)
      return
    }

    setSmartSuggestionsLoading(true)
    try {
      // 获取目标日期前7天的数据
      const recentLogs = []
      const targetDateObj = new Date(analysisDate)
      for (let i = 0; i < 7; i++) {
        const date = new Date(targetDateObj)
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        const log = await getDailyLog(dateKey)
        if (log && log.foodEntries.length > 0) {
          recentLogs.push(log)
        }
      }

      const response = await fetch("/api/ai/smart-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-config": JSON.stringify(aiConfig),
        },
        body: JSON.stringify({
          dailyLog: targetLog,
          userProfile,
          recentLogs
        }),
      })

      if (!response.ok) {
        console.warn("Smart suggestions failed:", response.statusText)
        return
      }

      const suggestions = await response.json()

      // 保存到localStorage
      const newSuggestions = { ...smartSuggestions }
      newSuggestions[analysisDate] = suggestions as SmartSuggestionsResponse
      setSmartSuggestions(newSuggestions)

    } catch (error) {
      console.warn("Smart suggestions error:", error)
    } finally {
      setSmartSuggestionsLoading(false)
    }
  }

  // 删除条目
  const handleDeleteEntry = (id: string, type: "food" | "exercise") => {
    commit({ kind: "removeEntry", id, type })
    setChartRefreshTrigger(prev => prev + 1)

    toast({
      title: (
        <span className="flex items-center">
          <Trash2 className="mr-2 h-5 w-5 text-c-weight" />
          {"删除成功"}
        </span>
      ),
      description: type === "food" ? "已删除食物记录。" : "已删除运动记录。",
    })
  }

  // 更新条目
  const handleUpdateEntry = (updatedEntry: FoodEntry | ExerciseEntry, type: "food" | "exercise") => {
    commit({ kind: "updateEntry", entry: updatedEntry, type })
    setChartRefreshTrigger(prev => prev + 1)

    toast({
      title: (
        <span className="flex items-center">
          <Edit3 className="mr-2 h-5 w-5 text-c-weight" />
          {"更新成功"}
        </span>
      ),
      description: type === "food" ? "已更新食物记录。" : "已更新运动记录。",
    })
  }

  // 处理每日状态保存
  const handleSaveDailyStatus = (status: DailyStatus) => {
    commit({ kind: "setDailyStatus", status })
    toast({
      title: (
        <span className="flex items-center">
          <CheckCircle2 className="mr-2 h-5 w-5 text-c-weight" />
          每日状态已保存
        </span>
      ),
      description: `已保存 ${dailyLog.date} 的状态记录`,
    })
  }

  const dailyEnergySnapshot = buildDailyEnergySnapshot({
    log: dailyLog,
    userProfile,
    now: new Date(),
  })
  const totalCaloriesConsumed = dailyEnergySnapshot.consumedCalories
  const totalCaloriesBurned = dailyEnergySnapshot.recordedExerciseCalories
  const baselineExpenditure = dailyEnergySnapshot.baselineExpenditure
  const dailyTotalExpenditure = dailyEnergySnapshot.maintenanceCalories
  const calorieDelta = dailyEnergySnapshot.calorieDelta
  const macros = dailyLog.summary.macros ?? { carbs: 0, protein: 0, fat: 0 }
  const isCurrentLogReady =
    isLogLoaded && !dbInitializing && dailyLog.date === dateParam
  const mealPlanBudgetSnapshot = buildMealPlanBudgetSnapshot({
    log: dailyLog,
    userProfile,
    now: new Date(),
  })

  // TEF 状态展示
  const metabolicHint = dailyEnergySnapshot.metabolicHint
  const tefDone = !!metabolicHint
  const tefRunning = (tefAnalysisCountdown ?? 0) > 0
  const tefFactorText = metabolicHint?.factors.join("、") ?? ""

  // ── Hero v3 派生 ───────────────────────────────────
  const heroState = dailyEnergySnapshot.state

  const heroVisual = (() => {
    const consumed = Math.round(totalCaloriesConsumed)
    const expenditure = Math.round(dailyTotalExpenditure)
    const absDelta = Math.abs(Math.round(calorieDelta))
    switch (heroState) {
      case "deficit":
        return {
          ringColorClass: "text-c-weight",
          centerTop: "剩余",
          centerMain: `${absDelta}`,
          centerColorClass: "text-c-weight",
          centerHint: (
            <>摄入 <strong>{consumed.toLocaleString()}</strong> / 今日维持热量 <strong>{expenditure.toLocaleString()}</strong></>
          ),
          formulaFirstLabel: "热量差额",
          formulaFirstClass: "deficit",
          formulaFirstNum: `-${absDelta}`,
        }
      case "surplus":
        return {
          ringColorClass: "text-c-exercise",
          centerTop: "已超",
          centerMain: `${absDelta}`,
          centerColorClass: "text-c-exercise",
          centerHint: (
            <>摄入 <strong>{consumed.toLocaleString()}</strong> · 超出今日维持热量 <strong>{absDelta.toLocaleString()}</strong></>
          ),
          formulaFirstLabel: "热量差额",
          formulaFirstClass: "surplus",
          formulaFirstNum: `+${absDelta}`,
        }
      case "balanced":
        return {
          ringColorClass: "text-foreground",
          centerTop: "平衡",
          centerMain: "0",
          centerColorClass: "text-foreground",
          centerHint: <>摄入与今日维持热量接近平衡</>,
          formulaFirstLabel: "热量差额",
          formulaFirstClass: "base",
          formulaFirstNum: "0",
        }
      case "no-record":
        return {
          ringColorClass: "text-muted-foreground",
          centerTop: "剩余",
          centerMain: expenditure.toLocaleString(),
          centerColorClass: "text-muted-foreground",
          centerHint: (
            <Link href={`/workbench?date=${dateParam}`} className="underline-offset-2 hover:text-foreground hover:underline transition-colors">
              去记录开始一天 →
            </Link>
          ),
          formulaFirstLabel: "热量差额",
          formulaFirstClass: "mute",
          formulaFirstNum: "—",
        }
      case "missing-config":
      default:
        return {
          ringColorClass: "text-muted-foreground",
          centerTop: "—",
          centerMain: "—",
          centerColorClass: "text-muted-foreground",
          centerHint: (
            <Link href="/settings" className="underline-offset-2 hover:text-foreground hover:underline transition-colors">
              去快速配置 →
            </Link>
          ),
          formulaFirstLabel: "热量差额",
          formulaFirstClass: "mute",
          formulaFirstNum: "—",
        }
    }
  })()

  // 优先级:running > done > empty
  // 食物清单变化触发新分析时,即使旧 tefAnalysis 还在(可能 multiplier=1.0 显示成 +0 kcal),
  // 也应展示"分析中…"提示用户旧数值已作废、新分析在跑。
  const tefCardState: "done" | "running" | "empty" = tefRunning
    ? "running"
    : tefDone
      ? "done"
      : "empty"

  const macroTargets = dailyEnergySnapshot.macroTargets
  const hasMacroTarget = (target: number) =>
    dailyEnergySnapshot.budgetCalories > 0 && target > 0
  const macroPctV2 = (g: number, target: number) =>
    hasMacroTarget(target)
      ? Math.min(Math.max((g / target) * 100, 0), 100)
      : 0
  const macroOver = (g: number, target: number) =>
    hasMacroTarget(target) && g > target

  const handleMealPlanSuggestionSave = (suggestion: MealPlanSuggestion) => {
    if (
      !isCurrentLogReady ||
      dailyLog.date !== currentDateParamRef.current ||
      suggestion.budgetSnapshot.date !== currentDateParamRef.current
    ) {
      return
    }

    commit({ kind: "setMealPlanSuggestion", suggestion })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm720:px-8 sm720:py-10">
        <PageHeader
          title="总览"
          subtitle={
            <span className="inline-flex flex-wrap items-center gap-x-2.5">
              <span>{format(selectedDate, "PPP (eeee)", { locale: currentLocale })}</span>
              {!isToday && (
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="card-action"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  返回今天
                </button>
              )}
            </span>
          }
          actions={
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    切换日期
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    locale={currentLocale}
                    hasRecord={hasRecord}
                  />
                </PopoverContent>
              </Popover>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="font-normal text-muted-foreground">
                  <SettingsIcon className="mr-1.5 h-4 w-4" />
                  快速配置
                </Button>
              </Link>
              <Link href={`/workbench?date=${dateParam}`}>
                <Button variant="ink" size="sm">
                  <ClipboardPenLine className="mr-1.5 h-4 w-4" />
                  去记录
                </Button>
              </Link>
            </>
          }
        />

        {/* 备份提醒 */}
        <BackupAlert />

        <div className="space-y-4 sm720:space-y-6">
          {/* Hero — 今日热量平衡 */}
          <Card className="rounded-2xl border-border">
            <CardContent className="p-5 sm720:p-7">
              <div className="card-head">
                <div className="card-title-row">
                  <div className="card-title">今日热量平衡</div>
                </div>
              </div>

              {/* 段 1:双子卡 */}
              <div className="twin-row">
                <TodayWeightCard
                  variant="twin"
                  selectedDate={selectedDate}
                  todayWeight={dailyLog.weight}
                  defaultWeight={userProfile.weight}
                  targetWeight={userProfile.targetWeight}
                  disabled={!isUserProfileHydrated}
                  onSave={(weight) => {
                    commit({ kind: "setWeight", weight })
                    const updatedProfile = syncProfileWeightFromDailyLog(userProfile, weight)
                    if (updatedProfile !== userProfile) {
                      setUserProfile(updatedProfile)
                    }
                    setChartRefreshTrigger(prev => prev + 1)
                  }}
                />

                {tefCardState === "done" ? (
                  <div className={cn("twin tef", !tefFactorText && "empty")}>
                    <div className="twin-icon"><Zap /></div>
                    <div className="twin-body">
                      <div className="twin-label">AI 代谢提示</div>
                      {metabolicHint && (tefFactorText || metabolicHint.estimatedEffectCalories > 0) ? (
                        <>
                          <div className="twin-main">低置信度提示</div>
                          <div className="twin-sub">
                            {tefFactorText || `估算约 ${metabolicHint.estimatedEffectCalories} kcal`}
                            {" · 不增加预算"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="twin-main">未检测到提示</div>
                          <div className="twin-sub">仅作解释提示,不增加预算</div>
                        </>
                      )}
                    </div>
                  </div>
                ) : tefCardState === "running" ? (
                  <div className="twin tef">
                    <div className="twin-icon"><Loader2 className="animate-spin" /></div>
                    <div className="twin-body">
                      <div className="twin-label">AI 代谢提示</div>
                      <div className="twin-main">分析中…</div>
                      <div className="twin-sub">约 {tefAnalysisCountdown}s</div>
                    </div>
                  </div>
                ) : (
                  <div className="twin tef empty">
                    <div className="twin-icon"><Zap /></div>
                    <div className="twin-body">
                      <div className="twin-label">AI 代谢提示</div>
                      <div className="twin-main">未分析</div>
                      <div className="twin-sub">添加食物记录后自动分析</div>
                    </div>
                  </div>
                )}
              </div>

              {/* 段 2:大环 */}
              <div className="flex flex-col items-center pt-1 pb-4">
                <Ring
                  value={totalCaloriesConsumed}
                  max={dailyTotalExpenditure > 0 ? dailyTotalExpenditure : 1}
                  colorClass={heroVisual.ringColorClass}
                  diameter={160}
                  centerNum={
                    <div className="flex flex-col items-center leading-none">
                      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {heroVisual.centerTop}
                      </div>
                      <div className={cn("text-[30px] font-bold tabular-nums tracking-tight", heroVisual.centerColorClass)}>
                        {heroVisual.centerMain}
                      </div>
                      <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        kcal
                      </div>
                    </div>
                  }
                />
                <div className="ring-hint">{heroVisual.centerHint}</div>
              </div>

              {/* 段 3:横式公式条 */}
              <div className="formula">
                <div className="formula-cell">
                  <div className={cn("formula-num", heroVisual.formulaFirstClass)}>{heroVisual.formulaFirstNum}</div>
                  <div className="formula-label">{heroVisual.formulaFirstLabel}</div>
                </div>
                <div className="formula-op">=</div>
                <div className="formula-cell">
                  <div className={cn("formula-num", totalCaloriesConsumed > 0 ? "intake" : "mute")}>
                    {Math.round(totalCaloriesConsumed).toLocaleString()}
                  </div>
                  <div className="formula-label">摄入量</div>
                </div>
                <div className="formula-op">−</div>
                <div className="formula-cell">
                  <div className={cn("formula-num", baselineExpenditure > 0 ? "base" : "mute")}>
                    {baselineExpenditure > 0 ? Math.round(baselineExpenditure).toLocaleString() : "—"}
                  </div>
                  <div className="formula-label">基础消耗</div>
                </div>
                <div className="formula-op">−</div>
                <div className="formula-cell">
                  <div className={cn("formula-num", totalCaloriesBurned > 0 ? "activity" : "mute")}>
                    {Math.round(totalCaloriesBurned).toLocaleString()}
                  </div>
                  <div className="formula-label">已记录运动消耗</div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                单日估算用于当天饮食决策,体重变化请看多日趋势。
              </p>

              {/* 段 4:三宏微条 */}
              <div className="grid grid-cols-3 gap-3.5">
                <div className="macro-cell">
                  <div className="macro-top">
                    {Math.round(macros.carbs)}
                    {macroTargets.carbohydrates > 0 && <span className="target">/{macroTargets.carbohydrates} g</span>}
                    {macroTargets.carbohydrates === 0 && <span className="target"> g</span>}
                    {macroOver(macros.carbs, macroTargets.carbohydrates) && (
                      <span className="over">超 {Math.round(macros.carbs - macroTargets.carbohydrates)}g</span>
                    )}
                  </div>
                  <div className="hero-bar">
                    <i style={{ width: `${macroPctV2(macros.carbs, macroTargets.carbohydrates)}%`, background: macroOver(macros.carbs, macroTargets.carbohydrates) ? "hsl(var(--c-exercise))" : "hsl(var(--c-food))" }} />
                  </div>
                  <div className="macro-name">碳水化合物</div>
                </div>
                <div className="macro-cell">
                  <div className="macro-top">
                    {Math.round(macros.protein)}
                    {macroTargets.protein > 0 && <span className="target">/{macroTargets.protein} g</span>}
                    {macroTargets.protein === 0 && <span className="target"> g</span>}
                    {macroOver(macros.protein, macroTargets.protein) && (
                      <span className="over">超 {Math.round(macros.protein - macroTargets.protein)}g</span>
                    )}
                  </div>
                  <div className="hero-bar">
                    <i style={{ width: `${macroPctV2(macros.protein, macroTargets.protein)}%`, background: macroOver(macros.protein, macroTargets.protein) ? "hsl(var(--c-food))" : "hsl(var(--c-exercise))" }} />
                  </div>
                  <div className="macro-name">蛋白质</div>
                </div>
                <div className="macro-cell">
                  <div className="macro-top">
                    {Math.round(macros.fat)}
                    {macroTargets.fat > 0 && <span className="target">/{macroTargets.fat} g</span>}
                    {macroTargets.fat === 0 && <span className="target"> g</span>}
                    {macroOver(macros.fat, macroTargets.fat) && (
                      <span className="over">超 {Math.round(macros.fat - macroTargets.fat)}g</span>
                    )}
                  </div>
                  <div className="hero-bar">
                    <i style={{ width: `${macroPctV2(macros.fat, macroTargets.fat)}%`, background: macroOver(macros.fat, macroTargets.fat) ? "hsl(var(--c-exercise))" : "hsl(var(--c-status))" }} />
                  </div>
                  <div className="macro-name">脂肪</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {checkAIConfig() && isCurrentLogReady && (
            <WhatCanIEatCard
              dailyLog={dailyLog}
              userProfile={userProfile}
              aiConfig={aiConfig}
              budgetSnapshot={mealPlanBudgetSnapshot}
              suggestion={dailyLog.mealPlanSuggestion}
              workbenchHref={`/workbench?date=${dateParam}`}
              onSuggestionSave={handleMealPlanSuggestionSave}
            />
          )}

          {/* Card 3 — 今日恢复状态 (MuscleFatigueCard 自带 card chrome) */}
          <MuscleFatigueCard selectedDate={selectedDate} refreshTrigger={chartRefreshTrigger} />

          {/* Card 5 — 今日膳食 */}
          <Card className="rounded-2xl border-border">
            <CardContent className="p-5 sm720:p-7">
              <div className="card-head">
                <div className="card-title-row">
                  <Tile variant="food" size={36}>
                    <Utensils />
                  </Tile>
                  <div className="card-title">
                    今日膳食 · {dailyLog.foodEntries.length} 项 · {Math.round(totalCaloriesConsumed)} kcal
                  </div>
                </div>
                <Link href={`/workbench?date=${dateParam}`} className="card-action">
                  编辑 <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {dailyLog.foodEntries.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">今日暂无饮食记录</p>
              ) : (
                <div>
                  {(foodListExpanded
                    ? dailyLog.foodEntries
                    : dailyLog.foodEntries.slice(0, ENTRY_PREVIEW)
                  ).map((entry) => (
                    <FoodEntryCard key={entry.log_id} entry={entry} showActions={false} />
                  ))}
                  {dailyLog.foodEntries.length > ENTRY_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setFoodListExpanded((v) => !v)}
                      className="mt-2 flex w-full items-center justify-center gap-1 border-t border-dashed border-border pt-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {foodListExpanded
                        ? "收起"
                        : `展开剩余 ${dailyLog.foodEntries.length - ENTRY_PREVIEW} 项`}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${foodListExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 6 — 今日运动 */}
          <Card className="rounded-2xl border-border">
            <CardContent className="p-5 sm720:p-7">
              <div className="card-head">
                <div className="card-title-row">
                  <Tile variant="exercise" size={36}>
                    <Flame />
                  </Tile>
                  <div className="card-title">
                    今日运动 · {dailyLog.exerciseEntries.length} 项 · −{Math.round(totalCaloriesBurned)} kcal
                  </div>
                </div>
                <Link href={`/workbench?date=${dateParam}`} className="card-action">
                  编辑 <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {dailyLog.exerciseEntries.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">今日暂无运动记录</p>
              ) : (
                <div>
                  {(exerciseListExpanded
                    ? dailyLog.exerciseEntries
                    : dailyLog.exerciseEntries.slice(0, ENTRY_PREVIEW)
                  ).map((entry) => (
                    <ExerciseEntryCard key={entry.log_id} entry={entry} showActions={false} />
                  ))}
                  {dailyLog.exerciseEntries.length > ENTRY_PREVIEW && (
                    <button
                      type="button"
                      onClick={() => setExerciseListExpanded((v) => !v)}
                      className="mt-2 flex w-full items-center justify-center gap-1 border-t border-dashed border-border pt-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {exerciseListExpanded
                        ? "收起"
                        : `展开剩余 ${dailyLog.exerciseEntries.length - ENTRY_PREVIEW} 项`}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${exerciseListExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 7 — 每日状态 (只读) */}
          <DailyStatusSummary status={dailyLog.dailyStatus} />

          {/* Card 8 — AI 建议 */}
          <SmartSuggestions
            suggestions={resolvedSmartSuggestions?.suggestions}
            suggestionDate={resolvedSmartSuggestions?.date}
            suggestionDaysAgo={resolvedSmartSuggestions?.daysAgo}
            isLoading={smartSuggestionsLoading}
            onRefresh={() => generateSmartSuggestions(dailyLog.date)}
            currentDate={dailyLog.date}
            userProfile={userProfile}
            aiConfig={aiConfig}
          />

          {/* Card 9 — 管理图表 */}
          <ManagementCharts selectedDate={selectedDate} refreshTrigger={chartRefreshTrigger} />
        </div>

        {/* 免责声明 */}
        <div className="mt-12 border-t border-border pt-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              本应用基于AI技术，仅为您提供健康管理参考。请注意：AI分析可能存在偏差，特别是营养数据方面。您的健康很重要，在做出重要的饮食或运动决策前，建议咨询专业的医生、营养师或健身教练。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
