// Lightweight hand-rolled SVG charts — no chart library, full control over the
// UniFi look. Sizing uses viewBox + preserveAspectRatio for responsiveness.
import { useState } from 'react'

interface AreaSeries { points: number[]; color: string; fillId: string; label?: string; fillOpacity?: number }

/**
 * The big activity area chart: smooth areas + stroke over light gridlines.
 * Hovering shows a guide line, per-series dots, and a tooltip with the value at
 * that time (timestamps optional — when given the tooltip shows real times).
 */
export function HealthChart({
  series, timestamps, width = 1000, height = 300, padTop = 14, padBottom = 6,
  unit = '', formatVal = (v) => v.toFixed(1), formatTime = (t) => String(t),
}: {
  series: AreaSeries[]
  timestamps?: number[]
  width?: number; height?: number; padTop?: number; padBottom?: number
  unit?: string
  formatVal?: (v: number) => string
  formatTime?: (t: number) => string
}) {
  const n = Math.max(...series.map((s) => s.points.length), 2)
  const max = Math.max(1, ...series.flatMap((s) => s.points)) * 1.18
  const x = (i: number) => (i / (n - 1)) * width
  const y = (v: number) => height - padBottom - (v / max) * (height - padTop - padBottom)
  const [hi, setHi] = useState<number | null>(null)

  // Catmull-Rom → cubic Bézier for a soft, UniFi-like curve.
  const smooth = (arr: number[]) => {
    if (arr.length < 2) return `M0 ${y(arr[0] ?? 0)}`
    let d = `M${x(0).toFixed(1)} ${y(arr[0]).toFixed(1)}`
    for (let i = 0; i < arr.length - 1; i++) {
      const x0 = x(Math.max(0, i - 1)), y0 = y(arr[Math.max(0, i - 1)])
      const x1 = x(i), y1 = y(arr[i])
      const x2 = x(i + 1), y2 = y(arr[i + 1])
      const x3 = x(Math.min(arr.length - 1, i + 2)), y3 = y(arr[Math.min(arr.length - 1, i + 2)])
      const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6
      const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`
    }
    return d
  }
  const toArea = (arr: number[]) => `${smooth(arr)} L${width} ${height} L0 ${height} Z`
  const gridY = Array.from({ length: 5 }, (_, g) => padTop + (g * (height - padTop - padBottom)) / 4)

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - r.left) / r.width
    setHi(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))))
  }
  const leftPct = hi == null ? 0 : (hi / (n - 1)) * 100
  const tipRight = leftPct > 62

  return (
    <div className="chart-host" style={{ position: 'relative', height }}
      onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.fillId} id={s.fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity={s.fillOpacity ?? 0.28} />
              <stop offset="1" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {gridY.map((gy, i) => (
          <line key={i} x1="0" y1={gy} x2={width} y2={gy} stroke="var(--grid)" strokeWidth="1" />
        ))}
        {series.map((s) => (
          <path key={`a-${s.fillId}`} d={toArea(s.points)} fill={`url(#${s.fillId})`} />
        ))}
        {series.map((s) => (
          <path key={`l-${s.fillId}`} d={smooth(s.points)} fill="none" stroke={s.color}
            strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>

      {hi != null && (
        <>
          <div className="chart-guide" style={{ left: `${leftPct}%` }} />
          {series.map((s) => (
            <span key={s.fillId} className="chart-dot"
              style={{ left: `${leftPct}%`, top: `${(y(s.points[hi] ?? 0) / height) * 100}%`, background: s.color }} />
          ))}
          <div className="chart-tip" style={{ left: `${leftPct}%`, transform: tipRight ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }}>
            {timestamps?.[hi] != null && <div className="t">{formatTime(timestamps[hi])}</div>}
            {series.map((s) => (
              <div className="r" key={s.fillId}>
                <span className="sw" style={{ background: s.color }} />
                {s.label ?? ''} <b>{formatVal(s.points[hi] ?? 0)}{unit}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function Sparkline({
  points, color = '#006fff', width = 760, height = 48, fillId = 'sp',
}: { points: number[]; color?: string; width?: number; height?: number; fillId?: string }) {
  const n = Math.max(points.length, 2)
  const max = Math.max(1, ...points) * 1.2
  const x = (i: number) => (i / (n - 1)) * width
  const y = (v: number) => height - 4 - (v / max) * (height - 12)
  const p = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.25" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${p} L${width} ${height} L0 ${height} Z`} fill={`url(#${fillId})`} />
      <path d={p} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export interface DonutSlice { label: string; value: number; color: string }

export function Donut({ slices, size = 140, stroke = 15 }: { slices: DonutSlice[]; size?: number; stroke?: number }) {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2
  let off = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      {slices.map((s, i) => {
        const len = (s.value / total) * c
        const el = (
          <circle
            key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cx})`} strokeLinecap="round"
          />
        )
        off += len
        return el
      })}
    </svg>
  )
}
