import { describe, expect, it } from "vitest"
import {
  confirmBenchmarkSelection,
  confirmLifetimeBenchmarkSelection,
  detectPhaseTransition,
  generateSession,
  shouldShowBenchmarkSelection,
} from "@/lib/workout/engine/adaptive-engine"
import type { TrainingState } from "@/lib/workout/engine/training-state"

function makeState(
  completedSessionCount: number,
  overrides: Partial<TrainingState> = {},
): TrainingState {
  return {
    phase: "novice",
    completedSessionCount,
    blacklistedExerciseIds: [],
    ...overrides,
  }
}

describe("adaptive workout engine", () => {
  it("detects novice to intermediate readiness after 72 completed sessions", () => {
    expect(detectPhaseTransition(makeState(72))).toEqual({
      phaseTransitionReady: true,
      nextPhase: "intermediate",
      reason: "novice_session_threshold",
    })
    expect(detectPhaseTransition(makeState(71))).toEqual({
      phaseTransitionReady: false,
    })
  })

  it("detects novice to intermediate readiness when four exercises are stalled", () => {
    expect(detectPhaseTransition(makeState(20, { stalledExercises: 4 }))).toEqual({
      phaseTransitionReady: true,
      nextPhase: "intermediate",
      reason: "novice_stalled_exercises",
    })
    expect(detectPhaseTransition(makeState(20, { stalledExercises: 3 }))).toEqual({
      phaseTransitionReady: false,
    })
  })

  it("detects readiness after a manual downgrade completes its upgrade window", () => {
    expect(
      detectPhaseTransition(
        makeState(80, {
          manualDowngrade: {
            from: "intermediate",
            at: 72,
            upgradeAfter: 8,
          },
        }),
      ),
    ).toEqual({
      phaseTransitionReady: true,
      nextPhase: "intermediate",
      reason: "manual_downgrade_upgrade_window",
    })
    expect(
      detectPhaseTransition(
        makeState(79, {
          manualDowngrade: {
            from: "intermediate",
            at: 72,
            upgradeAfter: 8,
          },
        }),
      ),
    ).toEqual({
      phaseTransitionReady: false,
    })
  })

  it("detects intermediate to advanced readiness after 240 completed sessions", () => {
    expect(
      detectPhaseTransition(
        makeState(240, {
          phase: "intermediate",
          benchmarkExerciseIds: Array.from({ length: 10 }, (_, index) =>
            `exercise-${index + 1}`,
          ),
        }),
      ),
    ).toEqual({
      phaseTransitionReady: true,
      nextPhase: "advanced",
      reason: "intermediate_session_threshold",
    })
    expect(
      detectPhaseTransition(
        makeState(239, {
          phase: "intermediate",
          benchmarkExerciseIds: Array.from({ length: 10 }, (_, index) =>
            `exercise-${index + 1}`,
          ),
        }),
      ),
    ).toEqual({
      phaseTransitionReady: false,
    })
  })

  it("shows benchmark selection only when phase transition is ready", () => {
    expect(
      shouldShowBenchmarkSelection(makeState(72, { phaseTransitionReady: true })),
    ).toBe(true)
    expect(shouldShowBenchmarkSelection(makeState(72))).toBe(false)
  })

  it("confirms benchmark selection and moves training state to intermediate", () => {
    const benchmarkExerciseIds = Array.from({ length: 10 }, (_, index) =>
      `exercise-${index + 1}`,
    )

    expect(
      confirmBenchmarkSelection(
        makeState(72, { phaseTransitionReady: true }),
        benchmarkExerciseIds,
      ),
    ).toEqual({
      phase: "intermediate",
      completedSessionCount: 72,
      blacklistedExerciseIds: [],
      benchmarkExerciseIds,
      phaseTransitionReady: false,
    })
  })

  it("accepts 8-10 benchmark exercises", () => {
    const eightExercises = Array.from({ length: 8 }, (_, index) =>
      `exercise-${index + 1}`,
    )
    const nineExercises = Array.from({ length: 9 }, (_, index) =>
      `exercise-${index + 1}`,
    )

    const result8 = confirmBenchmarkSelection(
      makeState(72, { phaseTransitionReady: true }),
      eightExercises,
    )
    const result9 = confirmBenchmarkSelection(
      makeState(72, { phaseTransitionReady: true }),
      nineExercises,
    )

    expect(result8.benchmarkExerciseIds).toHaveLength(8)
    expect(result9.benchmarkExerciseIds).toHaveLength(9)
  })

  it("caps benchmark exercises at 10 even if more are provided", () => {
    const tooMany = Array.from({ length: 15 }, (_, index) =>
      `exercise-${index + 1}`,
    )

    const result = confirmBenchmarkSelection(
      makeState(72, { phaseTransitionReady: true }),
      tooMany,
    )

    expect(result.benchmarkExerciseIds).toHaveLength(10)
    expect(result.benchmarkExerciseIds).toEqual(tooMany.slice(0, 10))
  })

  it("handles empty benchmark selection gracefully", () => {
    const result = confirmBenchmarkSelection(
      makeState(72, { phaseTransitionReady: true }),
      [],
    )

    expect(result.benchmarkExerciseIds).toEqual([])
    expect(result.phase).toBe("intermediate")
  })

  it("clears manual downgrade record when confirming benchmarks", () => {
    const benchmarkExerciseIds = Array.from({ length: 10 }, (_, index) =>
      `exercise-${index + 1}`,
    )

    const result = confirmBenchmarkSelection(
      makeState(80, {
        phaseTransitionReady: true,
        manualDowngrade: {
          from: "intermediate",
          at: 72,
          upgradeAfter: 8,
        },
      }),
      benchmarkExerciseIds,
    )

    expect(result.manualDowngrade).toBeUndefined()
    expect(result.phase).toBe("intermediate")
  })

  it("confirms five lifetime benchmarks and moves training state to advanced", () => {
    const benchmarkExerciseIds = Array.from({ length: 10 }, (_, index) =>
      `exercise-${index + 1}`,
    )
    const lifetimeBenchmarkIds = benchmarkExerciseIds.slice(0, 5)

    expect(
      confirmLifetimeBenchmarkSelection(
        makeState(240, {
          phase: "intermediate",
          phaseTransitionReady: true,
          benchmarkExerciseIds,
        }),
        lifetimeBenchmarkIds,
      ),
    ).toEqual({
      phase: "advanced",
      completedSessionCount: 240,
      blacklistedExerciseIds: [],
      benchmarkExerciseIds,
      lifetimeBenchmarkIds,
      lastDeloadSession: 240,
      phaseTransitionReady: false,
    })
  })

  it("caps lifetime benchmark selection at five", () => {
    const benchmarkExerciseIds = Array.from({ length: 10 }, (_, index) =>
      `exercise-${index + 1}`,
    )

    const result = confirmLifetimeBenchmarkSelection(
      makeState(240, {
        phase: "intermediate",
        phaseTransitionReady: true,
        benchmarkExerciseIds,
      }),
      benchmarkExerciseIds,
    )

    expect(result.lifetimeBenchmarkIds).toEqual(benchmarkExerciseIds.slice(0, 5))
  })

  it("delegates session generation to the intermediate engine when state phase is intermediate", () => {
    const plan = generateSession(
      makeState(72, {
        phase: "intermediate",
        benchmarkExerciseIds: Array.from({ length: 10 }, (_, index) =>
          `exercise-${index + 1}`,
        ),
      }),
    )

    expect(plan.phase).toBe("intermediate")
    expect(plan.templateIndex).toBe(0)
  })
})
