---
name: new-game
description: Start a new multiplayer browser game from a tested starter (three.js + a Node game server), with its own GitHub repo, checks on every push, deploys to Render, and a CLAUDE.md workflow for parallel agent sessions in git worktrees. Use when the user wants to start, create, set up or bootstrap a new game or game project.
argument-hint: "[the game idea]"
---

# Start a new game

Your user wants a new browser game set up with their usual workflow: a GitHub repo, every push to `main` checked by
GitHub Actions and then deployed by Render, and agent sessions working in parallel git worktrees, all described in the
game's own `CLAUDE.md`. This session sets that up and ends with a tiny playable game live on the internet. The starter
is in `${CLAUDE_SKILL_DIR}/starter/`: a working, tested game (players move and hop in a 3D arena, rooms with invite
links), plus its `CLAUDE.md`, CI, Render blueprint, Claude Code hooks and a `/ship` skill. Read
`${CLAUDE_SKILL_DIR}/starter/CLAUDE.md` before you start: its "Logging in to GitHub", "Secrets" and Gotchas apply now.

The game idea, if given: $ARGUMENTS

Work through these in order. Steps 3 and 7 need your user; do everything else yourself.

1. **Ask your user** (one message, with defaults they can just accept):
   - the game in a sentence or two, and its name; the repo name follows (`kebab-case` or `PascalCase`, their choice);
   - **3D or 2D?** The starter is 3D (three.js via `@react-three/fiber`). 2D: you'll swap its view for a `<canvas>`
     one in step 5. Either way it has the game server: a single-player game runs fine as a one-player room, and
     adding multiplayer later is a rewrite while removing it is deleting files;
   - **Render plan:** `free` (sleeps after 15 idle minutes, up to a minute to wake) or `0.5c-512mb` (about $7 a month,
     always on, can have a persistent disk);
   - private or public repo (private by default);
   - is this machine their own, or shared / temporary (a cloud VM, a workshop box)? That decides how GitHub is logged
     in (step 3).
2. **Where and what.** The folder you're in becomes the game's main clone, and worktrees go next to it
   (`../<repo>-<task>`), so it should be an empty folder named for the game with a parent of its own (e.g.
   `~/games/<repo>`). Not empty, already a git repo, or a home folder? Ask where to make it instead and work there.
   Tools: "Setting up a machine" step 1 in the starter's CLAUDE.md, plus `gh --version` for the GitHub CLI way in step 3
   (missing: `brew install gh` on a Mac; on Linux ask your user to install it,
   https://github.com/cli/cli/blob/trunk/docs/install_linux.md, the apt repo needs `sudo`).
3. **Log in to GitHub.** `gh auth status` first: logged in with the `repo` and `workflow` scopes is all you need (only
   `repo`: `gh auth refresh --scopes workflow`, run in the background like the login). Otherwise follow "Logging in to
   GitHub" in the starter's CLAUDE.md. Tell your user what each way gives an agent on this machine (all their repos, or
   only this one) before they choose. For the token way the repo must exist before a token can be limited to it: your
   user first makes it, empty, at https://github.com/new (the name and visibility from step 1; no README, licence or
   .gitignore), then makes the token.
4. **Copy the starter in:** `cp -R "${CLAUDE_SKILL_DIR}/starter/." . && rm -rf node_modules dist`, then
   `pnpm install` (the lockfile's versions are the tested ones), and `pnpm test && pnpm build && pnpm lint`.
5. **Make it theirs:**
   - the name: `package.json`'s `name` (kebab-case), `index.html`'s `<title>`, `render.yaml`'s service `name`
     (lower-case kebab: it becomes `https://<name>.onrender.com` if free) and `plan`, `README.md`'s title and first line;
   - in `CLAUDE.md`, fill in `{{GAME}}`, `{{PITCH}}`, `{{OWNER}}` (their GitHub account: `gh api user --jq .login`, or
     ask), `{{REPO}}` and `{{HOT_FILES}}` (a first guess: `src/sim/index.ts`, `src/shared/types.ts` and `constants.ts`,
     `src/view/Scene.tsx`, `server/room.ts`). `{{LIVE_URL}}` and `{{RENDER_SERVICE_ID}}` wait for step 8;
   - **2D:** replace `src/view/Scene.tsx` with a `<canvas>` view (a `requestAnimationFrame` loop drawing from the latest
     state, easing players towards it, the same `Scene` props), `pnpm remove three @react-three/fiber @types/three`,
     and in `CLAUDE.md` say "a 2D `<canvas>` view" in the intro and drop the three.js gotcha;
   - nothing of the game idea itself yet: the first feature is the first task through the Workflow, once this is live.
6. **Check it, commit it, try it.** `pnpm test && pnpm build && pnpm lint`; the production build on a free port
   (`PORT=<port> pnpm start` detached, `pnpm smoke http://localhost:<port>`, then stop it by its PID). Then
   `git init -b main` and stage the starter's files by name (`git add .claude .github .gitignore .dockerignore
   .oxlintrc.json AGENTS.md CLAUDE.md Dockerfile README.md index.html package.json pnpm-lock.yaml pnpm-workspace.yaml
   render.yaml scripts server src tests tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.server.json
   vite.config.ts`; `git status` then shows nothing left over) and commit ("Start <the game> from the game starter").
   Newer packages: `pnpm up --latest`, check again, and commit that separately ("Update packages") if the checks pass,
   or `git checkout -- package.json pnpm-lock.yaml && pnpm install` if they don't (say which). Start the dev servers
   detached on free ports and give your user the link to try (code-server: the `BASE=/absproxy/<port>/` way).
7. **Make the repo, push, deploy.**
   - With gh: `gh repo create <repo> --private --source . --remote origin --push` (`--public` if they chose that).
     With a token: `git remote add origin https://github.com/<owner>/<repo>.git`, set the credential helper as in
     "Logging in to GitHub", and your user runs `git push -u origin main` in their own terminal.
   - CI runs on that push: `gh run watch` (or ask your user to look at the repo's Actions tab). It must pass, since
     Render only deploys commits whose checks pass.
   - Render makes a service from `render.yaml` only through its dashboard (its API can't create a Blueprint), so this
     is your user's part, a few clicks: give them `https://render.com/deploy?repo=https://github.com/<owner>/<repo>`.
     They sign in or sign up, connect GitHub when asked (installing Render's GitHub app with access to this repo; a
     private repo needs it), check the service and plan, and click Deploy (a paid plan asks for a card). Ask them for
     the service's address (`https://<name>.onrender.com`, maybe with a suffix if the name was taken) and its ID
     (`srv-…`, in the dashboard's URL for the service).
   - Offer the Render CLI, so later sessions can read deploy logs themselves: your user runs `render login` in their own
     terminal (CLAUDE.md, "Watch a deploy or read the live logs"). Don't ask for a Render API key: it reaches every
     workspace on their account and never expires.
8. **Check it's live:** `pnpm smoke <live url> $(git rev-parse HEAD)` (it waits up to a minute for a sleeping free
   service; the first deploy takes a few minutes, so retry a few times). Open the page yourself if you can, and give
   your user the address to try with a friend (the Copy invite link button).
9. **The first change goes through the Workflow,** to prove the whole loop: in a worktree
   (`git worktree add ../<repo>-setup -b setup origin/main`), fill in `{{LIVE_URL}}` and `{{RENDER_SERVICE_ID}}` in
   `CLAUDE.md` and add the live address to `README.md`, then follow `.claude/skills/ship/SKILL.md` (this session
   started before the game's own settings existed, so its hooks and `/ship` aren't loaded here: read the file and do
   what it says). That push must deploy by itself once CI passes: the healthz check in the ship steps shows it did.
10. **Wrap up.** If your user starts Claude from a folder above the clone, offer to put a short `CLAUDE.md` there
    pointing at the clone. Tell your user: the live address, the repo, where the clone is, and how to carry on (start
    Claude in the clone, accept its project settings when asked, so the hooks and `/ship` load; say what you want; the
    game idea's first feature is a good first task, or file a few as GitHub issues); anything left on their side
    (revoking a token when they leave a shared machine, the Render plan).
