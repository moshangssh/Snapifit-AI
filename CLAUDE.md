# Snapifit-AI 项目文档

## Issue Tracker 配置

**类型**: GitHub Issues
**仓库**: `moshangssh/Snapifit-AI`
**URL**: https://github.com/moshangssh/Snapifit-AI/issues

### 使用 gh CLI 操作

```bash
# 查看 issues
gh issue list

# 创建 issue
gh issue create --title "标题" --body "描述"

# 查看 issue 详情
gh issue view <编号>

# 关闭 issue
gh issue close <编号>
```

### Issue 标签体系

暂未配置标签。你可以选择以下标签体系：

- **类型标签**: `feature` / `bug` / `enhancement` / `refactor` / `docs`
- **优先级**: `P0-critical` / `P1-high` / `P2-medium` / `P3-low`
- **模块标签**: `workout-plan` / `nutrition` / `ai` / `ui` / `backend`
- **状态标签**: `blocked` / `needs-discussion` / `ready` / `in-progress`

### 创建标签

需要时运行：

```bash
gh label create "feature" --color "0E8A16" --description "新功能"
gh label create "bug" --color "D73A4A" --description "Bug 修复"
gh label create "enhancement" --color "A2EEEF" --description "功能增强"
gh label create "workout-plan" --color "FBCA04" --description "训练计划模块"
gh label create "nutrition" --color "FEF2C0" --description "营养模块"
gh label create "ai" --color "7057FF" --description "AI 相关"
gh label create "ui" --color "D4C5F9" --description "UI/UX"
```

### Issue 模板

如果需要，可以创建 `.github/ISSUE_TEMPLATE/` 目录并添加模板。

## 项目信息

- **技术栈**: React + TypeScript + Vite + Node.js
- **主分支**: `SnapFit-AI-Personal-Edition`
- **UI 风格**: 米白底 + 炭黑主色 + 多彩分类点缀，纯色无渐变
