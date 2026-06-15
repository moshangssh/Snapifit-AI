import {
  AS_CORE_EXERCISES,
  STRENGTH_EXERCISES,
  type Exercise,
  type ExerciseTag,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"

export type ASCoreFocus = "upper" | "lower"

interface SelectExercisesInput {
  muscle?: MuscleGroup
  tags?: ExerciseTag[]
  pool?: readonly Exercise[]
  blacklist?: readonly string[]
  excludeIds?: readonly string[]
  count?: number
  offset?: number
}

interface SelectASCoreInput {
  focus: ASCoreFocus
  blacklist?: readonly string[]
  excludeIds?: readonly string[]
  count?: number
  offset?: number
}

const AS_FOCUS_MUSCLES: Record<ASCoreFocus, MuscleGroup[]> = {
  upper: ["SHOULDERS", "BACK"],
  lower: ["QUADS", "GLUTES"],
}

const AS_FOCUS_DIMENSION_IDS: Record<ASCoreFocus, string[][]> = {
  upper: [
    [
      "08cde7c0-5988-4190-b12b-b0b565d113f6", // 手臂环绕
      "6d2a3622-980f-4d8f-aa00-852652cdd1d5", // 弹力带肩部穿越
    ],
    [
      "77e949b2-df71-4560-b72c-f79eaa7966dc", // 坐姿肩外旋
      "291593e2-7736-4028-9bf2-77192645930b", // 颈部侧向拉伸
      "3ba7a9b4-88ba-4390-9593-de658b6668e6", // 哑铃古巴旋转
    ],
  ],
  lower: [
    [
      "4a5f1411-75cd-4485-bbcb-d408f76f0a93", // 弓步拉伸
      "4ec535de-1f4a-451a-9dc5-dab2920b51f4", // 坐姿四字伸展
    ],
    [
      "183cf14a-3214-4b69-8047-c5ddb4fa0f08", // 站立前屈
      "1fcb8c2c-1f5c-4623-91b4-5f2f946ade06", // 仰卧蝴蝶式
      "085df570-92e9-46b5-ad8c-fd6650a4a498", // 坐姿单腿腘绳肌拉伸
    ],
  ],
}

const AS_CORE_BY_ID = new Map(
  AS_CORE_EXERCISES.map((exercise) => [exercise.id, exercise]),
)

// Validate that all dimension IDs exist in the catalog
const INVALID_DIMENSION_IDS = Object.values(AS_FOCUS_DIMENSION_IDS)
  .flat(2)
  .filter((id) => !AS_CORE_BY_ID.has(id))

if (INVALID_DIMENSION_IDS.length > 0) {
  throw new Error(
    `Invalid AS dimension IDs not found in catalog: ${INVALID_DIMENSION_IDS.join(", ")}`,
  )
}

function blockedIds(input: {
  blacklist?: readonly string[]
  excludeIds?: readonly string[]
}): Set<string> {
  return new Set([...(input.blacklist ?? []), ...(input.excludeIds ?? [])])
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items

  const start = ((offset % items.length) + items.length) % items.length
  return [...items.slice(start), ...items.slice(0, start)]
}

export function selectExercises(input: SelectExercisesInput): Exercise[] {
  const pool = input.pool ?? STRENGTH_EXERCISES
  const blocked = blockedIds(input)
  const tags = input.tags ?? []
  const filtered = pool.filter(
    (exercise) =>
      (!input.muscle || exercise.primaryMuscle === input.muscle) &&
      tags.every((tag) => exercise.tags.includes(tag)) &&
      !blocked.has(exercise.id),
  )
  const rotated = rotate(filtered, input.offset ?? 0)

  return typeof input.count === "number"
    ? rotated.slice(0, Math.max(0, input.count))
    : rotated
}

export function selectASCore(input: SelectASCoreInput): Exercise[] {
  const count = Math.max(0, input.count ?? 2)
  if (count === 0) return []

  const focusMuscles = AS_FOCUS_MUSCLES[input.focus]
  const selected: Exercise[] = []
  const blocked = blockedIds(input)
  const offset = input.offset ?? 0

  for (const dimensionIds of AS_FOCUS_DIMENSION_IDS[input.focus]) {
    if (selected.length >= count) break

    const candidates = dimensionIds
      .map((id) => AS_CORE_BY_ID.get(id))
      .filter(
        (exercise): exercise is Exercise =>
          exercise !== undefined &&
          exercise.tags.includes("AS_CORE") &&
          !blocked.has(exercise.id) &&
          !selected.some((item) => item.id === exercise.id),
      )
    const [exercise] = rotate(candidates, offset)

    if (exercise) selected.push(exercise)
  }

  if (selected.length >= count) return selected

  const preferredFallback = rotate(
    AS_CORE_EXERCISES.filter(
      (exercise) =>
        exercise.tags.includes("AS_CORE") &&
        focusMuscles.includes(exercise.primaryMuscle) &&
        !blocked.has(exercise.id) &&
        !selected.some((item) => item.id === exercise.id),
    ),
    offset,
  ).slice(0, count - selected.length)

  selected.push(...preferredFallback)

  if (selected.length >= count) return selected

  const fallback = rotate(
    AS_CORE_EXERCISES.filter(
      (exercise) =>
        exercise.tags.includes("AS_CORE") &&
        !blocked.has(exercise.id) &&
        !selected.some((item) => item.id === exercise.id),
    ),
    offset,
  ).slice(0, count - selected.length)

  return [...selected, ...fallback]
}
