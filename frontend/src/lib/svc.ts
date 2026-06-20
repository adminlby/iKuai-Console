// Client for the local ISP-connectivity backend (server/index.mjs), reached
// same-origin through the Vite proxy at /svc.

export interface IspLatencies {
  isp: number | null
  cloudflare: number | null
  google: number | null
  github: number | null
  microsoft: number | null
}
export interface IspSummary {
  isp: string | null
  ip: string | null
  online: boolean | null
  latencies: IspLatencies | null
  uptime24h: number | null
  uptime7d: number | null
  updatedAt: number | null
  intervalMs: number
}
export interface IspBucket { t0: number; ratio: number | null; online: number; n: number; avgLat?: number | null }
export interface IspHistory { hours: number; buckets: number; uptime: number | null; buckets_data: IspBucket[] }

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/svc${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`svc HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export const svc = {
  summary: (signal?: AbortSignal) => get<IspSummary>('/isp/summary', signal),
  history: (opts: { buckets?: number; hours?: number } = {}, signal?: AbortSignal) =>
    get<IspHistory>(`/isp/history?buckets=${opts.buckets ?? 60}&hours=${opts.hours ?? 24}`, signal),
}
