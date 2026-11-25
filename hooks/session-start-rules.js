#!/usr/bin/env node
'use strict'
// SessionStart：把 rules/ 全文注入会话上下文（Claude 的 rules 不会自动进上下文，这是官方认可的唯一注入通道）。
// 输出 additionalContext；任何失败静默放行，绝不打断会话。
const fs = require('fs')
const path = require('path')

function readStdin(cb) {
  let d = ''
  process.stdin.on('data', c => d += c)
  process.stdin.on('end', () => { try { cb(JSON.parse(d || '{}')) } catch (e) { cb({}) } })
  process.stdin.on('error', () => cb({}))
}

readStdin(function () {
  try {
    const root = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..')
    const dir = path.join(root, 'rules')
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()
    if (!files.length) process.exit(0)
    let body = '# 通用开发规则（agent-rules 插件注入，适用于所有仓库）\n\n'
    for (const f of files) {
      body += fs.readFileSync(path.join(dir, f), 'utf8') + '\n\n'
    }
    // SessionStart hook 输出协议：hookSpecificOutput.additionalContext
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: body
      }
    }))
  } catch (e) { /* 静默放行 */ }
  process.exit(0)
})
