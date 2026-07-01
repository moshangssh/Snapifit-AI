import type {
  RecentWorkoutSessionSummary,
  TrainingPhase,
  TrainingState,
  WorkoutAuditStatus,
  WorkoutExercisePhase,
  WorkoutPlanContextSnapshot,
  WorkoutMicrocycleAuditSnapshot,
  WorkoutPlanExerciseDraft,
  WorkoutSessionAuditSnapshot,
  WorkoutVolumeAdjustmentSummary,
} from "@/lib/workout/types"
import { generateSession } from "@/lib/workout/engine/adaptive-engine"

const MICROCYCLE_SESSION_COUNTS: Record<TrainingPhase, number> = {
  novice: 4,
  intermediate: 6,
  advanced: 6,
}
const REQUIRED_SESSION_PHASES: WorkoutExercisePhase[] = [
  "warmup",
  "main",
  "cooldown",
]
const MISSING_THREE_PHASE_STRUCTURE = "missing_three_phase_structure"

interface AuditedWorkoutPlan {
  phase: TrainingPhase
  trainingState: TrainingState
  exercises: WorkoutPlanExerciseDraft[]
  sessionAudit?: {
    status: WorkoutAuditStatus
    constrainedReasons?: string[]
  }
  microcycleAudit?: {
    status: WorkoutAuditStatus
    constrainedReasons?: string[]
    muscleGroupAudits?: Record<
      string,
      {
        status: WorkoutAuditStatus
        adjustment?: {
          addedSets: number
          addedExercise: boolean
          adjustedSets: number
        }
      }
    >
  }
}

export function countMainStrengthSets(
  exercises: readonly WorkoutPlanExerciseDraft[],
) {
  return exercises
    .filter((exercise) => exercise.phase === "main")
    .reduce((sum, exercise) => sum + exercise.sets.length, 0)
}

function missingSessionPhases(
  exercises: readonly WorkoutPlanExerciseDraft[],
): WorkoutExercisePhase[] {
  const phases = new Set(exercises.map((exercise) => exercise.phase))

  return REQUIRED_SESSION_PHASES.filter((phase) => !phases.has(phase))
}

function auditStatusForPlans(plans: readonly AuditedWorkoutPlan[]) {
  return plans.some((plan) => missingSessionPhases(plan.exercises).length > 0)
    ? "fail"
    : "pass"
}

function reasonCodesForPlans(plans: readonly AuditedWorkoutPlan[]) {
  return auditStatusForPlans(plans) === "fail"
    ? [MISSING_THREE_PHASE_STRUCTURE]
    : undefined
}

function nextTrainingStateAfterPlan(
  plan: AuditedWorkoutPlan,
): TrainingState {
  return {
    ...plan.trainingState,
    completedSessionCount: plan.trainingState.completedSessionCount + 1,
  }
}

/**
 * Summarize 有限容量调整 (bounded volume adjustment) from a microcycle audit, so the
 * snapshot can explain what the engine corrected (added sets / new exercises and which
 * muscle groups). Returns undefined when nothing was adjusted.
 */
function summarizeAdjustment(
  microcycleAudit: AuditedWorkoutPlan["microcycleAudit"],
): WorkoutVolumeAdjustmentSummary | undefined {
  const muscleGroupAudits = microcycleAudit?.muscleGroupAudits
  if (!muscleGroupAudits) return undefined

  const adjusted = Object.entries(muscleGroupAudits).filter(
    ([, audit]) => audit.status === "adjusted" && audit.adjustment,
  )
  if (adjusted.length === 0) return undefined

  return {
    addedSets: adjusted.reduce(
      (sum, [, audit]) => sum + (audit.adjustment?.addedSets ?? 0),
      0,
    ),
    addedExercises: adjusted.filter(
      ([, audit]) => audit.adjustment?.addedExercise,
    ).length,
    muscleGroups: adjusted.map(([muscleGroup]) => muscleGroup),
  }
}

function generateMicrocyclePlans(input: {
  currentPlan: AuditedWorkoutPlan
  sessionCount: number
  effectiveUserWeightKg?: number
  recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  fatigueSnapshot?: WorkoutPlanContextSnapshot["fatigueSnapshot"]
}): AuditedWorkoutPlan[] {
  const plans: AuditedWorkoutPlan[] = [input.currentPlan]
  let nextState = nextTrainingStateAfterPlan(input.currentPlan)

  while (plans.length < input.sessionCount) {
    const plan = generateSession(nextState, {
      effectiveUserWeightKg: input.effectiveUserWeightKg,
      recentWorkoutSessionSummaries: input.recentWorkoutSessionSummaries,
      fatigueSnapshot: input.fatigueSnapshot,
    })

    plans.push(plan)
    nextState = nextTrainingStateAfterPlan(plan)
  }

  return plans
}

export function createAuditSnapshots(input: {
  plan: AuditedWorkoutPlan
  effectiveUserWeightKg?: number
  recentWorkoutSessionSummaries?: RecentWorkoutSessionSummary[]
  fatigueSnapshot?: WorkoutPlanContextSnapshot["fatigueSnapshot"]
}): {
  sessionAudit: WorkoutSessionAuditSnapshot
  microcycleAudit: WorkoutMicrocycleAuditSnapshot
} {
  const mainSetCount = countMainStrengthSets(input.plan.exercises)
  const sessionMissingPhases = missingSessionPhases(input.plan.exercises)
  const sessionStatus =
    sessionMissingPhases.length > 0
      ? "fail"
      : input.plan.sessionAudit?.status ?? "pass"
  const sessionReasonCodes =
    sessionMissingPhases.length > 0
      ? [MISSING_THREE_PHASE_STRUCTURE]
      : undefined
  const sessionCount = MICROCYCLE_SESSION_COUNTS[input.plan.phase]
  const microcyclePlans = generateMicrocyclePlans({
    currentPlan: input.plan,
    sessionCount,
    effectiveUserWeightKg: input.effectiveUserWeightKg,
    recentWorkoutSessionSummaries: input.recentWorkoutSessionSummaries,
    fatigueSnapshot: input.fatigueSnapshot,
  })
  const microcycleMainSetCount = microcyclePlans.reduce(
    (sum, plan) => sum + countMainStrengthSets(plan.exercises),
    0,
  )
  const structureMicrocycleStatus = auditStatusForPlans(microcyclePlans)
  const detailedMicrocycleStatus = input.plan.microcycleAudit?.status
  const microcycleStatus =
    detailedMicrocycleStatus === "constrained"
      ? "constrained"
      : structureMicrocycleStatus === "fail"
        ? "fail"
        : detailedMicrocycleStatus === "adjusted"
          ? "adjusted"
          : structureMicrocycleStatus
  const microcycleReasonCodes =
    microcycleStatus === "constrained" || microcycleStatus === "adjusted"
      ? undefined
      : reasonCodesForPlans(microcyclePlans)
  const adjustment =
    microcycleStatus === "adjusted"
      ? summarizeAdjustment(input.plan.microcycleAudit)
      : undefined
  const microcycleSummary = adjustment
    ? `本轮主训练 ${microcycleMainSetCount} 组，已为 ${adjustment.muscleGroups.length} 个肌群加组 ${adjustment.addedSets} 组以达到目标` +
      (adjustment.addedExercises > 0
        ? `（含新增 ${adjustment.addedExercises} 个动作）`
        : "")
    : `本轮主训练 ${microcycleMainSetCount} 组`

  return {
    sessionAudit: {
      status: sessionStatus,
      mainSetCount,
      summary: `本次主训练 ${mainSetCount} 组`,
      reasonCodes: sessionReasonCodes,
      constrainedReasons: input.plan.sessionAudit?.constrainedReasons,
    },
    microcycleAudit: {
      status: microcycleStatus,
      mainSetCount: microcycleMainSetCount,
      sessionCount,
      summary: microcycleSummary,
      reasonCodes: microcycleReasonCodes,
      constrainedReasons: input.plan.microcycleAudit?.constrainedReasons,
      ...(adjustment ? { adjustment } : {}),
    },
  }
}
