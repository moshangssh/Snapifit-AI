import {
  STRENGTH_EXERCISES,
  type Exercise,
} from "@/lib/workout/engine/catalog"

function isReplacementCandidate(original: Exercise, blockedIds: Set<string>) {
  return (candidate: Exercise) =>
    candidate.id !== original.id &&
    candidate.primaryMuscle === original.primaryMuscle &&
    candidate.mechanics === original.mechanics &&
    (candidate.equipment !== original.equipment ||
      candidate.angle !== original.angle) &&
    !blockedIds.has(candidate.id)
}

function sortByEquipmentPriority(original: Exercise) {
  return (left: Exercise, right: Exercise) => {
    const leftSameEquipment = left.equipment === original.equipment ? 0 : 1
    const rightSameEquipment = right.equipment === original.equipment ? 0 : 1

    return leftSameEquipment - rightSameEquipment
  }
}

export function findReplacement(
  original: Exercise,
  pool: readonly Exercise[],
  blacklist: readonly string[] = [],
): Exercise | undefined {
  const blockedIds = new Set([...blacklist, original.id])
  const matchesOriginalPool = pool
    .filter(isReplacementCandidate(original, blockedIds))
    .sort(sortByEquipmentPriority(original))

  if (matchesOriginalPool[0]) return matchesOriginalPool[0]

  return STRENGTH_EXERCISES.filter((exercise) =>
    exercise.tags.includes("INTERMEDIATE_VARIANT"),
  )
    .filter(isReplacementCandidate(original, blockedIds))
    .sort(sortByEquipmentPriority(original))[0]
}
