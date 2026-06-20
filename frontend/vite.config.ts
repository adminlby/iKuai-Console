import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const target = env.VITE_IKUAI_BASE || 'http://192.168.1.1'
  const svcPort = env.SVC_PORT || '5274'

  // Shared by the dev server AND `vite preview`. Without this on preview, a
  // production build would send /api & /svc to the static host → 404, because
  // the proxy is otherwise a dev-only feature.
  const proxy = {
    // The browser talks to Vite (same-origin) → no CORS / mixed-content.
    // /api/* is forwarded to the real iKuai device, server-side.
    '/api': {
      target,
      changeOrigin: true,
      secure: false, // iKuai often uses a self-signed https cert
    },
    // /svc/* → the local ISP-connectivity backend (backend/src/index.mjs).
    '/svc': {
      target: `http://localhost:${svcPort}`,
      changeOrigin: true,
    },
  }

  return {
    plugins: [react()],
    server: {
      host: true,        // listen on 0.0.0.0 so the LAN can reach it
      port: 5273,
      proxy,
    },
    preview: {
      host: true,
      port: Number(env.PREVIEW_PORT) || 5273,
      proxy,
    },
  }
})
