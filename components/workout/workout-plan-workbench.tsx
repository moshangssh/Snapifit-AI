"use client"

import type { WorkoutSession } from "@/lib/workout/types"
import { canCompleteWorkoutSession } from "@/lib/workout/session"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { WorkoutExerciseCard } from "@/components/workout/workout-exercise-card"
import { useTranslation } from "@/hooks/use-i18n"

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
  const t = useTranslation("workout")
  const title =
    session.sessionRole === "next" && session.status === "draft"
      ? t("titleNext")
      : t("titleCurrent")
  const progress = Math.round(session.derived.exerciseCompletionRate * 100)
  const canFinish = canCompleteWorkoutSession(session)

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="rounded-3xl border bg-gradient-to-br from-emerald-50 to-white p-8 shadow-sm dark:from-emerald-950/30 dark:to-slate-950">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-muted-foreground">
          {t("setsProgress", {
            done: session.derived.completedSetCount,
            total: session.derived.totalSetCount,
          })}
        </p>
        <div className="mt-5">
          <Progress value={progress} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label={t("metrics.exerciseCount")} value={session.exercises.length} />
        <Metric label={t("metrics.setCount")} value={session.derived.totalSetCount} />
        <Metric label={t("metrics.completedSets")} value={session.derived.completedSetCount} />
        <Metric
          label={t("metrics.replacedExercises")}
          value={session.derived.replacedExerciseCount}
        />
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
            {t("finishHint")}
          </p>
          <Button disabled={!canFinish || isFinishing} onClick={onFinishWorkout}>
            {isFinishing ? t("finishing") : t("finish")}
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
