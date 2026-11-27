# Antigravity 适配

Google Antigravity 原生支持插件机制（`.antigravity-plugin/plugin.json`），安装后自动加载 `rules/*.md`（YAML frontmatter `trigger: always_on`）与根目录 `hooks.json`（禁止入库提交门）。

## 用法

### 方式一：CLI 安装插件（推荐，App 与 CLI 自动同步）

```bash
agy plugin install https://github.com/wcpe/agent-rules
agy plugin list
```

### 方式二：本地克隆 + 同步脚本（软链至全局插件目录）

```bash
git clone https://github.com/wcpe/agent-rules ~/agent-rules
bash ~/agent-rules/sync.sh --antigravity   # 软链到 ~/.gemini/config/plugins/agent-rules
```

## 生效能力

- **规则层**（`rules/*.md`）：全部规则均带 `trigger: always_on` frontmatter，启用插件后自动注入所有会话。
- **提交门护栏**（`hooks.json`）：在 `PreToolUse` 拦截 `run_command` 中的 `git add` / `git commit`，命中禁止入库模式时返回 `decision: deny`（exit 0）阻断操作。

## 更新

- CLI 安装：在 Antigravity App / CLI 中更新插件，或重新执行 `agy plugin install`。
- 软链方式：`git -C ~/agent-rules pull` 即刻生效。
