# Domain Docs

工程技能探索代码前，应按本文件约定读取本仓库的领域文档。

## Before exploring, read these

- 根目录 `CONTEXT.md`
- 根目录 `CONTEXT-MAP.md`，如果它存在，则按其中映射读取相关上下文
- `docs/adr/` 中与当前任务相关的架构决策记录

如果这些文件不存在，静默继续。不要因为缺少它们而阻塞任务；`/grill-with-docs` 会在术语或决策需要固化时按需创建。

## File structure

本仓库按 single-context 布局处理：

```text
/
├── CONTEXT.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

输出 issue 标题、重构建议、诊断假设或测试名称时，优先使用 `CONTEXT.md` 中定义的领域术语。

如果需要的概念尚未出现在 glossary 中，说明可能存在术语缺口；需要时交给 `/grill-with-docs` 固化。

## Flag ADR conflicts

如果输出内容与现有 ADR 冲突，必须明确指出冲突，而不是静默覆盖既有决策。
