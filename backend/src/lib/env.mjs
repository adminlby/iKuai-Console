// Minimal .env loader (no dependency). Reads the backend's own .env file.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// backend/src/lib/env.mjs -> backend/
const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function parseEnvFile(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[k] = v
  }
  return out
}

const fileEnv = parseEnvFile(path.join(BACKEND, '.env'))
// process.env wins over the file (lets you override per-run)
const get = (k, d) => (process.env[k] ?? fileEnv[k] ?? d)

export const env = {
  BACKEND,
  // Role: 'all' (probe + serve, default), 'probe' (probe + write DB only),
  // or 'web' (serve frontend/api/svc + read DB only). Lets ISP probing run on
  // the host network while the web side stays on a bridge network.
  ROLE: get('ROLE', 'all'),
  IKUAI_BASE: get('IKUAI_BASE', 'https://192.168.1.1').replace(/\/+$/, ''),
  IKUAI_TOKEN: get('IKUAI_TOKEN', ''),
  SVC_PORT: Number(get('SVC_PORT', 5274)),
  PROBE_INTERVAL_MS: Number(get('PROBE_INTERVAL_MS', 60 * 1000)),
  ISP_LOOKUP_URL: get('ISP_LOOKUP_URL',
    'http://ip-api.com/json/?fields=status,isp,org,as,query,city,country&lang=zh-CN'),
  // When set, the backend also serves these static files (the built frontend)
  // and reverse-proxies /api -> the iKuai device. Lets the whole app run as a
  // single process on a single port (no nginx / no vite preview needed).
  FRONTEND_DIR: get('FRONTEND_DIR', ''),
  // MySQL
  DB_HOST: get('DB_HOST', '127.0.0.1'),
  DB_PORT: Number(get('DB_PORT', 3306)),
  DB_USER: get('DB_USER', 'root'),
  DB_PASSWORD: get('DB_PASSWORD', ''),
  DB_NAME: get('DB_NAME', 'ikuai_console'),
}
