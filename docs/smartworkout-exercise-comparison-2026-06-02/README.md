# SmartWorkout 动作库对比报告

生成日期：2026-06-02

## 来源

- SmartWorkout 页面：https://smartworkout.app/zh/健身练习库
- Snapifit 本地动作库：`lib/workout/exercise-catalog/data.ts`

## 对比口径

SmartWorkout 动作来自页面内 `__NEXT_DATA__.props.pageProps.exercises`。

Snapifit 动作来自本地 `CATALOG_SEEDS`，使用以下字段参与匹配：

- 严格匹配：`displayNameZh`、`displayNameEn`
- 别名复核：`aliasesZh`、`aliasesEn`

名称匹配使用本地动作库同类归一化规则，忽略大小写、空格、常见标点、重量和组次数标记。

## 统计摘要

- SmartWorkout 动作数：824
- Snapifit 本地 catalog 动作数：43
- SmartWorkout 严格显示名命中：27
- SmartWorkout 别名命中但需人工复核：6
- SmartWorkout 未进入本地库：791
- Snapifit 本地严格显示名覆盖：21
- Snapifit 本地别名覆盖但需人工复核：5
- Snapifit 本地未被严格/别名覆盖：17

## 文件说明

- `smartworkout-all-exercises.csv`：SmartWorkout 824 个动作的纯全量清单，不包含任何 Snapifit 对比字段。
- `smartworkout-vs-snapifit-strict-alias.csv`：SmartWorkout 824 个动作的全量对比表。
- `smartworkout-not-in-snapifit-strict-alias.csv`：SmartWorkout 中未按严格/别名口径命中 Snapifit 的 791 个动作。
- `snapifit-local-smartworkout-match-matrix.csv`：Snapifit 本地 43 个动作逐项覆盖矩阵，包含候选相似项。
- `smartworkout-vs-snapifit-strict-alias-summary.json`：本次对比的机器可读摘要。

## 注意

`alias_match_review` 不是最终等价结论，只表示名称或别名命中，需要人工确认是否属于同一 canonical 动作。例如推举、push press、shoulder press 等动作变式可能在名称上接近，但训练语义并不完全相同。
