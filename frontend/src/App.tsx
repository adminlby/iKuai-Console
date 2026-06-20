import { useEffect, useState } from 'react'
import { ikuai } from './lib/api'
import { usePoll } from './lib/usePoll'
import { mockSystem, mockInterfacesStatus } from './lib/mock'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { DevicePanel } from './components/DevicePanel'
import { SourceBadge } from './components/ui'
import { Dashboard } from './pages/Dashboard'
import { Clients } from './pages/Clients'
import { Devices } from './pages/Devices'
import { Insights } from './pages/Insights'
import { Topology } from './pages/Topology'
import { Security } from './pages/Security'
import { Networks } from './pages/Networks'
import { Routing } from './pages/Routing'
import { Vpn } from './pages/Vpn'
import { Logs } from './pages/Logs'
import { Auth } from './pages/Auth'
import { Objects } from './pages/Objects'
import { System } from './pages/System'
import { Services } from './pages/Services'
import { Login } from './pages/Login'
import { ErrorBoundary } from './components/ErrorBoundary'
import { auth } from './lib/auth'
import { IcCollapse } from './components/icons'

const VIEW_NAMES: Record<string, string> = {
  dashboard: '总览', topology: '拓扑', devices: '设备',
  clients: '客户端', networks: '网络', routing: '路由', vpn: 'VPN', auth: '认证', objects: '对象', insights: '洞察', security: '安全', logs: '日志', services: '服务', system: '系统', settings: '设置',
}

export default function App() {
  // auth gate: 'checking' until /svc/auth/me resolves, then 'in' | 'out'
  const [authState, setAuthState] = useState<'checking' | 'in' | 'out'>('checking')
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    auth.me()
      .then((m) => { if (alive) { setUser(m.user); setAuthState('in') } })
      .catch(() => { if (alive) setAuthState('out') })
    return () => { alive = false }
  }, [])

  const [view, setView] = useState('dashboard')
  const [panelOpen, setPanelOpen] = useState(true)
  const [railOpen, setRailOpen] = useState(false)
  const [subOpen, setSubOpen] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ikuai-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ikuai-theme', theme)
  }, [theme])

  // 深浅自动切换:跟随系统 light/dark 偏好变化
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // Shared polls drive the header badge, the device panel, and the dashboard.
  const sys = usePoll(ikuai.system, mockSystem)
  const ifaces = usePoll(ikuai.interfacesStatus, mockInterfacesStatus)
  const online = sys.source === 'live'
  const isList = view === 'clients' || view === 'devices' || view === 'insights' || view === 'topology' || view === 'security' || view === 'networks' || view === 'routing' || view === 'vpn' || view === 'logs' || view === 'auth' || view === 'objects' || view === 'services' || view === 'system'

  async function logout() {
    try { await auth.logout() } catch { /* ignore */ }
    setUser(null)
    setAuthState('out')
  }

  // Auth gate — block the whole console until a session is confirmed.
  if (authState === 'checking') {
    return <div className="login-wrap"><div className="login-splash">iKuai</div></div>
  }
  if (authState === 'out') {
    return <Login onSuccess={(u) => { setUser(u); setAuthState('in') }} />
  }

  return (
    <div className="shell">
      <Header
        site="iKuai Network"
        online={online}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        badge={<SourceBadge source={sys.source} error={sys.error} />}
        user={user}
        onLogout={logout}
      />
      <div className={`ubody ${isList ? 'list' : ''} ${railOpen ? 'rail-exp' : ''} ${!isList && !panelOpen ? 'panel-collapsed' : ''} ${isList && !subOpen ? 'sub-collapsed' : ''}`}>
        <Sidebar
          active={view}
          onNavigate={setView}
          expanded={railOpen}
          onToggleExpand={() => setRailOpen((v) => !v)}
        />
        {isList && (
          <button className="sub-toggle" title={subOpen ? '收起子菜单' : '展开子菜单'} onClick={() => setSubOpen((v) => !v)}>
            <IcCollapse style={subOpen ? undefined : { transform: 'rotate(180deg)' }} />
          </button>
        )}
        <ErrorBoundary resetKey={view}>
        {view === 'clients' ? (
          <Clients sys={sys} />
        ) : view === 'devices' ? (
          <Devices sys={sys} ifaces={ifaces} />
        ) : view === 'insights' ? (
          <Insights sys={sys} />
        ) : view === 'topology' ? (
          <Topology sys={sys} ifaces={ifaces} />
        ) : view === 'security' ? (
          <Security />
        ) : view === 'networks' ? (
          <Networks />
        ) : view === 'routing' ? (
          <Routing />
        ) : view === 'vpn' ? (
          <Vpn />
        ) : view === 'logs' ? (
          <Logs />
        ) : view === 'auth' ? (
          <Auth />
        ) : view === 'objects' ? (
          <Objects />
        ) : view === 'services' ? (
          <Services />
        ) : view === 'system' ? (
          <System />
        ) : (
          <>
            {panelOpen
              ? <DevicePanel sys={sys} ifaces={ifaces} onCollapse={() => setPanelOpen(false)} onNav={setView} />
              : (
                <button className="panel-expand" title="展开侧栏" onClick={() => setPanelOpen(true)}>
                  <IcCollapse style={{ transform: 'rotate(180deg)' }} />
                </button>
              )}
            {view === 'dashboard'
              ? <Dashboard sys={sys} ifaces={ifaces} />
              : <Placeholder name={VIEW_NAMES[view] ?? view} />}
          </>
        )}
        </ErrorBoundary>
      </div>
    </div>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <main className="umain">
      <div className="mcard" style={{ padding: 56, textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{name}</div>
        <div className="muted">该模块尚未实现 —— 当前已完成「总览」页。<br />爱快 v4.0 提供该模块接口，按总览的轮询模式接入即可。</div>
      </div>
    </main>
  )
}
