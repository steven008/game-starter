import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER = `localhost:${process.env.SERVER_PORT ?? '8787'}`
// Where the page is served from. Relative ('./') works at any site root and for the built page under any prefix.
// The dev server's own scripts are always absolute, so behind code-server run it with BASE=/absproxy/<port>/ and
// open http://localhost:8080/absproxy/<port>/ (absproxy keeps the prefix; /proxy/<port>/ strips it).
const BASE = process.env.BASE ?? './'
const PREFIX = BASE.startsWith('/') ? BASE : '/'
const toServer = (target: string) => ({ target, ws: target.startsWith('ws'), rewrite: (path: string) => path.slice(PREFIX.length - 1) })

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: BASE,
  build: {
    chunkSizeWarningLimit: 2000,   // kB: three.js and React alone are ~1 MB; split chunks when the game grows past this
  },
  define: {
    __COMMIT__: JSON.stringify(process.env.RENDER_GIT_COMMIT ?? 'dev'),
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 5173),
    strictPort: true,
    // The game server runs next to Vite; everything goes through this one port.
    proxy: {
      [`${PREFIX}ws`]: toServer(`ws://${SERVER}`),
      [`${PREFIX}healthz`]: toServer(`http://${SERVER}`),
      [`${PREFIX}client-error`]: toServer(`http://${SERVER}`),
    },
  },
})
