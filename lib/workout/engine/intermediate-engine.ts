import {
  STRENGTH_EXERCISES,
  findVariants,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type {
  RecentWorkoutSessionSummary,
  WorkoutExerciseAnalysis,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"
import type { MuscleKey } from "@/lib/muscle-groups"

type TemplateName = "上A" | "下A" | "上B" | "下B" | "上C" | "下C"
type IntermediateBlock = "accumulation" | "intensification" | "deload"

export interface GeneratedIntermediateWorkoutPlan {
  templateIndex: number
  templateName: TemplateName
  phase: "intermediate"
  isDeload: boolean
  trainingState: TrainingState
  exercises: WorkoutPlanExerciseDraft[]
}

interface TemplateDefinition {
  name: TemplateName
  mainMuscles: MuscleGroup[]
}

const TEMPLATES: TemplateDefinition[] = [
  { name: "上A", mainMuscles: ["CHEST", "SHOULDERS", "TRICEPS", "BICEPS"] },
  { name: "下A", mainMuscles: ["QUADS", "GLUTES", "CORE"] },
  { name: "上B", mainMuscles: ["BACK", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"] },
  { name: "下B", mainMuscles: ["QUADS", "GLUTES", "CORE"] },
  { name: "上C", mainMuscles: ["CHEST", "BACK", "SHOULDERS", "TRICEPS"] },
  { name: "下C", mainMuscles: ["QUADS", "GLUTES", "CORE"] },
]

const EXERCISES_BY_ID = new Map(
  STRENGTH_EXERCISES.map((exercise) => [exercise.id, exercise]),
)

const MUSCLE_MAP: Record<MuscleGroup, MuscleKey[]> = {
  CHEST: ["chest"],
  BACK: ["upper-back"],
  SHOULDERS: ["front-deltoids"],
  QUADS: ["quadriceps"],
  GLUTES: ["glutes"],
  HAMSTRINGS: ["hamstrings"],
  BICEPS: ["biceps"],
  TRICEPS: ["triceps"],
  CORE: ["abs"],
  FOREARMS: ["forearms"],
  CALVES: ["calves"],
}

function analysis(
  muscle: MuscleGroup,
  setCount: number,
  effectiveUserWeightKg: number,
): WorkoutExerciseAnalysis {
  const estimatedDurationMinutes = setCount * 3

  return {
    exerciseType: "strength",
    muscleGroups: MUSCLE_MAP[muscle],
    estimatedMets: 5,
    estimatedDurationMinutes,
    caloriesBurnedEstimated: Math.round(
      (5 * effectiveUserWeightKg * estimatedDurationMinutes) / 60,
    ),
    isEstimated: true,
  }
}

function plannedWeightKg(exercise: Exercise) {
  switch (exercise.primaryMuscle) {
    case "CHEST":
    case "BACK":
      return 25
    case "QUADS":
    case "GLUTES":
      return 35
    case "SHOULDERS":
    case "BICEPS":
    case "TRICEPS":
      return 10
    case "CORE":
      return 15
    default:
      return 10
  }
}

function draftMainExercise(
  exercise: Exercise,
  effectiveUserWeightKg: number,
  options: {
    plannedReps: number
    plannedWeightKg: number
    setCount?: number
  },
): WorkoutPlanExerciseDraft {
  const setCount = options.setCount ?? 3

  return {
    plannedExerciseName: exercise.name,
    phase: "main",
    notes: "中级块状周期主训练动作。",
    tips: ["保持动作可控。", "完成目标次数后按块内规则渐进。"],
    catalogExerciseId: exercise.id,
    sets: Array.from({ length: setCount }, () => ({
      plannedWeightKg: options.plannedWeightKg,
      plannedReps: options.plannedReps,
    })),
    plannedAnalysis: analysis(
      exercise.primaryMuscle,
      setCount,
      effectiveUserWeightKg,
    ),
  }
}

function latestCompletedExercise(
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
    .find(
      (exercise) =>
        exercise.catalogExerciseId === exerciseId &&
        (exercise.phase === undefined || exercise.phase === "main") &&
        !exercise.wasSkipped &&
        !exercise.wasReplaced,
    )
}

function completedTargetReps(
  summary: ReturnType<typeof latestCompletedExercise>,
  targetReps: number,
): boolean {
  if (!summary) return false

  const sets = summary.sets ?? []
  if (sets.length > 0) {
    const completedSets = sets.filter((set) => set.isCompleted && !set.isSkipped)

    return (
      completedSets.length >= 3 &&
      completedSets.every((set) => (set.actualReps ?? 0) >= targetReps)
    )
  }

  return (
    summary.completedSets >= 3 && (summary.workingSetReps ?? 0) >= targetReps
  )
}

function latestWeightKg(
  summary: ReturnType<typeof latestCompletedExercise>,
): number | undefined {
  if (!summary) return undefined

  const setWeights = (summary.sets ?? [])
    .filter((set) => set.isCompleted && !set.isSkipped)
    .map((set) => set.actualWeightKg)
    .filter((weight): weight is number => typeof weight === "number")

  return setWeights.length > 0
    ? Math.max(...setWeights)
    : summary.workingSetWeightKg
}

function incrementKg(exercise: Exercise): number {
  return ["QUADS", "GLUTES", "HAMSTRINGS", "CALVES"].includes(
    exercise.primaryMuscle,
  )
    ? 1
    : 0.5
}

function roundToHalfKg(weight: number): number {
  return Math.round(weight * 2) / 2
}

function plannedAccumulationWeightKg(
  exercise: Exercise,
  history: RecentWorkoutSessionSummary[],
): number {
  const latest = latestCompletedExercise(history, exercise.id)
  const latestWeight = latestWeightKg(latest)

  if (typeof latestWeight === "number" && completedTargetReps(latest, 10)) {
    return roundToHalfKg(latestWeight + incrementKg(exercise))
  }

  return roundToHalfKg(latestWeight ?? plannedWeightKg(exercise))
}

function blockForSession(blockSessionIndex: number): IntermediateBlock {
  if (blockSessionIndex < 18) return "accumulation"
  if (blockSessionIndex < 36) return "intensification"
  return "deload"
}

function plannedIntensificationWeightKg(
  exercise: Exercise,
  history: RecentWorkoutSessionSummary[],
): number {
  const latest = latestCompletedExercise(history, exercise.id)
  const latestWeight = latestWeightKg(latest)

  if (typeof latestWeight !== "number") {
    return roundToHalfKg(plannedWeightKg(exercise) * 1.1)
  }

  if ((latest?.workingSetReps ?? 0) === 6 && completedTargetReps(latest, 6)) {
    return roundToHalfKg(latestWeight + incrementKg(exercise))
  }

  return roundToHalfKg(latestWeight * 1.1)
}

function plannedDeloadWeightKg(
  exercise: Exercise,
  history: RecentWorkoutSessionSummary[],
): number {
  const latest = latestCompletedExercise(history, exercise.id)
  const latestWeight = latestWeightKg(latest) ?? plannedWeightKg(exercise)

  return roundToHalfKg(latestWeight * 0.7)
}

function benchmarkPool(state: TrainingState): Exercise[] {
  return (state.benchmarkExerciseIds ?? [])
    .map((id) => EXERCISES_BY_ID.get(id))
    .filter((exercise): exercise is Exercise => exercise !== undefined)
}

function selectBenchmarksForTemplate(
  template: TemplateDefinition,
  state: TrainingState,
  offset: number,
): Exercise[] {
  const pool = benchmarkPool(state).filter(
    (exercise) => !state.blacklistedExerciseIds.includes(exercise.id),
  )
  const selected: Exercise[] = []

  for (const [slotIndex, muscle] of template.mainMuscles.entries()) {
    const candidates = pool.filter(
      (exercise) =>
        exercise.primaryMuscle === muscle &&
        !selected.some((item) => item.id === exercise.id),
    )
    const fallback = pool.filter(
      (exercise) => !selected.some((item) => item.id === exercise.id),
    )
    const source = candidates.length > 0 ? candidates : fallback
    const exercise = source[(offset + slotIndex) % source.length]

    if (exercise) selected.push(exercise)
  }

  return selected
}

function intermediateVariantPool(state: TrainingState): Exercise[] {
  const blocked = new Set([
    ...state.blacklistedExerciseIds,
    ...(state.benchmarkExerciseIds ?? []),
  ])
  const variantsById = new Map<string, Exercise>()
  const pool = STRENGTH_EXERCISES.filter((exercise) =>
    exercise.tags.includes("INTERMEDIATE_VARIANT"),
  )

  for (const benchmark of benchmarkPool(state)) {
    for (const variant of findVariants(benchmark, pool, [...blocked])) {
      variantsById.set(variant.id, variant)
    }
  }

  return [...variantsById.values()]
}

function selectVariantsForTemplate(
  template: TemplateDefinition,
  state: TrainingState,
  offset: number,
): Exercise[] {
  const pool = intermediateVariantPool(state)
  const selected: Exercise[] = []

  for (const [slotIndex, muscle] of template.mainMuscles.entries()) {
    const candidates = pool.filter(
      (exercise) =>
        exercise.primaryMuscle === muscle &&
        !selected.some((item) => item.id === exercise.id),
    )
    const fallback = pool.filter(
      (exercise) => !selected.some((item) => item.id === exercise.id),
    )
    const source = candidates.length > 0 ? candidates : fallback
    const exercise = source[(offset + slotIndex) % source.length]

    if (exercise) selected.push(exercise)
  }

  return selected
}

function usesBenchmarkExercises(blockSessionIndex: number): boolean {
  return (
    blockSessionIndex < 6 ||
    (blockSessionIndex >= 18 && blockSessionIndex < 24) ||
    blockSessionIndex >= 36
  )
}

export function generateSession(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  } = {},
): GeneratedIntermediateWorkoutPlan {
  const effectiveUserWeightKg = options.effectiveUserWeightKg ?? 70
  const recentWorkoutSessionSummaries =
    options.recentWorkoutSessionSummaries ?? []
  const sessionsSinceIntermediateStart = Math.max(
    0,
    state.completedSessionCount - 72,
  )
  const templateIndex = sessionsSinceIntermediateStart % TEMPLATES.length
  const blockSessionIndex = sessionsSinceIntermediateStart % 42
  const block = blockForSession(blockSessionIndex)
  const template = TEMPLATES[templateIndex]
  const rotationOffset = Math.floor(sessionsSinceIntermediateStart / TEMPLATES.length)
  const selectedExercises = usesBenchmarkExercises(blockSessionIndex)
    ? selectBenchmarksForTemplate(template, state, rotationOffset)
    : selectVariantsForTemplate(template, state, rotationOffset)
  const nextSessionNumber = state.completedSessionCount + 1
  const blockStartSession = nextSessionNumber - blockSessionIndex
  const mainExercises = selectedExercises.map((exercise) =>
    draftMainExercise(exercise, effectiveUserWeightKg, {
      plannedReps: block === "accumulation" ? 10 : 6,
      setCount: block === "deload" ? 2 : 3,
      plannedWeightKg:
        block === "accumulation"
          ? plannedAccumulationWeightKg(exercise, recentWorkoutSessionSummaries)
          : block === "intensification"
            ? plannedIntensificationWeightKg(
                exercise,
                recentWorkoutSessionSummaries,
              )
            : plannedDeloadWeightKg(exercise, recentWorkoutSessionSummaries),
    }),
  )

  return {
    templateIndex,
    templateName: template.name,
    phase: "intermediate",
    isDeload: block === "deload",
    trainingState: {
      ...state,
      currentBlock: block,
      blockStartSession,
    },
    exercises: mainExercises,
  }
}
