import {
  EXERCISES_BY_ID,
  MUSCLE_MAP,
  STRENGTH_EXERCISES,
  resolveMuscleKeys,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import { AS_UNLOCKED_LABEL, filterASSafe, unlockedRiskCategoryOf } from "@/lib/workout/engine/as-safety"
import { buildSupportPhaseExercises } from "@/lib/workout/engine/support-phases"
import {
  ADVANCED_SESSION_START,
  calculateDeloadParams,
  shouldAdvancedDeload,
} from "@/lib/workout/engine/deload"
import {
  auditMicrocycleVolume,
  auditSessionVolume,
  type MicrocycleVolumeAudit,
  type SessionVolumeAudit,
} from "@/lib/workout/engine/volume-audit"
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
  sessionAudit: SessionVolumeAudit
  microcycleAudit: MicrocycleVolumeAudit
}

type RawGeneratedAdvancedWorkoutPlan = Omit<
  GeneratedAdvancedWorkoutPlan,
  "sessionAudit" | "microcycleAudit"
>

interface TemplateDefinition {
  name: TemplateName
  trainingType: TrainingType
  mainMuscles: MuscleGroup[]
}

interface TrainingTypeConfig {
  plannedReps: number
  rpe: 7 | 8 | 9
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

/** 本阶段所有模板引用到的肌群（用于校验目录覆盖，消除 fallback 抓取） */
export const TEMPLATE_MUSCLE_GROUPS: readonly MuscleGroup[] = [
  ...new Set(TEMPLATES.flatMap((template) => template.mainMuscles)),
]

const TEMPLATE_MAIN_MUSCLE_KEYS = [
  ...new Set(
    TEMPLATES.flatMap((template) =>
      template.mainMuscles.flatMap((muscle) => MUSCLE_MAP[muscle]),
    ),
  ),
]

const TRAINING_TYPE_CONFIG: Record<TrainingType, TrainingTypeConfig> = {
  strength: { plannedReps: 5, rpe: 9, mets: 6 },
  hypertrophy: { plannedReps: 12, rpe: 8, mets: 5 },
  endurance: { plannedReps: 20, rpe: 7, mets: 4 },
}


function analysis(
  exercise: Exercise,
  setCount: number,
  effectiveUserWeightKg: number,
  mets: number,
): WorkoutExerciseAnalysis {
  const estimatedDurationMinutes = setCount * 3

  return {
    exerciseType: "strength",
    muscleGroups: resolveMuscleKeys(exercise),
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
    case "CALVES":
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

function roundToQuarterKg(weight: number): number {
  return Math.round(weight * 4) / 4
}

/**
 * 目标 RPE → 目标强度（占 e1RM 的比例）。
 * RPE 由此真正参与配重决策：同一表现下，力量日(RPE9)配重高于耐力日(RPE7)。
 */
const RPE_INTENSITY: Record<TrainingTypeConfig["rpe"], number> = {
  9: 0.9, // 力量
  8: 0.75, // 肌肥大
  7: 0.62, // 耐力
}

/** Epley 估计 1RM：重量 × (1 + 次数/30) */
function estimatedOneRepMaxKg(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
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

/**
 * 该动作最近一次完成表现里、最佳工作组的 e1RM —— 自回归的「已证容量」。
 * 表现好（更大重量/更多次数）→ e1RM 升；状态差/未达标 → e1RM 降，配重随之波动，
 * 而非每课次固定线性加重。
 */
function recentEstimatedOneRepMaxKg(
  summary: ReturnType<typeof latestCompletedExercise>,
): number | undefined {
  if (!summary) return undefined

  const setE1RMs = (summary.sets ?? [])
    .filter((set) => set.isCompleted && !set.isSkipped)
    .map((set) =>
      typeof set.actualWeightKg === "number" &&
      typeof set.actualReps === "number"
        ? estimatedOneRepMaxKg(set.actualWeightKg, set.actualReps)
        : undefined,
    )
    .filter((value): value is number => typeof value === "number")

  if (setE1RMs.length > 0) return Math.max(...setE1RMs)

  if (
    typeof summary.workingSetWeightKg === "number" &&
    typeof summary.workingSetReps === "number"
  ) {
    return estimatedOneRepMaxKg(
      summary.workingSetWeightKg,
      summary.workingSetReps,
    )
  }

  return undefined
}

function plannedTrainingTypeWeightKg(
  exercise: Exercise,
  config: TrainingTypeConfig,
  history: RecentWorkoutSessionSummary[],
): number {
  const e1rm = recentEstimatedOneRepMaxKg(
    latestCompletedExercise(history, exercise.id),
  )

  if (typeof e1rm === "number") {
    return roundToQuarterKg(e1rm * RPE_INTENSITY[config.rpe])
  }

  return roundToQuarterKg(plannedWeightKg(exercise))
}

function draftMainExercise(
  exercise: Exercise,
  effectiveUserWeightKg: number,
  config: TrainingTypeConfig,
  plannedWeight: number,
  isDeload: boolean,
  unlockedRiskCategories?: readonly string[],
): WorkoutPlanExerciseDraft {
  const deload = isDeload ? calculateDeloadParams(plannedWeight, 3) : undefined
  const setCount = deload?.sets ?? 3
  const unlockedRisk = unlockedRiskCategoryOf(exercise, unlockedRiskCategories)

  return {
    plannedExerciseName: exercise.name,
    phase: "main",
    notes: `高级 DUP 主训练动作，目标 RPE ${config.rpe}。`,
    tips: [
      "保持动作可控。",
      `配重按上次表现自回归：以目标 RPE ${config.rpe} 锚定强度，状态好自动上调、变差则回落。`,
    ],
    labels: unlockedRisk ? [AS_UNLOCKED_LABEL] : undefined,
    catalogExerciseId: exercise.id,
    sets: Array.from({ length: setCount }, () => ({
      plannedWeightKg: deload?.weight ?? plannedWeight,
      plannedReps: config.plannedReps,
    })),
    plannedAnalysis: analysis(
      exercise,
      setCount,
      effectiveUserWeightKg,
      config.mets,
    ),
  }
}

function lifetimeBenchmarkPool(state: TrainingState): Exercise[] {
  return filterASSafe(
    (state.lifetimeBenchmarkIds ?? [])
      .map((id) => EXERCISES_BY_ID.get(id))
      .filter((exercise): exercise is Exercise => exercise !== undefined),
    state.unlockedRiskCategories,
  )
}

function fullStrengthPool(state: TrainingState): Exercise[] {
  const blocked = new Set(state.blacklistedExerciseIds)

  return filterASSafe(
    STRENGTH_EXERCISES.filter((exercise) => !blocked.has(exercise.id)),
    state.unlockedRiskCategories,
  )
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

function generateSessionRaw(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
    fatigueSnapshot?: WorkoutPlanContextSnapshot["fatigueSnapshot"]
  } = {},
): RawGeneratedAdvancedWorkoutPlan {
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
  const mainExercises = selectedExercises.map((exercise) =>
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
      state.unlockedRiskCategories,
    ),
  )
  const exercises = buildSupportPhaseExercises({
    mainExercises,
    effectiveUserWeightKg,
    blacklist: state.blacklistedExerciseIds,
    offset: rotationOffset,
    unlockedRiskCategories: state.unlockedRiskCategories,
  })

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
    exercises,
  }
}

export function generateSession(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
    fatigueSnapshot?: WorkoutPlanContextSnapshot["fatigueSnapshot"]
  } = {},
): GeneratedAdvancedWorkoutPlan {
  const plan = generateSessionRaw(state, options)
  const microcyclePlans = Array.from({ length: TEMPLATES.length }, (_, index) =>
    generateSessionRaw(
      {
        ...state,
        completedSessionCount: state.completedSessionCount + index,
      },
      options,
    ),
  )

  return {
    ...plan,
    sessionAudit: auditSessionVolume({
      phase: plan.phase,
      isDeload: plan.isDeload,
      exercises: plan.exercises,
    }),
    microcycleAudit: auditMicrocycleVolume({
      phase: plan.phase,
      completedSessionCount: state.completedSessionCount,
      currentBlock: plan.trainingState.currentBlock,
      isDeload: microcyclePlans.some((item) => item.isDeload),
      expectedMuscleGroups: TEMPLATE_MAIN_MUSCLE_KEYS,
      constrainedReasons:
        state.blacklistedExerciseIds.length > 0 ? ["blacklist"] : [],
      sessions: microcyclePlans.map((item) => ({
        exercises: item.exercises,
        trainingType: TEMPLATES[item.templateIndex].trainingType,
      })),
    }),
  }
}
