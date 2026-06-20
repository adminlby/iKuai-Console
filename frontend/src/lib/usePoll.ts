import { useEffect, useRef, useState } from 'react'

const ALLOW_MOCK = import.meta.env.VITE_ALLOW_MOCK !== '0'
const DEFAULT_MS = Number(import.meta.env.VITE_POLL_MS) || 2000

export type Source = 'loading' | 'live' | 'mock' | 'error'

export interface PollResult<T> {
  data: T | null
  source: Source
  error: string | null
  /** epoch ms of the last successful (live or mock) update */
  updatedAt: number | null
}

/**
 * Polls `fetcher` every `interval` ms.
 * - success            -> source 'live'
 * - failure + mock     -> source 'mock' (keeps polling; auto-recovers to live)
 * - failure, no mock   -> source 'error' (last good data is retained)
 */
export function usePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  mock?: () => T,
  interval: number = DEFAULT_MS,
  /** When this changes, polling restarts immediately (e.g. a changed filter). */
  resetKey?: unknown,
): PollResult<T> {
  const [state, setState] = useState<PollResult<T>>({
    data: null, source: 'loading', error: null, updatedAt: null,
  })

  // keep latest fetcher/mock without restarting the interval
  const fetcherRef = useRef(fetcher)
  const mockRef = useRef(mock)
  fetcherRef.current = fetcher
  mockRef.current = mock

  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController

    const tick = async () => {
      controller = new AbortController()
      try {
        const data = await fetcherRef.current(controller.signal)
        if (stopped) return
        setState({ data, source: 'live', error: null, updatedAt: Date.now() })
      } catch (e) {
        if (stopped || (e as Error).name === 'AbortError') return
        const msg = (e as Error).message || '请求失败'
        if (ALLOW_MOCK && mockRef.current) {
          setState({ data: mockRef.current(), source: 'mock', error: msg, updatedAt: Date.now() })
        } else {
          setState((prev) => ({ ...prev, source: 'error', error: msg }))
        }
      } finally {
        if (!stopped) timer = setTimeout(tick, interval)
      }
    }

    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
      controller?.abort()
    }
  }, [interval, resetKey])

  return state
}
