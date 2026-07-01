import type { ExerciseEntry } from "@/lib/types"
import type { MuscleKey } from "@/lib/muscle-groups"

export type WorkoutSessionRole = "current" | "next"
export type TrainingPhase = "novice" | "intermediate" | "advanced"
export type WorkoutSessionStatus =
  | "draft"
  | "active"
  | "finishing"
  | "completed"
  | "abandoned"

export type WorkoutExerciseAnalysisStatus =
  | "planned"
  | "stale"
  | "enriched"
  | "fallback"

export type WorkoutExercisePhase = "warmup" | "main" | "cooldown"
export type WorkoutAuditStatus = "pass" | "adjusted" | "constrained" | "fail"

export interface WorkoutSessionAuditSnapshot {
  status: WorkoutAuditStatus
  mainSetCount: number
  summary: string
  reasonCodes?: string[]
  constrainedReasons?: string[]
}

export interface WorkoutVolumeAdjustmentSummary {
  /** Total main strength sets bounded adjustment added across the microcycle. */
  addedSets: number
  /** How many new safe main exercises bounded adjustment introduced. */
  addedExercises: number
  /** Audit muscle-group keys that were brought up to target by adjustment. */
  muscleGroups: string[]
}

export interface WorkoutMicrocycleAuditSnapshot {
  status: WorkoutAuditStatus
  mainSetCount: number
  sessionCount?: number
  summary: string
  reasonCodes?: string[]
  constrainedReasons?: string[]
  adjustment?: WorkoutVolumeAdjustmentSummary
}

export interface WorkoutExerciseAnalysis {
  exerciseType: ExerciseEntry["exercise_type"]
  muscleGroups: MuscleKey[]
  estimatedMets: number
  estimatedDurationMinutes: number
  caloriesBurnedEstimated: number
  isEstimated: boolean
}

export interface WorkoutSessionSet {
  setIndex: number
  plannedWeightKg?: number
  plannedReps?: number
  actualWeightKg?: number
  actualReps?: number
  touched: {
    weight: boolean
    reps: boolean
  }
  isCompleted: boolean
  completedAt?: string
  isSkipped: boolean
}

export interface WorkoutSessionExercise {
  exerciseId: string
  plannedExerciseName: string
  phase: WorkoutExercisePhase
  actualExerciseName?: string
  notes?: string
  tips: string[]
  labels?: string[]
  sets: WorkoutSessionSet[]
  isExerciseSkipped: boolean
  analysisStatus: WorkoutExerciseAnalysisStatus
  plannedAnalysis: WorkoutExerciseAnalysis
  enrichedAnalysis?: WorkoutExerciseAnalysis
  // 训练引擎字段
  catalogExerciseId?: string  // catalog 动作 ID（用于追踪进度和替换）
  discomfortFlag?: boolean    // 用户标记"感觉不对"（触发立即替换+黑名单）
  actualRpe?: number          // 动作级实际 RPE（仅 main 动作，可选，不阻塞完成）
}

export interface TrainingState {
  phase: TrainingPhase
  completedSessionCount: number
  blacklistedExerciseIds: string[]
  /**
   * 用户（在医生同意后）显式解锁的 AS 风险动作类别。默认空 = 全部锁定。
   * 取值见 lib/workout/engine/as-safety.ts 的 ASRiskCategory。
   */
  unlockedRiskCategories?: string[]
  benchmarkExerciseIds?: string[]
  lifetimeBenchmarkIds?: string[]
  stalledExercises?: number
  phaseTransitionReady?: boolean
  currentBlock?: "accumulation" | "intensification" | "deload"
  blockStartSession?: number
  lastDeloadSession?: number
  manualDowngrade?: {
    from: TrainingPhase
    at: number
    upgradeAfter: number
  }
}

export interface RecentWorkoutSessionSummary {
  completedAt: string
  exercises: Array<{
    catalogExerciseId?: string
    exerciseName: string
    phase?: WorkoutExercisePhase
    completedSets: number
    workingSetWeightKg?: number
    workingSetReps?: number
    wasReplaced: boolean
    wasSkipped: boolean
    discomfortFlag?: boolean
    actualRpe?: number
    muscleGroups: string[]
    sets?: Array<{
      plannedWeightKg?: number
      plannedReps?: number
      actualWeightKg?: number
      actualReps?: number
      isCompleted: boolean
      isSkipped: boolean
    }>
  }>
}

export interface ExerciseEntrySummary {
  date: string
  exerciseName: string
  exerciseType: ExerciseEntry["exercise_type"]
  sets?: number
  reps?: number
  weightKg?: number
  muscleGroups: string[]
}

export interface WorkoutPlanContextSnapshot {
  generatedAt: string
  userGoal: string
  recentWorkoutSessionSummaries: RecentWorkoutSessionSummary[]
  recentExerciseEntries: ExerciseEntrySummary[]
  fatigueSnapshot: Record<
    string,
    {
      intensity: 0 | 30 | 60 | 100
      daysAgo: 0 | 1 | 2 | null
      lastExerciseName: string | null
    }
  >
}

export interface WorkoutSessionDerived {
  completedSetCount: number
  totalSetCount: number
  skippedSetCount: number
  replacedExerciseCount: number
  exerciseCompletionRate: number
}

export interface WorkoutSession {
  sessionId: string
  sessionRole: WorkoutSessionRole
  status: WorkoutSessionStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutSessionExercise[]
  derived: WorkoutSessionDerived
  // 训练引擎字段（确定性引擎）
  templateIndex?: number  // 模板索引：0-3（新手4模板）或 0-5（中高级6模板）
  isDeload?: boolean      // 是否减载训练
  phase?: TrainingPhase  // 训练阶段快照（历史回溯用）
  sessionAudit?: WorkoutSessionAuditSnapshot
  microcycleAudit?: WorkoutMicrocycleAuditSnapshot
}

export interface WorkoutPlanExerciseDraft {
  plannedExerciseName: string
  phase: WorkoutExercisePhase
  notes?: string
  tips: string[]
  labels?: string[]
  sets: Array<{
    plannedWeightKg?: number
    plannedReps?: number
  }>
  plannedAnalysis: WorkoutExerciseAnalysis
  catalogExerciseId?: string
  discomfortFlag?: boolean
}

/**
 * The engine's single output shape across all three 训练阶段. `phase` is the
 * discriminant; `sessionAudit`/`microcycleAudit` are the 审计快照 (external audit
 * representation) — the detailed volume audit stays internal to the engine.
 */
export interface GeneratedWorkoutPlan {
  templateIndex: number
  templateName: string
  phase: TrainingPhase
  isDeload: boolean
  trainingState: TrainingState
  exercises: WorkoutPlanExerciseDraft[]
  sessionAudit: WorkoutSessionAuditSnapshot
  microcycleAudit: WorkoutMicrocycleAuditSnapshot
}

export interface CreateWorkoutSessionInput {
  sessionRole: WorkoutSessionRole
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutPlanExerciseDraft[]
  now: string
  templateIndex?: number
  isDeload?: boolean
  phase?: TrainingPhase
  sessionAudit?: WorkoutSessionAuditSnapshot
  microcycleAudit?: WorkoutMicrocycleAuditSnapshot
}
