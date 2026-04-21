export const MUSCLE_KEYS = [
  "chest",
  "abs",
  "obliques",
  "upper-back",
  "lower-back",
  "front-deltoids",
  "back-deltoids",
  "biceps",
  "triceps",
  "forearms",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
] as const

export type MuscleKey = typeof MUSCLE_KEYS[number]

export const MUSCLE_KEY_SET: ReadonlySet<string> = new Set(MUSCLE_KEYS)

export const FRONT_MUSCLES: readonly MuscleKey[] = [
  "chest",
  "abs",
  "obliques",
  "front-deltoids",
  "biceps",
  "forearms",
  "quadriceps",
]

export const BACK_MUSCLES: readonly MuscleKey[] = [
  "upper-back",
  "lower-back",
  "back-deltoids",
  "triceps",
  "glutes",
  "hamstrings",
  "calves",
]
