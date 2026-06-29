import type {
  TrainingPhase,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"

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

export interface MuscleGroupVolumeAudit {
  status: VolumeAuditStatus
  sets: number
  targetMinSets: number
  targetMaxSets: number
  constrainedReasons: VolumeAuditConstrainedReason[]
}

export interface MicrocycleVolumeAudit {
  status: VolumeAuditStatus
  phase: TrainingPhase
  completedSessionCount: number
  generatedSessionCount: number
  muscleGroupAudits: Record<string, MuscleGroupVolumeAudit>
  constrainedReasons: VolumeAuditConstrainedReason[]
}

function noviceTarget(completedSessionCount: number) {
  return completedSessionCount <= 24
    ? { min: 6, max: 10 }
    : { min: 8, max: 12 }
}

function targetFor(input: {
  phase: TrainingPhase
  completedSessionCount: number
  currentBlock?: "accumulation" | "intensification" | "deload"
  trainingType?: "strength" | "hypertrophy" | "endurance"
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

function statusForSets(input: {
  sets: number
  min: number
  constrainedReasons: VolumeAuditConstrainedReason[]
}): VolumeAuditStatus {
  if (input.constrainedReasons.includes("deload")) return "constrained"
  if (input.sets >= input.min) return "pass"
  return input.constrainedReasons.length > 0 ? "constrained" : "fail"
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
  trainingType?: "strength" | "hypertrophy" | "endurance"
  isDeload: boolean
  sessions: Array<{ exercises: WorkoutPlanExerciseDraft[] }>
  constrainedReasons?: VolumeAuditConstrainedReason[]
}): MicrocycleVolumeAudit {
  const constrainedReasons = [
    ...(input.constrainedReasons ?? []),
    ...(input.isDeload ? (["deload"] as const) : []),
  ]
  const target = targetFor(input)
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
        setsByMuscle.set(
          muscleGroup,
          (setsByMuscle.get(muscleGroup) ?? 0) + exercise.sets.length,
        )
      }
    }
  }

  const muscleGroupAudits = Object.fromEntries(
    [...setsByMuscle.entries()].map(([muscleGroup, sets]) => [
      muscleGroup,
      {
        status: statusForSets({
          sets,
          min: target.min,
          constrainedReasons,
        }),
        sets,
        targetMinSets: target.min,
        targetMaxSets: target.max,
        constrainedReasons,
      },
    ]),
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
