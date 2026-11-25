# Claude Code 适配

Claude Code 自动读取 `.claude/rules/`（项目级）与 `~/.claude/rules/`（全局级）下的规则文件。

## 用法

全局生效（推荐，一次配置所有项目通用）：

```bash
git clone <本仓> ~/agent-rules
ln -s ~/agent-rules/rules ~/.claude/rules/agent-rules
```

或项目级：把 rules/ 复制/软链进项目 `.claude/rules/agent-rules/`。

项目专属规则留在项目自己的 `.claude/rules/` 顶层，与本目录并存不冲突。

## 更新

`git -C ~/agent-rules pull` 即全部生效，无需重新链接。
