"use client"

import type { WorkoutSession } from "@/lib/workout/types"
import { canCompleteWorkoutSession } from "@/lib/workout/session"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card"

interface WorkoutPlanWorkbenchProps {
  session: WorkoutSession
  isFinishing: boolean
  onGeneratePlan: () => void
  onFinishWorkout: () => void
  onUpdateSetValue: (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: number,
  ) => void
  onCompleteSet: (exerciseId: string, setIndex: number) => void
  onReplaceExercise: (exerciseId: string, name: string) => void
  onToggleSkipExercise: (exerciseId: string, isSkipped: boolean) => void
}

export function WorkoutPlanWorkbench({
  session,
  isFinishing,
  onFinishWorkout,
  onUpdateSetValue,
  onCompleteSet,
  onReplaceExercise,
  onToggleSkipExercise,
}: WorkoutPlanWorkbenchProps) {
  const title =
    session.sessionRole === "next" && session.status === "draft"
      ? "下次训练计划"
      : "本次训练计划"
  const progress = Math.round(session.derived.exerciseCompletionRate * 100)
  const canFinish = canCompleteWorkoutSession(session)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-white p-8 shadow-sm dark:from-emerald-950/30 dark:to-slate-950">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Smart Workout
        </p>
        <h1 className="mt-2 text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-muted-foreground">
          {session.derived.completedSetCount} / {session.derived.totalSetCount} 组已完成
        </p>
        <div className="mt-5">
          <Progress value={progress} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="动作" value={session.exercises.length} />
        <Metric label="总组数" value={session.derived.totalSetCount} />
        <Metric label="已完成" value={session.derived.completedSetCount} />
        <Metric label="已替换" value={session.derived.replacedExerciseCount} />
      </div>

      <div className="space-y-5">
        {session.exercises.map((exercise) => (
          <WorkoutExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            onUpdateSetValue={onUpdateSetValue}
            onCompleteSet={onCompleteSet}
            onReplaceExercise={onReplaceExercise}
            onToggleSkipExercise={onToggleSkipExercise}
          />
        ))}
      </div>

      <footer className="sticky bottom-4 rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">
            所有未跳过组完成后即可结束训练。
          </p>
          <Button disabled={!canFinish || isFinishing} onClick={onFinishWorkout}>
            {isFinishing ? "正在写入训练结果..." : "完成训练"}
          </Button>
        </div>
      </footer>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
