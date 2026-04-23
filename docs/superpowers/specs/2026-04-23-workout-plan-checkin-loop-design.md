# 智能训练计划与打卡闭环 · 设计文档

**Date**: 2026-04-23
**Status**: Draft, awaiting review
**Scope**: 为 SnapFit AI 新增独立训练页与训练 session 闭环。AI 基于本地历史生成单次训练计划,前端支持按组打卡、改单组数值、替换动作、跳过动作,训练完成后回写 `DailyLog.exerciseEntries`,并把结果反馈给后续计划生成。

---

## 1. 目标

本次要解决的问题不是“记录一次力量训练”,而是建立一条完整闭环:

1. AI 读取用户本地历史,生成一份结构化单次训练计划
2. 用户在独立训练页按组执行,可自由修改重量/次数,也可替换或跳过动作
3. 训练完成后,系统把结果同步到现有 `DailyLog.exerciseEntries`
4. 下一次生成计划时,AI 继续读取本地训练历史、近期疲劳快照和最近可用体重,生成更个性化结果

核心价值:

- 计划不再只是文案,而是可以直接执行的组级工作台
- 打卡过程不被强约束打断,保留用户临场调整自由
- 结果不会成为新数据孤岛,仍然服务现有卡路里统计、肌肉疲劳和首页摘要

不在本次范围:

- 周计划 / 周期计划 / 模板库
- 组间休息提示、倒计时或恢复提醒
- 云端同步与多端共享
- 多份活动计划并存
- 动作视频、动作教学知识库
- 后台补算队列或异步任务编排

---

## 2. 关键决策

| # | 维度 | 决定 |
|---|---|---|
| 1 | 计划粒度 | 只做**单次训练计划** |
| 2 | 主记录 | 新增独立 `WorkoutSession`,不把组级细节塞进 `DailyLog.exerciseEntries` |
| 3 | 页面承载 | 新增独立训练页,不把高密度打卡交互嵌进首页 dashboard |
| 4 | 生成时机 | 用户手动点击生成 |
| 5 | 历史来源 | 只读本地历史(`IndexedDB` + `localStorage`) |
| 6 | 动作主题 | AI 完全自动决定练什么,不要求用户先选部位 |
| 7 | 活动计划数量 | 任意时刻只允许存在一份活动中的 session |
| 8 | 首次使用语义 | 用户首次生成时得到的是**本次训练计划** |
| 9 | 完成后语义 | 首次训练完成后,下一次才能生成**下次训练计划** |
| 10 | 动作替换 | 支持自由输入任意动作名 |
| 11 | 组级交互 | 默认展示 AI 计划值,但每组实际值在完成前可自由修改 |
| 12 | 完成条件 | 所有**未跳过**组都已打卡才允许完成 |
| 13 | 疲劳输入 | 生成计划时读取现有肌肉疲劳快照,作为软约束 |
| 14 | 体重来源 | 优先使用最近可用 `DailyLog.weight`,没有时回退到 `userProfile.weight` |
| 15 | 卡路里 / 肌群 | 计划生成时一并返回分析值;动作未改则复用,动作改了才局部重算 |
| 16 | AI 二次调用 | 不复用现有自然语言 parse route,新增结构化补全 route |
| 17 | 兼容输出 | `WorkoutSession` 是主数据,`ExerciseEntry` 是完成后的兼容摘要输出 |

---

## 3. 用户流程

### 3.1 首次使用

1. 用户进入训练页
2. 当前不存在任何活动 session
3. 页面标题显示 `本次训练计划`
4. 用户点击“生成本次训练计划”
5. AI 基于本地历史生成一份 `WorkoutSession`
6. 用户按组执行、编辑、替换或跳过
7. 当所有未跳过组都完成后,用户点击“完成训练”
8. 系统回写 `DailyLog.exerciseEntries`
9. 当前 session 进入 `completed`
10. 页面允许生成新的 `下次训练计划`

### 3.2 后续使用

1. 用户完成过至少一次训练后,当前无活动 session
2. 页面标题显示 `下次训练计划`
3. 用户点击“生成下次训练计划”
4. AI 生成一份待执行 session
5. 在用户真正开始训练前,标题保持 `下次训练计划`
6. 当用户第一次勾选任意未跳过组完成时,该 session 的 `sessionRole` 切为 `current`,并成为新的 `本次训练计划`
7. 完成后重复闭环

### 3.3 中断恢复

- 训练过程中刷新页面、切页或重开应用时,训练页应从本地恢复当前活动 session
- 未完成前不能生成新的计划
- 未开始的 `下次训练计划` 也应可被恢复继续查看

---

## 4. 状态机

本设计不把“本次 / 下次”硬编码进单一状态枚举,而是拆成两层:

- `sessionRole`: `current | next`
- `status`: `draft | active | finishing | completed | abandoned`

其中:

- `sessionRole` 决定当前计划的业务语义(`current` 或 `next`)
- `status` 决定生命周期
- 当一份 `next` 计划真正开始执行时,其 `sessionRole` 会直接切为 `current`

### 4.1 关键规则

1. `current + draft`
   首次生成但还未真正开始执行的本次训练计划。标题仍显示 `本次训练计划`
2. `current + active`
   正在执行中的本次训练计划
3. `completed`
   已完成,不再是活动 session
4. `next + draft`
   首次训练完成后新生成的待执行计划。标题显示 `下次训练计划`

### 4.2 状态迁移

```
none
  └─生成首次计划──► sessionRole=current, status=draft
                          └─首次完成任意未跳过组──► current/active
                                                       └─完成训练──► completed
                                                                          └─生成新计划──► next/draft
                                                                                              └─首次完成任意未跳过组──► current/active(标题切到“本次训练计划”)
                                                                                                                            └─完成训练──► completed
```

### 4.3 受约束操作

- 只有在**不存在活动 session**时,才允许生成新计划
- 只有在所有未跳过组都已完成时,才允许进入 `finishing`
- `finishing` 只表示“正在做写回与补全”,不是可交互训练态
- 第一版不提供对外暴露的 `abandoned` 操作入口,但模型预留该状态,便于未来支持“废弃计划”

---

## 5. 数据模型

### 5.1 主对象 `WorkoutSession`

```ts
type WorkoutSessionRole = "current" | "next"
type WorkoutSessionStatus = "draft" | "active" | "finishing" | "completed" | "abandoned"

interface WorkoutSession {
  sessionId: string
  sessionRole: WorkoutSessionRole
  status: WorkoutSessionStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  effectiveUserWeightKg: number
  planContext: WorkoutPlanContextSnapshot
  exercises: WorkoutSessionExercise[]
  derived: WorkoutSessionDerived
}
```

`effectiveUserWeightKg` 在**生成计划时**确定:

- 优先取最近可用 `DailyLog.weight`
- 没有时回退到 `userProfile.weight`

该值在 session 生命周期内保持不变,用于计划阶段分析值和完成后的兼容输出,避免同一份计划在执行中途因 profile 变化导致分析漂移。

### 5.2 计划上下文快照 `WorkoutPlanContextSnapshot`

```ts
interface WorkoutPlanContextSnapshot {
  generatedAt: string
  userGoal: string
  recentWorkoutSessionSummaries: RecentWorkoutSessionSummary[]
  recentExerciseEntries: ExerciseEntrySummary[]
  fatigueSnapshot: Record<string, {
    intensity: 0 | 30 | 60 | 100
    daysAgo: 0 | 1 | 2 | null
    lastExerciseName: string | null
  }>
}
```

这里保存“生成当下 AI 看到了什么”,便于后续排查计划质量,也便于未来做回放或 debug。

### 5.3 动作级对象 `WorkoutSessionExercise`

```ts
interface WorkoutSessionExercise {
  exerciseId: string
  plannedExerciseName: string
  actualExerciseName?: string
  notes?: string
  sets: WorkoutSessionSet[]
  isExerciseSkipped: boolean
  analysisStatus: "planned" | "stale" | "enriched" | "fallback"
  plannedAnalysis: WorkoutExerciseAnalysis
  enrichedAnalysis?: WorkoutExerciseAnalysis
}
```

说明:

- `plannedExerciseName` 是计划阶段 AI 原始动作名
- `actualExerciseName` 只有用户替换动作后才有值
- `isExerciseSkipped=true` 表示整项动作被跳过,其下所有组不再阻塞完成
- `analysisStatus=stale` 表示该动作原本的计划分析值已失效,完成训练时必须局部重算或降级

### 5.4 组级对象 `WorkoutSessionSet`

```ts
interface WorkoutSessionSet {
  setIndex: number
  plannedWeightKg?: number
  plannedReps?: number
  actualWeightKg?: number
  actualReps?: number
  touched: {
    weight: boolean
    reps: boolean
  }
  isCompleted: boolean
  completedAt?: string
  isSkipped: boolean
}
```

关键规则:

- 初始渲染时 `actualWeightKg/actualReps` 默认等于计划值
- 用户修改某一组后,对应字段的 `touched` 置为 `true`
- 同动作下,当用户修改第 N 组重量时,系统自动同步更新后续**未完成且 `touched.weight=false`** 的组
- 次数同步逻辑与重量一致
- 已完成组永不被后续同步覆盖

### 5.5 分析对象 `WorkoutExerciseAnalysis`

```ts
interface WorkoutExerciseAnalysis {
  exerciseType: "strength" | "cardio" | "flexibility" | "other"
  muscleGroups: string[]
  estimatedMets: number
  estimatedDurationMinutes: number
  caloriesBurnedEstimated: number
  isEstimated: boolean
}
```

这里存放与现有 `ExerciseEntry` 对齐的兼容分析字段,但**不代表用户事实**,而是“用于回写记录的分析值”。

---

## 6. 存储方案

### 6.1 新增 IndexedDB store

建议新增两个 store:

| Store | Key | 用途 |
|---|---|---|
| `workoutSessions` | `sessionId` | 保存完整 session 历史 |
| `workoutSessionMeta` | `"singleton"` | 保存 `activeSessionId`、最近完成记录索引等轻量元数据 |

原因:

- `healthLogs` 是按日期组织,不适合承载可跨天存在的“活动计划”
- `WorkoutSession` 需要独立生命周期和独立恢复能力
- 元数据单独存放,可避免每次进入训练页都扫描全部 session

### 6.2 与现有 `healthLogs` 的关系

- 训练过程中不写 `DailyLog.exerciseEntries`
- 只有在“完成训练”成功后,才将兼容摘要写入对应执行日的 `DailyLog.exerciseEntries`
- `WorkoutSession` 永远保留完整历史,`ExerciseEntry` 只是为了兼容既有统计与疲劳逻辑

---

## 7. 页面结构与交互

### 7.1 路由

新增独立页面:

- `app/[locale]/workout/page.tsx`

首页 dashboard 仅保留轻量入口,不直接承载高密度组级交互。

### 7.2 页面分区

训练页建议采用单列结构:

1. `顶部状态区`
   标题、副标题、当前状态、主按钮
2. `计划概览区`
   动作数、总组数、已完成组数、是否有替换动作
3. `动作执行区`
   每个动作一张卡,卡内展示所有组
4. `底部收尾区`
   完成按钮、完成条件提示、补全 / 写回中的 loading 态

### 7.3 标题规则

- 从未完成过任何训练计划时,标题显示 `本次训练计划`
- 完成过至少一次训练,当前无活动 session 时,标题显示 `下次训练计划`
- `next + draft` 状态下,即使用户浏览或编辑某些组的实际值,标题仍保持 `下次训练计划`
- 当用户第一次勾选任意未跳过组完成时,若该 session 为 `next`,则其 `sessionRole` 切为 `current`,标题同步切为 `本次训练计划`

### 7.4 动作卡内容

每张动作卡展示:

- 动作名称
- 替换状态标识(若 `actualExerciseName` 存在)
- 计划分析摘要(例如目标肌群)
- 组列表
- 动作级操作: `替换动作`、`跳过动作`

### 7.5 组列表交互

每组一行,至少包含:

- 组序号
- 计划重量 / 次数
- 实际重量输入
- 实际次数输入
- 完成勾选

交互原则:

- 默认展示 AI 计划值
- 用户可以在勾选前自由修改实际值
- 完成勾选后该组锁定,不再接受批量同步覆盖
- 第一版不提供组间休息提示

### 7.6 动作替换

用户点击“替换动作”后:

- 允许自由输入任意动作名
- `actualExerciseName` 更新为新值
- 原 `plannedAnalysis` 立即标记为 `stale`
- UI 仅提示“该动作分析将在完成训练后重新计算”
- 不在训练中途同步写入 `DailyLog`

### 7.7 动作跳过

用户点击“跳过动作”后:

- `isExerciseSkipped=true`
- 该动作下所有组 `isSkipped=true`
- 该动作不再计入完成条件
- 第一版不提供部分动作跳过后的恢复提示流,但允许手动取消跳过

---

## 8. AI 生成与局部补全

### 8.1 训练计划生成 route

新增专用 route:

- `POST /api/ai/workout-plan`

职责:

- 接收结构化历史上下文
- 生成单次训练计划
- 为每个动作一并返回待确认分析字段

输入至少包含:

```ts
{
  effectiveUserWeightKg: number
  userProfile: UserProfile
  recentWorkoutSessionSummaries: RecentWorkoutSessionSummary[]
  recentExerciseEntries: ExerciseEntrySummary[]
  fatigueSnapshot: MuscleFatigueMap
}
```

输出建议结构:

```ts
{
  sessionRole: "current" | "next"
  exercises: Array<{
    plannedExerciseName: string
    notes?: string
    sets: Array<{
      plannedWeightKg?: number
      plannedReps?: number
    }>
    plannedAnalysis: {
      exerciseType: "strength" | "cardio" | "flexibility" | "other"
      muscleGroups: string[]
      estimatedMets: number
      estimatedDurationMinutes: number
      caloriesBurnedEstimated: number
      isEstimated: true
    }
  }>
}
```

### 8.2 为什么计划阶段就返回分析值

计划阶段同时返回 `muscleGroups / estimatedMets / caloriesBurnedEstimated / estimatedDurationMinutes`,原因是:

- 没改动作时,完成训练可以直接复用这些值,完成速度快
- 避免每次完成训练都全量重新调用 AI
- 保住现有应用依赖的卡路里统计与肌群疲劳闭环

这些值在 session 中先作为“待确认分析数据”保存,训练未完成前不写入 `DailyLog`。

### 8.3 修改动作后的局部补全 route

新增专用 route:

- `POST /api/ai/workout-exercise-enrich`

职责:

- 只为**已修改动作**补全兼容分析字段
- 不负责生成计划
- 不负责重写用户真实训练数据

输入建议结构:

```ts
{
  exerciseName: string
  completedSets: number
  avgWeightKg?: number
  avgReps?: number
  effectiveUserWeightKg: number
  userGoal?: string
}
```

输出:

```ts
{
  exerciseType: "strength" | "cardio" | "flexibility" | "other"
  muscleGroups: string[]
  estimatedMets: number
  estimatedDurationMinutes: number
  caloriesBurnedEstimated: number
  isEstimated: true
}
```

### 8.4 不复用现有 parse route

不建议直接复用 [app/api/ai/parse/route.ts](../../app/api/ai/parse/route.ts) 的原因:

- 现有 route 面向“自然语言转记录”
- 当前需求面向“结构化动作上下文补全”
- 若复用,会把 prompt 和 schema 语义搅混,也会降低补全稳定性

因此本设计明确采用**专用结构化补全 route**。

---

## 9. 完成训练后的回写策略

### 9.1 完成时机

用户点击“完成训练”前必须满足:

- 所有未跳过组 `isCompleted=true`
- 当前 session 仍为活动态

点击后 session 进入 `finishing`。

### 9.2 回写流程

1. 读取当前 `WorkoutSession`
2. 遍历每个动作
3. 若动作未替换:
   - 直接复用 `plannedAnalysis`
4. 若动作已替换:
   - 调用 `workout-exercise-enrich`
   - 成功则写入 `enrichedAnalysis`
   - 失败则走本地 fallback
5. 将每个动作转换成兼容的 `ExerciseEntry`
6. 将结果写入实际执行日期对应的 `DailyLog.exerciseEntries`
7. session 标记 `completed`

### 9.3 `WorkoutSession -> ExerciseEntry` 映射

现有 [lib/types.ts](../../lib/types.ts) 中的 `ExerciseEntry` 只能表达**动作级摘要**,不能表达真实组级差异。因此映射规则应明确为兼容输出:

| `ExerciseEntry` 字段 | 来源 |
|---|---|
| `exercise_name` | `actualExerciseName ?? plannedExerciseName` |
| `exercise_type` | `enrichedAnalysis.exerciseType ?? plannedAnalysis.exerciseType` |
| `duration_minutes` | `enriched/planned estimatedDurationMinutes` |
| `sets` | 已完成且未跳过的组数 |
| `reps` | 已完成组 `actualReps` 的四舍五入平均值 |
| `weight_kg` | 已完成组 `actualWeightKg` 的四舍五入平均值 |
| `estimated_mets` | `enriched/planned estimatedMets` |
| `user_weight` | `effectiveUserWeightKg` |
| `calories_burned_estimated` | `enriched/planned caloriesBurnedEstimated` |
| `muscle_groups` | `enriched/planned muscleGroups` |
| `is_estimated` | `true` |

说明:

- 组级真实细节只保留在 `WorkoutSession`
- `ExerciseEntry` 只承担现有 dashboard、总结和疲劳模块的兼容消费
- 若动作名未改,即使用户调整了组内重量/次数,也按设计直接复用计划阶段分析值

### 9.4 执行日期

回写 `DailyLog.exerciseEntries` 时使用**实际开始执行日期**:

- 优先取 `startedAt` 对应本地日期
- 若用户在未产生 `startedAt` 的异常路径下直接完成,回退到完成日

这保证“前一天生成的下次计划”会落到真正训练那天,而不是生成那天。

---

## 10. 疲劳与体重输入规则

### 10.1 疲劳快照

生成计划前,前端复用现有 [lib/muscle-fatigue.ts](../../lib/muscle-fatigue.ts) 的纯函数计算最近 3 天 `fatigueSnapshot`,再把结果作为结构化输入发给 `workout-plan` route。

疲劳是**软约束**:

- 高疲劳肌群应尽量避免高量训练
- 若必须安排相关动作,应倾向更低组数 / 更低强度
- 不作为绝对禁止条件

### 10.2 体重来源

本设计明确采用:

- 优先使用最近可用 `DailyLog.weight`
- 没有时回退到 `userProfile.weight`

理由:

- 当前仓库里每日体重与 `userProfile.weight` 是两套独立数据
- 每日体重更接近用户当天真实状态
- 这与现有代谢计算逻辑保持一致

---

## 11. 异常处理与降级

### 11.1 计划生成失败

- 不创建 session
- 页面保留空状态
- 用户可手动重试

### 11.2 训练中断

- 活动 session 存在本地 store
- 刷新或重进后可恢复当前状态

### 11.3 补全失败

若 `workout-exercise-enrich` 对某个已改动作失败:

- 当前训练仍允许完成
- 该动作走 fallback 分析值
- `analysisStatus` 标记为 `fallback`

fallback 规则:

```ts
{
  exerciseType: "strength",
  muscleGroups: [],
  estimatedMets: 6,
  estimatedDurationMinutes: 10,
  caloriesBurnedEstimated: 50,
  isEstimated: true
}
```

这些值只是保底,避免首页统计和疲劳链路完全断掉。未来可再引入更细的本地估算。

### 11.4 回写失败

若 `DailyLog.exerciseEntries` 提交失败:

- session 保持 `finishing`
- 不提前宣布完成
- 页面展示可重试态

这样可以避免“session 已完成,但 dashboard 看不到训练结果”的不一致。

---

## 12. 验证策略

本功能属于明确行为变更,建议至少覆盖到 `Level 1` 回归,核心纯函数接近 `Level 2`。

### 12.1 纯函数验证

- session 状态转换
- 同动作后续未完成组的重量 / 次数同步逻辑
- 完成条件判断
- `WorkoutSession -> ExerciseEntry[]` 映射

### 12.2 Schema / route 验证

- `workout-plan` 输出 schema
- `workout-exercise-enrich` 输出 schema
- 局部补全失败时的错误结构

### 12.3 页面交互验证

- 首次生成本次训练计划
- 完成首次训练后生成下次训练计划
- 修改第 N 组重量后,后续未完成且未触碰组自动更新
- 替换动作后原分析值进入 `stale`
- 所有未跳过组完成后才可点击“完成训练”

### 12.4 闭环验证

- 完成训练后 `DailyLog.exerciseEntries` 正确新增
- 现有卡路里汇总仍能读到新记录
- 现有肌肉疲劳计算仍能消费新记录
- 下一次生成计划时能读到最新 session 摘要和疲劳快照

---

## 13. 文件边界

### 13.1 新增

- `app/[locale]/workout/page.tsx`
- `app/api/ai/workout-plan/route.ts`
- `app/api/ai/workout-exercise-enrich/route.ts`
- `lib/ai/schemas/workout-plan.ts`
- `lib/ai/schemas/workout-exercise-enrich.ts`
- `lib/workout-session.ts`
- `hooks/use-workout-sessions.ts`

### 13.2 修改

- `lib/types.ts`
  新增 `WorkoutSession` 相关类型
- `hooks/use-indexed-db.ts`
  确保新 store 可初始化
- `app/[locale]/page.tsx`
  仅新增训练页入口或轻量状态提示
- `messages/zh.json`, `messages/en.json`
  新增训练页与状态文案

### 13.3 不修改原则

- 不把训练页主要交互塞回现有 `ExerciseEntryCard`
- 不改变现有 `healthLogs` 的核心结构以承载组级 session 细节

---

## 14. 成功标准

实现完成后,应满足:

1. 首次使用时可以生成并执行 `本次训练计划`
2. 首次训练完成前,不能生成新的下一次计划
3. 完成首次训练后,才允许生成 `下次训练计划`
4. 每组默认展示计划值,但在打卡前允许修改实际值
5. 修改某组重量 / 次数后,后续未完成且未触碰组会自动同步
6. 动作支持自由替换和整项跳过
7. 完成训练后,结果会写入 `DailyLog.exerciseEntries`
8. 新写入记录仍能参与卡路里统计和肌肉疲劳分析
9. 下一次 AI 生成计划会读取历史训练表现、近期疲劳和最近可用体重

---

## 15. 设计结论

本次设计的核心不是新增一个“训练记录表单”,而是建立一个新的训练执行主模型:

- `WorkoutSession` 负责保存真实计划与真实执行过程
- AI 在计划阶段预生成兼容分析值
- 用户不改动作时直接复用这些分析值
- 用户改动作时只对受影响动作做局部补全
- 完成后再写回现有 `DailyLog.exerciseEntries`

这样既保留高自由度训练打卡体验,又不破坏 SnapFit AI 现有“卡路里 + 肌群 + 疲劳”的核心价值链。
