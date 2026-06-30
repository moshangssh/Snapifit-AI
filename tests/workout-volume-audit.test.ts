import { describe, expect, it } from "vitest"
import {
  auditMicrocycleVolume,
  auditSessionVolume,
  computeMicrocycleAdjustmentCapacity,
} from "@/lib/workout/engine/volume-audit"
import type { WorkoutPlanExerciseDraft } from "@/lib/workout/types"

function draft(
  phase: WorkoutPlanExerciseDraft["phase"],
  exerciseType: WorkoutPlanExerciseDraft["plannedAnalysis"]["exerciseType"],
  sets: number,
  muscleGroups: WorkoutPlanExerciseDraft["plannedAnalysis"]["muscleGroups"] = [
    "chest",
  ],
): WorkoutPlanExerciseDraft {
  return {
    plannedExerciseName: `${phase}-${exerciseType}`,
    phase,
    tips: [],
    sets: Array.from({ length: sets }, () => ({ plannedReps: 10 })),
    plannedAnalysis: {
      exerciseType,
      muscleGroups,
      estimatedMets: exerciseType === "strength" ? 5 : 2,
      estimatedDurationMinutes: sets * 3,
      caloriesBurnedEstimated: 0,
      isEstimated: true,
    },
  }
}

describe("training volume audit", () => {
  it("counts only main strength sets for session volume", () => {
    const audit = auditSessionVolume({
      phase: "novice",
      isDeload: false,
      exercises: [
        draft("warmup", "strength", 4),
        draft("warmup", "flexibility", 2),
        draft("main", "strength", 3),
        draft("main", "flexibility", 3),
        draft("cooldown", "strength", 4),
      ],
    })

    expect(audit.mainStrengthSetCount).toBe(3)
    expect(audit.hasThreePhaseStructure).toBe(true)
    expect(audit.status).toBe("pass")
  })

  it("fails a non-deload session that has no main strength volume", () => {
    const audit = auditSessionVolume({
      phase: "intermediate",
      isDeload: false,
      exercises: [
        draft("warmup", "strength", 2),
        draft("main", "flexibility", 1),
        draft("cooldown", "strength", 2),
      ],
    })

    expect(audit.hasThreePhaseStructure).toBe(true)
    expect(audit.mainStrengthSetCount).toBe(0)
    expect(audit.status).toBe("fail")
  })

  it("uses staged novice microcycle targets from completed session count", () => {
    const sixChestSets = [
      { exercises: [draft("main", "strength", 3)] },
      { exercises: [draft("main", "strength", 3)] },
    ]

    expect(
      auditMicrocycleVolume({
        phase: "novice",
        completedSessionCount: 12,
        isDeload: false,
        sessions: sixChestSets,
      }).muscleGroupAudits.chest.status,
    ).toBe("pass")
    expect(
      auditMicrocycleVolume({
        phase: "novice",
        completedSessionCount: 25,
        isDeload: false,
        sessions: sixChestSets,
      }).muscleGroupAudits.chest.status,
    ).toBe("fail")
  })

  it("marks low volume as constrained when a machine-readable constraint explains it", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 25,
      isDeload: false,
      constrainedReasons: ["blacklist"],
      sessions: [{ exercises: [draft("main", "strength", 3)] }],
    })

    expect(audit.status).toBe("constrained")
    expect(audit.muscleGroupAudits.chest).toMatchObject({
      status: "constrained",
      constrainedReasons: ["blacklist"],
    })
  })

  it("fails a microcycle muscle group above the target maximum", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 12,
      isDeload: false,
      sessions: [{ exercises: [draft("main", "strength", 11)] }],
    })

    expect(audit.status).toBe("fail")
    expect(audit.muscleGroupAudits.chest).toMatchObject({
      status: "fail",
      sets: 11,
      targetMinSets: 6,
      targetMaxSets: 10,
    })
  })

  it("audits expected muscle groups with zero volume when they are absent", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 12,
      isDeload: false,
      expectedMuscleGroups: ["chest", "glutes"],
      constrainedReasons: ["blacklist"],
      sessions: [
        {
          exercises: [draft("main", "strength", 6, ["chest"])],
        },
      ],
    })

    expect(audit.status).toBe("constrained")
    expect(audit.muscleGroupAudits.chest.status).toBe("pass")
    expect(audit.muscleGroupAudits.glutes).toMatchObject({
      status: "constrained",
      sets: 0,
      targetMinSets: 6,
      targetMaxSets: 10,
      constrainedReasons: ["blacklist"],
    })
  })

  it("uses block-aware intermediate targets", () => {
    const accumulation = auditMicrocycleVolume({
      phase: "intermediate",
      completedSessionCount: 80,
      currentBlock: "accumulation",
      isDeload: false,
      sessions: [{ exercises: [draft("main", "strength", 5)] }],
    })
    const intensification = auditMicrocycleVolume({
      phase: "intermediate",
      completedSessionCount: 98,
      currentBlock: "intensification",
      isDeload: false,
      sessions: [{ exercises: [draft("main", "strength", 5)] }],
    })
    const deload = auditMicrocycleVolume({
      phase: "intermediate",
      completedSessionCount: 110,
      currentBlock: "deload",
      isDeload: true,
      sessions: [{ exercises: [draft("main", "strength", 2)] }],
    })

    expect(accumulation.muscleGroupAudits.chest.targetMinSets).toBe(6)
    expect(accumulation.status).toBe("fail")
    expect(intensification.muscleGroupAudits.chest.targetMinSets).toBe(4)
    expect(intensification.status).toBe("pass")
    expect(deload.status).toBe("constrained")
    expect(deload.constrainedReasons).toContain("deload")
  })

  it("adjusts low microcycle volume by adding sets to existing main work", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 30,
      isDeload: false,
      sessions: [
        { exercises: [draft("main", "strength", 3)] },
        { exercises: [draft("main", "strength", 3)] },
      ],
      adjustmentCapacity: {
        chest: { headroomExisting: 4, headroomNewExercise: 0 },
      },
    })

    expect(audit.status).toBe("adjusted")
    expect(audit.muscleGroupAudits.chest).toMatchObject({
      status: "adjusted",
      sets: 6,
      targetMinSets: 8,
      adjustment: { addedSets: 2, addedExercise: false, adjustedSets: 8 },
    })
  })

  it("adds a new main exercise only when a muscle group cannot be carried by sets", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 30,
      isDeload: false,
      expectedMuscleGroups: ["chest", "glutes"],
      sessions: [{ exercises: [draft("main", "strength", 8, ["chest"])] }],
      adjustmentCapacity: {
        glutes: { headroomExisting: 0, headroomNewExercise: 8 },
      },
    })

    expect(audit.status).toBe("adjusted")
    expect(audit.muscleGroupAudits.chest.status).toBe("pass")
    expect(audit.muscleGroupAudits.glutes).toMatchObject({
      status: "adjusted",
      sets: 0,
      adjustment: { addedSets: 8, addedExercise: true, adjustedSets: 8 },
    })
  })

  it("stays constrained instead of exceeding the per-session set cap", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 30,
      isDeload: false,
      constrainedReasons: ["exercise_pool_limit"],
      sessions: [
        { exercises: [draft("main", "strength", 3)] },
        { exercises: [draft("main", "strength", 3)] },
      ],
      // Deficit is 2 but only 1 more set fits within the caps and no new
      // exercise can be added, so the engine must not over-fill.
      adjustmentCapacity: {
        chest: { headroomExisting: 1, headroomNewExercise: 0 },
      },
    })

    expect(audit.status).toBe("constrained")
    expect(audit.muscleGroupAudits.chest).toMatchObject({
      status: "constrained",
      sets: 6,
      constrainedReasons: ["exercise_pool_limit"],
    })
    expect(audit.muscleGroupAudits.chest.adjustment).toBeUndefined()
  })

  it("stays constrained when AS locks or the blacklist leave no safe way to adjust", () => {
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 30,
      isDeload: false,
      expectedMuscleGroups: ["glutes"],
      constrainedReasons: ["as_safety_lock", "blacklist"],
      sessions: [],
      // No existing glute work and no safe candidate to add, so volume cannot be
      // reached without breaking a safety rule.
      adjustmentCapacity: {
        glutes: { headroomExisting: 0, headroomNewExercise: 0 },
      },
    })

    expect(audit.status).toBe("constrained")
    expect(audit.muscleGroupAudits.glutes).toMatchObject({
      status: "constrained",
      sets: 0,
      constrainedReasons: ["as_safety_lock", "blacklist"],
    })
    expect(audit.muscleGroupAudits.glutes.adjustment).toBeUndefined()
  })

  it("does not over-count per-session headroom when two main exercises share a muscle key", () => {
    // One session, two chest main exercises @ 2 sets each (4 session main sets).
    // Per-session cap 6 leaves room for only 2 more sets; per-exercise cap 5 is
    // not the binding constraint. The session's chest headroom must be capped at
    // the 2 sets that physically fit — not 2+2=4 — so the per-session cap holds
    // per key, not just per exercise (#74: 保留单次 main 组数上限).
    const sessions = [
      {
        exercises: [
          draft("main", "strength", 2, ["chest"]),
          draft("main", "strength", 2, ["chest"]),
        ],
      },
    ]
    const capacity = computeMicrocycleAdjustmentCapacity({
      sessions,
      perExerciseMainSetCap: 5,
      perSessionMainSetCap: 6,
    })

    expect(capacity.chest.headroomExisting).toBe(2)

    // Target min 8 at session 30, chest has 4 sets -> deficit 4, but only 2 fit.
    // The honest verdict is constrained, never an 'adjusted' that breaks the cap.
    const audit = auditMicrocycleVolume({
      phase: "novice",
      completedSessionCount: 30,
      isDeload: false,
      constrainedReasons: ["exercise_pool_limit"],
      sessions,
      adjustmentCapacity: capacity,
    })

    expect(audit.muscleGroupAudits.chest.status).toBe("constrained")
    expect(audit.muscleGroupAudits.chest.adjustment).toBeUndefined()
  })

  it("still aggregates headroom across separate sessions that share a muscle key", () => {
    // Two DIFFERENT sessions each with one chest exercise @ 2 sets: per-session caps
    // are independent, so each session contributes its own room (per-exercise cap 5 -
    // 2 = 3, within sessionRoom 4) and chest headroom legitimately sums to 6 — the
    // clamp must bound per session, not collapse the cross-session total to one cap.
    const capacity = computeMicrocycleAdjustmentCapacity({
      sessions: [
        { exercises: [draft("main", "strength", 2, ["chest"])] },
        { exercises: [draft("main", "strength", 2, ["chest"])] },
      ],
      perExerciseMainSetCap: 5,
      perSessionMainSetCap: 6,
    })

    expect(capacity.chest.headroomExisting).toBe(6)
  })

  it("uses DUP training-type targets for advanced microcycles", () => {
    const strength = auditMicrocycleVolume({
      phase: "advanced",
      completedSessionCount: 240,
      trainingType: "strength",
      isDeload: false,
      sessions: [{ exercises: [draft("main", "strength", 5)] }],
    })
    const hypertrophy = auditMicrocycleVolume({
      phase: "advanced",
      completedSessionCount: 242,
      trainingType: "hypertrophy",
      isDeload: false,
      sessions: [{ exercises: [draft("main", "strength", 8)] }],
    })
    const endurance = auditMicrocycleVolume({
      phase: "advanced",
      completedSessionCount: 244,
      trainingType: "endurance",
      isDeload: false,
      sessions: [{ exercises: [draft("main", "strength", 10)] }],
    })

    expect(strength.muscleGroupAudits.chest.targetMinSets).toBe(6)
    expect(strength.status).toBe("fail")
    expect(hypertrophy.muscleGroupAudits.chest.targetMinSets).toBe(8)
    expect(hypertrophy.status).toBe("pass")
    expect(endurance.muscleGroupAudits.chest.targetMinSets).toBe(10)
    expect(endurance.status).toBe("pass")
  })
})
