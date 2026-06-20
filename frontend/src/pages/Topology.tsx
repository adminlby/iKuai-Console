import { useEffect, useRef, useState } from 'react'
import type { SystemInfo, InterfacesStatus } from '../lib/api'
import { ikuai } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import type { PollResult } from '../lib/usePoll'
import { mockAcServices, mockApConfig, mockClientsOnline } from '../lib/mock'
import { fmtInt, fmtRateStr, fmtBytes, toNum } from '../lib/format'
import { IcInternet, IcGateway, IcAp, IcWired, IcWifi } from '../components/icons'
import { DeviceHoverCard } from '../components/DeviceHoverCard'
import type { OnlineClient } from '../lib/api'

interface TNode { id: string; x: number; y: number; icon: JSX.Element; name: string; sub: string; tone: 'blue' | 'green' | 'gray'; online: boolean; small?: boolean; device?: OnlineClient }
interface TEdge { from: string; to: string; label?: string }
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function Topology({ sys, ifaces }: {
  sys: PollResult<{ sysinfo: SystemInfo }>
  ifaces: PollResult<InterfacesStatus>
}) {
  const ac = usePoll(ikuai.acServices, mockAcServices, 30000)
  const aps = usePoll((s) => ikuai.apConfig({ limit: 100 }, s), mockApConfig, 20000)
  const clients = usePoll((s) => ikuai.clientsOnline({ limit: 500 }, s), mockClientsOnline, 10000)
  const acOn = ac.data?.ac_status === 1

  const si = sys.data?.sysinfo
  const ou = si?.online_user
  const wan = ifaces.data?.iface_check?.[0]
  const apList = acOn ? (aps.data?.data ?? []).filter((a) => a.connected === 1) : []
  const clientList = clients.data?.data ?? []

  // ----- line monitoring (join iface_stream + iface_check) -----
  const wansAll = ifaces.data?.iface_check ?? []
  const lines = (ifaces.data?.iface_stream ?? []).map((s) => {
    const chk = wansAll.find((w) => w.interface === s.interface)
    return {
      key: s.interface, interface: s.interface, name: s.comment || chk?.comment || s.interface,
      ip_addr: s.ip_addr || chk?.ip_addr || '', connect_num: s.connect_num,
      upload: s.upload, download: s.download, total_up: s.total_up, total_down: s.total_down,
      internet: chk?.internet || '', online: chk ? chk.result === 'success' : true,
    }
  })

  // ----- build the topology graph in pixel space -----
  const N = clientList.length
  const COLS = Math.max(4, Math.min(14, Math.ceil(Math.sqrt(Math.max(1, N) * 1.7))))
  const CW = 104, CH = 96
  const gridW = COLS * CW
  const W = Math.max(760, gridW + 40)
  const cx = W / 2
  const clientTop = 300
  const grows = Math.ceil(N / COLS)
  const H = clientTop + Math.max(1, grows) * CH + 30

  const nodes: TNode[] = []
  const edges: TEdge[] = []
  const online = wansAll.some((w) => w.result === 'success')
  nodes.push({ id: 'net', x: cx, y: 48, icon: <IcInternet />, name: '互联网', sub: wan?.ip_addr || '', tone: 'gray', online })
  nodes.push({ id: 'gw', x: cx, y: 164, icon: <IcGateway />, name: si?.verinfo.modelname || 'iKuai', sub: si?.ip_addr || '', tone: 'blue', online: true })
  edges.push({ from: 'net', to: 'gw', label: wan ? `${wan.interface.toUpperCase()} · ${fmtRateStr(si?.stream.download ?? 0)}` : 'WAN' })

  // every online client → its own node, gridded under the gateway
  clientList.forEach((c, i) => {
    const col = i % COLS, row = Math.floor(i / COLS)
    const x = (W - gridW) / 2 + col * CW + CW / 2
    const y = clientTop + row * CH
    const is5 = /5g/i.test(c.frequencies || '')
    const wired = !c.ssid && !c.frequencies
    nodes.push({
      id: `c-${c.id}`, x, y, small: true,
      icon: wired ? <IcWired /> : <IcWifi />,
      name: c.termname || c.client_vendor || c.mac, sub: c.ip_addr || '',
      tone: wired ? 'green' : is5 ? 'blue' : 'gray', online: true, device: c,
    })
    edges.push({ from: 'gw', to: `c-${c.id}` })
  })

  const pos = Object.fromEntries(nodes.map((nd) => [nd.id, nd]))

  // ----- zoom / pan -----
  const hostRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(0.85)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [grabbing, setGrabbing] = useState(false)
  const fitted = useRef(false)

  // center the content horizontally on first layout
  useEffect(() => {
    if (fitted.current || !hostRef.current || N === 0) return
    const cw = hostRef.current.clientWidth
    setPan({ x: (cw - W * 0.85) / 2, y: 8 })
    fitted.current = true
  }, [N, W])

  // wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setZoom((z) => {
        const nz = clamp(z * factor, 0.3, 2.5)
        setPan((p) => ({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }))
        return nz
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    setGrabbing(true)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) })
  }
  const onUp = () => { drag.current = null; setGrabbing(false) }
  const zoomBy = (f: number) => setZoom((z) => clamp(z * f, 0.3, 2.5))
  const reset = () => {
    const cw = hostRef.current?.clientWidth ?? W
    setZoom(0.85); setPan({ x: (cw - W * 0.85) / 2, y: 8 })
  }

  return (
    <>
      <aside className="filterbar">
        <div className="fb-scroll">
          <div className="fb-sec" style={{ borderTop: 0 }}>
            <div className="fb-cap">概览</div>
            <div className="topo-stat"><span>网关</span><b>1</b></div>
            <div className="topo-stat"><span>接入点 AP</span><b>{apList.length}</b></div>
            <div className="topo-stat"><span>有线客户端</span><b>{fmtInt(ou?.count_wired ?? 0)}</b></div>
            <div className="topo-stat"><span>无线客户端</span><b>{fmtInt(ou?.count_wireless ?? 0)}</b></div>
            <div className="topo-stat"><span>在线总数</span><b>{fmtInt(ou?.count ?? 0)}</b></div>
          </div>
          <div className="fb-sec">
            <div className="fb-cap">实时吞吐</div>
            <div className="topo-stat"><span>↓ 下载</span><b style={{ color: 'var(--blue)' }}>{fmtRateStr(si?.stream.download ?? 0)}</b></div>
            <div className="topo-stat"><span>↑ 上传</span><b style={{ color: 'var(--purple)' }}>{fmtRateStr(si?.stream.upload ?? 0)}</b></div>
            <div className="topo-stat"><span>连接数</span><b>{fmtInt(si?.stream.connect_num ?? 0)}</b></div>
          </div>
          <div className="fb-note">滚轮缩放 · 拖拽平移 · 每个终端独立成节点。{!acOn && '未开启 AC,AP 不展开。'}</div>
        </div>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">网络拓扑</div><div className="lc">{nodes.length} 个节点 · {N} 终端</div></div>
        <div
          className={`topo ${grabbing ? 'grabbing' : ''}`}
          style={{ height: 480, flex: 'none' }}
          ref={hostRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <div className="topo-vp" style={{ left: pan.x, top: pan.y, zoom, width: W, height: H }}>
            <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              {edges.map((e, i) => {
                const a = pos[e.from], b = pos[e.to]
                if (!a || !b) return null
                const my = (a.y + b.y) / 2
                return (
                  <path key={i} d={`M${a.x} ${a.y + 18} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y - 22}`}
                    fill="none" stroke="var(--border-2)" strokeWidth={1.4} />
                )
              })}
            </svg>
            {nodes.map((nd) => (
              <div key={nd.id} className={`topo-node ${nd.tone} ${nd.small ? 'sm' : ''}`} style={{ left: nd.x, top: nd.y, position: 'absolute' }}>
                <span className="tn-ic">{nd.icon}<span className={`tn-dot ${nd.online ? 'on' : 'off'}`} /></span>
                <span className="tn-nm">{nd.name}</span>
                {nd.sub && <span className="tn-sub">{nd.sub}</span>}
                {nd.device && <DeviceHoverCard device={nd.device} />}
              </div>
            ))}
          </div>
          <div className="topo-zoom">
            <button title="放大" onClick={() => zoomBy(1.2)}>+</button>
            <button title="缩小" onClick={() => zoomBy(1 / 1.2)}>−</button>
            <button title="重置" onClick={reset} style={{ fontSize: 12 }}>⤢</button>
          </div>
          <div className="topo-hint">{Math.round(zoom * 100)}%</div>
        </div>

        {/* 线路监控 */}
        <div className="list-head" style={{ marginTop: 18 }}><div className="lt" style={{ fontSize: 15 }}>线路监控</div><div className="lc">{lines.length} 条线路</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>
          <table className="dtable">
            <thead><tr><th>线路</th><th>IP 地址</th><th className="r">连接数</th><th className="r">上行速率</th><th className="r">下行速率</th><th className="r">累计上行</th><th className="r">累计下行</th></tr></thead>
            <tbody>
              {lines.length === 0 ? <tr><td className="dt-empty" colSpan={7}>暂无线路数据</td></tr> : lines.map((l) => (
                <tr key={l.key}>
                  <td><div className="dev"><span className={`sdot2 ${l.online ? 'on' : 'off'}`} /><div><div className="nm">{l.name}</div><div className="mt">{l.interface.toUpperCase()}{l.internet ? ` · ${l.internet}` : ''}</div></div></div></td>
                  <td className="num">{l.ip_addr || '—'}</td>
                  <td className="r num">{l.connect_num && l.connect_num !== '--' ? l.connect_num : '—'}</td>
                  <td className="r num" style={{ color: '#7c6fd6' }}>↑ {fmtRateStr(toNum(l.upload))}</td>
                  <td className="r num" style={{ color: '#2b7fff' }}>↓ {fmtRateStr(toNum(l.download))}</td>
                  <td className="r num">{fmtBytes(toNum(l.total_up))}</td>
                  <td className="r num">{fmtBytes(toNum(l.total_down))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="foot">数据来源:monitoring/interfaces-status + clients-online</div>
      </main>
    </>
  )
}
