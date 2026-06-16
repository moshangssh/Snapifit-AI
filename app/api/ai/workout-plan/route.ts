import { AIError, handleAIError } from "@/lib/ai/errors"
import { detectPhaseTransition } from "@/lib/workout/engine/adaptive-engine"
import { generateSession } from "@/lib/workout/engine/novice-engine"
import {
  normalizeTrainingState,
} from "@/lib/workout/engine/training-state"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      effectiveUserWeightKg,
      userProfile,
      fatigueSnapshot,
      trainingState,
      recentWorkoutSessionSummaries,
    } = body

    if (
      typeof effectiveUserWeightKg !== "number" ||
      effectiveUserWeightKg <= 0 ||
      !userProfile ||
      !fatigueSnapshot
    ) {
      throw new AIError("INVALID_INPUT", "Invalid workout plan input")
    }

    const normalizedTrainingState = normalizeTrainingState(trainingState)
    const phaseTransition = detectPhaseTransition(normalizedTrainingState)

    if (phaseTransition.phaseTransitionReady) {
      return Response.json({
        needBenchmarkSelection: true,
        nextPhase: phaseTransition.nextPhase,
        reason: phaseTransition.reason,
        trainingState: {
          ...normalizedTrainingState,
          phaseTransitionReady: true,
          // 清除已完成的手动降级记录
          manualDowngrade: undefined,
        },
      })
    }

    return Response.json(
      generateSession(normalizedTrainingState, {
        effectiveUserWeightKg,
        recentWorkoutSessionSummaries: recentWorkoutSessionSummaries ?? [],
      }),
    )
  } catch (error) {
    return handleAIError(error)
  }
}
