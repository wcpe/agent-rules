# agent-rules

通用开发规则真源仓——约束所有 AI agent（Devin / Claude Code / Codex）在所有仓库中的工作方式。插件市场索引在 wcpe/plugin-marketplaces，本仓只做规则。

## 本仓治理

- **普通 commit 直推 master，不走 PR**——规则仓追求快速迭代，历史即账本
- 规则变更用中文 Conventional Commits（`docs(rules): ...`）
- 禁止出现任何项目名：只收跨仓库通用规则，项目专属规则留在各项目仓库内

## 原则

- **单一真源**：规则只在这里维护，各 agent 端是分发目标不是副本
- **一文件一主题**：每条规则独立成文，agent 按需加载
- **三端同源**：Devin / Claude Code / Codex 消费的是同一份规则

## 规则清单（rules/）

| 文件 | 主题 |
|---|---|
| git-commit.md | 提交信息规范（中文 Conventional Commits） |
| git-commit-identity.md | git 作者身份 |
| pr-workflow.md | PR 创建与 squash 合并规范 |
| pr-lifecycle.md | 禁止关闭 PR、合并授权、审查纪律、堆叠分支 |
| forbidden-in-repo.md | 禁止入库清单（过程文档/证据/二进制/密钥/路径/AI 署名/绕过手段） |
| testing-and-assertions.md | 测试哲学、强断言禁令、客户端/服务端角色分离、视觉依赖降级 |
| evidence-discipline.md | 验收证据形态（分段+标注+直展）、证据不入库、可复跑自动化 |
| doc-sync.md | 文档演进（PRD/ARCHITECTURE/ADR）、防漂移、注释语言 |

## 三端安装

### Devin

插件安装（个人范围）：在会话中执行 manage_plugin 安装本仓。rules/ 下规则作为 always-on rules 在每个会话自动生效。

注意：tree URL 分支名不能含斜杠；更新时先 uninstall 再装最新 master SHA。

### Claude Code

规则不是 Claude 插件组件（官方：插件根 CLAUDE.md 不加载），走同步脚本：

```bash
git clone <本仓> ~/agent-rules
bash ~/agent-rules/sync.sh --claude   # 软链进 ~/.claude/rules/agent-rules
```

更新：`git -C ~/agent-rules pull`（软链自动生效，无需重跑）。

技能型插件（sdd-skills/privacy-guard/security-scan/mc-testkit）走统一市场仓 `wcpe/plugin-marketplaces` 安装，与本仓无关。

### Codex

Codex 无插件系统，走同步脚本把规则嵌入全局 `~/.codex/AGENTS.md`（标记段幂等更新）：

```bash
bash ~/agent-rules/sync.sh --codex
```

注意 Codex 项目指令 32KiB 上限——rules 全文约 15-20KiB，与项目级 AGENTS.md 叠加超限时需精简或改用引用式。

## 目录结构

```
├── rules/                  # 规则真源（Devin 插件规则层 / Claude 同步源 / Codex 引用源）
├── sync.sh                 # 一键同步脚本（--claude / --codex / --all）
└── adapters/               # 三端适配详细说明
    ├── claude/
    ├── codex/
    └── devin/
```
