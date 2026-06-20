import { useState } from 'react'
import { ikuai } from '../lib/api'
import type { LogRow, LogList } from '../lib/api'
import { usePoll, type PollResult } from '../lib/usePoll'
import {
  mockLogSystem, mockLogWebActivity, mockLogAuth, mockLogDhcp, mockLogPppoe,
  mockLogTerminalPresence, mockLogUrlVisits, mockLogWireless, mockLogArp,
  mockLogDdns, mockLogNotice, mockLogWarnings, mockLogMessageCenter,
} from '../lib/mock'
import { fmtDateTime, fmtBytes, fmtUptime, fmtMac } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcReports } from '../components/icons'

type Cat =
  | 'system' | 'web' | 'auth' | 'dhcp' | 'pppoe' | 'presence' | 'url'
  | 'wireless' | 'arp' | 'ddns' | 'notice' | 'warnings' | 'message'

const timeCol: Column<LogRow> = {
  key: 'time', label: '时间', width: 150, sort: (r) => r.timestamp,
  render: (r) => <span className="num muted">{fmtDateTime(r.timestamp)}</span>,
}
const wide = (label: string, get: (r: LogRow) => string | undefined): Column<LogRow> =>
  ({ key: label, label, render: (r) => <span>{get(r) || '—'}</span> })
const mono = (label: string, get: (r: LogRow) => string | undefined): Column<LogRow> =>
  ({ key: label, label, render: (r) => <span className="num">{get(r) || '—'}</span> })

/** Level pill: string levels (system) or numeric severity (warnings). */
function LevelPill({ level }: { level?: string | number }) {
  const s = String(level ?? '').toLowerCase()
  const sev = typeof level === 'number' ? level : (/err|crit|fatal|3|4|5/.test(s) ? 3 : /warn|2/.test(s) ? 2 : 1)
  const tone = sev >= 3 ? 'red' : sev === 2 ? 'orange' : 'gray'
  const label = typeof level === 'number'
    ? (level >= 3 ? '严重' : level === 2 ? '警告' : '提示')
    : (s === 'error' || s === 'err' ? '错误' : s === 'warn' || s === 'warning' ? '警告' : s === 'info' ? '信息' : (level || '—'))
  return <span className={`pill ${tone === 'orange' ? 'gray' : tone}`} style={tone === 'orange' ? { background: 'var(--surface-3)', color: 'var(--orange)' } : undefined}>{label}</span>
}
const Result = ({ r }: { r?: string }) => <span className={`pill ${/成功|success|ok/i.test(r || '') ? 'green' : /失败|fail|error/i.test(r || '') ? 'red' : 'gray'}`}>{r || '—'}</span>
const Action = ({ a }: { a?: string }) => {
  const s = a || ''
  const on = /关联|上线|login|online|connect|assoc/i.test(s)
  const label = s === 'login' ? '上线' : s === 'logout' ? '下线' : (s || '—')
  return <span className={`pill ${on ? 'green' : 'gray'}`}>{label}</span>
}

interface LogCat { key: Cat; label: string; src: string; poll: PollResult<LogList>; cols: Column<LogRow>[] }

export function Logs() {
  const polls = {
    system: usePoll(ikuai.logSystem, mockLogSystem, 20000),
    web: usePoll(ikuai.logWebActivity, mockLogWebActivity, 20000),
    auth: usePoll(ikuai.logAuth, mockLogAuth, 20000),
    dhcp: usePoll(ikuai.logDhcp, mockLogDhcp, 20000),
    pppoe: usePoll(ikuai.logPppoe, mockLogPppoe, 20000),
    presence: usePoll(ikuai.logTerminalPresence, mockLogTerminalPresence, 20000),
    url: usePoll(ikuai.logUrlVisits, mockLogUrlVisits, 20000),
    wireless: usePoll(ikuai.logWireless, mockLogWireless, 20000),
    arp: usePoll(ikuai.logArp, mockLogArp, 20000),
    ddns: usePoll(ikuai.logDdns, mockLogDdns, 20000),
    notice: usePoll(ikuai.logNotice, mockLogNotice, 20000),
    warnings: usePoll(ikuai.logWarnings, mockLogWarnings, 20000),
    message: usePoll(ikuai.logMessageCenter, mockLogMessageCenter, 20000),
  }

  const CATS: LogCat[] = [
    // real device returns only { content, id, timestamp }; level/module render only if the firmware supplies them
    { key: 'system', label: '系统日志', src: 'log/system', poll: polls.system, cols: [timeCol, { key: 'lv', label: '级别', render: (r) => r.level ? <LevelPill level={r.level} /> : <span className="muted">—</span> }, wide('内容', (r) => r.message || r.content)] },
    { key: 'web', label: 'WEB 操作', src: 'log/web_activity', poll: polls.web, cols: [timeCol, mono('用户', (r) => r.username), mono('来源 IP', (r) => r.ip_addr), wide('功能', (r) => r.function), wide('操作', (r) => r.event)] },
    { key: 'auth', label: '认证日志', src: 'log/auth', poll: polls.auth, cols: [timeCol, mono('用户', (r) => r.username), wide('类型', (r) => r.ppptype), mono('IP', (r) => r.ip_addr || r.macip), { key: 'res', label: '结果', render: (r) => <Result r={r.result} /> }, wide('事件', (r) => r.event)] },
    { key: 'dhcp', label: 'DHCP 日志', src: 'log/dhcp', poll: polls.dhcp, cols: [timeCol, { key: 'mt', label: '类型', render: (r) => <span className="pill gray">{r.msgtype || '—'}</span> }, wide('事件', (r) => r.event), mono('接口', (r) => r.interface), mono('IP', (r) => r.ip_addr), mono('MAC', (r) => r.mac && fmtMac(r.mac))] },
    { key: 'pppoe', label: '拨号日志', src: 'log/pppoe', poll: polls.pppoe, cols: [timeCol, mono('接口', (r) => r.interface), wide('内容', (r) => r.content)] },
    { key: 'presence', label: '终端上下线', src: 'log/terminal-presence', poll: polls.presence, cols: [timeCol, { key: 'tm', label: '终端', render: (r) => <div className="dev"><div><div className="nm">{r.termname || '—'}</div><div className="mt">{r.mac && fmtMac(r.mac)}</div></div></div> }, mono('IP', (r) => r.ip_addr), { key: 'on', label: '在线时长', align: 'right', sort: (r) => r.online_time || 0, render: (r) => <span className="num">{r.online_time ? fmtUptime(r.online_time) : '—'}</span> }, { key: 'up', label: '上行', align: 'right', render: (r) => <span className="num">{fmtBytes(r.total_up || 0)}</span> }, { key: 'dn', label: '下行', align: 'right', render: (r) => <span className="num">{fmtBytes(r.total_down || 0)}</span> }] },
    { key: 'url', label: '网址浏览', src: 'log/url-visits', poll: polls.url, cols: [timeCol, mono('终端 IP', (r) => r.ip_addr), wide('域名', (r) => r.host), { key: 'app', label: '应用', render: (r) => r.appname ? <span className="pill gray">{r.appname}</span> : <span className="muted">—</span> }, mono('URI', (r) => r.uri)] },
    { key: 'wireless', label: '无线终端', src: 'log/wireless', poll: polls.wireless, cols: [timeCol, { key: 'act', label: '动作', render: (r) => <Action a={r.action} /> }, mono('终端 MAC', (r) => r.mac && fmtMac(r.mac)), wide('AP / SSID', (r) => [r.apmac_comment, r.ssid].filter(Boolean).join(' · ')), { key: 'sig', label: '信号', align: 'right', sort: (r) => r.signal || 0, render: (r) => <span className="num">{r.signal ? `${r.signal} dBm` : '—'}</span> }, wide('信息', (r) => r.errmsg)] },
    { key: 'arp', label: 'ARP 日志', src: 'log/arp', poll: polls.arp, cols: [timeCol, wide('内容', (r) => r.content)] },
    { key: 'ddns', label: '动态域名', src: 'log/ddns', poll: polls.ddns, cols: [timeCol, mono('域名', (r) => r.domain), { key: 'st', label: '状态', render: (r) => <Result r={String(r.status ?? '')} /> }, mono('IP', (r) => r.ip_addr), wide('消息', (r) => r.message)] },
    { key: 'notice', label: '推送通知', src: 'log/notice', poll: polls.notice, cols: [timeCol, wide('类型', (r) => String(r.type ?? '')), mono('IP', (r) => r.ip_addr), wide('事件', (r) => r.event)] },
    { key: 'warnings', label: '告警信息', src: 'log/warnings', poll: polls.warnings, cols: [timeCol, { key: 'lv', label: '级别', render: (r) => <LevelPill level={r.level} /> }, wide('标题', (r) => r.title), wide('详情', (r) => r.detail)] },
    { key: 'message', label: '消息中心', src: 'log/message-center', poll: polls.message, cols: [timeCol, wide('标题', (r) => r.title), wide('详情', (r) => r.detail)] },
  ]

  const [cat, setCat] = useState<Cat>('system')
  const [q, setQ] = useState('')

  const cur = CATS.find((c) => c.key === cat)!
  const rows = (cur.poll.data?.data ?? []).filter((r) =>
    !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索日志…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">日志类型</div>
          {CATS.map((c) => (
            <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
              <span className="fb-ic"><IcReports /></span><span className="fl">{c.label}</span>
              <span className="fc">{c.poll.data?.total ?? c.poll.data?.data?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <button className="fb-clear" onClick={() => setQ('')}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">日志 · {cur.label}</div><div className="lc">{rows.length} 条</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>
          <DataTable rows={rows} columns={cur.cols} rowKey={(r) => r.id ?? `${r.timestamp ?? ''}-${r.title ?? r.message ?? ''}`} defaultSort="time" defaultDir="desc" empty={`暂无${cur.label}`} />
        </div>
        <div className="foot">数据来源:{cur.src}(只读 · 最近 100 条)</div>
      </main>
    </>
  )
}
