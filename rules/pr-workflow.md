---
trigger: always_on
---

# PR 工作流规范（适用于所有仓库）

目标：让 GitHub Release 自动笔记（generate_release_notes）完整收录每次变更——它只认合并的 PR，issue 与直接 push 的提交不进 What's Changed。

## 豁免（不强制走 PR）

以下两类提交允许直接提交到主线分支，不开 PR：
- 普通文档提交：只改文档（README、docs/、CHANGELOG 等）、不含任何功能代码或构建逻辑改动。
- 版本更新提交：纯版本号 bump / 发版元数据改动（version 字段、tag 准备），不含功能代码改动。

除这两类外的一切变更（含 AI 代理、hotfix）一律走 PR，禁止直推主线。

## PR 创建

- `gh pr create --fill --base <开发主线>`：必须显式指定 base。很多仓库默认分支是 master/main 而开发主线是 dev；不写 --base 会落到默认分支。
- PR 标题 = `<type>(<scope>): <中文描述>`（中文 Conventional Commits），就是 Release 笔记里的一行，须能独立读懂；一个 PR 只做一件事。
- PR 描述写成可独立阅读的叙述；feat / fix 需附需求编号（仓库有编号体系时，如 FR / NFR），无编号体系的写明理由。

## 合并：一律 squash，手工写提交信息

固定命令：

```bash
gh pr merge <n> --squash --delete-branch \
  --subject "<type>(<scope>): <中文描述> (#<n>)" \
  --body-file <总结文件>
```

合并提交五条硬规则：
1. --subject 标题必须自己写全并带 `(#<n>)` 编号——用 --subject 时 GitHub 不做任何自动附加。
2. --body-file 正文必须覆盖 PR 的全部实质提交：用 `gh pr view <n> --json commits --jq '.commits[].messageHeadline'` 逐条核对；同主题提交可合并成一条要点，但不得整条丢失；仅合并、无实质改动的提交可跳过但要说明原因。
3. 正文禁止照抄 PR 描述：两句以上雷同即违规。以代码改动为主线重新组织，去掉模板、复选框、提问与背景铺垫，压成比 PR 描述更短的叙述。
4. 正文一律纯文本：禁止 `**`、`##`、`- [ ]`、列表、表格、代码块、行内反引号；不留模板占位符。
5. 一律 squash：禁止 --merge / --rebase；feat / fix 的正文仍需附需求编号（同上）。

Dependabot 等机器人开的 PR 同样按此规范合并，不降级。

## 关联 issue

- 写英文关键词 `closes #n` / `fixes #n` / `resolves #n`（仅这三个动词族被识别，中文写法一律无效），写在 PR 描述里，合并总结里也建议带上。
- GitHub 的 closing keyword 只在合并到仓库默认分支时自动关闭 issue。若 PR 合到的是非默认分支（如 dev），合并后必须手工关闭：

```bash
gh issue close <n> --comment "已修复并合入 <分支>。PR #<m> / 合并提交 <sha>。"
```

关闭评论写明：合并提交 SHA、改动要点、验证方式、未包含项。合并后 `gh issue view <n> --json state` 仍为 OPEN 时按此判断是预期（需手工关）还是流程失败。

## 禁止事项

- 除豁免两类外直推主线；绕过 PR 直接打 tag 发布功能版本。
- PR 标题写英文或无 type 前缀；合并提交标题漏 `(#<n>)`。
- `gh pr create` 不写 `--base`。
- 用中文「修复 #n」做关闭关键词。
- --merge / --rebase 合并。
- 合并提交正文照抄 PR 描述、漏掉被 squash 压掉的实质提交、使用 Markdown 标记或保留模板占位符。
