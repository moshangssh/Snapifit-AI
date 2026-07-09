import { toAuditSnapshots } from "@/lib/workout/engine/audit"
import {
  auditMicrocycleVolume,
  auditSessionVolume,
  type MicrocycleVolumeAdjustmentCapacity,
  type MicrocycleVolumeAudit,
  type SessionVolumeAudit,
  type VolumeAuditTrainingType,
} from "@/lib/workout/engine/volume-audit"
import type { TrainingState } from "@/lib/workout/engine/training-state"
import type { GeneratedWorkoutPlan } from "@/lib/workout/types"
import type { MuscleKey } from "@/lib/muscle-groups"

type RawPlanBase = Omit<GeneratedWorkoutPlan, "sessionAudit" | "microcycleAudit">

export interface EngineSessionScaffold<Options, RawPlan extends RawPlanBase> {
  generateSession(state: TrainingState, options?: Options): GeneratedWorkoutPlan
  describeVolume(
    state: TrainingState,
    options?: Options,
  ): { session: SessionVolumeAudit; microcycle: MicrocycleVolumeAudit }
}

/**
 * Internal seam shared by the three phase engines: 三阶段结构组装出口 +
 * 微周期锚定重建 + 训练容量审计 + 审计快照映射。
 *
 * 微周期重建锚定到轮换边界,使审计始终描述同一个规范 microcycle,与从周期内
 * 哪一次 session 生成无关(#80)。若用前向窗口(count + index),窗口会跨过
 * 轮换边界(把下一个微周期的减载、或「基准动作→变式」切换点后的 session
 * 拖进来),令同一微周期的审计结果随入口漂移。
 *
 * 引擎只提供阶段差异:阶段起点、模板数、渐进与选择都在 generateSessionRaw
 * 里;是否上报 currentBlock、审计 sessions 的 trainingType 标注、以及
 * novice 的有限容量调整,通过可选配置注入。
 */
export function createEngineSessionScaffold<
  Options,
  RawPlan extends RawPlanBase,
>(config: {
  /** 本阶段在全局课次计数上的起点(novice 0 / intermediate 72 / advanced 240)。 */
  phaseStartSession: number
  /** 一个微周期包含的模板数。 */
  templateCount: number
  /** 本阶段全部模板的 main 肌群 keys,交给微周期审计做覆盖校验。 */
  expectedMuscleGroups: readonly MuscleKey[]
  generateSessionRaw(state: TrainingState, options?: Options): RawPlan
  /** 块状周期引擎(intermediate/advanced)把当前块上报给微周期审计。 */
  includeCurrentBlock?: boolean
  /** advanced 为每个审计 session 标注训练类型(力量/肌肥大/耐力容量目标不同)。 */
  auditSessionTrainingType?(plan: RawPlan): VolumeAuditTrainingType
  /** novice 的有限容量调整:审计可以在多大范围内安全加组/加动作。 */
  adjustmentCapacity?(
    microcyclePlans: RawPlan[],
    state: TrainingState,
  ): Record<string, MicrocycleVolumeAdjustmentCapacity>
}): EngineSessionScaffold<Options, RawPlan> {
  function buildVolumeAudits(
    state: TrainingState,
    options?: Options,
  ): {
    plan: RawPlan
    microcyclePlans: RawPlan[]
    sessionVolumeAudit: SessionVolumeAudit
    microcycleVolumeAudit: MicrocycleVolumeAudit
  } {
    const plan = config.generateSessionRaw(state, options)
    const sessionsSincePhaseStart = Math.max(
      0,
      state.completedSessionCount - config.phaseStartSession,
    )
    const microcycleStart =
      state.completedSessionCount -
      (sessionsSincePhaseStart % config.templateCount)
    const microcyclePlans = Array.from(
      { length: config.templateCount },
      (_, index) =>
        config.generateSessionRaw(
          {
            ...state,
            completedSessionCount: microcycleStart + index,
          },
          options,
        ),
    )

    return {
      plan,
      microcyclePlans,
      sessionVolumeAudit: auditSessionVolume({
        phase: plan.phase,
        isDeload: plan.isDeload,
        exercises: plan.exercises,
      }),
      microcycleVolumeAudit: auditMicrocycleVolume({
        phase: plan.phase,
        completedSessionCount: state.completedSessionCount,
        ...(config.includeCurrentBlock
          ? { currentBlock: plan.trainingState.currentBlock }
          : {}),
        isDeload: microcyclePlans.some((item) => item.isDeload),
        expectedMuscleGroups: [...config.expectedMuscleGroups],
        constrainedReasons:
          state.blacklistedExerciseIds.length > 0 ? ["blacklist"] : [],
        sessions: config.auditSessionTrainingType
          ? microcyclePlans.map((item) => ({
              exercises: item.exercises,
              trainingType: config.auditSessionTrainingType!(item),
            }))
          : microcyclePlans,
        ...(config.adjustmentCapacity
          ? {
              adjustmentCapacity: config.adjustmentCapacity(
                microcyclePlans,
                state,
              ),
            }
          : {}),
      }),
    }
  }

  return {
    generateSession(state, options) {
      const { plan, microcyclePlans, sessionVolumeAudit, microcycleVolumeAudit } =
        buildVolumeAudits(state, options)

      return {
        ...plan,
        ...toAuditSnapshots({
          sessionExercises: plan.exercises,
          microcyclePlans,
          sessionVolumeAudit,
          microcycleVolumeAudit,
        }),
      }
    },

    /**
     * Internal seam: the detailed 训练容量审计 over the engine's actual generated
     * microcycle, for the engine's own tests. `generateSession` returns the 审计快照.
     */
    describeVolume(state, options) {
      const { sessionVolumeAudit, microcycleVolumeAudit } = buildVolumeAudits(
        state,
        options,
      )

      return { session: sessionVolumeAudit, microcycle: microcycleVolumeAudit }
    },
  }
}
