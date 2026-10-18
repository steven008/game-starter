---
name: ship
description: Put a finished change live - check it, commit it, rebase onto main, push (which deploys to Render once CI passes), confirm the new commit is live and healthy, then remove the worktree. Use when the change your user agreed to is done and they want it pushed, deployed or live.
---

# Ship it

You're in your own worktree on your own branch (CLAUDE.md, Workflow step 2), the change is done, and your user has
seen it working locally. The live address is in CLAUDE.md's Workflow (`LIVE` below).

1. **Check:** `pnpm test && pnpm build && pnpm lint`. Touched the server, the build or performance? Also run the
   production build on a free port and smoke it: `PORT=<port> pnpm start` (detached), `pnpm smoke http://localhost:<port>`,
   then stop it by its PID.
2. **Document:** CLAUDE.md for a new convention, gotcha or how-to (keep it lean); README.md if players will notice.
3. **Commit** on your branch: stage your own files by name (`git add <files>`, never `-A` or `.`), and a message that
   says why, not just what. If the task is a GitHub issue, end the message with `Fixes #<number>`.
4. **Catch up with main and check again:**
   ```bash
   git fetch origin && git rebase origin/main
   pnpm test && pnpm build && pnpm lint
   ```
   A conflict: keep what both sides meant, `git add` the files, `git rebase --continue`, and tell your user what you
   merged.
5. **Push:** `git push origin HEAD:main`. Rejected as non-fast-forward: someone pushed meanwhile, so go back to 4.
   Never force-push.
6. **Watch it go live.** GitHub runs CI (`.github/workflows/ci.yml`); Render deploys only once it passes, then takes a
   few minutes more. Wait for the live server to report your commit, then smoke it:
   ```bash
   commit=$(git rev-parse HEAD)
   for i in $(seq 30); do curl -s LIVE/healthz | grep -q "$commit" && break; sleep 20; done
   pnpm smoke LIVE "$commit"
   curl -s LIVE/client-errors
   ```
   Any browser errors from your commit (`commit` in each entry) are yours to look into. Not live after ~10 minutes:
   - CI failed? `gh run list --limit 3` and `gh run view <id> --log-failed` (or ask your user to look at the repo's
     Actions tab). Fix it and ship again.
   - CI passed but the deploy failed or never started: read why with the Render CLI (CLAUDE.md, "Watch a deploy or
     read the live logs"), or ask your user for the service's Events and Logs in the Render dashboard.
   - The live game is broken and the fix isn't quick: `git revert <sha>` and push that first (step 4 on), then fix
     it properly.
7. **Clean up,** without asking: stop the dev servers you started (by PID: CLAUDE.md, "Stopping a server"), `cd` to
   the main clone (the first line of `git worktree list`), then `git worktree remove ../<repo>-<task>` and
   `git branch -d <task>`. Only your own; if `worktree remove` refuses because of uncommitted changes, stop and ask.
8. **Tell your user** what changed, that it's live at LIVE (and the commit), anything the smoke test or the browser
   errors showed, and that the worktree is gone.
