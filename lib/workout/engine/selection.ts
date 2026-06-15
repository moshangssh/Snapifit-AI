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
  const count = input.count ?? 2
  const focusMuscles = AS_FOCUS_MUSCLES[input.focus]
  const selected: Exercise[] = []

  for (const muscle of focusMuscles) {
    if (selected.length >= count) break

    const [exercise] = selectExercises({
      pool: AS_CORE_EXERCISES,
      muscle,
      tags: ["AS_CORE"],
      blacklist: input.blacklist,
      excludeIds: [...(input.excludeIds ?? []), ...selected.map((item) => item.id)],
      count: 1,
      offset: input.offset ?? 0,
    })

    if (exercise) selected.push(exercise)
  }

  if (selected.length >= count) return selected

  const fallback = selectExercises({
    pool: AS_CORE_EXERCISES,
    tags: ["AS_CORE"],
    blacklist: input.blacklist,
    excludeIds: [
      ...(input.excludeIds ?? []),
      ...selected.map((exercise) => exercise.id),
    ],
    offset: input.offset ?? 0,
  }).filter((exercise) => focusMuscles.includes(exercise.primaryMuscle))

  return [...selected, ...fallback].slice(0, count)
}
