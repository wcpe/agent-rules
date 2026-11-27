import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (...p) => JSON.parse(readFileSync(path.join(repoRoot, ...p), 'utf8'));

function runHook(input, { host = 'antigravity', cwd = repoRoot, env = {} } = {}) {
  return spawnSync('sh', [path.join(repoRoot, 'hooks', 'run-hook.sh'), '--host', host, 'guard-forbidden-files.js'], {
    cwd,
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
  });
}

test('Antigravity 插件清单符合 schema 且与其余三端版本一致', () => {
  const agy = readJson('.antigravity-plugin', 'plugin.json');
  assert.equal(agy.$schema, 'https://antigravity.google/schemas/v1/plugin.json');
  assert.match(agy.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.equal(agy.version, readJson('.devin-plugin', 'plugin.json').version);
  assert.equal(agy.version, readJson('.claude-plugin', 'plugin.json').version);
  assert.equal(agy.version, readJson('.codex-plugin', 'plugin.json').version);
  assert.match(agy.author.url, /^https:\/\//);

  const hooks = readJson('hooks.json');
  assert.ok(hooks['agent-rules-forbidden-files']);
  assert.equal(hooks['agent-rules-forbidden-files'].PreToolUse[0].matcher, 'run_command');
  assert.match(hooks['agent-rules-forbidden-files'].PreToolUse[0].hooks[0].command, /--host antigravity/);
});

test('rules/ 下所有规则文件均带合法 YAML frontmatter 且单文件不超过 24KB', () => {
  const rulesDir = path.join(repoRoot, 'rules');
  const files = readdirSync(rulesDir).filter((f) => f.endsWith('.md'));
  assert.ok(files.length > 0);
  for (const f of files) {
    const full = path.join(rulesDir, f);
    const content = readFileSync(full, 'utf8');
    assert.match(content, /^---\r?\ntrigger:\s*(always_on|model_decision|glob|manual)\r?\n---/, `${f} 缺少合法 trigger frontmatter`);
    assert.ok(statSync(full).size <= 24000, `${f} 超出 Antigravity 单文件 24KB 限制`);
  }
});

test('Antigravity PreToolUse 拦截禁止入库文件时返回 exit 0 + decision:deny，合规命令返回 decision:allow', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ar-agy-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    writeFileSync(path.join(dir, 'PLAN.md'), '# plan\n');
    writeFileSync(path.join(dir, 'README.md'), '# ok\n');

    const blockAdd = runHook({
      toolCall: { name: 'run_command', args: { CommandLine: 'git add PLAN.md', Cwd: dir } },
      workspacePaths: [dir],
    });
    assert.equal(blockAdd.status, 0, 'Antigravity hook 阻断时必须返回 exit 0');
    assert.equal(JSON.parse(blockAdd.stdout).decision, 'deny');

    const blockChained = runHook({
      toolCall: { name: 'run_command', args: { CommandLine: 'git add README.md && git add PLAN.md && git commit -m "chore: x"', Cwd: dir } },
      workspacePaths: [dir],
    });
    assert.equal(blockChained.status, 0);
    assert.equal(JSON.parse(blockChained.stdout).decision, 'deny', '链式 git add 后续禁止文件必须拦截');

    writeFileSync(path.join(dir, '需求.md'), '# 临时需求\n');
    const blockChinese = runHook({
      toolCall: { name: 'run_command', args: { CommandLine: 'git add .', Cwd: dir } },
      workspacePaths: [dir],
    });
    assert.equal(blockChinese.status, 0);
    assert.equal(JSON.parse(blockChinese.stdout).decision, 'deny', '中文过程文档不得因 quotepath 转义漏检');

    execFileSync('git', ['add', 'PLAN.md'], { cwd: dir, stdio: 'ignore' });
    const blockCommit = runHook({
      toolCall: { name: 'run_command', args: { CommandLine: 'git commit -m "chore: x"', Cwd: dir } },
      workspacePaths: [dir],
    });
    assert.equal(blockCommit.status, 0);
    assert.equal(JSON.parse(blockCommit.stdout).decision, 'deny');

    execFileSync('git', ['rm', '--cached', 'PLAN.md'], { cwd: dir, stdio: 'ignore' });
    execFileSync('git', ['add', 'README.md'], { cwd: dir, stdio: 'ignore' });
    const allowCommit = runHook({
      toolCall: { name: 'run_command', args: { CommandLine: 'git commit -m "docs: x"', Cwd: dir } },
      workspacePaths: [dir],
    });
    assert.equal(allowCommit.status, 0);
    assert.deepEqual(JSON.parse(allowCommit.stdout), { decision: 'allow' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sync.sh --antigravity 拒绝删除已存在的非软链插件目录', () => {
  const fakeHome = mkdtempSync(path.join(tmpdir(), 'ar-home-'));
  try {
    const existingDir = path.join(fakeHome, '.gemini', 'config', 'plugins', 'agent-rules');
    execFileSync('mkdir', ['-p', existingDir]);
    writeFileSync(path.join(existingDir, 'local-edit.txt'), 'keep me\n');

    const r = spawnSync('bash', [path.join(repoRoot, 'sync.sh'), '--antigravity'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { PATH: process.env.PATH, HOME: fakeHome },
    });
    assert.notEqual(r.status, 0, '非软链目录不得被强制删除');
    assert.equal(readFileSync(path.join(existingDir, 'local-edit.txt'), 'utf8'), 'keep me\n');
  } finally {
    rmSync(fakeHome, { recursive: true, force: true });
  }
});

test('Claude Code 协议兼容保持不变（阻断返回 exit 2 + decision:block），Devin 下跳过 antigravity hook', () => {
  const claudeBlock = runHook(
    { tool_name: 'Bash', tool_input: { command: 'git add .env' } },
    { host: 'claude' },
  );
  assert.equal(claudeBlock.status, 2);
  assert.equal(JSON.parse(claudeBlock.stdout).decision, 'block');

  const devinSkip = runHook(
    { toolCall: { name: 'run_command', args: { CommandLine: 'git add .env' } } },
    { host: 'antigravity', env: { DEVIN_PLUGIN_ROOT: repoRoot } },
  );
  assert.equal(devinSkip.status, 0);
  assert.equal(devinSkip.stdout, '');
});
