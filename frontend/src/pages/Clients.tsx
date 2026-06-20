import { useState } from 'react'
import type { SystemInfo, OnlineClient, OfflineClient } from '../lib/api'
import { ikuai } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import type { PollResult } from '../lib/usePoll'
import { mockClientsOnline, mockClientsOffline } from '../lib/mock'
import { fmtBytes, fmtRateStr, fmtUptime, toNum } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcWifi, IcWired, IcLaptop, IcTv, IcGame, IcNas, IcClients } from '../components/icons'

interface ClientRow {
  key: string; name: string; vendor: string; ip: string; mac: string
  online: boolean; wired: boolean; band: string; ssid: string; iface: string; vlan: number
  download: number; upload: number; today: number; uptimeSec: number; lastSeen: number
}

function fromOnline(c: OnlineClient): ClientRow {
  const wireless = toNum(c.signal) > 0 || !!c.frequencies
  const login = Date.parse(c.uptime)
  return {
    key: `on-${c.id}`, name: c.termname || c.comment || c.mac, vendor: c.client_vendor || '—',
    ip: c.ip_addr, mac: c.mac, online: true, wired: !wireless,
    band: c.frequencies || '', ssid: c.ssid || '', iface: c.interface || '', vlan: c.vlan_id || 0,
    download: c.download || 0, upload: c.upload || 0, today: c.today_total || 0,
    uptimeSec: Number.isFinite(login) ? Math.max(0, (Date.now() - login) / 1000) : 0, lastSeen: 0,
  }
}
function fromOffline(c: OfflineClient): ClientRow {
  return {
    key: `off-${c.id}`, name: c.termname || c.comment || c.mac, vendor: c.client_vendor || '—',
    ip: c.ip_addr, mac: c.mac, online: false, wired: false,
    band: '', ssid: '', iface: '', vlan: c.vlan_id || 0,
    download: 0, upload: 0, today: c.today_total || 0, uptimeSec: 0, lastSeen: c.logout_time || 0,
  }
}

function agoSec(sec: number): string {
  if (!sec) return '—'
  const s = Math.max(0, Math.floor(Date.now() / 1000 - sec))
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return `${Math.floor(s / 86400)} 天前`
}

function deviceIcon(r: ClientRow) {
  const n = `${r.name} ${r.vendor}`.toLowerCase()
  if (/nas|synology|qnap|server/.test(n)) return <IcNas />
  if (/tv|appletv|box|display/.test(n)) return <IcTv />
  if (/ps5|ps4|xbox|switch|game|nintendo/.test(n)) return <IcGame />
  if (/iphone|ipad|phone|android|xiaomi|redmi|watch/.test(n)) return <IcClients />
  if (/mac|book|laptop|desktop|pc|inspur|asus/.test(n)) return <IcLaptop />
  return r.wired ? <IcWired /> : <IcWifi />
}

export function Clients({ sys }: { sys: PollResult<{ sysinfo: SystemInfo }> }) {
  const online = usePoll((s) => ikuai.clientsOnline({ limit: 300 }, s), mockClientsOnline, 5000)
  const offline = usePoll((s) => ikuai.clientsOffline({ limit: 200 }, s), mockClientsOffline, 30000)

  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'online' | 'offline'>('online')
  const [conn, setConn] = useState<'all' | 'wired' | 'wifi'>('all')
  const [band, setBand] = useState<'all' | '2.4G' | '5G'>('all')
  const [vendors, setVendors] = useState<Set<string>>(new Set())

  const onRows = (online.data?.data ?? []).map(fromOnline)
  const offRows = (offline.data?.offline_data ?? []).map(fromOffline)
  const base = status === 'online' ? onRows : offRows

  const vendorCounts = countBy(base, (r) => r.vendor)
  const rows = base.filter((r) => {
    if (q) {
      const hay = `${r.name} ${r.ip} ${r.mac} ${r.vendor} ${r.ssid}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    if (status === 'online') {
      if (conn === 'wired' && !r.wired) return false
      if (conn === 'wifi' && r.wired) return false
      if (band === '2.4G' && !/2\.?4/.test(r.band)) return false
      if (band === '5G' && !/5/.test(r.band)) return false
    }
    if (vendors.size && !vendors.has(r.vendor)) return false
    return true
  })

  const tech = (r: ClientRow) => (r.wired ? '有线' : r.band ? `WiFi · ${r.band}` : 'WiFi')
  const columns: Column<ClientRow>[] = [
    {
      key: 'name', label: '名称', sort: (r) => r.name, width: 220,
      render: (r) => (
        <div className="dev">
          <span className={`sdot2 ${r.online ? 'on' : 'off'}`} />
          <span className="thumb">{deviceIcon(r)}</span>
          <div><div className="nm">{r.name}</div><div className="mt">{r.mac.toUpperCase()}</div></div>
        </div>
      ),
    },
    { key: 'vendor', label: '供应商', sort: (r) => r.vendor, render: (r) => <span className="muted">{r.vendor}</span> },
    {
      key: 'conn', label: '连接', sort: (r) => r.ssid || r.iface,
      render: (r) => r.online ? (r.wired ? (r.iface || '有线') : (r.ssid || 'WiFi')) : <span className="muted">—</span>,
    },
    { key: 'tech', label: '技术', sort: (r) => tech(r), render: (r) => r.online ? tech(r) : <span className="muted">—</span> },
    { key: 'ip', label: 'IP 地址', sort: (r) => r.ip, render: (r) => <span className="num">{r.ip || '—'}</span> },
    { key: 'dl', label: '下载', align: 'right', sort: (r) => r.download, render: (r) => r.online ? <span className="num" style={{ color: '#2b7fff' }}>↓ {fmtRateStr(r.download)}</span> : <span className="muted">—</span> },
    { key: 'ul', label: '上传', align: 'right', sort: (r) => r.upload, render: (r) => r.online ? <span className="num" style={{ color: '#7c6fd6' }}>↑ {fmtRateStr(r.upload)}</span> : <span className="muted">—</span> },
    { key: 'today', label: '24h 用量', align: 'right', sort: (r) => r.today, render: (r) => <span className="num">{fmtBytes(r.today)}</span> },
    {
      key: 'time', label: status === 'online' ? '运行时间' : '最后在线', sort: (r) => (r.online ? r.uptimeSec : r.lastSeen),
      render: (r) => r.online ? <span className="num muted">{fmtUptime(r.uptimeSec)}</span> : <span className="num muted">{agoSec(r.lastSeen)}</span>,
    },
  ]

  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索客户端…" /></div>

        <div className="fb-sec">
          <div className="fb-cap">状态</div>
          <FRow label="在线" count={onRows.length} active={status === 'online'} onClick={() => setStatus('online')} dot="on" />
          <FRow label="离线" count={offRows.length} active={status === 'offline'} onClick={() => setStatus('offline')} dot="off" />
        </div>

        {status === 'online' && <>
          <div className="fb-sec">
            <div className="fb-cap">连接</div>
            {([['all', '全部'], ['wired', '有线'], ['wifi', 'WiFi']] as const).map(([k, l]) => (
              <FRow key={k} label={l} active={conn === k} onClick={() => setConn(k)}
                count={k === 'all' ? onRows.length : onRows.filter((r) => (k === 'wired') === r.wired).length} />
            ))}
          </div>
          <div className="fb-sec">
            <div className="fb-cap">频段</div>
            {([['all', '全部'], ['2.4G', '2.4 GHz'], ['5G', '5 GHz']] as const).map(([k, l]) => (
              <FRow key={k} label={l} active={band === k} onClick={() => setBand(k)} />
            ))}
          </div>
        </>}

        <div className="fb-sec">
          <div className="fb-cap">供应商</div>
          <div className="fb-scroll">
            {Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]).map(([v, n]) => (
              <FCheck key={v} label={v} count={n} checked={vendors.has(v)} onToggle={() => toggle(vendors, v, setVendors)} />
            ))}
          </div>
        </div>

        <button className="fb-clear" onClick={() => { setQ(''); setConn('all'); setBand('all'); setVendors(new Set()) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head">
          <div className="lt">客户端设备</div>
          <div className="lc">{rows.length} / {base.length}</div>
        </div>
        <div className="mcard" style={{ overflow: 'hidden' }}>
          <DataTable rows={rows} columns={columns} rowKey={(r) => r.key} defaultSort="dl" defaultDir="desc"
            empty="没有符合条件的客户端" />
        </div>
        <div className="foot">{sys.data?.sysinfo?.hostname ?? 'iKuai'} · 在线 {onRows.length} · 离线 {offRows.length}</div>
      </main>
    </>
  )
}

/* ---- small filter widgets ---- */
function FRow({ label, count, active, onClick, dot }: { label: string; count?: number; active: boolean; onClick: () => void; dot?: 'on' | 'off' }) {
  return (
    <button className={`fb-item ${active ? 'active' : ''}`} onClick={onClick}>
      {dot && <span className={`sdot2 ${dot}`} />}
      <span className="fl">{label}</span>
      {count != null && <span className="fc">{count}</span>}
    </button>
  )
}
function FCheck({ label, count, checked, onToggle }: { label: string; count: number; checked: boolean; onToggle: () => void }) {
  return (
    <button className={`fb-item ${checked ? 'active' : ''}`} onClick={onToggle}>
      <span className={`fbx ${checked ? 'on' : ''}`} />
      <span className="fl">{label}</span>
      <span className="fc">{count}</span>
    </button>
  )
}
function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of arr) { const k = key(x); out[k] = (out[k] ?? 0) + 1 }
  return out
}
function toggle(set: Set<string>, v: string, setter: (s: Set<string>) => void) {
  const next = new Set(set)
  next.has(v) ? next.delete(v) : next.add(v)
  setter(next)
}
