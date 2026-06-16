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
  const normalized: TrainingState = {
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

  if (
    typeof state.stalledExercises === "number" &&
    Number.isFinite(state.stalledExercises) &&
    state.stalledExercises >= 0
  ) {
    normalized.stalledExercises = Math.floor(state.stalledExercises)
  }

  if (typeof state.phaseTransitionReady === "boolean") {
    normalized.phaseTransitionReady = state.phaseTransitionReady
  }

  if (
    state.manualDowngrade &&
    isTrainingPhase(state.manualDowngrade.from) &&
    typeof state.manualDowngrade.at === "number" &&
    Number.isFinite(state.manualDowngrade.at) &&
    state.manualDowngrade.at >= 0 &&
    typeof state.manualDowngrade.upgradeAfter === "number" &&
    Number.isFinite(state.manualDowngrade.upgradeAfter) &&
    state.manualDowngrade.upgradeAfter > 0
  ) {
    normalized.manualDowngrade = {
      from: state.manualDowngrade.from,
      at: Math.floor(state.manualDowngrade.at),
      upgradeAfter: Math.floor(state.manualDowngrade.upgradeAfter),
    }
  }

  return normalized
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

export function setExerciseBlacklisted(
  state: TrainingState,
  exerciseId: string,
  isBlacklisted: boolean,
): TrainingState {
  const normalized = normalizeTrainingState(state)
  if (!exerciseId) return normalized

  return {
    ...normalized,
    blacklistedExerciseIds: isBlacklisted
      ? Array.from(new Set([...normalized.blacklistedExerciseIds, exerciseId]))
      : normalized.blacklistedExerciseIds.filter((id) => id !== exerciseId),
  }
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
