// Connectivity / latency probing.
//  - Public targets: TCP-connect latency to :443 (reliable through firewalls).
//  - ISP latency:    ICMP ping to the WAN gateway (the ISP's first hop).
//  - ISP name:       reverse lookup of the egress IP via a geo-IP service.
import net from 'node:net'
import { execFile } from 'node:child_process'
import { env } from './env.mjs'
import { wanGateway } from './ikuai.mjs'

export const TARGETS = {
  cloudflare: 'cloudflare.com',
  google: 'www.google.com',
  github: 'github.com',
  microsoft: 'www.microsoft.com',
}

/** TCP-connect round-trip in ms, or null on failure/timeout. */
export function tcpPing(host, port = 443, timeout = 4000) {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const sock = net.connect({ host, port })
    let done = false
    const finish = (ok) => {
      if (done) return
      done = true
      try { sock.destroy() } catch { /* noop */ }
      resolve(ok ? Math.round(performance.now() - t0) : null)
    }
    sock.setTimeout(timeout)
    sock.once('connect', () => finish(true))
    sock.once('timeout', () => finish(false))
    sock.once('error', () => finish(false))
  })
}

/** ICMP echo via the OS `ping` (locale-robust parse), ms or null. */
export function icmpPing(host, timeout = 4000) {
  if (!host) return Promise.resolve(null)
  const win = process.platform === 'win32'
  const args = win ? ['-n', '1', '-w', '2000', host] : ['-c', '1', '-W', '2', host]
  return new Promise((resolve) => {
    execFile('ping', args, { timeout, windowsHide: true }, (_err, stdout) => {
      const m = String(stdout).match(/[=<]\s*([\d.]+)\s*ms/i)
      resolve(m ? Math.round(parseFloat(m[1])) : null)
    })
  })
}

/** Look up the egress IP's ISP name (best-effort). Returns { isp, ip } or {}. */
export async function ispLookup() {
  try {
    const r = await fetch(env.ISP_LOOKUP_URL, { signal: AbortSignal.timeout(5000) })
    const j = await r.json()
    if (j && (j.status === 'success' || j.isp)) return { isp: j.isp || j.org || null, ip: j.query || null }
  } catch { /* offline / rate-limited */ }
  return {}
}

/** Run one full probe cycle and return a record ready for the DB. */
export async function runProbe(prev) {
  const ts = Math.floor(Date.now() / 1000)
  const [gw, ...latArr] = await Promise.all([
    wanGateway(),
    tcpPing(TARGETS.cloudflare),
    tcpPing(TARGETS.google),
    tcpPing(TARGETS.github),
    tcpPing(TARGETS.microsoft),
  ])
  const [cloudflare, google, github, microsoft] = latArr
  const isp = await icmpPing(gw)
  const lat = { isp, cloudflare, google, github, microsoft }

  const online = [cloudflare, google, github, microsoft].some((v) => v != null)

  // Re-resolve ISP name only when needed (new run, IP changed, or hourly).
  let ispName = prev?.isp ?? null
  let ip = prev?.ip ?? null
  const stale = !prev?.lookupAt || (ts - prev.lookupAt) > 3600
  if (online && (stale || !ispName)) {
    const look = await ispLookup()
    if (look.isp) ispName = look.isp
    if (look.ip) ip = look.ip
  }

  return { ts, online, isp: ispName, ip, lat, lookupAt: (ispName ? ts : prev?.lookupAt) }
}
