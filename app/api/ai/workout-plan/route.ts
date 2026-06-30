import { AIError, handleAIError } from "@/lib/ai/errors"
import {
  detectPhaseTransition,
  generateSession,
} from "@/lib/workout/engine/adaptive-engine"
import { getBenchmarkCandidateDetails } from "@/lib/workout/engine/benchmark-selection"
import { STRENGTH_EXERCISES } from "@/lib/workout/engine/catalog"
import { filterASSafe } from "@/lib/workout/engine/as-safety"
import { createAuditSnapshots } from "@/lib/workout/engine/audit"
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
      // 中级→高级：从用户已选定的中级基准动作中挑选终生基准动作；
      // 新手→中级：从完整力量库的新手核心动作中挑选。
      const isAdvancedTransition = phaseTransition.nextPhase === "advanced"
      // 纵深防御：基准候选会成为用户的（中级/终生）基准动作，须套用 AS 安全锁，
      // 避免某个被锁定的风险动作（如将来被误标 NOVICE_CORE）固化为永久基准。
      const candidatePool = filterASSafe(
        isAdvancedTransition
          ? STRENGTH_EXERCISES.filter((exercise) =>
              (normalizedTrainingState.benchmarkExerciseIds ?? []).includes(
                exercise.id,
              ),
            )
          : STRENGTH_EXERCISES,
        normalizedTrainingState.unlockedRiskCategories,
      )
      const benchmarkCandidates = getBenchmarkCandidateDetails(
        recentWorkoutSessionSummaries ?? [],
        candidatePool,
        // 高级候选池已限定为用户的中级基准动作，无需再按 NOVICE_CORE 过滤
        { requireNoviceCore: !isAdvancedTransition },
      )

      if (isAdvancedTransition) {
        if (benchmarkCandidates.length < 5) {
          throw new AIError(
            "INSUFFICIENT_TRAINING_HISTORY",
            `进阶阶段基准动作候选不足：需要至少 5 个候选动作，当前只有 ${benchmarkCandidates.length} 个。请继续中级训练以积累更多动作数据。`,
          )
        }
      }

      if (phaseTransition.nextPhase === "intermediate") {
        // 验证候选质量：至少要有 6 个训练组覆盖，且有实际训练记录
        const trainedCandidates = benchmarkCandidates.filter(
          (candidate) => candidate.trainingCount > 0,
        )
        const trainedGroups = new Set(
          trainedCandidates.map((candidate) => candidate.trainingGroup),
        )

        if (trainedGroups.size < 6) {
          throw new AIError(
            "INSUFFICIENT_TRAINING_HISTORY",
            `基准动作候选不足：需要至少覆盖 6 个训练组（胸/背/肩/腿/臂/核心），当前只训练了 ${trainedGroups.size} 个训练组。请继续新手训练。`,
          )
        }
      }

      return Response.json({
        needBenchmarkSelection: true,
        nextPhase: phaseTransition.nextPhase,
        reason: phaseTransition.reason,
        benchmarkCandidates,
        trainingState: {
          ...normalizedTrainingState,
          phaseTransitionReady: true,
          // 清除已完成的手动降级记录
          manualDowngrade: undefined,
        },
      })
    }

    const plan = generateSession(normalizedTrainingState, {
      effectiveUserWeightKg,
      recentWorkoutSessionSummaries: recentWorkoutSessionSummaries ?? [],
      fatigueSnapshot,
    })

    return Response.json({
      ...plan,
      ...createAuditSnapshots({
        plan,
        effectiveUserWeightKg,
        recentWorkoutSessionSummaries: recentWorkoutSessionSummaries ?? [],
        fatigueSnapshot,
      }),
    })
  } catch (error) {
    return handleAIError(error)
  }
}
