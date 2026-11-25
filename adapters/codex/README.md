# Codex 适配

Codex 读取 AGENTS.md（仓库级）与全局 instructions。

## 用法

在仓库 AGENTS.md 或全局 instructions 中加入引用段：

```markdown
## 通用开发规则

工作前阅读并遵守 agent-rules 仓的通用规则（克隆在本地时给出路径，或逐条嵌入关键规则）：
- 提交/合并/PR 规范、禁止入库清单、测试与断言规则、证据纪律、文档同步
```

最稳妥做法：关键规则（禁止入库、提交规范、禁止关闭 PR）直接嵌入 instructions 全文，细则引用本仓路径。

## 更新

规则真源在本仓，instructions 里的嵌入段同步更新；可用脚本 diff 校验一致性。
