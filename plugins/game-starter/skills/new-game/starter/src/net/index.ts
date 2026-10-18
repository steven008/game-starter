import { useCallback, useEffect, useRef, useState } from 'react'
import type { ClientMsg, ServerMsg } from '../shared/protocol.ts'
import type { GameState, Input, Slot } from '../shared/types.ts'

/** The room in the page's address (`?room=CODE`, an invite link), or null: the server then makes a new one. */
export const roomInUrl = () => new URLSearchParams(location.search).get('room')

/** Where to connect: next to the page (so it works under code-server's /proxy/<port>/), in the address's room. */
function wsUrl() {
  const room = roomInUrl()
  const dir = location.pathname.replace(/[^/]*$/, '')
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}${dir}ws${room ? `?room=${encodeURIComponent(room)}` : ''}`
}

/** An invite link to `room`: this page's address with the room's code. */
export const inviteLink = (room: string) => `${location.origin}${location.pathname}?room=${room}`

export function useConnection() {
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [mySlot, setMySlot] = useState<Slot | null>(null)
  const [room, setRoom] = useState<string | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    let alive = true
    let retry: ReturnType<typeof setTimeout>
    const connect = () => {
      const socket = new WebSocket(wsUrl())
      ws.current = socket
      setStatus('connecting')
      socket.onopen = () => setStatus('open')
      socket.onmessage = e => {
        const msg = JSON.parse(e.data) as ServerMsg
        if (msg.t === 'welcome') {
          setMySlot(msg.slot)
          setRoom(msg.room)
          // Put the room in the address, so a reload (or a reconnect after a deploy) comes back to it.
          if (roomInUrl() !== msg.room) {
            const url = new URL(location.href)
            url.searchParams.set('room', msg.room)
            history.replaceState(null, '', url)
          }
        } else if (msg.t === 'state') setState(msg.state)
      }
      socket.onclose = () => {
        setStatus('closed')
        if (alive) retry = setTimeout(connect, 1000)   // server restarted (a deploy)? keep trying
      }
    }
    connect()
    return () => {
      alive = false
      clearTimeout(retry)
      ws.current?.close()
    }
  }, [])

  const send = useCallback((msg: ClientMsg) => {
    if (ws.current?.readyState === WebSocket.OPEN) ws.current.send(JSON.stringify(msg))
  }, [])
  const sendInput = useCallback((input: Input) => send({ t: 'input', input }), [send])

  return { status, mySlot, room, state, sendInput }
}
