import { useState } from 'react'
import type {
  SystemInfo, InterfacesStatus, OnlineClient, ApConfig,
  WirelessScore, WirelessStatistics, ChannelClient,
} from '../lib/api'
import { ikuai } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import type { PollResult } from '../lib/usePoll'
import {
  mockClientsOnline, mockAcServices, mockWirelessScore, mockWirelessStatistics,
  mockApConfig, mockChannelClients, mockIspSummary, mockIspHistory, mockNetworkLoad,
  mockInterfacesTraffic, mockSsidClients, mockWirelessTraffic,
} from '../lib/mock'
import { svc } from '../lib/svc'
import { fmtClock, toNum } from '../lib/format'
import { HealthChart } from '../components/charts'
import { DeviceHoverCard } from '../components/DeviceHoverCard'
import {
  IcChevronDown, IcCheck, IcLaptop, IcTv, IcGame, IcNas, IcWifi, IcWifiOff, IcInfo, IcAp,
  IcClients, IcWired,
} from '../components/icons'

type Span = 'RT' | '1H' | '1D' | '1W'

/** Map a span to iKuai /monitoring/network query params (real time range). */
function rangeParams(span: Span) {
  const now = Math.floor(Date.now() / 1000)
  const c = {
    'RT': { datetype: 'hour' as const, secs: 300 },
    '1H': { datetype: 'hour' as const, secs: 3600 },
    '1D': { datetype: 'day' as const, secs: 86400 },
    '1W': { datetype: 'week' as const, secs: 604800 },
  }[span]
  return { datetype: c.datetype, start_time: now - c.secs, end_time: now, math: 'max' as const }
}

function fmtTs(sec: number, span: Span, withDate = false): string {
  const d = new Date(sec * 1000)
  const p = (x: number) => String(x).padStart(2, '0')
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`
  if (span === '1W') return withDate ? `${p(d.getMonth() + 1)}/${p(d.getDate())} ${hm}` : `${p(d.getMonth() + 1)}/${p(d.getDate())}`
  return hm
}

/** ~7 evenly-spaced real time labels for the x-axis. */
function axisTimeLabels(ts: number[], span: Span): string[] {
  if (!ts.length) return []
  const N = 7
  const first = new Date(ts[0] * 1000)
  const last = new Date(ts[ts.length - 1] * 1000)
  const crossesDay = first.toDateString() !== last.toDateString()
  return Array.from({ length: N }, (_, i) => fmtTs(ts[Math.round((i / (N - 1)) * (ts.length - 1))], span, crossesDay))
}

function axisLabels(peak: number): string[] {
  const top = niceMax(peak)
  return [4, 3, 2, 1, 0].map((i) => {
    const v = (top * i) / 4
    return v >= 100 ? String(Math.round(v)) : v.toFixed(1)
  })
}
function niceMax(v: number): number {
  if (v <= 1) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / mag
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * mag
}

const scoreColor = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--orange)' : 'var(--red)')

export function Dashboard({
  sys, ifaces,
}: {
  sys: PollResult<{ sysinfo: SystemInfo }>
  ifaces: PollResult<InterfacesStatus>
}) {
  const clients = usePoll((s) => ikuai.clientsOnline({ limit: 30 }, s), mockClientsOnline, 5000)
  // ISP backend — refresh at the default cadence (same as the other live polls).
  // Note: the VALUES only change once per backend probe (PROBE_INTERVAL_MS);
  // polling faster just shows each new probe sooner, it doesn't probe more often.
  const ispSum = usePoll(svc.summary, mockIspSummary)
  const ispHist = usePoll((s) => svc.history({ buckets: 60, hours: 24 }, s), mockIspHistory)
  // AC / wireless (only rendered when the AC controller is on)
  const ac = usePoll(ikuai.acServices, mockAcServices, 30000)
  const wscore = usePoll(ikuai.wirelessScore, mockWirelessScore, 15000)
  const wstat = usePoll(ikuai.wirelessStatistics, mockWirelessStatistics, 15000)
  const aps = usePoll((s) => ikuai.apConfig({ limit: 100 }, s), mockApConfig, 20000)
  const channels = usePoll(ikuai.channelClients, mockChannelClients, 30000)
  const acOn = ac.data?.ac_status === 1

  const [tab, setTab] = useState<'all' | 'wifi'>('all')
  const [span, setSpan] = useState<Span>('1D')
  const [showUpload, setShowUpload] = useState(true)
  const [source, setSource] = useState('net')   // 'net' = total, else an interface name
  const [menuOpen, setMenuOpen] = useState(false)

  // Total throughput (supports real 1H/1D/1W); per-interface 24h history.
  const net = usePoll((s) => ikuai.networkLoad(rangeParams(span), s), () => mockNetworkLoad(span), span === 'RT' ? 5000 : 30000, span)
  const iftraffic = usePoll(ikuai.interfacesTraffic, mockInterfacesTraffic, 30000)

  const si = sys.data?.sysinfo
  const isNet = source === 'net'
  const spanSecs = { 'RT': 300, '1H': 3600, '1D': 86400, '1W': 604800 }[span]

  // chart series for the selected source (both normalized to Mbps)
  let chartTs: number[], dlSeries: number[], ulSeries: number[]
  if (isNet) {
    const st = net.data?.rate_stat ?? []
    chartTs = st.map((r) => r.timestamp)
    dlSeries = st.map((r) => (r.max_download * 8) / 1e6)
    ulSeries = st.map((r) => (r.max_upload * 8) / 1e6)
  } else {
    const nowSec = Math.floor(Date.now() / 1000)
    const rows = (iftraffic.data?.wans_stat_history ?? [])
      .filter((r) => r.interface === source && r.timestamp >= nowSec - spanSecs)
      .sort((a, b) => a.timestamp - b.timestamp)
    chartTs = rows.map((r) => r.timestamp)
    dlSeries = rows.map((r) => parseFloat(r.max_download) * 0.008)   // KB/s → Mbps
    ulSeries = rows.map((r) => parseFloat(r.max_upload) * 0.008)
  }
  const chartSeries = [
    { points: dlSeries.length ? dlSeries : [0, 0], color: '#3b8bff', fillId: 'gdl', fillOpacity: 0.22, label: '下载' },
    ...(showUpload ? [{ points: ulSeries.length ? ulSeries : [0, 0], color: '#7c6fd6', fillId: 'gul', fillOpacity: 0.3, label: '上传' }] : []),
  ]
  const peak = Math.max(1, ...dlSeries, ...(showUpload ? ulSeries : []))
  const yLabels = axisLabels(peak)
  const xLabels = axisTimeLabels(chartTs, span)
  const dlNow = dlSeries.length ? dlSeries[dlSeries.length - 1] : 0
  const ulNow = ulSeries.length ? ulSeries[ulSeries.length - 1] : 0

  // data-source dropdown options (total + each interface the device reports)
  const ifaceNames = [...new Set((iftraffic.data?.wans_stat_history ?? []).map((r) => r.interface).filter((x) => x && x !== 'all'))]
  const wanComment = (n: string) => ifaces.data?.iface_check?.find((w) => w.interface === n)?.comment
  const sourceOptions = [
    { key: 'net', short: '互联网总流量', full: '互联网总流量（所有线路）' },
    ...ifaceNames.map((n) => ({ key: n, short: n.toUpperCase(), full: wanComment(n) ? `${n.toUpperCase()} · ${wanComment(n)}` : n.toUpperCase() })),
  ]
  const current = sourceOptions.find((o) => o.key === source) ?? sourceOptions[0]

  const onlineClients = (clients.data?.data ?? []).slice(0, 22)
  const uptime = ispHist.data?.uptime ?? ispSum.data?.uptime24h ?? null
  const perfBuckets = ispHist.data?.buckets_data ?? []

  return (
    <main className="umain">
      {/* ===== tabs + controls ===== */}
      <div className="mhead">
        <div className="htabs2">
          <button className={`htab2 ${tab === 'all' ? 'on' : ''}`} onClick={() => setTab('all')}>全网健康度</button>
          <button className={`htab2 ${tab === 'wifi' ? 'on' : ''}`} onClick={() => setTab('wifi')}>WiFi 健康度</button>
        </div>
        {tab === 'all' && (
          <div className="mright">
            <div className="srcpick">
              <button className="srcbtn" onClick={() => setMenuOpen((o) => !o)}>
                {current.short} <IcChevronDown />
              </button>
              {menuOpen && (
                <>
                  <div className="srcback" onClick={() => setMenuOpen(false)} />
                  <div className="srcmenu">
                    {sourceOptions.map((o) => (
                      <button key={o.key} className={`srcitem ${o.key === source ? 'on' : ''}`}
                        onClick={() => { setSource(o.key); setMenuOpen(false) }}>
                        {o.key === source ? <IcCheck /> : <span style={{ width: 13, flex: '0 0 13px' }} />}
                        {o.full}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="legpick">
              <span className="swln" style={{ background: '#3b8bff' }} />
              下载 <span className="amt">{dlNow.toFixed(1)} Mbps</span>
            </div>
            <button className="legpick cbx" onClick={() => setShowUpload((v) => !v)}>
              <span className={`cbox ${showUpload ? 'on' : ''}`}>{showUpload && <IcCheck />}</span>
              <span className="swln" style={{ background: '#7c6fd6' }} /> 上传 <span className="amt">{ulNow.toFixed(1)} Mbps</span>
            </button>
            <div className="tgl">
              {(['RT', '1H', '1D', '1W'] as const).map((s) => (
                <button key={s} className={span === s ? 'on' : ''} onClick={() => setSpan(s)}>{s === 'RT' ? '实时' : s}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === 'all' ? <>{/* ============================ ALL ============================ */}

      {/* ===== big chart (real throughput history, hover for value@time) ===== */}
      <div className="mcard">
        <div className="chart-wrap">
          <div className="chart-ycap">Mbps</div>
          <HealthChart
            series={chartSeries}
            timestamps={chartTs}
            unit=" Mbps"
            formatVal={(v) => v.toFixed(1)}
            formatTime={(t) => fmtTs(t, span, true)}
          />
          <div style={{ position: 'absolute', top: 8, right: 8, bottom: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', textAlign: 'right', pointerEvents: 'none' }}>
            {yLabels.map((l, i) => <span key={i}>{l}</span>)}
          </div>
        </div>
        <div className="chart-axis">
          {(xLabels.length ? xLabels : ['', '', '', '', '', '', '']).map((l, i) => <span key={i}>{l}</span>)}
        </div>
      </div>
      {!isNet && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 2px 0' }}>
          <IcInfo size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          线路({current.short})历史仅最近 24 小时;1W 视图按可用数据显示。
        </div>
      )}

      {/* ===== ISP performance bar (real, from backend history) ===== */}
      <div className="mcard perf">
        <div className="plabel">
          <b>ISP 性能</b>
          <span className="up">
            {uptime == null
              ? <span className="muted">采集中…</span>
              : <>在线率 <b>{uptime}%</b></>}
          </span>
        </div>
        <div className="perfbar">
          {perfBuckets.length === 0
            ? <i style={{ background: 'var(--surface-3)' }} />
            : perfBuckets.map((b, i) => <i key={i} style={{ background: bucketColor(b.ratio) }} title={bucketTitle(b)} />)}
        </div>
        <span className="pchev"><IcChevronDown style={{ transform: 'rotate(-90deg)' }} /></span>
      </div>
      {ispSum.source === 'mock' && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', margin: '6px 2px 0' }}>
          <IcInfo size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          ISP 后端未运行，显示示例数据。启动 backend（<code>npm run backend</code> 或容器）后为真实探测。
        </div>
      )}

      {/* ===== client / app icon strip ===== */}
      <div className="mcard strip">
        {onlineClients.length === 0
          ? <span className="muted" style={{ padding: 8 }}>暂无在线客户端</span>
          : onlineClients.map((c) => (
            <div className="appcell" key={c.id}>
              <span className="ic" style={iconTint(c)}>{deviceIcon(c)}</span>
              <span className="nm">{shortName(c)}</span>
              <DeviceHoverCard device={c} />
            </div>
          ))}
      </div>

      {/* ===== radio retries + connectivity ===== */}
      <div className="msplit">
        <div className="mcard">
          <div className="sec-h"><span className="st">AP 丢包 / 重传率</span><span className="schev"><IcChevronDown style={{ transform: 'rotate(-90deg)' }} /></span></div>
          <div className="sec-b">
            {!acOn ? <AcOff /> : <RadioLoss dropptk={wscore.data?.total_count_net_status.dropptk ?? 0} />}
          </div>
        </div>

        <div className="mcard">
          <div className="sec-h">
            <span className="st">WiFi 连接</span>
            {acOn && <span className="ss">关联稳定度 <b>{wscore.data?.total_count_net_status.score_conn_sta ?? '—'}%</b></span>}
            <span className="schev"><IcChevronDown style={{ transform: 'rotate(-90deg)' }} /></span>
          </div>
          <div className="sec-b">
            {!acOn ? <AcOff /> : wscore.data ? <Connectivity s={wscore.data.total_count_net_status} /> : <div className="muted" style={{ padding: 12 }}>加载中…</div>}
          </div>
        </div>
      </div>

      {/* ===== AP deployment density ===== */}
      <div className="mcard density">
        <div className="dh">
          <span className="dt">AP 部署密度</span>
          {acOn && <span className="ss" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>在线 AP <b style={{ color: 'var(--green)' }}>{wstat.data?.ap_status.ap_online ?? 0}</b> / {wstat.data?.ap_status.ap_count ?? 0}</span>}
          <span className="dchev"><IcChevronDown style={{ transform: 'rotate(-90deg)' }} /></span>
        </div>
        {!acOn ? <AcOff /> : <Density aps={(aps.data?.data ?? []).filter((a) => a.connected === 1)} />}
      </div>
      </> : (
        <WifiHealth
          acOn={acOn}
          score={wscore.data}
          stat={wstat.data}
          aps={aps.data?.data ?? []}
          channels={channels.data?.channel_sta_history ?? []}
        />
      )}

      <div className="foot">
        {si ? `${si.hostname} · ${si.verinfo.verstring} · ${si.verinfo.arch}/${si.verinfo.sysbit}` : 'iKuai Console'}
        {' '}· UniFi 风格控制台 · 轮询 {Number(import.meta.env.VITE_POLL_MS) || 2000}ms
      </div>
    </main>
  )
}

/* ---------------------------------------------------------------- AC off */
function AcOff() {
  return (
    <div className="acoff">
      <span className="aoi"><IcWifiOff /></span>
      <div className="aot">未开启 AC 功能</div>
      <div className="aod">该路由器的无线控制器（AC）当前未启用，无 AP/无线统计数据。<br />
        在「网络 → AC 管理」开启后，此处将显示真实的 AP 与无线质量数据。</div>
    </div>
  )
}

/* -------------------------------------------------- AP loss / retries (real) */
function RadioLoss({ dropptk }: { dropptk: number }) {
  const pct = Math.max(0, Math.min(30, dropptk))      // scale 0–30%
  const pos = (1 - pct / 30) * 100                     // 0% loss → right (good)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(100 - dropptk * 3) }}>{dropptk}%</span>
        <span className="muted" style={{ fontSize: 12 }}>当前丢包率（2.4G + 5G 均值）</span>
      </div>
      <div className="lossbar">
        <span className="lossmark" style={{ left: `${pos}%` }} />
      </div>
      <div className="scaleticks">
        {['30%+', '25%', '20%', '15%', '10%', '5%', '0%'].map((t) => <span key={t}>{t}</span>)}
      </div>
    </>
  )
}

/* ---------------------------------------------------- WiFi connectivity (real) */
function Connectivity({ s }: { s: { score_conn_sta: number; score_chutil_load: number; score_channf_load: number; score_active_user: number; delay: number; coverage: number } }) {
  const cols = [
    { label: '关联稳定度', v: s.score_conn_sta },
    { label: '空口健康度', v: s.score_chutil_load },
    { label: '信道负载', v: s.score_channf_load },
    { label: '用户活跃度', v: s.score_active_user },
  ]
  return (
    <>
      <div className="conn">
        {cols.map((c) => (
          <div className="col" key={c.label}>
            <div className="cl">{c.label}</div>
            <div className="cv" style={{ color: scoreColor(c.v) }}>{c.v}%</div>
            <div className="cu"><i style={{ width: `${c.v}%`, background: scoreColor(c.v) }} /></div>
          </div>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 11.5, marginTop: 14, display: 'flex', gap: 18 }}>
        <span>延迟 <b style={{ color: 'var(--text)' }}>{s.delay} ms</b></span>
        <span>信号覆盖 <b style={{ color: 'var(--text)' }}>{s.coverage}%</b></span>
      </div>
    </>
  )
}

/* -------------------------------------------------- AP deployment density (real) */
function Density({ aps }: { aps: ApConfig[] }) {
  // place each AP on the -90..-30 dBm scale by its strongest band signal
  const dbmPos = (dbm: number) => Math.max(0, Math.min(100, ((dbm + 90) / 60) * 100))
  const marks = aps.map((a) => {
    const sig = Math.max(a.signal_str || -90, a.signal_str_5g || -90)
    return { name: a.tagname || a.comment || a.mac, dbm: sig, model: a.ap_model }
  })
  return (
    <>
      <div className="densbar">
        {marks.length === 0
          ? <span className="muted" style={{ position: 'absolute', left: 10, top: -22, fontSize: 12 }}>无已连接 AP</span>
          : marks.map((m, i) => (
            <span className="densmark" key={i} style={{ left: `${dbmPos(m.dbm)}%`, borderColor: m.dbm >= -60 ? 'var(--green-2)' : m.dbm >= -75 ? 'var(--orange)' : 'var(--red)' }}
              title={`${m.name} · ${m.dbm} dBm · ${m.model}`}>
              <IcAp />
            </span>
          ))}
      </div>
      <div className="densticks">
        {['-90', '-85', '-80', '-75', '-65', '-60', '-55', '-50', '-45', '-30'].map((t) => <span key={t}>{t}</span>)}
      </div>
    </>
  )
}

/* ============================ WiFi Health page ============================ */
function WifiHealth({
  acOn, score, stat, aps, channels,
}: {
  acOn: boolean
  score: WirelessScore | null
  stat: WirelessStatistics | null
  aps: ApConfig[]
  channels: ChannelClient[]
}) {
  const ssid = usePoll(ikuai.ssidClients, mockSsidClients, 30000)
  const wtraffic = usePoll(ikuai.wirelessTraffic, mockWirelessTraffic, 15000)
  if (!acOn) {
    return <div className="mcard" style={{ padding: '40px 16px' }}><AcOff /></div>
  }
  if (!score || !stat) {
    return <div className="mcard" style={{ padding: 40, textAlign: 'center' }} ><span className="muted">加载无线数据…</span></div>
  }
  const s = score.total_count_net_status
  const ap = stat.ap_status
  const clt = stat.clt_status
  const scores = [
    { label: '关联稳定度', v: s.score_conn_sta },
    { label: '空口健康度', v: s.score_chutil_load },
    { label: '信道负载', v: s.score_channf_load },
    { label: '用户活跃度', v: s.score_active_user },
  ]
  const connectedAps = aps.filter((a) => a.connected === 1)
  const cur = latestChannels(channels)
  const maxOnline = Math.max(1, ...cur.map((c) => c.online))
  const cltTotal = Math.max(1, clt.clt_count)

  // SSID terminal TOP5 (latest snapshot)
  const ssidHist = ssid.data?.ssid_sta_history ?? []
  const ssidTop = (() => {
    if (!ssidHist.length) return []
    const maxTs = Math.max(...ssidHist.map((x) => x.timestamp))
    return ssidHist.filter((x) => x.timestamp === maxTs).sort((a, b) => b.total - a.total).slice(0, 5)
  })()
  const ssidMax = Math.max(1, ...ssidTop.map((x) => x.total))
  // wireless traffic history (bps → Mbps)
  const wf = wtraffic.data?.total_count_flow ?? []
  const wfTs = wf.map((f) => f.timestamp)
  const wfSeries = [
    { points: wf.length ? wf.map((f) => f.download / 1e6) : [0, 0], color: '#34c47c', fillId: 'wfd', label: '下行', fillOpacity: 0.16 },
    { points: wf.length ? wf.map((f) => f.upload / 1e6) : [0, 0], color: '#7c6fd6', fillId: 'wfu', label: '上行', fillOpacity: 0.12 },
  ]

  return (
    <>
      {/* ---- score cards ---- */}
      <div className="wgrid4">
        {scores.map((c) => (
          <div className="scard" key={c.label}>
            <div className="sl">{c.label}</div>
            <div className="sv" style={{ color: scoreColor(c.v) }}>{c.v}<small style={{ fontSize: 15, color: 'var(--text-3)', fontWeight: 600 }}>分</small></div>
            <div className="sbar"><i style={{ width: `${c.v}%`, background: scoreColor(c.v) }} /></div>
          </div>
        ))}
      </div>
      <div className="mcard" style={{ marginTop: 14, padding: '12px 18px', display: 'flex', gap: 30 }}>
        <span className="kpi">平均延迟 <b>{s.delay}<small> ms</small></b></span>
        <span className="kpi">信号覆盖 <b style={{ color: scoreColor(s.coverage) }}>{s.coverage}<small> %</small></b></span>
        <span className="kpi">丢包率 <b style={{ color: scoreColor(100 - s.dropptk * 3) }}>{s.dropptk}<small> %</small></b></span>
      </div>

      {/* ---- AP + client stats ---- */}
      <div className="wstats">
        <div className="mcard">
          <div className="sec-h"><span className="st">AP 状态</span></div>
          <div className="sec-b">
            <div className="statline"><span className="k">在线 / 总数</span><span className="v"><span style={{ color: 'var(--green)' }}>{ap.ap_online}</span> / {ap.ap_count}</span></div>
            <div className="statline"><span className="k">离线</span><span className="v" style={{ color: ap.ap_offline ? 'var(--red)' : undefined }}>{ap.ap_offline}</span></div>
            <div className="statline"><span className="k">支持漫游</span><span className="v">{ap.ap_roaming}</span></div>
            <div className="statline"><span className="k">5G 优先</span><span className="v">{ap.ap_perfer_5g}</span></div>
          </div>
        </div>
        <div className="mcard">
          <div className="sec-h"><span className="st">终端分布</span><span className="ss">共 <b>{clt.clt_count}</b></span></div>
          <div className="sec-b">
            <div className="splitbar">
              <i style={{ width: `${(clt.clt_count_2g / cltTotal) * 100}%`, background: 'var(--orange)' }} title={`2.4G ${clt.clt_count_2g}`} />
              <i style={{ width: `${(clt.clt_count_5g / cltTotal) * 100}%`, background: 'var(--blue)' }} title={`5G ${clt.clt_count_5g}`} />
            </div>
            <div className="statline"><span className="k"><span className="dotc" style={{ background: 'var(--orange)' }} />2.4 GHz</span><span className="v">{clt.clt_count_2g}</span></div>
            <div className="statline"><span className="k"><span className="dotc" style={{ background: 'var(--blue)' }} />5 GHz</span><span className="v">{clt.clt_count_5g}</span></div>
            <div className="statline"><span className="k">活跃 / 非活跃</span><span className="v">{clt.clt_active} / {clt.clt_inactive}</span></div>
            <div className="statline"><span className="k">24h 峰值</span><span className="v">{clt.clt_max_online}</span></div>
          </div>
        </div>
      </div>

      {/* ---- AP list ---- */}
      <div className="mcard" style={{ marginTop: 14, overflow: 'hidden' }}>
        <div className="sec-h"><span className="st">接入点（AP）</span><span className="ss">{connectedAps.length} 台在线</span></div>
        {connectedAps.length === 0
          ? <div className="sec-b"><span className="muted">无已连接 AP</span></div>
          : (
            <table className="aptbl">
              <thead><tr><th>名称</th><th>型号</th><th>信道 2.4G/5G</th><th>信号</th><th className="num">终端</th><th className="num">速率</th><th>状态</th></tr></thead>
              <tbody>
                {connectedAps.map((a) => {
                  const sig = Math.max(a.signal_str || -100, a.signal_str_5g || -100)
                  const sigColor = sig >= -60 ? 'var(--green)' : sig >= -75 ? 'var(--orange)' : 'var(--red)'
                  return (
                    <tr key={a.id}>
                      <td><div className="apname"><IcAp /> {a.tagname || a.comment || a.mac}</div></td>
                      <td className="muted">{a.ap_model || '—'}</td>
                      <td className="num">{a.on_channel || '—'}<span className="muted"> / </span>{a.on_channel_5g || '—'}</td>
                      <td className="num" style={{ color: sigColor, fontWeight: 600 }}>{sig <= -100 ? '—' : `${sig} dBm`}</td>
                      <td className="num">{(a.online || 0) + (a.online_5g || 0)}<span className="muted" style={{ fontSize: 11 }}> ({a.online || 0}/{a.online_5g || 0})</span></td>
                      <td className="num">{a.link_speed ? `${a.link_speed}M` : '—'}</td>
                      <td><span className="pill green"><span className="pdot" />在线</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* ---- channel distribution ---- */}
      <div className="mcard" style={{ marginTop: 14 }}>
        <div className="sec-h"><span className="st">信道分布</span><span className="ss">当前各信道终端 / AP 数</span></div>
        <div className="sec-b">
          {cur.length === 0
            ? <span className="muted">暂无信道数据</span>
            : cur.map((c) => (
              <div className="chanrow" key={c.channel}>
                <span className="ch">信道 {c.channel}</span>
                <span className="cbar"><i style={{ width: `${(c.online / maxOnline) * 100}%` }} /></span>
                <span className="cn">{c.online} 终端 · {c.apnum} AP</span>
              </div>
            ))}
        </div>
      </div>

      {/* ---- SSID TOP5 + wireless traffic (Mesh-style) ---- */}
      <div className="wstats" style={{ marginTop: 14 }}>
        <div className="mcard">
          <div className="sec-h"><span className="st">SSID 终端数 TOP5</span></div>
          <div className="sec-b">
            {ssidTop.length === 0 ? <span className="muted">暂无 SSID 数据</span> : ssidTop.map((x) => (
              <div className="ic-row" key={x.ssid}><span className="rn" style={{ width: 140 }}>{x.ssid}</span><span className="rbar"><i style={{ width: `${(x.total / ssidMax) * 100}%`, background: 'var(--blue)' }} /></span><span className="rv">{x.total}</span></div>
            ))}
          </div>
        </div>
        <div className="mcard loadcard">
          <div className="sec-h" style={{ border: 0, paddingBottom: 4 }}>
            <span className="st">无线流量统计</span>
            <div className="chleg"><span><i style={{ background: '#34c47c' }} />下行</span><span><i style={{ background: '#7c6fd6' }} />上行</span></div>
          </div>
          <div style={{ padding: '0 6px' }}>
            <HealthChart series={wfSeries} timestamps={wfTs} height={150} unit=" Mbps" formatVal={(v) => v.toFixed(1)} formatTime={fmtClock} />
          </div>
        </div>
      </div>
    </>
  )
}

/** Most-recent snapshot per channel from the hourly history. */
function latestChannels(rows: ChannelClient[]): ChannelClient[] {
  if (!rows.length) return []
  const maxTs = Math.max(...rows.map((r) => r.timestamp))
  return rows.filter((r) => r.timestamp === maxTs).sort((a, b) => b.online - a.online)
}

/* ---------------------------------------------------------------- helpers */
function bucketColor(ratio: number | null): string {
  if (ratio == null) return 'var(--surface-3)'      // no samples in this slot
  if (ratio >= 0.999) return 'var(--green)'
  if (ratio >= 0.9) return 'var(--yellow)'
  if (ratio >= 0.5) return 'var(--orange)'
  return 'var(--red)'
}

/** Hover text for an ISP-performance cell: time · uptime · avg latency · samples. */
function bucketTitle(b: { t0: number; ratio: number | null; n: number; avgLat?: number | null }): string {
  if (!b.n || b.ratio == null) return `${fmtClock(b.t0)} · 无数据`
  return `${fmtClock(b.t0)} · 在线 ${Math.round(b.ratio * 100)}% · 平均 ${b.avgLat ?? '—'} ms · ${b.n} 次`
}

function shortName(c: OnlineClient): string {
  const nm = c.termname || c.comment || c.client_vendor || c.mac
  return nm.length > 9 ? nm.slice(0, 8) + '…' : nm
}

function deviceIcon(c: OnlineClient) {
  const n = `${c.termname} ${c.client_vendor} ${c.client_model}`.toLowerCase()
  if (/nas|synology|server|qnap/.test(n)) return <IcNas />
  if (/tv|appletv|box|chromecast/.test(n)) return <IcTv />
  if (/ps5|ps4|xbox|switch|game/.test(n)) return <IcGame />
  if (/iphone|ipad|phone|android|redmi|xiaomi|mi /.test(n)) return <IcClients />
  if (/mac|book|laptop|desktop|pc|ubuntu|win/.test(n)) return <IcLaptop />
  if (toNum(c.signal) > 0 || c.frequencies) return <IcWifi />
  return <IcWired />
}

function iconTint(c: OnlineClient): React.CSSProperties {
  const wifi = toNum(c.signal) > 0 || !!c.frequencies
  return wifi
    ? { color: 'var(--blue)', background: 'var(--blue-soft)', borderColor: 'transparent' }
    : { color: 'var(--text-2)' }
}
