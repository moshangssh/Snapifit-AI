import { describe, expect, it } from "vitest"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import {
  calculateProgress,
  getBenchmarkCandidateDetails,
  selectBenchmarkCandidates,
} from "@/lib/workout/engine/benchmark-selection"
import type { RecentWorkoutSessionSummary } from "@/lib/workout/types"

function exerciseIdByName(name: string): string {
  const exercise = STRENGTH_EXERCISES.find((item) => item.name === name)
  if (!exercise) throw new Error(`Missing fixture exercise: ${name}`)
  return exercise.id
}

const IDS = {
  chestFrequent: exerciseIdByName("器械卧推"),
  chestProgress: exerciseIdByName("地面哑铃卧推"),
  back: exerciseIdByName("单臂坐姿划船"),
  shoulders: exerciseIdByName("哑铃坐姿侧平举"),
  quads: exerciseIdByName("窄距45度腿举"),
  glutesProgress: exerciseIdByName("器械臀桥"),
  biceps: exerciseIdByName("哑铃蜘蛛弯举"),
  tricepsProgress: exerciseIdByName("绳索交叉三头肌伸展"),
  core: exerciseIdByName("坐姿腹部绳索卷腹"),
  extraProgress: exerciseIdByName("器械下拉"),
}

function session(
  completedAt: string,
  exerciseId: string,
  weightKg: number,
): RecentWorkoutSessionSummary {
  const exercise = STRENGTH_EXERCISES.find((item) => item.id === exerciseId)
  if (!exercise) throw new Error(`Missing fixture exercise: ${exerciseId}`)

  return {
    completedAt,
    exercises: [
      {
        catalogExerciseId: exercise.id,
        exerciseName: exercise.name,
        phase: "main",
        completedSets: 3,
        workingSetWeightKg: weightKg,
        workingSetReps: 10,
        wasReplaced: false,
        wasSkipped: false,
        muscleGroups: [exercise.primaryMuscle],
      },
    ],
  }
}

function repeatHistory(
  exerciseId: string,
  count: number,
  startWeightKg: number,
  endWeightKg: number,
): RecentWorkoutSessionSummary[] {
  return Array.from({ length: count }, (_, index) => {
    const weightKg =
      count === 1
        ? endWeightKg
        : startWeightKg +
          ((endWeightKg - startWeightKg) * index) / (count - 1)
    return session(
      `2026-01-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      exerciseId,
      Math.round(weightKg * 10) / 10,
    )
  })
}

describe("benchmark exercise selection", () => {
  it("calculates exercise progress from initial weight to latest PR", () => {
    const history = repeatHistory(IDS.chestProgress, 3, 70, 100)

    expect(calculateProgress(history, IDS.chestProgress)).toEqual({
      initialWeightKg: 70,
      latestPrWeightKg: 100,
      progressWeightKg: 30,
    })
  })

  it("selects 10 benchmark candidates with six training groups covered", () => {
    const history = [
      ...repeatHistory(IDS.chestFrequent, 5, 60, 65),
      ...repeatHistory(IDS.chestProgress, 3, 50, 95),
      ...repeatHistory(IDS.back, 4, 55, 70),
      ...repeatHistory(IDS.shoulders, 4, 8, 12),
      ...repeatHistory(IDS.quads, 4, 90, 120),
      ...repeatHistory(IDS.glutesProgress, 2, 40, 85),
      ...repeatHistory(IDS.biceps, 4, 10, 15),
      ...repeatHistory(IDS.tricepsProgress, 2, 15, 45),
      ...repeatHistory(IDS.core, 4, 0, 0),
      ...repeatHistory(IDS.extraProgress, 2, 45, 80),
    ]

    const selectedIds = selectBenchmarkCandidates(history, STRENGTH_EXERCISES)
    const selectedDetails = getBenchmarkCandidateDetails(
      history,
      STRENGTH_EXERCISES,
    )

    expect(selectedIds).toHaveLength(10)
    expect(selectedIds).toEqual(selectedDetails.map((detail) => detail.id))
    expect(selectedIds).toContain(IDS.chestFrequent)
    expect(selectedIds).toContain(IDS.chestProgress)
    expect(selectedIds).toContain(IDS.glutesProgress)
    expect(selectedIds).toContain(IDS.tricepsProgress)
    expect(selectedIds).toContain(IDS.extraProgress)
    expect(new Set(selectedDetails.map((detail) => detail.trainingGroup))).toEqual(
      new Set(["chest", "back", "shoulders", "legs", "arms", "core"]),
    )
    expect(
      selectedDetails.find((detail) => detail.id === IDS.chestProgress),
    ).toMatchObject({
      name: "地面哑铃卧推",
      trainingCount: 3,
      initialWeightKg: 50,
      latestPrWeightKg: 95,
      progressWeightKg: 45,
    })
  })
})
