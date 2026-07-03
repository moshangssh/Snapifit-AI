import type {
  TrainingPhase,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"
import type { MuscleKey } from "@/lib/muscle-groups"

export type VolumeAuditStatus = "pass" | "adjusted" | "constrained" | "fail"

export type VolumeAuditConstrainedReason =
  | "deload"
  | "as_safety_lock"
  | "blacklist"
  | "exercise_pool_limit"

export interface SessionVolumeAudit {
  status: VolumeAuditStatus
  phase: TrainingPhase
  hasThreePhaseStructure: boolean
  mainStrengthSetCount: number
  constrainedReasons: VolumeAuditConstrainedReason[]
}

export interface MuscleGroupVolumeAdjustment {
  /** Main strength sets the bounded adjustment adds to reach the target minimum. */
  addedSets: number
  /** Whether reaching the target required introducing one new safe main exercise. */
  addedExercise: boolean
  /** Resulting main strength sets after the bounded adjustment. */
  adjustedSets: number
}

/**
 * Per muscle group, how much main strength volume the engine may still add safely.
 * `headroomExisting` are sets that fit on the muscle's already-prescribed main
 * exercises (within per-exercise and per-session caps); `headroomNewExercise` are
 * the additional sets reachable only by introducing one new safe main exercise
 * (0 when AS locks, the blacklist, or the phase pool leave no candidate).
 */
export interface MicrocycleVolumeAdjustmentCapacity {
  headroomExisting: number
  headroomNewExercise: number
}

export interface MuscleGroupVolumeAudit {
  status: VolumeAuditStatus
  sets: number
  targetMinSets: number
  targetMaxSets: number
  constrainedReasons: VolumeAuditConstrainedReason[]
  adjustment?: MuscleGroupVolumeAdjustment
}

export interface MicrocycleVolumeAudit {
  status: VolumeAuditStatus
  phase: TrainingPhase
  completedSessionCount: number
  generatedSessionCount: number
  muscleGroupAudits: Record<string, MuscleGroupVolumeAudit>
  constrainedReasons: VolumeAuditConstrainedReason[]
}

export type VolumeAuditTrainingType = "strength" | "hypertrophy" | "endurance"

function noviceTarget(completedSessionCount: number) {
  return completedSessionCount <= 24
    ? { min: 6, max: 10 }
    : { min: 8, max: 12 }
}

function targetFor(input: {
  phase: TrainingPhase
  completedSessionCount: number
  currentBlock?: "accumulation" | "intensification" | "deload"
  trainingType?: VolumeAuditTrainingType
}) {
  if (input.phase === "intermediate") {
    if (input.currentBlock === "intensification") return { min: 4, max: 8 }
    if (input.currentBlock === "deload") return { min: 0, max: 6 }
    return { min: 6, max: 10 }
  }

  if (input.phase === "advanced") {
    if (input.trainingType === "hypertrophy") return { min: 8, max: 12 }
    if (input.trainingType === "endurance") return { min: 10, max: 16 }
    return { min: 6, max: 10 }
  }

  return noviceTarget(input.completedSessionCount)
}

const NO_ADJUSTMENT_CAPACITY: MicrocycleVolumeAdjustmentCapacity = {
  headroomExisting: 0,
  headroomNewExercise: 0,
}

/**
 * Decide one muscle group's audit outcome, applying 有限容量调整 (bounded volume
 * adjustment) when the prescription is below target but can be corrected safely.
 *
 * Bounded adjustment prefers adding sets to existing main work before introducing a
 * new main exercise, and it never exceeds the supplied capacity, so per-session caps,
 * AS safety locks, the blacklist, and the phase pool stay intact. When the deficit
 * cannot be closed within capacity the group stays `constrained` (if a reason explains
 * the shortfall) or `fail`, never bypassing safety just to hit a number.
 */
function decideMuscleAudit(input: {
  sets: number
  min: number
  max: number
  constrainedReasons: VolumeAuditConstrainedReason[]
  capacity: MicrocycleVolumeAdjustmentCapacity
}): { status: VolumeAuditStatus; adjustment?: MuscleGroupVolumeAdjustment } {
  if (input.constrainedReasons.includes("deload")) return { status: "constrained" }
  if (input.sets > input.max) return { status: "fail" }
  if (input.sets >= input.min) return { status: "pass" }

  const deficit = input.min - input.sets
  const { headroomExisting, headroomNewExercise } = input.capacity

  if (deficit <= headroomExisting + headroomNewExercise) {
    return {
      status: "adjusted",
      adjustment: {
        addedSets: deficit,
        addedExercise: deficit > headroomExisting,
        adjustedSets: input.sets + deficit,
      },
    }
  }

  return {
    status: input.constrainedReasons.length > 0 ? "constrained" : "fail",
  }
}

function targetForTrainingTypes(input: {
  phase: TrainingPhase
  completedSessionCount: number
  currentBlock?: "accumulation" | "intensification" | "deload"
  trainingTypes: VolumeAuditTrainingType[]
}) {
  if (input.trainingTypes.length === 0) {
    return targetFor(input)
  }

  const targets = input.trainingTypes.map((trainingType) =>
    targetFor({
      phase: input.phase,
      completedSessionCount: input.completedSessionCount,
      currentBlock: input.currentBlock,
      trainingType,
    }),
  )

  return {
    min: Math.min(...targets.map((target) => target.min)),
    max: Math.max(...targets.map((target) => target.max)),
  }
}

function auditMuscleGroupKey(muscleGroup: string) {
  if (
    muscleGroup === "front-deltoids" ||
    muscleGroup === "side-deltoids" ||
    muscleGroup === "back-deltoids"
  ) {
    return "front-deltoids"
  }

  return muscleGroup
}

/**
 * Compute how much main strength volume each muscle group can still absorb safely,
 * for use as `auditMicrocycleVolume`'s `adjustmentCapacity`. Headroom on existing main
 * work never breaks the per-exercise or per-session set cap; a new safe exercise's
 * headroom is only offered for muscle groups the engine reports still have a usable
 * candidate (`muscleGroupsWithSafeCandidate`), so AS locks, the blacklist, and the
 * phase pool are respected by construction.
 */
export function computeMicrocycleAdjustmentCapacity(input: {
  sessions: Array<{ exercises: WorkoutPlanExerciseDraft[] }>
  perExerciseMainSetCap: number
  perSessionMainSetCap: number
  muscleGroupsWithSafeCandidate?: Iterable<string>
  newExerciseSetCount?: number
}): Record<string, MicrocycleVolumeAdjustmentCapacity> {
  const headroomExisting = new Map<string, number>()

  for (const session of input.sessions) {
    const mainStrength = session.exercises.filter(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.exerciseType === "strength",
    )
    const sessionMainSets = mainStrength.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    )
    const sessionRoom = Math.max(0, input.perSessionMainSetCap - sessionMainSets)

    // Sum per-exercise room by muscle key within this session, then clamp each
    // key's contribution by sessionRoom. One session can never absorb more than
    // sessionRoom added sets total, so when several main exercises share a key
    // the per-session cap holds per key — not just per exercise (#74). (Note:
    // the cap is still a shared budget across keys; this clamp bounds each key,
    // not simultaneous deficits on different keys competing for the same room.)
    const sessionHeadroom = new Map<string, number>()
    for (const exercise of mainStrength) {
      const perExerciseRoom = Math.max(
        0,
        input.perExerciseMainSetCap - exercise.sets.length,
      )
      if (perExerciseRoom <= 0) continue

      for (const muscleGroup of exercise.plannedAnalysis.muscleGroups) {
        const key = auditMuscleGroupKey(muscleGroup)
        sessionHeadroom.set(
          key,
          (sessionHeadroom.get(key) ?? 0) + perExerciseRoom,
        )
      }
    }

    for (const [key, room] of sessionHeadroom) {
      const contribution = Math.min(room, sessionRoom)
      if (contribution <= 0) continue
      headroomExisting.set(key, (headroomExisting.get(key) ?? 0) + contribution)
    }
  }

  const safeCandidateKeys = new Set(
    [...(input.muscleGroupsWithSafeCandidate ?? [])].map(auditMuscleGroupKey),
  )
  const newExerciseSetCount =
    input.newExerciseSetCount ?? input.perExerciseMainSetCap
  const keys = new Set([...headroomExisting.keys(), ...safeCandidateKeys])

  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      {
        headroomExisting: headroomExisting.get(key) ?? 0,
        headroomNewExercise: safeCandidateKeys.has(key)
          ? newExerciseSetCount
          : 0,
      },
    ]),
  )
}

export function auditSessionVolume(input: {
  phase: TrainingPhase
  isDeload: boolean
  exercises: WorkoutPlanExerciseDraft[]
}): SessionVolumeAudit {
  const phaseSet = new Set(input.exercises.map((exercise) => exercise.phase))
  const hasThreePhaseStructure =
    phaseSet.has("warmup") && phaseSet.has("main") && phaseSet.has("cooldown")
  const mainStrengthSetCount = input.exercises
    .filter(
      (exercise) =>
        exercise.phase === "main" &&
        exercise.plannedAnalysis.exerciseType === "strength",
    )
    .reduce((total, exercise) => total + exercise.sets.length, 0)
  const constrainedReasons: VolumeAuditConstrainedReason[] = input.isDeload
    ? ["deload"]
    : []
  const status: VolumeAuditStatus = !hasThreePhaseStructure
    ? "fail"
    : input.isDeload
      ? "constrained"
      : mainStrengthSetCount > 0
        ? "pass"
        : "fail"

  return {
    status,
    phase: input.phase,
    hasThreePhaseStructure,
    mainStrengthSetCount,
    constrainedReasons,
  }
}

export function auditMicrocycleVolume(input: {
  phase: TrainingPhase
  completedSessionCount: number
  currentBlock?: "accumulation" | "intensification" | "deload"
  trainingType?: VolumeAuditTrainingType
  isDeload: boolean
  expectedMuscleGroups?: MuscleKey[]
  sessions: Array<{
    exercises: WorkoutPlanExerciseDraft[]
    trainingType?: VolumeAuditTrainingType
  }>
  constrainedReasons?: VolumeAuditConstrainedReason[]
  adjustmentCapacity?: Record<string, MicrocycleVolumeAdjustmentCapacity>
}): MicrocycleVolumeAudit {
  const constrainedReasons = [
    ...(input.constrainedReasons ?? []),
    ...(input.isDeload ? (["deload"] as const) : []),
  ]
  const sessionTrainingTypes =
    input.phase === "advanced"
      ? input.sessions
          .map((session) => session.trainingType)
          .filter(
            (trainingType): trainingType is VolumeAuditTrainingType =>
              trainingType !== undefined,
          )
      : []
  const target =
    sessionTrainingTypes.length > 0
      ? targetForTrainingTypes({
          phase: input.phase,
          completedSessionCount: input.completedSessionCount,
          currentBlock: input.currentBlock,
          trainingTypes: sessionTrainingTypes,
        })
      : targetFor(input)
  const setsByMuscle = new Map<string, number>()

  for (const session of input.sessions) {
    for (const exercise of session.exercises) {
      if (
        exercise.phase !== "main" ||
        exercise.plannedAnalysis.exerciseType !== "strength"
      ) {
        continue
      }

      for (const muscleGroup of exercise.plannedAnalysis.muscleGroups) {
        const auditKey = auditMuscleGroupKey(muscleGroup)
        setsByMuscle.set(
          auditKey,
          (setsByMuscle.get(auditKey) ?? 0) + exercise.sets.length,
        )
      }
    }
  }

  const auditedMuscleGroups = [
    ...new Set([
      ...(input.expectedMuscleGroups ?? []).map(auditMuscleGroupKey),
      ...setsByMuscle.keys(),
    ]),
  ]
  const muscleGroupAudits = Object.fromEntries(
    auditedMuscleGroups.map((muscleGroup) => {
      const sets = setsByMuscle.get(muscleGroup) ?? 0
      const decision = decideMuscleAudit({
        sets,
        min: target.min,
        max: target.max,
        constrainedReasons,
        capacity:
          input.adjustmentCapacity?.[muscleGroup] ?? NO_ADJUSTMENT_CAPACITY,
      })

      return [
        muscleGroup,
        {
          status: decision.status,
          sets,
          targetMinSets: target.min,
          targetMaxSets: target.max,
          constrainedReasons,
          ...(decision.adjustment
            ? { adjustment: decision.adjustment }
            : {}),
        },
      ]
    }),
  )
  const statuses = Object.values(muscleGroupAudits).map((audit) => audit.status)
  const status =
    statuses.length === 0
      ? constrainedReasons.length > 0
        ? "constrained"
        : "fail"
      : statuses.includes("fail")
        ? "fail"
        : statuses.includes("constrained")
          ? "constrained"
          : statuses.includes("adjusted")
            ? "adjusted"
            : "pass"

  return {
    status,
    phase: input.phase,
    completedSessionCount: input.completedSessionCount,
    generatedSessionCount: input.sessions.length,
    muscleGroupAudits,
    constrainedReasons,
  }
}
