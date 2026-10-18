import { WebSocket } from 'ws'
import { addPlayer, createGame, removePlayer, tick } from '../src/sim/index.ts'
import { InputLatch } from '../src/sim/latch.ts'
import { MAX_PLAYERS } from '../src/shared/constants.ts'
import type { ClientMsg, ServerMsg } from '../src/shared/protocol.ts'
import type { GameState, Slot } from '../src/shared/types.ts'

const MAX_BUFFERED = 1 << 20   // bytes of unsent state: a client this far behind isn't reading, so it's dropped

export function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg))
}

/**
 * One lobby and the game played in it (server/index.ts keeps one per room code, so each invite link is its own game).
 * Anything per game lives here, never in a module-level variable, or lobbies leak into each other.
 */
export class Room {
  readonly code: string
  readonly clients = new Map<WebSocket, Slot | null>()   // null: watching (the room was full)
  emptySince: number | null = null                         // when the last player left (index.ts forgets idle rooms)
  private readonly inputs = new InputLatch()               // keeps quick taps that start and end between two ticks
  private state: GameState = createGame()

  constructor(code: string) {
    this.code = code
  }

  join(ws: WebSocket) {
    const taken = new Set(this.clients.values())
    const free = Array.from({ length: MAX_PLAYERS }, (_, i) => i).find(i => !taken.has(i))
    const slot = free ?? null
    this.clients.set(ws, slot)
    this.emptySince = null
    if (slot !== null) this.state = addPlayer(this.state, slot, Math.random)
    this.log(`P${slot === null ? '-' : slot + 1} joined (${this.clients.size} here)`)
    send(ws, { t: 'welcome', room: this.code, slot })
    send(ws, { t: 'state', state: this.state })
    ws.on('message', data => this.receive(ws, data.toString()))
    ws.on('close', () => this.leave(ws))
  }

  private leave(ws: WebSocket) {
    const slot = this.clients.get(ws)
    if (slot === undefined) return
    this.clients.delete(ws)
    if (slot !== null) {
      this.inputs.remove(slot)
      this.state = removePlayer(this.state, slot)
    }
    if (this.clients.size === 0) this.emptySince = Date.now()
    this.log(`P${slot === null ? '-' : slot + 1} left (${this.clients.size} here)`)
  }

  /** A message from a client: anything may arrive, so check it before acting on it. */
  private receive(ws: WebSocket, raw: string) {
    let msg: ClientMsg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }
    const slot = this.clients.get(ws)
    if (slot === undefined || slot === null) return
    if (msg?.t === 'input') this.inputs.set(slot, msg.input)
  }

  /** One server tick: step the sim with this tick's inputs and send everyone the new state. */
  tick() {
    this.state = tick(this.state, this.inputs.take())
    const msg = JSON.stringify({ t: 'state', state: this.state } satisfies ServerMsg)
    for (const ws of this.clients.keys()) {
      if (ws.bufferedAmount > MAX_BUFFERED) {
        this.log('dropping a client that stopped reading')
        ws.terminate()
      } else if (ws.readyState === WebSocket.OPEN) ws.send(msg)
    }
  }

  private log(line: string) {
    console.log(`[${this.code}] ${line}`)
  }
}
