# 把 workout-plan 编排折进 planWorkout deep module

`app/api/ai/workout-plan/route.ts` 目前是一个浅 interface 罩着真正的力量训练处方编排:它自己做 `normalizeTrainingState` → `detectPhaseTransition` → 构建 AS 安全的基准候选池并校验准入业务规则(高级 ≥5 候选、中级 ≥6 训练组)→ `generateSession` → `createAuditSnapshots`。准入规则写死在 HTTP handler,`workout-plan-route.test.ts` 也只能穿 `POST(Request)` 来断言领域行为——测试打在 transport 上,而不是 interface 上。

**决定:把这条 pipeline 折进一个纯 in-process 的 deep module `planWorkout(req: PlanWorkoutRequest): PlanWorkoutResult`。** `PlanWorkoutResult` 是判别式返回,覆盖三种领域结局,不抛领域错误:

- `{ kind: 'prescription'; plan }` —— `plan` 自带审计快照;
- `{ kind: 'needBenchmarkSelection'; nextPhase; candidates; trainingState }`;
- `{ kind: 'insufficientHistory'; nextPhase; trainedGroups; required }`。

route 退化成薄 adapter:`req.json()` + shape guard(不合法 → 400)→ `planWorkout` → 把 `kind` 映射回**现有线上响应格式**(200 / 200 / 422)。客户端 `app/workout/page.tsx` 不动。

配套结构决定:

- **审计单一表示,只生成一次。** 引擎已在内部建好那一轮 `microcyclePlans` 并跑过容量/结构审计;让它就地吐出面向 UI 的**审计快照**。删除 `createAuditSnapshots` 及其 `generateMicrocyclePlans` 的 O(N²) 重生成,以及 `audit.ts` 里手维护的 `AuditedWorkoutPlan` 结构超型。`SessionVolumeAudit`/`MicrocycleVolumeAudit` 降为引擎的 **internal seam**,`WorkoutSessionAuditSnapshot`/`WorkoutMicrocycleAuditSnapshot` 成为 interface 上唯一的审计类型。快照映射抽成一个共享 helper,三引擎共用,避免复制。
- **统一返回类型。** 三引擎的近乎同构返回类型合并为一个 `GeneratedWorkoutPlan`(`phase` 作判别字段,`templateName` 拓宽为 `string`);`adaptive-engine.generateSession` 返回单一类型,联合类型消失。
- **准入阈值下沉。** 在 `benchmark-selection.ts` 增加 `assessBenchmarkReadiness(candidates, nextPhase)` 返回裁决;`planWorkout` 只负责把裁决映射成 `needBenchmarkSelection` / `insufficientHistory`。「多少训练史算够」这条规则与基准候选的计算内聚一处。
- **测试 replace, don't layer。** `workout-plan-route.test.ts` 的约 15 条穿-HTTP 领域断言迁到新建的 `plan-workout.test.ts`(纯 in-process,正对 interface);route 只留薄冒烟测试(坏 body→400、`kind`→status)。引擎 / adaptive / volume-audit / benchmark-selection 测试作为 internal-seam 保留,并补 `assessBenchmarkReadiness` 用例。

## Considered Options

- **维持现状(编排留在 route)**:改动最小,但准入规则与阶段编排继续泄漏进 transport,审计每次多算一遍,领域测试只能穿 HTTP。locality 差,interface 无从测起。
- **只折 route、审计改动延后**:能收掉编排,但两套审计表示与 O(N²) 重生成保留,status 在两处各自推导仍可能漂移。
- **端到端换判别式 wire 格式**:自描述更好,但要同步改客户端和线上契约,超出本次「收服务端 seam」的范围。
- **抽成远程/可替换 port**:该 pipeline 是纯确定性计算、仅一个进程内调用点,按 in-process 依赖直接合并即可;引入 port 只是无谓的间接层(只有一个 adapter 不构成真 seam)。

## Consequences

- 回归 **ADR-0003** 本就画的分层:`WorkoutEngine interface` 核心层在下、编排在其后。当前实现把编排漏到 route 是偏离了 ADR 自己的 interface,本决定是回归而非推翻。
- 不违 **ADR-0012**:审计仍以实际生成的下一整轮微周期为准、不写历史、不推进课次;区别只是这一轮**只生成一次**并被审计与快照映射共享。
- **统一微周期口径(补完 #80)**:折入时发现旧 `createAuditSnapshots` 用**前向窗口**微周期(`[count … count+N-1]`)算快照的 `mainSetCount` 与结构状态,而引擎内嵌的逐肌群详细审计用**轮换对齐**微周期(`[alignedStart … alignedStart+N-1]`)。二者仅在轮换边界重合。#80 当初把详细审计改成轮换对齐以消除前向窗口漂移,但快照的 `mainSetCount` 未跟进。本次统一到**轮换对齐**这一份微周期供全部快照字段取用;后果:非轮换边界时用户可见的「本轮主训练 N 组」会变(更贴合当前微周期),相关测试期望同步更新。
- `planWorkout` 成为力量训练处方生成的唯一 interface,后续若新增调用点(如 workbench 预览)可直接复用,拿到 leverage。
- 领域词典 `力量训练处方` 已涵盖本模块,无需新词;可选地在该词条补一句:处方生成受阶段转换门控——待转换时产出基准动作选择步骤,训练史不足则产出 insufficient 结果。
