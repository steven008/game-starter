# game-starter

A Claude Code plugin that starts a new browser game with the workflow from Overcoded: a GitHub repo, checks on every
push, every push to `main` deployed by Render, and several Claude Code sessions working at once, each in its own git
worktree.

## Install it (once per machine)

In Claude Code:

```
/plugin marketplace add steven008/game-starter
/plugin install game-starter@game-starter
```

(or ask Claude to run `claude plugin marketplace add steven008/game-starter` and
`claude plugin install game-starter@game-starter`), then start a new session. `/plugin marketplace update` picks up
changes pushed here later.

## Start a game

Make an empty folder for it (with a parent of its own, since worktrees go next to it: e.g. `~/games/space-snails`),
start Claude Code there, and type `/new-game` (or say "start a new game"). Claude:

1. asks about the game (the idea and name, 3D or 2D, the Render plan, private or public, your own machine or a shared one);
2. logs in to GitHub: through the GitHub CLI (you approve a one-time code in your browser) or with a fine-grained
   token you make, limited to the one repo;
3. copies in the starter, names it, checks it and lets you try it locally;
4. creates the GitHub repo and pushes; GitHub Actions runs the checks;
5. gives you a "Deploy to Render" link (sign in, connect GitHub, choose the plan, Deploy);
6. checks it's live, then makes its first change through the normal workflow to prove a push deploys by itself.

From then on, start Claude in the game's folder and say what you want: its `CLAUDE.md` and `/ship` do the rest.

## What needs you

- **GitHub:** approving the one-time code, or making the token. Tokens never go in the chat.
- **Render:** the deploy link, once per game (Render's API can't create a service from `render.yaml`), and optionally
  `render login` in your own terminal so sessions can read deploy logs.
- **On a shared or temporary machine:** revoke the GitHub token when you leave it.

## What's in here

- `plugins/game-starter/skills/new-game/SKILL.md`: the setup steps `/new-game` follows.
- `plugins/game-starter/skills/new-game/starter/`: what every new game starts as:
  - a small multiplayer game: players move and hop in a 3D arena, rooms with invite links (three.js via
    `@react-three/fiber`, React, a Node `ws` game server, tests run with Node's test runner);
  - the server's `/healthz` reports the deployed commit, and players' browser errors are logged and listed at
    `/client-errors`, so agents can tell a deploy is live and see what broke on a real screen;
  - `render.yaml` and a `Dockerfile` (deploys only once CI passes), `.github/workflows/ci.yml` (tests, build, lint,
    and a smoke test of the production server, `pnpm smoke`);
  - `CLAUDE.md` (the workflow, architecture rules, gotchas, how-tos), `AGENTS.md`, and `.claude/`: a `/ship` skill
    (check, commit, rebase, push, confirm it's live, clean up) and a hook that blocks `pkill -f`, force-pushes,
    `git add -A` and commits on `main` in the main clone.
- `.github/workflows/starter.yml`: runs the starter's checks on every push here, so it stays working.

To change the starter, edit it in place, run `pnpm install && pnpm test && pnpm build && pnpm lint` in its folder,
and push.
