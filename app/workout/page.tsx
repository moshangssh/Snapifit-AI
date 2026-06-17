"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { format, subDays } from "date-fns"
import { Dumbbell, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Tile } from "@/components/ui/tile"
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
  setWorkoutExerciseDiscomfortFlag,
  setWorkoutExerciseSkipped,
  updateWorkoutSetValue,
  workoutSessionToExerciseEntries,
} from "@/lib/workout/session"
import {
  confirmBenchmarkSelection,
  confirmLifetimeBenchmarkSelection,
} from "@/lib/workout/engine/adaptive-engine"
import type { BenchmarkCandidateDetail } from "@/lib/workout/engine/benchmark-selection"
import {
  DEFAULT_TRAINING_STATE,
  readTrainingState,
  recordCompletedTrainingSession,
  setExerciseBlacklisted,
  writeTrainingState,
} from "@/lib/workout/engine/training-state"
import { buildWorkoutPlanContextSnapshot, getEffectiveUserWeightKg } from "@/lib/workout/context"
import type { WorkoutExerciseAnalysis, WorkoutSession } from "@/lib/workout/types"
import { WorkoutPlanWorkbench } from "@/components/workout/workout-plan-workbench"
import { BenchmarkSelectionCard } from "@/components/workout/benchmark-selection-card"

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
  const [trainingState, setTrainingState] = useState(DEFAULT_TRAINING_STATE)
  const [benchmarkCandidates, setBenchmarkCandidates] = useState<
    BenchmarkCandidateDetail[]
  >([])
  const [selectedBenchmarkIds, setSelectedBenchmarkIds] = useState<string[]>([])

  useEffect(() => {
    setTrainingState(readTrainingState())
  }, [])

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
        },
        body: JSON.stringify({
          effectiveUserWeightKg,
          userProfile,
          generatedAt: planContext.generatedAt,
          recentWorkoutSessionSummaries: planContext.recentWorkoutSessionSummaries,
          recentExerciseEntries: planContext.recentExerciseEntries,
          fatigueSnapshot: planContext.fatigueSnapshot,
          trainingState: readTrainingState(),
        }),
      })

      if (!response.ok) {
        throw new Error(`workout-plan failed: ${response.status}`)
      }

      const plan = await response.json()
      if (plan.needBenchmarkSelection) {
        writeTrainingState(plan.trainingState)
        setTrainingState(plan.trainingState)
        const candidates = (plan.benchmarkCandidates ??
          []) as BenchmarkCandidateDetail[]
        const nextPhase = plan.nextPhase as "intermediate" | "advanced"
        setBenchmarkCandidates(candidates)
        setSelectedBenchmarkIds(
          nextPhase === "advanced"
            ? candidates.slice(0, 5).map((candidate) => candidate.id)
            : candidates.map((candidate) => candidate.id),
        )

        const reasonMessages: Record<string, string> = {
          novice_session_threshold: "你已完成 72 次新手训练",
          novice_stalled_exercises: "检测到 4 个动作进展停滞",
          intermediate_session_threshold: "你已完成 240 次中级训练",
          manual_downgrade_upgrade_window: "手动降级的恢复期已结束",
        }

        toast({
          title:
            nextPhase === "advanced" ? "准备进入高级阶段" : "准备进入中级阶段",
          description: `${reasonMessages[plan.reason] || "满足阶段转换条件"}，请选择${
            nextPhase === "advanced" ? "终生" : "中级"
          }基准动作。`,
        })
        return
      }

      const currentState = readTrainingState()
      const mergedState = {
        ...plan.trainingState,
        blacklistedExerciseIds: [
          ...new Set([
            ...currentState.blacklistedExerciseIds,
            ...plan.trainingState.blacklistedExerciseIds,
          ]),
        ],
      }
      writeTrainingState(mergedState)
      setTrainingState(mergedState)
      const session = createWorkoutSessionFromPlan({
        sessionRole: hasCompletedWorkout ? "next" : "current",
        effectiveUserWeightKg,
        planContext,
        exercises: plan.exercises,
        now,
        templateIndex: plan.templateIndex,
        phase: plan.phase,
        isDeload: plan.isDeload,
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
    getCompletedSessions,
    hasCompletedWorkout,
    loadRecentLogs,
    saveActiveSession,
    toast,
    userProfile,
  ])

  const confirmBenchmarks = useCallback(() => {
    const isAdvancedSelection = trainingState.phase === "intermediate"
    const nextState = isAdvancedSelection
      ? confirmLifetimeBenchmarkSelection(trainingState, selectedBenchmarkIds)
      : confirmBenchmarkSelection(trainingState, selectedBenchmarkIds)
    writeTrainingState(nextState)
    setTrainingState(nextState)
    setBenchmarkCandidates([])
    setSelectedBenchmarkIds([])
    toast({
      title: isAdvancedSelection ? "已进入高级阶段" : "已进入中级阶段",
      description: `${selectedBenchmarkIds.length} 个${
        isAdvancedSelection ? "终生" : ""
      }基准动作已保存。`,
    })
  }, [trainingState, selectedBenchmarkIds, toast])

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
      const currentState = readTrainingState()
      const updatedState = recordCompletedTrainingSession(currentState)
      writeTrainingState(updatedState)
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
      <WorkoutPageChrome subtitle="正在读取本地训练状态">
        <Card className="rounded-2xl border-border shadow-none hover:shadow-none">
          <CardContent className="flex min-h-[40vh] items-center justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </WorkoutPageChrome>
    )
  }

  if (!activeSession) {
    const title = hasCompletedWorkout ? "下次训练计划" : "本次训练计划"

    if (benchmarkCandidates.length > 0) {
      return (
        <WorkoutPageChrome subtitle="确定性训练引擎会根据你的课次状态生成本次模板">
          <BenchmarkSelectionCard
            candidates={benchmarkCandidates}
            selectedIds={selectedBenchmarkIds}
            nextPhase={
              trainingState.phase === "intermediate" ? "advanced" : "intermediate"
            }
            onSelectedIdsChange={setSelectedBenchmarkIds}
            onConfirm={confirmBenchmarks}
          />
        </WorkoutPageChrome>
      )
    }

    return (
      <WorkoutPageChrome subtitle="确定性训练引擎会根据你的课次状态生成本次模板">
        <Card className="rounded-2xl border-border shadow-none hover:shadow-none">
          <CardContent className="flex flex-col items-center gap-5 p-10 text-center sm720:p-14">
            <Tile variant="exercise" size={44}>
              <Dumbbell />
            </Tile>
            <div className="space-y-2">
              <h2 className="text-[22px] font-bold tracking-tight">{title}</h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {"训练引擎会读取本地课次状态和训练上下文,生成一份可直接打卡的单次训练计划。"}
              </p>
            </div>
            <Button variant="ink" disabled={isGenerating} onClick={generatePlan}>
              {isGenerating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isGenerating ? "正在生成..." : "生成训练计划"}
            </Button>
          </CardContent>
        </Card>
      </WorkoutPageChrome>
    )
  }

  return (
    <WorkoutPlanWorkbench
      session={activeSession}
      isFinishing={isFinishing}
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
      onToggleDiscomfortFlag={(exerciseId, discomfortFlag) => {
        const exercise = activeSession.exercises.find(
          (item) => item.exerciseId === exerciseId,
        )
        if (exercise?.catalogExerciseId) {
          const nextState = setExerciseBlacklisted(
            trainingState,
            exercise.catalogExerciseId,
            discomfortFlag,
          )
          writeTrainingState(nextState)
          setTrainingState(nextState)
        }
        updateSession((session) =>
          setWorkoutExerciseDiscomfortFlag(
            session,
            exerciseId,
            discomfortFlag,
          ),
        )
      }}
      onToggleSkipExercise={(exerciseId, isSkipped) =>
        updateSession((session) =>
          setWorkoutExerciseSkipped(session, exerciseId, isSkipped),
        )
      }
    />
  )
}

function WorkoutPageChrome({
  subtitle,
  children,
}: {
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 pb-16 sm720:px-9 sm720:py-7">
        <PageHeader title="训练" subtitle={subtitle} />
        {children}
      </div>
    </div>
  )
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}
