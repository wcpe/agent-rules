#!/usr/bin/env node
'use strict'
// 提交门（PreToolUse）：git add / git commit 时扫描文件名，命中禁止入库模式即硬阻断。
// 通用生效（不限项目类型）。提取不到文件列表则放行，绝不误拦。
// 规则真源：rules/forbidden-in-repo.md
const { execSync } = require('child_process')
const path = require('path')

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

const unquote = s => String(s || '').replace(/^["']|["']$/g, '')

readStdin(function (input) {
  const isAntigravity = process.env.AGENT_HOOK_HOST === 'antigravity' || Boolean(input.toolCall)
  const writeAndExit = function (payload, code) {
    process.stdout.write(payload, function () { process.exit(code) })
  }
  const allow = function () {
    if (isAntigravity) {
      writeAndExit(JSON.stringify({ decision: 'allow' }) + '\n', 0)
      return
    }
    process.exit(0)
  }
  const block = function (why, file) {
    const reason = '[agent-rules 提交门] ' + why + '：' + file + '\n规则见 rules/forbidden-in-repo.md。过程材料放 .tmp/ 或库外。'
    if (isAntigravity) {
      // Antigravity 要求退出码为 0 并通过 stdout JSON 返回 decision: deny；非 0 会被当作 hook 异常而 fail-open
      writeAndExit(JSON.stringify({ decision: 'deny', reason: reason }) + '\n', 0)
      return
    }
    console.error(reason)
    writeAndExit(JSON.stringify({ decision: 'block', reason: reason }) + '\n', 2)
  }

  try {
    const ti = (input.toolCall && input.toolCall.args) || input.tool_input || {}
    const cmd = String(ti.CommandLine || ti.command || '')
    const ARG = '("[^"]+"|\'[^\']+\'|[^\\s;&|]+)'
    const gitAnyRe = new RegExp('\\bgit\\s+(?:-C\\s+' + ARG + '\\s+)?(add|commit)\\b')
    if (!gitAnyRe.test(cmd)) return allow()

    let base = String(
      ti.Cwd || ti.workdir || ti.cwd || input.cwd ||
      (Array.isArray(input.workspacePaths) && input.workspacePaths[0]) ||
      process.cwd()
    )

    // 按命令分隔符分段处理，正确跟踪每段内的 cd 与多个 git add / git commit
    const segments = cmd.split(/\s*(?:&&|\|\||;)\s*/)
    const addRe = new RegExp('\\bgit\\s+(?:-C\\s+' + ARG + '\\s+)?add\\s+(.+)')
    const commitRe = new RegExp('\\bgit\\s+(?:-C\\s+' + ARG + '\\s+)?commit\\b')
    const cdRe = new RegExp('^cd\\s+' + ARG + '$')
    for (const seg of segments) {
      const trimmed = seg.trim()
      if (!trimmed) continue
      const cdm = trimmed.match(cdRe)
      if (cdm) {
        base = path.resolve(base, unquote(cdm[1]))
        continue
      }
      const am = trimmed.match(addRe)
      if (am) {
        const addDir = am[1] ? path.resolve(base, unquote(am[1])) : base
        const args = (am[2].match(/"[^"]+"|'[^']+'|\S+/g) || []).map(unquote).filter(a => a && !a.startsWith('-'))
        for (const a of args) {
          if (a === '.' || a === '-A' || a === '--all') {
            try {
              const out = execSync('git -c core.quotepath=false status --porcelain 2>/dev/null', { cwd: addDir, encoding: 'utf8', timeout: 5000 })
              for (const line of out.split('\n')) {
                const f = line.slice(3).trim()
                if (!f) continue
                for (const p of PATTERNS) if (p.re.test(f)) return block(p.why, f)
              }
            } catch (e) { /* 放行 */ }
            continue
          }
          for (const p of PATTERNS) if (p.re.test(a)) return block(p.why, a)
        }
      }
      const cm = trimmed.match(commitRe)
      if (cm) {
        const commitDir = cm[1] ? path.resolve(base, unquote(cm[1])) : base
        try {
          const out = execSync('git -c core.quotepath=false diff --cached --name-only 2>/dev/null', { cwd: commitDir, encoding: 'utf8', timeout: 5000 })
          for (const f of out.split('\n').filter(Boolean)) {
            for (const p of PATTERNS) if (p.re.test(f)) return block(p.why, f)
          }
        } catch (e) { /* 放行 */ }
      }
    }
  } catch (e) { /* 静默放行 */ }
  allow()
})
