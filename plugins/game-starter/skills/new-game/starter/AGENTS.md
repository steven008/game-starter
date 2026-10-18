# Notes for coding agents

Everything an agent needs is in [`CLAUDE.md`](CLAUDE.md): read it first, whichever agent you are. It has the workflow
(your own worktree, run it locally, check, push to `main`, Render deploys once CI passes), the architecture rules, the
gotchas and the how-tos. (`AGENTS.md` is the name most coding agents look for; Claude Code reads `CLAUDE.md` itself.)

The short version:
- Several agents work on this repo at once: work in **your own git worktree on your own branch**
  (`git worktree add ../<repo>-<task> -b <task> origin/main`), never in the main clone on `main`.
- `pnpm install`, then `pnpm dev:all` on free ports (`PORT=5174 SERVER_PORT=8788 pnpm dev:all`).
- Agree on the change with your user before coding; keep to the architecture rules in `CLAUDE.md`.
- `pnpm test && pnpm build && pnpm lint` before every commit; a test in `tests/` for new game rules.
- Commit (stage only your files), `git fetch origin && git rebase origin/main`, check again, then
  `git push origin HEAD:main`, and check `/healthz` shows your commit once it's deployed. Never force-push `main`.
