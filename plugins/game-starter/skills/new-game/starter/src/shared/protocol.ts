import type { GameState, Input, Slot } from './types.ts'

// Every message between the page and the server. A new one goes here, gets handled in Room.receive
// (server/room.ts) and a sender in src/net/index.ts.

export type ClientMsg =
  | { t: 'input'; input: Input }

export type ServerMsg =
  | { t: 'welcome'; room: string; slot: Slot | null }   // slot null: the room is full, you're watching
  | { t: 'state'; state: GameState }
