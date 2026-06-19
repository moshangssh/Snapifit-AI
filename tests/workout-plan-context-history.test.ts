import { describe, expect, it } from "vitest"
import { buildWorkoutPlanContextSnapshot } from "@/lib/workout/context"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { generateSession as generateIntermediateSession } from "@/lib/workout/engine/intermediate-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import { createWorkoutSessionFromPlan } from "@/lib/workout/session"
import type { UserProfile } from "@/lib/types"
import type { WorkoutSession } from "@/lib/workout/types"

const baseProfile: UserProfile = {
  weight: 70,
  height: 170,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  goal: "build_muscle",
}

function benchmarkIds(): string[] {
  const novice = STRENGTH_EXERCISES.filter((exercise) =>
    exercise.tags.includes("NOVICE_CORE"),
  )
  const byMuscle = new Map(novice.map((exercise) => [exercise.primaryMuscle, exercise]))

  return [
    byMuscle.get("CHEST")?.id,
    byMuscle.get("BACK")?.id,
    byMuscle.get("SHOULDERS")?.id,
    byMuscle.get("QUADS")?.id,
    byMuscle.get("GLUTES")?.id,
    byMuscle.get("BICEPS")?.id,
    byMuscle.get("TRICEPS")?.id,
    byMuscle.get("CORE")?.id,
    novice.find(
      (exercise) =>
        exercise.primaryMuscle === "CHEST" && exercise.id !== byMuscle.get("CHEST")?.id,
    )?.id,
    novice.find(
      (exercise) =>
        exercise.primaryMuscle === "BACK" && exercise.id !== byMuscle.get("BACK")?.id,
    )?.id,
  ].filter((id): id is string => typeof id === "string")
}

function makeIntermediateState(completedSessionCount: number): TrainingState {
  return {
    phase: "intermediate",
    completedSessionCount,
    blacklistedExerciseIds: [],
    benchmarkExerciseIds: benchmarkIds(),
  }
}

function completedSession(
  completedSessionCount: number,
  completedAt: string,
  override?: {
    catalogExerciseId: string
    weightKg: number
    reps: number
  },
): WorkoutSession {
  const plan = generateIntermediateSession(
    makeIntermediateState(completedSessionCount),
  )
  const session = createWorkoutSessionFromPlan({
    sessionRole: "current",
    effectiveUserWeightKg: baseProfile.weight,
    planContext: {
      generatedAt: completedAt,
      userGoal: baseProfile.goal,
      recentWorkoutSessionSummaries: [],
      recentExerciseEntries: [],
      fatigueSnapshot: {},
    },
    exercises: plan.exercises,
    now: completedAt,
    templateIndex: plan.templateIndex,
    phase: plan.phase,
    isDeload: plan.isDeload,
  })

  return {
    ...session,
    status: "completed",
    completedAt,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) => {
        const exerciseOverride =
          override && exercise.catalogExerciseId === override.catalogExerciseId
            ? override
            : undefined

        return {
          ...set,
          actualWeightKg: exerciseOverride?.weightKg ?? set.actualWeightKg,
          actualReps: exerciseOverride?.reps ?? set.actualReps,
          isCompleted: true,
          completedAt,
        }
      }),
    })),
  }
}

function buildContext(recentCompletedSessions: WorkoutSession[]) {
  return buildWorkoutPlanContextSnapshot({
    now: "2026-07-31T12:00:00.000Z",
    userProfile: baseProfile,
    recentLogsByDateDesc: [],
    recentCompletedSessions,
  })
}

function findSixTemplateScenario() {
  for (let previousCount = 72; previousCount < 114; previousCount++) {
    const nextCount = previousCount + 6
    const previousPlan = generateIntermediateSession(
      makeIntermediateState(previousCount),
    )
    const nextPlan = generateIntermediateSession(makeIntermediateState(nextCount))
    if (nextPlan.isDeload) continue

    const recentPlans = [1, 2, 3, 4, 5].map((offset) =>
      generateIntermediateSession(makeIntermediateState(previousCount + offset)),
    )
    const recentExerciseIds = new Set(
      recentPlans.flatMap((plan) =>
        plan.exercises.map((exercise) => exercise.catalogExerciseId),
      ),
    )
    const previousExerciseIds = new Set(
      previousPlan.exercises.map((exercise) => exercise.catalogExerciseId),
    )
    const sharedExercise = nextPlan.exercises.find(
      (exercise) =>
        exercise.catalogExerciseId &&
        previousExerciseIds.has(exercise.catalogExerciseId) &&
        !recentExerciseIds.has(exercise.catalogExerciseId),
    )

    if (sharedExercise?.catalogExerciseId) {
      return {
        previousCount,
        nextCount,
        sharedExerciseId: sharedExercise.catalogExerciseId,
        targetReps: sharedExercise.sets[0]?.plannedReps ?? 10,
      }
    }
  }

  throw new Error("No six-template progression scenario found")
}

describe("workout plan context history", () => {
  it("keeps the sixth completed session so intermediate rotation can progress the same exercise", () => {
    const scenario = findSixTemplateScenario()
    const historicalWeightKg = 88
    const sixthSession = completedSession(
      scenario.previousCount,
      "2026-07-25T08:00:00.000Z",
      {
        catalogExerciseId: scenario.sharedExerciseId,
        weightKg: historicalWeightKg,
        reps: scenario.targetReps,
      },
    )
    const moreRecentSessions = [5, 4, 3, 2, 1].map((offset, index) =>
      completedSession(
        scenario.previousCount + offset,
        `2026-07-${30 - index}T08:00:00.000Z`,
      ),
    )
    const expectedContext = buildContext([sixthSession])
    const actualContext = buildContext([...moreRecentSessions, sixthSession])
    const expectedPlan = generateIntermediateSession(
      makeIntermediateState(scenario.nextCount),
      {
        recentWorkoutSessionSummaries:
          expectedContext.recentWorkoutSessionSummaries,
      },
    )
    const actualPlan = generateIntermediateSession(
      makeIntermediateState(scenario.nextCount),
      {
        recentWorkoutSessionSummaries:
          actualContext.recentWorkoutSessionSummaries,
      },
    )
    const expectedExercise = expectedPlan.exercises.find(
      (exercise) => exercise.catalogExerciseId === scenario.sharedExerciseId,
    )
    const actualExercise = actualPlan.exercises.find(
      (exercise) => exercise.catalogExerciseId === scenario.sharedExerciseId,
    )

    expect(actualContext.recentWorkoutSessionSummaries).toHaveLength(6)
    expect(actualExercise?.sets.map((set) => set.plannedWeightKg)).toEqual(
      expectedExercise?.sets.map((set) => set.plannedWeightKg),
    )
  })
})
