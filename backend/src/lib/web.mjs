// Static file serving (the built frontend) + reverse proxy for /api -> iKuai.
// Enabled only when FRONTEND_DIR is set, so dev (Vite proxy) is unaffected.
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8',
}

/**
 * Reverse-proxy a browser /api/* request to the iKuai device.
 * The backend injects the Bearer token, so the token never needs to ship in the
 * frontend bundle. Tolerates the device's self-signed cert (rejectUnauthorized:false).
 */
export function proxyApi(req, res, env) {
  let u
  try { u = new URL(env.IKUAI_BASE) } catch { res.writeHead(500); return res.end('bad IKUAI_BASE') }
  const mod = u.protocol === 'http:' ? http : https
  const headers = { ...req.headers, host: u.host }
  if (env.IKUAI_TOKEN) headers.authorization = `Bearer ${env.IKUAI_TOKEN}`
  delete headers['accept-encoding'] // avoid double-compression surprises

  const preq = mod.request({
    protocol: u.protocol, hostname: u.hostname,
    port: u.port || (u.protocol === 'http:' ? 80 : 443),
    path: req.url, method: req.method, headers,
    rejectUnauthorized: false, timeout: 10000,
  }, (pres) => {
    res.writeHead(pres.statusCode || 502, pres.headers)
    pres.pipe(res)
  })
  preq.on('error', (e) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: `iKuai 不可达: ${e.message}` }))
  })
  preq.on('timeout', () => preq.destroy(new Error('timeout')))
  req.pipe(preq)
}

/** Serve a static file from `dir`, with SPA fallback to index.html. */
export function serveStatic(req, res, dir) {
  const root = path.resolve(dir)
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = path.join(root, pathname)
  if (!file.startsWith(root)) file = path.join(root, 'index.html') // block path traversal
  fs.stat(file, (err, st) => {
    if (err || st.isDirectory()) return sendFile(res, path.join(root, 'index.html'))
    sendFile(res, file)
  })
}

function sendFile(res, file) {
  fs.readFile(file, (e, buf) => {
    if (e) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('not found') }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' })
    res.end(buf)
  })
}
