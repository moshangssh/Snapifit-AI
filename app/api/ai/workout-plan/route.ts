import { AIError, handleAIError } from "@/lib/ai/errors"
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

    return Response.json(
      generateSession(normalizeTrainingState(trainingState), {
        effectiveUserWeightKg,
        recentWorkoutSessionSummaries: Array.isArray(
          recentWorkoutSessionSummaries,
        )
          ? recentWorkoutSessionSummaries
          : [],
      }),
    )
  } catch (error) {
    return handleAIError(error)
  }
}
