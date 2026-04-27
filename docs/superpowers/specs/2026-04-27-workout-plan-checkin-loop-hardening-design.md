# 智能训练计划与打卡闭环 · 二期加固设计

**Date**: 2026-04-27
**Status**: Draft, awaiting review
**Related spec**: [2026-04-23-workout-plan-checkin-loop-design.md](./2026-04-23-workout-plan-checkin-loop-design.md)
**Scope**: 在已实现的 `WorkoutSession` 训练计划闭环基础上，补齐完成训练幂等性、IndexedDB 导入导出覆盖、summary 一致性、AI 输出兜底、训练中输入体验和计划生命周期入口。

---

## 1. 背景

当前功能已经建立主链路：

1. AI 生成单次训练计划
2. 前端以 `WorkoutSession` 保存组级计划值和实际执行过程
3. 用户按组打卡、修改重量/次数、替换或跳过动作
4. 完成训练时派生 `ExerciseEntry[]` 写回 `DailyLog.exerciseEntries`
5. 下一次生成计划时读取最近 session、运动记录和肌肉疲劳快照

这条主链路方向正确，但在真实使用中还有几个质量风险：

- 完成训练发生局部失败后，重试可能重复写入运动记录
- 数据导入/导出只覆盖旧 store，训练 session 历史可能丢失
- 完成训练后只追加 `exerciseEntries`，不立即同步 `summary.totalCaloriesBurned`
- AI 补全 route 对 calories/MET/肌群结果的服务端兜底不够强
- 活动计划缺少放弃/重新生成入口
- 训练中数字输入和替换动作交互仍偏原型化

本 spec 是二期加固，不重新设计 MVP。

---

## 2. 目标

1. 完成训练写入具备可重试、不可重复追加的幂等语义。
2. 用户导出、导入、清空数据时，`workoutSessions` 与 `workoutSessionMeta` 与其他健康数据保持一致。
3. 完成训练后，`DailyLog.summary.totalCaloriesBurned` 与新增 `exerciseEntries` 同步更新。
4. AI 训练计划和替换动作补全的服务端 schema/normalize 更稳定，不让异常模型输出破坏疲劳闭环。
5. 用户可以明确放弃当前活动计划，或在计划不满意时重新生成。
6. 训练执行页的数字输入和动作替换交互达到可日常使用的质量。

---

## 3. 非目标

- 不引入云同步、多端合并或账号系统。
- 不引入周计划、模板库、周期化训练计划。
- 不重做 `ExerciseEntry` 数据模型。
- 不引入动作知识库、视频教学或动作别名完整数据库。
- 不把训练页主交互迁回 dashboard 或 `ExerciseEntryCard`。
- 不在本阶段解决全仓现有 TypeScript 问题；只保证本功能新增/修改文件无新增类型债。

---

## 4. 方案选择

### 4.1 备选方案

**方案 A：只修当前发现的 bug**

- 优点：改动少，能最快进入合并。
- 缺点：导入导出、summary、放弃计划等问题仍会在真实使用中暴露。

**方案 B：二期质量加固包**

- 优点：围绕同一闭环补齐数据一致性、恢复能力和主要交互缺口，范围仍可控。
- 缺点：涉及 settings、IndexedDB helper、workout 页面和测试，收尾验证更重。

**方案 C：重构为训练领域服务层**

- 优点：长期结构更干净。
- 缺点：当前功能还在收敛期，重构范围容易超过需求，增加合并风险。

### 4.2 选择

采用方案 B。它保留现有架构，只把高风险路径补齐为可长期使用的闭环。

---

## 5. 需求

### 5.1 P0：完成训练幂等写入

完成训练要满足以下规则：

1. 点击完成后，session 先进入 `finishing`，并持久化 `completedAt`。
2. 从 `WorkoutSession` 派生的 `ExerciseEntry.log_id` 必须稳定，不使用每次调用都会变化的随机 UUID。
3. `log_id` 固定使用以下格式：

```txt
workout:${sessionId}:${exerciseId}
```

4. 写入 `DailyLog.exerciseEntries` 前，必须移除同一 session 派生出的旧记录，再追加本次派生结果。
5. 若 `saveDailyLog` 成功但 `markSessionCompleted` 失败，用户重试时不能重复追加。
6. 若 enrich 成功后后续失败，重试时复用已持久化的 `enrichedAnalysis`，不重复调用 enrich route。
7. 完成后的 session 必须保留在 `workoutSessions`，`workoutSessionMeta.activeSessionId` 清空，`completedSessionIds` 去重后前插。

### 5.2 P0：summary 同步

完成训练写回 `DailyLog` 时，必须同步更新 `summary.totalCaloriesBurned`。

设计约束：

- 不复制 dashboard 页面内的闭包计算逻辑。
- 新增共享纯函数，例如 `recalculateDailySummary(log: DailyLog): DailySummaryType`。
- 该函数至少要正确计算：
  - `totalCaloriesConsumed`
  - `totalCaloriesBurned`
  - `macros`
  - `micronutrients`
- workout 完成时保存 `updatedLog` 前调用该函数。

### 5.3 P0：导入、导出、清空覆盖新 store

settings 数据管理必须覆盖 `HEALTH_DB_STORES` 中的所有 store：

- `healthLogs`
- `aiMemories`
- `workoutSessions`
- `workoutSessionMeta`

建议新增轻量 IndexedDB helper：

```ts
export async function exportStores(
  storeNames: string[],
): Promise<Record<string, Record<string, unknown>>>

export async function replaceStores(
  dataByStore: Record<string, Record<string, unknown>>,
): Promise<void>
```

导出格式建议：

```ts
interface ExportedHealthDataV2 {
  version: 2
  exportedAt: string
  userProfile: UserProfile
  aiConfig: AIConfig
  stores: {
    healthLogs: Record<string, DailyLog>
    aiMemories: Record<string, AIMemory>
    workoutSessions: Record<string, WorkoutSession>
    workoutSessionMeta: Record<string, unknown>
  }
}
```

导入兼容规则：

- 旧格式包含 `healthLogs` / `aiMemories` 时仍可导入。
- 新格式优先读取 `stores`。
- 导入新格式时，对包含的 store 执行 replace；未包含的 store 不强制清空，避免旧备份覆盖新训练历史。
- “清空所有数据”必须清空所有健康相关 store，并清理相关 localStorage 状态。

### 5.4 P1：计划生命周期入口

训练页需要提供放弃当前计划的入口。

规则：

- `draft` 或 `active` session 可以放弃。
- `finishing` session 不允许放弃，只允许重试完成，避免已写入一半的数据被人为断开。
- 放弃后：
  - session 状态更新为 `abandoned`
  - `workoutSessionMeta.activeSessionId` 清空
  - 不写入 `DailyLog.exerciseEntries`
- UI 必须使用确认弹窗，避免误触。
- 放弃后空状态页允许重新生成计划。

### 5.5 P1：AI 输出 normalize 与兜底

`workout-plan` 和 `workout-exercise-enrich` 都需要服务端 normalize。

规则：

- `estimatedMets` clamp 到 `1..8`。
- `estimatedDurationMinutes` 四舍五入且最小 1。
- `caloriesBurnedEstimated` 统一由服务端按 `round(mets * weightKg * durationMinutes / 60)` 重算。
- `isEstimated` 固定为 true。
- `muscleGroups` 过滤到 `MuscleKey` 集合后，如果 `exerciseType === "strength"` 且为空，使用 fallback 策略：
  - 若可根据动作名命中本地简表，则填入主要肌群
  - 否则保留空数组，但标记 fallback，并在测试中明确这是可接受降级
- enrich prompt 需要和 workout-plan prompt 一样声明用户输入不可信，不执行动作名中的指令。

### 5.6 P1：训练中输入体验

数字输入改为“可编辑草稿 + blur/Enter 提交”模式。

规则：

- 用户可以清空 input 后重新输入。
- `weight` 支持小数，step 建议 `1.25` 或 `0.5`。
- `reps` 只允许正整数。
- 非法输入不立即污染 session；blur 时若非法则恢复最近有效值。
- 已完成或跳过的组保持只读。

### 5.7 P1：替换动作交互

替换动作不再使用 `window.prompt`。

设计：

- 使用现有 shadcn Dialog。
- 展示当前计划动作名。
- 输入新的实际动作名。
- 明确说明替换后会在完成训练时重新补全分析字段。
- 提交空值或与当前展示名相同，不修改 session。

---

## 6. 数据流

### 6.1 完成训练写入流

```txt
active WorkoutSession
  -> complete all non-skipped sets
  -> click finish
  -> persist finishing session with completedAt
  -> enrich stale exercises if needed
  -> persist enriched finishing session
  -> derive stable ExerciseEntry[]
  -> remove previous entries from same session in target DailyLog
  -> append derived entries
  -> recalculate DailyLog.summary
  -> saveDailyLog
  -> markSessionCompleted
```

### 6.2 重试流

```txt
finishing WorkoutSession
  -> skip enrich
  -> reuse completedAt and enrichedAnalysis
  -> re-derive same stable ExerciseEntry[]
  -> replace same-source entries in DailyLog
  -> saveDailyLog
  -> markSessionCompleted
```

---

## 7. 文件边界

### 7.1 可能新增

| 文件 | 职责 |
|---|---|
| `lib/daily-summary.ts` | 共享 `DailyLog.summary` 重算纯函数 |
| `lib/indexed-db-utils.ts` | 多 store 导入/导出/replace helper |
| `components/workout/replace-exercise-dialog.tsx` | 替换动作弹窗 |
| `components/workout/abandon-workout-dialog.tsx` | 放弃计划确认弹窗 |

### 7.2 可能修改

| 文件 | 修改点 |
|---|---|
| `app/[locale]/workout/page.tsx` | 完成训练幂等写入、summary 重算、放弃计划 handler |
| `components/workout/workout-plan-workbench.tsx` | footer 增加放弃/重新生成入口 |
| `components/workout/workout-exercise-card.tsx` | 数字输入体验、替换动作 Dialog |
| `hooks/use-workout-sessions.ts` | 新增 `abandonActiveSession` 或类似 API |
| `lib/workout/session.ts` | 稳定 `ExerciseEntry.log_id`、派生记录来源判断 |
| `lib/ai/schemas/workout-exercise-enrich.ts` | normalize 上限、fallback 行为 |
| `app/api/ai/workout-exercise-enrich/route.ts` | calories 服务端重算、prompt injection 防护 |
| `app/[locale]/settings/page.tsx` | 新导入/导出格式与所有 store 覆盖 |
| `tests/workout-session.test.ts` | 幂等派生、放弃 session、重试路径 |
| `tests/workout-ai-schemas.test.ts` | normalize、schema fallback |

---

## 8. 错误处理

### 8.1 完成训练失败

- enrich 失败：该动作使用 fallback analysis，完成流程继续。
- `saveDailyLog` 失败：session 保持 `finishing`，页面展示可重试。
- `markSessionCompleted` 失败：session 仍可通过 `finishing` 重试，重试不会重复写 entry。

### 8.2 导入失败

- JSON 解析失败：不修改任何本地数据。
- store replace 必须使用一个覆盖目标 store 列表的 IndexedDB `readwrite` transaction：先 `clear`，再 `put` 新数据；任一 request 失败时 transaction abort，UI 提示导入失败。
- 旧格式缺少 workout store：只恢复旧数据，不清空现有 workout store。

### 8.3 AI 输出异常

- schema parse 失败：route 返回既有 AI error 结构。
- 字段越界：normalize 到安全范围。
- 肌群全被过滤：允许降级，但不能抛出未处理错误。

---

## 9. 测试策略

### 9.1 Unit / pure function

- `workoutSessionToExerciseEntries` 对同一 session/exercise 生成稳定 `log_id`。
- 重试完成时替换同源 entries，不重复追加。
- `abandon` 后 session 状态为 `abandoned`，不产生 `ExerciseEntry`。
- `recalculateDailySummary` 正确计算运动热量、食物热量和 macros。
- 数字输入提交逻辑的纯函数部分覆盖非法值和恢复行为。

### 9.2 Schema / route-level

- enrich schema clamp `estimatedMets` 到 8。
- plan/enrich calories 都由服务端按体重重算。
- 无效 muscleGroups 被过滤。
- strength 肌群为空时走明确 fallback 行为。

### 9.3 Integration / smoke

- 生成计划 -> 完成训练 -> dashboard/summary 能看到运动热量变化。
- saveDailyLog 成功、markSessionCompleted 失败的模拟重试不会重复写 entry。
- 导出包含 `workoutSessions` 和 `workoutSessionMeta`。
- 旧格式导入不删除现有 workout 数据。
- 放弃 draft/active session 后可重新生成计划。

---

## 10. 验收标准

1. 完成训练任意重试次数后，同一 session 在目标 `DailyLog.exerciseEntries` 中最多保留一组派生记录。
2. 完成训练后，目标日期 `summary.totalCaloriesBurned` 立即反映新增训练记录。
3. 新导出的 JSON 包含 `workoutSessions` 和 `workoutSessionMeta`。
4. 旧导出格式仍能导入，且不会误删现有 workout session。
5. 用户可以放弃未完成计划，并重新生成。
6. 替换动作使用 Dialog，数字输入支持清空重输。
7. `pnpm test` 覆盖新增纯函数和 schema 行为。
8. `pnpm build` 通过。

---

## 11. 交付顺序建议

1. 先做纯函数和测试：稳定 entry id、同源替换、summary 重算。
2. 再改 `finishWorkout`，让完成训练具备可重试幂等性。
3. 然后补 IndexedDB 多 store 导入/导出/清空。
4. 再做 AI normalize 与 route 加固。
5. 最后做 UI polish：放弃计划、替换 Dialog、数字输入体验。

这个顺序优先降低数据一致性风险，再改善用户体验。

---

## 12. 风险与权衡

- 稳定 `log_id` 会改变 workout 派生记录的 id 语义，但只影响新生成记录；旧随机 id 记录不需要迁移。
- 旧格式导入不清空 workout store，可能保留用户当前训练历史。这是有意选择，避免旧备份误删新数据。
- `summary` 重算抽为共享函数可能暴露 dashboard 现有计算逻辑差异；本阶段应以保持现有字段语义为准，不扩大到营养分析重构。
- Dialog 和输入体验会增加组件状态，但比 `window.prompt` 和不可清空 input 更适合长期使用。

---

## 13. 设计结论

二期加固不改变原架构：`WorkoutSession` 仍是训练执行主记录，`ExerciseEntry` 仍是兼容既有统计和疲劳链路的派生记录。

本次优化的核心是把闭环从“能跑通”提升到“可恢复、可备份、可重复使用”：

- 完成训练可以安全重试
- 训练历史可以随用户数据一起导入导出
- summary 和 fatigue 链路保持同步
- AI 输出被服务端约束在可消费范围内
- 用户对活动计划有明确退出路径
