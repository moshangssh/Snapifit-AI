import { format, parseISO, subDays } from "date-fns"
import { computeMuscleFatigue } from "@/lib/muscle-fatigue"
import type { DailyLog, UserProfile } from "@/lib/types"
import type {
  ExerciseEntrySummary,
  RecentWorkoutSessionSummary,
  WorkoutPlanContextSnapshot,
  WorkoutSession,
  WorkoutSessionSet,
} from "@/lib/workout/types"

export function getEffectiveUserWeightKg(
  logsByDateDesc: DailyLog[],
  userProfile: UserProfile,
): number {
  const recentLoggedWeight = logsByDateDesc.find(
    (log) => typeof log.weight === "number" && log.weight > 0,
  )?.weight

  return recentLoggedWeight ?? userProfile.weight
}

export function summarizeWorkoutSession(
  session: WorkoutSession,
): RecentWorkoutSessionSummary {
  return {
    completedAt: session.completedAt ?? session.createdAt,
    exercises: session.exercises.map((exercise) => {
      const completedSets = exercise.sets.filter(
        (set) => !set.isSkipped && set.isCompleted,
      )
      const workingSet = pickWorkingSet(completedSets)

      return {
        catalogExerciseId: exercise.catalogExerciseId,
        exerciseName:
          exercise.actualExerciseName ?? exercise.plannedExerciseName,
        phase: exercise.phase,
        completedSets: completedSets.length,
        workingSetWeightKg: workingSet?.weightKg,
        workingSetReps: workingSet?.reps,
        wasReplaced: Boolean(exercise.actualExerciseName),
        wasSkipped: exercise.isExerciseSkipped,
        discomfortFlag: exercise.discomfortFlag,
        muscleGroups: (
          exercise.enrichedAnalysis ?? exercise.plannedAnalysis
        ).muscleGroups,
        sets: exercise.sets.map((set) => ({
          plannedWeightKg: set.plannedWeightKg,
          plannedReps: set.plannedReps,
          actualWeightKg: set.actualWeightKg,
          actualReps: set.actualReps,
          isCompleted: set.isCompleted,
          isSkipped: set.isSkipped,
        })),
      }
    }),
  }
}

export function summarizeExerciseEntries(
  logsByDateDesc: DailyLog[],
): ExerciseEntrySummary[] {
  return logsByDateDesc.flatMap((log) =>
    log.exerciseEntries.map((entry) => ({
      date: log.date,
      exerciseName: entry.exercise_name,
      exerciseType: entry.exercise_type,
      sets: entry.sets,
      reps: entry.reps,
      weightKg: entry.weight_kg,
      muscleGroups: entry.muscle_groups ?? [],
    })),
  )
}

export function buildWorkoutPlanContextSnapshot(input: {
  now: string
  userProfile: UserProfile
  recentLogsByDateDesc: DailyLog[]
  recentCompletedSessions: WorkoutSession[]
}): WorkoutPlanContextSnapshot {
  const today = parseISO(input.now)
  const logsByDaysAgo = [0, 1, 2].map((daysAgo) => {
    const dateKey = format(subDays(today, daysAgo), "yyyy-MM-dd")
    return input.recentLogsByDateDesc.find((log) => log.date === dateKey) ?? null
  })

  return {
    generatedAt: input.now,
    userGoal: input.userProfile.goal,
    recentWorkoutSessionSummaries: input.recentCompletedSessions
      .slice(0, 5)
      .map(summarizeWorkoutSession),
    recentExerciseEntries: summarizeExerciseEntries(
      input.recentLogsByDateDesc.slice(0, 14),
    ),
    fatigueSnapshot: computeMuscleFatigue(logsByDaysAgo),
  }
}

function pickWorkingSet(
  sets: WorkoutSessionSet[],
): { weightKg?: number; reps?: number } | undefined {
  if (sets.length === 0) return undefined
  let best = sets[0]
  for (const set of sets) {
    const setWeight = set.actualWeightKg ?? -Infinity
    const bestWeight = best.actualWeightKg ?? -Infinity
    if (setWeight > bestWeight) {
      best = set
    } else if (
      setWeight === bestWeight &&
      (set.actualReps ?? 0) > (best.actualReps ?? 0)
    ) {
      best = set
    }
  }
  return { weightKg: best.actualWeightKg, reps: best.actualReps }
}
