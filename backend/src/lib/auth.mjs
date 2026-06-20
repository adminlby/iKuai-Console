// Authentication primitives — no external dependencies (node:crypto only).
//  · Passwords are hashed with scrypt (random per-password salt).
//  · Sessions are stateless: an HMAC-SHA256-signed cookie carrying {user, exp}.
import crypto from 'node:crypto'
import { env } from './env.mjs'

// ---- password hashing (scrypt) -------------------------------------------
const N = 16384, R = 8, P = 1, KEYLEN = 64

/** Hash a plaintext password → `scrypt$N$r$p$saltHex$hashHex` (safe to store). */
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(String(plain), salt, KEYLEN, { N, r: R, p: P })
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** Verify a plaintext password against a stored hash (constant-time compare). */
export function verifyPassword(plain, stored) {
  try {
    const [scheme, n, r, p, saltHex, hashHex] = String(stored).split('$')
    if (scheme !== 'scrypt') return false
    const expected = Buffer.from(hashHex, 'hex')
    const actual = crypto.scryptSync(String(plain), Buffer.from(saltHex, 'hex'),
      expected.length, { N: Number(n), r: Number(r), p: Number(p) })
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

// ---- session cookie (signed, stateless) ----------------------------------
const SECRET = env.AUTH_SECRET || (() => {
  const gen = crypto.randomBytes(32).toString('hex')
  console.warn('[auth] AUTH_SECRET not set — using a random secret; sessions reset on restart. ' +
    'Set AUTH_SECRET in backend/.env to keep logins across restarts.')
  return gen
})()

const TTL_MS = Math.max(1, env.AUTH_SESSION_HOURS) * 3600 * 1000
const b64 = (b) => Buffer.from(b).toString('base64url')
const sign = (payload) => b64(crypto.createHmac('sha256', SECRET).update(payload).digest())

export const COOKIE = 'ik_session'

/** Make a signed session token for `username`. */
export function signToken(username, ttlMs = TTL_MS) {
  const payload = b64(JSON.stringify({ u: username, exp: Date.now() + ttlMs }))
  return `${payload}.${sign(payload)}`
}

/** Validate a token → { username, exp } or null (bad signature / expired). */
export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const dot = token.indexOf('.')
  const payload = token.slice(0, dot)
  const got = Buffer.from(token.slice(dot + 1))
  const want = Buffer.from(sign(payload))
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null
  let data
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) } catch { return null }
  if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null
  return { username: data.u, exp: data.exp }
}

/** Parse a Cookie header into a plain object. */
export function parseCookies(header = '') {
  const out = {}
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

/** Extract + verify the session from a request. Returns { username, exp } | null. */
export function sessionFromReq(req) {
  return verifyToken(parseCookies(req.headers.cookie || '')[COOKIE])
}

export function setCookieHeader(token, ttlMs = TTL_MS) {
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(ttlMs / 1000)}`
}
export function clearCookieHeader() {
  return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}
