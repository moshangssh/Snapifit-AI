import { describe, expect, it } from "vitest"
import {
  auditMicrocycleVolume,
  auditSessionVolume,
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
