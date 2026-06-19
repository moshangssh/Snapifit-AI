import {
  STRENGTH_EXERCISES,
  type Exercise,
} from "@/lib/workout/engine/catalog"
import { filterASSafe } from "@/lib/workout/engine/as-safety"

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
  unlockedRiskCategories: readonly string[] = [],
): Exercise | undefined {
  const blockedIds = new Set([...blacklist, original.id])
  const matchesOriginalPool = pool
    .filter(isReplacementCandidate(original, blockedIds))
    .sort(sortByEquipmentPriority(original))

  if (matchesOriginalPool[0]) return matchesOriginalPool[0]

  // 拓宽到中级变式时仍须套用 AS 安全锁，否则 fallback 会绕过默认锁定，
  // 把过顶按压等风险动作拉进计划（调用方传入的 pool 已过滤，但本池是独立构建的）。
  return filterASSafe(
    STRENGTH_EXERCISES.filter((exercise) =>
      exercise.tags.includes("INTERMEDIATE_VARIANT"),
    ),
    unlockedRiskCategories,
  )
    .filter(isReplacementCandidate(original, blockedIds))
    .sort(sortByEquipmentPriority(original))[0]
}
