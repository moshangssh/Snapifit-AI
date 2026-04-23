import { format, parseISO, subDays } from "date-fns"
import { computeMuscleFatigue } from "@/lib/muscle-fatigue"
import type { DailyLog, UserProfile } from "@/lib/types"
import type {
  ExerciseEntrySummary,
  RecentWorkoutSessionSummary,
  WorkoutPlanContextSnapshot,
  WorkoutSession,
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
      const weights = completedSets
        .map((set) => set.actualWeightKg)
        .filter((value): value is number => typeof value === "number")
      const reps = completedSets
        .map((set) => set.actualReps)
        .filter((value): value is number => typeof value === "number")

      return {
        exerciseName:
          exercise.actualExerciseName ?? exercise.plannedExerciseName,
        completedSets: completedSets.length,
        averageWeightKg: average(weights),
        averageReps: average(reps),
        wasReplaced: Boolean(exercise.actualExerciseName),
        wasSkipped: exercise.isExerciseSkipped,
        muscleGroups: (
          exercise.enrichedAnalysis ?? exercise.plannedAnalysis
        ).muscleGroups,
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

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  const sum = values.reduce((acc, value) => acc + value, 0)
  return Math.round((sum / values.length) * 10) / 10
}
