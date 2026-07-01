import type {
  GeneratedWorkoutPlan,
  RecentWorkoutSessionSummary,
  TrainingPhase,
  TrainingState,
  WorkoutPlanContextSnapshot,
} from "@/lib/workout/types"
import { generateSession as generateAdvancedSession } from "@/lib/workout/engine/advanced-engine"
import { generateSession as generateIntermediateSession } from "@/lib/workout/engine/intermediate-engine"
import { generateSession as generateNoviceSession } from "@/lib/workout/engine/novice-engine"

export type PhaseTransitionReason =
  | "novice_session_threshold"
  | "novice_stalled_exercises"
  | "intermediate_session_threshold"
  | "manual_downgrade_upgrade_window"

export type PhaseTransitionDetection =
  | {
      phaseTransitionReady: true
      nextPhase: TrainingPhase
      reason: PhaseTransitionReason
    }
  | {
      phaseTransitionReady: false
    }

export function detectPhaseTransition(
  state: TrainingState,
): PhaseTransitionDetection {
  // 如果存在手动降级记录，优先处理
  if (state.manualDowngrade) {
    const readyAt = state.manualDowngrade.at + state.manualDowngrade.upgradeAfter

    if (state.completedSessionCount >= readyAt) {
      return {
        phaseTransitionReady: true,
        nextPhase: state.manualDowngrade.from,
        reason: "manual_downgrade_upgrade_window",
      }
    }
    // 在手动降级恢复期内，阻止其他自然阶段转换
    return { phaseTransitionReady: false }
  }

  if (state.phase === "novice" && state.completedSessionCount >= 72) {
    return {
      phaseTransitionReady: true,
      nextPhase: "intermediate",
      reason: "novice_session_threshold",
    }
  }

  if (state.phase === "novice" && (state.stalledExercises ?? 0) >= 4) {
    return {
      phaseTransitionReady: true,
      nextPhase: "intermediate",
      reason: "novice_stalled_exercises",
    }
  }

  if (state.phase === "intermediate" && state.completedSessionCount >= 240) {
    return {
      phaseTransitionReady: true,
      nextPhase: "advanced",
      reason: "intermediate_session_threshold",
    }
  }

  return { phaseTransitionReady: false }
}

export function shouldShowBenchmarkSelection(state: TrainingState): boolean {
  return state.phaseTransitionReady === true
}

export function confirmBenchmarkSelection(
  state: TrainingState,
  benchmarkExerciseIds: string[],
): TrainingState {
  return {
    ...state,
    phase: "intermediate",
    benchmarkExerciseIds: benchmarkExerciseIds.slice(0, 10),
    phaseTransitionReady: false,
    manualDowngrade: undefined,
  }
}

export function confirmLifetimeBenchmarkSelection(
  state: TrainingState,
  lifetimeBenchmarkIds: string[],
): TrainingState {
  return {
    ...state,
    phase: "advanced",
    lifetimeBenchmarkIds: lifetimeBenchmarkIds.slice(0, 5),
    lastDeloadSession: state.completedSessionCount,
    phaseTransitionReady: false,
    manualDowngrade: undefined,
  }
}

export function generateSession(
  state: TrainingState,
  options: {
    effectiveUserWeightKg?: number
    recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
    fatigueSnapshot?: WorkoutPlanContextSnapshot["fatigueSnapshot"]
  } = {},
): GeneratedWorkoutPlan {
  if (state.phase === "intermediate") {
    return generateIntermediateSession(state, options)
  }

  if (state.phase === "advanced") {
    return generateAdvancedSession(state, options)
  }

  return generateNoviceSession(state, options)
}
