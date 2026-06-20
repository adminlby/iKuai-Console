import { useState, type ReactNode } from 'react'
import { IcChevronDown, IcWifi, IcMoon, IcSun, IcLogout } from './icons'
import { Notifications } from './Notifications'
import { ChangePasswordModal } from './ChangePasswordModal'

/** UniFi-style top header: site picker · Network tab · centered wordmark · controls. */
export function Header({
  site, online, theme, onToggleTheme, badge, user, onLogout,
}: {
  site: string
  online: boolean
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  badge?: ReactNode
  user?: string | null
  onLogout?: () => void
}) {
  const initial = (user || 'J').trim().charAt(0).toUpperCase() || 'J'
  const [pwOpen, setPwOpen] = useState(false)
  return (
    <header className="uhead">
      <button className="site">
        <span className="sdot" style={online ? undefined : { background: 'var(--text-3)', boxShadow: '0 0 0 3px var(--surface-3)' }} />
        <span className="snm">{site}</span>
        <span className="scar"><IcChevronDown /></span>
      </button>

      <nav className="htabs">
        <button className="htab on">
          <span className="htico"><IcWifi /></span>
          Network
        </button>
      </nav>

      <div className="wordmark">iKuai</div>

      <div className="hright">
        {badge}
        <button className="hbtn" title={theme === 'light' ? '切换深色' : '切换浅色'} onClick={onToggleTheme}>
          {theme === 'light' ? <IcMoon /> : <IcSun />}
        </button>
        <Notifications />
        <button className="havatar" title={user ? `${user} · 修改密码` : '修改密码'} onClick={() => setPwOpen(true)}>{initial}</button>
        {onLogout && (
          <button className="hbtn" title={user ? `退出登录(${user})` : '退出登录'} onClick={onLogout}>
            <IcLogout />
          </button>
        )}
      </div>
      {pwOpen && <ChangePasswordModal user={user} onClose={() => setPwOpen(false)} />}
    </header>
  )
}
