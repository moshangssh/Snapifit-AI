import {
  EXERCISES_BY_ID,
  MUSCLE_MAP,
  STRENGTH_EXERCISES,
  findVariants,
  resolveMuscleKeys,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import { AS_UNLOCKED_LABEL, filterASSafe, unlockedRiskCategoryOf } from "@/lib/workout/engine/as-safety"
import { buildSupportPhaseExercises } from "@/lib/workout/engine/support-phases"
import {
  auditMicrocycleVolume,
  auditSessionVolume,
  type MicrocycleVolumeAudit,
  type SessionVolumeAudit,
} from "@/lib/workout/engine/volume-audit"
import { toAuditSnapshots } from "@/lib/workout/engine/audit"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type {
  GeneratedWorkoutPlan,
  RecentWorkoutSessionSummary,
  WorkoutExerciseAnalysis,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"

type TemplateName = "上A" | "下A" | "上B" | "下B" | "上C" | "下C"
type IntermediateBlock = "accumulation" | "intensification" | "deload"

type RawGeneratedIntermediateWorkoutPlan = Omit<
  GeneratedWorkoutPlan,
  "sessionAudit" | "microcycleAudit"
> & { templateName: TemplateName }

interface TemplateDefinition {
  name: TemplateName
  mainMuscles: MuscleGroup[]
}

const NOVICE_SESSION_COUNT = 72
const BLOCK_CONFIG = {
  accumulation: { sessions: 18, benchmarkSessions: 6 },
  intensification: { sessions: 18, benchmarkSessions: 6 },
  deload: { sessions: 6, benchmarkSessions: 6 },
} as const
const BLOCK_CYCLE_LENGTH =
  BLOCK_CONFIG.accumulation.sessions +
  BLOCK_CONFIG.intensification.sessions +
  BLOCK_CONFIG.deload.sessions

const TEMPLATES: TemplateDefinition[] = [
  { name: "上A", mainMuscles: ["CHEST", "SHOULDERS", "TRICEPS", "BICEPS"] },
  { name: "下A", mainMuscles: ["QUADS", "GLUTES", "CORE"] },
  { name: "上B", mainMuscles: ["BACK", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"] },
  { name: "下B", mainMuscles: ["QUADS", "GLUTES", "CORE"] },
  { name: "上C", mainMuscles: ["CHEST", "BACK", "SHOULDERS", "TRICEPS"] },
  { name: "下C", mainMuscles: ["QUADS", "GLUTES", "CORE"] },
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

function analysis(
  exercise: Exercise,
  setCount: number,
  effectiveUserWeightKg: number,
): WorkoutExerciseAnalysis {
  const estimatedDurationMinutes = setCount * 3

  return {
    exerciseType: "strength",
    muscleGroups: resolveMuscleKeys(exercise),
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
    case "HAMSTRINGS":
    case "CALVES":
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
    unlockedRiskCategories?: readonly string[]
  },
): WorkoutPlanExerciseDraft {
  const setCount = options.setCount ?? 3
  const unlockedRisk = unlockedRiskCategoryOf(
    exercise,
    options.unlockedRiskCategories,
  )

  return {
    plannedExerciseName: exercise.name,
    phase: "main",
    notes: "中级块状周期主训练动作。",
    tips: ["保持动作可控。", "完成目标次数后按块内规则渐进。"],
    labels: unlockedRisk ? [AS_UNLOCKED_LABEL] : undefined,
    catalogExerciseId: exercise.id,
    sets: Array.from({ length: setCount }, () => ({
      plannedWeightKg: options.plannedWeightKg,
      plannedReps: options.plannedReps,
    })),
    plannedAnalysis: analysis(
      exercise,
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
  targetReps?: number,
): number | undefined {
  if (!summary) return undefined

  const sets = summary.sets ?? []
  if (sets.length > 0) {
    const successfulSets = sets.filter(
      (set) =>
        set.isCompleted &&
        !set.isSkipped &&
        (targetReps === undefined || (set.actualReps ?? 0) >= targetReps),
    )
    const setWeights = successfulSets
      .map((set) => set.actualWeightKg)
      .filter((weight): weight is number => typeof weight === "number")

    return setWeights.length > 0 ? Math.max(...setWeights) : undefined
  }

  return summary.workingSetWeightKg
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
  const latestWeight = latestWeightKg(latest, 10)

  if (typeof latestWeight === "number" && completedTargetReps(latest, 10)) {
    return roundToHalfKg(latestWeight + incrementKg(exercise))
  }

  return roundToHalfKg(latestWeight ?? plannedWeightKg(exercise))
}

function blockForSession(blockSessionIndex: number): IntermediateBlock {
  const accEnd = BLOCK_CONFIG.accumulation.sessions
  const intEnd = accEnd + BLOCK_CONFIG.intensification.sessions

  if (blockSessionIndex < accEnd) return "accumulation"
  if (blockSessionIndex < intEnd) return "intensification"
  return "deload"
}

function plannedIntensificationWeightKg(
  exercise: Exercise,
  history: RecentWorkoutSessionSummary[],
): number {
  const latest = latestCompletedExercise(history, exercise.id)
  const latestWeight = latestWeightKg(latest, 6)

  if (typeof latestWeight !== "number") {
    const accumulationWeight = latestWeightKg(latest, 10)
    return roundToHalfKg(accumulationWeight ?? plannedWeightKg(exercise))
  }

  if (completedTargetReps(latest, 6)) {
    return roundToHalfKg(latestWeight + incrementKg(exercise))
  }

  return roundToHalfKg(latestWeight)
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
  return filterASSafe(
    (state.benchmarkExerciseIds ?? [])
      .map((id) => EXERCISES_BY_ID.get(id))
      .filter((exercise): exercise is Exercise => exercise !== undefined),
    state.unlockedRiskCategories,
  )
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
  const pool = filterASSafe(
    STRENGTH_EXERCISES.filter((exercise) =>
      exercise.tags.includes("INTERMEDIATE_VARIANT"),
    ),
    state.unlockedRiskCategories,
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

/**
 * 判断当前课次（块内序号）使用基准动作还是匹配变式。
 *
 * 每个块状周期（42 次）的结构为：积累 18 + 强化 18 + 减载 6。
 * 在积累块和强化块中，前 6 次用基准动作做"测试"以记录进展（benchmarkSessions），
 * 之后切换到匹配变式以增加多样性；减载块全程使用基准动作，
 * 因为减载周需要在熟悉的动作上以轻负荷恢复，不引入新变式。
 */
function usesBenchmarkExercises(blockSessionIndex: number): boolean {
  const accBenchmark = BLOCK_CONFIG.accumulation.benchmarkSessions
  const accEnd = BLOCK_CONFIG.accumulation.sessions
  const intEnd = accEnd + BLOCK_CONFIG.intensification.sessions
  const intBenchmark = accEnd + BLOCK_CONFIG.intensification.benchmarkSessions

  return (
    blockSessionIndex < accBenchmark ||
    (blockSessionIndex >= accEnd && blockSessionIndex < intBenchmark) ||
    blockSessionIndex >= intEnd
  )
}

function generateSessionRaw(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  } = {},
): RawGeneratedIntermediateWorkoutPlan {
  const effectiveUserWeightKg = options.effectiveUserWeightKg ?? 70
  const recentWorkoutSessionSummaries =
    options.recentWorkoutSessionSummaries ?? []
  const sessionsSinceIntermediateStart = Math.max(
    0,
    state.completedSessionCount - NOVICE_SESSION_COUNT,
  )
  const templateIndex = sessionsSinceIntermediateStart % TEMPLATES.length
  const blockSessionIndex = sessionsSinceIntermediateStart % BLOCK_CYCLE_LENGTH
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
      unlockedRiskCategories: state.unlockedRiskCategories,
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
  const supportExercises = buildSupportPhaseExercises({
    mainExercises: selectedExercises,
    blacklist: state.blacklistedExerciseIds,
    rotationOffset,
    effectiveUserWeightKg,
    unlockedRiskCategories: state.unlockedRiskCategories,
  })
  const warmup = supportExercises.filter((exercise) => exercise.phase === "warmup")
  const cooldown = supportExercises.filter(
    (exercise) => exercise.phase === "cooldown",
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
    exercises: [...warmup, ...mainExercises, ...cooldown],
  }
}

function buildVolumeAudits(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  } = {},
): {
  plan: RawGeneratedIntermediateWorkoutPlan
  microcyclePlans: RawGeneratedIntermediateWorkoutPlan[]
  sessionVolumeAudit: SessionVolumeAudit
  microcycleVolumeAudit: MicrocycleVolumeAudit
} {
  const plan = generateSessionRaw(state, options)
  // 把微周期重建锚定到轮换边界，使审计始终描述同一个规范 microcycle，与从周期内
  // 哪一次 session 生成无关（对齐 advanced-engine，见 #80）。前向窗口
  // （count + index）会跨过轮换边界、并把「基准动作→变式」切换点（第 6 节课）
  // 后的 session 拖进来，令同一微周期的逐肌群组数随入口剧烈漂移。
  const sessionsSinceIntermediateStart = Math.max(
    0,
    state.completedSessionCount - NOVICE_SESSION_COUNT,
  )
  const microcycleStart =
    state.completedSessionCount -
    (sessionsSinceIntermediateStart % TEMPLATES.length)
  const microcyclePlans = Array.from({ length: TEMPLATES.length }, (_, index) =>
    generateSessionRaw(
      {
        ...state,
        completedSessionCount: microcycleStart + index,
      },
      options,
    ),
  )

  return {
    plan,
    microcyclePlans,
    sessionVolumeAudit: auditSessionVolume({
      phase: plan.phase,
      isDeload: plan.isDeload,
      exercises: plan.exercises,
    }),
    microcycleVolumeAudit: auditMicrocycleVolume({
      phase: plan.phase,
      completedSessionCount: state.completedSessionCount,
      currentBlock: plan.trainingState.currentBlock,
      isDeload: microcyclePlans.some((item) => item.isDeload),
      expectedMuscleGroups: TEMPLATE_MAIN_MUSCLE_KEYS,
      constrainedReasons:
        state.blacklistedExerciseIds.length > 0 ? ["blacklist"] : [],
      sessions: microcyclePlans,
    }),
  }
}

export function generateSession(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  } = {},
): GeneratedWorkoutPlan {
  const { plan, microcyclePlans, sessionVolumeAudit, microcycleVolumeAudit } =
    buildVolumeAudits(state, options)

  return {
    ...plan,
    ...toAuditSnapshots({
      sessionExercises: plan.exercises,
      microcyclePlans,
      sessionVolumeAudit,
      microcycleVolumeAudit,
    }),
  }
}

/**
 * Internal seam: the detailed 训练容量审计 over the engine's actual generated
 * microcycle, for the engine's own tests. `generateSession` returns the 审计快照.
 */
export function describeVolume(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  } = {},
): { session: SessionVolumeAudit; microcycle: MicrocycleVolumeAudit } {
  const { sessionVolumeAudit, microcycleVolumeAudit } = buildVolumeAudits(
    state,
    options,
  )

  return { session: sessionVolumeAudit, microcycle: microcycleVolumeAudit }
}
