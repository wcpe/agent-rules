#!/usr/bin/env node
'use strict'
// 提交门（PreToolUse）：git add / git commit 时扫描文件名，命中禁止入库模式即硬阻断。
// 通用生效（不限项目类型）。提取不到文件列表则放行，绝不误拦。
// 规则真源：rules/forbidden-in-repo.md
const { execSync } = require('child_process')

function readStdin(cb) {
  let d = ''
  process.stdin.on('data', c => d += c)
  process.stdin.on('end', () => { try { cb(JSON.parse(d || '{}')) } catch (e) { cb({}) } })
  process.stdin.on('error', () => cb({}))
}

const PATTERNS = [
  { re: /(^|\/)plan[-\w]*\.md$/i, why: '计划文档禁止入库' },
  { re: /(^|\/)roadmap\.md$/i, why: '计划文档禁止入库' },
  { re: /(^|\/)(implementation|实施记录|执行报告|分析报告|重构报告|audit[-\w]*)\.md$/i, why: '实施/分析报告禁止入库' },
  { re: /(^|\/)(requirements?|需求)[-\w]*\.md$/i, why: '临时需求文档禁止入库' },
  { re: /\.(png|jpe?g|gif|webp|mp4|mov|webm|zip|tar|gz|jar)$/i, why: '二进制/验收证据禁止入库（产品资产例外请走白名单路径）' },
  { re: /(^|\/)\.env(\.|$)/i, why: '环境/凭据文件禁止入库' },
  { re: /(id_rsa|id_ed25519|\.pem|\.key|credentials|secret)/i, why: '密钥/凭据禁止入库' }
]

const block = function (why, file) {
  const reason = '[agent-rules 提交门] ' + why + '：' + file + '\n规则见 rules/forbidden-in-repo.md。过程材料放 .tmp/ 或库外。'
  console.log(JSON.stringify({ decision: 'block', reason: reason }))
  console.error(reason)
  process.exit(2)
}

readStdin(function (input) {
  try {
    const ti = input.tool_input || {}
    const cmd = String(ti.command || '')
    if (!/\bgit\s+(add|commit)\b/.test(cmd)) process.exit(0)
    // 提取 git add 的文件参数
    const m = cmd.match(/\bgit\s+add\s+([^;&|]+)/)
    if (m) {
      const args = m[1].trim().split(/\s+/).filter(a => !a.startsWith('-'))
      for (const a of args) {
        if (a === '.' || a === '-A' || a === '--all') {
          // 全量暂存：扫 git status 候选文件
          try {
            const out = execSync('git status --porcelain 2>/dev/null', { encoding: 'utf8', timeout: 5000 })
            for (const line of out.split('\n')) {
              const f = line.slice(3).trim()
              if (!f) continue
              for (const p of PATTERNS) if (p.re.test(f)) block(p.why, f)
            }
          } catch (e) { /* 放行 */ }
          process.exit(0)
        }
        for (const p of PATTERNS) if (p.re.test(a)) block(p.why, a)
      }
    }
    // git commit 时扫已暂存文件
    if (/\bgit\s+commit\b/.test(cmd)) {
      try {
        const out = execSync('git diff --cached --name-only 2>/dev/null', { encoding: 'utf8', timeout: 5000 })
        for (const f of out.split('\n').filter(Boolean)) {
          for (const p of PATTERNS) if (p.re.test(f)) block(p.why, f)
        }
      } catch (e) { /* 放行 */ }
    }
  } catch (e) { /* 静默放行 */ }
  process.exit(0)
})
