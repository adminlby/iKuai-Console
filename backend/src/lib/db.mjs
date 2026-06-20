// MySQL persistence via mysql2/promise.
// The pool is created lazily; if MySQL is unreachable the backend keeps probing
// and serving (endpoints return null/empty) and retries the connection.
import mysql from 'mysql2/promise'
import { env } from './env.mjs'

let pool = null

const base = () => ({
  host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD,
})

/**
 * Connect, create the database + table if missing, and open a pool.
 * Throws if MySQL is unreachable (caller decides whether to retry).
 */
export async function initDb() {
  // create the database if it doesn't exist yet (connect without selecting one)
  const admin = await mysql.createConnection(base())
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await admin.end()

  pool = mysql.createPool({
    ...base(), database: env.DB_NAME,
    waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4',
  })
  await pool.query(`
    CREATE TABLE IF NOT EXISTS probes (
      ts             BIGINT       PRIMARY KEY,   -- unix seconds
      online         TINYINT      NOT NULL,      -- 0/1: at least one target reachable
      isp            VARCHAR(255) NULL,
      ip             VARCHAR(64)  NULL,
      lat_isp        DOUBLE       NULL,          -- ms, null on failure
      lat_cloudflare DOUBLE       NULL,
      lat_google     DOUBLE       NULL,
      lat_github     DOUBLE       NULL,
      lat_microsoft  DOUBLE       NULL,
      INDEX idx_probes_ts (ts)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
  return pool
}

export const dbReady = () => pool != null

export async function insertProbe(p) {
  if (!pool) return
  await pool.query(
    `INSERT INTO probes (ts, online, isp, ip, lat_isp, lat_cloudflare, lat_google, lat_github, lat_microsoft)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       online=VALUES(online), isp=VALUES(isp), ip=VALUES(ip),
       lat_isp=VALUES(lat_isp), lat_cloudflare=VALUES(lat_cloudflare),
       lat_google=VALUES(lat_google), lat_github=VALUES(lat_github), lat_microsoft=VALUES(lat_microsoft)`,
    [
      p.ts, p.online ? 1 : 0, p.isp ?? null, p.ip ?? null,
      p.lat.isp ?? null, p.lat.cloudflare ?? null, p.lat.google ?? null,
      p.lat.github ?? null, p.lat.microsoft ?? null,
    ],
  )
}

export async function latest() {
  if (!pool) return null
  const [rows] = await pool.query('SELECT * FROM probes ORDER BY ts DESC LIMIT 1')
  return rows[0] ?? null
}

/** Rows since `sinceSec`, oldest first. */
export async function rowsSince(sinceSec) {
  if (!pool) return []
  const [rows] = await pool.query('SELECT * FROM probes WHERE ts >= ? ORDER BY ts ASC', [sinceSec])
  return rows
}

/** Uptime % over the last `hours`. Null if no samples / DB down. */
export async function uptimePct(hours, nowSec) {
  if (!pool) return null
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS n, SUM(online) AS up FROM probes WHERE ts >= ?',
    [nowSec - hours * 3600],
  )
  const r = rows[0]
  if (!r || !Number(r.n)) return null
  return Math.round((Number(r.up) / Number(r.n)) * 1000) / 10
}
