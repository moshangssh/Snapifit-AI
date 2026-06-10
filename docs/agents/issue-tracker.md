# Issue tracker: GitHub

本仓库的 issues 和 PRD 发布到 GitHub Issues。所有 issue 操作优先使用 `gh` CLI。

## Conventions

- 创建 issue：`gh issue create --title "..." --body "..."`
- 读取 issue：`gh issue view <number> --comments`
- 列出 issues：`gh issue list --state open --json number,title,body,labels,comments`
- 评论 issue：`gh issue comment <number> --body "..."`
- 添加 / 移除标签：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- 关闭 issue：`gh issue close <number> --comment "..."`

在仓库克隆目录中运行时，让 `gh` 根据 `git remote -v` 自动推断仓库。

## When a skill says "publish to the issue tracker"

创建一个 GitHub issue。

## When a skill says "fetch the relevant ticket"

运行 `gh issue view <number> --comments`。
