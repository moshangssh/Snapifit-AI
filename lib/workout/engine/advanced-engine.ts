import {
  EXERCISES_BY_ID,
  MUSCLE_MAP,
  STRENGTH_EXERCISES,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import {
  ADVANCED_SESSION_START,
  calculateDeloadParams,
  shouldAdvancedDeload,
} from "@/lib/workout/engine/deload"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type {
  RecentWorkoutSessionSummary,
  WorkoutExerciseAnalysis,
  WorkoutPlanContextSnapshot,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"

type TemplateName =
  | "力量上"
  | "力量下"
  | "肌肥大上"
  | "肌肥大下"
  | "耐力上"
  | "耐力下"
type TrainingType = "strength" | "hypertrophy" | "endurance"

export interface GeneratedAdvancedWorkoutPlan {
  templateIndex: number
  templateName: TemplateName
  phase: "advanced"
  isDeload: boolean
  trainingState: TrainingState
  exercises: WorkoutPlanExerciseDraft[]
}

interface TemplateDefinition {
  name: TemplateName
  trainingType: TrainingType
  mainMuscles: MuscleGroup[]
}

interface TrainingTypeConfig {
  plannedReps: number
  rpe: 7 | 8 | 9
  repRange: [number, number]
  /** 训练类型对应的 MET 估值：力量组间歇长（约 6），耐力持续负荷高（约 4） */
  mets: number
}

// ADVANCED_SESSION_START is imported from deload.ts (the canonical source)
const TEMPLATES: TemplateDefinition[] = [
  {
    name: "力量上",
    trainingType: "strength",
    mainMuscles: ["CHEST", "BACK", "SHOULDERS", "TRICEPS"],
  },
  {
    name: "力量下",
    trainingType: "strength",
    mainMuscles: ["QUADS", "GLUTES", "CORE"],
  },
  {
    name: "肌肥大上",
    trainingType: "hypertrophy",
    mainMuscles: ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"],
  },
  {
    name: "肌肥大下",
    trainingType: "hypertrophy",
    mainMuscles: ["QUADS", "GLUTES", "HAMSTRINGS", "CORE"],
  },
  {
    name: "耐力上",
    trainingType: "endurance",
    mainMuscles: ["CHEST", "BACK", "SHOULDERS", "BICEPS"],
  },
  {
    name: "耐力下",
    trainingType: "endurance",
    mainMuscles: ["QUADS", "GLUTES", "CALVES", "CORE"],
  },
]

const TRAINING_TYPE_CONFIG: Record<TrainingType, TrainingTypeConfig> = {
  strength: { plannedReps: 5, rpe: 9, repRange: [3, 5], mets: 6 },
  hypertrophy: { plannedReps: 12, rpe: 8, repRange: [8, 12], mets: 5 },
  endurance: { plannedReps: 20, rpe: 7, repRange: [15, 20], mets: 4 },
}


function analysis(
  muscle: MuscleGroup,
  setCount: number,
  effectiveUserWeightKg: number,
  mets: number,
): WorkoutExerciseAnalysis {
  const estimatedDurationMinutes = setCount * 3

  return {
    exerciseType: "strength",
    muscleGroups: MUSCLE_MAP[muscle],
    estimatedMets: mets,
    estimatedDurationMinutes,
    caloriesBurnedEstimated: Math.round(
      (mets * effectiveUserWeightKg * estimatedDurationMinutes) / 60,
    ),
    isEstimated: true,
  }
}

function plannedWeightKg(exercise: Exercise) {
  switch (exercise.primaryMuscle) {
    case "CHEST":
    case "BACK":
      return 30
    case "QUADS":
    case "GLUTES":
    case "HAMSTRINGS":
      return 40
    case "SHOULDERS":
    case "BICEPS":
    case "TRICEPS":
      return 12.5
    case "CORE":
      return 15
    default:
      return 10
  }
}

function incrementKg(exercise: Exercise): number {
  return ["QUADS", "GLUTES", "HAMSTRINGS", "CALVES"].includes(
    exercise.primaryMuscle,
  )
    ? 2.5
    : 1.25
}

function roundToQuarterKg(weight: number): number {
  return Math.round(weight * 4) / 4
}

function latestCompletedExercise(
  history: RecentWorkoutSessionSummary[],
  exerciseId: string,
  repRange: [number, number],
) {
  return [...history]
    .sort(
      (left, right) =>
        new Date(right.completedAt).getTime() -
        new Date(left.completedAt).getTime(),
    )
    .flatMap((session) => session.exercises)
    .find((exercise) => {
      if (
        exercise.catalogExerciseId !== exerciseId ||
        (exercise.phase !== undefined && exercise.phase !== "main") ||
        exercise.wasSkipped ||
        exercise.wasReplaced
      ) {
        return false
      }

      const reps = exercise.workingSetReps
      return (
        typeof reps !== "number" ||
        (reps >= repRange[0] && reps <= repRange[1])
      )
    })
}

function latestWeightKg(
  summary: ReturnType<typeof latestCompletedExercise>,
  targetReps: number,
): number | undefined {
  if (!summary) return undefined

  const sets = summary.sets ?? []
  if (sets.length > 0) {
    const successfulSetWeights = sets
      .filter(
        (set) =>
          set.isCompleted &&
          !set.isSkipped &&
          (set.actualReps ?? 0) >= targetReps,
      )
      .map((set) => set.actualWeightKg)
      .filter((weight): weight is number => typeof weight === "number")

    return successfulSetWeights.length > 0
      ? Math.max(...successfulSetWeights)
      : undefined
  }

  return summary.workingSetWeightKg
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

function plannedTrainingTypeWeightKg(
  exercise: Exercise,
  config: TrainingTypeConfig,
  history: RecentWorkoutSessionSummary[],
): number {
  const latest = latestCompletedExercise(history, exercise.id, config.repRange)
  const latestWeight = latestWeightKg(latest, config.plannedReps)

  if (
    typeof latestWeight === "number" &&
    completedTargetReps(latest, config.plannedReps)
  ) {
    return roundToQuarterKg(latestWeight + incrementKg(exercise))
  }

  return roundToQuarterKg(latestWeight ?? plannedWeightKg(exercise))
}

function draftMainExercise(
  exercise: Exercise,
  effectiveUserWeightKg: number,
  config: TrainingTypeConfig,
  plannedWeight: number,
  isDeload: boolean,
): WorkoutPlanExerciseDraft {
  const deload = isDeload ? calculateDeloadParams(plannedWeight, 3) : undefined
  const setCount = deload?.sets ?? 3

  return {
    plannedExerciseName: exercise.name,
    phase: "main",
    notes: `高级 DUP 主训练动作，目标 RPE ${config.rpe}。`,
    tips: ["保持动作可控。", "同一训练类型内完成目标次数后再加重。"],
    catalogExerciseId: exercise.id,
    sets: Array.from({ length: setCount }, () => ({
      plannedWeightKg: deload?.weight ?? plannedWeight,
      plannedReps: config.plannedReps,
    })),
    plannedAnalysis: analysis(
      exercise.primaryMuscle,
      setCount,
      effectiveUserWeightKg,
      config.mets,
    ),
  }
}

function lifetimeBenchmarkPool(state: TrainingState): Exercise[] {
  return (state.lifetimeBenchmarkIds ?? [])
    .map((id) => EXERCISES_BY_ID.get(id))
    .filter((exercise): exercise is Exercise => exercise !== undefined)
}

function fullStrengthPool(state: TrainingState): Exercise[] {
  const blocked = new Set(state.blacklistedExerciseIds)

  return STRENGTH_EXERCISES.filter((exercise) => !blocked.has(exercise.id))
}

function candidatePoolForTemplate(
  template: TemplateDefinition,
  state: TrainingState,
): Exercise[] {
  if (template.trainingType === "strength") {
    const lifetime = lifetimeBenchmarkPool(state).filter(
      (exercise) => !state.blacklistedExerciseIds.includes(exercise.id),
    )
    return lifetime.length > 0 ? lifetime : fullStrengthPool(state)
  }

  return fullStrengthPool(state)
}

function sortForTrainingType(
  exercises: Exercise[],
  trainingType: TrainingType,
): Exercise[] {
  if (trainingType === "strength") return exercises

  return [...exercises].sort((left, right) => {
    const rightAdvanced = right.tags.includes("ADVANCED") ? 1 : 0
    const leftAdvanced = left.tags.includes("ADVANCED") ? 1 : 0
    return (
      rightAdvanced - leftAdvanced || left.name.localeCompare(right.name, "zh-CN")
    )
  })
}

function selectExercisesForTemplate(
  template: TemplateDefinition,
  state: TrainingState,
  offset: number,
): Exercise[] {
  const selected: Exercise[] = []
  const pool = sortForTrainingType(
    candidatePoolForTemplate(template, state),
    template.trainingType,
  )

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

export function generateSession(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
    fatigueSnapshot?: WorkoutPlanContextSnapshot["fatigueSnapshot"]
  } = {},
): GeneratedAdvancedWorkoutPlan {
  const effectiveUserWeightKg = options.effectiveUserWeightKg ?? 70
  const recentWorkoutSessionSummaries =
    options.recentWorkoutSessionSummaries ?? []
  const sessionsSinceAdvancedStart = Math.max(
    0,
    state.completedSessionCount - ADVANCED_SESSION_START,
  )
  const templateIndex = sessionsSinceAdvancedStart % TEMPLATES.length
  const template = TEMPLATES[templateIndex]
  const config = TRAINING_TYPE_CONFIG[template.trainingType]
  const rotationOffset = Math.floor(sessionsSinceAdvancedStart / TEMPLATES.length)
  const isDeload = shouldAdvancedDeload({
    completedSessionCount: state.completedSessionCount,
    lastDeloadSession: state.lastDeloadSession,
    currentBlock: state.currentBlock,
    fatigueSnapshot: options.fatigueSnapshot,
  })
  const selectedExercises = selectExercisesForTemplate(
    template,
    state,
    rotationOffset,
  )

  return {
    templateIndex,
    templateName: template.name,
    phase: "advanced",
    isDeload,
    trainingState: {
      ...state,
      currentBlock: isDeload ? "deload" : undefined,
      lastDeloadSession:
        isDeload && state.currentBlock !== "deload"
          ? state.completedSessionCount
          : state.lastDeloadSession,
    },
    exercises: selectedExercises.map((exercise) =>
      draftMainExercise(
        exercise,
        effectiveUserWeightKg,
        config,
        plannedTrainingTypeWeightKg(
          exercise,
          config,
          recentWorkoutSessionSummaries,
        ),
        isDeload,
      ),
    ),
  }
}
