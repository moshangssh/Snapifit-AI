import { filterASSafe } from "@/lib/workout/engine/as-safety"
import {
  detectPhaseTransition,
  generateSession,
  type PhaseTransitionReason,
} from "@/lib/workout/engine/adaptive-engine"
import {
  assessBenchmarkReadiness,
  getBenchmarkCandidateDetails,
  type BenchmarkCandidateDetail,
} from "@/lib/workout/engine/benchmark-selection"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { normalizeTrainingState } from "@/lib/workout/engine/training-state"
import type {
  GeneratedWorkoutPlan,
  RecentWorkoutSessionSummary,
  TrainingPhase,
  TrainingState,
  WorkoutPlanContextSnapshot,
} from "@/lib/workout/types"

export interface PlanWorkoutRequest {
  effectiveUserWeightKg: number
  fatigueSnapshot: WorkoutPlanContextSnapshot["fatigueSnapshot"]
  /** Raw persisted training state; normalized inside. */
  trainingState: unknown
  recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
}

export type PlanWorkoutResult =
  | { kind: "prescription"; plan: GeneratedWorkoutPlan }
  | {
      kind: "needBenchmarkSelection"
      nextPhase: TrainingPhase
      reason: PhaseTransitionReason
      candidates: BenchmarkCandidateDetail[]
      trainingState: TrainingState
    }
  | {
      kind: "insufficientHistory"
      nextPhase: TrainingPhase
      have: number
      required: number
    }

/**
 * 力量训练处方生成的唯一 interface。给定训练状态与上下文，返回三种领域结局之一：生成好的
 * 处方（plan 自带审计快照）、需要用户挑选基准动作、或训练史不足。纯确定性、in-process，
 * 不抛领域错误、不做任何 HTTP 关注点——对齐 ADR-0003 的 WorkoutEngine interface。
 */
export function planWorkout(request: PlanWorkoutRequest): PlanWorkoutResult {
  const trainingState = normalizeTrainingState(request.trainingState)
  const phaseTransition = detectPhaseTransition(trainingState)
  const recentWorkoutSessionSummaries =
    request.recentWorkoutSessionSummaries ?? []

  if (phaseTransition.phaseTransitionReady) {
    const nextPhase = phaseTransition.nextPhase
    const isAdvancedTransition = nextPhase === "advanced"
    // 纵深防御：基准候选会成为用户的（中级/终生）基准动作，须套用 AS 安全锁，
    // 避免某个被锁定的风险动作固化为永久基准。
    const candidatePool = filterASSafe(
      isAdvancedTransition
        ? STRENGTH_EXERCISES.filter((exercise) =>
            (trainingState.benchmarkExerciseIds ?? []).includes(exercise.id),
          )
        : STRENGTH_EXERCISES,
      trainingState.unlockedRiskCategories,
    )
    const candidates = getBenchmarkCandidateDetails(
      recentWorkoutSessionSummaries,
      candidatePool,
      // 高级候选池已限定为用户的中级基准动作，无需再按 NOVICE_CORE 过滤
      { requireNoviceCore: !isAdvancedTransition },
    )
    const readiness = assessBenchmarkReadiness(
      candidates,
      isAdvancedTransition ? "advanced" : "intermediate",
    )

    if (!readiness.ready) {
      return {
        kind: "insufficientHistory",
        nextPhase,
        have: readiness.have,
        required: readiness.required,
      }
    }

    return {
      kind: "needBenchmarkSelection",
      nextPhase,
      reason: phaseTransition.reason,
      candidates,
      trainingState: {
        ...trainingState,
        phaseTransitionReady: true,
        // 清除已完成的手动降级记录
        manualDowngrade: undefined,
      },
    }
  }

  const plan = generateSession(trainingState, {
    effectiveUserWeightKg: request.effectiveUserWeightKg,
    recentWorkoutSessionSummaries,
    fatigueSnapshot: request.fatigueSnapshot,
  })

  return { kind: "prescription", plan }
}
