---
trigger: always_on
---

# Git 提交身份（适用于所有仓库）

提交作者与提交者身份必须使用用户确认可公开的身份：

- `user.name` / `GIT_AUTHOR_NAME` / `GIT_COMMITTER_NAME` = **wxys233**
- `user.email` / `GIT_AUTHOR_EMAIL` / `GIT_COMMITTER_EMAIL` = **1837019522@qq.com**

## 要求

- 禁止使用其他名字（如 HaruHyacinth、Devin AI、任何机器人名）作为提交作者/提交者。
- 开始工作前用 `git var GIT_AUTHOR_IDENT` 核对当前有效身份；若不符，检查 `~/.gitconfig`、`repo/.git/config`、`~/.devin/git_author` 与 `GIT_AUTHOR_*`/`GIT_COMMITTER_*` 环境变量，修正后再提交。
- 推送前抽查 `git log --format='%an <%ae>'`，确认本次新增提交身份正确。
