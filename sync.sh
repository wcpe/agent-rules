#!/usr/bin/env bash
# agent-rules 一键同步：把通用规则分发到各端本地消费点
# 用法: bash sync.sh [--claude] [--codex] [--antigravity] [--all]
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$REPO_ROOT/rules"

do_claude() {
  local target="$HOME/.claude/rules/agent-rules"
  mkdir -p "$HOME/.claude/rules"
  rm -rf "$target"
  ln -s "$RULES_DIR" "$target"
  echo "[claude] 已软链: $target -> $RULES_DIR"
}

do_codex() {
  local target="$HOME/.codex/AGENTS.md"
  mkdir -p "$HOME/.codex"
  local begin="<!-- agent-rules:begin -->"
  local end="<!-- agent-rules:end -->"
  # 移除旧嵌入段
  if [ -f "$target" ]; then
    sed -i '' "/$begin/,/$end/d" "$target" 2>/dev/null || sed -i "/$begin/,/$end/d" "$target"
  fi
  {
    echo "$begin"
    echo ""
    echo "## 通用开发规则（agent-rules 同步段，手工编辑无效）"
    echo ""
    for f in "$RULES_DIR"/*.md; do
      echo "### $(basename "$f" .md)"
      echo ""
      cat "$f"
      echo ""
    done
    echo "$end"
  } >> "$target"
  echo "[codex] 已嵌入 AGENTS.md: $target（注意 32KiB 上限，超限需精简）"
}

do_antigravity() {
  local target="$HOME/.gemini/config/plugins/agent-rules"
  mkdir -p "$HOME/.gemini/config/plugins"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "[antigravity] 错误：目标已存在且不是软链（$target），为避免覆盖本地插件目录已中止；请先手动备份或卸载后再同步。" >&2
    return 1
  fi
  rm -f "$target"
  ln -s "$REPO_ROOT" "$target"
  echo "[antigravity] 已软链全局插件: $target -> $REPO_ROOT"
}

case "${1:---all}" in
  --claude) do_claude ;;
  --codex) do_codex ;;
  --antigravity) do_antigravity ;;
  --all) do_claude; do_codex; do_antigravity ;;
  *) echo "用法: bash sync.sh [--claude|--codex|--antigravity|--all]"; exit 1 ;;
esac
