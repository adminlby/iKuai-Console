import type { ReactNode } from 'react'
import type { Source } from '../lib/usePoll'
import { IcChevron } from './icons'

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>
}

export function CardHeader({
  title, sub, right, action, onAction,
}: { title: string; sub?: string; right?: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="card-h">
      <h3>{title}</h3>
      {sub && <span className="sub">{sub}</span>}
      {right}
      {action && (
        <div className="more" onClick={onAction} role="button">
          {action} <IcChevron />
        </div>
      )}
    </div>
  )
}

export function Pill({ tone = 'gray', dot = false, children }: { tone?: 'green' | 'blue' | 'orange' | 'red' | 'gray'; dot?: boolean; children: ReactNode }) {
  return <span className={`pill ${tone}`}>{dot && <span className="pdot" />}{children}</span>
}

export function Gauge({ name, value, suffix = '%', color, max = 100 }: { name: string; value: number; suffix?: string; color: string; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="gauge">
      <div className="gname">{name}</div>
      <div className="gbar"><i style={{ width: `${pct}%`, background: color }} /></div>
      <div className="gval">{Math.round(value)}{suffix}</div>
    </div>
  )
}

export function SignalBars({ level }: { level: number }) {
  // level 0..4 ; 0 (or wired) handled by caller
  return (
    <span className="sig">
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= level ? 'on' : ''} style={{ height: 4 + n * 3 }} />
      ))}
    </span>
  )
}

export function SourceBadge({ source, error }: { source: Source; error: string | null }) {
  if (source === 'live') return <span className="srcbadge live" title="数据来自真实设备"><span className="bdot" />LIVE</span>
  if (source === 'mock') return <span className="srcbadge mock" title={error ?? '设备不可达，使用模拟数据'}><span className="bdot" />MOCK</span>
  if (source === 'error') return <span className="srcbadge mock" title={error ?? ''}><span className="bdot" />离线</span>
  return <span className="srcbadge mock"><span className="bdot" />连接中…</span>
}
