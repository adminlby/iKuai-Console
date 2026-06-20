import { useState } from 'react'
import { ikuai } from '../lib/api'
import type {
  StaticRoute, LoadBalanceRule, StreamDomainRule, FiveTupleRule, AppProtoRule, UpDownRule,
  QosRule, CustomProtoRule, AdvProtoRule,
} from '../lib/api'
import { usePoll } from '../lib/usePoll'
import {
  mockStaticRoutes, mockLoadBalanceRules, mockStreamDomainRules,
  mockFiveTupleRules, mockAppProtoRules, mockUpDownRules,
  mockQosIp, mockQosMac, mockCustomProtoRules, mockAdvProtoRules,
} from '../lib/mock'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcInternet, IcTopology, IcSpeed, IcBolt } from '../components/icons'

type Cat = 'load' | 'domain' | 'five' | 'proto' | 'updown' | 'static' | 'qosip' | 'qosmac' | 'custom' | 'adv'
const CATS: { key: Cat; label: string; src: string; group: string }[] = [
  { key: 'load', label: '负载分流', src: 'routing/load-balance-rules', group: '分流与路由' },
  { key: 'domain', label: '域名分流', src: 'routing/domain-rules', group: '分流与路由' },
  { key: 'five', label: '端口分流', src: 'routing/five-tuple-rules', group: '分流与路由' },
  { key: 'proto', label: '协议分流', src: 'routing/app-protocols', group: '分流与路由' },
  { key: 'updown', label: '上下行分离', src: 'routing/updown', group: '分流与路由' },
  { key: 'static', label: '静态路由', src: 'routing/static-routes', group: '分流与路由' },
  { key: 'qosip', label: 'IP 限速', src: 'network/qos/ip', group: '流控 / QoS' },
  { key: 'qosmac', label: 'MAC 限速', src: 'network/qos/mac', group: '流控 / QoS' },
  { key: 'custom', label: '自定义协议', src: 'network/app-protocols/custom/rules', group: '应用协议' },
  { key: 'adv', label: '高级协议', src: 'network/app-protocols/advanced/rules', group: '应用协议' },
]
const GROUPS = [...new Set(CATS.map((c) => c.group))]

const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off'
const Status = ({ e }: { e?: string }) => <span className={`pill ${enabled(e) ? 'green' : 'gray'}`}><span className="pdot" />{enabled(e) ? '启用' : '停用'}</span>

/** Flatten iKuai's nested matcher: { custom: string[]|{}, object: {gp_name,gid}[] }. */
function flat(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(flat).filter(Boolean).join(', ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('gp_name' in o || 'gid' in o) return String(o.gp_name || o.gid || '')
    const parts: string[] = []
    if ('object' in o) parts.push(flat(o.object))
    if ('custom' in o) parts.push(flat(o.custom))
    return parts.filter(Boolean).join(', ')
  }
  return ''
}
const Addr = ({ v }: { v: unknown }) => { const s = flat(v); return s ? <span className="num">{s}</span> : <span className="muted">全部</span> }

/** Compact time-window label from the `time` matcher. */
function timeLabel(t: unknown): string {
  const o = t as { custom?: unknown; object?: unknown } | null
  if (o && o.object) { const g = flat(o.object); if (g) return g }
  const arr = o && Array.isArray(o.custom) ? (o.custom as Array<Record<string, string>>) : []
  if (!arr.length) return '全天'
  const c = arr[0]
  if (c.weekdays === '1234567' && c.start_time === '00:00' && (c.end_time === '23:59' || c.end_time === '24:00')) return '全天'
  return `${c.start_time}-${c.end_time}${arr.length > 1 ? ` +${arr.length - 1}` : ''}`
}

function maskToPrefix(m: string): number | null {
  const parts = (m || '').split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null
  return parts.reduce((b, p) => b + ((p >>> 0).toString(2).match(/1/g) || []).length, 0)
}
const cidr = (addr: string, mask: string) => { const p = maskToPrefix(mask); return p != null ? `${addr}/${p}` : `${addr} ${mask}`.trim() }
const Egress = ({ i }: { i: string }) => <span className="pill blue">{i || '—'}</span>

export function Routing() {
  const load = usePoll(ikuai.loadBalanceRules, mockLoadBalanceRules, 60000)
  const domain = usePoll(ikuai.streamDomainRules, mockStreamDomainRules, 60000)
  const five = usePoll(ikuai.fiveTupleRules, mockFiveTupleRules, 60000)
  const proto = usePoll(ikuai.appProtoRules, mockAppProtoRules, 60000)
  const updown = usePoll(ikuai.updownRules, mockUpDownRules, 60000)
  const stat = usePoll(ikuai.staticRoutes, mockStaticRoutes, 60000)
  const qosip = usePoll(ikuai.qosIp, mockQosIp, 60000)
  const qosmac = usePoll(ikuai.qosMac, mockQosMac, 60000)
  const custom = usePoll(ikuai.customProtoRules, mockCustomProtoRules, 60000)
  const adv = usePoll(ikuai.advProtoRules, mockAdvProtoRules, 60000)

  const [cat, setCat] = useState<Cat>('load')
  const [q, setQ] = useState('')
  const [onlyOn, setOnlyOn] = useState(false)

  const counts: Record<Cat, number> = {
    load: load.data?.total ?? load.data?.data?.length ?? 0,
    domain: domain.data?.total ?? domain.data?.data?.length ?? 0,
    five: five.data?.total ?? five.data?.data?.length ?? 0,
    proto: proto.data?.total ?? proto.data?.data?.length ?? 0,
    updown: updown.data?.total ?? updown.data?.data?.length ?? 0,
    static: stat.data?.total ?? stat.data?.data?.length ?? 0,
    qosip: qosip.data?.total ?? qosip.data?.data?.length ?? 0,
    qosmac: qosmac.data?.total ?? qosmac.data?.data?.length ?? 0,
    custom: custom.data?.total ?? custom.data?.data?.length ?? 0,
    adv: adv.data?.total ?? adv.data?.data?.length ?? 0,
  }
  const qosSpeed = (kbs?: number | string) => { const n = Number(kbs); if (!n) return '不限'; return n >= 1024 ? `${(n / 1024).toFixed(0)} MB/s` : `${n} KB/s` }

  const filt = <T extends { tagname?: string; comment?: string; enabled?: string }>(arr: T[], extra: (r: T) => string) =>
    arr.filter((r) => (!onlyOn || enabled(r.enabled)) && (!q || `${r.tagname ?? ''} ${r.comment ?? ''} ${extra(r)}`.toLowerCase().includes(q.toLowerCase())))

  const nameCell = (tag: string, sub: string, on: boolean, icon = <IcInternet />) => (
    <div className="dev"><span className={`sdot2 ${on ? 'on' : 'off'}`} /><span className="thumb">{icon}</span><div><div className="nm">{tag}</div><div className="mt">{sub}</div></div></div>
  )

  const loadCols: Column<LoadBalanceRule>[] = [
    { key: 'name', label: '策略', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `策略 ${r.id}`, r.comment || '负载均衡', enabled(r.enabled)) },
    { key: 'if', label: '出口线路', render: (r) => <Egress i={r.interface} /> },
    { key: 'mode', label: '模式', render: (r) => <span className="muted">{r.mode === 1 || r.isp_name ? '指定线路' : '权重均衡'}</span> },
    { key: 'w', label: '权重', render: (r) => <span className="num">{r.weight || '—'}</span> },
    { key: 'isp', label: '运营商', render: (r) => <span className="muted">{r.isp_name || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const domainCols: Column<StreamDomainRule>[] = [
    { key: 'name', label: '策略', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `策略 ${r.id}`, r.comment || '域名分流', enabled(r.enabled)) },
    { key: 'if', label: '出口线路', render: (r) => <Egress i={r.interface} /> },
    { key: 'dom', label: '域名', render: (r) => <Addr v={r.domain} /> },
    { key: 'src', label: '源地址', render: (r) => <Addr v={r.src_addr} /> },
    { key: 'time', label: '时段', render: (r) => <span className="muted">{timeLabel(r.time)}</span> },
    { key: 'prio', label: '优先级', align: 'right', sort: (r) => r.prio, render: (r) => <span className="num">{r.prio}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const fiveCols: Column<FiveTupleRule>[] = [
    { key: 'name', label: '策略', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `策略 ${r.id}`, r.comment || '端口分流', enabled(r.enabled)) },
    { key: 'if', label: '出口线路', render: (r) => <Egress i={r.interface} /> },
    { key: 'proto', label: '协议', render: (r) => <span className="pill gray">{(r.protocol || 'all').toUpperCase()}</span> },
    { key: 'src', label: '源地址', render: (r) => <Addr v={r.src_addr} /> },
    { key: 'dst', label: '目的地址', render: (r) => <Addr v={r.dst_addr} /> },
    { key: 'dport', label: '目的端口', render: (r) => <Addr v={r.dst_port} /> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const protoCols: Column<AppProtoRule>[] = [
    { key: 'name', label: '策略', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `策略 ${r.id}`, r.comment || '协议分流', enabled(r.enabled)) },
    { key: 'if', label: '出口线路', render: (r) => <Egress i={r.interface} /> },
    { key: 'app', label: '应用 / 协议', render: (r) => { const s = flat(r.app_proto); return s ? s.split(',').map((x, i) => <span className="pill gray" key={i} style={{ marginRight: 4 }}>{x.trim()}</span>) : <span className="muted">全部</span> } },
    { key: 'src', label: '源地址', render: (r) => <Addr v={r.src_addr} /> },
    { key: 'time', label: '时段', render: (r) => <span className="muted">{timeLabel(r.time)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const updownCols: Column<UpDownRule>[] = [
    { key: 'name', label: '策略', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `策略 ${r.id}`, r.comment || '上下行分离', enabled(r.enabled)) },
    { key: 'up', label: '上行线路', render: (r) => <span className="num" style={{ color: 'var(--blue)' }}>↑ {r.upiface || '—'}</span> },
    { key: 'down', label: '下行线路', render: (r) => <span className="num" style={{ color: 'var(--green)' }}>↓ {r.downiface || '—'}</span> },
    { key: 'proto', label: '协议', render: (r) => <span className="pill gray">{(r.protocol || 'all').toUpperCase()}</span> },
    { key: 'src', label: '源地址', render: (r) => <Addr v={r.src_addr} /> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const staticCols: Column<StaticRoute>[] = [
    { key: 'name', label: '路由', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `路由 ${r.id}`, r.comment || '静态路由', enabled(r.enabled), <IcTopology />) },
    { key: 'dst', label: '目的网段', sort: (r) => r.dst_addr, render: (r) => <span className="num" style={{ fontWeight: 600 }}>{cidr(r.dst_addr, r.netmask)}</span> },
    { key: 'gw', label: '下一跳网关', render: (r) => <span className="num">{r.gateway || '—'}</span> },
    { key: 'if', label: '出接口', render: (r) => <Egress i={r.interface} /> },
    { key: 'prio', label: '优先级', align: 'right', sort: (r) => r.prio, render: (r) => <span className="num">{r.prio}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]

  const qosCols = (kind: 'ip' | 'mac'): Column<QosRule>[] => [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => nameCell(r.tagname || `限速 ${r.id}`, kind === 'ip' ? (r.ip_addr || '全部') : (r.mac_addr ? r.mac_addr.toUpperCase() : '全部'), enabled(r.enabled), <IcSpeed />) },
    { key: 'mode', label: '模式', render: (r) => <span className="pill gray">{String(r.type ?? '—')}</span> },
    { key: 'if', label: '线路', render: (r) => <Egress i={r.interface || '全部'} /> },
    { key: 'down', label: '下行限速', align: 'right', sort: (r) => Number(r.download) || 0, render: (r) => <span className="num" style={{ color: 'var(--green)' }}>↓ {qosSpeed(r.download)}</span> },
    { key: 'up', label: '上行限速', align: 'right', sort: (r) => Number(r.upload) || 0, render: (r) => <span className="num" style={{ color: 'var(--purple)' }}>↑ {qosSpeed(r.upload)}</span> },
    { key: 'time', label: '时段', render: (r) => <span className="muted">{timeLabel(r.time)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const customCols: Column<CustomProtoRule>[] = [
    { key: 'name', label: '协议名称', sort: (r) => r.name || '', render: (r) => nameCell(r.name || `协议 ${r.id}`, r.comment || '自定义协议', enabled(r.enabled), <IcBolt />) },
    { key: 'proto', label: '协议', render: (r) => <span className="pill gray">{(r.protocol || 'all').toUpperCase()}</span> },
    { key: 'dst', label: '目的地址', render: (r) => <Addr v={r.dst_addr} /> },
    { key: 'dport', label: '目的端口', render: (r) => <Addr v={r.dst_port} /> },
    { key: 'class', label: '分类', render: (r) => <span className="muted">{r.class || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const advCols: Column<AdvProtoRule>[] = [
    { key: 'name', label: '协议名称', sort: (r) => r.name || '', render: (r) => nameCell(r.name || `协议 ${r.id}`, r.comment || '高级自定义协议', enabled(r.enabled), <IcBolt />) },
    { key: 'class', label: '分类', render: (r) => <span className="pill gray">{r.class || '—'}</span> },
    { key: 'appid', label: 'AppID', render: (r) => <span className="num">{r.appid ?? '—'}</span> },
    { key: 'rule', label: '匹配规则', render: (r) => <span className="num muted" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.rule || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]

  const table = () => {
    switch (cat) {
      case 'load': return <DataTable rows={filt(load.data?.data ?? [], (r) => `${r.interface} ${r.isp_name}`)} columns={loadCols} rowKey={(r) => r.id} defaultSort="name" empty="无负载分流策略" />
      case 'domain': return <DataTable rows={filt(domain.data?.data ?? [], (r) => `${r.interface} ${flat(r.domain)}`)} columns={domainCols} rowKey={(r) => r.id} defaultSort="prio" empty="无域名分流策略" />
      case 'five': return <DataTable rows={filt(five.data?.data ?? [], (r) => `${r.interface} ${r.protocol} ${flat(r.dst_port)}`)} columns={fiveCols} rowKey={(r) => r.id} defaultSort="name" empty="无端口分流策略" />
      case 'proto': return <DataTable rows={filt(proto.data?.data ?? [], (r) => `${r.interface} ${flat(r.app_proto)}`)} columns={protoCols} rowKey={(r) => r.id} defaultSort="name" empty="无协议分流策略" />
      case 'updown': return <DataTable rows={filt(updown.data?.data ?? [], (r) => `${r.upiface} ${r.downiface}`)} columns={updownCols} rowKey={(r) => r.id} defaultSort="name" empty="无上下行分离策略" />
      case 'static': return <DataTable rows={filt(stat.data?.data ?? [], (r) => `${r.dst_addr} ${r.gateway} ${r.interface}`)} columns={staticCols} rowKey={(r) => r.id} defaultSort="dst" empty="无静态路由" />
      case 'qosip': return <DataTable rows={filt(qosip.data?.data ?? [], (r) => `${r.ip_addr} ${r.interface}`)} columns={qosCols('ip')} rowKey={(r) => r.id} defaultSort="name" empty="无 IP 限速规则" />
      case 'qosmac': return <DataTable rows={filt(qosmac.data?.data ?? [], (r) => `${r.mac_addr} ${r.interface}`)} columns={qosCols('mac')} rowKey={(r) => r.id} defaultSort="name" empty="无 MAC 限速规则" />
      case 'custom': return <DataTable rows={filt(custom.data?.data ?? [], (r) => `${r.name} ${r.protocol} ${r.dst_addr}`)} columns={customCols} rowKey={(r) => r.id} defaultSort="name" empty="无自定义协议" />
      case 'adv': return <DataTable rows={filt(adv.data?.data ?? [], (r) => `${r.name} ${r.class} ${r.rule}`)} columns={advCols} rowKey={(r) => r.id} defaultSort="name" empty="无高级自定义协议" />
    }
  }

  const cur = CATS.find((c) => c.key === cat)!
  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索策略…" /></div>
        <div className="fb-scroll">
          {GROUPS.map((g) => (
            <div className="fb-sec" key={g}>
              <div className="fb-cap">{g}</div>
              {CATS.filter((c) => c.group === g).map((c) => (
                <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
                  <span className="fb-ic"><IcInternet /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="fb-sec">
          <button className={`fb-item ${onlyOn ? 'active' : ''}`} onClick={() => setOnlyOn((v) => !v)}>
            <span className="sdot2 on" /><span className="fl">仅启用</span>
          </button>
        </div>
        <button className="fb-clear" onClick={() => { setQ(''); setOnlyOn(false) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">路由 · {cur.label}</div><div className="lc">{counts[cat]} 条</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
