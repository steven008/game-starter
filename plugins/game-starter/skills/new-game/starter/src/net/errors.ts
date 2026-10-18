/**
 * Sends this page's uncaught errors to the server (server/clientErrors.ts), where they're logged and listed at
 * /client-errors: the way to see what went wrong on a player's real screen. Relative URL, like everything else.
 */
const MAX_REPORTS = 10   // per page load: an error in the render loop would otherwise fire 60 times a second

export function reportErrors() {
  const seen = new Set<string>()
  let sent = 0
  const report = (message: string, stack?: string) => {
    const key = `${message}\n${stack ?? ''}`
    if (seen.has(key) || sent >= MAX_REPORTS) return
    seen.add(key)
    sent++
    const body = JSON.stringify({
      message, stack, commit: __COMMIT__,
      page: location.pathname + location.search, agent: navigator.userAgent,
    })
    fetch('client-error', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true })
      .catch(() => { /* offline or server restarting: nothing to do */ })
  }
  addEventListener('error', e => report(e.message || String(e.error), e.error instanceof Error ? e.error.stack : undefined))
  addEventListener('unhandledrejection', e => {
    const r = e.reason
    report(r instanceof Error ? r.message : String(r), r instanceof Error ? r.stack : undefined)
  })
  // WebGL context loss (a GPU reset, too many contexts) shows as a frozen or black canvas with no error otherwise.
  addEventListener('webglcontextlost', () => report('WebGL context lost'), true)
}
