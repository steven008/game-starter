import { useState } from 'react'
import { useKeyboard } from './input/keys.ts'
import { inviteLink, useConnection } from './net/index.ts'
import { Scene } from './view/Scene.tsx'

export function App() {
  const { status, mySlot, room, state, sendInput } = useConnection()
  const [copied, setCopied] = useState(false)
  useKeyboard(sendInput)

  const copy = async () => {
    if (!room) return
    try {
      await navigator.clipboard.writeText(inviteLink(room))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* no clipboard permission: the link is in the address bar anyway */ }
  }

  return (
    <div className="game">
      {state ? <Scene state={state} mySlot={mySlot} /> : <div className="message">Connecting…</div>}
      <div className="hud">
        <span className={`dot ${status}`} title={status} />
        {room && <span>Room <b>{room}</b></span>}
        {room && <button onClick={copy}>{copied ? 'Copied!' : 'Copy invite link'}</button>}
        {mySlot === null && state && <span>Room full: watching</span>}
        <span className="keys">WASD / arrows to move, Space to hop</span>
      </div>
    </div>
  )
}
