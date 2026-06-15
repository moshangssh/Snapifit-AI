import {
  ALL_EXERCISES,
  STRENGTH_EXERCISES,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
import {
  selectASCore,
  selectExercises,
  type ASCoreFocus,
} from "@/lib/workout/engine/selection"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type {
  WorkoutExerciseAnalysis,
  WorkoutExercisePhase,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"
import type { MuscleKey } from "@/lib/muscle-groups"

type TemplateName = "上A" | "下A" | "上B" | "下B"

export interface GeneratedWorkoutPlan {
  templateIndex: number
  templateName: TemplateName
  phase: "novice"
  isDeload: boolean
  exercises: WorkoutPlanExerciseDraft[]
}

interface GenerateSessionOptions {
  effectiveUserWeightKg?: number
}

interface TemplateDefinition {
  name: TemplateName
  asFocus: ASCoreFocus
  warmupSupportMuscles: MuscleGroup[]
  mainMuscles: MuscleGroup[]
  // TODO: cooldownSupport 仍使用旧结构（name + muscleGroups），因为放松拉伸动作尚未加入目录。
  // 未来统一后应改为与 warmup/main 一致的目录 ID 选择方式。
  cooldownSupport: Array<{
    name: string
    muscleGroups: MuscleKey[]
  }>
}

const TEMPLATES: TemplateDefinition[] = [
  {
    name: "上A",
    asFocus: "upper",
    warmupSupportMuscles: ["CHEST", "SHOULDERS"],
    mainMuscles: ["CHEST", "SHOULDERS", "TRICEPS", "BICEPS"],
    cooldownSupport: [
      { name: "胸大肌门框拉伸", muscleGroups: ["chest"] },
      { name: "前臂屈肌拉伸", muscleGroups: ["forearms"] },
    ],
  },
  {
    name: "下A",
    asFocus: "lower",
    warmupSupportMuscles: ["QUADS", "GLUTES"],
    mainMuscles: ["QUADS", "QUADS", "GLUTES", "GLUTES", "CORE"],
    cooldownSupport: [
      { name: "股四头肌站姿拉伸", muscleGroups: ["quadriceps"] },
      { name: "仰卧腹式呼吸", muscleGroups: ["abs"] },
    ],
  },
  {
    name: "上B",
    asFocus: "upper",
    warmupSupportMuscles: ["BACK", "SHOULDERS"],
    mainMuscles: ["BACK", "BACK", "SHOULDERS", "BICEPS", "TRICEPS"],
    cooldownSupport: [
      { name: "背阔肌跪姿拉伸", muscleGroups: ["upper-back"] },
      { name: "二头肌墙边拉伸", muscleGroups: ["biceps"] },
    ],
  },
  {
    name: "下B",
    asFocus: "lower",
    warmupSupportMuscles: ["QUADS", "GLUTES"],
    mainMuscles: ["QUADS", "QUADS", "GLUTES", "GLUTES", "CORE"],
    cooldownSupport: [
      { name: "臀肌仰卧拉伸", muscleGroups: ["glutes"] },
      { name: "仰卧腹式呼吸", muscleGroups: ["abs"] },
    ],
  },
]

const EXERCISES_BY_ID = new Map(
  ALL_EXERCISES.map((exercise) => [exercise.id, exercise]),
)

const MUSCLE_MAP: Record<MuscleGroup, MuscleKey[]> = {
  CHEST: ["chest"],
  BACK: ["upper-back"],
  SHOULDERS: ["front-deltoids"],
  QUADS: ["quadriceps"],
  GLUTES: ["glutes"],
  HAMSTRINGS: ["hamstrings"],
  BICEPS: ["biceps"],
  TRICEPS: ["triceps"],
  CORE: ["abs"],
  FOREARMS: ["forearms"],
  CALVES: ["calves"],
}

function getExercise(id: string): Exercise {
  const exercise = EXERCISES_BY_ID.get(id)
  if (!exercise) {
    throw new Error(`Unknown catalog exercise: ${id}`)
  }
  return exercise
}

function plannedWeightKg(exercise: Exercise, phase: WorkoutExercisePhase) {
  if (phase !== "main") return 5

  switch (exercise.primaryMuscle) {
    case "CHEST":
    case "BACK":
      return 25
    case "QUADS":
    case "GLUTES":
      return 35
    case "SHOULDERS":
    case "BICEPS":
    case "TRICEPS":
      return 10
    case "CORE":
      return 15
    default:
      return 10
  }
}

function analysis(
  exerciseType: WorkoutExerciseAnalysis["exerciseType"],
  muscleGroups: MuscleKey[],
  setCount: number,
  effectiveUserWeightKg: number,
): WorkoutExerciseAnalysis {
  const estimatedMets = exerciseType === "strength" ? 5 : 2
  const estimatedDurationMinutes =
    exerciseType === "strength" ? setCount * 3 : setCount * 2

  return {
    exerciseType,
    muscleGroups,
    estimatedMets,
    estimatedDurationMinutes,
    caloriesBurnedEstimated: Math.round(
      (estimatedMets * effectiveUserWeightKg * estimatedDurationMinutes) / 60,
    ),
    isEstimated: true,
  }
}

function catalogDraft(
  id: string,
  phase: WorkoutExercisePhase,
  setCount: number,
  effectiveUserWeightKg: number,
): WorkoutPlanExerciseDraft {
  const exercise = getExercise(id)
  const isStrength = STRENGTH_EXERCISES.some((item) => item.id === id)
  const exerciseType = isStrength ? "strength" : "flexibility"

  return {
    plannedExerciseName: exercise.name,
    phase,
    notes:
      phase === "main"
        ? "作为本模板的固定主训练动作。"
        : "服务于本模板的活动度和准备度。",
    tips: ["保持动作可控。", "出现不适就降低幅度或停止。"],
    catalogExerciseId: exercise.id,
    sets: Array.from({ length: setCount }, () => ({
      plannedWeightKg: isStrength ? plannedWeightKg(exercise, phase) : undefined,
      plannedReps: phase === "main" ? 10 : 12,
    })),
    plannedAnalysis: analysis(
      exerciseType,
      MUSCLE_MAP[exercise.primaryMuscle],
      setCount,
      effectiveUserWeightKg,
    ),
  }
}

function cooldownDraft(
  name: string,
  muscleGroups: MuscleKey[],
  effectiveUserWeightKg: number,
): WorkoutPlanExerciseDraft {
  return {
    plannedExerciseName: name,
    phase: "cooldown",
    notes: "用于训练后的放松和呼吸恢复。",
    tips: ["保持自然呼吸。", "只拉伸到轻微牵拉感。"],
    sets: [{ plannedReps: 10 }],
    plannedAnalysis: analysis(
      "flexibility",
      muscleGroups,
      1,
      effectiveUserWeightKg,
    ),
  }
}

function selectByMuscleSlots(
  muscles: MuscleGroup[],
  blacklist: string[],
  offset: number,
  extraExcludeIds: string[] = [],
): Exercise[] {
  const selected: Exercise[] = []

  for (const [index, muscle] of muscles.entries()) {
    const excludeIds = [
      ...blacklist,
      ...extraExcludeIds,
      ...selected.map((exercise) => exercise.id),
    ]
    const [exercise] = selectExercises({
      muscle,
      tags: ["NOVICE_CORE"],
      excludeIds,
      count: 1,
      offset: offset + index,
    })

    if (exercise) {
      selected.push(exercise)
      continue
    }

    const [fallback] = selectExercises({
      muscle,
      tags: ["NOVICE_CORE"],
      excludeIds: blacklist,
      count: 1,
      offset: offset + index,
    })

    if (fallback) {
      selected.push(fallback)
    } else {
      console.warn(
        `无法为肌群 ${muscle} 找到可用动作（offset=${offset + index}，黑名单=${blacklist.length} 项）`,
      )
    }
  }

  if (selected.length < muscles.length) {
    console.warn(
      `动作池不足：期望 ${muscles.length} 个动作，实际只选出 ${selected.length} 个`,
    )
  }

  return selected
}

export function generateSession(
  state: TrainingState,
  options: GenerateSessionOptions = {},
): GeneratedWorkoutPlan {
  const effectiveUserWeightKg = options.effectiveUserWeightKg ?? 70
  const templateIndex = state.completedSessionCount % TEMPLATES.length
  const template = TEMPLATES[templateIndex]
  const rotationOffset = Math.floor(state.completedSessionCount / TEMPLATES.length)
  const blacklist = state.blacklistedExerciseIds
  const mainExercises = selectByMuscleSlots(
    template.mainMuscles,
    blacklist,
    rotationOffset,
  )
  const warmupAS = selectASCore({
    focus: template.asFocus,
    blacklist,
    count: 2,
    offset: rotationOffset,
  })
  const warmupSupport = selectByMuscleSlots(
    template.warmupSupportMuscles,
    blacklist,
    rotationOffset + 1,
    mainExercises.map((exercise) => exercise.id),
  )
  const cooldownAS = selectASCore({
    focus: template.asFocus,
    blacklist,
    count: 2,
    offset: rotationOffset + 2,
  })

  const warmup = [
    ...warmupAS.map((exercise) =>
      catalogDraft(exercise.id, "warmup", 1, effectiveUserWeightKg),
    ),
    ...warmupSupport.map((exercise) =>
      catalogDraft(exercise.id, "warmup", 1, effectiveUserWeightKg),
    ),
  ]
  const main = mainExercises.map((exercise) =>
    catalogDraft(exercise.id, "main", 3, effectiveUserWeightKg),
  )
  const cooldown = [
    ...cooldownAS.map((exercise) =>
      catalogDraft(exercise.id, "cooldown", 1, effectiveUserWeightKg),
    ),
    ...template.cooldownSupport.map((exercise) =>
      cooldownDraft(
        exercise.name,
        exercise.muscleGroups,
        effectiveUserWeightKg,
      ),
    ),
  ]

  return {
    templateIndex,
    templateName: template.name,
    phase: "novice",
    isDeload: false,
    exercises: [...warmup, ...main, ...cooldown],
  }
}
