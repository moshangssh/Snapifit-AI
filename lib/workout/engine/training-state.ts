import type { TrainingPhase, TrainingState } from "@/lib/workout/types"

export type { TrainingPhase, TrainingState }

export const TRAINING_STATE_STORAGE_KEY = "trainingState"

export const DEFAULT_TRAINING_STATE: TrainingState = {
  phase: "novice",
  completedSessionCount: 0,
  blacklistedExerciseIds: [],
}

function isTrainingPhase(value: unknown): value is TrainingPhase {
  return value === "novice" || value === "intermediate" || value === "advanced"
}

export function normalizeTrainingState(value: unknown): TrainingState {
  if (!value || typeof value !== "object") return DEFAULT_TRAINING_STATE

  const state = value as Partial<TrainingState>
  return {
    phase: isTrainingPhase(state.phase)
      ? state.phase
      : DEFAULT_TRAINING_STATE.phase,
    completedSessionCount:
      typeof state.completedSessionCount === "number" &&
      Number.isFinite(state.completedSessionCount) &&
      state.completedSessionCount >= 0
        ? Math.floor(state.completedSessionCount)
        : DEFAULT_TRAINING_STATE.completedSessionCount,
    blacklistedExerciseIds: Array.isArray(state.blacklistedExerciseIds)
      ? state.blacklistedExerciseIds.filter(
          (item): item is string => typeof item === "string",
        )
      : DEFAULT_TRAINING_STATE.blacklistedExerciseIds,
  }
}

export function readTrainingState(storage?: Storage): TrainingState {
  const targetStorage =
    storage ?? (typeof window === "undefined" ? undefined : window.localStorage)
  if (!targetStorage) return DEFAULT_TRAINING_STATE

  try {
    const raw = targetStorage.getItem(TRAINING_STATE_STORAGE_KEY)
    return normalizeTrainingState(raw ? JSON.parse(raw) : undefined)
  } catch {
    return DEFAULT_TRAINING_STATE
  }
}

export function writeTrainingState(
  state: TrainingState,
  storage?: Storage,
): TrainingState {
  const targetStorage =
    storage ?? (typeof window === "undefined" ? undefined : window.localStorage)
  const normalized = normalizeTrainingState(state)

  if (targetStorage) {
    targetStorage.setItem(TRAINING_STATE_STORAGE_KEY, JSON.stringify(normalized))
  }

  return normalized
}

export function recordCompletedTrainingSession(
  state: TrainingState,
): TrainingState {
  const normalized = normalizeTrainingState(state)

  return {
    ...normalized,
    completedSessionCount: normalized.completedSessionCount + 1,
  }
}
