"use client"

import { useRef } from "react"
import { Check, Circle, Minus, SkipForward, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiscomfortFlagDialog } from "@/components/workout/discomfort-flag-dialog"
import { ExerciseGuideDialog } from "@/components/workout/exercise-guide-dialog"
import { ReplaceExerciseDialog } from "@/components/workout/replace-exercise-dialog"
import { WorkoutSetNumberInput } from "@/components/workout/workout-set-number-input"
import { MUSCLE_LABELS_ZH } from "@/lib/muscle-groups"
import { cn } from "@/lib/utils"
import { getWorkoutExerciseLabels } from "@/lib/workout/exercise-labels"
import { getExerciseGuide } from "@/lib/workout/exercise-guide"
import type {
  WorkoutExercisePhase,
  WorkoutSessionExercise,
  WorkoutSessionSet,
} from "@/lib/workout/types"

const PHASE_LABELS: Record<WorkoutExercisePhase, string> = {
  warmup: "热身",
  main: "主训练",
  cooldown: "收尾",
}

const SET_REPS_INPUT_CLASS =
  "h-[18px] w-8 border-0 bg-transparent p-0 text-[15px] font-bold leading-none shadow-none ring-offset-0 [appearance:textfield] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

const SET_WEIGHT_INPUT_CLASS =
  "h-[14px] w-10 border-0 bg-transparent p-0 text-[11px] leading-none shadow-none ring-offset-0 [appearance:textfield] focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-100 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

// 卡片上「动作指南」摘要：技巧/常见错误各取前几条；完整内容留待后续切片的指南 Dialog
const GUIDE_SUMMARY_LIMIT = 3

// 替换/自由文本动作的 tips 会被清空（session 置 []）。AS 安全提醒须常驻，
// 缺省时回退到这条通用安全句，避免「注意事项」渲染成只有标题的空盒子——
// 用户脱离处方时恰恰最需要这条提醒。
const AS_SAFETY_FALLBACK_TIP = "出现不适就降低幅度或停止。"

interface WorkoutExerciseCardProps {
  exercise: WorkoutSessionExercise
  isCurrent: boolean
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

export function WorkoutExerciseCard({
  exercise,
  isCurrent,
  onUpdateSetValue,
  onCompleteSet,
  onReplaceExercise,
  onToggleDiscomfortFlag,
  onToggleSkipExercise,
}: WorkoutExerciseCardProps) {
  const displayName = exercise.actualExerciseName ?? exercise.plannedExerciseName
  const phase = exercise.phase ?? "main"
  const engineTips = exercise.tips ?? []
  const safetyTips =
    engineTips.length > 0 ? engineTips : [AS_SAFETY_FALLBACK_TIP]
  const guide = getExerciseGuide(exercise)
  const guideTips = guide?.tips.slice(0, GUIDE_SUMMARY_LIMIT) ?? []
  const guideMistakes =
    guide?.commonMistakes.slice(0, GUIDE_SUMMARY_LIMIT) ?? []
  const labels = getWorkoutExerciseLabels(exercise)
  const isDone = isExerciseDone(exercise)
  const statusLabel = getExerciseStatusLabel(exercise, isCurrent, isDone)
  const currentSet = exercise.sets.find(
    (set) => !set.isSkipped && !set.isCompleted,
  )
  const muscleLabels =
    exercise.plannedAnalysis.muscleGroups
      .map((muscle) => MUSCLE_LABELS_ZH[muscle] ?? muscle)
      .join(", ") || "待识别"

  return (
    <section
      className={cn(
        "rounded-[14px] border border-border bg-card p-4",
        isCurrent && !isDone && "border-foreground",
        isDone && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="m-0 min-w-0 text-[15px] font-semibold leading-snug">
              {displayName}
            </h3>
            {labels.map((label) => (
              <span
                key={label}
                className="shrink-0 rounded-full border border-[hsl(var(--c-ai)/0.35)] bg-[hsl(var(--c-ai)/0.08)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-c-ai"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {PHASE_LABELS[phase]} · {exercise.sets.length} 组
            {exercise.actualExerciseName ? " · 已替换" : ""}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            getStatusClassName(exercise, isCurrent, isDone),
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        目标肌群:
        <b className="ml-1 font-medium text-foreground/80">{muscleLabels}</b>
      </div>
      {exercise.notes && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {exercise.notes}
        </p>
      )}
      {/* AS 安全提醒：无条件渲染、视觉独立置顶（来自引擎 tips，绝不被指南内容替换） */}
      <div className="mt-3 rounded-lg border border-[hsl(var(--c-ai)/0.22)] bg-[hsl(var(--c-ai)/0.06)] px-3 py-2">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-c-ai">
          <Zap className="h-3 w-3" />
          注意事项
        </div>
        <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-foreground/80">
          {safetyTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* 动作指南内联摘要：仅当该动作能在 catalog 查到源内容时渲染（无源内容只剩上方 AS 提醒） */}
      {guide && (
        <div className="mt-2 rounded-lg border border-border bg-[var(--surface-subtle)] px-3 py-2">
          <p className="m-0 text-xs leading-relaxed text-foreground/80">
            {guide.description}
          </p>
          {guideTips.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                技巧
              </div>
              <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-foreground/80">
                {guideTips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          {guideMistakes.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                常见错误
              </div>
              <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed text-foreground/80">
                {guideMistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
        {exercise.sets.map((set) => (
          <WorkoutSetCard
            key={set.setIndex}
            exerciseId={exercise.exerciseId}
            set={set}
            isActive={isCurrent && currentSet?.setIndex === set.setIndex}
            onUpdateSetValue={onUpdateSetValue}
            onCompleteSet={onCompleteSet}
          />
        ))}
      </div>

      {!isDone && (
        <div className="mt-3 flex flex-wrap gap-2">
          {currentSet && (
            <Button
              variant="ink"
              size="sm"
              className="text-xs"
              onClick={() => onCompleteSet(exercise.exerciseId, currentSet.setIndex)}
            >
              <Circle className="mr-1.5 h-3.5 w-3.5" />
              完成本组
            </Button>
          )}
          <ReplaceExerciseDialog
            displayName={displayName}
            onReplace={(name) => onReplaceExercise(exercise.exerciseId, name)}
          />
          <DiscomfortFlagDialog
            displayName={displayName}
            isMarked={exercise.discomfortFlag ?? false}
            onConfirm={() =>
              onToggleDiscomfortFlag(
                exercise.exerciseId,
                !exercise.discomfortFlag,
              )
            }
          />
          <Button
            variant={exercise.isExerciseSkipped ? "secondary" : "bare"}
            size="sm"
            className="text-xs"
            onClick={() =>
              onToggleSkipExercise(exercise.exerciseId, !exercise.isExerciseSkipped)
            }
          >
            <SkipForward className="mr-1.5 h-4 w-4" />
            {exercise.isExerciseSkipped ? "取消跳过" : "跳过"}
          </Button>
          {/* 动作指南按钮：仅当查表有内联内容时显示（与替换/感觉不对/跳过同排同风格）。
              guide 非空已蕴含 catalogExerciseId 存在（见 getExerciseGuide），此处 catalogExerciseId
              判断仅用于把可选类型收窄为 string，满足 Dialog 的 prop，并非额外业务条件。 */}
          {guide && exercise.catalogExerciseId && (
            <ExerciseGuideDialog
              catalogExerciseId={exercise.catalogExerciseId}
              displayName={displayName}
              guide={guide}
              muscleLabels={muscleLabels}
            />
          )}
        </div>
      )}
    </section>
  )
}

function WorkoutSetCard({
  exerciseId,
  set,
  isActive,
  onUpdateSetValue,
  onCompleteSet,
}: {
  exerciseId: string
  set: WorkoutSessionSet
  isActive: boolean
  onUpdateSetValue: WorkoutExerciseCardProps["onUpdateSetValue"]
  onCompleteSet: WorkoutExerciseCardProps["onCompleteSet"]
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const weight = set.actualWeightKg ?? set.plannedWeightKg
  const reps = set.actualReps ?? set.plannedReps
  const showWeight = typeof weight === "number" && weight > 0
  const isStatic = set.isCompleted || set.isSkipped

  const focusFirstInput = () => {
    const input = cardRef.current?.querySelector<HTMLInputElement>(
      'input[type="number"]',
    )
    input?.focus()
    input?.select()
  }

  const handlePipClick = () => {
    if (!isStatic) {
      onCompleteSet(exerciseId, set.setIndex)
    }
  }

  const pipState: SetPipState = set.isCompleted
    ? "completed"
    : set.isSkipped
      ? "skipped"
      : isActive
        ? "active"
        : "pending"

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label={`第 ${set.setIndex} 组`}
      className={cn(
        "relative min-h-[72px] min-w-[112px] shrink-0 overflow-hidden rounded-[10px] border border-border bg-[var(--surface-subtle)] text-xs transition-colors duration-150",
        isActive && !isStatic && "border-2 border-foreground bg-card",
        set.isCompleted && "border-foreground bg-foreground text-background",
        set.isSkipped && "bg-muted text-muted-foreground",
      )}
    >
      {!isStatic && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          className="absolute inset-0 cursor-text"
          onClick={focusFirstInput}
        />
      )}

      <button
        type="button"
        onClick={handlePipClick}
        disabled={isStatic}
        aria-label={getPipAriaLabel(pipState, set.setIndex)}
        aria-pressed={set.isCompleted}
        className={cn(
          "absolute right-0 top-0 z-20 grid h-9 w-9 place-items-center rounded-bl-[10px] rounded-tr-[10px] transition-colors",
          !isStatic && "hover:bg-black/[0.04] focus-visible:bg-black/[0.04]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground focus-visible:ring-offset-0",
          isStatic && "cursor-default",
        )}
      >
        <SetStatusPip state={pipState} />
      </button>

      <div
        className={cn(
          "relative z-10 flex h-full min-h-[72px] flex-col justify-center px-3 py-2 pr-9",
          !isStatic && "pointer-events-none",
        )}
      >
        {isStatic ? (
          <>
            <div className="flex items-baseline gap-1 leading-tight">
              <span className="text-[15px] font-bold tabular-nums">
                {reps ?? "-"}
              </span>
              <span className="text-[11px] opacity-70">次</span>
            </div>
            {showWeight && (
              <div className="mt-0.5 text-[11px] opacity-70 tabular-nums">
                {weight ?? "-"} kg
              </div>
            )}
          </>
        ) : (
          <>
            <div className="pointer-events-auto flex items-baseline gap-1 leading-tight">
              <WorkoutSetNumberInput
                value={reps}
                disabled={set.isCompleted || set.isSkipped}
                min={1}
                step={1}
                integerOnly
                className={SET_REPS_INPUT_CLASS}
                onCommit={(value) =>
                  onUpdateSetValue(exerciseId, set.setIndex, "reps", value)
                }
              />
              <span className="text-[11px] text-muted-foreground">次</span>
            </div>
            {showWeight && (
              <div className="pointer-events-auto mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <WorkoutSetNumberInput
                  value={weight}
                  disabled={set.isCompleted || set.isSkipped}
                  min={0}
                  step={1.25}
                  className={SET_WEIGHT_INPUT_CLASS}
                  onCommit={(value) =>
                    onUpdateSetValue(exerciseId, set.setIndex, "weight", value)
                  }
                />
                <span>kg</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

type SetPipState = "pending" | "active" | "completed" | "skipped"

function SetStatusPip({ state }: { state: SetPipState }) {
  if (state === "completed") {
    return <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
  }
  if (state === "skipped") {
    return <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
  }
  return (
    <Circle
      className={cn(
        "h-3.5 w-3.5",
        state === "active" ? "text-foreground" : "text-muted-foreground/55",
      )}
      strokeWidth={state === "active" ? 2 : 1.75}
    />
  )
}

function getPipAriaLabel(state: SetPipState, setIndex: number) {
  const prefix = `第 ${setIndex} 组`
  if (state === "completed") return `${prefix},已完成`
  if (state === "skipped") return `${prefix},已跳过`
  if (state === "active") return `${prefix},标记为完成`
  return `${prefix},标记为完成`
}

function isExerciseDone(exercise: WorkoutSessionExercise) {
  return (
    exercise.isExerciseSkipped ||
    exercise.sets.every((set) => set.isSkipped || set.isCompleted)
  )
}

function getExerciseStatusLabel(
  exercise: WorkoutSessionExercise,
  isCurrent: boolean,
  isDone: boolean,
) {
  if (exercise.isExerciseSkipped) return "已跳过"
  if (isDone) return "完成"
  if (isCurrent) return "进行中"
  return "待进行"
}

function getStatusClassName(
  exercise: WorkoutSessionExercise,
  isCurrent: boolean,
  isDone: boolean,
) {
  if (exercise.isExerciseSkipped) return "bg-destructive text-destructive-foreground"
  if (isDone) return "bg-c-weight text-white"
  if (isCurrent) return "bg-foreground text-background"
  return "bg-black/5 text-foreground/80"
}
