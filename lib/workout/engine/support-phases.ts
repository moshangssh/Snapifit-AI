import {
  EXERCISES_BY_ID,
  resolveMuscleKeys,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import { AS_UNLOCKED_LABEL, unlockedRiskCategoryOf } from "@/lib/workout/engine/as-safety"
import {
  selectASCore,
  selectExercises,
  type ASCoreFocus,
} from "@/lib/workout/engine/selection"
import type {
  WorkoutExerciseAnalysis,
  WorkoutExercisePhase,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"

const UPPER_MUSCLES = new Set<MuscleGroup>([
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
])

function analysis(
  exercise: Exercise,
  phase: WorkoutExercisePhase,
  effectiveUserWeightKg: number,
): WorkoutExerciseAnalysis {
  const setCount = 1
  const exerciseType = exercise.tags.includes("AS_CORE")
    ? "flexibility"
    : "strength"
  const estimatedMets = exerciseType === "strength" ? 3 : 2
  const estimatedDurationMinutes = phase === "warmup" ? 2 : 3

  return {
    exerciseType,
    muscleGroups: resolveMuscleKeys(exercise),
    estimatedMets,
    estimatedDurationMinutes,
    caloriesBurnedEstimated: Math.round(
      (estimatedMets * effectiveUserWeightKg * estimatedDurationMinutes) / 60,
    ),
    isEstimated: true,
  }
}

function inferFocus(mainExercises: WorkoutPlanExerciseDraft[]): ASCoreFocus {
  const catalogExercises = mainExercises
    .map((exercise) =>
      exercise.catalogExerciseId
        ? EXERCISES_BY_ID.get(exercise.catalogExerciseId)
        : undefined,
    )
    .filter((exercise): exercise is Exercise => exercise !== undefined)
  const upperCount = catalogExercises.filter((exercise) =>
    UPPER_MUSCLES.has(exercise.primaryMuscle),
  ).length

  return upperCount >= catalogExercises.length - upperCount ? "upper" : "lower"
}

function mainMuscles(mainExercises: WorkoutPlanExerciseDraft[]): MuscleGroup[] {
  return Array.from(
    new Set(
      mainExercises
        .map((exercise) =>
          exercise.catalogExerciseId
            ? EXERCISES_BY_ID.get(exercise.catalogExerciseId)?.primaryMuscle
            : undefined,
        )
        .filter((muscle): muscle is MuscleGroup => muscle !== undefined),
    ),
  ).slice(0, 2)
}

function draftFromExercise(input: {
  exercise: Exercise
  phase: WorkoutExercisePhase
  effectiveUserWeightKg: number
  unlockedRiskCategories?: readonly string[]
}): WorkoutPlanExerciseDraft {
  const isASCore = input.exercise.tags.includes("AS_CORE")
  const unlockedRisk = unlockedRiskCategoryOf(
    input.exercise,
    input.unlockedRiskCategories,
  )
  const labels = [
    ...(isASCore ? ["AS"] : []),
    ...(unlockedRisk ? [AS_UNLOCKED_LABEL] : []),
  ]

  return {
    plannedExerciseName: input.exercise.name,
    phase: input.phase,
    notes:
      input.phase === "warmup"
        ? "服务于本次主训练的准备和活动度。"
        : "服务于本次主训练后的恢复和放松。",
    tips: ["保持动作可控。", "出现不适就降低幅度或停止。"],
    labels: labels.length > 0 ? labels : undefined,
    catalogExerciseId: input.exercise.id,
    sets: [
      {
        plannedWeightKg: isASCore ? undefined : 5,
        plannedReps: 12,
      },
    ],
    plannedAnalysis: analysis(
      input.exercise,
      input.phase,
      input.effectiveUserWeightKg,
    ),
  }
}

export function buildSupportPhaseExercises(input: {
  mainExercises: WorkoutPlanExerciseDraft[]
  effectiveUserWeightKg: number
  blacklist?: readonly string[]
  offset?: number
  unlockedRiskCategories?: readonly string[]
}): WorkoutPlanExerciseDraft[] {
  const offset = input.offset ?? 0
  const focus = inferFocus(input.mainExercises)
  const blocked = [
    ...(input.blacklist ?? []),
    ...input.mainExercises
      .map((exercise) => exercise.catalogExerciseId)
      .filter((id): id is string => typeof id === "string"),
  ]
  const muscles = mainMuscles(input.mainExercises)
  const warmupAS = selectASCore({
    focus,
    blacklist: input.blacklist,
    count: 2,
    offset,
  })
  const cooldownAS = selectASCore({
    focus,
    blacklist: input.blacklist,
    count: 2,
    offset: offset + 1,
  })

  function supportForPhase(phase: WorkoutExercisePhase) {
    return muscles.flatMap((muscle, index) =>
      selectExercises({
        muscle,
        count: 1,
        offset: offset + index,
        excludeIds: [
          ...blocked,
          ...warmupAS.map((exercise) => exercise.id),
          ...cooldownAS.map((exercise) => exercise.id),
        ],
        unlockedRiskCategories: input.unlockedRiskCategories,
      }),
    ).slice(0, 2).map((exercise) =>
      draftFromExercise({
        exercise,
        phase,
        effectiveUserWeightKg: input.effectiveUserWeightKg,
        unlockedRiskCategories: input.unlockedRiskCategories,
      }),
    )
  }

  return [
    ...warmupAS.map((exercise) =>
      draftFromExercise({
        exercise,
        phase: "warmup",
        effectiveUserWeightKg: input.effectiveUserWeightKg,
        unlockedRiskCategories: input.unlockedRiskCategories,
      }),
    ),
    ...supportForPhase("warmup"),
    ...input.mainExercises,
    ...cooldownAS.map((exercise) =>
      draftFromExercise({
        exercise,
        phase: "cooldown",
        effectiveUserWeightKg: input.effectiveUserWeightKg,
        unlockedRiskCategories: input.unlockedRiskCategories,
      }),
    ),
    ...supportForPhase("cooldown"),
  ]
}
