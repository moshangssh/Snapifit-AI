import type { TrainingPhase, TrainingState } from "@/lib/workout/types"

export type PhaseTransitionReason =
  | "novice_session_threshold"
  | "novice_stalled_exercises"
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
