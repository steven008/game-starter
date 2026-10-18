/** A player's place in the room: 0 … MAX_PLAYERS - 1. Colours and spawn points are per slot. */
export type Slot = number

/** What a player is pressing, sent to the server whenever it changes. */
export interface Input {
  mx: number        // walk direction, -1 … 1 (right is +x)
  my: number        // -1 … 1 (down the screen is +y)
  hop: boolean      // the action key: a hop, for now
}

export interface Player {
  slot: Slot
  x: number         // tile coordinates on the arena floor, decimals: players move freely
  y: number
  z: number         // height of their feet off the floor
  vz: number
  angle: number     // the way they face, radians (0 = +x)
}

/** Everything the client draws. The server sends it every tick; the sim makes the next one from it. */
export interface GameState {
  tick: number
  arena: { w: number; h: number }
  players: Partial<Record<Slot, Player>>
}
