import { useState } from 'react'
import { ikuai } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import { mockLogWarnings, mockLogMessageCenter } from '../lib/mock'
import { fmtDateTime } from '../lib/format'
import { IcBell, IcInfo, IcSecurity } from './icons'

interface NotiItem { id: string; kind: 'warn' | 'msg'; title: string; detail: string; time: number; sev: number }

const READ_KEY = 'ikuai-noti-read'
const loadRead = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')) } catch { return new Set() }
}
const saveRead = (s: Set<string>) => localStorage.setItem(READ_KEY, JSON.stringify([...s]))

/** Header bell → real notifications from warnings + message-center, with read/unread. */
export function Notifications() {
  const warn = usePoll(ikuai.logWarnings, mockLogWarnings, 30000)
  const msg = usePoll(ikuai.logMessageCenter, mockLogMessageCenter, 60000)
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(loadRead)

  const items: NotiItem[] = [
    ...(warn.data?.data ?? []).map((r) => ({
      id: `w-${r.id ?? r.timestamp}-${r.title ?? ''}`, kind: 'warn' as const,
      title: r.title || r.event || '告警', detail: r.detail || '', time: r.timestamp || 0,
      sev: typeof r.level === 'number' ? r.level : 2,
    })),
    ...(msg.data?.data ?? []).map((r, i) => ({
      id: `m-${r.id ?? i}-${r.title ?? ''}`, kind: 'msg' as const,
      title: r.title || '通知', detail: r.detail || '', time: r.timestamp || 0, sev: 1,
    })),
  ].sort((a, b) => b.time - a.time)

  const unread = items.filter((it) => !read.has(it.id)).length
  const update = (s: Set<string>) => { setRead(s); saveRead(s) }
  const markOne = (id: string) => { const s = new Set(read); s.add(id); update(s) }
  const markAll = () => update(new Set([...read, ...items.map((it) => it.id)]))

  return (
    <div className="noti-wrap">
      <button className="hbtn" title="通知" onClick={() => setOpen((v) => !v)}>
        <IcBell />
        {unread > 0 && <span className="noti-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <>
          <div className="noti-back" onClick={() => setOpen(false)} />
          <div className="noti-menu">
            <div className="noti-head">
              通知 {unread > 0 && <span className="nh-c">{unread} 条未读</span>}
              <button className="nh-act" onClick={markAll} disabled={!unread}>全部已读</button>
            </div>
            <div className="noti-list">
              {items.length === 0
                ? <div className="noti-empty">暂无通知</div>
                : items.map((it) => {
                  const isUnread = !read.has(it.id)
                  return (
                    <button key={it.id} className={`noti-item ${isUnread ? 'unread' : ''}`} onClick={() => markOne(it.id)}>
                      <span className={`noti-ic ${it.kind === 'warn' ? 'warn' : ''}`}>{it.kind === 'warn' ? <IcSecurity /> : <IcInfo />}</span>
                      <span className="noti-b">
                        <span className="noti-t">{it.title}</span>
                        {it.detail && <span className="noti-d">{it.detail}</span>}
                        <span className="noti-time">{it.time ? fmtDateTime(it.time) : '系统消息'}</span>
                      </span>
                      {isUnread && <span className="noti-udot" />}
                    </button>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
