import {
  IcDashboard, IcTopology, IcDevices, IcClients, IcInsights, IcSecurity, IcSettings, IcNetworks, IcInternet, IcVpn, IcReports, IcAuth, IcObjects, IcService, IcMenu,
} from './icons'

interface RailItem { key: string; label: string; icon: (p: { size?: number }) => JSX.Element }

const TOP: RailItem[] = [
  { key: 'dashboard', label: '总览', icon: IcDashboard },
  { key: 'topology', label: '拓扑', icon: IcTopology },
  { key: 'devices', label: '设备', icon: IcDevices },
  { key: 'clients', label: '客户端', icon: IcClients },
  { key: 'networks', label: '网络', icon: IcNetworks },
  { key: 'routing', label: '路由', icon: IcInternet },
  { key: 'vpn', label: 'VPN', icon: IcVpn },
  { key: 'auth', label: '认证', icon: IcAuth },
  { key: 'objects', label: '对象', icon: IcObjects },
  { key: 'insights', label: '洞察', icon: IcInsights },
  { key: 'services', label: '服务', icon: IcService },
  { key: 'logs', label: '日志', icon: IcReports },
  { key: 'security', label: '安全', icon: IcSecurity },
]

/** Far-left section nav. Collapsible icon rail; expands to show labels. */
export function Sidebar({
  active, onNavigate, expanded, onToggleExpand,
}: {
  active: string
  onNavigate: (k: string) => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  return (
    <aside className={`urail ${expanded ? 'exp' : ''}`}>
      <div className="rail-top">
        <button className="rail-toggle" title={expanded ? '收起侧栏' : '展开侧栏'} onClick={onToggleExpand}><IcMenu /></button>
      </div>
      {TOP.map((it) => {
        const Icon = it.icon
        return (
          <button
            key={it.key}
            className={`rail-btn ${active === it.key ? 'active' : ''}`}
            title={expanded ? '' : it.label}
            onClick={() => onNavigate(it.key)}
          >
            <Icon size={21} />
            <span className="rail-label">{it.label}</span>
          </button>
        )
      })}
      <div className="rail-sp" />
      <button className={`rail-btn ${active === 'system' ? 'active' : ''}`} title={expanded ? '' : '系统管理'} onClick={() => onNavigate('system')}>
        <IcSettings size={21} />
        <span className="rail-label">系统管理</span>
      </button>
    </aside>
  )
}
