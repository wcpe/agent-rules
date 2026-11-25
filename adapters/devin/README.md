# Devin 适配

Devin 通过插件机制加载规则：把本仓安装为个人范围插件，rules/ 下的规则文件在每个会话自动进入上下文。

## 用法

在 Devin 会话中执行（或请管理员配置）：

```
manage_plugin 安装本仓（个人范围）
```

安装后 rules/ 全部规则作为 always-on rules 生效。

## 注意

- 安装 tree URL 的分支名不能含斜杠（会被截断导致 ref not found）；装分支用 tree/<提交 SHA>
- 更新插件：先按仓库 URL uninstall（一次清掉所有 ref）再装最新 master SHA，核对插件缓存版本
