import { v4 as uuidv4 } from "uuid"
import type { ExerciseEntry } from "@/lib/types"
import type {
  CreateWorkoutSessionInput,
  WorkoutExerciseAnalysis,
  WorkoutSession,
  WorkoutSessionDerived,
  WorkoutSessionExercise,
} from "@/lib/workout/types"

export const FALLBACK_STRENGTH_ANALYSIS: WorkoutExerciseAnalysis = {
  exerciseType: "strength",
  muscleGroups: [],
  estimatedMets: 6,
  estimatedDurationMinutes: 10,
  caloriesBurnedEstimated: 50,
  isEstimated: true,
}

function recalculateDerived(
  exercises: WorkoutSessionExercise[],
): WorkoutSessionDerived {
  const flatSets = exercises.flatMap((exercise) => exercise.sets)
  const totalSetCount = flatSets.filter((set) => !set.isSkipped).length
  const completedSetCount = flatSets.filter(
    (set) => !set.isSkipped && set.isCompleted,
  ).length
  const skippedSetCount = flatSets.filter((set) => set.isSkipped).length
  const replacedExerciseCount = exercises.filter(
    (exercise) => Boolean(exercise.actualExerciseName),
  ).length

  return {
    completedSetCount,
    totalSetCount,
    skippedSetCount,
    replacedExerciseCount,
    exerciseCompletionRate:
      totalSetCount === 0 ? 1 : completedSetCount / totalSetCount,
  }
}

export function refreshWorkoutSessionDerived(
  session: WorkoutSession,
): WorkoutSession {
  return {
    ...session,
    derived: recalculateDerived(session.exercises),
  }
}

export function createWorkoutSessionFromPlan(
  input: CreateWorkoutSessionInput,
): WorkoutSession {
  const exercises = input.exercises.map((exercise) => ({
    exerciseId: uuidv4(),
    plannedExerciseName: exercise.plannedExerciseName,
    phase: exercise.phase,
    notes: exercise.notes,
    tips: exercise.tips,
    catalogExerciseId: exercise.catalogExerciseId,
    discomfortFlag: exercise.discomfortFlag,
    isExerciseSkipped: false,
    analysisStatus: "planned" as const,
    plannedAnalysis: exercise.plannedAnalysis,
    sets: exercise.sets.map((set, index) => ({
      setIndex: index + 1,
      plannedWeightKg: set.plannedWeightKg,
      plannedReps: set.plannedReps,
      actualWeightKg: set.plannedWeightKg,
      actualReps: set.plannedReps,
      touched: {
        weight: false,
        reps: false,
      },
      isCompleted: false,
      isSkipped: false,
    })),
  }))

  return refreshWorkoutSessionDerived({
    sessionId: uuidv4(),
    sessionRole: input.sessionRole,
    status: "draft",
    createdAt: input.now,
    effectiveUserWeightKg: input.effectiveUserWeightKg,
    planContext: input.planContext,
    exercises,
    templateIndex: input.templateIndex,
    isDeload: input.isDeload,
    phase: input.phase,
    derived: {
      completedSetCount: 0,
      totalSetCount: 0,
      skippedSetCount: 0,
      replacedExerciseCount: 0,
      exerciseCompletionRate: 0,
    },
  })
}

export function updateWorkoutSetValue(
  session: WorkoutSession,
  exerciseId: string,
  setIndex: number,
  field: "weight" | "reps",
  value: number,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) => {
    if (exercise.exerciseId !== exerciseId) return exercise

    const sets = exercise.sets.map((set) => {
      if (set.setIndex === setIndex) {
        return field === "weight"
          ? {
              ...set,
              actualWeightKg: value,
              touched: { ...set.touched, weight: true },
            }
          : {
              ...set,
              actualReps: value,
              touched: { ...set.touched, reps: true },
            }
      }

      if (set.setIndex > setIndex && !set.isCompleted && !set.isSkipped) {
        if (field === "weight" && !set.touched.weight) {
          return { ...set, actualWeightKg: value }
        }
        if (field === "reps" && !set.touched.reps) {
          return { ...set, actualReps: value }
        }
      }

      return set
    })

    return { ...exercise, sets }
  })

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function completeWorkoutSet(
  session: WorkoutSession,
  exerciseId: string,
  setIndex: number,
  now: string,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) => {
    if (exercise.exerciseId !== exerciseId) return exercise
    return {
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.setIndex === setIndex && !set.isSkipped
          ? { ...set, isCompleted: true, completedAt: now }
          : set,
      ),
    }
  })

  const nextSession = refreshWorkoutSessionDerived({
    ...session,
    sessionRole: "current",
    status: "active",
    startedAt: session.startedAt ?? now,
    exercises,
  })

  return nextSession
}

export function replaceWorkoutExercise(
  session: WorkoutSession,
  exerciseId: string,
  actualExerciseName: string,
): WorkoutSession {
  const trimmed = actualExerciseName.trim()
  if (!trimmed) return session

  const targetExercise = session.exercises.find(
    (exercise) => exercise.exerciseId === exerciseId,
  )
  if (!targetExercise) return session

  const currentName =
    targetExercise.actualExerciseName ?? targetExercise.plannedExerciseName
  if (trimmed === currentName) return session

  const exercises = session.exercises.map((exercise) =>
    exercise.exerciseId === exerciseId
      ? {
          ...exercise,
          actualExerciseName: trimmed,
          analysisStatus: "stale" as const,
          enrichedAnalysis: undefined,
          tips: [],
        }
      : exercise,
  )

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function setWorkoutExerciseSkipped(
  session: WorkoutSession,
  exerciseId: string,
  isSkipped: boolean,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) =>
    exercise.exerciseId === exerciseId
      ? {
          ...exercise,
          isExerciseSkipped: isSkipped,
          sets: exercise.sets.map((set) => ({
            ...set,
            isSkipped,
            isCompleted: isSkipped ? false : set.isCompleted,
            completedAt: isSkipped ? undefined : set.completedAt,
          })),
        }
      : exercise,
  )

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function setWorkoutExerciseDiscomfortFlag(
  session: WorkoutSession,
  exerciseId: string,
  discomfortFlag: boolean,
): WorkoutSession {
  const exercises = session.exercises.map((exercise) =>
    exercise.exerciseId === exerciseId
      ? {
          ...exercise,
          discomfortFlag,
        }
      : exercise,
  )

  return refreshWorkoutSessionDerived({ ...session, exercises })
}

export function canCompleteWorkoutSession(session: WorkoutSession): boolean {
  if (session.status !== "active") return false
  return session.exercises.every((exercise) =>
    exercise.sets.every((set) => set.isSkipped || set.isCompleted),
  )
}

export function abandonWorkoutSession(session: WorkoutSession): WorkoutSession {
  if (session.status === "finishing" || session.status === "completed") {
    return session
  }

  return refreshWorkoutSessionDerived({
    ...session,
    status: "abandoned",
  })
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}

export function getWorkoutExerciseEntryLogId(
  sessionId: string,
  exerciseId: string,
): string {
  return `workout:${sessionId}:${exerciseId}`
}

export function isWorkoutSessionEntry(
  entry: ExerciseEntry,
  sessionId: string,
): boolean {
  return entry.log_id.startsWith(`workout:${sessionId}:`)
}

export function removeWorkoutSessionEntries(
  entries: ExerciseEntry[],
  sessionId: string,
): ExerciseEntry[] {
  return entries.filter((entry) => !isWorkoutSessionEntry(entry, sessionId))
}

export function workoutSessionToExerciseEntries(
  session: WorkoutSession,
  completedAt: string,
): ExerciseEntry[] {
  return session.exercises
    .filter(
      (exercise) =>
        !exercise.isExerciseSkipped &&
        exercise.sets.some((set) => !set.isSkipped && set.isCompleted),
    )
    .map((exercise) => {
      const completedSets = exercise.sets.filter(
        (set) => !set.isSkipped && set.isCompleted,
      )
      const analysis =
        exercise.enrichedAnalysis ??
        (exercise.analysisStatus === "fallback"
          ? FALLBACK_STRENGTH_ANALYSIS
          : exercise.plannedAnalysis)

      const plannedSetCount = exercise.sets.length
      const completionRatio =
        plannedSetCount > 0 ? completedSets.length / plannedSetCount : 1
      const scaledDuration = Math.max(
        1,
        Math.round(analysis.estimatedDurationMinutes * completionRatio),
      )
      const scaledCalories = Math.round(
        analysis.caloriesBurnedEstimated * completionRatio,
      )

      return {
        log_id: getWorkoutExerciseEntryLogId(
          session.sessionId,
          exercise.exerciseId,
        ),
        exercise_name:
          exercise.actualExerciseName ?? exercise.plannedExerciseName,
        exercise_type: analysis.exerciseType,
        duration_minutes: scaledDuration,
        sets: completedSets.length,
        reps: average(
          completedSets
            .map((set) => set.actualReps)
            .filter((value): value is number => typeof value === "number"),
        ),
        weight_kg: average(
          completedSets
            .map((set) => set.actualWeightKg)
            .filter((value): value is number => typeof value === "number"),
        ),
        estimated_mets: analysis.estimatedMets,
        user_weight: session.effectiveUserWeightKg,
        calories_burned_estimated: scaledCalories,
        muscle_groups: analysis.muscleGroups,
        is_estimated: true,
        timestamp: completedAt,
      }
    })
}
