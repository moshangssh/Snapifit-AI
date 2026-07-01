import type {
  WorkoutAuditStatus,
  WorkoutExercisePhase,
  WorkoutMicrocycleAuditSnapshot,
  WorkoutPlanExerciseDraft,
  WorkoutSessionAuditSnapshot,
  WorkoutVolumeAdjustmentSummary,
} from "@/lib/workout/types"
import type {
  MicrocycleVolumeAudit,
  SessionVolumeAudit,
} from "@/lib/workout/engine/volume-audit"

const REQUIRED_SESSION_PHASES: WorkoutExercisePhase[] = [
  "warmup",
  "main",
  "cooldown",
]
const MISSING_THREE_PHASE_STRUCTURE = "missing_three_phase_structure"

type PlanExercises = { exercises: WorkoutPlanExerciseDraft[] }

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

function auditStatusForPlans(plans: readonly PlanExercises[]) {
  return plans.some((plan) => missingSessionPhases(plan.exercises).length > 0)
    ? "fail"
    : "pass"
}

function reasonCodesForPlans(plans: readonly PlanExercises[]) {
  return auditStatusForPlans(plans) === "fail"
    ? [MISSING_THREE_PHASE_STRUCTURE]
    : undefined
}

/**
 * Summarize 有限容量调整 (bounded volume adjustment) from a microcycle volume audit, so
 * the 审计快照 can explain what the engine corrected (added sets / new exercises and which
 * muscle groups). Returns undefined when nothing was adjusted.
 */
function summarizeAdjustment(
  microcycleAudit: MicrocycleVolumeAudit,
): WorkoutVolumeAdjustmentSummary | undefined {
  const adjusted = Object.entries(microcycleAudit.muscleGroupAudits).filter(
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

/**
 * Map the engine's internal volume audits into the external 审计快照, reusing the one
 * rotation-aligned microcycle the engine already generated (see #80 / ADR-0012). No
 * session is regenerated here; `microcyclePlans` is the canonical microcycle the caller
 * built once, and the `*VolumeAudit` inputs are its already-computed detailed audits.
 */
export function toAuditSnapshots(input: {
  sessionExercises: readonly WorkoutPlanExerciseDraft[]
  microcyclePlans: readonly PlanExercises[]
  sessionVolumeAudit: SessionVolumeAudit
  microcycleVolumeAudit: MicrocycleVolumeAudit
}): {
  sessionAudit: WorkoutSessionAuditSnapshot
  microcycleAudit: WorkoutMicrocycleAuditSnapshot
} {
  const mainSetCount = countMainStrengthSets(input.sessionExercises)
  const sessionMissingPhases = missingSessionPhases(input.sessionExercises)
  const sessionStatus: WorkoutAuditStatus =
    sessionMissingPhases.length > 0 ? "fail" : input.sessionVolumeAudit.status
  const sessionReasonCodes =
    sessionMissingPhases.length > 0 ? [MISSING_THREE_PHASE_STRUCTURE] : undefined

  const microcycleMainSetCount = input.microcyclePlans.reduce(
    (sum, plan) => sum + countMainStrengthSets(plan.exercises),
    0,
  )
  const structureMicrocycleStatus = auditStatusForPlans(input.microcyclePlans)
  const detailedMicrocycleStatus = input.microcycleVolumeAudit.status
  const microcycleStatus: WorkoutAuditStatus =
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
      : reasonCodesForPlans(input.microcyclePlans)
  const adjustment =
    microcycleStatus === "adjusted"
      ? summarizeAdjustment(input.microcycleVolumeAudit)
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
      constrainedReasons: input.sessionVolumeAudit.constrainedReasons,
    },
    microcycleAudit: {
      status: microcycleStatus,
      mainSetCount: microcycleMainSetCount,
      sessionCount: input.microcyclePlans.length,
      summary: microcycleSummary,
      reasonCodes: microcycleReasonCodes,
      constrainedReasons: input.microcycleVolumeAudit.constrainedReasons,
      ...(adjustment ? { adjustment } : {}),
    },
  }
}
