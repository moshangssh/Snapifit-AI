"use client"

import { format } from "date-fns"
import {
  CalendarDays,
  CheckCheck,
  Dumbbell,
  Sigma,
} from "lucide-react"
import type { WorkoutSession } from "@/lib/workout/types"
import { canCompleteWorkoutSession } from "@/lib/workout/session"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"
import { Tile } from "@/components/ui/tile"
import { AbandonWorkoutDialog } from "@/components/workout/abandon-workout-dialog"
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card"
import { MUSCLE_LABELS_ZH } from "@/lib/muscle-groups"

interface WorkoutPlanWorkbenchProps {
  session: WorkoutSession
  isFinishing: boolean
  onFinishWorkout: () => void
  onAbandonWorkout: () => void
  onUpdateSetValue: (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: number,
  ) => void
  onCompleteSet: (exerciseId: string, setIndex: number) => void
  onReplaceExercise: (exerciseId: string, name: string) => void
  onToggleDiscomfortFlag: (exerciseId: string, discomfortFlag: boolean) => void
  onToggleSkipExercise: (exerciseId: string, isSkipped: boolean) => void
}

export function WorkoutPlanWorkbench({
  session,
  isFinishing,
  onFinishWorkout,
  onAbandonWorkout,
  onUpdateSetValue,
  onCompleteSet,
  onReplaceExercise,
  onToggleDiscomfortFlag,
  onToggleSkipExercise,
}: WorkoutPlanWorkbenchProps) {
  const title =
    session.sessionRole === "next" && session.status === "draft"
      ? "下次训练计划"
      : "本次训练计划"
  const progress = Math.round(session.derived.exerciseCompletionRate * 100)
  const canFinish = canCompleteWorkoutSession(session)
  const statusLabel = getStatusLabel(session.status)
  const focusLabel = getFocusLabel(session)
  const completedExerciseCount = session.exercises.filter(isExerciseDone).length
  const activeExerciseId =
    session.status === "draft"
      ? undefined
      : session.exercises.find((exercise) => !isExerciseDone(exercise))?.exerciseId
  const totalVolumeKg = calculateCompletedVolumeKg(session)
  const estimatedCalories = Math.round(
    session.exercises.reduce(
      (sum, exercise) =>
        exercise.isExerciseSkipped
          ? sum
          : sum + exercise.plannedAnalysis.caloriesBurnedEstimated,
      0,
    ),
  )
  const subtitle = `${formatDateLabel(session.startedAt ?? session.createdAt)} · ${statusLabel} · ${focusLabel}`
  const elapsedLabel = getElapsedLabel(session.startedAt, session.status)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 pb-16 sm720:px-9 sm720:py-7">
        <header className="mb-6 flex flex-col gap-4 sm720:flex-row sm720:items-end sm720:justify-between">
          <div>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight">
              训练
            </h1>
            <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AbandonWorkoutDialog
              disabled={isFinishing || session.status === "finishing"}
              onConfirm={onAbandonWorkout}
            />
            <Button
              variant="ink"
              size="sm"
              disabled={!canFinish || isFinishing}
              onClick={onFinishWorkout}
            >
              <CheckCheck className="mr-1.5 h-4 w-4" />
              {isFinishing ? "正在写入..." : "完成训练"}
            </Button>
          </div>
        </header>

        <Card className="mb-4 rounded-2xl border-border shadow-none hover:shadow-none">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-4 sm720:gap-[18px]">
              <Tile variant="exercise" size={44}>
                <Dumbbell />
              </Tile>
              <div className="min-w-[220px] flex-1">
                <h2 className="text-[22px] font-bold leading-tight tracking-tight">
                  {title}
                </h2>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  {focusLabel} · AI 计划
                </div>
              </div>
              <div className="text-left sm720:text-right">
                <div className="text-[22px] font-bold leading-tight tracking-tight tabular-nums">
                  {completedExerciseCount}
                  <small className="ml-1 text-xs font-medium text-muted-foreground">
                    /{session.exercises.length} 动作
                  </small>
                </div>
                <div className="text-[13px] text-muted-foreground">{elapsedLabel}</div>
              </div>
            </div>
            <ProgressBar
              value={progress}
              colorClass="bg-foreground"
              className="my-4 h-2"
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
              <span>
                <b className="font-semibold text-foreground">
                  {session.derived.completedSetCount}
                </b>{" "}
                组完成
              </span>
              <span className="hidden sm720:inline">·</span>
              <span>
                累计{" "}
                <b className="font-semibold text-foreground tabular-nums">
                  {formatNumber(totalVolumeKg)}
                </b>{" "}
                kg · 容量
              </span>
              <span className="hidden sm720:inline">·</span>
              <span>
                预计消耗{" "}
                <b className="font-semibold text-c-exercise tabular-nums">
                  -{formatNumber(estimatedCalories)}
                </b>{" "}
                kcal
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
          <div className="space-y-3">
            {session.exercises.map((exercise) => (
              <WorkoutExerciseCard
                key={exercise.exerciseId}
                exercise={exercise}
                isCurrent={exercise.exerciseId === activeExerciseId}
                onUpdateSetValue={onUpdateSetValue}
                onCompleteSet={onCompleteSet}
                onReplaceExercise={onReplaceExercise}
                onToggleDiscomfortFlag={onToggleDiscomfortFlag}
                onToggleSkipExercise={onToggleSkipExercise}
              />
            ))}
          </div>

          <aside className="flex flex-col gap-4">
            <Card className="rounded-2xl border-border shadow-none hover:shadow-none">
              <CardContent className="p-5">
                <div className="card-head">
                  <div className="card-title-row">
                    <Tile variant="purple" size={32}>
                      <Sigma />
                    </Tile>
                    <div className="card-title flex items-center gap-2">
                      本次肌群容量
                      <span className="stamp border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]">
                        待实现
                      </span>
                    </div>
                  </div>
                  <span className="tag">
                    完成 {session.derived.completedSetCount} 组 /{" "}
                    {session.derived.totalSetCount} 组
                  </span>
                </div>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  此功能仍在开发中
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border shadow-none hover:shadow-none">
              <CardContent className="p-5">
                <div className="card-head">
                  <div className="card-title-row">
                    <Tile variant="indigo" size={32}>
                      <CalendarDays />
                    </Tile>
                    <div className="card-title">近 4 次训练</div>
                  </div>
                  <span className="card-action">历史</span>
                </div>
                <p className="py-6 text-center text-sm text-muted-foreground">
                  暂无历史记录
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          所有未跳过组完成后即可结束训练。
        </p>
      </div>
    </div>
  )
}

function getStatusLabel(status: WorkoutSession["status"]) {
  if (status === "draft") return "未开始"
  if (status === "active") return "进行中"
  if (status === "finishing") return "写入中"
  if (status === "completed") return "已完成"
  return "已放弃"
}

function getFocusLabel(session: WorkoutSession) {
  const counts = new Map<string, number>()
  session.exercises.forEach((exercise) => {
    exercise.plannedAnalysis.muscleGroups.forEach((muscle) => {
      counts.set(muscle, (counts.get(muscle) ?? 0) + 1)
    })
  })

  const labels = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([muscle]) => MUSCLE_LABELS_ZH[muscle as keyof typeof MUSCLE_LABELS_ZH])
    .filter(Boolean)

  return labels.length > 0 ? labels.join(" · ") : "全身训练"
}

function isExerciseDone(exercise: WorkoutSession["exercises"][number]) {
  return (
    exercise.isExerciseSkipped ||
    exercise.sets.every((set) => set.isSkipped || set.isCompleted)
  )
}

function calculateCompletedVolumeKg(session: WorkoutSession) {
  return session.exercises.reduce((exerciseTotal, exercise) => {
    const setTotal = exercise.sets.reduce((sum, set) => {
      if (!set.isCompleted || set.isSkipped) return sum
      return sum + (set.actualWeightKg ?? 0) * (set.actualReps ?? 0)
    }, 0)
    return exerciseTotal + setTotal
  }, 0)
}

function getElapsedLabel(startedAt: string | undefined, status: WorkoutSession["status"]) {
  if (!startedAt || status === "draft") return "未开始"
  const elapsedMinutes = Math.max(
    1,
    Math.round((Date.now() - new Date(startedAt).getTime()) / 60000),
  )
  if (Number.isNaN(elapsedMinutes)) return "进行中"
  return `已进行 ${elapsedMinutes} 分钟`
}

function formatDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "今天"
  return format(date, "yyyy 年 M 月 d 日")
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)
}
