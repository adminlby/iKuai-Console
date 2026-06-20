import { useState } from 'react'
import { ikuai } from '../lib/api'
import type { ObjGroup, ObjMember, ObjGroupResp } from '../lib/api'
import { usePoll, type PollResult } from '../lib/usePoll'
import {
  mockObjIp, mockObjIp6, mockObjMac, mockObjDomain, mockObjPort, mockObjProto, mockObjTime,
} from '../lib/mock'
import { fmtMac } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcObjects } from '../components/icons'

type Cat = 'ip' | 'ip6' | 'mac' | 'domain' | 'port' | 'proto' | 'time'

const WD = '一二三四五六日'
function timeStr(v: ObjMember): string {
  const wd = v.weekdays || ''
  let label: string
  if (wd === '1234567') label = '每天'
  else if (wd === '12345') label = '工作日'
  else if (wd === '67' || wd === '60' || wd === '70') label = '周末'
  else label = wd.split('').map((d) => '周' + (WD[(Number(d) === 0 ? 7 : Number(d)) - 1] || d)).join('')
  const span = v.start_time && v.end_time ? ` ${v.start_time}-${v.end_time}` : ''
  return (label || '—') + span
}

interface CatCfg { key: Cat; label: string; src: string; poll: PollResult<ObjGroupResp>; dataKey: string; totalKey: string; member: (v: ObjMember) => string }
const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off'

function Members({ g, fmt }: { g: ObjGroup; fmt: (v: ObjMember) => string }) {
  const vals = (g.group_value ?? []).map(fmt).filter(Boolean)
  if (!vals.length) return <span className="muted">—</span>
  const show = vals.slice(0, 6)
  return (
    <span>
      {show.map((v, i) => <span className="pill gray" key={i} style={{ marginRight: 4 }}>{v}</span>)}
      {vals.length > 6 && <span className="muted">+{vals.length - 6}</span>}
    </span>
  )
}

export function Objects() {
  const ip = usePoll(ikuai.objIp, mockObjIp, 60000)
  const ip6 = usePoll(ikuai.objIp6, mockObjIp6, 60000)
  const mac = usePoll(ikuai.objMac, mockObjMac, 60000)
  const domain = usePoll(ikuai.objDomain, mockObjDomain, 60000)
  const port = usePoll(ikuai.objPort, mockObjPort, 60000)
  const proto = usePoll(ikuai.objProto, mockObjProto, 60000)
  const time = usePoll(ikuai.objTime, mockObjTime, 60000)

  const CATS: CatCfg[] = [
    { key: 'ip', label: 'IP 对象', src: 'ip-objects', poll: ip, dataKey: 'ip_data', totalKey: 'ip_total', member: (v) => v.ip || '' },
    { key: 'ip6', label: 'IPv6 对象', src: 'ip6-objects', poll: ip6, dataKey: 'ip6_data', totalKey: 'ip6_total', member: (v) => v.ipv6 || '' },
    { key: 'mac', label: 'MAC 对象', src: 'mac-objects', poll: mac, dataKey: 'mac_data', totalKey: 'mac_total', member: (v) => (v.mac ? fmtMac(v.mac) : '') },
    { key: 'domain', label: '域名对象', src: 'domain-objects', poll: domain, dataKey: 'domain_data', totalKey: 'domain_total', member: (v) => v.domain || '' },
    { key: 'port', label: '端口对象', src: 'port-objects', poll: port, dataKey: 'port_data', totalKey: 'port_total', member: (v) => v.port || '' },
    { key: 'proto', label: '协议对象', src: 'proto-objects', poll: proto, dataKey: 'proto_data', totalKey: 'proto_total', member: (v) => v.proto || '' },
    { key: 'time', label: '时间对象', src: 'time-objects', poll: time, dataKey: 'time_data', totalKey: 'time_total', member: timeStr },
  ]

  const [cat, setCat] = useState<Cat>('ip')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<{ name: string; refs: string; detail: string } | null>(null)

  const short = (v: unknown) => { try { const s = JSON.stringify(v); return s && s.length > 600 ? s.slice(0, 600) + '…' : (s || '—') } catch { return '—' } }
  // row click → fetch single record (/{id}) + reference lookup (/ref) on demand
  const inspect = (g: ObjGroup) => {
    setSel({ name: g.group_name || `对象 ${g.id}`, refs: '加载中…', detail: '加载中…' })
    Promise.all([
      ikuai.objRef(cat, g.id).then(short).catch((e: Error) => `查询失败:${e.message}`),
      ikuai.byId(`/${cat}-objects`, g.id).then(short).catch((e: Error) => `查询失败:${e.message}`),
    ]).then(([refs, detail]) => setSel({ name: g.group_name || `对象 ${g.id}`, refs, detail }))
  }

  const cur = CATS.find((c) => c.key === cat)!
  const groups = (cur.poll.data?.[cur.dataKey] as ObjGroup[] | undefined) ?? []
  const hasEnabled = groups.some((g) => g.enabled != null)
  const hasUpdated = groups.some((g) => g.updated_time)

  const rows = groups.filter((g) =>
    !q || `${g.group_name} ${(g.group_value ?? []).map(cur.member).join(' ')}`.toLowerCase().includes(q.toLowerCase()))

  const cols: Column<ObjGroup>[] = [
    { key: 'name', label: '对象名称', sort: (g) => g.group_name, width: 200, render: (g) => <div className="dev">{g.enabled != null && <span className={`sdot2 ${enabled(g.enabled) ? 'on' : 'off'}`} />}<span className="thumb"><IcObjects /></span><div className="nm">{g.group_name || `对象 ${g.id}`}</div></div> },
    { key: 'count', label: '成员数', align: 'right', sort: (g) => (g.group_value ?? []).length, render: (g) => <span className="num" style={{ fontWeight: 700 }}>{(g.group_value ?? []).length}</span> },
    { key: 'members', label: '成员', render: (g) => <Members g={g} fmt={cur.member} /> },
    ...(hasUpdated ? [{ key: 'upd', label: '更新时间', align: 'right', render: (g: ObjGroup) => <span className="num muted">{g.updated_time || '—'}</span> } as Column<ObjGroup>] : []),
    ...(hasEnabled ? [{ key: 'st', label: '状态', sort: (g: ObjGroup) => (enabled(g.enabled) ? 1 : 0), render: (g: ObjGroup) => <span className={`pill ${enabled(g.enabled) ? 'green' : 'gray'}`}><span className="pdot" />{enabled(g.enabled) ? '启用' : '停用'}</span> } as Column<ObjGroup>] : []),
  ]

  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索对象…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">对象库</div>
          {CATS.map((c) => (
            <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => { setCat(c.key); setSel(null) }}>
              <span className="fb-ic"><IcObjects /></span><span className="fl">{c.label}</span>
              <span className="fc">{(c.poll.data?.[c.totalKey] as number) ?? (c.poll.data?.[c.dataKey] as ObjGroup[] | undefined)?.length ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="fb-note">对象库为各类规则(分流、ACL、限速、行为管理)提供可复用的引用组。此处为只读总览。</div>
        <button className="fb-clear" onClick={() => setQ('')}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">对象库 · {cur.label}</div><div className="lc">{rows.length} 组</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>
          <DataTable rows={rows} columns={cols} rowKey={(g) => g.id} defaultSort="name" empty={`无${cur.label}`} onRowClick={inspect} />
        </div>
        {sel && (
          <div className="mcard" style={{ marginTop: 14, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>对象「{sel.name}」</span>
              <span className="muted" style={{ fontSize: 12 }}>单条详情 /{cat}-objects/&#123;id&#125; · 引用 /ref</span>
              <button className="fb-clear" style={{ marginLeft: 'auto' }} onClick={() => setSel(null)}>关闭</button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>引用关系</div>
            <pre className="num" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '0 0 12px' }}>{sel.refs}</pre>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 4 }}>单条详情</div>
            <pre className="num" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontSize: 11.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{sel.detail}</pre>
          </div>
        )}
        <div className="foot">数据来源:{cur.src}(只读 · 点击行查看 /&#123;id&#125; 与 /ref)</div>
      </main>
    </>
  )
}
