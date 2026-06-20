import { useState } from 'react'
import type { SystemInfo, InterfacesStatus } from '../lib/api'
import type { PollResult } from '../lib/usePoll'
import { usePoll } from '../lib/usePoll'
import { svc } from '../lib/svc'
import { mockIspSummary } from '../lib/mock'
import { fmtBytes, fmtRate, fmtUptime, fmtInt } from '../lib/format'
import {
  IcRack, IcGear, IcCollapse, IcDevices, IcClients, IcWired,
  IcDown, IcUp,
} from './icons'

const LAT_TARGETS: { key: 'isp' | 'cloudflare' | 'google' | 'github' | 'microsoft'; label: string }[] = [
  { key: 'isp', label: '运营商' },
  { key: 'cloudflare', label: 'Cloudflare' },
  { key: 'google', label: 'Google' },
  { key: 'github', label: 'GitHub' },
  { key: 'microsoft', label: 'Microsoft' },
]

function latColor(ms: number | null): string {
  if (ms == null) return 'var(--text-3)'
  if (ms < 40) return 'var(--green)'
  if (ms < 120) return 'var(--orange)'
  return 'var(--red)'
}

/** The left detail column — device summary + ISP (real backend data). */
export function DevicePanel({
  sys, ifaces, onCollapse, onNav,
}: {
  sys: PollResult<{ sysinfo: SystemInfo }>
  ifaces: PollResult<InterfacesStatus>
  onCollapse?: () => void
  onNav?: (k: string) => void
}) {
  const si = sys.data?.sysinfo
  const wans = ifaces.data?.iface_check ?? []
  const [sel, setSel] = useState(0)
  const wan = wans[sel] ?? wans[0]

  // ISP connectivity backend (server/index.mjs). Falls back to mock only if the
  // backend process isn't running and VITE_ALLOW_MOCK !== '0'.
  const isp = usePoll(svc.summary, mockIspSummary)
  const sum = isp.data

  const ou = si?.online_user
  const dl = fmtRate(si?.stream.download ?? 0)
  const ul = fmtRate(si?.stream.upload ?? 0)
  const monthly = fmtBytes((si?.stream.total_down ?? 0) + (si?.stream.total_up ?? 0))
  const wanOk = wans.filter((w) => w.result === 'success').length
  const tabCount = Math.max(wans.length, 1)

  const ispName = sum?.isp || wan?.comment || wan?.internet || 'ISP'

  return (
    <aside className="upanel">
      {/* ===== Device card ===== */}
      <div className="pcard">
        <div className="dev-head">
          <div className="dev-thumb"><IcRack /></div>
          <div className="dev-name">{si?.verinfo.modelname || 'iKuai Gateway'}</div>
          <button className="dev-icobtn" title="系统设置" onClick={() => onNav?.('system')}><IcGear /></button>
          <button className="dev-icobtn" title="收起侧栏" onClick={onCollapse}><IcCollapse /></button>
        </div>

        <div className="dev-counts">
          <span className="dcount"><IcRack size={17} /> 1</span>
          <span className="ln" />
          <span className="dcount"><IcDevices /> {fmtInt(wans.length)}{wanOk < wans.length && <i className="alert" />}</span>
          <span className="ln dot" />
          <span className="dcount"><IcWired /> {fmtInt(ou?.count_wired ?? 0)}</span>
          <span className="ln dash" />
          <span className="dcount"><IcClients /> {fmtInt(ou?.count ?? 0)}</span>
        </div>

        <div className="wan-tabs">
          {Array.from({ length: Math.min(4, tabCount) }, (_, i) => (
            <button
              key={i}
              className={`wan-tab ${i === sel ? 'on' : ''} ${i >= wans.length ? 'off' : ''}`}
              onClick={() => i < wans.length && setSel(i)}
            >
              WAN{i + 1}
            </button>
          ))}
        </div>

        <div className="kv"><span className="k">系统运行时长</span><span className="v">{fmtUptime(si?.uptime ?? 0)}</span></div>
        <div className="kv"><span className="k">WAN IP（{wan?.interface?.toUpperCase() || '—'}）</span><span className="v">{wan?.ip_addr || '—'}</span></div>
        <div className="kv"><span className="k">网关 IP</span><span className="v">{wan?.gateway || '—'}</span></div>

        <div className="dev-foot">
          <span className="verchip"><IcGear size={13} /> iKuai OS {si?.verinfo.version || '—'}</span>
          <span className="vsp" />
          <span className="verchip">Network {si?.verinfo.verstring?.split(' ')[0] || '—'}</span>
        </div>
      </div>

      {/* ===== ISP card (real name + latency from the backend) ===== */}
      <div className="pcard"><div className="pcard-b">
        <div className="prow">
          <div className="pttl"><IspGlyph /> {ispName}</div>
          <span className={`pill ${sum?.online === false ? 'red' : 'green'}`} style={{ marginLeft: 'auto' }}>
            <span className="pdot" />{sum?.online === false ? '断线' : '在线'}
          </span>
        </div>
        <div className="isp-line"><span className="k">本月数据用量</span><span className="v">{monthly}</span></div>
        <div className="isp-line">
          <span className="k">实时活动</span>
          <span className="act">
            <span className="a dn"><IcDown />{dl.value}<small style={{ color: 'var(--text-3)', fontWeight: 500 }}> {dl.unit}</small></span>
            <span className="a up"><IcUp />{ul.value}<small style={{ color: 'var(--text-3)', fontWeight: 500 }}> {ul.unit}</small></span>
          </span>
        </div>

        <div className="latlist">
          {LAT_TARGETS.map((t) => {
            const ms = sum?.latencies ? sum.latencies[t.key] : null
            return (
              <div className="latrow" key={t.key}>
                <span className="ld" style={{ background: latColor(ms) }} />
                <span className="ln2">{t.label}</span>
                <span className="lv" style={{ color: latColor(ms) }}>{ms == null ? '—' : `${ms} ms`}</span>
              </div>
            )
          })}
        </div>
        <div className="latfoot">
          {isp.source === 'mock'
            ? '后端未运行，显示示例数据（启动 backend 后为真实探测）'
            : <>每 {fmtInterval(sum?.intervalMs ?? 60000)} 探测 · 上次 {sum?.updatedAt ? ago(sum.updatedAt) : '—'}</>}
        </div>
      </div></div>
    </aside>
  )
}

function fmtInterval(ms: number): string {
  return ms < 60000 ? `${Math.round(ms / 1000)} 秒` : `${Math.round(ms / 60000)} 分钟`
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 60) return `${s} 秒前`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m} 分 ${s % 60} 秒前` : `${Math.floor(m / 60)} 小时前`
}

function IspGlyph() {
  return (
    <span style={{
      width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg,#00a8e0,#0057b8)',
      display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, fontWeight: 800,
    }}>i</span>
  )
}
