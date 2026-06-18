# 动作指南内容来自 SmartWorkout 派生的生成式精简模块

## Context

ADR-0006 精选了 106 个动作进入 `catalog.ts`，但只保留了**结构化标签**（肌群、动作模式、角度、器械等），没有任何文字说明。当前训练卡片上的"注意事项"是引擎里写死的**通用句子**（如 `novice-engine.ts` 的 `["保持动作可控。", "出现不适就降低幅度或停止。"]`），对每个动作都一样，不含动作专属的做法、技巧和常见错误。

数据源 `docs/smartworkout-exercise-comparison-2026-06-02/smartworkout_exercises_zh.json`（824 个动作）其实为每个动作提供了丰富的中文文字：`descriptionZh`（概述）、`instructionsZh`（分步骤做法）、`tipsZh`（技巧提示）、`commonMistakesZh`（常见错误），以及 `videoLightUrl`/`videoDarkUrl`/`thumbnail1/2`（演示视频与缩略图）。catalog 的 106 个 id 中有 **104 个**能在该 JSON 中精确匹配（另 2 个为自定义动作，无源数据）。

需要确定：
1. 运行时怎么拿到这些内容——全量 JSON 进包，还是生成精简子集？
2. 内容写进 session 持久化，还是渲染时查表？
3. 演示视频/缩略图是热链外部地址，还是自托管？
4. 接入后如何不削弱面向 AS 患者的安全提醒？

## Decision

**用生成脚本从源 JSON 派生一个提交式精简模块，渲染时按 `catalogExerciseId` 查表，演示视频热链外部地址，并在所有动作上保留独立的 AS 安全提醒。**

### 数据来源与生成

- 新增 `scripts/gen-exercise-guide.mjs`，加 `npm run gen:guide`。
- 脚本读 `catalog.ts` 当前的 id 列表，从源 JSON 过滤出对应动作，产出**两个提交式模块**（放 `lib/workout/engine/`）：
  - `exercise-guide-inline`（`descriptionZh` / `tipsZh` / `commonMistakesZh`，约 126KB，104 条）
  - `exercise-guide-detail`（`instructionsZh` / `videoLightUrl` / `thumbnail`，约 88KB）
- catalog 增删动作后重跑 `npm run gen:guide` 即可同步，可复现（对齐 ADR-0005 的"动作池持续演进"）。

### 运行时访问

- **内联模块**被卡片直接 import（首屏）；**详情模块**用 `dynamic import`，仅在点开"动作指南"Dialog 时加载，不进首屏包。
- 内容在**渲染时按 `catalogExerciseId` 查表**，**不写入 session 持久化**——session 保持精简，内容可随生成更新而刷新，不会冻结旧版本。沿用 `lib/workout/exercise-labels.ts` 已有的"按 id 查 catalog"模式。

### 展示分工

| 表面 | 内容 |
|------|------|
| 训练卡片 | AS 安全提醒（常驻）+ 动作概述（全文）+ 技巧提示/常见错误（各前 2~3 条或可折叠）+ "动作指南"按钮 |
| 动作指南 Dialog | 热链 `videoLightUrl` 演示 + 全量分步骤 + 全部技巧/错误 + 目标肌群 |

### AS 安全层

引擎现有的 AS 安全提醒（"出现不适就降低幅度或停止"）**在所有动作上保留**，作为视觉独立、置顶的一行，SmartWorkout 内容层叠在其下。SmartWorkout 的 `tipsZh`/`commonMistakesZh` 面向普通人、对 AS 无感知，因此**不替换、只补充**安全提醒。

### 回退

无源内容的动作（2 个自定义 + 任何 AI 生成的非 catalog 动作）→ 卡片只显示 AS 提醒，不显示 SmartWorkout 区块，隐藏"动作指南"按钮。

## Consequences

- 卡片从"千篇一律的通用提示"升级为"每个动作专属的做法、技巧、错误 + 视频指南"，对新手和 AS 患者的动作质量帮助显著。
- 首屏只多约 126KB 文本；视频/步骤等重内容懒加载，不拖慢主流程。
- **外部依赖风险**:视频/缩略图热链 `api.smartworkout.app`，依赖对方 CDN 存活;加载失败回退缩略图。素材版权属 SmartWorkout——本项目为 Personal-Edition，限个人使用，不再分发。
- catalog 演进时需记得重跑 `npm run gen:guide`，否则新动作无指南内容（会自动走回退，不报错）。

## Alternatives Considered

### 全量 824 个 JSON 进运行时

直接打包源 JSON 运行时查。**拒绝**:打包 718 个用不到的动作，体积最大，且暴露未经 AS 审核的动作文案。

### 内容写进 session 持久化

引擎生成计划时把文字塞进 session 存档。**拒绝**:session 臃肿;内容一旦写入即冻结，源更新后旧 session 不刷新。

### 自托管视频素材

下载 104 个视频自托管。**拒绝**:存储成本高;且涉及对 SmartWorkout 素材的再分发版权问题。Personal-Edition 下热链是更克制的选择。

### 用 SmartWorkout 内容完全替换现有提示

直接拿 `tipsZh` 替掉引擎的安全提醒。**拒绝**:会丢失面向 AS 患者的"出现不适就停止"安全提醒，而该提醒在负重主项上恰恰最重要。

## References

- ADR-0005: 动作池分阶段演进策略
- ADR-0006: 动作库从 824 精选 106
- 数据源:`docs/smartworkout-exercise-comparison-2026-06-02/smartworkout_exercises_zh.json`
- CONTEXT.md:AS 核心动作、感觉不对标记、动作指南
