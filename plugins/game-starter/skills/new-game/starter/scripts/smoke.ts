import { WebSocket } from 'ws'
import type { ServerMsg } from '../src/shared/protocol.ts'

/**
 * Checks a running production server end to end, without a browser: `pnpm smoke <url> [commit]`.
 * /healthz answers (with that commit, if given), the page and every script and stylesheet it links load, and a
 * WebSocket joins a room and gets a state. CI runs it against `pnpm start`; after a deploy, run it against the live
 * address. Waits up to a minute for the server to come up (Render's free plan wakes slowly).
 */
const [base = 'http://localhost:8080', commit] = process.argv.slice(2)
const url = (path: string) => new URL(path, base.endsWith('/') ? base : `${base}/`).href

async function get(path: string): Promise<Response> {
  const res = await fetch(url(path))
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res
}

async function waitForHealth(): Promise<{ commit: string }> {
  const until = Date.now() + 60_000
  for (;;) {
    try {
      return (await (await get('healthz')).json()) as { commit: string }
    } catch (e) {
      if (Date.now() > until) throw e
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

function joinRoom(): Promise<ServerMsg[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url('ws?room=SMOKE').replace(/^http/, 'ws'))
    const got: ServerMsg[] = []
    const timer = setTimeout(() => (ws.terminate(), reject(new Error(`WebSocket: only got ${JSON.stringify(got)}`))), 10_000)
    ws.on('message', data => {
      got.push(JSON.parse(data.toString()))
      if (got.some(m => m.t === 'welcome') && got.some(m => m.t === 'state')) {
        clearTimeout(timer)
        ws.close()
        resolve(got)
      }
    })
    ws.on('error', e => (clearTimeout(timer), reject(e)))
  })
}

const health = await waitForHealth()
console.log(`healthz: ok, commit ${health.commit}`)
if (commit && !health.commit.startsWith(commit) && !commit.startsWith(health.commit)) {
  throw new Error(`the server runs commit ${health.commit}, not ${commit}: the deploy hasn't happened (or failed)`)
}
const page = await (await get('')).text()
const assets = [...page.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(m => m[1])
if (!assets.length) throw new Error('the page links no scripts: is this the built page?')
for (const asset of assets) await get(asset)
console.log(`page: ok, ${assets.length} asset(s) load`)
const msgs = await joinRoom()
const welcome = msgs.find(m => m.t === 'welcome')
console.log(`websocket: ok, joined room ${welcome?.t === 'welcome' ? welcome.room : '?'}`)
console.log('smoke test passed')
