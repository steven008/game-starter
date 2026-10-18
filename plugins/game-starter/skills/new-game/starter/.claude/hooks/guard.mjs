#!/usr/bin/env node
// Claude Code runs this before every Bash command (.claude/settings.json, PreToolUse). It blocks the few commands that
// have hurt this workflow: exit code 2 stops the command, and what's printed on stderr goes back to Claude as the
// reason. Everything else passes (exit 0). Rules in CLAUDE.md say why; this makes them stick.
import { execFileSync } from 'node:child_process'

const input = JSON.parse(await new Promise(resolve => {
  let data = ''
  process.stdin.on('data', chunk => (data += chunk))
  process.stdin.on('end', () => resolve(data || '{}'))
}))
const command = String(input.tool_input?.command ?? '')
const cwd = input.cwd || process.cwd()

const block = reason => {
  process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${reason}\n`)
  process.exit(2)
}

// Each simple command on its own (split at && || ; | and newlines), as words. Rough, but these rules are about
// a command's first few words.
const commands = command.split(/&&|\|\||[;|\n]/).map(part => part.trim().split(/\s+/).filter(Boolean))

for (const words of commands) {
  const [cmd, ...args] = words
  if ((cmd === 'pkill' || cmd === 'pgrep') && args.some(a => /^-\w*f/.test(a))) {
    block(`${cmd} -f matches its pattern against every command line, your own shell's included (it has killed it), ` +
      'and other sessions\' servers. Find the PID listening on the port (ss -ltnp | grep :<port>, or lsof -iTCP:<port> ' +
      '-sTCP:LISTEN), check it\'s yours, and kill that PID.')
  }
  if (cmd === 'killall') block('killall can hit other sessions\' processes. Kill the PID you started instead.')
  if (cmd !== 'git') continue
  const sub = args.find(a => !a.startsWith('-'))
  const rest = args.slice(args.indexOf(sub) + 1)
  if (sub === 'push' && rest.some(a => a === '-f' || a.startsWith('--force') || /^\+/.test(a) || /^-\w*f/.test(a))) {
    block('never force-push: main is the live game and other sessions build on it. Fetch, rebase onto origin/main and push normally.')
  }
  if (sub === 'add' && rest.some(a => a === '-A' || a === '--all' || a === '.' || a === ':/')) {
    block('stage only your own files by name (git add <files>): other sessions\' or stray files would go into your commit.')
  }
  if (sub === 'commit' && !command.includes('cd ') && !args.includes('-C')) {
    const git = (...a) => {
      try {
        return execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
      } catch {
        return ''
      }
    }
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
    const mainClone = git('rev-parse', '--git-dir') === git('rev-parse', '--git-common-dir')
    const hasOrigin = git('rev-parse', '--verify', '--quiet', 'refs/remotes/origin/main') !== ''
    if (branch === 'main' && mainClone && hasOrigin) {
      block('this is the main clone on main, which every session shares. Make your own worktree first ' +
        '(git worktree add ../<repo>-<task> -b <task> origin/main) and commit there (CLAUDE.md, Workflow step 2).')
    }
  }
}
process.exit(0)
