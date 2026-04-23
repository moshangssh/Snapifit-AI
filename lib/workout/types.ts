import type { ExerciseEntry } from "@/lib/types"

export type WorkoutSessionRole = "current" | "next"
export type WorkoutSessionStatus =
  | "draft"
  | "active"
  | "finishing"
  | "completed"
  | "abandoned"

export type WorkoutExerciseAnalysisStatus =
  | "planned"
  | "stale"
  | "enriched"
  | "fallback"

export interface WorkoutExerciseAnalysis {
  exerciseType: ExerciseEntry["exercise_type"]
  muscleGroups: string[]
  estimatedMets: number
  estimatedDurationMinutes: number
  caloriesBurnedEstimated: number
  isEstimated: boolean
}

export interface WorkoutSessionSet {
  setIndex: number
  plannedWeightKg?: number
  plannedReps?: number
  actualWeightKg?: number
  actualReps?: number
  touched: {
    weight: boolean
    reps: boolean
  }
  isCompleted: boolean
  completedAt?: string
  isSkipped: boolean
}

export interface WorkoutSessionExercise {
  exerciseId: string
  plannedExerciseName: string
  actualExerciseName?: string
  notes?: string
  sets: WorkoutSessionSet[]
  isExerciseSkipped: boolean
  analysisStatus: WorkoutExerciseAnalysisStatus
  plannedAnalysis: WorkoutExerciseAnalysis
  enrichedAnalysis?: WorkoutExerciseAnalysis
}

export interface RecentWorkoutSessionSummary {
  completedAt: string
  exercises: Array<{
    exerciseName: string
    completedSets: number
    averageWeightKg?: number
    averageReps?: number
    wasReplaced: boolean
    wasSkipped: boolean
    muscleGroups: string[]
  }>
}

export interface ExerciseEntrySummary {
  date: string
  exerciseName: string
  exerciseType: ExerciseEntry["exercise_type"]
  sets?: number
  reps?: number
  weightKg?: number
  muscleGroups: string[]
}

export interface WorkoutPlanContextSnapshot {
  generatedAt: string
  userGoal: string
  recentWorkoutSessionSummaries: RecentWorkoutSessionSummary[]
  recentExerciseEntries: ExerciseEntrySummary[]
  fatigueSnapshot: Record<
    string,
    {
      intensity: 0 | 30 | 60 | 100
      daysAgo: 0 | 1 | 2 | null
      lastExerciseName: string | null
    }
  >
}

export interface WorkoutSessionDerived {
  completedSetCount: number
  totalSetCount: number
  skippedSetCount: number
  replacedExerciseCount: number
  exerciseCompletionRate: number
}

export interface WorkoutSession {
  sessionId: string
  sessionRole: WorkoutSessionRole
  status: WorkoutSessionStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutSessionExercise[]
  derived: WorkoutSessionDerived
}

export interface WorkoutPlanExerciseDraft {
  plannedExerciseName: string
  notes?: string
  sets: Array<{
    plannedWeightKg?: number
    plannedReps?: number
  }>
  plannedAnalysis: WorkoutExerciseAnalysis
}

export interface CreateWorkoutSessionInput {
  sessionRole: WorkoutSessionRole
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutPlanExerciseDraft[]
  now: string
}
