import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { WorkoutPlanWorkbench } from "@/components/workout/workout-plan-workbench"
import type { WorkoutSession } from "@/lib/workout/types"

function makeSession(): WorkoutSession {
  return {
    sessionId: "session-1",
    sessionRole: "current",
    status: "draft",
    createdAt: "2026-04-23T09:00:00.000Z",
    effectiveUserWeightKg: 72,
    planContext: {
      generatedAt: "2026-04-23T09:00:00.000Z",
      userGoal: "build_muscle",
      recentWorkoutSessionSummaries: [],
      recentExerciseEntries: [],
      fatigueSnapshot: {},
    },
    sessionAudit: {
      status: "pass",
      mainSetCount: 4,
      summary: "本次主训练 4 组",
    },
    microcycleAudit: {
      status: "pass",
      mainSetCount: 16,
      summary: "本轮主训练 16 组",
    },
    derived: {
      completedSetCount: 0,
      totalSetCount: 5,
      skippedSetCount: 0,
      replacedExerciseCount: 0,
      exerciseCompletionRate: 0,
    },
    exercises: [
      {
        exerciseId: "warmup-1",
        plannedExerciseName: "热身",
        phase: "warmup",
        tips: [],
        sets: [
          {
            setIndex: 1,
            touched: { weight: false, reps: false },
            isCompleted: false,
            isSkipped: false,
          },
        ],
        isExerciseSkipped: false,
        analysisStatus: "planned",
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["front-deltoids"],
          estimatedMets: 3,
          estimatedDurationMinutes: 5,
          caloriesBurnedEstimated: 20,
          isEstimated: true,
        },
      },
      {
        exerciseId: "main-1",
        plannedExerciseName: "卧推",
        phase: "main",
        tips: [],
        sets: [
          {
            setIndex: 1,
            plannedWeightKg: 60,
            plannedReps: 8,
            touched: { weight: false, reps: false },
            isCompleted: false,
            isSkipped: false,
          },
          {
            setIndex: 2,
            plannedWeightKg: 60,
            plannedReps: 8,
            touched: { weight: false, reps: false },
            isCompleted: false,
            isSkipped: false,
          },
          {
            setIndex: 3,
            plannedWeightKg: 60,
            plannedReps: 8,
            touched: { weight: false, reps: false },
            isCompleted: false,
            isSkipped: false,
          },
          {
            setIndex: 4,
            plannedWeightKg: 60,
            plannedReps: 8,
            touched: { weight: false, reps: false },
            isCompleted: false,
            isSkipped: false,
          },
        ],
        isExerciseSkipped: false,
        analysisStatus: "planned",
        plannedAnalysis: {
          exerciseType: "strength",
          muscleGroups: ["chest", "triceps"],
          estimatedMets: 6,
          estimatedDurationMinutes: 12,
          caloriesBurnedEstimated: 86,
          isEstimated: true,
        },
      },
    ],
  }
}

const noop = () => {}

describe("WorkoutPlanWorkbench audit sidebar", () => {
  it("shows the saved audit status and main strength volume summary", () => {
    const html = renderToStaticMarkup(
      <WorkoutPlanWorkbench
        session={makeSession()}
        isFinishing={false}
        onFinishWorkout={noop}
        onAbandonWorkout={noop}
        onUpdateSetValue={noop}
        onCompleteSet={noop}
        onReplaceExercise={noop}
        onToggleDiscomfortFlag={noop}
        onToggleSkipExercise={noop}
      />,
    )

    expect(html).toContain("处方通过")
    expect(html).toContain("本次主训练 4 组")
    expect(html).toContain("本轮主训练 16 组")
    expect(html).not.toContain("待实现")
    expect(html).not.toContain("此功能仍在开发中")
  })
})
