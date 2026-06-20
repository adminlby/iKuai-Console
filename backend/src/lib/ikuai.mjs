// Thin iKuai v4.0 client for the backend (talks directly to the device, tolerates
// the self-signed cert just like the Vite proxy's secure:false).
import https from 'node:https'
import http from 'node:http'
import { env } from './env.mjs'

export function ikuaiGet(apiPath, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const u = new URL(env.IKUAI_BASE + apiPath)
    const mod = u.protocol === 'http:' ? http : https
    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'http:' ? 80 : 443),
      path: u.pathname + u.search,
      method: 'GET',
      headers: { Authorization: `Bearer ${env.IKUAI_TOKEN}`, Accept: 'application/json' },
      rejectUnauthorized: false,
      timeout,
    }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        try {
          const j = JSON.parse(d)
          resolve(j && typeof j === 'object' && 'results' in j ? j.results : j)
        } catch {
          reject(new Error(`bad JSON (HTTP ${res.statusCode})`))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.end()
  })
}

/** Current WAN gateway IP (first WAN line), or null if unreachable. */
export async function wanGateway() {
  try {
    const r = await ikuaiGet('/api/v4.0/monitoring/interfaces-status')
    return r?.iface_check?.[0]?.gateway || null
  } catch {
    return null
  }
}
