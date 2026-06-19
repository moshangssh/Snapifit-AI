# 训练计划引擎从 LLM 生成改为确定性算法

## Context

现有训练计划系统使用 LLM 每次生成单个训练（`app/api/ai/workout-plan/route.ts`）。用户训练 3 个月后发现系统"不尽人意"。经过文献调研和需求分析，发现 LLM 生成方案存在以下问题：

1. **缺乏周期化**：LLM 每次生成孤立的训练，不知道这是第几周、上周训练量、何时该减载。ACSM/NSCA 2026 共识明确：没有周期化 = 没有渐进 = 停滞。
2. **动作选择不稳定**：LLM 自由编动作名，同一个"推胸"动作每次可能用不同名称，无法追踪渐进超负荷。
3. **疲劳系统被架空**：fatigueSnapshot 是硬数据，但 LLM 的"判读"是软规则，可能被"理解"成"尽量避免"而不是硬约束。
4. **2026 年行业共识**：LLM wrapper 已过时，真正有效的是 deterministic algorithm + progressive overload（来源：AI Workout Generator 2026 报告）。

用户有 824 个结构化动作（SmartWorkout 派生），有疲劳追踪，有历史记录。**所有变量都有公式，不需要 LLM "思考"。**

## Decision

**采用纯确定性引擎，分层架构支持多训练阶段演进。**

### 架构设计

```
引擎核心层 (WorkoutEngine interface)
  ↓
阶段配置层 (PhaseConfig: 新手/中级/高级)
  ↓
自动切换层 (根据训练数据判断阶段转换)
```

第一版实现：**新手线性增长阶段（Novice Linear Progression）**

- **用户画像**：个人工具，用户是新手 3 个月，有强直性脊柱炎（AS），一周练 3-4 天
- **时间范围**：支持 0-6 个月（约 72 次训练）
- **预留扩展**：6 个月后加中级配置，18 个月后加高级配置，不需要重构核心

### 新手阶段核心参数

| 维度 | 参数 |
|------|------|
| 分化模式 | 上下分化，4 模板轮转（上A推 → 下A → 上B拉 → 下B） |
| 驱动方式 | 按课次轮转，无视日历 |
| 训练结构 | warmup 4 动作 + main 4-5 动作 × 3 组 + cooldown 4 动作 |
| AS 活动度 | 每次训练 warmup 2 个 AS 核心 + cooldown 2 个 AS 核心 |
| 渐进规则 | 完成目标 → 加重（上肢 +1.25kg，下肢 +2.5kg）；连续 2 次未完成 → 保持；连续 3 次 → 换动作 |
| 减载周期 | 每 16 次训练后，3 次减载训练（#51 从 12 延长） |
| 减载参数 | -30% 重量，-33% 组数（3 组 → 2 组） |
| 动作替换 | 同肌群 + 同池 + 同 mechanics，从保守重量起步 |
| 不适标记 | 用户可标记"感觉不对"，引擎立即换动作并加入黑名单 |

### 中级/高级阶段（预留）

**中级块状周期化**（6-18 个月）：
- 6 个模板，块状周期（3 周累积 + 3 周强化 + 1 周减载）
- 动作轮换池，同肌群多动作交替
- 容量地标（MEV/MAV/MRV）

**高级 DUP 周期化**（18+ 个月）：
- 6 个模板，按日类型轮转（力量日/肌肥大日/耐力日）
- 全动作库，可选杠铃复合（如果 AS 改善）
- 疲劳阈值触发减载

### 阶段自动切换规则

```typescript
// 新手 → 中级
if (总训练次数 >= 72 || 连续 4 个动作停滞) {
  切换到中级块状
}

// 中级 → 高级
if (总训练次数 >= 240 || 块状周期进步 < 2%) {
  切换到高级 DUP
}
```

## Consequences

### 删除
- 现有 LLM 生成路由 `app/api/ai/workout-plan/route.ts`（135 行 prompt）
- LLM 动作名自由生成逻辑
- `WorkoutPlanSchema` 中的 LLM structured output

### 新增
- `lib/workout/engine/` 模块：
  - `catalog.ts`：824 动作库，加自定义 tag（`AS_CORE`, `MAIN`, `WARMUP`, `COOLDOWN`）
  - `phase-config.ts`：阶段配置（新手/中级/高级）
  - `novice-engine.ts`：新手线性引擎实现
  - `progression.ts`：渐进规则（加重/保持/换动作）
  - `deload.ts`：减载触发和参数计算
  - `selection.ts`：动作选择（筛选、排除、轮换）
  - `adaptive-engine.ts`：自动切换层
- `lib/workout/types.ts` 新增：
  - `TrainingPhase` enum
  - `PhaseConfig` interface
  - `DiscomfortFlag` 字段

### 保留
- `WorkoutSession` 结构不变（投影兼容）
- `fatigueSnapshot` 逻辑不变
- UI 和存储层不变

### 风险与缓解
- **风险**：用户 6 个月/18 个月时没时间加新配置 → **缓解**：新手配置设计时预留"延长模式"，可通过调参数（例如每 9 次减载改成每 15 次）继续使用
- **风险**：AS 病情变化，某些动作从"可以"变"不可以" → **缓解**：不适标记 + 黑名单机制，用户标记后立即生效

## Alternatives Considered

### 改良 LLM prompt
增强 prompt 的周期化指令、动作稳定性约束。
- **拒绝理由**：LLM 本质是概率输出，无法保证确定性渐进。即使 prompt 写得再严格，也会有"理解偏差"。

### 混合方案（LLM 辅助确定性引擎）
引擎生成训练，LLM 只负责动作说明（tips）。
- **拒绝理由**：动作库已有 description/instructions/commonMistakes，不需要 LLM 生成。LLM 在这个场景没有不可替代的价值。

### 单一引擎到底
只做新手引擎，不考虑中级/高级演进。
- **拒绝理由**：用户明确要求"长期进阶规划，因为半年后不一定有时间"。单一引擎会在 6 个月后失效。

## References

- [ACSM Resistance Training Guidelines 2026](https://www.acsm.org/resistance-training-guidelines-update-2026/)
- [NSCA Principle-Based Program Design](https://www.nsca.com/education/articles/ptq/principle-based-program-designa-practical-step-by-step-guide/)
- [Best AI Workout Generator 2026: System vs Randomness](https://www.aiworkoutgenerator.com/blog/best-ai-workout-generator-2026-system-vs-randomness)
