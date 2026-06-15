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
  plannedReps: number
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

function progressionExercises(
  history: RecentWorkoutSessionSummary[],
  exerciseId: string,
) {
  return [...history]
    .sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    )
    .flatMap((session) => session.exercises)
    .filter(
      (exercise) =>
        exercise.catalogExerciseId === exerciseId &&
        (exercise.phase === undefined || exercise.phase === "main") &&
        !exercise.wasSkipped &&
        !exercise.wasReplaced,
    )
}

function consecutiveFailuresAtWeight(
  exercises: RecentWorkoutSessionSummary["exercises"],
  weight: number,
) {
  let failures = 0

  for (const exercise of exercises) {
    if (latestCompletedWeightKg(exercise) !== weight) break
    if (completedAllTargetReps(exercise)) break

    failures += 1
  }

  return failures
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
  const exercises = progressionExercises(history, exerciseId)
  const previousExercise = exercises[0]

  if (!previousExercise) {
    return {
      action: "maintain",
      weight: fallbackWeight,
      plannedReps: 10,
    }
  }

  if (!completedAllTargetReps(previousExercise)) {
    const weight = latestCompletedWeightKg(previousExercise) ?? fallbackWeight
    const consecutiveFailures = consecutiveFailuresAtWeight(exercises, weight)

    return {
      action: consecutiveFailures >= 2 ? "reduce_reps" : "maintain",
      weight,
      plannedReps: consecutiveFailures >= 2 ? 8 : 10,
    }
  }

  return {
    action: "add_weight",
    weight:
      (latestCompletedWeightKg(previousExercise) ?? fallbackWeight) +
      incrementKg(options.primaryMuscle),
    plannedReps: 10,
  }
}
