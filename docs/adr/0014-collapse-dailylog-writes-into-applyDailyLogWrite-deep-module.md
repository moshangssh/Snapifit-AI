# 把 DailyLog 写入折进 applyDailyLogWrite deep module

现状:三处页面(`app/page.tsx`、`app/workbench/page.tsx`、`app/workout/page.tsx`)各自手写同一套 DailyLog 写入序列——改条目 → 重算摘要 → setState → `saveDailyLog` → 调度 TEF → `refreshRecords`——写入顺序与副作用泄漏进页面模块。且实现已漂移:摘要有三份(`lib/daily-summary.ts` 的 `recalculateDailySummary` 逐条 round,首页/工作台各一份内联副本不 round);`prepareLogWithMetabolicRates` 抄两份;基础消耗盖章三处行为不同(首页独立 effect + TEF 路径、工作台仅 TEF 路径、训练页从不);TEF 回写后 `refreshRecords` 首页不刷、工作台刷;TEF 调度首页用 reactive effect、工作台用命令式 + 手维护 `unsubscribe` ref(注释记录踩过 listener 累积)。

**决定:把 DailyLog 写入折进一个深模块。**

- **纯核心** `applyDailyLogWrite(log, write: DailyLogWrite, { userProfile }): DailyLog`——永远重算摘要与基础消耗(`calculatedBMR` + `baselineExpenditure`),再叠加 `write` 的结构改动。判别式 union 落在**输入**(`addEntries` / `removeEntry` / `updateEntry` / `setWeight` / `setDailyStatus` / `setMealPlanSuggestion` / `replaceSessionEntries` / `reconcile`);**输出只有一种结局**——写好的 `DailyLog`(区别于 planWorkout 的判别式**输出**,后者有三种领域结局)。核心纯、无副作用,直接对着它写单测——接口即测试表面。
- **薄 hook** `useDailyLogWriter(date)`——持 log state;`commit(write)` = 核心 → setState → `saveDailyLog` → `refreshRecords`;一个 reconcile effect 在加载/profile 变更时补盖基础消耗(取代首页原 `312-341` 独立 effect);一个 reactive effect keyed 在 `foodEntries` 上调度 TEF、以 effect 返回的 `unsubscribe` 交 React 清理(取代工作台命令式 ref 与三处 `type==='food'` 门控),并 surface 倒计时。
- **训练页直接调纯核心**:它按 `session.startedAt` 写**任意日期**、不走 React state、一把梭(`getDailyLog` → `applyDailyLogWrite` → `saveDailyLog`),用不上 hook 的 state 与 TEF。

配套结构决定:

- **摘要单一实现。** 统一到 `recalculateDailySummary`,删掉首页/工作台两份内联副本。可见影响≈0(显示层本就 `Math.round`),真正收益是删重复 + 统一微量元素累加口径。
- **基础消耗每次写入都盖章。** 消灭工作台/训练页盖章缺口。服务端 AI 路由(`app/api/ai/chat`、`app/api/ai/smart-suggestions`)直接读持久化的 `baselineExpenditure`,快照(`lib/daily-energy-snapshot.ts`)也以它为首选来源,故盖章是**正确性**问题而非整洁问题。「代谢率」一词弃用,统一为 **基础消耗**(见 CONTEXT.md 词条)。
- **聚合边界划在 DailyLog。** 模块只写 DailyLog 这一个 aggregate。`setWeight` 连带的 profile 默认体重同步(`syncProfileWeightFromDailyLog` → `setUserProfile`,写的是 Profile)与纯页面 UI 的 chart-refresh 触发,留在页面回调,不进模块。`refreshRecords` 是 DailyLog 存在性派生,进 hook。

## Considered Options

- **维持现状(写入留在三页)**:改动最小,但写入顺序继续泄漏进页面,摘要/基础消耗/`refreshRecords` 各自漂移,领域逻辑无处可测。
- **单一有状态 hook 拥有一切**(`useDailyLog(date)` 持 state + 全部写入 + 副作用):首页/工作台省事,但训练页「任意日期、fire-and-forget」不吃「当前选中日 state」模型,只能另起炉灶,模块反而没统一三处;且纯逻辑埋进 hook 要挂 React 才能测。
- **只做纯派生(`deriveDailyLog`),副作用留页面**:能消摘要漂移,但不吸收 `saveDailyLog`/`refreshRecords`/TEF,写入顺序仍泄漏进页面,与「写入模块吸收派生值和副作用」的目标不符。
- **判别式结果输出(`{ log, effects }`)**:这里写入只有一种结局(写好的 log),判别式该在**输入**(intent)而非输出;「食物变了 → 排 TEF」由 hook 的 reactive effect 依赖数组表达,强行 `{ log, effects }` 只是无谓 ceremony。

## Consequences

- 顺 **ADR-0013** 的同一模式:纯 in-process deep module + 薄 adapter(hook / 训练页),接口即测试表面;判别式 union 表达输入意图。
- 不违 **ADR-0010**:模块只盖章 **基础消耗**,不把低置信度 AI 代谢提示折进去;TEF 分析仍走解释性的 `tefAnalysis` 字段,被调度并回写,但不计入基础消耗或可吃预算。
- **修掉一批潜伏不一致**:工作台/训练页的基础消耗盖章缺口、TEF 回写后 `refreshRecords` 的首页/工作台差异、摘要微量元素累加口径分歧,随收拢一并消失。
- **备份恢复刻意绕过模块。** `normalizeImportedHealthData`(`lib/health-data-export.ts`)→ `objectStore.put`(`lib/indexed-db-utils.ts`)逐条 verbatim 写回,保留历史日当时的基础消耗;若走模块会用**今天的** profile 重新盖章、静默污染整批历史。规则:单日意图编辑走模块、整库恢复 verbatim。这条与「编辑过去某天会盖今天 profile」不矛盾——前者是波及一片的批量导入,后者是罕见的单日主动编辑(且是现状行为)。
- `applyDailyLogWrite` 成为 DailyLog 写入的唯一 interface;后续新增写入点(如日历补录、批量编辑)直接复用,拿到 leverage。
