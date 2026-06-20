import { useState } from 'react'
import { ikuai } from '../lib/api'
import type { AuthOnlineUser, AuthUser, AuthPackage, WebAuthCfg } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import { mockAuthOnlineUsers, mockAuthUsers, mockAuthPackages, mockAuthWebConfig } from '../lib/mock'
import { fmtBytes, fmtUptime, fmtMac, toNum } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcAuth } from '../components/icons'

type Cat = 'online' | 'users' | 'packages' | 'webauth'
const CATS: { key: Cat; label: string; src: string }[] = [
  { key: 'online', label: '在线认证用户', src: 'auth/online-users' },
  { key: 'users', label: '用户账号', src: 'auth/users' },
  { key: 'packages', label: '套餐', src: 'auth/packages' },
  { key: 'webauth', label: 'WEB 认证', src: 'auth/web/services' },
]

const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off' && e != null
const num = (v: unknown) => toNum(v)
/** account/package bandwidth — iKuai stores these in KB/s. */
const speed = (kbs: number) => (!kbs ? '不限速' : kbs >= 1024 ? `${(kbs / 1024).toFixed(kbs % 1024 ? 1 : 0)} MB/s` : `${kbs} KB/s`)
function expiry(ts: number): string {
  if (!ts) return '永久'
  const s = ts - Math.floor(Date.now() / 1000)
  if (s <= 0) return '已过期'
  if (s < 86400) return `${Math.ceil(s / 3600)} 小时后`
  return `${Math.ceil(s / 86400)} 天后`
}

const PPP = ({ t }: { t?: string }) => <span className="pill blue">{t || '认证'}</span>

// WEB-auth method map: flag → display + per-method field prefix
const METHODS: { flag: string; name: string; prefix: string }[] = [
  { flag: 'user_auth', name: '账号认证', prefix: 'user' },
  { flag: 'nopasswd', name: '一键免认证', prefix: 'nopasswd' },
  { flag: 'static_pwd', name: '固定密码', prefix: 'static_pwd' },
  { flag: 'phone_auth', name: '短信认证', prefix: 'phone' },
  { flag: 'weixin', name: '微信认证', prefix: 'weixin' },
  { flag: 'qq_auth', name: 'QQ 认证', prefix: 'qq' },
  { flag: 'weibo_auth', name: '微博认证', prefix: 'weibo' },
  { flag: 'coupon_auth', name: '优惠券认证', prefix: 'coupon' },
  { flag: 'allow_tryout', name: '免费试用', prefix: 'tryout' },
  { flag: 'ldap_auth', name: 'LDAP 认证', prefix: '' },
]
interface MethodRow { name: string; on: boolean; up: number; down: number; maxTime: number }

export function Auth() {
  const online = usePoll(ikuai.authOnlineUsers, mockAuthOnlineUsers, 10000)
  const users = usePoll(ikuai.authUsers, mockAuthUsers, 60000)
  const packages = usePoll(ikuai.authPackages, mockAuthPackages, 60000)
  const web = usePoll(ikuai.authWebConfig, mockAuthWebConfig, 60000)

  const [cat, setCat] = useState<Cat>('online')
  const [q, setQ] = useState('')

  const cfg: WebAuthCfg | undefined = web.data?.data?.[0]
  const methods: MethodRow[] = cfg
    ? METHODS.filter((m) => m.flag in cfg).map((m) => {
      const base = m.prefix.split('_')[0]
      return {
        name: m.name, on: num(cfg[m.flag]) === 1,
        up: num(cfg[`${m.prefix}_up`]), down: num(cfg[`${m.prefix}_down`]),
        maxTime: num(cfg[`${m.prefix}_max_time`]) || num(cfg[`${base}_max_time`]),
      }
    })
    : []

  const counts: Record<Cat, number> = {
    online: online.data?.total ?? online.data?.data?.length ?? 0,
    users: users.data?.total ?? users.data?.data?.length ?? 0,
    packages: packages.data?.total ?? packages.data?.data?.length ?? 0,
    webauth: methods.length,
  }
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())

  const onlineCols: Column<AuthOnlineUser>[] = [
    { key: 'name', label: '用户', sort: (r) => r.username, width: 200, render: (r) => <div className="dev"><span className="sdot2 on" /><span className="thumb"><IcAuth /></span><div><div className="nm">{r.username || r.name || r.mac}</div><div className="mt">{r.name || fmtMac(r.mac)}</div></div></div> },
    { key: 'type', label: '认证方式', render: (r) => <PPP t={r.ppptype} /> },
    { key: 'ip', label: 'IP 地址', sort: (r) => r.ip_addr, render: (r) => <span className="num">{r.ip_addr}</span> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num muted">{fmtMac(r.mac)}</span> },
    { key: 'pack', label: '套餐', render: (r) => <span className="muted">{r.packname || '—'}</span> },
    { key: 'up', label: '上行', align: 'right', sort: (r) => r.upload, render: (r) => <span className="num">{fmtBytes(r.upload || 0)}</span> },
    { key: 'dn', label: '下行', align: 'right', sort: (r) => r.download, render: (r) => <span className="num">{fmtBytes(r.download || 0)}</span> },
    { key: 'on', label: '在线时长', align: 'right', sort: (r) => r.auth_time, render: (r) => <span className="num muted">{r.auth_time ? fmtUptime(Math.floor(Date.now() / 1000) - r.auth_time) : '—'}</span> },
    { key: 'exp', label: '到期', align: 'right', sort: (r) => r.expires, render: (r) => <span className="num">{expiry(r.expires)}</span> },
  ]
  const userCols: Column<AuthUser>[] = [
    { key: 'name', label: '账号', sort: (r) => r.username, width: 200, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcAuth /></span><div><div className="nm">{r.username}</div><div className="mt">{r.name || r.comment || '—'}</div></div></div> },
    { key: 'type', label: '认证方式', render: (r) => <PPP t={r.ppptype} /> },
    { key: 'up', label: '上行限速', align: 'right', sort: (r) => r.upload, render: (r) => <span className="num">{speed(r.upload)}</span> },
    { key: 'dn', label: '下行限速', align: 'right', sort: (r) => r.download, render: (r) => <span className="num">{speed(r.download)}</span> },
    { key: 'phone', label: '手机号', render: (r) => <span className="num muted">{r.phone || '—'}</span> },
    { key: 'exp', label: '到期', align: 'right', sort: (r) => r.expires, render: (r) => <span className="num">{expiry(r.expires)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <span className={`pill ${enabled(r.enabled) ? 'green' : 'gray'}`}><span className="pdot" />{enabled(r.enabled) ? '启用' : '停用'}</span> },
  ]
  const pkgCols: Column<AuthPackage>[] = [
    { key: 'name', label: '套餐', sort: (r) => r.packname, render: (r) => <div className="dev"><span className="thumb"><IcAuth /></span><div><div className="nm">{r.packname || r.tagname}</div><div className="mt">{r.comment || '—'}</div></div></div> },
    { key: 'time', label: '时长', render: (r) => <span className="num">{r.packtime || '—'}</span> },
    { key: 'up', label: '上行速率', align: 'right', sort: (r) => r.up_speed, render: (r) => <span className="num">{speed(r.up_speed)}</span> },
    { key: 'dn', label: '下行速率', align: 'right', sort: (r) => r.down_speed, render: (r) => <span className="num">{speed(r.down_speed)}</span> },
    { key: 'price', label: '价格', align: 'right', sort: (r) => r.price, render: (r) => <span className="num">{r.price ? `¥${(r.price / 100).toFixed(2)}` : '免费'}</span> },
  ]
  const methodCols: Column<MethodRow>[] = [
    { key: 'name', label: '认证方式', sort: (r) => r.name, render: (r) => <div className="dev"><span className={`sdot2 ${r.on ? 'on' : 'off'}`} /><span className="thumb"><IcAuth /></span><div className="nm">{r.name}</div></div> },
    { key: 'up', label: '上行限速', align: 'right', render: (r) => <span className="num">{r.up ? speed(r.up) : '不限速'}</span> },
    { key: 'dn', label: '下行限速', align: 'right', render: (r) => <span className="num">{r.down ? speed(r.down) : '不限速'}</span> },
    { key: 'mt', label: '最大时长', align: 'right', render: (r) => <span className="num muted">{r.maxTime ? fmtUptime(r.maxTime) : '不限'}</span> },
    { key: 'st', label: '状态', sort: (r) => (r.on ? 1 : 0), render: (r) => <span className={`pill ${r.on ? 'green' : 'gray'}`}><span className="pdot" />{r.on ? '已启用' : '未启用'}</span> },
  ]

  const table = () => {
    switch (cat) {
      case 'online': return <DataTable rows={(online.data?.data ?? []).filter((r) => match(`${r.username} ${r.name} ${r.ip_addr} ${r.mac} ${r.packname}`))} columns={onlineCols} rowKey={(r) => r.id} defaultSort="on" defaultDir="desc" empty="当前无在线认证用户" />
      case 'users': return <DataTable rows={(users.data?.data ?? []).filter((r) => match(`${r.username} ${r.name} ${r.comment} ${r.phone}`))} columns={userCols} rowKey={(r) => r.id} defaultSort="name" empty="无用户账号" />
      case 'packages': return <DataTable rows={(packages.data?.data ?? []).filter((r) => match(`${r.packname} ${r.tagname} ${r.comment}`))} columns={pkgCols} rowKey={(r) => r.id} defaultSort="name" empty="无套餐" />
      case 'webauth': return <DataTable rows={methods.filter((r) => match(r.name))} columns={methodCols} rowKey={(r) => r.name} defaultSort="st" defaultDir="desc" empty="未启用 WEB 认证" />
    }
  }

  const cur = CATS.find((c) => c.key === cat)!
  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">认证与行为</div>
          {CATS.map((c) => (
            <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
              <span className="fb-ic"><IcAuth /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
            </button>
          ))}
        </div>
        {cat === 'webauth' && cfg && (
          <div className="fb-note">
            WEB 认证{enabled(cfg.enabled) ? '已开启' : '未开启'}
            {cfg.interface ? ` · 接口 ${cfg.interface}` : ''}
            {cfg.max_time ? ` · 最长 ${fmtUptime(cfg.max_time)}` : ''}
          </div>
        )}
        <button className="fb-clear" onClick={() => setQ('')}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">认证 · {cur.label}</div><div className="lc">{counts[cat]} 项</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
