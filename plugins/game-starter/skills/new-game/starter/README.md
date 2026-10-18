# My Game

A multiplayer browser game. Play it at the live address, or run it yourself (below).

## How to play

Open the page: you're in a new room, and its code is in the address. **Copy invite link** and send it to friends: everyone
who opens it joins the same room (up to 8 players; more can watch).

- **WASD** or the **arrow keys**: move
- **Space**: hop

## Run it locally

Needs Node 22 or newer and pnpm (`corepack enable`).

```bash
pnpm install
pnpm dev:all        # the game server on :8787 and the page on http://localhost:5173
```

Open a second tab with the same address to play against yourself.

The production build, as it runs online: `pnpm build && pnpm start`, then http://localhost:8080.

## Code

- `src/sim/`: the rules (pure TypeScript, run by the server, tested in `tests/`)
- `src/shared/`: types, constants and messages both sides use
- `server/`: the game server (rooms, the WebSocket, health check, serving the built page)
- `src/view/`, `src/App.tsx`: the 3D view and the page
- Deployed on [Render](https://render.com) from `render.yaml` and the `Dockerfile` on every push to `main`, once the
  checks in `.github/workflows/ci.yml` pass.
