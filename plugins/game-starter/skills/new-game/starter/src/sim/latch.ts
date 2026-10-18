import { NO_INPUT } from '../shared/constants.ts'
import type { Input, Slot } from '../shared/types.ts'

/**
 * Collects inputs between server ticks. The sim sees one Input per tick, so a key that goes down and up between two
 * ticks (a quick tap) would be lost: take() reports a button as down if it's held now OR was pressed at any moment
 * since the last take(). The walk direction is the one held now, or if nothing is held, the last one seen since the
 * last take() (so a quick tap still nudges). A new button: latch it in set() and take() like `hop`.
 */
export class InputLatch {
  private held: Partial<Record<Slot, Input>> = {}
  private pressed: Partial<Record<Slot, Input>> = {}

  set(slot: Slot, raw: unknown) {
    const input = sanitize(raw)
    this.held[slot] = input
    const seen = this.pressed[slot] ?? NO_INPUT
    this.pressed[slot] = {
      mx: moving(input) ? input.mx : seen.mx,
      my: moving(input) ? input.my : seen.my,
      hop: seen.hop || input.hop,
    }
  }

  /** The player left. */
  remove(slot: Slot) {
    delete this.held[slot]
    delete this.pressed[slot]
  }

  /** This tick's inputs; starts collecting the next tick's. */
  take(): Partial<Record<Slot, Input>> {
    const out: Partial<Record<Slot, Input>> = {}
    for (const [key, held] of Object.entries(this.held)) {
      if (!held) continue
      const slot = Number(key)
      const pressed = this.pressed[slot] ?? NO_INPUT
      const dir = moving(held) ? held : pressed
      out[slot] = { mx: dir.mx, my: dir.my, hop: held.hop || pressed.hop }
    }
    this.pressed = {}
    return out
  }
}

const moving = (i: Input) => i.mx !== 0 || i.my !== 0

/** Inputs come from the network, so anything may arrive: keep the direction a finite vector no longer than 1. */
export function sanitize(raw: unknown): Input {
  const i = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  let mx = Number(i.mx) || 0
  let my = Number(i.my) || 0
  const len = Math.hypot(mx, my)
  if (!Number.isFinite(len)) [mx, my] = [0, 0]
  else if (len > 1) [mx, my] = [mx / len, my / len]
  return { mx, my, hop: i.hop === true }
}
