import { describe, expect, it } from "vitest"
import {
  canCompleteWorkoutSession,
  completeWorkoutSet,
  createWorkoutSessionFromPlan,
  replaceWorkoutExercise,
  setWorkoutExerciseSkipped,
  updateWorkoutSetValue,
  workoutSessionToExerciseEntries,
} from "@/lib/workout/session"
import type { CreateWorkoutSessionInput } from "@/lib/workout/types"

function makeInput(): CreateWorkoutSessionInput {
  return {
    sessionRole: "current",
    effectiveUserWeightKg: 72,
    planContext: {
      generatedAt: "2026-04-23T00:00:00.000Z",
      userGoal: "gain_muscle",
      recentWorkoutSessionSummaries: [],
      recentExerciseEntries: [],
      fatigueSnapshot: {},
    },
    exercises: [
      {
        plannedExerciseName: "卧推",
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
})
