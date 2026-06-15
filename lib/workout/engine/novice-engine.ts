import {
  ALL_EXERCISES,
  STRENGTH_EXERCISES,
  type Exercise,
  type MuscleGroup,
} from "@/lib/workout/engine/catalog"
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
  warmupAS: string[]
  warmupSupport: string[]
  main: string[]
  cooldownAS: string[]
  cooldownSupport: Array<{
    name: string
    muscleGroups: MuscleKey[]
  }>
}

const TEMPLATES: TemplateDefinition[] = [
  {
    name: "上A",
    warmupAS: [
      "08cde7c0-5988-4190-b12b-b0b565d113f6",
      "6d2a3622-980f-4d8f-aa00-852652cdd1d5",
    ],
    warmupSupport: [
      "4eb45701-1c6d-46b7-a427-24f80a43837c",
      "5ee2a3f3-0b7a-7527-b3ee-d7d87664862b",
    ],
    main: [
      "81112d74-4711-4ddc-9145-a610bf8407c8",
      "12838e78-2632-4e2b-87c9-3926e86a7e1a",
      "ef115bce-70a8-4db5-b917-3e9fc3a89d5c",
      "174978b8-1b92-4700-96d0-98d1835628dd",
    ],
    cooldownAS: [
      "77e949b2-df71-4560-b72c-f79eaa7966dc",
      "291593e2-7736-4028-9bf2-77192645930b",
    ],
    cooldownSupport: [
      { name: "胸大肌门框拉伸", muscleGroups: ["chest"] },
      { name: "前臂屈肌拉伸", muscleGroups: ["forearms"] },
    ],
  },
  {
    name: "下A",
    warmupAS: [
      "4a5f1411-75cd-4485-bbcb-d408f76f0a93",
      "4ec535de-1f4a-451a-9dc5-dab2920b51f4",
    ],
    warmupSupport: [
      "084947cf-098f-62f2-36b2-41547577e2b8",
      "d61ba24e-4c00-4c61-9127-08db49a79c32",
    ],
    main: [
      "084947cf-098f-62f2-36b2-41547577e2b8",
      "3ae8ee86-534c-0824-07b6-e9f105b97c1d",
      "d61ba24e-4c00-4c61-9127-08db49a79c32",
      "c0d708f6-00ab-118f-9f7d-e13f27e5458b",
      "cb4adf67-8fc7-4fee-b077-0971132d0c9a",
    ],
    cooldownAS: [
      "085df570-92e9-46b5-ad8c-fd6650a4a498",
      "1fcb8c2c-1f5c-4623-91b4-5f2f946ade06",
    ],
    cooldownSupport: [
      { name: "股四头肌站姿拉伸", muscleGroups: ["quadriceps"] },
      { name: "仰卧腹式呼吸", muscleGroups: ["abs"] },
    ],
  },
  {
    name: "上B",
    warmupAS: [
      "08cde7c0-5988-4190-b12b-b0b565d113f6",
      "3ba7a9b4-88ba-4390-9593-de658b6668e6",
    ],
    warmupSupport: [
      "d8e77fb2-ebb1-4e7c-8e93-fd397a8c290b",
      "4ba860b1-2e76-45b6-8023-c386bc56e65d",
    ],
    main: [
      "d8e77fb2-ebb1-4e7c-8e93-fd397a8c290b",
      "4ba860b1-2e76-45b6-8023-c386bc56e65d",
      "5ee2a3f3-0b7a-7527-b3ee-d7d87664862b",
      "ca1dbb25-9c6d-464b-95ca-a55d9b72395a",
      "0f7bb383-5b6c-4065-8d63-21b9925d37f0",
    ],
    cooldownAS: [
      "77e949b2-df71-4560-b72c-f79eaa7966dc",
      "291593e2-7736-4028-9bf2-77192645930b",
    ],
    cooldownSupport: [
      { name: "背阔肌跪姿拉伸", muscleGroups: ["upper-back"] },
      { name: "二头肌墙边拉伸", muscleGroups: ["biceps"] },
    ],
  },
  {
    name: "下B",
    warmupAS: [
      "4a5f1411-75cd-4485-bbcb-d408f76f0a93",
      "183cf14a-3214-4b69-8047-c5ddb4fa0f08",
    ],
    warmupSupport: [
      "3ae8ee86-534c-0824-07b6-e9f105b97c1d",
      "c0d708f6-00ab-118f-9f7d-e13f27e5458b",
    ],
    main: [
      "084947cf-098f-62f2-36b2-41547577e2b8",
      "3ae8ee86-534c-0824-07b6-e9f105b97c1d",
      "d61ba24e-4c00-4c61-9127-08db49a79c32",
      "c0d708f6-00ab-118f-9f7d-e13f27e5458b",
      "0ad57432-b306-46f9-a486-635db0a1080c",
    ],
    cooldownAS: [
      "085df570-92e9-46b5-ad8c-fd6650a4a498",
      "1fcb8c2c-1f5c-4623-91b4-5f2f946ade06",
    ],
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

export function generateSession(
  state: TrainingState,
  options: GenerateSessionOptions = {},
): GeneratedWorkoutPlan {
  const effectiveUserWeightKg = options.effectiveUserWeightKg ?? 70
  const templateIndex = state.completedSessionCount % TEMPLATES.length
  const template = TEMPLATES[templateIndex]

  const warmup = [
    ...template.warmupAS.map((id) =>
      catalogDraft(id, "warmup", 1, effectiveUserWeightKg),
    ),
    ...template.warmupSupport.map((id) =>
      catalogDraft(id, "warmup", 1, effectiveUserWeightKg),
    ),
  ]
  const main = template.main.map((id) =>
    catalogDraft(id, "main", 3, effectiveUserWeightKg),
  )
  const cooldown = [
    ...template.cooldownAS.map((id) =>
      catalogDraft(id, "cooldown", 1, effectiveUserWeightKg),
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
