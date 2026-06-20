// Formatting helpers. iKuai mixes numbers and numeric-strings, and uses bytes
// for totals + bytes/sec for rates — normalize everything here.

export function toNum(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = parseFloat(v.replace('%', '').trim())
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** "48%" | 48 -> 48 */
export const parsePct = (v: unknown): number => Math.max(0, Math.min(100, toNum(v)))

/** bytes -> "1.2 GB" */
export function fmtBytes(bytes: number, digits = 1): string {
  const b = toNum(bytes)
  if (b < 1024) return `${b} B`
  const units = ['KB', 'MB', 'GB', 'TB', 'PB']
  let v = b / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 100 ? 0 : digits)} ${units[i]}`
}

/** bytes/sec -> network rate in bits/sec, UniFi style ("312 Mbps") */
export function fmtRate(bytesPerSec: number): { value: string; unit: string } {
  const bits = toNum(bytesPerSec) * 8
  if (bits < 1000) return { value: String(Math.round(bits)), unit: 'bps' }
  const units = ['Kbps', 'Mbps', 'Gbps']
  let v = bits / 1000
  let i = 0
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++ }
  return { value: v >= 100 ? v.toFixed(0) : v.toFixed(1), unit: units[i] }
}

export const fmtRateStr = (bytesPerSec: number): string => {
  const r = fmtRate(bytesPerSec)
  return `${r.value} ${r.unit}`
}

/** seconds -> "28d 14h" / "14h 3m" / "3m" */
export function fmtUptime(seconds: number): string {
  const s = Math.max(0, Math.floor(toNum(seconds)))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}天 ${h}小时`
  if (h > 0) return `${h}小时 ${m}分`
  return `${m}分`
}

export const fmtInt = (n: number): string => Math.round(toNum(n)).toLocaleString('en-US')

/** unix seconds -> "HH:MM" */
export function fmtClock(unixSec: number): string {
  const d = new Date(toNum(unixSec) * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "08:9b:4b:01:7e:7c" upper, short */
export const fmtMac = (m: string): string => (m || '').toUpperCase()

/** unix seconds -> "MM-DD HH:MM:SS" (log timestamps) */
export function fmtDateTime(unixSec: number): string {
  const n = toNum(unixSec)
  if (!n) return '—'
  const d = new Date(n * 1000)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
