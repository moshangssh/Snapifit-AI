import type { MuscleKey } from "@/lib/muscle-groups"
import {
  STRENGTH_EXERCISES,
  resolveMuscleKeys,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import {
  AS_UNLOCKED_LABEL,
  unlockedRiskCategoryOf,
} from "@/lib/workout/engine/as-safety"
import {
  selectASCore,
  selectExercises,
  type ASCoreFocus,
} from "@/lib/workout/engine/selection"
import type {
  WorkoutExerciseAnalysis,
  WorkoutPlanExerciseDraft,
  WorkoutExercisePhase,
} from "@/lib/workout/types"

interface BuildSupportPhaseExercisesInput {
  mainExercises: readonly Exercise[]
  blacklist: readonly string[]
  rotationOffset: number
  effectiveUserWeightKg: number
  unlockedRiskCategories?: readonly string[]
}

const LOWER_MUSCLES = new Set<MuscleGroup>([
  "QUADS",
  "GLUTES",
  "HAMSTRINGS",
  "CALVES",
  "CORE",
])

const COOLDOWN_SUPPORT: Record<
  MuscleGroup,
  { name: string; muscleGroups: MuscleKey[] }
> = {
  CHEST: { name: "胸部拉伸", muscleGroups: ["chest"] },
  BACK: { name: "背部拉伸", muscleGroups: ["upper-back"] },
  SHOULDERS: { name: "肩部放松", muscleGroups: ["front-deltoids"] },
  QUADS: { name: "股四头肌拉伸", muscleGroups: ["quadriceps"] },
  GLUTES: { name: "臀肌拉伸", muscleGroups: ["glutes"] },
  HAMSTRINGS: { name: "腘绳肌拉伸", muscleGroups: ["hamstrings"] },
  BICEPS: { name: "肱二头肌拉伸", muscleGroups: ["biceps"] },
  TRICEPS: { name: "肱三头肌拉伸", muscleGroups: ["triceps"] },
  CORE: { name: "腹式呼吸", muscleGroups: ["abs"] },
  FOREARMS: { name: "前臂放松", muscleGroups: ["forearms"] },
  CALVES: { name: "小腿拉伸", muscleGroups: ["calves"] },
}

function analysis(
  muscleGroups: MuscleKey[],
  effectiveUserWeightKg: number,
): WorkoutExerciseAnalysis {
  const estimatedDurationMinutes = 2

  return {
    exerciseType: "flexibility",
    muscleGroups,
    estimatedMets: 2,
    estimatedDurationMinutes,
    caloriesBurnedEstimated: Math.round(
      (2 * effectiveUserWeightKg * estimatedDurationMinutes) / 60,
    ),
    isEstimated: true,
  }
}

function inferASCoreFocus(mainExercises: readonly Exercise[]): ASCoreFocus {
  const lowerCount = mainExercises.filter((exercise) =>
    LOWER_MUSCLES.has(exercise.primaryMuscle),
  ).length

  return lowerCount > mainExercises.length - lowerCount ? "lower" : "upper"
}

function dominantMuscles(mainExercises: readonly Exercise[]): MuscleGroup[] {
  return Array.from(
    new Set(mainExercises.map((exercise) => exercise.primaryMuscle)),
  )
}

function catalogSupportDraft(
  exercise: Exercise,
  phase: WorkoutExercisePhase,
  effectiveUserWeightKg: number,
  unlockedRiskCategories?: readonly string[],
): WorkoutPlanExerciseDraft {
  const labels: string[] = []
  if (exercise.tags.includes("AS_CORE")) labels.push("AS")
  if (unlockedRiskCategoryOf(exercise, unlockedRiskCategories)) {
    labels.push(AS_UNLOCKED_LABEL)
  }

  return {
    plannedExerciseName: exercise.name,
    phase,
    notes: "服务于本次主训练肌群的准备和恢复。",
    tips: ["保持动作可控。", "出现不适就降低幅度或停止。"],
    labels: labels.length > 0 ? labels : undefined,
    catalogExerciseId: exercise.id,
    sets: [{ plannedReps: 12 }],
    plannedAnalysis: analysis(
      resolveMuscleKeys(exercise),
      effectiveUserWeightKg,
    ),
  }
}

function cooldownSupportDraft(
  muscle: MuscleGroup,
  effectiveUserWeightKg: number,
): WorkoutPlanExerciseDraft {
  const support = COOLDOWN_SUPPORT[muscle]

  return {
    plannedExerciseName: support.name,
    phase: "cooldown",
    notes: "用于训练后的放松和呼吸恢复。",
    tips: ["保持自然呼吸。", "只拉伸到轻微牵拉感。"],
    sets: [{ plannedReps: 10 }],
    plannedAnalysis: analysis(
      support.muscleGroups,
      effectiveUserWeightKg,
    ),
  }
}

function selectWarmupSupport(input: {
  muscles: readonly MuscleGroup[]
  blacklist: readonly string[]
  mainExerciseIds: readonly string[]
  rotationOffset: number
  unlockedRiskCategories?: readonly string[]
}): Exercise[] {
  const selected: Exercise[] = []

  for (const [index, muscle] of input.muscles.entries()) {
    if (selected.length >= 2) break

    const excludeIds = [
      ...input.blacklist,
      ...input.mainExerciseIds,
      ...selected.map((exercise) => exercise.id),
    ]
    const [noviceCore] = selectExercises({
      muscle,
      tags: ["NOVICE_CORE"],
      excludeIds,
      count: 1,
      offset: input.rotationOffset + index,
      unlockedRiskCategories: input.unlockedRiskCategories,
    })

    if (noviceCore) {
      selected.push(noviceCore)
      continue
    }

    const [fallback] = selectExercises({
      muscle,
      pool: STRENGTH_EXERCISES,
      excludeIds,
      count: 1,
      offset: input.rotationOffset + index,
      unlockedRiskCategories: input.unlockedRiskCategories,
    })

    if (fallback) selected.push(fallback)
  }

  return selected
}

export function buildSupportPhaseExercises(
  input: BuildSupportPhaseExercisesInput,
): WorkoutPlanExerciseDraft[] {
  const focus = inferASCoreFocus(input.mainExercises)
  const mainExerciseIds = input.mainExercises.map((exercise) => exercise.id)
  const supportMuscles = dominantMuscles(input.mainExercises)
  const warmupAS = selectASCore({
    focus,
    blacklist: input.blacklist,
    count: 2,
    offset: input.rotationOffset,
  })
  const warmupSupport = selectWarmupSupport({
    muscles: supportMuscles,
    blacklist: input.blacklist,
    mainExerciseIds,
    rotationOffset: input.rotationOffset + 1,
    unlockedRiskCategories: input.unlockedRiskCategories,
  })
  const cooldownAS = selectASCore({
    focus,
    blacklist: input.blacklist,
    excludeIds: warmupAS.map((exercise) => exercise.id),
    count: 2,
    offset: input.rotationOffset + 1,
  })
  const cooldownSupport = supportMuscles
    .slice(0, 2)
    .map((muscle) =>
      cooldownSupportDraft(muscle, input.effectiveUserWeightKg),
    )

  return [
    ...warmupAS.map((exercise) =>
      catalogSupportDraft(
        exercise,
        "warmup",
        input.effectiveUserWeightKg,
        input.unlockedRiskCategories,
      ),
    ),
    ...warmupSupport.map((exercise) =>
      catalogSupportDraft(
        exercise,
        "warmup",
        input.effectiveUserWeightKg,
        input.unlockedRiskCategories,
      ),
    ),
    ...cooldownAS.map((exercise) =>
      catalogSupportDraft(
        exercise,
        "cooldown",
        input.effectiveUserWeightKg,
        input.unlockedRiskCategories,
      ),
    ),
    ...cooldownSupport,
  ]
}
