import type { Exercise, MuscleGroup } from "@/lib/workout/engine/catalog"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

export type BenchmarkTrainingGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "legs"
  | "arms"
  | "core"

export interface ExerciseProgress {
  initialWeightKg?: number
  latestPrWeightKg?: number
  progressWeightKg: number
}

export interface BenchmarkCandidateDetail extends ExerciseProgress {
  id: string
  name: string
  trainingGroup: BenchmarkTrainingGroup
  trainingCount: number
}

const REQUIRED_GROUPS: BenchmarkTrainingGroup[] = [
  "chest",
  "back",
  "shoulders",
  "legs",
  "arms",
  "core",
]

const TRAINING_GROUP_BY_MUSCLE: Record<MuscleGroup, BenchmarkTrainingGroup> = {
  CHEST: "chest",
  BACK: "back",
  SHOULDERS: "shoulders",
  QUADS: "legs",
  GLUTES: "legs",
  HAMSTRINGS: "legs",
  CALVES: "legs",
  BICEPS: "arms",
  TRICEPS: "arms",
  FOREARMS: "arms",
  CORE: "core",
}

export function calculateProgress(
  history: RecentWorkoutSessionSummary[],
  exerciseId: string,
): ExerciseProgress {
  const weights = history
    .flatMap((session) => session.exercises)
    .filter(
      (exercise) =>
        exercise.catalogExerciseId === exerciseId &&
        !exercise.wasSkipped &&
        exercise.completedSets > 0,
    )
    .map((exercise) => exercise.workingSetWeightKg)
    .filter((weight): weight is number => typeof weight === "number")

  if (weights.length === 0) {
    return { progressWeightKg: 0 }
  }

  const initialWeightKg = weights[0]
  const latestPrWeightKg = Math.max(...weights)

  return {
    initialWeightKg,
    latestPrWeightKg,
    progressWeightKg: roundWeight(latestPrWeightKg - initialWeightKg),
  }
}

export interface BenchmarkCandidateOptions {
  /**
   * 是否仅从带 NOVICE_CORE 标签的动作中筛选候选。
   * 新手→中级转换时为 true（基准动作必须来自新手核心池）；
   * 中级→高级转换时为 false（候选池已由调用方限定为用户的中级基准动作）。
   * @default true
   */
  requireNoviceCore?: boolean
}

export function selectBenchmarkCandidates(
  history: RecentWorkoutSessionSummary[],
  novicePool: readonly Exercise[],
  options: BenchmarkCandidateOptions = {},
): string[] {
  return getBenchmarkCandidateDetails(history, novicePool, options).map(
    (candidate) => candidate.id,
  )
}

export function getBenchmarkCandidateDetails(
  history: RecentWorkoutSessionSummary[],
  novicePool: readonly Exercise[],
  options: BenchmarkCandidateOptions = {},
): BenchmarkCandidateDetail[] {
  const details = buildCandidateDetails(history, novicePool, options)
  const selected: BenchmarkCandidateDetail[] = []

  for (const group of REQUIRED_GROUPS) {
    const groupCandidate = details
      .filter((candidate) => candidate.trainingGroup === group)
      .sort(compareByFrequencyThenProgress)[0]

    if (groupCandidate) selected.push(groupCandidate)
  }

  const selectedIds = new Set(selected.map((candidate) => candidate.id))
  const remainingByProgress = details
    .filter((candidate) => !selectedIds.has(candidate.id))
    .sort(compareByProgressThenFrequency)

  for (const candidate of remainingByProgress) {
    if (selected.length >= 10) break
    selected.push(candidate)
    selectedIds.add(candidate.id)
  }

  return selected
}

function buildCandidateDetails(
  history: RecentWorkoutSessionSummary[],
  novicePool: readonly Exercise[],
  options: BenchmarkCandidateOptions = {},
): BenchmarkCandidateDetail[] {
  const requireNoviceCore = options.requireNoviceCore ?? true

  return novicePool
    .filter(
      (exercise) =>
        !requireNoviceCore || exercise.tags.includes("NOVICE_CORE"),
    )
    .map((exercise) => {
      const progress = calculateProgress(history, exercise.id)
      return {
        id: exercise.id,
        name: exercise.name,
        trainingGroup: TRAINING_GROUP_BY_MUSCLE[exercise.primaryMuscle],
        trainingCount: countCompletedAppearances(history, exercise.id),
        ...progress,
      }
    })
}

function countCompletedAppearances(
  history: RecentWorkoutSessionSummary[],
  exerciseId: string,
): number {
  return history.reduce(
    (count, session) =>
      count +
      session.exercises.filter(
        (exercise) =>
          exercise.catalogExerciseId === exerciseId &&
          !exercise.wasSkipped &&
          exercise.completedSets > 0,
      ).length,
    0,
  )
}

function compareByFrequencyThenProgress(
  a: BenchmarkCandidateDetail,
  b: BenchmarkCandidateDetail,
): number {
  return (
    b.trainingCount - a.trainingCount ||
    b.progressWeightKg - a.progressWeightKg ||
    a.name.localeCompare(b.name, "zh-CN")
  )
}

function compareByProgressThenFrequency(
  a: BenchmarkCandidateDetail,
  b: BenchmarkCandidateDetail,
): number {
  return (
    b.progressWeightKg - a.progressWeightKg ||
    b.trainingCount - a.trainingCount ||
    a.name.localeCompare(b.name, "zh-CN")
  )
}

function roundWeight(weight: number): number {
  return Math.round(weight * 100) / 100
}
