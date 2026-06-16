const DELOAD_INTERVAL_SESSIONS = 12
const DELOAD_DURATION_SESSIONS = 3
const DELOAD_WEIGHT_MULTIPLIER = 0.7

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
