import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { WebSocketServer, type WebSocket } from 'ws'
import { TICK_HZ } from '../src/shared/constants.ts'
import { ClientErrors } from './clientErrors.ts'
import { Room } from './room.ts'

/**
 * The game server: every invite link is a room (`/ws?room=CODE`, server/room.ts). In development Vite serves the page
 * and forwards /ws here; in production (STATIC_DIR set, see `pnpm start`) this one process also serves the built page
 * (`pnpm build` → dist/), so a single port is all there is.
 */
const PORT = Number(process.env.SERVER_PORT ?? 8787)
const STATIC_DIR = process.env.STATIC_DIR ? resolve(process.env.STATIC_DIR) : null
const COMMIT = process.env.RENDER_GIT_COMMIT ?? 'dev'   // Render sets it; /healthz reports it so agents can tell a deploy is live
// Tabs that vanish without closing (laptop asleep, Wi-Fi gone, killed through a proxy) would otherwise keep their
// slot forever. Drop them:
const HEARTBEAT_MS = 5000             // ping everyone this often; no pong by the next ping = gone
const ROOM_IDLE_MS = 10 * 60_000      // a room nobody's in is forgotten after this long
const MAX_ROOMS = 200                 // so a public server can't be filled up with rooms
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   // no I/1 or O/0: easy to read out
const CODE_LENGTH = 4

const rooms = new Map<string, Room>()
const alive = new WeakMap<WebSocket, boolean>()   // answered the last heartbeat ping
const clientErrors = new ClientErrors()

/** A room code as asked for in a link, tidied up (upper case), or null if it isn't one. */
function roomCode(raw: string | null): string | null {
  const code = (raw ?? '').trim().toUpperCase()
  return /^[A-Z0-9]{3,8}$/.test(code) ? code : null
}

function newCode(): string {
  for (;;) {
    const code = Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
    if (!rooms.has(code)) return code
  }
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.glb': 'model/gltf-binary',
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** Plain HTTP: the health check, the browser error log, and in production the built page. */
function serve(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  // Relative to wherever the page is (code-server serves it under /proxy/<port>/), so match on the end of the path.
  const route = url.pathname.replace(/^.*\//, '')
  if (route === 'healthz') return json(res, 200, { ok: true, commit: COMMIT, rooms: rooms.size })
  if (route === 'client-error' && req.method === 'POST') return clientErrors.receive(req, res)
  if (route === 'client-errors' && req.method === 'GET') return json(res, 200, clientErrors.recent())
  if (!STATIC_DIR || (req.method !== 'GET' && req.method !== 'HEAD')) {
    res.writeHead(404)
    return res.end()
  }
  let path: string
  try {
    path = decodeURIComponent(url.pathname)
  } catch {
    res.writeHead(400)
    return res.end()
  }
  let file = resolve(STATIC_DIR, `.${path}`)
  if (file !== STATIC_DIR && !file.startsWith(STATIC_DIR + sep)) {   // ../ out of the folder
    res.writeHead(403)
    return res.end()
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(STATIC_DIR, 'index.html')
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    // Built files have a hash in their name, so they never change; the page itself must always be fresh.
    'cache-control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

const http = createServer(serve)
// Compressed: a state is mostly the last one again, so this cuts most of the traffic.
const wss = new WebSocketServer({ server: http, perMessageDeflate: true })

wss.on('connection', (ws, req) => {
  alive.set(ws, true)
  ws.on('pong', () => alive.set(ws, true))
  ws.on('error', () => ws.terminate())
  // The room in the link, made if it doesn't exist (so a link still works after a restart), else a new one.
  const asked = roomCode(new URL(req.url ?? '/', 'http://localhost').searchParams.get('room'))
  const code = asked && (rooms.has(asked) || rooms.size < MAX_ROOMS) ? asked : rooms.size < MAX_ROOMS ? newCode() : null
  if (!code) return ws.close(1013, 'Too many rooms, try again later')
  let room = rooms.get(code)
  if (!room) {
    room = new Room(code)
    rooms.set(code, room)
    console.log(`room ${code} opened (${rooms.size} rooms)`)
  }
  room.join(ws)
})

setInterval(() => {
  const now = Date.now()
  for (const room of rooms.values()) {
    if (room.clients.size > 0) room.tick()
    else if (room.emptySince !== null && now - room.emptySince > ROOM_IDLE_MS) {
      rooms.delete(room.code)
      console.log(`room ${room.code} closed, empty (${rooms.size} rooms)`)
    }
  }
}, 1000 / TICK_HZ)

setInterval(() => {
  for (const room of rooms.values()) {
    for (const ws of room.clients.keys()) {
      if (!alive.get(ws)) {
        console.log(`[${room.code}] dropping a client: no heartbeat`)
        ws.terminate()   // fires 'close', which frees the slot
        continue
      }
      alive.set(ws, false)
      ws.ping()
    }
  }
}, HEARTBEAT_MS)

http.listen(PORT, () => {
  console.log(`Game server on port ${PORT}, commit ${COMMIT}${STATIC_DIR ? `, serving ${STATIC_DIR}` : ' (the page comes from Vite)'}`)
})
