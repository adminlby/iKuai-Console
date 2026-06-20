// Client for the backend login endpoints (same-origin via the /svc proxy).
// The session lives in an HttpOnly cookie, so there is no token to store here.

export interface Me {
  user: string | null
  exp?: number
  authDisabled?: boolean
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/svc${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { msg = (await res.json()).error || msg } catch { /* keep status */ }
    const err = new Error(msg) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  return res.json() as Promise<T>
}

export const auth = {
  /** Current session, or throws (401) when logged out. */
  me: () => call<Me>('/auth/me'),
  login: (username: string, password: string) =>
    call<{ ok: boolean; user: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => call<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
}
