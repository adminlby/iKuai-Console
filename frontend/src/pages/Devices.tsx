import { useState } from 'react'
import type { SystemInfo, InterfacesStatus } from '../lib/api'
import { ikuai } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import type { PollResult } from '../lib/usePoll'
import { mockAcServices, mockApConfig, mockSwitches, mockDownstream } from '../lib/mock'
import { fmtRateStr, fmtUptime, toNum } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcGateway, IcSwitch, IcAp, IcDevices } from '../components/icons'

type Kind = 'gateway' | 'switch' | 'ap' | 'peripheral'
interface NetDevice {
  key: string; kind: Kind; name: string; model: string; ip: string; online: boolean
  uplink: string; ch24: string; ch5: string; clients: number
  download: number; upload: number; uptimeSec: number
}

const KIND_LABEL: Record<Kind, string> = { gateway: '网关', switch: '交换机', ap: '接入点', peripheral: '周边设备' }
const KIND_ICON: Record<Kind, JSX.Element> = { gateway: <IcGateway />, switch: <IcSwitch />, ap: <IcAp />, peripheral: <IcDevices /> }

export function Devices({ sys, ifaces }: {
  sys: PollResult<{ sysinfo: SystemInfo }>
  ifaces: PollResult<InterfacesStatus>
}) {
  const ac = usePoll(ikuai.acServices, mockAcServices, 30000)
  const aps = usePoll((s) => ikuai.apConfig({ limit: 100 }, s), mockApConfig, 20000)
  const sw = usePoll(ikuai.switches, mockSwitches, 30000)
  const ds = usePoll(ikuai.downstream, mockDownstream, 30000)
  const acOn = ac.data?.ac_status === 1

  const [q, setQ] = useState('')
  const [kindF, setKindF] = useState<'all' | Kind>('all')
  const [onlyOnline, setOnlyOnline] = useState(false)

  const si = sys.data?.sysinfo
  const wan = ifaces.data?.iface_check?.[0]
  const devices: NetDevice[] = []

  if (si) {
    devices.push({
      key: 'gw', kind: 'gateway', name: si.hostname || si.verinfo.modelname, model: si.verinfo.modelname,
      ip: si.ip_addr, online: true, uplink: wan ? wan.internet : 'WAN', ch24: '', ch5: '',
      clients: si.online_user.count, download: si.stream.download, upload: si.stream.upload, uptimeSec: si.uptime,
    })
  }
  if (acOn) {
    for (const a of (aps.data?.data ?? [])) {
      devices.push({
        key: `ap-${a.id}`, kind: 'ap', name: a.tagname || a.comment || a.mac, model: a.ap_model || 'AP',
        ip: a.ip_addr, online: a.connected === 1, uplink: a.link_speed ? `${a.link_speed} Mbps` : '—',
        ch24: a.on_channel || '', ch5: a.on_channel_5g || '', clients: (a.online || 0) + (a.online_5g || 0),
        download: parseFloat(String(a.download)) || 0, upload: parseFloat(String(a.upload)) || 0, uptimeSec: a.uptime || 0,
      })
    }
  }
  for (const s of (sw.data?.data ?? [])) {
    devices.push({
      key: `sw-${s.id}`, kind: 'switch', name: s.name || s.tagname || s.mac, model: s.device || '交换机',
      ip: s.ip_addr, online: s.status > 0, uplink: '—', ch24: '', ch5: '', clients: 0,
      download: 0, upload: 0, uptimeSec: s.connect_time ? Math.max(0, Date.now() / 1000 - s.connect_time) : 0,
    })
  }
  for (const d of (ds.data?.data ?? [])) {
    devices.push({
      key: `ds-${d.id}`, kind: 'peripheral', name: d.name || d.tagname || d.mac, model: d.device || '设备',
      ip: d.ip_addr, online: d.status === 1, uplink: '—', ch24: '', ch5: '', clients: 0,
      download: 0, upload: 0, uptimeSec: 0,
    })
  }

  const kindCounts = { gateway: 0, switch: 0, ap: 0, peripheral: 0 } as Record<Kind, number>
  for (const d of devices) kindCounts[d.kind]++
  const onlineCount = devices.filter((d) => d.online).length

  const rows = devices.filter((d) => {
    if (onlyOnline && !d.online) return false
    if (kindF !== 'all' && d.kind !== kindF) return false
    if (q && !`${d.name} ${d.ip} ${d.model}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const columns: Column<NetDevice>[] = [
    {
      key: 'name', label: '名称', sort: (d) => d.name, width: 240,
      render: (d) => (
        <div className="dev">
          <span className={`sdot2 ${d.online ? 'on' : 'off'}`} />
          <span className="thumb">{KIND_ICON[d.kind]}</span>
          <div><div className="nm">{d.name}</div><div className="mt">{KIND_LABEL[d.kind]} · {d.model}</div></div>
        </div>
      ),
    },
    { key: 'status', label: '状态', sort: (d) => (d.online ? 1 : 0), render: (d) => <span className={`pill ${d.online ? 'green' : 'gray'}`}><span className="pdot" />{d.online ? '在线' : '离线'}</span> },
    { key: 'ip', label: 'IP 地址', sort: (d) => d.ip, render: (d) => <span className="num">{d.ip || '—'}</span> },
    { key: 'uplink', label: '上行链路', render: (d) => <span className="muted">{d.uplink}</span> },
    { key: 'ch', label: '信道 2.4/5G', render: (d) => (d.ch24 || d.ch5) ? <span className="num">{d.ch24 || '—'} / {d.ch5 || '—'}</span> : <span className="muted">—</span> },
    { key: 'clients', label: '已连接', align: 'right', sort: (d) => d.clients, render: (d) => <span className="num">{d.clients || '—'}</span> },
    { key: 'dl', label: '下载', align: 'right', sort: (d) => d.download, render: (d) => d.download ? <span className="num" style={{ color: '#2b7fff' }}>↓ {fmtRateStr(d.download)}</span> : <span className="muted">—</span> },
    { key: 'ul', label: '上传', align: 'right', sort: (d) => d.upload, render: (d) => d.upload ? <span className="num" style={{ color: '#7c6fd6' }}>↑ {fmtRateStr(d.upload)}</span> : <span className="muted">—</span> },
    { key: 'time', label: '运行时间', align: 'right', sort: (d) => d.uptimeSec, render: (d) => <span className="num muted">{d.uptimeSec ? fmtUptime(d.uptimeSec) : '—'}</span> },
  ]

  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索设备…" /></div>

        <div className="fb-sec">
          <div className="fb-cap">状态</div>
          <FRow label="在线" count={onlineCount} active={onlyOnline} onClick={() => setOnlyOnline((v) => !v)} dot="on" />
        </div>

        <div className="fb-sec">
          <div className="fb-cap">设备类型</div>
          <FRow label="全部" count={devices.length} active={kindF === 'all'} onClick={() => setKindF('all')} />
          {(['gateway', 'switch', 'ap', 'peripheral'] as Kind[]).filter((k) => kindCounts[k] > 0).map((k) => (
            <FRow key={k} label={KIND_LABEL[k]} count={kindCounts[k]} active={kindF === k} onClick={() => setKindF(k)} icon={KIND_ICON[k]} />
          ))}
        </div>

        {!acOn && (
          <div className="fb-note">未开启 AC 功能,接入点(AP)列表为空。开启后此处显示真实 AP。</div>
        )}

        <button className="fb-clear" onClick={() => { setQ(''); setKindF('all'); setOnlyOnline(false) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head">
          <div className="lt">iKuai 设备</div>
          <div className="lc">{rows.length} / {devices.length}</div>
        </div>
        <div className="mcard" style={{ overflow: 'hidden' }}>
          <DataTable rows={rows} columns={columns} rowKey={(d) => d.key} defaultSort="name" empty="没有符合条件的设备" />
        </div>
        <div className="foot">网关 1 · 交换机 {kindCounts.switch} · 接入点 {kindCounts.ap} · 周边 {kindCounts.peripheral}</div>
      </main>
    </>
  )
}

function FRow({ label, count, active, onClick, dot, icon }: {
  label: string; count?: number; active: boolean; onClick: () => void; dot?: 'on' | 'off'; icon?: JSX.Element
}) {
  return (
    <button className={`fb-item ${active ? 'active' : ''}`} onClick={onClick}>
      {dot && <span className={`sdot2 ${dot}`} />}
      {icon && <span className="fb-ic">{icon}</span>}
      <span className="fl">{label}</span>
      {count != null && <span className="fc">{count}</span>}
    </button>
  )
}
