import type { MuscleGroup } from "@/lib/workout/engine/catalog"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

type ProgressionAction = "add_weight" | "maintain" | "reduce_reps" | "replace"

interface EvaluateProgressionOptions {
  primaryMuscle: MuscleGroup
  effectiveUserWeightKg: number
}

interface ProgressionResult {
  action: ProgressionAction
  weight: number
}

const LOWER_BODY_MUSCLES: MuscleGroup[] = [
  "QUADS",
  "GLUTES",
  "HAMSTRINGS",
  "CALVES",
]

function isLowerBody(primaryMuscle: MuscleGroup) {
  return LOWER_BODY_MUSCLES.includes(primaryMuscle)
}

function conservativeStartingWeightKg(
  primaryMuscle: MuscleGroup,
  effectiveUserWeightKg: number,
) {
  if (isLowerBody(primaryMuscle)) {
    return effectiveUserWeightKg * 0.5
  }

  if (primaryMuscle === "CORE") {
    return effectiveUserWeightKg * 0.2
  }

  if (
    primaryMuscle === "SHOULDERS" ||
    primaryMuscle === "BICEPS" ||
    primaryMuscle === "TRICEPS" ||
    primaryMuscle === "FOREARMS"
  ) {
    return effectiveUserWeightKg * 0.15
  }

  return effectiveUserWeightKg * 0.3
}

function incrementKg(primaryMuscle: MuscleGroup) {
  return isLowerBody(primaryMuscle) ? 2.5 : 1.25
}

function completedAllTargetReps(
  exercise: RecentWorkoutSessionSummary["exercises"][number],
) {
  const completedSets = (exercise.sets ?? []).filter(
    (set) => set.isCompleted && !set.isSkipped,
  )

  if (completedSets.length === 0) return false

  const requiredSets = Math.min(3, exercise.sets?.length ?? 3)
  if (completedSets.length < requiredSets) return false

  return completedSets
    .slice(0, requiredSets)
    .every(
      (set) =>
        typeof set.actualReps === "number" &&
        set.actualReps >= (set.plannedReps ?? 10),
    )
}

function latestCompletedWeightKg(
  exercise: RecentWorkoutSessionSummary["exercises"][number],
) {
  const completedWeights = (exercise.sets ?? [])
    .filter((set) => set.isCompleted && !set.isSkipped)
    .map((set) => set.actualWeightKg)
    .filter((weight): weight is number => typeof weight === "number")

  if (completedWeights.length === 0) return exercise.workingSetWeightKg

  return Math.max(...completedWeights)
}

export function evaluateProgression(
  history: RecentWorkoutSessionSummary[],
  exerciseId: string,
  options: EvaluateProgressionOptions,
): ProgressionResult {
  const fallbackWeight = conservativeStartingWeightKg(
    options.primaryMuscle,
    options.effectiveUserWeightKg,
  )
  const previousExercise = history
    .flatMap((session) => session.exercises)
    .find(
      (exercise) =>
        exercise.catalogExerciseId === exerciseId &&
        (exercise.phase === undefined || exercise.phase === "main") &&
        !exercise.wasSkipped &&
        !exercise.wasReplaced,
    )

  if (!previousExercise) {
    return {
      action: "maintain",
      weight: fallbackWeight,
    }
  }

  if (!completedAllTargetReps(previousExercise)) {
    return {
      action: "maintain",
      weight: latestCompletedWeightKg(previousExercise) ?? fallbackWeight,
    }
  }

  return {
    action: "add_weight",
    weight:
      (latestCompletedWeightKg(previousExercise) ?? fallbackWeight) +
      incrementKg(options.primaryMuscle),
  }
}
