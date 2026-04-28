"use client"

import { CheckCircle2, Circle, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ReplaceExerciseDialog } from "@/components/workout/replace-exercise-dialog"
import { WorkoutSetNumberInput } from "@/components/workout/workout-set-number-input"
import { useTranslation } from "@/hooks/use-i18n"
import { MUSCLE_LABELS_ZH } from "@/lib/muscle-groups"
import { cn } from "@/lib/utils"
import type {
  WorkoutExercisePhase,
  WorkoutSessionExercise,
} from "@/lib/workout/types"

const PHASE_VARIANTS: Record<
  WorkoutExercisePhase,
  "secondary" | "default" | "outline"
> = {
  warmup: "secondary",
  main: "default",
  cooldown: "outline",
}

interface WorkoutExerciseCardProps {
  exercise: WorkoutSessionExercise
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

export function WorkoutExerciseCard({
  exercise,
  onUpdateSetValue,
  onCompleteSet,
  onReplaceExercise,
  onToggleSkipExercise,
}: WorkoutExerciseCardProps) {
  const t = useTranslation("workout")
  const displayName = exercise.actualExerciseName ?? exercise.plannedExerciseName
  const phase = exercise.phase ?? "main"
  const tips = exercise.tips ?? []
  const muscleLabels =
    exercise.plannedAnalysis.muscleGroups
      .map((muscle) => MUSCLE_LABELS_ZH[muscle] ?? muscle)
      .join(", ") || t("exercise.unknown")

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        exercise.isExerciseSkipped && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">{displayName}</h3>
            <Badge variant={PHASE_VARIANTS[phase]}>
              {t(`exercise.phase.${phase}`)}
            </Badge>
            {exercise.actualExerciseName && (
              <Badge variant="secondary">{t("exercise.replaced")}</Badge>
            )}
            {exercise.analysisStatus === "stale" && (
              <Badge variant="outline">{t("exercise.recalculate")}</Badge>
            )}
            {exercise.isExerciseSkipped && (
              <Badge variant="destructive">{t("exercise.skipped")}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("exercise.muscles")}: {muscleLabels}
          </p>
          {exercise.notes && (
            <p className="text-sm text-muted-foreground">{exercise.notes}</p>
          )}
          {tips.length > 0 && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {t("exercise.tips")}
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <ReplaceExerciseDialog
            displayName={displayName}
            onReplace={(name) => onReplaceExercise(exercise.exerciseId, name)}
          />
          <Button
            variant={exercise.isExerciseSkipped ? "secondary" : "outline"}
            size="sm"
            onClick={() =>
              onToggleSkipExercise(exercise.exerciseId, !exercise.isExerciseSkipped)
            }
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {exercise.isExerciseSkipped
              ? t("exercise.unskip")
              : t("exercise.skip")}
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {exercise.sets.map((set) => (
          <div
            key={set.setIndex}
            className={cn(
              "grid grid-cols-12 items-center gap-3 rounded-xl border p-3",
              set.isCompleted && "bg-green-50 dark:bg-green-950/20",
              set.isSkipped && "bg-muted",
            )}
          >
            <div className="col-span-2 font-medium">
              {t("exercise.setLabel", { index: set.setIndex })}
            </div>
            <div className="col-span-3 text-sm text-muted-foreground">
              {t("exercise.planned")} {set.plannedWeightKg ?? "-"} kg x{" "}
              {set.plannedReps ?? "-"}
            </div>
            <div className="col-span-3">
              <WorkoutSetNumberInput
                value={set.actualWeightKg}
                disabled={set.isCompleted || set.isSkipped}
                min={0}
                step={1.25}
                onCommit={(value) =>
                  onUpdateSetValue(
                    exercise.exerciseId,
                    set.setIndex,
                    "weight",
                    value,
                  )
                }
              />
            </div>
            <div className="col-span-2">
              <WorkoutSetNumberInput
                value={set.actualReps}
                disabled={set.isCompleted || set.isSkipped}
                min={1}
                step={1}
                integerOnly
                onCommit={(value) =>
                  onUpdateSetValue(
                    exercise.exerciseId,
                    set.setIndex,
                    "reps",
                    value,
                  )
                }
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <Button
                variant={set.isCompleted ? "secondary" : "default"}
                size="sm"
                disabled={set.isCompleted || set.isSkipped}
                onClick={() => onCompleteSet(exercise.exerciseId, set.setIndex)}
              >
                {set.isCompleted ? (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                ) : (
                  <Circle className="mr-2 h-4 w-4" />
                )}
                {set.isCompleted ? t("exercise.completed") : t("exercise.complete")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
