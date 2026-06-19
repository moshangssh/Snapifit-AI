import { AS_CORE_EXERCISES } from "@/lib/workout/engine/catalog"

const AS_CORE_EXERCISE_IDS = new Set(
  AS_CORE_EXERCISES.map((exercise) => exercise.id),
)

export function getWorkoutExerciseLabels(input: {
  catalogExerciseId?: string
  labels?: string[]
}): string[] {
  const labels = [...(input.labels ?? [])]

  if (
    input.catalogExerciseId &&
    AS_CORE_EXERCISE_IDS.has(input.catalogExerciseId) &&
    !labels.includes("AS")
  ) {
    labels.push("AS")
  }

  return labels
}
