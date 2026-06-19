import type { ExerciseMechanics, MuscleGroup } from "@/lib/workout/engine/catalog"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

type ProgressionAction = "add_weight" | "maintain" | "reduce_reps" | "replace"

interface EvaluateProgressionOptions {
  primaryMuscle: MuscleGroup
  mechanics: ExerciseMechanics
  effectiveUserWeightKg: number
}

interface ProgressionResult {
  action: ProgressionAction
  weight: number
  plannedReps: number
}

const REDUCE_REPS_FAILURE_THRESHOLD = 2
const REPLACE_FAILURE_THRESHOLD = 3
const NORMAL_REPS = 10
const REDUCED_REPS = 8
const WEIGHT_EPSILON = 0.01 // 10g tolerance for floating point comparison

const LOWER_BODY_MUSCLES: MuscleGroup[] = [
  "QUADS",
  "GLUTES",
  "HAMSTRINGS",
  "CALVES",
]

// Delts and arms: small muscles whose single-joint (isolation) work does not
// scale with body weight. A fixed light weight avoids the lateral-raise overshoot.
const SMALL_UPPER_MUSCLES: MuscleGroup[] = [
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
]

// Conservative absolute start for small-muscle upper-body isolation
// (侧平举/弯举/反向飞鸟). The engine never auto-reduces weight on failure — it
// reduces reps then replaces+blacklists — so an over-heavy start can blacklist a
// safe movement. Starting light is the safe default.
const ISOLATION_SMALL_UPPER_START_KG = 3

function isLowerBody(primaryMuscle: MuscleGroup) {
  return LOWER_BODY_MUSCLES.includes(primaryMuscle)
}

function conservativeStartingWeightKg(
  primaryMuscle: MuscleGroup,
  mechanics: ExerciseMechanics,
  effectiveUserWeightKg: number,
) {
  if (isLowerBody(primaryMuscle)) {
    return effectiveUserWeightKg * 0.5
  }

  if (primaryMuscle === "CORE") {
    return effectiveUserWeightKg * 0.2
  }

  if (SMALL_UPPER_MUSCLES.includes(primaryMuscle)) {
    // Isolation starts from a fixed light weight; compound presses
    // (器械肩推/坐姿下压机) are multi-joint and tolerate a body-weight share.
    return mechanics === "ISOLATION"
      ? ISOLATION_SMALL_UPPER_START_KG
      : effectiveUserWeightKg * 0.2
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
    const exerciseWeight = latestCompletedWeightKg(exercise)
    if (typeof exerciseWeight !== "number") break
    if (Math.abs(exerciseWeight - weight) > WEIGHT_EPSILON) break
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
    options.mechanics,
    options.effectiveUserWeightKg,
  )
  const exercises = progressionExercises(history, exerciseId)
  const previousExercise = exercises[0]

  if (!previousExercise) {
    return {
      action: "maintain",
      weight: fallbackWeight,
      plannedReps: NORMAL_REPS,
    }
  }

  if (previousExercise.discomfortFlag) {
    return {
      action: "replace",
      weight: fallbackWeight,
      plannedReps: NORMAL_REPS,
    }
  }

  if (!completedAllTargetReps(previousExercise)) {
    const weight = latestCompletedWeightKg(previousExercise)
    if (typeof weight !== "number") {
      return {
        action: "maintain",
        weight: fallbackWeight,
        plannedReps: NORMAL_REPS,
      }
    }
    const consecutiveFailures = consecutiveFailuresAtWeight(exercises, weight)
    const shouldReplace = consecutiveFailures >= REPLACE_FAILURE_THRESHOLD
    const shouldReduceReps = consecutiveFailures >= REDUCE_REPS_FAILURE_THRESHOLD

    return {
      action: shouldReplace
        ? "replace"
        : shouldReduceReps
          ? "reduce_reps"
          : "maintain",
      weight,
      plannedReps: shouldReduceReps ? REDUCED_REPS : NORMAL_REPS,
    }
  }

  const completedWeight = latestCompletedWeightKg(previousExercise)
  if (typeof completedWeight !== "number") {
    return {
      action: "maintain",
      weight: fallbackWeight,
      plannedReps: NORMAL_REPS,
    }
  }

  return {
    action: "add_weight",
    weight: completedWeight + incrementKg(options.primaryMuscle),
    plannedReps: NORMAL_REPS,
  }
}
