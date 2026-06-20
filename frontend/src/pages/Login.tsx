import { useState } from 'react'
import { auth } from '../lib/auth'

/** Full-screen login wall shown until a valid session exists. */
export function Login({ onSuccess }: { onSuccess: (user: string) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      const r = await auth.login(username.trim(), password)
      onSuccess(r.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">iKuai</div>
        <div className="login-sub">控制台登录</div>

        <label className="login-field">
          <span>用户名</span>
          <input
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
          />
        </label>

        <label className="login-field">
          <span>密码</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
          />
        </label>

        {error && <div className="login-err">{error}</div>}

        <button className="login-btn" type="submit" disabled={busy || !username || !password}>
          {busy ? '登录中…' : '登 录'}
        </button>

        <div className="login-foot">只读看板 · 仅支持 iKuai 4.0+ 系统</div>
      </form>
    </div>
  )
}
