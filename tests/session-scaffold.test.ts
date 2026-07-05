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
    // intensification 的容量目标 [4,8] 区别于无 currentBlock 时的默认 [6,10],
    // 转发被弄坏时目标会漂回默认值,断言即变红(#116)。
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 4,
      expectedMuscleGroups: ["chest"],
      includeCurrentBlock: true,
      generateSessionRaw: (state) => ({
        ...rawPlanFor(state),
        phase: "intermediate",
        trainingState: { ...state, currentBlock: "intensification" },
      }),
    })

    const { microcycle } = scaffold.describeVolume({
      ...baseState,
      phase: "intermediate",
    })

    expect(microcycle.muscleGroupAudits.chest.targetMinSets).toBe(4)
    expect(microcycle.muscleGroupAudits.chest.targetMaxSets).toBe(8)
  })

  it("labels audit sessions with the engine's training type when configured", () => {
    // advanced 审计按 session 训练类型合并容量目标:endurance [10,16] 与
    // hypertrophy [8,12] 合并为 [8,16]。min=8 只能来自 hypertrophy、max=16
    // 只能来自 endurance,任一映射被丢弃断言即变红(#116)。
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 2,
      expectedMuscleGroups: ["chest"],
      auditSessionTrainingType: (plan) =>
        plan.templateIndex % 2 === 0 ? "endurance" : "hypertrophy",
      generateSessionRaw: (state) => ({
        ...rawPlanFor(state),
        phase: "advanced",
        templateIndex: state.completedSessionCount % 2,
      }),
    })

    const { microcycle } = scaffold.describeVolume({
      ...baseState,
      phase: "advanced",
    })

    expect(microcycle.muscleGroupAudits.chest.targetMinSets).toBe(8)
    expect(microcycle.muscleGroupAudits.chest.targetMaxSets).toBe(16)
  })

  it("feeds the injected adjustment capacity into the microcycle audit", () => {
    // quadriceps 零组数、缺口 6 恰好被注入的 headroomExisting 补齐;注入
    // 被丢弃时无约束理由的缺口会退化为 fail,断言即变红(#116)。
    const scaffold = createEngineSessionScaffold<Record<string, never>, RawPlan>({
      phaseStartSession: 0,
      templateCount: 4,
      expectedMuscleGroups: ["chest", "quadriceps"],
      adjustmentCapacity: () => ({
        quadriceps: { headroomExisting: 6, headroomNewExercise: 0 },
      }),
      generateSessionRaw: (state) => rawPlanFor(state),
    })

    const { microcycle } = scaffold.describeVolume(baseState)

    expect(microcycle.muscleGroupAudits.quadriceps.status).toBe("adjusted")
    expect(microcycle.muscleGroupAudits.quadriceps.adjustment).toEqual({
      addedSets: 6,
      addedExercise: false,
      adjustedSets: 6,
    })
  })
})
