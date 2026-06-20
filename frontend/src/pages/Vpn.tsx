import { useState } from 'react'
import { ikuai } from '../lib/api'
import type { VpnClient, WgInterface, VpnServerCfg } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import {
  mockVpnIpsecClients, mockVpnOpenvpnClients, mockVpnL2tpClients, mockVpnPptpClients,
  mockVpnIkev2Clients, mockVpnWireguard, mockVpnIkev2Server, mockVpnL2tpServer,
  mockVpnOpenvpnServer, mockVpnPptpServer,
} from '../lib/mock'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcVpn } from '../components/icons'

type Cat = 'wg' | 'ipsec' | 'openvpn' | 'l2tp' | 'pptp' | 'ikev2' | 'server'
const CATS: { key: Cat; label: string; src: string }[] = [
  { key: 'wg', label: 'WireGuard', src: 'vpn/wireguard' },
  { key: 'ipsec', label: 'IPSec 客户端', src: 'vpn/ipsec/clients' },
  { key: 'openvpn', label: 'OpenVPN 客户端', src: 'vpn/openvpn/clients' },
  { key: 'l2tp', label: 'L2TP 客户端', src: 'vpn/l2tp/clients' },
  { key: 'pptp', label: 'PPTP 客户端', src: 'vpn/pptp/clients' },
  { key: 'ikev2', label: 'IKEv2 客户端', src: 'vpn/ikev2/clients' },
  { key: 'server', label: '服务端', src: 'vpn/{ikev2,l2tp,openvpn,pptp}/services' },
]

const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off' && e != null
const txt = (v?: string | number) => (v != null && v !== '' ? String(v) : '—')

interface ClientRow {
  key: string; proto: string; name: string; comment: string; on: boolean
  hasConn: boolean; connected: boolean; server: string; iface: string; user: string; peer: string
}
function normClients(proto: string, list: VpnClient[] | undefined): ClientRow[] {
  return (list ?? []).map((c) => {
    const host = c.server || c.remote_addr || ''
    const port = c.server_port || c.remote_port
    return {
      key: `${proto}-${c.id}`, proto, name: c.name || `${proto} ${c.id}`, comment: c.comment || '',
      on: enabled(c.enabled), hasConn: c.status != null, connected: c.status === 1,
      server: host ? `${host}${port ? ':' + port : ''}` : '—',
      iface: c.interface || '—', user: c.username || '—',
      peer: c.ip_addr || c.tunnel_ip || c.rightsubnet || '—',
    }
  })
}

interface ServerRow { key: string; proto: string; on: boolean; listen: string; pool: string; dns: string }

export function Vpn() {
  const wg = usePoll(ikuai.vpnWireguard, mockVpnWireguard, 30000)
  const ipsec = usePoll(ikuai.vpnIpsecClients, mockVpnIpsecClients, 30000)
  const ovpn = usePoll(ikuai.vpnOpenvpnClients, mockVpnOpenvpnClients, 30000)
  const l2tp = usePoll(ikuai.vpnL2tpClients, mockVpnL2tpClients, 30000)
  const pptp = usePoll(ikuai.vpnPptpClients, mockVpnPptpClients, 30000)
  const ikev2 = usePoll(ikuai.vpnIkev2Clients, mockVpnIkev2Clients, 30000)
  const sIkev2 = usePoll(ikuai.vpnIkev2Server, mockVpnIkev2Server, 60000)
  const sL2tp = usePoll(ikuai.vpnL2tpServer, mockVpnL2tpServer, 60000)
  const sOvpn = usePoll(ikuai.vpnOpenvpnServer, mockVpnOpenvpnServer, 60000)
  const sPptp = usePoll(ikuai.vpnPptpServer, mockVpnPptpServer, 60000)

  const [cat, setCat] = useState<Cat>('wg')
  const [q, setQ] = useState('')
  const [onlyOn, setOnlyOn] = useState(false)

  const dns = (s: VpnServerCfg) => [s.dns1, s.dns2].filter(Boolean).join(', ') || '—'
  const servers: ServerRow[] = [
    ...(sIkev2.data?.data ?? []).map((s, i) => ({ key: `ike-${i}`, proto: 'IKEv2', on: enabled(s.enabled), listen: 'UDP 500/4500', pool: txt(s.addrpool || s.addr_pool), dns: dns(s) })),
    ...(sL2tp.data?.data ?? []).map((s, i) => ({ key: `l2-${i}`, proto: 'L2TP', on: enabled(s.enabled), listen: `UDP ${s.server_port ?? 1701}`, pool: txt(s.addr_pool), dns: dns(s) })),
    ...(sOvpn.data?.data ?? []).map((s, i) => ({ key: `ov-${i}`, proto: 'OpenVPN', on: enabled(s.enabled), listen: `${(s.proto || 'udp').toUpperCase()} ${s.port ?? ''}`.trim(), pool: s.subnet ? `${s.subnet}/${s.mask || ''}`.replace(/\/$/, '') : '—', dns: '—' })),
    ...(sPptp.data?.data ?? []).map((s, i) => ({ key: `pp-${i}`, proto: 'PPTP', on: enabled(s.enabled), listen: `TCP ${s.server_port ?? 1723}`, pool: txt(s.addr_pool), dns: dns(s) })),
  ]

  const clientsByCat: Record<string, ClientRow[]> = {
    ipsec: normClients('IPSec', ipsec.data?.data),
    openvpn: normClients('OpenVPN', ovpn.data?.data),
    l2tp: normClients('L2TP', l2tp.data?.data),
    pptp: normClients('PPTP', pptp.data?.data),
    ikev2: normClients('IKEv2', ikev2.data?.data),
  }

  const counts: Record<Cat, number> = {
    wg: wg.data?.iface_total ?? wg.data?.iface_data?.length ?? 0,
    ipsec: ipsec.data?.total ?? clientsByCat.ipsec.length,
    openvpn: ovpn.data?.total ?? clientsByCat.openvpn.length,
    l2tp: l2tp.data?.total ?? clientsByCat.l2tp.length,
    pptp: pptp.data?.total ?? clientsByCat.pptp.length,
    ikev2: ikev2.data?.total ?? clientsByCat.ikev2.length,
    server: servers.length,
  }

  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())

  const ConnStatus = ({ r }: { r: ClientRow }) =>
    r.hasConn
      ? <span className={`pill ${r.connected ? 'green' : 'gray'}`}><span className="pdot" />{r.connected ? '已连接' : (r.on ? '连接中' : '停用')}</span>
      : <span className={`pill ${r.on ? 'green' : 'gray'}`}><span className="pdot" />{r.on ? '启用' : '停用'}</span>

  const clientCols: Column<ClientRow>[] = [
    { key: 'name', label: '名称', sort: (r) => r.name, width: 220, render: (r) => <div className="dev"><span className={`sdot2 ${r.on ? 'on' : 'off'}`} /><span className="thumb"><IcVpn /></span><div><div className="nm">{r.name}</div><div className="mt">{r.comment || `${r.proto} 隧道`}</div></div></div> },
    { key: 'proto', label: '协议', render: (r) => <span className="pill blue">{r.proto}</span> },
    { key: 'server', label: '服务器', sort: (r) => r.server, render: (r) => <span className="num">{r.server}</span> },
    { key: 'iface', label: '出接口', render: (r) => <span className="num">{r.iface}</span> },
    { key: 'user', label: '账号', render: (r) => <span className="muted">{r.user}</span> },
    { key: 'peer', label: '隧道 / 对端', render: (r) => <span className="num">{r.peer}</span> },
    { key: 'st', label: '状态', sort: (r) => (r.connected ? 2 : r.on ? 1 : 0), render: (r) => <ConnStatus r={r} /> },
  ]
  const wgCols: Column<WgInterface>[] = [
    { key: 'name', label: '接口', sort: (r) => r.name, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcVpn /></span><div><div className="nm">{r.name || r.interface}</div><div className="mt">WireGuard · {r.interface}</div></div></div> },
    { key: 'port', label: '监听端口', align: 'right', sort: (r) => r.local_listenport, render: (r) => <span className="num">{r.local_listenport || '—'}</span> },
    { key: 'addr', label: '本端地址', render: (r) => <span className="num">{txt(r.local_address)}</span> },
    { key: 'pk', label: '公钥', render: (r) => <span className="num muted" title={r.local_publickey}>{r.local_publickey ? r.local_publickey.slice(0, 16) + '…' : '—'}</span> },
    { key: 'mtu', label: 'MTU', align: 'right', render: (r) => <span className="num">{r.mtu || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <span className={`pill ${enabled(r.enabled) ? 'green' : 'gray'}`}><span className="pdot" />{enabled(r.enabled) ? '启用' : '停用'}</span> },
  ]
  const serverCols: Column<ServerRow>[] = [
    { key: 'proto', label: '协议', sort: (r) => r.proto, render: (r) => <div className="dev"><span className={`sdot2 ${r.on ? 'on' : 'off'}`} /><span className="thumb"><IcVpn /></span><div><div className="nm">{r.proto}</div><div className="mt">服务端</div></div></div> },
    { key: 'listen', label: '监听', render: (r) => <span className="num">{r.listen}</span> },
    { key: 'pool', label: '地址池', render: (r) => <span className="num">{r.pool}</span> },
    { key: 'dns', label: 'DNS', render: (r) => <span className="num muted">{r.dns}</span> },
    { key: 'st', label: '状态', sort: (r) => (r.on ? 1 : 0), render: (r) => <span className={`pill ${r.on ? 'green' : 'gray'}`}><span className="pdot" />{r.on ? '已开启' : '未开启'}</span> },
  ]

  const table = () => {
    if (cat === 'wg') {
      const rows = (wg.data?.iface_data ?? []).filter((r) => (!onlyOn || enabled(r.enabled)) && match(`${r.name} ${r.interface} ${r.local_address}`))
      return <DataTable rows={rows} columns={wgCols} rowKey={(r) => r.id} defaultSort="name" empty="无 WireGuard 接口" />
    }
    if (cat === 'server') {
      const rows = servers.filter((r) => (!onlyOn || r.on) && match(`${r.proto} ${r.pool}`))
      return <DataTable rows={rows} columns={serverCols} rowKey={(r) => r.key} defaultSort="proto" empty="无服务端配置" />
    }
    const rows = clientsByCat[cat].filter((r) => (!onlyOn || r.on) && match(`${r.name} ${r.comment} ${r.server} ${r.user}`))
    return <DataTable rows={rows} columns={clientCols} rowKey={(r) => r.key} defaultSort="name" empty="无客户端隧道" />
  }

  const cur = CATS.find((c) => c.key === cat)!
  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索隧道…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">VPN</div>
          {CATS.map((c) => (
            <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
              <span className="fb-ic"><IcVpn /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
            </button>
          ))}
        </div>
        <div className="fb-sec">
          <div className="fb-cap">状态</div>
          <button className={`fb-item ${onlyOn ? 'active' : ''}`} onClick={() => setOnlyOn((v) => !v)}>
            <span className="sdot2 on" /><span className="fl">仅启用</span>
          </button>
        </div>
        <button className="fb-clear" onClick={() => { setQ(''); setOnlyOn(false) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">VPN · {cur.label}</div><div className="lc">{counts[cat]} 项</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
