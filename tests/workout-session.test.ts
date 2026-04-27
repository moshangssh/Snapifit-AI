import { describe, expect, it } from "vitest"
import {
  canCompleteWorkoutSession,
  completeWorkoutSet,
  createWorkoutSessionFromPlan,
  FALLBACK_STRENGTH_ANALYSIS,
  removeWorkoutSessionEntries,
  replaceWorkoutExercise,
  setWorkoutExerciseSkipped,
  updateWorkoutSetValue,
  workoutSessionToExerciseEntries,
} from "@/lib/workout/session"
import {
  buildWorkoutPlanContextSnapshot,
  getEffectiveUserWeightKg,
} from "@/lib/workout/context"
import type { DailyLog, UserProfile } from "@/lib/types"
import type { CreateWorkoutSessionInput } from "@/lib/workout/types"

function makeInput(): CreateWorkoutSessionInput {
  return {
    sessionRole: "current",
    effectiveUserWeightKg: 72,
    planContext: {
      generatedAt: "2026-04-23T00:00:00.000Z",
      userGoal: "build_muscle",
      recentWorkoutSessionSummaries: [],
      recentExerciseEntries: [],
      fatigueSnapshot: {},
    },
    exercises: [
      {
        plannedExerciseName: "卧推",
        phase: "main",
        notes: "保持肩胛稳定",
        sets: [
          { plannedWeightKg: 60, plannedReps: 8 },
          { plannedWeightKg: 60, plannedReps: 8 },
          { plannedWeightKg: 60, plannedReps: 8 },
        ],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["chest", "triceps"],
          estimatedMets: 6,
          estimatedDurationMinutes: 12,
          caloriesBurnedEstimated: 86,
          isEstimated: true,
        },
      },
      {
        plannedExerciseName: "划船",
        phase: "main",
        sets: [{ plannedWeightKg: 50, plannedReps: 10 }],
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["upper-back", "biceps"],
          estimatedMets: 6,
          estimatedDurationMinutes: 8,
          caloriesBurnedEstimated: 58,
          isEstimated: true,
        },
      },
    ],
    now: "2026-04-23T09:00:00.000Z",
  }
}

describe("workout session core", () => {
  it("creates a current draft session for first use", () => {
    const session = createWorkoutSessionFromPlan(makeInput())

    expect(session.sessionRole).toBe("current")
    expect(session.status).toBe("draft")
    expect(session.exercises[0].phase).toBe("main")
    expect(session.exercises[0].sets[0].actualWeightKg).toBe(60)
    expect(session.derived.totalSetCount).toBe(4)
  })

  it("syncs changed weight only to later untouched unfinished sets", () => {
    const session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId

    const withSecondTouched = updateWorkoutSetValue(
      session,
      exerciseId,
      2,
      "weight",
      57.5,
    )
    const afterFirstChanged = updateWorkoutSetValue(
      withSecondTouched,
      exerciseId,
      1,
      "weight",
      55,
    )

    expect(afterFirstChanged.exercises[0].sets[0].actualWeightKg).toBe(55)
    expect(afterFirstChanged.exercises[0].sets[1].actualWeightKg).toBe(57.5)
    expect(afterFirstChanged.exercises[0].sets[2].actualWeightKg).toBe(55)
  })

  it("turns a next draft into current active when first set is completed", () => {
    const session = createWorkoutSessionFromPlan({
      ...makeInput(),
      sessionRole: "next",
    })
    const exerciseId = session.exercises[0].exerciseId

    const active = completeWorkoutSet(
      session,
      exerciseId,
      1,
      "2026-04-24T10:00:00.000Z",
    )

    expect(active.sessionRole).toBe("current")
    expect(active.status).toBe("active")
    expect(active.startedAt).toBe("2026-04-24T10:00:00.000Z")
  })

  it("marks replaced exercise analysis as stale", () => {
    const session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId

    const replaced = replaceWorkoutExercise(session, exerciseId, "哑铃卧推")

    expect(replaced.exercises[0].actualExerciseName).toBe("哑铃卧推")
    expect(replaced.exercises[0].analysisStatus).toBe("stale")
  })

  it("allows completion after all non-skipped sets are completed", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const firstExercise = session.exercises[0].exerciseId
    const secondExercise = session.exercises[1].exerciseId

    session = setWorkoutExerciseSkipped(session, secondExercise, true)
    session = completeWorkoutSet(
      session,
      firstExercise,
      1,
      "2026-04-23T10:00:00.000Z",
    )
    session = completeWorkoutSet(
      session,
      firstExercise,
      2,
      "2026-04-23T10:02:00.000Z",
    )
    session = completeWorkoutSet(
      session,
      firstExercise,
      3,
      "2026-04-23T10:04:00.000Z",
    )

    expect(canCompleteWorkoutSession(session)).toBe(true)
  })

  it("maps completed session into exercise entries for DailyLog", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId
    session = completeWorkoutSet(
      session,
      exerciseId,
      1,
      "2026-04-23T10:00:00.000Z",
    )
    session = completeWorkoutSet(
      session,
      exerciseId,
      2,
      "2026-04-23T10:02:00.000Z",
    )
    session = completeWorkoutSet(
      session,
      exerciseId,
      3,
      "2026-04-23T10:04:00.000Z",
    )
    session = setWorkoutExerciseSkipped(session, session.exercises[1].exerciseId, true)

    const entries = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:05:00.000Z",
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].exercise_name).toBe("卧推")
    expect(entries[0].sets).toBe(3)
    expect(entries[0].reps).toBe(8)
    expect(entries[0].weight_kg).toBe(60)
    expect(entries[0].muscle_groups).toEqual(["chest", "triceps"])
    expect(entries[0].calories_burned_estimated).toBe(86)
  })

  it("uses stable workout log ids for derived exercise entries", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId
    session = completeWorkoutSet(
      session,
      exerciseId,
      1,
      "2026-04-23T10:00:00.000Z",
    )

    const first = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:05:00.000Z",
    )
    const second = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:06:00.000Z",
    )

    expect(first[0].log_id).toBe(`workout:${session.sessionId}:${exerciseId}`)
    expect(second[0].log_id).toBe(first[0].log_id)
  })

  it("removes entries derived from the same workout session", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId
    session = completeWorkoutSet(
      session,
      exerciseId,
      1,
      "2026-04-23T10:00:00.000Z",
    )
    const entries = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:05:00.000Z",
    )
    const existing = [
      {
        log_id: "manual-entry",
        exercise_name: "散步",
        exercise_type: "cardio" as const,
        duration_minutes: 20,
        estimated_mets: 3,
        user_weight: 72,
        calories_burned_estimated: 70,
        is_estimated: true,
      },
      ...entries,
    ]

    expect(removeWorkoutSessionEntries(existing, session.sessionId)).toEqual([
      existing[0],
    ])
  })

  it("skips exercises that have no completed sets even when not skipped", () => {
    const session = createWorkoutSessionFromPlan(makeInput())

    const entries = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:05:00.000Z",
    )

    expect(entries).toHaveLength(0)
  })

  it("returns the same session reference when replacing with the existing name", () => {
    const session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId

    const replaced = replaceWorkoutExercise(session, exerciseId, "  卧推  ")

    expect(replaced).toBe(session)
  })

  it("clears skipped state for sets when un-skipping an exercise", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const exerciseId = session.exercises[0].exerciseId

    session = setWorkoutExerciseSkipped(session, exerciseId, true)
    session = setWorkoutExerciseSkipped(session, exerciseId, false)

    const exercise = session.exercises.find(
      (item) => item.exerciseId === exerciseId,
    )
    expect(exercise?.isExerciseSkipped).toBe(false)
    for (const set of exercise!.sets) {
      expect(set.isSkipped).toBe(false)
      expect(set.isCompleted).toBe(false)
      expect(set.completedAt).toBeUndefined()
    }
  })

  it("uses FALLBACK_STRENGTH_ANALYSIS for fallback status and enrichedAnalysis when enriched", () => {
    let session = createWorkoutSessionFromPlan(makeInput())
    const fallbackId = session.exercises[0].exerciseId
    const enrichedId = session.exercises[1].exerciseId

    session = completeWorkoutSet(session, fallbackId, 1, "2026-04-23T10:00:00.000Z")
    session = completeWorkoutSet(session, enrichedId, 1, "2026-04-23T10:02:00.000Z")

    session = {
      ...session,
      exercises: session.exercises.map((exercise) => {
        if (exercise.exerciseId === fallbackId) {
          return {
            ...exercise,
            analysisStatus: "fallback" as const,
            enrichedAnalysis: undefined,
          }
        }
        if (exercise.exerciseId === enrichedId) {
          return {
            ...exercise,
            analysisStatus: "enriched" as const,
            enrichedAnalysis: {
              exerciseType: "strength",
              muscleGroups: ["biceps"],
              estimatedMets: 7,
              estimatedDurationMinutes: 9,
              caloriesBurnedEstimated: 99,
              isEstimated: true,
            },
          }
        }
        return exercise
      }),
    }

    const entries = workoutSessionToExerciseEntries(
      session,
      "2026-04-23T10:05:00.000Z",
    )

    const fallbackEntry = entries.find((entry) => entry.exercise_name === "卧推")
    const enrichedEntry = entries.find((entry) => entry.exercise_name === "划船")

    expect(fallbackEntry?.calories_burned_estimated).toBe(
      FALLBACK_STRENGTH_ANALYSIS.caloriesBurnedEstimated,
    )
    expect(fallbackEntry?.estimated_mets).toBe(
      FALLBACK_STRENGTH_ANALYSIS.estimatedMets,
    )
    expect(fallbackEntry?.muscle_groups).toEqual(
      FALLBACK_STRENGTH_ANALYSIS.muscleGroups,
    )

    expect(enrichedEntry?.calories_burned_estimated).toBe(99)
    expect(enrichedEntry?.muscle_groups).toEqual(["biceps"])
  })

  it("disallows completing a session that is not active", () => {
    const session = createWorkoutSessionFromPlan(makeInput())
    expect(session.status).toBe("draft")
    expect(canCompleteWorkoutSession(session)).toBe(false)
  })
})

const baseProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "build_muscle",
}

const emptySummary = {
  totalCaloriesConsumed: 0,
  totalCaloriesBurned: 0,
  macros: { carbs: 0, protein: 0, fat: 0 },
  micronutrients: {},
}

describe("workout context", () => {
  it("uses most recent logged daily weight before profile weight", () => {
    const logs = [
      {
        date: "2026-04-23",
        foodEntries: [],
        exerciseEntries: [],
        summary: emptySummary,
        weight: 73,
      },
    ] satisfies DailyLog[]

    expect(getEffectiveUserWeightKg(logs, baseProfile)).toBe(73)
  })

  it("builds fatigue snapshot from recent DailyLog exercise entries", () => {
    const logs = [
      {
        date: "2026-04-23",
        foodEntries: [],
        exerciseEntries: [
          {
            log_id: "e1",
            exercise_name: "深蹲",
            exercise_type: "strength",
            duration_minutes: 30,
            sets: 3,
            reps: 8,
            weight_kg: 80,
            estimated_mets: 6,
            user_weight: 73,
            calories_burned_estimated: 180,
            muscle_groups: ["quadriceps"],
            is_estimated: true,
          },
        ],
        summary: emptySummary,
      },
    ] satisfies DailyLog[]

    const context = buildWorkoutPlanContextSnapshot({
      now: "2026-04-23T12:00:00.000Z",
      userProfile: baseProfile,
      recentLogsByDateDesc: logs,
      recentCompletedSessions: [],
    })

    expect(context.fatigueSnapshot.quadriceps?.intensity).toBe(100)
  })
})
