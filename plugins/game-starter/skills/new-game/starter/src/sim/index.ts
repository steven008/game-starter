import { ARENA, GRAVITY, HOP_SPEED, MOVE_SPEED, NO_INPUT, PLAYER_RADIUS, TICK_HZ } from '../shared/constants.ts'
import type { GameState, Input, Slot } from '../shared/types.ts'

/**
 * The game's rules: plain TS, no DOM, no timers, no network. The server runs it (server/room.ts); the tests drive it
 * directly. Randomness comes in as `rand` so tests can pass a fixed one.
 */
export type Rand = () => number

const DT = 1 / TICK_HZ

export function createGame(): GameState {
  return { tick: 0, arena: { ...ARENA }, players: {} }
}

/** A player joins: they appear somewhere on the floor, clear of the edges. */
export function addPlayer(s: GameState, slot: Slot, rand: Rand): GameState {
  const margin = 1
  const x = margin + rand() * (s.arena.w - 2 * margin)
  const y = margin + rand() * (s.arena.h - 2 * margin)
  return { ...s, players: { ...s.players, [slot]: { slot, x, y, z: 0, vz: 0, angle: 0 } } }
}

export function removePlayer(s: GameState, slot: Slot): GameState {
  const players = { ...s.players }
  delete players[slot]
  return { ...s, players }
}

/** One tick: everyone moves by their input. Returns a new state (the old one is left as it was). */
export function tick(s: GameState, inputs: Partial<Record<Slot, Input>>): GameState {
  const players: GameState['players'] = {}
  for (const p of Object.values(s.players)) {
    if (!p) continue
    const input = inputs[p.slot] ?? NO_INPUT
    const len = Math.hypot(input.mx, input.my)
    const [dx, dy] = len > 1 ? [input.mx / len, input.my / len] : [input.mx, input.my]
    const x = clamp(p.x + dx * MOVE_SPEED * DT, PLAYER_RADIUS, s.arena.w - PLAYER_RADIUS)
    const y = clamp(p.y + dy * MOVE_SPEED * DT, PLAYER_RADIUS, s.arena.h - PLAYER_RADIUS)
    const angle = len > 0 ? Math.atan2(dy, dx) : p.angle
    let { z, vz } = p
    if (input.hop && z === 0) vz = HOP_SPEED
    if (z > 0 || vz > 0) {
      vz -= GRAVITY * DT
      z = Math.max(0, z + vz * DT)
      if (z === 0) vz = 0
    }
    players[p.slot] = { ...p, x, y, z, vz, angle }
  }
  return { ...s, tick: s.tick + 1, players }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
