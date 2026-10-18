import type { IncomingMessage, ServerResponse } from 'node:http'

const KEEP = 50               // most recent errors kept for GET /client-errors
const MAX_BODY = 8 * 1024     // bytes: a report bigger than this is cut off
const PER_MINUTE = 30         // reports accepted from one address per minute

export interface ClientError {
  at: string                  // ISO time the server got it
  message: string
  stack?: string
  page?: string               // the page's path and query (the room code), no host
  agent?: string              // the browser's user agent
  commit?: string             // the build the page was running
}

/**
 * Errors from players' browsers (src/net/errors.ts posts them), so an agent can see what broke on a real screen and a
 * real GPU without asking for a screenshot: each one is logged (`[client-error] …`, in Render's logs) and the last
 * KEEP are served at GET /client-errors. Public on purpose (no secrets in it), so keep it to error text.
 */
export class ClientErrors {
  private errors: ClientError[] = []
  private counts = new Map<string, { minute: number; n: number }>()

  recent(): ClientError[] {
    return this.errors
  }

  receive(req: IncomingMessage, res: ServerResponse) {
    const from = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '?').split(',')[0].trim()
    const minute = Math.floor(Date.now() / 60_000)
    const count = this.counts.get(from)
    if (count?.minute === minute && count.n >= PER_MINUTE) {
      res.writeHead(429)
      return res.end()
    }
    this.counts.set(from, { minute, n: count?.minute === minute ? count.n + 1 : 1 })
    if (this.counts.size > 10_000) this.counts.clear()

    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      if (body.length < MAX_BODY) body += chunk
    })
    req.on('end', () => {
      res.writeHead(204)
      res.end()
      let raw: Record<string, unknown>
      try {
        raw = JSON.parse(body.slice(0, MAX_BODY))
      } catch {
        return
      }
      const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined)
      const error: ClientError = {
        at: new Date().toISOString(),
        message: text(raw.message, 500) ?? '(no message)',
        stack: text(raw.stack, 3000),
        page: text(raw.page, 200),
        agent: text(raw.agent ?? req.headers['user-agent'], 300),
        commit: text(raw.commit, 64),
      }
      this.errors = [...this.errors.slice(1 - KEEP), error]
      console.log(`[client-error] ${error.message} (page ${error.page ?? '?'}, ${error.agent ?? '?'})${error.stack ? `\n${error.stack}` : ''}`)
    })
  }
}
