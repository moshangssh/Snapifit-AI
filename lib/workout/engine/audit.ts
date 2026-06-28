import type {
  TrainingPhase,
  WorkoutMicrocycleAuditSnapshot,
  WorkoutPlanExerciseDraft,
  WorkoutSessionAuditSnapshot,
} from "@/lib/workout/types"

const MICROCYCLE_SESSION_COUNTS: Record<TrainingPhase, number> = {
  novice: 4,
  intermediate: 6,
  advanced: 6,
}

export function countMainStrengthSets(
  exercises: readonly WorkoutPlanExerciseDraft[],
) {
  return exercises
    .filter((exercise) => exercise.phase === "main")
    .reduce((sum, exercise) => sum + exercise.sets.length, 0)
}

export function createPassAuditSnapshots(input: {
  exercises: readonly WorkoutPlanExerciseDraft[]
  phase: TrainingPhase
}): {
  sessionAudit: WorkoutSessionAuditSnapshot
  microcycleAudit: WorkoutMicrocycleAuditSnapshot
} {
  const mainSetCount = countMainStrengthSets(input.exercises)
  const sessionCount = MICROCYCLE_SESSION_COUNTS[input.phase]
  const microcycleMainSetCount = mainSetCount * sessionCount

  return {
    sessionAudit: {
      status: "pass",
      mainSetCount,
      summary: `本次主训练 ${mainSetCount} 组`,
    },
    microcycleAudit: {
      status: "pass",
      mainSetCount: microcycleMainSetCount,
      sessionCount,
      summary: `本轮主训练 ${microcycleMainSetCount} 组`,
    },
  }
}
