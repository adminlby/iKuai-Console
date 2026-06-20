import type { OnlineClient } from '../lib/api'
import { fmtBytes } from '../lib/format'

const pad = (value: number) => String(value).padStart(2, '0')

function periodLabel() {
  const end = new Date()
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${fmt(start)} - ${fmt(end)}`
}

export function DeviceHoverCard({ device }: { device: OnlineClient }) {
  const name = device.termname || device.comment || device.client_vendor || device.mac
  const total = device.total_down + device.total_up

  return (
    <span className="device-hover-card" role="tooltip">
      <span className="dh-title"><i />{name}</span>
      <span className="dh-period">{periodLabel()}</span>
      <span className="dh-row"><span>下载</span><b className="down">↓ {fmtBytes(device.total_down)}</b></span>
      <span className="dh-row"><span>上传</span><b className="up">↑ {fmtBytes(device.total_up)}</b></span>
      <span className="dh-row"><span>流量</span><b>{fmtBytes(total)}</b></span>
      <span className="dh-row"><span>体验</span><b className="good">99%</b></span>
    </span>
  )
}
