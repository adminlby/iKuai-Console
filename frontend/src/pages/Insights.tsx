import { useState } from 'react'
import type { SystemInfo, AppTraffic, ApConfig, TrafficTerminal, ChannelClient } from '../lib/api'
import { ikuai } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import type { PollResult } from '../lib/usePoll'
import {
  mockTrafficSummary, mockAppTraffic, mockAcServices, mockApConfig, mockChannelClients,
  mockCpuHistory, mockMemHistory, mockDiskHistory, mockTerminalsHistory, mockConnectionsHistory,
  mockNetworkLoad, mockFlowShunting, mockAuditTerminals, mockAuditAccounts, mockProtocols,
} from '../lib/mock'
import type { AuditRow } from '../lib/api'
import { fmtBytes, fmtMac } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { HealthChart } from '../components/charts'
import { IcSearch, IcClients, IcBolt, IcWifiOff } from '../components/icons'

type Tab = 'traffic' | 'radio' | 'load' | 'audit'

export function Insights({ sys }: { sys: PollResult<{ sysinfo: SystemInfo }> }) {
  const [tab, setTab] = useState<Tab>('traffic')
  if (tab === 'traffic') return <TrafficView sys={sys} tab={tab} setTab={setTab} />
  if (tab === 'radio') return <RadioView tab={tab} setTab={setTab} />
  if (tab === 'load') return <LoadView tab={tab} setTab={setTab} />
  return <AuditView tab={tab} setTab={setTab} />
}

function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="htabs2" style={{ marginBottom: 14 }}>
      <button className={`htab2 ${tab === 'traffic' ? 'on' : ''}`} onClick={() => setTab('traffic')}>流量</button>
      <button className={`htab2 ${tab === 'radio' ? 'on' : ''}`} onClick={() => setTab('radio')}>射频</button>
      <button className={`htab2 ${tab === 'load' ? 'on' : ''}`} onClick={() => setTab('load')}>负载</button>
      <button className={`htab2 ${tab === 'audit' ? 'on' : ''}`} onClick={() => setTab('audit')}>审计</button>
    </div>
  )
}

const clk = (sec: number, withDate = false) => { const d = new Date(sec * 1000); const p = (x: number) => String(x).padStart(2, '0'); const hm = `${p(d.getHours())}:${p(d.getMinutes())}`; return withDate ? `${p(d.getMonth() + 1)}/${p(d.getDate())} ${hm}` : hm }
const crossesDay = (ts: number[]) => ts.length > 1 && new Date(ts[0] * 1000).toDateString() !== new Date(ts[ts.length - 1] * 1000).toDateString()
const axisTs = (ts: number[]) => (ts.length ? Array.from({ length: 6 }, (_, i) => clk(ts[Math.round((i / 5) * (ts.length - 1))], crossesDay(ts))) : [])
function loadParams(range: '1H' | '24H') {
  const now = Math.floor(Date.now() / 1000)
  const c = range === '1H' ? { datetype: 'hour' as const, secs: 3600 } : { datetype: 'day' as const, secs: 86400 }
  return { datetype: c.datetype, start_time: now - c.secs, end_time: now, math: 'avg' as const }
}

interface LSeries { points: number[]; color: string; fillId: string; label: string; fillOpacity?: number }
function LoadChart({ title, series, ts, unit, fmt }: { title: string; series: LSeries[]; ts: number[]; unit: string; fmt: (v: number) => string }) {
  return (
    <div className="mcard loadcard">
      <div className="sec-h" style={{ border: 0, paddingBottom: 4 }}>
        <span className="st">{title}</span>
        <div className="chleg">{series.map((s) => <span key={s.fillId}><i style={{ background: s.color }} />{s.label}</span>)}</div>
      </div>
      <div style={{ padding: '0 6px' }}>
        <HealthChart series={series.map((s) => ({ ...s, points: s.points.length ? s.points : [0, 0] }))} timestamps={ts} height={170} unit={unit} formatVal={fmt} formatTime={(time) => clk(time, crossesDay(ts))} />
      </div>
      <div className="chart-axis" style={{ padding: '2px 36px 10px 10px' }}>{axisTs(ts).map((l, i) => <span key={i}>{l}</span>)}</div>
    </div>
  )
}

/* ============================ Load monitor ============================ */
function LoadView({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const [range, setRange] = useState<'1H' | '24H'>('1H')
  const cpu = usePoll((s) => ikuai.cpuHistory(loadParams(range), s), () => mockCpuHistory(range), 15000, range)
  const mem = usePoll((s) => ikuai.memHistory(loadParams(range), s), () => mockMemHistory(range), 15000, range)
  const disk = usePoll((s) => ikuai.diskHistory(loadParams(range), s), () => mockDiskHistory(range), 30000, range)
  const net = usePoll((s) => ikuai.networkLoad(loadParams(range), s), () => mockNetworkLoad(range === '1H' ? '1H' : '1D'), 15000, range)
  const term = usePoll((s) => ikuai.terminalsHistory(loadParams(range), s), () => mockTerminalsHistory(range), 15000, range)
  const conn = usePoll((s) => ikuai.connectionsHistory(loadParams(range), s), () => mockConnectionsHistory(range), 15000, range)
  const flow = usePoll(ikuai.flowShunting, mockFlowShunting, 60000)

  const cpuD = cpu.data?.cpu ?? []
  const cpuTs = cpuD.map((p) => p.timestamp)
  const perf: LSeries[] = [
    { points: cpuD.map((p) => p.cpu), color: '#19c0d6', fillId: 'lc', label: 'CPU', fillOpacity: 0.12 },
    { points: (mem.data?.memory ?? []).map((p) => p.memory_use ?? p.memory), color: '#3b8bff', fillId: 'lm', label: '内存', fillOpacity: 0.1 },
    { points: (disk.data?.disk_space_used ?? []).map((p) => p.disk_space_use), color: '#34c47c', fillId: 'ld', label: '硬盘', fillOpacity: 0.06 },
  ]
  const ns = net.data?.rate_stat ?? []
  const netTs = ns.map((r) => r.timestamp)
  const netSeries: LSeries[] = [
    { points: ns.map((r) => (r.max_download * 8) / 1e6), color: '#34c47c', fillId: 'nd', label: '下行', fillOpacity: 0.16 },
    { points: ns.map((r) => (r.max_upload * 8) / 1e6), color: '#7c6fd6', fillId: 'nu', label: '上行', fillOpacity: 0.12 },
  ]
  const termD = term.data?.on_terminal ?? []
  const connD = conn.data?.conn_num ?? []
  const fd = flow.data?.data
  const spans: [string, keyof NonNullable<typeof fd>][] = [['今天', 'today'], ['昨天', 'yesterday'], ['最近 7 天', 'week']]
  const shuntRows = [['端口分流', 'port_cnt'], ['协议分流', 'proto_cnt'], ['域名分流', 'domain_cnt'], ['负载均衡', 'llb_cnt']] as const
  const unshunted = (k: 'today' | 'yesterday' | 'week') => {
    const s = fd?.[k]; if (!s) return 0
    return Math.max(0, s.conn_cnt - s.port_cnt - s.proto_cnt - s.domain_cnt - s.llb_cnt)
  }

  return (
    <>
      <aside className="filterbar">
        <div className="fb-sec" style={{ borderTop: 0 }}>
          <div className="fb-cap">时间范围</div>
          {(['1H', '24H'] as const).map((r) => (
            <button key={r} className={`fb-item ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}><span className="fl">{r === '1H' ? '近 1 小时' : '近 24 小时'}</span></button>
          ))}
        </div>
        <div className="fb-note">负载/连接/分流为爱快历史聚合数据(datetype={range === '1H' ? 'hour' : 'day'},均值)。</div>
      </aside>

      <main className="umain listmain">
        <Tabs tab={tab} setTab={setTab} />
        <div className="loadgrid">
          <LoadChart title="性能负载 (%)" series={perf} ts={cpuTs} unit=" %" fmt={(v) => v.toFixed(0)} />
          <LoadChart title="网络负载" series={netSeries} ts={netTs} unit=" Mbps" fmt={(v) => v.toFixed(1)} />
          <LoadChart title="在线终端 (台)" series={[{ points: termD.map((p) => p.on_terminal), color: '#0f9b8e', fillId: 'tm', label: '在线终端', fillOpacity: 0.18 }]} ts={termD.map((p) => p.timestamp)} unit="" fmt={(v) => v.toFixed(0)} />
          <LoadChart title="总转发包数" series={[{ points: ns.map((r) => r.rx_packages + r.tx_packages), color: '#7c6fd6', fillId: 'pk', label: '转发包数', fillOpacity: 0.16 }]} ts={netTs} unit="" fmt={(v) => Math.round(v).toLocaleString()} />
          <LoadChart title="网络连接数" series={[{ points: connD.map((p) => p.conn_num), color: '#ec6aa0', fillId: 'cn', label: '连接数', fillOpacity: 0.16 }]} ts={connD.map((p) => p.timestamp)} unit="" fmt={(v) => Math.round(v).toLocaleString()} />
        </div>

        {/* 分流监控 */}
        <div className="list-head" style={{ marginTop: 18 }}><div className="lt" style={{ fontSize: 15 }}>分流监控</div></div>
        <div className="ins-cards">
          {spans.map(([label, k]) => (
            <div className="mcard ins-card" key={k}>
              <div className="ic-h">{label}连接数</div>
              <div className="ic-big">{(fd?.[k]?.conn_cnt ?? 0).toLocaleString()}</div>
              <div className="ic-sub">未分流 {unshunted(k).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="mcard" style={{ overflow: 'hidden', marginTop: 14 }}>
          <table className="dtable">
            <thead><tr><th>分流</th><th className="r">今天</th><th className="r">昨天</th><th className="r">最近 7 天</th></tr></thead>
            <tbody>
              {shuntRows.map(([label, key]) => (
                <tr key={key}><td>{label}</td>
                  <td className="r num">{(fd?.today[key] ?? 0).toLocaleString()}</td>
                  <td className="r num">{(fd?.yesterday[key] ?? 0).toLocaleString()}</td>
                  <td className="r num">{(fd?.week[key] ?? 0).toLocaleString()}</td>
                </tr>
              ))}
              <tr><td>未分流</td>
                <td className="r num">{unshunted('today').toLocaleString()}</td>
                <td className="r num">{unshunted('yesterday').toLocaleString()}</td>
                <td className="r num">{unshunted('week').toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="foot">数据来源:monitoring/{'{cpu,memory,disk,network,terminals,connections,flow-shunting}'}</div>
      </main>
    </>
  )
}

/* ============================ Traffic ============================ */
function TrafficView({ sys, tab, setTab }: { sys: PollResult<{ sysinfo: SystemInfo }>; tab: Tab; setTab: (t: Tab) => void }) {
  const traffic = usePoll((s) => ikuai.trafficSummary({ limit: 50 }, s), mockTrafficSummary, 10000)
  const apps = usePoll(ikuai.appTraffic, mockAppTraffic, 10000)
  const [q, setQ] = useState('')
  const [cats, setCats] = useState<Set<string>>(new Set())
  const [rank, setRank] = useState<'app' | 'client'>('app')

  const si = sys.data?.sysinfo
  const appRows = apps.data?.proto3_day ?? []
  const appTotal = apps.data?.proto3_day_total_flow || appRows.reduce((s, a) => s + a.total, 0) || 1
  const clients = (traffic.data?.terminal ?? []).slice().sort((a, b) => b.sum_total - a.sum_total)

  const catCounts = countBy(appRows, (a) => a.appname_level1 || '其它')
  const rows = appRows.filter((a) => {
    if (q && !`${a.appname} ${a.appname_level1} ${a.appname_level2}`.toLowerCase().includes(q.toLowerCase())) return false
    if (cats.size && !cats.has(a.appname_level1 || '其它')) return false
    return true
  })

  // TOP20 rankings (rank = position by traffic, kept even if re-sorted)
  const appTop = [...rows].sort((a, b) => b.total - a.total).slice(0, 20).map((a, i) => ({ ...a, rank: i + 1 }))
  const cliFiltered = clients.filter((c) => !q || `${c.comment} ${c.username} ${c.ip_addr} ${c.mac}`.toLowerCase().includes(q.toLowerCase()))
  const cliTotal = traffic.data?.terminal_total_flow || clients.reduce((s, c) => s + c.sum_total, 0) || 1
  const cliTop = cliFiltered.slice(0, 20).map((c, i) => ({ ...c, rank: i + 1 }))

  const rankCol = <T extends { rank: number }>(): Column<T> => ({ key: 'rank', label: '#', width: 44, render: (r) => <span className={`rankno ${r.rank <= 3 ? 'top' : ''}`}>{r.rank}</span> })

  const appColumns: Column<AppTraffic & { rank: number }>[] = [
    rankCol(),
    { key: 'app', label: '应用', sort: (a) => a.appname, width: 200, render: (a) => <div className="dev"><span className="thumb"><IcBolt /></span><div><div className="nm">{a.appname}</div><div className="mt">{a.appname_level2 || a.appname_level1}</div></div></div> },
    { key: 'cat', label: '分类', sort: (a) => a.appname_level1, render: (a) => <span className="pill gray">{a.appname_level1 || '其它'}</span> },
    { key: 'down', label: '下行', align: 'right', sort: (a) => a.total_down, render: (a) => <span className="num" style={{ color: '#2b7fff' }}>{fmtBytes(a.total_down)}</span> },
    { key: 'up', label: '上行', align: 'right', sort: (a) => a.total_up, render: (a) => <span className="num" style={{ color: '#7c6fd6' }}>{fmtBytes(a.total_up)}</span> },
    { key: 'total', label: '总流量', align: 'right', sort: (a) => a.total, render: (a) => <span className="num" style={{ fontWeight: 700 }}>{fmtBytes(a.total)}</span> },
    { key: 'pct', label: '占比', width: 150, render: (a) => <div className="bar"><i style={{ width: `${Math.min(100, (a.total / appTotal) * 100)}%` }} /><span className="bart">{((a.total / appTotal) * 100).toFixed(1)}%</span></div> },
  ]
  const cliColumns: Column<TrafficTerminal & { rank: number }>[] = [
    rankCol(),
    { key: 'name', label: '终端', sort: (c) => c.comment || c.username || c.ip_addr, width: 200, render: (c) => <div className="dev"><span className="thumb"><IcClients /></span><div><div className="nm">{c.comment || c.username || c.ip_addr}</div><div className="mt">{c.mac.toUpperCase()}</div></div></div> },
    { key: 'ip', label: 'IP 地址', sort: (c) => c.ip_addr, render: (c) => <span className="num">{c.ip_addr || '—'}</span> },
    { key: 'down', label: '下行', align: 'right', sort: (c) => c.sum_total_down, render: (c) => <span className="num" style={{ color: '#2b7fff' }}>{fmtBytes(c.sum_total_down)}</span> },
    { key: 'up', label: '上行', align: 'right', sort: (c) => c.sum_total_up, render: (c) => <span className="num" style={{ color: '#7c6fd6' }}>{fmtBytes(c.sum_total_up)}</span> },
    { key: 'total', label: '总流量', align: 'right', sort: (c) => c.sum_total, render: (c) => <span className="num" style={{ fontWeight: 700 }}>{fmtBytes(c.sum_total)}</span> },
    { key: 'pct', label: '占比', width: 150, render: (c) => <div className="bar"><i style={{ width: `${Math.min(100, (c.sum_total / cliTotal) * 100)}%` }} /><span className="bart">{((c.sum_total / cliTotal) * 100).toFixed(1)}%</span></div> },
  ]

  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索应用 / 终端…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">应用分类</div>
          <div className="fb-scroll">
            {Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <button key={c} className={`fb-item ${cats.has(c) ? 'active' : ''}`} onClick={() => setCats(toggle(cats, c))}>
                <span className={`fbx ${cats.has(c) ? 'on' : ''}`} /><span className="fl">{c}</span><span className="fc">{n}</span>
              </button>
            ))}
          </div>
        </div>
        <button className="fb-clear" onClick={() => { setQ(''); setCats(new Set()) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <Tabs tab={tab} setTab={setTab} />
        <div className="ins-cards">
          <div className="mcard ins-card">
            <div className="ic-h">流量摘要 · 今日</div>
            <div className="ic-big">{fmtBytes(appTotal)}</div>
            <div className="ic-sub">累计 ↓ {fmtBytes(si?.stream.total_down ?? 0)} · ↑ {fmtBytes(si?.stream.total_up ?? 0)}</div>
            <div className="ic-sub">应用 {apps.data?.proto3_day_total ?? appRows.length} 种 · 客户端 {traffic.data?.terminal_total ?? clients.length}</div>
          </div>
          <div className="mcard ins-card">
            <div className="ic-h"><IcClients size={14} /> 热门客户端</div>
            {clients.slice(0, 5).map((c) => (
              <div className="ic-row" key={c.id}><span className="rn">{c.comment || c.username || c.ip_addr}</span><span className="rbar"><i style={{ width: `${(c.sum_total / clients[0].sum_total) * 100}%`, background: 'var(--blue)' }} /></span><span className="rv">{fmtBytes(c.sum_total)}</span></div>
            ))}
            {clients.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 6 }}>暂无数据</div>}
          </div>
          <div className="mcard ins-card">
            <div className="ic-h"><IcBolt size={14} /> 热门应用</div>
            {appRows.slice(0, 5).map((a) => (
              <div className="ic-row" key={a.id}><span className="rn">{a.appname}</span><span className="rbar"><i style={{ width: `${(a.total / (appRows[0]?.total || 1)) * 100}%`, background: 'var(--purple)' }} /></span><span className="rv">{fmtBytes(a.total)}</span></div>
            ))}
            {appRows.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 6 }}>暂无数据</div>}
          </div>
        </div>

        <div className="mcard" style={{ overflow: 'hidden' }}>
          <div className="sec-h">
            <span className="st">流量排行榜 TOP20 · 今日</span>
            <div className="tgl" style={{ marginLeft: 'auto' }}>
              <button className={rank === 'app' ? 'on' : ''} onClick={() => setRank('app')}>应用 / 协议</button>
              <button className={rank === 'client' ? 'on' : ''} onClick={() => setRank('client')}>终端</button>
            </div>
          </div>
          {rank === 'app'
            ? <DataTable rows={appTop} columns={appColumns} rowKey={(a) => a.id} defaultSort="total" defaultDir="desc" empty="暂无应用流量数据(需开启应用识别 / 流控)" />
            : <DataTable rows={cliTop} columns={cliColumns} rowKey={(c) => c.id} defaultSort="total" defaultDir="desc" empty="暂无终端流量数据" />}
        </div>
        <div className="foot">数据来源:clients-traffic-summary · app-traffic-summary(今日 24h)</div>
      </main>
    </>
  )
}

/* ============================ Radios ============================ */
interface RadioRow { key: string; ap: string; model: string; band: string; channel: string; width: number; txpower: number; clients: number; signal: number }

function RadioView({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const ac = usePoll(ikuai.acServices, mockAcServices, 30000)
  const aps = usePoll((s) => ikuai.apConfig({ limit: 100 }, s), mockApConfig, 20000)
  const chans = usePoll(ikuai.channelClients, mockChannelClients, 30000)
  const acOn = ac.data?.ac_status === 1
  const [bandF, setBandF] = useState<'all' | '2.4' | '5'>('all')
  const [apF, setApF] = useState<Set<string>>(new Set())

  // latest snapshot per channel
  const chData: Record<number, ChannelClient> = {}
  const chHist = chans.data?.channel_sta_history ?? []
  if (chHist.length) {
    const maxTs = Math.max(...chHist.map((c) => c.timestamp))
    for (const c of chHist) if (c.timestamp === maxTs) chData[c.channel] = c
  }

  const apList = (aps.data?.data ?? []).filter((a) => a.connected === 1)
  const radios: RadioRow[] = []
  for (const a of apList) {
    const nm = a.tagname || a.comment || a.mac
    radios.push({ key: `${a.id}-24`, ap: nm, model: a.ap_model || 'AP', band: '2.4 GHz', channel: a.on_channel || '自动', width: a.channel_width_2g || 20, txpower: a.beacon_txpower || 0, clients: a.online || 0, signal: a.signal_str || 0 })
    if (a.support_5g) radios.push({ key: `${a.id}-5`, ap: nm, model: a.ap_model || 'AP', band: '5 GHz', channel: a.on_channel_5g || '自动', width: a.channel_width_5g || 0, txpower: a.beacon_txpower_5g || 0, clients: a.online_5g || 0, signal: a.signal_str_5g || 0 })
  }
  const apNames = [...new Set(apList.map((a) => a.tagname || a.comment || a.mac))]
  const rows = radios.filter((r) => {
    if (bandF === '2.4' && !r.band.startsWith('2.4')) return false
    if (bandF === '5' && !r.band.startsWith('5')) return false
    if (apF.size && !apF.has(r.ap)) return false
    return true
  })

  const sigColor = (s: number) => (s >= -60 ? 'var(--green)' : s >= -72 ? 'var(--orange)' : 'var(--red)')
  const columns: Column<RadioRow>[] = [
    { key: 'ap', label: '名称', sort: (r) => r.ap, width: 200, render: (r) => <div className="dev"><span className="thumb"><IcBolt /></span><div><div className="nm">{r.ap}</div><div className="mt">{r.model}</div></div></div> },
    { key: 'band', label: '频段', sort: (r) => r.band, render: (r) => <span className={`pill ${r.band.startsWith('5') ? 'blue' : 'orange'}`}>{r.band}</span> },
    { key: 'ch', label: '信道', sort: (r) => r.channel, render: (r) => <span className="num">{r.channel}</span> },
    { key: 'w', label: '信道宽度', align: 'right', sort: (r) => r.width, render: (r) => <span className="num">{r.width} MHz</span> },
    { key: 'tx', label: '发射功率', align: 'right', sort: (r) => r.txpower, render: (r) => <span className="num">{r.txpower}%</span> },
    { key: 'cli', label: '客户端', align: 'right', sort: (r) => r.clients, render: (r) => <span className="num">{r.clients}</span> },
    { key: 'sig', label: '信号', align: 'right', sort: (r) => r.signal, render: (r) => <span className="num" style={{ color: sigColor(r.signal), fontWeight: 600 }}>{r.signal ? `${r.signal} dBm` : '—'}</span> },
  ]

  return (
    <>
      <aside className="filterbar">
        <div className="fb-sec" style={{ borderTop: 0 }}>
          <div className="fb-cap">频段</div>
          {([['all', '全部'], ['2.4', '2.4 GHz'], ['5', '5 GHz']] as const).map(([k, l]) => (
            <button key={k} className={`fb-item ${bandF === k ? 'active' : ''}`} onClick={() => setBandF(k)}><span className="fl">{l}</span></button>
          ))}
        </div>
        {acOn && apNames.length > 0 && (
          <div className="fb-sec">
            <div className="fb-cap">接入点</div>
            <div className="fb-scroll">
              {apNames.map((n) => (
                <button key={n} className={`fb-item ${apF.has(n) ? 'active' : ''}`} onClick={() => setApF(toggle(apF, n))}>
                  <span className={`fbx ${apF.has(n) ? 'on' : ''}`} /><span className="fl">{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="fb-clear" onClick={() => { setBandF('all'); setApF(new Set()) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <Tabs tab={tab} setTab={setTab} />
        {!acOn ? (
          <div className="mcard" style={{ padding: '48px 16px' }}>
            <div className="acoff"><span className="aoi"><IcWifiOff /></span><div className="aot">未开启 AC 功能</div>
              <div className="aod">无线控制器(AC)未启用,无 AP 射频数据。开启后此处显示各 AP 的 2.4G/5G 射频信息。</div></div>
          </div>
        ) : (
          <>
            <div className="mcard" style={{ overflow: 'hidden' }}>
              <div className="sec-h"><span className="st">AP 射频</span><span className="ss">{rows.length} 个射频 · {apNames.length} 台 AP</span></div>
              <DataTable rows={rows} columns={columns} rowKey={(r) => r.key} defaultSort="ap" empty="无射频数据" />
            </div>
            <div className="mcard" style={{ marginTop: 14, padding: '16px 18px 20px' }}>
              <div className="sec-h" style={{ padding: 0, border: 0, marginBottom: 14 }}><span className="st">信道统计</span><span className="ss">各信道在用终端数</span></div>
              <div className="chband"><span className="chlabel" style={{ color: 'var(--orange)' }}>2.4GHz</span>
                <ChannelGrid channels={CH_24} data={chData} color="var(--orange)" />
              </div>
              <div className="chband" style={{ marginTop: 16 }}><span className="chlabel" style={{ color: 'var(--blue)' }}>5GHz</span>
                <ChannelGrid channels={CH_5} data={chData} color="var(--blue)" />
              </div>
            </div>
          </>
        )}
        <div className="foot">数据来源:network/ac/ap-config · monitoring/channel-clients</div>
      </main>
    </>
  )
}

const CH_24 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const CH_5 = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 149, 153, 157, 161, 165]

function ChannelGrid({ channels, data, color }: { channels: number[]; data: Record<number, ChannelClient>; color: string }) {
  const max = Math.max(1, ...channels.map((c) => data[c]?.online ?? 0))
  return (
    <div className="chgrid">
      {channels.map((c) => {
        const d = data[c]
        const on = d?.online ?? 0
        const used = !!d && (d.online > 0 || d.apnum > 0)
        return (
          <div className={`chcell ${used ? 'used' : ''}`} key={c}
            title={used ? `信道 ${c} · ${on} 终端 · ${d.apnum} AP` : `信道 ${c} · 空闲`}>
            <div className="chbar"><i style={{ height: `${used ? 16 + (on / max) * 84 : 0}%`, background: color }} /></div>
            <div className="chn">{c}</div>
            {on > 0 && <div className="chc" style={{ color }}>{on}</div>}
          </div>
        )
      })}
    </div>
  )
}

/* ============================ Behaviour audit ============================ */
function AuditView({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const term = usePoll(ikuai.auditTerminals, mockAuditTerminals, 30000)
  const acct = usePoll(ikuai.auditAccounts, mockAuditAccounts, 30000)
  const protos = usePoll(ikuai.protocols, mockProtocols, 30000)
  const [dim, setDim] = useState<'term' | 'acct'>('term')
  const [q, setQ] = useState('')

  const rowsAll: AuditRow[] = (dim === 'term' ? term.data?.daytime : acct.data?.daytime_vpn) ?? []
  const rows = rowsAll
    .filter((r) => !q || `${r.comment ?? ''} ${r.mac}`.toLowerCase().includes(q.toLowerCase()))
    .slice().sort((a, b) => (b.sum_total_down + b.sum_total_up) - (a.sum_total_down + a.sum_total_up))
  const flowTotal = rows.reduce((s, r) => s + r.sum_total_down + r.sum_total_up, 0) || 1
  const top = rows.map((r, i) => ({ ...r, rank: i + 1, total: r.sum_total_down + r.sum_total_up }))

  const protoRows = (protos.data?.data ?? []).slice().sort((a, b) => b.total - a.total)
  const protoTotal = protoRows.reduce((s, p) => s + p.total, 0) || 1

  const columns: Column<AuditRow & { rank: number; total: number }>[] = [
    { key: 'rank', label: '#', width: 44, render: (r) => <span className={`rankno ${r.rank <= 3 ? 'top' : ''}`}>{r.rank}</span> },
    { key: 'name', label: dim === 'term' ? '终端' : '账号', sort: (r) => r.comment || r.mac, width: 220, render: (r) => <div className="dev"><span className="thumb"><IcClients /></span><div><div className="nm">{r.comment || r.mac}</div><div className="mt">{dim === 'term' ? fmtMac(r.mac) : r.mac}</div></div></div> },
    { key: 'down', label: '下行', align: 'right', sort: (r) => r.sum_total_down, render: (r) => <span className="num" style={{ color: '#2b7fff' }}>{fmtBytes(r.sum_total_down)}</span> },
    { key: 'up', label: '上行', align: 'right', sort: (r) => r.sum_total_up, render: (r) => <span className="num" style={{ color: '#7c6fd6' }}>{fmtBytes(r.sum_total_up)}</span> },
    { key: 'total', label: '总流量', align: 'right', sort: (r) => r.total, render: (r) => <span className="num" style={{ fontWeight: 700 }}>{fmtBytes(r.total)}</span> },
    { key: 'pct', label: '占比', width: 150, render: (r) => <div className="bar"><i style={{ width: `${Math.min(100, (r.total / flowTotal) * 100)}%` }} /><span className="bart">{((r.total / flowTotal) * 100).toFixed(1)}%</span></div> },
  ]

  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索终端 / 账号…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">审计维度</div>
          {([['term', '终端 (MAC)'], ['acct', '认证账号']] as const).map(([k, l]) => (
            <button key={k} className={`fb-item ${dim === k ? 'active' : ''}`} onClick={() => setDim(k)}><span className="fl">{l}</span></button>
          ))}
        </div>
        <div className="fb-note">行为审计为爱快当日聚合数据(traffic-audit),需开启「上网行为审计」功能。</div>
        <button className="fb-clear" onClick={() => setQ('')}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <Tabs tab={tab} setTab={setTab} />
        <div className="ins-cards">
          <div className="mcard ins-card">
            <div className="ic-h">当日审计流量</div>
            <div className="ic-big">{fmtBytes(flowTotal)}</div>
            <div className="ic-sub">{dim === 'term' ? '终端' : '账号'} {rows.length} 个</div>
          </div>
          <div className="mcard ins-card">
            <div className="ic-h"><IcBolt size={14} /> 协议流量 TOP</div>
            {protoRows.slice(0, 6).map((p) => (
              <div className="ic-row" key={p.proto}><span className="rn">{p.proto_name || p.proto}</span><span className="rbar"><i style={{ width: `${(p.total / (protoRows[0]?.total || 1)) * 100}%`, background: 'var(--purple)' }} /></span><span className="rv">{fmtBytes(p.total)}</span></div>
            ))}
            {protoRows.length === 0 && <div className="muted" style={{ fontSize: 12, padding: 6 }}>暂无数据</div>}
          </div>
          <div className="mcard ins-card">
            <div className="ic-h">协议占比</div>
            {protoRows.slice(0, 6).map((p) => (
              <div className="ic-row" key={p.proto}><span className="rn">{p.proto_name || p.proto}</span><span className="rv">{((p.total / protoTotal) * 100).toFixed(1)}%</span></div>
            ))}
          </div>
        </div>

        <div className="mcard" style={{ overflow: 'hidden' }}>
          <div className="sec-h"><span className="st">行为审计排行 · 今日</span><span className="ss">按 {dim === 'term' ? 'MAC' : '认证账号'}</span></div>
          <DataTable rows={top} columns={columns} rowKey={(r) => r.mac} defaultSort="total" defaultDir="desc" empty="暂无审计数据(需开启上网行为审计)" />
        </div>
        <div className="foot">数据来源:monitoring/traffic-audit/{dim === 'term' ? 'terminals' : 'accounts'} · monitoring/protocols</div>
      </main>
    </>
  )
}

function countBy<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const x of arr) { const k = key(x); out[k] = (out[k] ?? 0) + 1 }
  return out
}
function toggle(set: Set<string>, v: string): Set<string> {
  const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n
}
