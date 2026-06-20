import { useState } from 'react'
import { auth } from '../lib/auth'

/** Change-password dialog, opened from the header avatar. */
export function ChangePasswordModal({ user, onClose }: { user?: string | null; onClose: () => void }) {
  const [oldPassword, setOld] = useState('')
  const [newPassword, setNew] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    if (newPassword.length < 6) { setError('新密码至少 6 位'); return }
    if (newPassword !== confirm) { setError('两次输入的新密码不一致'); return }
    setBusy(true)
    try {
      await auth.changePassword(oldPassword, newPassword)
      setDone(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <div className="modal-title">修改密码</div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="关闭">×</button>
        </div>
        {user && <div className="modal-sub">当前账号:<b>{user}</b></div>}

        {done ? (
          <div className="modal-ok">密码已修改 ✓</div>
        ) : (
          <>
            <label className="login-field">
              <span>当前密码</span>
              <input type="password" autoComplete="current-password" autoFocus
                value={oldPassword} onChange={(e) => setOld(e.target.value)} placeholder="请输入当前密码" />
            </label>
            <label className="login-field">
              <span>新密码</span>
              <input type="password" autoComplete="new-password"
                value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="至少 6 位" />
            </label>
            <label className="login-field">
              <span>确认新密码</span>
              <input type="password" autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="再次输入新密码" />
            </label>

            {error && <div className="login-err">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
              <button type="submit" className="login-btn modal-submit"
                disabled={busy || !oldPassword || !newPassword || !confirm}>
                {busy ? '提交中…' : '确认修改'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
