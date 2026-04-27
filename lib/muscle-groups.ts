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

export const MUSCLE_LABELS_ZH: Record<MuscleKey, string> = {
  "chest": "胸部",
  "abs": "腹肌",
  "obliques": "腹斜肌",
  "upper-back": "上背",
  "lower-back": "下背",
  "front-deltoids": "前三角肌",
  "back-deltoids": "后三角肌",
  "biceps": "肱二头肌",
  "triceps": "肱三头肌",
  "forearms": "前臂",
  "quadriceps": "股四头肌",
  "hamstrings": "腘绳肌",
  "glutes": "臀肌",
  "calves": "小腿",
}

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

/**
 * 我们的 MuscleKey → react-muscle-highlighter 的 Slug 字面量。
 * 库的 slug 值域:abs | biceps | calves | chest | deltoids | forearm | gluteal |
 *   hamstring | lower-back | obliques | quadriceps | triceps | upper-back | ...
 * 四个不一致点:front/back-deltoids 共用 deltoids(靠 side 视图区分);
 *   forearms→forearm;hamstrings→hamstring;glutes→gluteal(单复数/词形)。
 */
export const MUSCLE_TO_LIB_SLUG: Record<MuscleKey, string> = {
  "chest": "chest",
  "abs": "abs",
  "obliques": "obliques",
  "upper-back": "upper-back",
  "lower-back": "lower-back",
  "front-deltoids": "deltoids",
  "back-deltoids": "deltoids",
  "biceps": "biceps",
  "triceps": "triceps",
  "forearms": "forearm",
  "quadriceps": "quadriceps",
  "hamstrings": "hamstring",
  "glutes": "gluteal",
  "calves": "calves",
}
