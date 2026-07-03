import { describe, expect, it } from "vitest"
import { createEngineSessionScaffold } from "@/lib/workout/engine/session-scaffold"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type {
  GeneratedWorkoutPlan,
  WorkoutPlanExerciseDraft,
} from "@/lib/workout/types"

type RawPlan = Omit<GeneratedWorkoutPlan, "sessionAudit" | "microcycleAudit">

const baseState: TrainingState = {
  phase: "novice",
  completedSessionCount: 0,
  blacklistedExerciseIds: [],
  unlockedRiskCategories: [],
}

function draft(
  phase: WorkoutPlanExerciseDraft["phase"],
  setCount = 3,
): WorkoutPlanExerciseDraft {
  return {
    plannedExerciseName: `exercise-${phase}`,
    phase,
    notes: "",
    tips: [],
    sets: Array.from({ length: setCount }, () => ({
      plannedWeightKg: 20,
      plannedReps: 10,
    })),
    plannedAnalysis: {
      exerciseType: "strength",
      muscleGroups: ["chest"],
      estimatedMets: 5,
      estimatedDurationMinutes: setCount * 3,
      caloriesBurnedEstimated: 100,
      isEstimated: true,
    },
  }
}

function rawPlanFor(state: TrainingState): RawPlan {
  return {
    templateIndex: state.completedSessionCount % 4,
    templateName: `模板${state.completedSessionCount % 4}`,
    phase: "novice",
    isDeload: false,
    trainingState: state,
    exercises: [draft("warmup", 1), draft("main"), draft("cooldown", 1)],
  }
}

describe("createEngineSessionScaffold", () => {
  it("anchors microcycle reconstruction to the rotation boundary (#80)", () => {
    const seenCounts: number[] = []
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 72,
      templateCount: 4,
      expectedMuscleGroups: ["chest"],
      generateSessionRaw: (state) => {
        seenCounts.push(state.completedSessionCount)
        return rawPlanFor(state)
      },
    })

    // 阶段起点 72,当前课次 78 → 阶段内第 6 次,微周期锚定应回到 76..79
    scaffold.generateSession({ ...baseState, completedSessionCount: 78 })

    expect(seenCounts[0]).toBe(78)
    expect(seenCounts.slice(1)).toEqual([76, 77, 78, 79])
  })

  it("returns the raw plan enriched with audit snapshots", () => {
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 4,
      expectedMuscleGroups: ["chest"],
      generateSessionRaw: (state) => rawPlanFor(state),
    })

    const plan = scaffold.generateSession(baseState)

    expect(plan.sessionAudit.status).toBe("pass")
    expect(plan.sessionAudit.mainSetCount).toBe(3)
    expect(plan.microcycleAudit.sessionCount).toBe(4)
    expect(plan.microcycleAudit.mainSetCount).toBe(12)
  })

  it("reports blacklist as a constrained reason to the microcycle audit", () => {
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 4,
      expectedMuscleGroups: ["chest"],
      generateSessionRaw: (state) => rawPlanFor(state),
    })

    const { microcycle } = scaffold.describeVolume({
      ...baseState,
      blacklistedExerciseIds: ["blocked-id"],
    })

    expect(microcycle.constrainedReasons).toContain("blacklist")
  })

  it("passes the plan's current block through when configured", () => {
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 4,
      expectedMuscleGroups: ["chest"],
      includeCurrentBlock: true,
      generateSessionRaw: (state) => ({
        ...rawPlanFor(state),
        isDeload: true,
        trainingState: { ...state, currentBlock: "deload" },
      }),
    })

    const { session, microcycle } = scaffold.describeVolume(baseState)

    expect(session.constrainedReasons).toContain("deload")
    expect(microcycle.status).toBe("constrained")
  })

  it("labels audit sessions with the engine's training type when configured", () => {
    const seenTypes: string[] = []
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 2,
      expectedMuscleGroups: ["chest"],
      auditSessionTrainingType: (plan) => {
        const type = plan.templateIndex % 2 === 0 ? "strength" : "endurance"
        seenTypes.push(type)
        return type
      },
      generateSessionRaw: (state) => ({
        ...rawPlanFor(state),
        templateIndex: state.completedSessionCount % 2,
      }),
    })

    scaffold.generateSession(baseState)

    expect(seenTypes).toEqual(["strength", "endurance"])
  })
})
