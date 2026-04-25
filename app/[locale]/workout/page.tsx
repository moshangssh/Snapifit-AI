"use client"

import { useCallback, useState } from "react"
import { format, subDays } from "date-fns"
import { Dumbbell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useIndexedDB } from "@/hooks/use-indexed-db"
import { useTranslation } from "@/hooks/use-i18n"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { useWorkoutSessions } from "@/hooks/use-workout-sessions"
import type { AIConfig, DailyLog, UserProfile } from "@/lib/types"
import {
  completeWorkoutSet,
  createWorkoutSessionFromPlan,
  FALLBACK_STRENGTH_ANALYSIS,
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
}

const emptySummary = {
  totalCaloriesConsumed: 0,
  totalCaloriesBurned: 0,
  macros: { carbs: 0, protein: 0, fat: 0 },
  micronutrients: {},
}

export default function WorkoutPage() {
  const { toast } = useToast()
  const t = useTranslation("workout")
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
  } = useWorkoutSessions()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)

  const checkAIConfig = useCallback(() => {
    const model = aiConfig.agentModel
    if (!model.name || !model.baseUrl || !model.apiKey) {
      toast({
        title: t("aiConfigErrorTitle"),
        description: t("aiConfigErrorDesc"),
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
        title: t("generateErrorTitle"),
        description: t("generateErrorDesc"),
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
      const completedAt = new Date().toISOString()

      // H1: enrich 阶段在重试场景下不能重复触发,因此一旦 status 已经是 finishing,
      // 直接复用已经持久化的 enrichedAnalysis,跳过 enrich 调用,
      // 让重试只重做 saveDailyLog + markSessionCompleted。
      const isResumingFinish = activeSession.status === "finishing"

      const exercises = isResumingFinish
        ? activeSession.exercises
        : await Promise.all(
            activeSession.exercises.map(async (exercise) => {
              if (exercise.analysisStatus !== "stale") return exercise
              const completedSets = exercise.sets.filter(
                (set) => !set.isSkipped && set.isCompleted,
              )
              // H2: 没有任何完成组时直接 fallback,不调 enrich(后端会拒绝 0 组输入)
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
                    effectiveUserWeightKg: activeSession.effectiveUserWeightKg,
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
        ...activeSession,
        status: "finishing",
        exercises,
      }

      // H1: 把 enriched 状态先持久化到 active session,即使后续 saveDailyLog/markCompleted 失败,
      // 重试时也能从 finishing 状态直接走 idempotent 写入路径。
      if (!isResumingFinish) {
        await saveActiveSession(finishingSession)
      }

      const entries = workoutSessionToExerciseEntries(finishingSession, completedAt)
      // L3: 日期键采用本地时区,跨日训练归到 startedAt 的本地日期,与 useDateRecords 一致
      const dateKey = format(new Date(activeSession.startedAt ?? completedAt), "yyyy-MM-dd")
      const existingLog = ((await getDailyLog(dateKey)) as DailyLog | null) ?? {
        date: dateKey,
        foodEntries: [],
        exerciseEntries: [],
        summary: emptySummary,
        activityLevel: userProfile.activityLevel,
      }
      // M4: 不再在此处局部重算 summary。dashboard 中的 recalculateSummary 是页面级闭包,无法外部调用;
      // 这里只追加 exerciseEntries,让 dashboard 在后续触达时按需重算 summary。
      const updatedLog: DailyLog = {
        ...existingLog,
        exerciseEntries: [...existingLog.exerciseEntries, ...entries],
      }

      await saveDailyLog(dateKey, updatedLog)
      await markSessionCompleted({
        ...finishingSession,
        status: "completed",
        completedAt,
      })
      toast({ title: t("finishSuccessTitle"), description: t("finishSuccessDesc") })
    } catch (error) {
      console.error(error)
      toast({
        title: t("finishErrorTitle"),
        description: t("finishErrorDesc"),
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
    t,
    toast,
    userProfile.activityLevel,
    userProfile.goal,
  ])

  if (!isReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!activeSession) {
    const title = hasCompletedWorkout ? t("titleNext") : t("titleCurrent")
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-white p-10 text-center shadow-sm dark:from-emerald-950/30 dark:to-slate-950">
          <Dumbbell className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 text-4xl font-bold">{title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            {t("subtitle")}
          </p>
          <Button className="mt-8" disabled={isGenerating} onClick={generatePlan}>
            {isGenerating ? t("generating") : t("generate", { title })}
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
