# {{GAME}}: notes for agents

The game: {{PITCH}}. A browser game: three.js via `@react-three/fiber` for the view, React for the page, a Node game
server (`ws`) running the rules, hosted on Render. Read this file before changing anything: it has the workflow, the
architecture rules, the gotchas and the how-tos. Player-facing docs: `README.md`. Why things are the way they are:
`git log`, whose messages explain each change.

**Keep this file lean.** Every session loads all of it before doing anything, so it holds what an agent must know to
work safely, not a history of features (that's `git log`). A how-to that grows past a paragraph goes in `docs/` with a
one-line pointer here, or in a `CLAUDE.md` inside the folder it's about (Claude Code reads those when it works there).

## Workflow

The repo is `github.com/{{OWNER}}/{{REPO}}`, live at {{LIVE_URL}}. Pushing to `main` deploys: GitHub runs the checks
(`.github/workflows/ci.yml`), and once they pass Render (`render.yaml`, `Dockerfile`) builds the production game and
restarts it with the new code a few minutes later. Only the owner plays it so far, so finished work goes straight onto
`main`; a deploy just restarts the server (open tabs reconnect to their rooms). **Several agent sessions often work at
once**, each on its own task, so every session works in its own git worktree on its own branch (step 2).

1. **Get going.** Read this file and `README.md`; run `git log --oneline -20` and `git status` (someone else's
   uncommitted changes: leave them alone and tell your user). On a machine that hasn't been set up yet, do "Setting up
   a machine" below first. Tasks can live in GitHub Issues (`gh issue list`): if yours is one, name your branch
   `<number>-<slug>`. An idea worth keeping that isn't for now: offer to file it (`gh issue create`).
2. **Work in your own worktree.** A worktree is a second folder checked out from the same repo on its own branch, so
   parallel sessions never edit each other's files or break each other's builds. Run `git worktree list`: the first
   line is the main clone. If you're in the main clone (your user may have started you there), make your own before
   changing anything, branched off the latest `main`, named for the task:
   ```bash
   git fetch origin
   git worktree add ../{{REPO}}-<task> -b <task> origin/main
   cd ../{{REPO}}-<task> && pnpm install
   ```
   and do all your work there (tell your user the folder). Already in a worktree on your own branch (your user made
   it, or started you with Claude Code's worktree option)? Carry on there. Never commit on `main` in the main clone
   (a hook blocks it), and don't touch other sessions' worktrees. The `git stash` is shared by every worktree, so a
   bare `git stash pop` can take another session's changes: set work aside with a temporary commit instead.
3. **Agree on the change.** Ask your user what they want if they haven't said, then tell them which files you'll touch
   and how it fits the architecture rules below, and wait for their OK.
4. **Run it locally.** `pnpm dev:all`: the game server on :8787 and Vite on :5173 (it forwards `/ws` to the server),
   both reloading as you save. Other sessions may be running theirs, so pick a free pair of ports: `ss -ltn` (Linux)
   or `lsof -iTCP -sTCP:LISTEN -P` (Mac) shows what's taken; then e.g. `PORT=5174 SERVER_PORT=8788 pnpm dev:all`
   (5175/8789, 5176/8790…). Open `http://localhost:<PORT>`; a second tab is a second player.
   Your user on a browser-based VS Code (code-server, its own page on `localhost:8080`)? Start it with
   `BASE=/absproxy/<PORT>/` in front and give them `http://localhost:8080/absproxy/<PORT>/` (see "Relative URLs").
   If they'll try it after your turn ends, start it detached (`setsid nohup … > /tmp/<task>-dev.log 2>&1 &`), or it
   dies with your session.
5. **Check before every commit:** `pnpm test && pnpm build && pnpm lint`. New game rules get a test in `tests/` (the
   sim is plain TS: see `tests/sim.test.ts`). Anything touching the server, the build or performance: also run the
   production build (`pnpm build && PORT=<free port> pnpm start`, then `pnpm smoke http://localhost:<port>`): one
   process serves the page and the WebSocket, as on Render. The dev build is much slower, so judge smoothness there.
6. **Ship it with `/ship`** (`.claude/skills/ship/SKILL.md`): document, commit, rebase onto `main`, check again,
   push, confirm the new commit is live and healthy, remove your worktree, and tell your user. Never force-push `main`.

**Setting up a machine** (once per machine; do it yourself, asking your user only for what needs them):
1. **Tools.** `git --version`; `node --version` must be 22 or newer (if not, ask your user to install it: on a Mac,
   `brew install node`); `pnpm --version` (missing: `corepack enable`, or `npm install -g corepack && corepack enable`
   on a Node without corepack; a permission error from `corepack enable` with pnpm already installed is fine).
   Optional: `gh` (the GitHub CLI) for issues and CI runs, `render` (the Render CLI) for deploy logs.
2. **The main clone.** If you aren't in a clone of `github.com/{{OWNER}}/{{REPO}}` (`git remote get-url origin`),
   clone it and work from there; worktrees go next to it. If a session starts in a folder above the clone, `cd` into
   the clone first.
3. **Pushing.** From the main clone, `git push --dry-run origin HEAD:main`: "Everything up-to-date" means git can push.
   If it fails to authenticate, see "Logging in to GitHub" below.
4. **Packages.** `pnpm install` in each worktree you work in (worktrees don't share `node_modules`).

**Logging in to GitHub** (a new machine, or a token that expired). Two ways; your user picks:
- **The GitHub CLI** (their own machine): run `gh auth login --web --hostname github.com --git-protocol https --scopes
  workflow` in the background. With no terminal attached it prints a one-time code and https://github.com/login/device,
  then waits. Give your user both; once they've approved it in the browser, run `gh auth setup-git` so git pushes with
  it. gh keeps the token in the system keyring, or in plain text in `~/.config/gh/hosts.yml` if there's none
  (`gh auth status` says which). That token reaches all their repos (`repo`, `read:org`, `gist`, and `workflow`, which
  pushing changes to `.github/workflows/` needs).
- **A token for this repo only** (a shared or temporary machine): your user makes a fine-grained token at
  https://github.com/settings/personal-access-tokens/new (repository access: only this repo; permissions: Contents,
  Workflows and Issues, read and write; an expiry date). You run
  `git config --global credential.https://github.com.helper store`, and they run `git push --dry-run origin HEAD:main`
  in the clone in their own terminal, giving their GitHub username and the token as the password. git saves it in
  `~/.git-credentials` (plain text, readable only by them). `gh` won't be logged in this way: do without it.

Leaving a shared machine: the token must be revoked on GitHub. `gh auth logout` only forgets it locally; gh's tokens
are revoked under https://github.com/settings/applications, fine-grained ones under
https://github.com/settings/personal-access-tokens.

**Secrets.** Tokens and API keys never go in a remote URL, a script, a file in the repo, a commit message or the chat:
your user types them into their own terminal or browser, and tools store them (`gh` in its own config or the system
keyring, git in its credential helper, Render's CLI in its own config). If your user is about to paste one into the
chat, stop them. Never print a stored token to check it: `gh auth status` and `git push --dry-run` say whether it works.

**What collides between parallel sessions:** {{HOT_FILES}} Two sessions reworking the same system don't mix, so if
your task overlaps one you know another session has, say so to your user before starting.

**When a deploy fails,** look at which step: CI on GitHub (`gh run view <id> --log-failed`: the same checks as step 5,
plus the smoke test), Render's `pnpm install` (see "A new dependency with an install script"), `pnpm build`, or the
server starting (it must listen on `$PORT` and answer `/healthz`). Old tabs open during a deploy run the old page
against the new server for a moment, so the client must cope with `GameState` fields it doesn't know yet, or that are
missing (use `??` with a default).

## Architecture rules

Carried over from the last game, where they earned their place. Change one only with your user's agreement, and
record why here.

- **The sim is pure TS** (`src/sim/`: `createGame()`, `tick(state, inputs)`): no DOM, no timers, no network, no
  `Date.now()`. It runs only on the server, and it's what the tests drive.
- **Randomness goes through a `rand` argument,** never `Math.random()` inside the sim, so tests can pass a fixed one.
- **Everything the client draws comes from `GameState`** (`src/shared/types.ts`), including the map. The view
  (`src/view/`) reads state; it never decides game rules.
- **Tuning numbers live in `src/shared/constants.ts`,** not scattered through the code.
- **The server is authoritative.** The client sends inputs whenever they change and draws the `GameState` it receives
  (`TICK_HZ` times a second). Client ↔ server messages are typed in `src/shared/protocol.ts`: a new one is added
  there, handled in `Room.receive` (`server/room.ts`), and given a sender in `src/net/index.ts`.
- **Code both sides run lives in `src/shared/`** (movement, once the client predicts its own player), pure and the
  same on both, changed in one place.
- **Every lobby is a room** (`/ws?room=CODE`, made if missing so invite links survive a restart). Anything per game
  belongs on `Room`, never in a module-level variable, or lobbies leak into each other.
- **Dead connections are dropped** by a heartbeat (`server/index.ts`) and a stuck-send check (`MAX_BUFFERED`), or a
  vanished tab keeps its player slot forever.
- **Inputs go through `InputLatch`** (`src/sim/latch.ts`): a button counts as pressed this tick if it went down at any
  moment since the last one, or quick taps between two ticks are lost. A new button is latched there too.
- **The server answers `/healthz`** with the deployed commit, keeps players' browser errors (`/client-errors`), and in
  production serves the built page and the WebSocket on one port, `$PORT`.

## Gotchas

- **Relative URLs everywhere** (`base` in `vite.config.ts`, assets as `icons/x.svg` not `/icons/x.svg`, `fetch('x')`
  not `fetch('/x')`, the socket at `ws` next to the page): the built page then works at Render's root and under any
  prefix. Vite's dev server always loads its own scripts from absolute paths, so behind code-server it needs
  `BASE=/absproxy/<port>/` and the `/absproxy/` address; `/proxy/<port>/` strips the prefix and shows a white screen.
- **Stopping a server:** find the PID listening on its port (`ss -ltnp | grep :<port>`, or `lsof -iTCP:<port>
  -sTCP:LISTEN`), check `/proc/<pid>/cwd` (Linux) is your own worktree, and kill it and its parent `sh` / `tsx`.
  Never `pkill -f` / `pgrep -f`: the pattern matches your own shell's command line and kills it (a hook blocks them).
- **A machine without a GPU can't judge how it looks.** Headless Chrome renders WebGL in software (SwiftShader),
  which hides exactly the bugs that matter on a real GPU (a NaN pixel that's white in software blacks out the screen
  through bloom on real hardware) and makes frame rates meaningless (draw calls and triangle counts still mean
  something). For visual or lighting work: measure brightness numerically, check custom shaders for NaN sources
  (`pow` of a negative, divide by zero, `normalize` of zero), say plainly what was only checked in software, read
  `/client-errors`, and ask your user for a screenshot as soon as something "can't be seen" instead of pushing another
  guess.
- **Compare performance against a build of `origin/main`** on the same machine, not against numbers written down
  earlier.
- **A deploy wipes the container's files.** Anything that must survive one needs a persistent disk (paid Render plans)
  or a database; rooms in memory start over (open tabs reconnect to the same room code).
- **Render's free plan sleeps** after about 15 idle minutes and takes up to a minute to wake: a first visit that hangs
  is that, not a crash.
- **A new dependency with an install script** (pnpm says "Ignored build scripts") must be allowed in
  `pnpm-workspace.yaml` (`allowBuilds`, or `pnpm approve-builds <pkg>`): a clean install, like CI's and Render's,
  fails otherwise, even though `pnpm install` on a machine that already has `node_modules` works.
- **three.js / react-three-fiber:** animate meshes in `useFrame` on refs, not with React state, so nothing re-renders
  60 times a second (`Avatar` in `src/view/Scene.tsx`); don't pass a moving object's position as a prop (it snaps back
  on every state); draw many copies of one thing as instances (every separate mesh is a draw call); never add or remove
  lights mid-game (three.js recompiles every shader when the light count changes); keep one place that calls
  `gl.render`.
- **Sound comes from state changes, not from the sim:** the client compares the state it just got with the last one
  and plays what changed. Check a new loud sound's level (peak and RMS, rendered offline) before shipping it.
- **In tests, compare free-moving positions rounded** (`round` in `tests/sim.test.ts`): floating-point movement adds
  noise in the last digits.

## How to…

- **Add a test:** `tests/<thing>.test.ts`, run by `pnpm test` (Node's test runner via `tsx`). Build a state with
  `createGame()` and `addPlayer()` with a fixed `rand`, step it with `tick()`, assert on the state.
- **Add a client ↔ server message:** the type in `src/shared/protocol.ts`, the handler in `Room.receive`, the sender
  in `src/net/index.ts`; the server checks every field it receives (a client can send anything: see `sanitize()`).
- **See what broke in players' browsers:** `curl -s {{LIVE_URL}}/client-errors` (the last 50 uncaught errors, each with
  the page's commit and browser; also in Render's logs as `[client-error]`). Locally, the same at your server's port.
- **Watch a deploy or read the live logs** with the Render CLI, if it's logged in on this machine
  (`render services -o json` works): `render deploys list {{RENDER_SERVICE_ID}} -o json` shows each deploy's status and
  commit, `render logs -r {{RENDER_SERVICE_ID}} --tail` follows the server's output, and
  `render deploys create {{RENDER_SERVICE_ID}} --wait` redeploys. Not installed: `brew install render`, or the install
  script at https://render.com/docs/cli. Not logged in: ask your user to run `render login` in their own terminal (it
  authorizes in the browser; the token is kept in `~/.render/cli.yaml` and expires now and then), or to read you the
  service's Events and Logs in the Render dashboard.
- **Change how it's hosted** (plan, disk, environment variables) in `render.yaml`, not in the dashboard: Render applies
  the file when it changes on `main`. The dashboard is for what the file mustn't hold: a secret goes in as an
  environment variable there, listed in the file with `sync: false`.
- **Undo a bad deploy:** `git revert <sha>` and push it (through `/ship`'s checks): faster and safer than debugging
  while the live game is broken. Then fix it properly.
