import type { Input } from './types.ts'

// Tuning numbers live here, not scattered through the code.

export const TICK_HZ = 30              // server ticks (and states sent) per second
export const MAX_PLAYERS = 8
export const ARENA = { w: 20, h: 14 }  // tiles
export const MOVE_SPEED = 5            // tiles per second
export const PLAYER_RADIUS = 0.4
export const HOP_SPEED = 5             // tiles per second, straight up
export const GRAVITY = 18              // tiles per second²

export const NO_INPUT: Input = { mx: 0, my: 0, hop: false }

export const PLAYER_COLORS = ['#e8553f', '#3f8ce8', '#f2c230', '#46b866', '#a35ce0', '#f08a2c', '#3cc4c4', '#e85fa8']
