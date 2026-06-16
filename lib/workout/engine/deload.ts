const DELOAD_INTERVAL_SESSIONS = 12
const DELOAD_DURATION_SESSIONS = 3
const DELOAD_WEIGHT_MULTIPLIER = 0.7
const ADVANCED_DELOAD_DURATION_SESSIONS = 6
const ADVANCED_DELOAD_MAX_SESSIONS = 18
const ADVANCED_FATIGUE_THRESHOLD = 60
const ADVANCED_FATIGUE_GROUP_COUNT = 4

type FatigueSnapshot = Record<
  string,
  {
    intensity: 0 | 30 | 60 | 100
  }
>

export function shouldDeload(completedSessionCount: number) {
  if (completedSessionCount < DELOAD_INTERVAL_SESSIONS) return false

  return completedSessionCount % DELOAD_INTERVAL_SESSIONS < DELOAD_DURATION_SESSIONS
}

export function calculateDeloadParams(
  originalWeight: number,
  originalSets: number,
) {
  return {
    weight: Number((originalWeight * DELOAD_WEIGHT_MULTIPLIER).toFixed(2)),
    sets: Math.max(1, originalSets - 1),
  }
}

export function shouldAdvancedDeload(options: {
  completedSessionCount: number
  lastDeloadSession?: number
  currentBlock?: "accumulation" | "intensification" | "deload"
  fatigueSnapshot?: FatigueSnapshot
}) {
  if (
    options.currentBlock === "deload" &&
    typeof options.lastDeloadSession === "number" &&
    options.completedSessionCount - options.lastDeloadSession <
      ADVANCED_DELOAD_DURATION_SESSIONS
  ) {
    return true
  }

  if (
    countHighFatigueMuscleGroups(options.fatigueSnapshot) >=
    ADVANCED_FATIGUE_GROUP_COUNT
  ) {
    return true
  }

  const lastDeloadSession = options.lastDeloadSession ?? 240
  const nextSessionNumber = options.completedSessionCount + 1

  return nextSessionNumber - lastDeloadSession >= ADVANCED_DELOAD_MAX_SESSIONS
}

export function countHighFatigueMuscleGroups(
  fatigueSnapshot?: FatigueSnapshot,
) {
  if (!fatigueSnapshot) return 0

  return Object.values(fatigueSnapshot).filter(
    (muscle) => muscle.intensity >= ADVANCED_FATIGUE_THRESHOLD,
  ).length
}
