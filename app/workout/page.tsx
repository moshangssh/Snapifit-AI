"use client"

import { useCallback, useState } from "react"
import { format, subDays } from "date-fns"
import { Dumbbell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useWorkoutSessions } from "@/hooks/use-workout-sessions"
import { recalculateDailySummary } from "@/lib/daily-summary"
import type { AIConfig, DailyLog, UserProfile } from "@/lib/types"
import {
  completeWorkoutSet,
  createWorkoutSessionFromPlan,
  FALLBACK_STRENGTH_ANALYSIS,
  removeWorkoutSessionEntries,
  replaceWorkoutExercise,
  setWorkoutExerciseSkipped,
  updateWorkoutSetValue,
  workoutSessionToExerciseEntries,
} from "@/lib/workout/session"
import { buildWorkoutPlanContextSnapshot, getEffectiveUserWeightKg } from "@/lib/workout/context"
import type { WorkoutExerciseAnalysis, WorkoutSession } from "@/lib/workout/types"
import { WorkoutPlanWorkbench } from "@/components/workout/workout-plan-workbench"

const defaultUserProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "maintain",
  bmrFormula: "mifflin-st-jeor",
}

const defaultAIConfig: AIConfig = {
  agentModel: {
    name: "",
    baseUrl: "",
    apiKey: "",
  },
  chatModel: {
    name: "",
    baseUrl: "",
    apiKey: "",
  },
  visionModel: {
    name: "",
    baseUrl: "",
    apiKey: "",
  },
}

const emptySummary = {
  totalCaloriesConsumed: 0,
  totalCaloriesBurned: 0,
  macros: { carbs: 0, protein: 0, fat: 0 },
  micronutrients: {},
}

export default function WorkoutPage() {
  const { toast } = useToast()
  const [userProfile] = useLocalStorage<UserProfile>("userProfile", defaultUserProfile)
  const [aiConfig] = useLocalStorage<AIConfig>("aiConfig", defaultAIConfig)
  const { getData: getDailyLog, saveData: saveDailyLog } = useIndexedDB("healthLogs")
  const {
    activeSession,
    hasCompletedWorkout,
    getCompletedSessions,
    isReady,
    saveActiveSession,
    markSessionCompleted,
    abandonActiveSession,
  } = useWorkoutSessions()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const checkAIConfig = useCallback(() => {
    const model = aiConfig.agentModel
    if (!model.name || !model.baseUrl || !model.apiKey) {
      toast({
        title: "AI 配置不完整",
        description: "请先在设置页面配置工作模型。",
        variant: "destructive",
      })
      return false
    }
    return true
  }, [aiConfig.agentModel, toast])

  const loadRecentLogs = useCallback(async () => {
    const today = new Date()
    const keys = Array.from({ length: 14 }, (_, index) =>
      format(subDays(today, index), "yyyy-MM-dd"),
    )
    const logs = await Promise.all(
      keys.map((key) => getDailyLog(key) as Promise<DailyLog | null>),
    )
    return logs.filter((log): log is DailyLog => Boolean(log))
  }, [getDailyLog])

  const generatePlan = useCallback(async () => {
    if (!checkAIConfig()) return
    setIsGenerating(true)
    try {
      const now = new Date().toISOString()
      const recentLogs = await loadRecentLogs()
      const recentCompletedSessions = await getCompletedSessions(5)
      const effectiveUserWeightKg = getEffectiveUserWeightKg(recentLogs, userProfile)
      const planContext = buildWorkoutPlanContextSnapshot({
        now,
        userProfile,
        recentLogsByDateDesc: recentLogs,
        recentCompletedSessions,
      })

      const response = await fetch("/api/ai/workout-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-config": JSON.stringify(aiConfig),
        },
        body: JSON.stringify({
          effectiveUserWeightKg,
          userProfile,
          generatedAt: planContext.generatedAt,
          recentWorkoutSessionSummaries: planContext.recentWorkoutSessionSummaries,
          recentExerciseEntries: planContext.recentExerciseEntries,
          fatigueSnapshot: planContext.fatigueSnapshot,
        }),
      })

      if (!response.ok) {
        throw new Error(`workout-plan failed: ${response.status}`)
      }

      const plan = await response.json()
      const session = createWorkoutSessionFromPlan({
        sessionRole: hasCompletedWorkout ? "next" : "current",
        effectiveUserWeightKg,
        planContext,
        exercises: plan.exercises,
        now,
      })
      await saveActiveSession(session)
    } catch (error) {
      console.error(error)
      toast({
        title: "训练计划生成失败",
        description: "请稍后重试。",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }, [
    aiConfig,
    checkAIConfig,
    getCompletedSessions,
    hasCompletedWorkout,
    loadRecentLogs,
    saveActiveSession,
    toast,
    userProfile,
  ])

  const updateSession = useCallback(
    async (updater: (session: WorkoutSession) => WorkoutSession) => {
      if (!activeSession) return
      await saveActiveSession(updater(activeSession))
    },
    [activeSession, saveActiveSession],
  )

  const finishWorkout = useCallback(async () => {
    if (!activeSession) return
    setIsFinishing(true)
    try {
      const completedAt = activeSession.completedAt ?? new Date().toISOString()
      const isResumingFinish = activeSession.status === "finishing"
      const baseFinishingSession: WorkoutSession = {
        ...activeSession,
        status: "finishing",
        completedAt,
      }

      if (!isResumingFinish || !activeSession.completedAt) {
        await saveActiveSession(baseFinishingSession)
      }

      const exercises = isResumingFinish
        ? baseFinishingSession.exercises
        : await Promise.all(
            baseFinishingSession.exercises.map(async (exercise) => {
              if (exercise.analysisStatus !== "stale") return exercise
              const completedSets = exercise.sets.filter(
                (set) => !set.isSkipped && set.isCompleted,
              )
              if (completedSets.length === 0) {
                return {
                  ...exercise,
                  analysisStatus: "fallback" as const,
                  enrichedAnalysis: FALLBACK_STRENGTH_ANALYSIS,
                }
              }
              try {
                const avgWeightKg = average(
                  completedSets
                    .map((set) => set.actualWeightKg)
                    .filter((value): value is number => typeof value === "number"),
                )
                const avgReps = average(
                  completedSets
                    .map((set) => set.actualReps)
                    .filter((value): value is number => typeof value === "number"),
                )
                const response = await fetch("/api/ai/workout-exercise-enrich", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-ai-config": JSON.stringify(aiConfig),
                  },
                  body: JSON.stringify({
                    exerciseName: exercise.actualExerciseName ?? exercise.plannedExerciseName,
                    completedSets: completedSets.length,
                    avgWeightKg,
                    avgReps,
                    effectiveUserWeightKg: baseFinishingSession.effectiveUserWeightKg,
                    userGoal: userProfile.goal,
                  }),
                })
                if (!response.ok) throw new Error(`enrich failed: ${response.status}`)
                const analysis = (await response.json()) as WorkoutExerciseAnalysis
                return {
                  ...exercise,
                  analysisStatus: "enriched" as const,
                  enrichedAnalysis: analysis,
                }
              } catch {
                return {
                  ...exercise,
                  analysisStatus: "fallback" as const,
                  enrichedAnalysis: FALLBACK_STRENGTH_ANALYSIS,
                }
              }
            }),
          )

      const finishingSession: WorkoutSession = {
        ...baseFinishingSession,
        exercises,
      }

      if (!isResumingFinish) {
        await saveActiveSession(finishingSession)
      }

      const entries = workoutSessionToExerciseEntries(finishingSession, completedAt)
      const dateKey = format(
        new Date(finishingSession.startedAt ?? completedAt),
        "yyyy-MM-dd",
      )
      const existingLog = ((await getDailyLog(dateKey)) as DailyLog | null) ?? {
        date: dateKey,
        foodEntries: [],
        exerciseEntries: [],
        summary: emptySummary,
        activityLevel: userProfile.activityLevel,
      }
      const exerciseEntries = [
        ...removeWorkoutSessionEntries(
          existingLog.exerciseEntries,
          finishingSession.sessionId,
        ),
        ...entries,
      ]
      const updatedLogWithoutSummary: DailyLog = {
        ...existingLog,
        exerciseEntries,
      }
      const updatedLog: DailyLog = {
        ...updatedLogWithoutSummary,
        summary: recalculateDailySummary(updatedLogWithoutSummary),
      }

      await saveDailyLog(dateKey, updatedLog)
      await markSessionCompleted({
        ...finishingSession,
        status: "completed",
        completedAt,
      })
      toast({ title: "训练已完成", description: "结果已写入今日运动记录。" })
    } catch (error) {
      console.error(error)
      toast({
        title: "训练完成失败",
        description: "写入运动记录失败,请重试。",
        variant: "destructive",
      })
    } finally {
      setIsFinishing(false)
    }
  }, [
    activeSession,
    aiConfig,
    getDailyLog,
    markSessionCompleted,
    saveActiveSession,
    saveDailyLog,
    toast,
    userProfile.activityLevel,
    userProfile.goal,
  ])

  const abandonWorkout = useCallback(async () => {
    if (!activeSession || activeSession.status === "finishing") return
    await abandonActiveSession(activeSession)
    toast({
      title: "已放弃训练计划",
      description: "你可以重新生成一份新的训练计划。",
    })
  }, [abandonActiveSession, activeSession, toast])

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!activeSession) {
    const title = hasCompletedWorkout ? "下次训练计划" : "本次训练计划"
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-white p-10 text-center shadow-sm dark:from-emerald-950/30 dark:to-slate-950">
          <Dumbbell className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-4xl font-bold">{title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {"AI 会读取你的本地训练历史、肌肉疲劳和最近体重,生成一份可直接打卡的单次训练计划。"}
          </p>
          <Button className="mt-8" disabled={isGenerating} onClick={generatePlan}>
            {isGenerating ? "正在生成..." : `生成${""}`}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <WorkoutPlanWorkbench
      session={activeSession}
      isFinishing={isFinishing}
      onGeneratePlan={generatePlan}
      onFinishWorkout={finishWorkout}
      onAbandonWorkout={abandonWorkout}
      onUpdateSetValue={(exerciseId, setIndex, field, value) =>
        updateSession((session) =>
          updateWorkoutSetValue(session, exerciseId, setIndex, field, value),
        )
      }
      onCompleteSet={(exerciseId, setIndex) =>
        updateSession((session) =>
          completeWorkoutSet(
            session,
            exerciseId,
            setIndex,
            new Date().toISOString(),
          ),
        )
      }
      onReplaceExercise={(exerciseId, name) =>
        updateSession((session) => replaceWorkoutExercise(session, exerciseId, name))
      }
      onToggleSkipExercise={(exerciseId, isSkipped) =>
        updateSession((session) =>
          setWorkoutExerciseSkipped(session, exerciseId, isSkipped),
        )
      }
    />
  )
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}
