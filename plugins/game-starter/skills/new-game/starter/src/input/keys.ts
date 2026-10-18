import { useEffect } from 'react'
import type { Input } from '../shared/types.ts'

const KEYS: Record<string, keyof typeof held> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'hop',
}
const held = { up: false, down: false, left: false, right: false, hop: false }

function toInput(): Input {
  return {
    mx: (held.right ? 1 : 0) - (held.left ? 1 : 0),
    my: (held.down ? 1 : 0) - (held.up ? 1 : 0),
    hop: held.hop,
  }
}

/** Keyboard → Input, sent whenever it changes (the server's InputLatch keeps quick taps). */
export function useKeyboard(send: (input: Input) => void) {
  useEffect(() => {
    let last = ''
    const update = () => {
      const input = toInput()
      const key = JSON.stringify(input)
      if (key !== last) {
        last = key
        send(input)
      }
    }
    const down = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (!k || e.ctrlKey || e.metaKey || e.altKey) return
      e.preventDefault()
      held[k] = true
      update()
    }
    const up = (e: KeyboardEvent) => {
      const k = KEYS[e.code]
      if (!k) return
      held[k] = false
      update()
    }
    const blur = () => {   // alt-tabbing away mid-press would leave a key stuck down
      for (const k of Object.keys(held) as (keyof typeof held)[]) held[k] = false
      update()
    }
    addEventListener('keydown', down)
    addEventListener('keyup', up)
    addEventListener('blur', blur)
    return () => {
      removeEventListener('keydown', down)
      removeEventListener('keyup', up)
      removeEventListener('blur', blur)
    }
  }, [send])
}
