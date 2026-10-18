import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MOVE_SPEED, NO_INPUT, PLAYER_RADIUS, TICK_HZ } from '../src/shared/constants.ts'
import { addPlayer, createGame, removePlayer, tick } from '../src/sim/index.ts'
import { InputLatch, sanitize } from '../src/sim/latch.ts'
import type { GameState, Input } from '../src/shared/types.ts'

const half = () => 0.5   // a fixed rand: players spawn in the middle
const right: Input = { mx: 1, my: 0, hop: false }
const run = (s: GameState, input: Input, ticks: number) => {
  for (let i = 0; i < ticks; i++) s = tick(s, { 0: input })
  return s
}
const round = (n: number) => Math.round(n * 1000) / 1000   // free movement adds float noise in the last digits

test('a player joins in the middle with a fixed rand, and leaves', () => {
  const s = addPlayer(createGame(), 0, half)
  assert.deepEqual([s.players[0]?.x, s.players[0]?.y], [s.arena.w / 2, s.arena.h / 2])
  assert.equal(removePlayer(s, 0).players[0], undefined)
})

test('walking moves MOVE_SPEED tiles a second and turns the player', () => {
  const s = run(addPlayer(createGame(), 0, half), right, TICK_HZ)
  assert.equal(round(s.players[0]!.x), round(s.arena.w / 2 + MOVE_SPEED))
  assert.equal(s.players[0]!.angle, 0)
  assert.equal(s.tick, TICK_HZ)
})

test('the arena edge stops a player', () => {
  const s = run(addPlayer(createGame(), 0, half), right, TICK_HZ * 10)
  assert.equal(s.players[0]!.x, s.arena.w - PLAYER_RADIUS)
})

test('a hop goes up and comes back down', () => {
  let s = run(addPlayer(createGame(), 0, half), { ...NO_INPUT, hop: true }, 1)
  assert.ok(s.players[0]!.z > 0)
  s = run(s, NO_INPUT, TICK_HZ * 2)
  assert.equal(s.players[0]!.z, 0)
})

test('the latch keeps a tap that starts and ends between two ticks', () => {
  const latch = new InputLatch()
  latch.set(0, { mx: 0, my: 0, hop: true })
  latch.set(0, { mx: 0, my: 0, hop: false })
  assert.equal(latch.take()[0]?.hop, true)
  assert.equal(latch.take()[0]?.hop, false)
})

test('inputs from the network are cleaned up', () => {
  assert.deepEqual(sanitize({ mx: 3, my: 4, hop: 'yes' }), { mx: 0.6, my: 0.8, hop: false })
  assert.deepEqual(sanitize({ mx: Infinity, my: 1 }), { mx: 0, my: 0, hop: false })
  assert.deepEqual(sanitize(null), NO_INPUT)
})
