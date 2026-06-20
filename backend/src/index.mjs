// iKuai Console — ISP connectivity backend.
// Probes external reachability + latency every PROBE_INTERVAL_MS, persists each
// sample to MySQL, and serves aggregates (uptime %, latency, ISP name) over HTTP.
import http from 'node:http'
import { env } from './lib/env.mjs'
import { initDb, dbReady, insertProbe, latest, rowsSince, uptimePct, getUser, userCount, addUser } from './lib/db.mjs'
import { runProbe } from './lib/probe.mjs'
import { proxyApi, serveStatic } from './lib/web.mjs'
import { hashPassword, verifyPassword, signToken, sessionFromReq, setCookieHeader, clearCookieHeader } from './lib/auth.mjs'

let last = null   // last probe record (carries ISP-lookup cache between runs)

async function tick() {
  try {
    last = await runProbe(last)
    try {
      await insertProbe(last)
    } catch (e) {
      console.error('[db] write failed (probe kept in memory):', e.message)
    }
    const l = last.lat
    console.log(`[probe] ${new Date(last.ts * 1000).toLocaleTimeString()} ` +
      `online=${last.online} isp="${last.isp ?? '?'}" ` +
      `cf=${l.cloudflare ?? 'x'} g=${l.google ?? 'x'} gh=${l.github ?? 'x'} ms=${l.microsoft ?? 'x'} isp=${l.isp ?? 'x'}`)
  } catch (e) {
    console.error('[probe] failed:', e.message)
  }
}

/** Build the segmented-bar buckets for the ISP-performance widget. */
async function buildHistory(hours, buckets) {
  const nowSec = Math.floor(Date.now() / 1000)
  const span = hours * 3600
  const size = span / buckets
  const rows = await rowsSince(nowSec - span)
  const out = []
  for (let i = 0; i < buckets; i++) {
    const t0 = nowSec - span + i * size
    const t1 = t0 + size
    const inBucket = rows.filter((r) => r.ts >= t0 && r.ts < t1)
    if (!inBucket.length) { out.push({ t0: Math.round(t0), ratio: null, online: 0, n: 0, avgLat: null }); continue }
    const up = inBucket.reduce((s, r) => s + r.online, 0)
    const lats = inBucket.flatMap((r) => [r.lat_cloudflare, r.lat_google, r.lat_github, r.lat_microsoft]).filter((v) => v != null)
    const avgLat = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null
    out.push({ t0: Math.round(t0), ratio: up / inBucket.length, online: up, n: inBucket.length, avgLat })
  }
  return out
}

async function summary() {
  const nowSec = Math.floor(Date.now() / 1000)
  // fall back to the in-memory `last` probe when the DB has no row yet
  const l = (await latest()) ?? (last ? toRow(last) : null)
  return {
    isp: l?.isp ?? null,
    ip: l?.ip ?? null,
    online: l ? !!l.online : null,
    latencies: l ? {
      isp: l.lat_isp, cloudflare: l.lat_cloudflare, google: l.lat_google,
      github: l.lat_github, microsoft: l.lat_microsoft,
    } : null,
    uptime24h: await uptimePct(24, nowSec),
    uptime7d: await uptimePct(24 * 7, nowSec),
    updatedAt: l ? l.ts * 1000 : null,
    intervalMs: env.PROBE_INTERVAL_MS,
    db: dbReady(),
  }
}

function toRow(p) {
  return {
    ts: p.ts, online: p.online ? 1 : 0, isp: p.isp, ip: p.ip,
    lat_isp: p.lat.isp, lat_cloudflare: p.lat.cloudflare, lat_google: p.lat.google,
    lat_github: p.lat.github, lat_microsoft: p.lat.microsoft,
  }
}

function sendJSON(res, code, body, extraHeaders) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  res.end(JSON.stringify(body))
}

/** Read + JSON-parse a request body (capped). Returns {} on empty/invalid. */
function readJSON(req, limit = 1 << 20) {
  return new Promise((resolve) => {
    let data = '', size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { req.destroy(); resolve({}) } else data += c
    })
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')) } catch { resolve({}) } })
    req.on('error', () => resolve({}))
  })
}

// ---- auth route handlers ----
async function handleLogin(req, res) {
  const { username, password } = await readJSON(req)
  if (!username || !password) return sendJSON(res, 400, { error: '请输入用户名和密码' })
  if (!dbReady()) return sendJSON(res, 503, { error: '数据库未就绪,请稍后再试' })
  const u = await getUser(String(username))
  if (!u || !verifyPassword(String(password), u.password)) {
    return sendJSON(res, 401, { error: '用户名或密码错误' })
  }
  const token = signToken(u.username)
  return sendJSON(res, 200, { ok: true, user: u.username }, { 'Set-Cookie': setCookieHeader(token) })
}

function handleMe(req, res) {
  if (!env.AUTH_ENABLED) return sendJSON(res, 200, { user: null, authDisabled: true })
  const s = sessionFromReq(req)
  if (!s) return sendJSON(res, 401, { error: 'unauthorized' })
  return sendJSON(res, 200, { user: s.username, exp: s.exp })
}

/** Create the seed account when the users table is empty (web/all role only). */
async function ensureSeedUser() {
  try {
    if (!dbReady() || await userCount() > 0) return
    const user = env.AUTH_USER || 'admin'
    await addUser(user, hashPassword(env.AUTH_PASSWORD || 'admin'))
    console.log(`[auth] seeded initial user "${user}"`)
    if (!env.AUTH_PASSWORD) {
      console.warn('[auth] ⚠ default password "admin" is in use — set AUTH_USER/AUTH_PASSWORD in ' +
        'backend/.env (before first boot) or use `npm run user passwd <user> <newpass>` to change it.')
    }
  } catch (e) {
    console.error('[auth] seed failed:', e.message)
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  try {
    // --- auth endpoints (always reachable, even when logged out) ---
    if (url.pathname === '/svc/auth/login') {
      if (req.method !== 'POST') return sendJSON(res, 405, { error: 'method not allowed' })
      return handleLogin(req, res)
    }
    if (url.pathname === '/svc/auth/logout') {
      return sendJSON(res, 200, { ok: true }, { 'Set-Cookie': clearCookieHeader() })
    }
    if (url.pathname === '/svc/auth/me') return handleMe(req, res)
    if (url.pathname === '/svc/health') return sendJSON(res, 200, { ok: true, db: dbReady() })

    // --- everything below needs a valid session (when auth is enabled) ---
    const guarded = url.pathname.startsWith('/svc/isp') || url.pathname.startsWith('/api/')
    if (env.AUTH_ENABLED && guarded && !sessionFromReq(req)) {
      return sendJSON(res, 401, { error: 'unauthorized' })
    }

    if (url.pathname === '/svc/isp/summary') return sendJSON(res, 200, await summary())
    if (url.pathname === '/svc/isp/history') {
      const hours = Math.min(168, Math.max(1, Number(url.searchParams.get('hours')) || 24))
      const buckets = Math.min(120, Math.max(10, Number(url.searchParams.get('buckets')) || 60))
      const nowSec = Math.floor(Date.now() / 1000)
      return sendJSON(res, 200, { hours, buckets, uptime: await uptimePct(hours, nowSec), buckets_data: await buildHistory(hours, buckets) })
    }
    // Single-server mode: reverse-proxy /api -> iKuai, then serve the frontend.
    if (url.pathname.startsWith('/api/')) return proxyApi(req, res, env)
    // The SPA itself is served unauthenticated so the login page can load.
    if (env.FRONTEND_DIR) return serveStatic(req, res, env.FRONTEND_DIR)
    sendJSON(res, 404, { error: 'not found' })
  } catch (e) {
    sendJSON(res, 500, { error: e.message })
  }
})

/** Connect to MySQL, retrying in the background so the server still serves. */
async function connectWithRetry(attempt = 1) {
  try {
    await initDb()
    console.log(`[db] connected to MySQL ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`)
    if (doServe && env.AUTH_ENABLED) await ensureSeedUser()
  } catch (e) {
    const wait = Math.min(30000, attempt * 5000)
    console.error(`[db] connect failed (${e.code || e.message}); retrying in ${wait / 1000}s. ` +
      `Run backend/sql/init.sql and check backend/.env DB_* settings.`)
    setTimeout(() => connectWithRetry(attempt + 1), wait)
  }
}

const doProbe = env.ROLE === 'all' || env.ROLE === 'probe'   // probe + write DB
const doServe = env.ROLE === 'all' || env.ROLE === 'web'     // serve UI/api/svc + read DB

console.log(`[svc] role=${env.ROLE}  iKuai: ${env.IKUAI_BASE}  db: mysql://${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}  auth: ${env.AUTH_ENABLED ? 'on' : 'off'}`)
connectWithRetry()   // both roles use MySQL (probe writes, web reads)

if (doServe) {
  server.listen(env.SVC_PORT, () => {
    console.log(`[svc] serving on http://localhost:${env.SVC_PORT}` +
      (env.FRONTEND_DIR ? ` · frontend ${env.FRONTEND_DIR} + /api proxy` : ' · api-only (use Vite dev for UI)'))
  })
}

if (doProbe) {
  console.log(`[svc] probing every ${Math.round(env.PROBE_INTERVAL_MS / 1000)}s (ISP + latency)`)
  tick()                                   // probe immediately on boot
  setInterval(tick, env.PROBE_INTERVAL_MS) // then on the configured interval
}
