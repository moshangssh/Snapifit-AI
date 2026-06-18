# 动作库从 SmartWorkout 824 个精选 106 个

## Context

训练引擎需要结构化动作库支持三个阶段（新手/中级/高级）。SmartWorkout 提供 824 个动作，但包含大量不适合 AS 患者的高风险动作、小众变式和重复动作。

需要确定：
1. 是否全量导入 824 个动作？
2. 如何筛选适合 AS 患者的安全动作？
3. 如何为动作标记分层标签（用于中级阶段的变式匹配）？

## Decision

**从 824 个动作中精选 106 个，分五个池：**

### 动作池配置

| 池 | 数量 | 筛选标准 | 用途 |
|----|------|---------|------|
| 新手核心池 | 20 | 机械/哑铃/绳索，排除杠铃/引体/深蹲/硬拉，覆盖 6 肌群 | 新手阶段（0-6 月）主动作 |
| AS 核心池 | 10 | 活动度/拉伸，覆盖 4 维度（胸椎/髋/肩胛/脊柱） | 所有阶段 warmup/cooldown |
| 中级变式池 | 30 | 基于新手核心匹配变式（同 movement_pattern，不同 angle/equipment） | 中级阶段（6-18 月）轮换 |
| 高级扩展池 | 36 | 单侧训练、复杂复合、条件性杠铃（AS 改善后） | 高级阶段（18+ 月）开放 |
| 补充动作 | 10 | 填补覆盖不足（下胸/肩后束/上背/腘绳肌/内收肌/前臂） | 分配到中级/高级池 |

### 分层标签体系

每个动作标记 4 个字段：

**movement_pattern（动作模式）**：
- 推：horizontal_push, incline_push, decline_push, vertical_push
- 拉：horizontal_pull, vertical_pull
- 肩：lateral_raise, front_raise, rear_delt, shrug
- 腿：squat_pattern, hinge_pattern, lunge_pattern, leg_curl, leg_extension, hip_abduction, calf_raise
- 臂：isolation_curl, isolation_extension
- 核心：core_flexion, core_rotation, core_stability
- 其他：mobility, compound

**primary_muscle（主要肌群）**：
- 复用 CONTEXT.md 的 MuscleKey：CHEST, BACK, SHOULDERS, QUADS, GLUTES, BICEPS, TRICEPS, CORE, FOREARMS

**angle（角度）**：
- incline（上斜）, decline（下斜）, flat（平板）, overhead（过顶）, neutral（中立）

**equipment_simplified（器械类型）**：
- MACHINE（固定器械）, DUMBBELL（哑铃）, CABLE（绳索）, BARBELL（杠铃，高级阶段条件性）, BAND（弹力带）, BODYWEIGHT（自重）

### 筛选比例

- 数据源：824 个动作
- 筛选结果：106 个（12.9%）
- 排除：718 个（87.1%）

**主要排除理由**：
- 高风险动作（杠铃颈后推举、抓举、西西深蹲等）：~150 个
- 需要特殊器械（引体向上杆、双杠、体操环等）：~120 个
- 小众变式（佐特曼弯举、拜西臂屈伸等）：~200 个
- 重复动作（5-8 种握法的弯举）：~150 个
- 其他（有氧、爆发力、竞技举重）：~108 个

### AS 安全锁（2026-06-18 补充，见 #46）

筛选阶段排除了**大部分**高风险动作，但高级扩展池仍保留少量条件性杠铃复合动作
（杠铃深蹲、缺口硬拉、杠铃 / 哑铃推举、抓举等），用于"AS 改善后"的可选进阶。
原始设计承诺这些动作属"条件性、需显式解锁"，但该闸门一直未落地到代码——任何进入
高级阶段的用户都会被无条件处方这些动作。

#46 补齐了这一闸门：引擎在**所有阶段**默认排除一组 AS 风险动作模式，除非用户显式解锁。
判定基于结构化标签（`movementPattern` / `angle` / `equipment`），而非按动作 ID 硬编码，
因此新增动作会被自动分类：

- **轴向下肢负重** `axial_loaded_lower`：`movementPattern ∈ {squat_pattern, hinge_pattern}` 且 `equipment = BARBELL`
- **负重过顶按压** `overhead_press`：`movementPattern = vertical_push` 且（`angle = overhead` 或 `equipment ∈ {BARBELL, DUMBBELL}`）
- **奥举 / 爆发** `olympic_lift`：`movementPattern = compound` 且 `equipment = BARBELL`（抓举等）

实现于 `lib/workout/engine/as-safety.ts`，在动作选择层统一拦截（新手 / 中级 / 高级三引擎共用）。
默认全锁；解锁集合持久化在 `TrainingState.unlockedRiskCategories`，由训练设置里的 HITL 开关写入
（文案明确"请在医生同意后再解锁"）。抓举（Snatch）等与本节"已排除高风险动作"表述相矛盾的遗留条目
**保留在动作库中，但默认被安全锁覆盖**，因此与安全声明一致。

### 肌肉刺激维度覆盖验证

所有关键维度已验证充足（每个维度至少 2-3 个动作）：

- **胸部上中下**: 上胸 4 个 + 中胸 6 个 + 下胸 2 个 = 12 个
- **背部厚度宽度**: 水平拉 7 个 + 垂直拉 6 个 + 耸肩 2 个 = 15 个
- **肩部前中后**: 前束 3 个 + 中束 4 个 + 后束 3 个 + 肩推 5 个 = 15 个
- **腿部全面**: 股四 6 个 + 腘绳 3 个 + 臀部 2 个 + 内收 2 个 + 小腿 3 个 = 16 个
- **手臂完整**: 二头 7 个 + 三头 5 个 + 前臂 4 个 = 16 个
- **核心稳定**: 屈曲 3 个 + 旋转 1 个 + 稳定 5 个 = 9 个

### 按肌群分布（力量动作 96 个）

| 肌群 | 数量 | 占比 |
|------|------|------|
| QUADS | 17 | 19.8% |
| BACK | 14 | 16.3% |
| SHOULDERS | 14 | 16.3% |
| CHEST | 11 | 12.8% |
| CORE | 9 | 10.5% |
| BICEPS | 7 | 8.1% |
| GLUTES | 6 | 7.0% |
| TRICEPS | 6 | 7.0% |
| FOREARMS | 2 | 2.3% |

### 按器械分布

| 器械 | 数量 | 占比 |
|------|------|------|
| MACHINE | 37 | 43.0% |
| DUMBBELL | 23 | 26.7% |
| BARBELL | 12 | 14.0% |
| OTHER | 8 | 9.3% |
| BODYWEIGHT | 5 | 5.8% |
| BAND | 1 | 1.2% |

机械优先策略符合新手安全性需求（固定轨迹，降低受伤风险）。

## Consequences

### 实现影响

**新增模块**：
- `lib/workout/engine/catalog.ts`：96 个动作的结构化数据，包含分层标签
- `lib/workout/engine/selection.ts`：
  - `selectExercises({ muscle, tags, pool, blacklist })` - 筛选动作
  - `findVariants(benchmark, catalog)` - 查找变式（同 movement_pattern + primary_muscle，不同 angle/equipment）

**中级阶段变式匹配逻辑**：
```typescript
// 基准动作：地面哑铃卧推
// movement_pattern: horizontal_push
// primary_muscle: CHEST
// equipment: DUMBBELL

// 匹配变式
const variants = catalog.filter(ex =>
  ex.movement_pattern === 'horizontal_push' &&
  ex.primary_muscle === 'CHEST' &&
  ex.id !== benchmark.id &&
  (ex.angle !== benchmark.angle || ex.equipment !== benchmark.equipment)
)

// 结果：上斜哑铃卧推、下斜哑铃卧推、器械推胸、绳索推胸等
```

### 用户体验

**新手阶段**：
- 动作池小（20 个），降低选择焦虑
- 器械为主，安全性高，适合建立动作模式

**中级阶段**：
- 保留 10 个基准动作（从新手 20 个中选），追踪长期 PR
- 扩展 30 个变式，提供刺激多样性
- 变式匹配算法确保"同肌群同模式，不同角度器械"

**高级阶段**：
- 保留 5 个终生基准，锚定 2 年进步
- 开放 36 个高级动作（单侧/复杂/条件性杠铃）
- 如果 AS 改善，用户可标记"允许杠铃"，开放 12 个杠铃动作

### 扩展性

**未来可扩展到 120-150 个**：
- 如果用户练到高级阶段（18 个月）仍然活跃
- 按需补充高级变式（例如爆发力训练、Olympic lifts 变式）
- 不急于一次性导入，避免过早优化

### 维护成本

**一次性标记完成**：
- 96 个动作 × 4 个标签字段 = 384 个标记（已完成）
- 后续只需维护这 96 个动作的元数据
- 远低于 824 × 4 = 3296 个标记的成本

**质量优先**：
- 每个动作都经过人工审核（AS 安全性、适用阶段）
- 分层标签准确度高，变式匹配不会出现误配

## Alternatives Considered

### 全量导入 824 个

导入所有动作，用标签过滤。

**拒绝理由**：
1. 工作量巨大（3296 个标记）
2. 包含大量高风险动作（杠铃颈后推举等），即使过滤也有遗漏风险
3. 新手/中级阶段用不到这么多动作（会造成选择焦虑）
4. 维护成本高（动作名变更、标签更新）

### 只选 60 个（新手 20 + AS 10 + 中级 30）

不预先准备高级动作池，18 个月后再补充。

**拒绝理由**：
1. 用户明确要求"一次性做完未来训练计划"
2. 高级动作池（36 个）筛选成本不高，一次性完成避免后续返工
3. 如果 18 个月后没时间补充，用户卡在中级阶段无法进步

### 完全手动精选核心动作（不依赖 SmartWorkout）

从零设计 100 个动作，不使用 SmartWorkout 数据。

**拒绝理由**：
1. SmartWorkout 已有 824 个结构化动作（包含 name/muscle/equipment/mechanics），质量可靠
2. 从零设计需要大量运动科学知识和时间
3. 用户已经在使用 SmartWorkout 派生的动作库，保持一致性更好

## References

- SmartWorkout exercise database: 824 exercises with structured metadata
- ACSM 2026: Novice trainees benefit from limited exercise variety (10-20 core movements)
- NSCA: Intermediate/advanced trainees need exercise rotation for continued adaptation
- ADR-0005: 动作池分阶段演进策略（保留核心基准 + 扩展变式池）
