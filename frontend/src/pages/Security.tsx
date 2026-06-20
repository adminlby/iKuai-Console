import { useState } from 'react'
import { ikuai } from '../lib/api'
import type {
  AclRule, MacRule, DomainRule, UrlRule, PeerconnRule,
  AclL7Rule, UrlKeywordRule, UrlRedirectRule, UrlReplaceRule, SecAdvancedCfg,
  SecTerminal, SecondaryRoute, WirelessAclRule,
} from '../lib/api'
import { usePoll } from '../lib/usePoll'
import {
  mockAclRules, mockMacRules, mockDomainBlacklist, mockUrlBlacklist, mockPeerconnRules,
  mockAclL7Rules, mockUrlKeywordRules, mockUrlRedirectRules, mockUrlReplaceRules, mockSecurityAdvanced,
  mockSecTerminals, mockSecondaryRoute, mockMacMode, mockWirelessAclRules,
} from '../lib/mock'
import { flat, timeLabel } from '../lib/match'
import { fmtMac } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcSecurity, IcClients, IcWifi } from '../components/icons'

type Cat = 'mac' | 'domain' | 'url' | 'peerconn' | 'acl' | 'l7' | 'urlkw' | 'urlrd' | 'urlrp' | 'adv' | 'terms' | 'wacl' | 'sroute'
const CATS: { key: Cat; label: string; src: string; group: string }[] = [
  { key: 'mac', label: 'MAC 访问控制', src: 'security/mac-rules', group: '访问控制' },
  { key: 'domain', label: '域名黑名单', src: 'security/domain-blacklist/rules', group: '访问控制' },
  { key: 'url', label: 'URL 黑名单', src: 'security/url-black/rules', group: '访问控制' },
  { key: 'l7', label: '应用协议管控', src: 'security/app-protocols/professional/rules', group: '访问控制' },
  { key: 'peerconn', label: '连接数限制', src: 'security/peerconn/rules', group: '访问控制' },
  { key: 'acl', label: 'ACL 策略', src: 'security/acl-rules', group: '访问控制' },
  { key: 'urlkw', label: '网址关键字', src: 'security/url-keywords/rules', group: 'URL 改写' },
  { key: 'urlrd', label: 'URL 跳转', src: 'security/url-redirect/rules', group: 'URL 改写' },
  { key: 'urlrp', label: 'URL 参数替换', src: 'security/url-replace/rules', group: 'URL 改写' },
  { key: 'wacl', label: '无线访问控制', src: 'wireless/access-control/rules', group: '终端 / 无线' },
  { key: 'terms', label: '终端备注', src: 'security/terminals', group: '终端 / 无线' },
  { key: 'sroute', label: '二级路由管控', src: 'security/secondary-route/config', group: '终端 / 无线' },
  { key: 'adv', label: '高级防护', src: 'security/advanced/config', group: '系统防护' },
]
const GROUPS = [...new Set(CATS.map((c) => c.group))]

const asText = (v: unknown): string => {
  if (v == null || v === '') return '—'
  if (Array.isArray(v)) return v.join(', ') || '—'
  if (typeof v === 'object') return Object.values(v as Record<string, unknown>).map(String).join(', ') || '—'
  return String(v)
}
const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off'
const Status = ({ e }: { e?: string }) => <span className={`pill ${enabled(e) ? 'green' : 'gray'}`}><span className="pdot" />{enabled(e) ? '启用' : '停用'}</span>
const Addr = ({ v }: { v: unknown }) => { const s = flat(v); return s ? <span className="num">{s}</span> : <span className="muted">全部</span> }
const Deny = ({ a }: { a?: string }) => <span className={`pill ${/拒绝|deny|drop|block|禁止/i.test(a || '') ? 'red' : 'green'}`}>{a || '—'}</span>
function expiry(ts: number): string {
  if (!ts) return '永久'
  const s = ts - Math.floor(Date.now() / 1000)
  if (s <= 0) return '已过期'
  if (s < 3600) return `${Math.ceil(s / 60)} 分钟后`
  if (s < 86400) return `${Math.ceil(s / 3600)} 小时后`
  return `${Math.ceil(s / 86400)} 天后`
}

// 高级防护 config → settings rows
const ADV_ITEMS: { key: keyof SecAdvancedCfg; name: string; detail?: (c: SecAdvancedCfg) => string }[] = [
  { key: 'noping_wan', name: '禁止 WAN 口 PING' },
  { key: 'noping_lan', name: '禁止 LAN 口 PING' },
  { key: 'notracert', name: '禁止路由跟踪' },
  { key: 'hijack_ping', name: 'PING 劫持防护' },
  { key: 'invalid', name: '屏蔽异常报文' },
  { key: 'dos_lan', name: '内网 DoS 防护', detail: (c) => (c.dos_lan ? `阈值 ${c.dos_lan_num}/s` : '') },
  { key: 'tcp_mss', name: 'TCP MSS 钳制', detail: (c) => (c.tcp_mss ? `MSS ${c.tcp_mss_num}` : '') },
]
interface AdvRow { name: string; on: boolean; detail: string }

export function Security() {
  const acl = usePoll(ikuai.aclRules, mockAclRules, 60000)
  const mac = usePoll(ikuai.macRules, mockMacRules, 60000)
  const domain = usePoll(ikuai.domainBlacklist, mockDomainBlacklist, 60000)
  const url = usePoll(ikuai.urlBlacklist, mockUrlBlacklist, 60000)
  const peer = usePoll(ikuai.peerconnRules, mockPeerconnRules, 60000)
  const l7 = usePoll(ikuai.aclL7Rules, mockAclL7Rules, 60000)
  const ukw = usePoll(ikuai.urlKeywordRules, mockUrlKeywordRules, 60000)
  const urd = usePoll(ikuai.urlRedirectRules, mockUrlRedirectRules, 60000)
  const urp = usePoll(ikuai.urlReplaceRules, mockUrlReplaceRules, 60000)
  const adv = usePoll(ikuai.securityAdvanced, mockSecurityAdvanced, 60000)
  const terms = usePoll(ikuai.secTerminals, mockSecTerminals, 60000)
  const wacl = usePoll(ikuai.wirelessAclRules, mockWirelessAclRules, 60000)
  const sroute = usePoll(ikuai.secondaryRoute, mockSecondaryRoute, 60000)
  const macMode = usePoll(ikuai.macMode, mockMacMode, 60000)

  const [cat, setCat] = useState<Cat>('mac')
  const [q, setQ] = useState('')
  const [onlyOn, setOnlyOn] = useState(false)

  const advCfg = adv.data?.data?.[0]
  const advRows: AdvRow[] = advCfg
    ? ADV_ITEMS.map((it) => ({ name: it.name, on: Number(advCfg[it.key]) === 1, detail: it.detail ? it.detail(advCfg) : '' }))
    : []

  const len = (p: { data?: { total?: number; data?: unknown[] } | null }) => p.data?.total ?? p.data?.data?.length ?? 0
  const onCount = (p: { data?: { data?: { enabled?: string }[] } | null }) => (p.data?.data ?? []).filter((r) => enabled(r.enabled)).length

  const counts: Record<Cat, number> = {
    acl: len(acl), mac: len(mac), domain: len(domain), url: len(url), peerconn: len(peer),
    l7: len(l7), urlkw: len(ukw), urlrd: len(urd), urlrp: len(urp), adv: advRows.length,
    terms: len(terms), wacl: len(wacl), sroute: len(sroute),
  }
  const enabledCount: Record<Cat, number> = {
    acl: onCount(acl), mac: onCount(mac), domain: onCount(domain), url: onCount(url), peerconn: onCount(peer),
    l7: onCount(l7), urlkw: onCount(ukw), urlrd: onCount(urd), urlrp: onCount(urp), adv: advRows.filter((r) => r.on).length,
    terms: len(terms), wacl: onCount(wacl), sroute: len(sroute),
  }
  const macModeLabel = macMode.data ? (macMode.data.acl_mac === 1 ? '白名单模式' : '黑名单模式') : ''

  const filt = <T extends { tagname?: string; comment?: string; enabled?: string }>(arr: T[], extra = (_: T) => '') =>
    arr.filter((r) => {
      if (onlyOn && !enabled(r.enabled)) return false
      if (q && !`${r.tagname ?? ''} ${r.comment ?? ''} ${extra(r)}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })

  const nameCell = (tag: string, sub: string, on: boolean) => (
    <div className="dev"><span className={`sdot2 ${on ? 'on' : 'off'}`} /><span className="thumb"><IcSecurity /></span><div><div className="nm">{tag}</div>{sub && <div className="mt">{sub}</div>}</div></div>
  )

  const macCols: Column<MacRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcSecurity /></span><div><div className="nm">{r.tagname || r.termname || r.mac}</div><div className="mt">{r.mac.toUpperCase()}</div></div></div> },
    { key: 'term', label: '终端', render: (r) => <span className="muted">{r.termname || '—'}</span> },
    { key: 'exp', label: '到期', sort: (r) => r.expires, render: (r) => <span className="num">{expiry(r.expires)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const domainCols: Column<DomainRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, '', enabled(r.enabled)) },
    { key: 'g', label: '域名分组', render: (r) => asText(r.domain_group).split(',').filter(Boolean).map((g, i) => <span className="pill gray" key={i} style={{ marginRight: 4 }}>{g}</span>) },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const urlCols: Column<UrlRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, '', enabled(r.enabled)) },
    { key: 'd', label: '匹配 URL / 关键字', render: (r) => <span className="num">{asText(r.domain)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const peerCols: Column<PeerconnRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, '', enabled(r.enabled)) },
    { key: 'proto', label: '协议', render: (r) => <span className="pill gray">{(r.protocol || 'all').toUpperCase()}</span> },
    { key: 'port', label: '端口', render: (r) => <span className="num">{asText(r.dst_port)}</span> },
    { key: 'lim', label: '连接上限', align: 'right', sort: (r) => r.limits, render: (r) => <span className="num" style={{ fontWeight: 700 }}>{r.limits.toLocaleString()}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const aclCols: Column<AclRule>[] = [
    { key: 'act', label: '动作', sort: (r) => r.action, render: (r) => <Deny a={r.action} /> },
    { key: 'dir', label: '方向', render: (r) => <span className="muted">{r.dir}</span> },
    { key: 'in', label: '入接口', render: (r) => <span className="num">{r.iinterface || '—'}</span> },
    { key: 'out', label: '出接口', render: (r) => <span className="num">{r.ointerface || '—'}</span> },
    { key: 'src', label: '源地址', render: (r) => <span className="num">{asText(r.src_addr)}</span> },
    { key: 'dst', label: '目的地址', render: (r) => <span className="num">{asText(r.dst_addr)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const l7Cols: Column<AclL7Rule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, r.comment || '应用管控', enabled(r.enabled)) },
    { key: 'act', label: '动作', sort: (r) => r.action, render: (r) => <Deny a={r.action} /> },
    { key: 'app', label: '应用 / 协议', render: (r) => { const s = flat(r.app_proto); return s ? s.split(',').map((x, i) => <span className="pill gray" key={i} style={{ marginRight: 4 }}>{x.trim()}</span>) : <span className="muted">全部</span> } },
    { key: 'src', label: '源地址', render: (r) => <Addr v={r.src_addr} /> },
    { key: 'dst', label: '目的地址', render: (r) => <Addr v={r.dst_addr} /> },
    { key: 'time', label: '时段', render: (r) => <span className="muted">{timeLabel(r.time)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const ukwCols: Column<UrlKeywordRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, '', enabled(r.enabled)) },
    { key: 'url', label: '匹配 URL', render: (r) => <span className="num">{r.src_url || '全部'}</span> },
    { key: 'kw', label: '关键字替换', render: (r) => <span className="num">{r.ori_keyword || '—'} → {r.rep_keyword || '∅'}</span> },
    { key: 'src', label: '源地址', render: (r) => <Addr v={r.src_addr} /> },
    { key: 'hit', label: '命中', align: 'right', sort: (r) => r.hit_rate, render: (r) => <span className="num">{r.hit_rate?.toLocaleString() || 0}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const urdCols: Column<UrlRedirectRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, '', enabled(r.enabled)) },
    { key: 'src', label: '源 URL', render: (r) => <span className="num">{r.src_url || '全部'}</span> },
    { key: 'dst', label: '跳转到', render: (r) => <span className="num">{r.dst_url || '—'}</span> },
    { key: 'mode', label: '方式', render: (r) => <span className="pill gray">{r.mode || '—'}</span> },
    { key: 'hit', label: '命中', align: 'right', sort: (r) => r.hit_rate, render: (r) => <span className="num">{r.hit_rate?.toLocaleString() || 0}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const urpCols: Column<UrlReplaceRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => nameCell(r.tagname || `规则 ${r.id}`, '', enabled(r.enabled)) },
    { key: 'url', label: '匹配 URL', render: (r) => <span className="num">{r.src_url || '全部'}</span> },
    { key: 'param', label: '参数替换', render: (r) => <span className="num">{r.param_keyword || '—'} → {r.rep_keyword || '∅'}</span> },
    { key: 'mode', label: '方式', render: (r) => <span className="pill gray">{r.mode || '—'}</span> },
    { key: 'hit', label: '命中', align: 'right', sort: (r) => r.hit_rate, render: (r) => <span className="num">{r.hit_rate?.toLocaleString() || 0}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const advCols: Column<AdvRow>[] = [
    { key: 'name', label: '防护项', sort: (r) => r.name, render: (r) => <div className="dev"><span className={`sdot2 ${r.on ? 'on' : 'off'}`} /><span className="thumb"><IcSecurity /></span><div className="nm">{r.name}</div></div> },
    { key: 'detail', label: '参数', render: (r) => <span className="num muted">{r.detail || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (r.on ? 1 : 0), render: (r) => <span className={`pill ${r.on ? 'green' : 'gray'}`}><span className="pdot" />{r.on ? '已开启' : '未开启'}</span> },
  ]

  const termCols: Column<SecTerminal>[] = [
    { key: 'name', label: '终端', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className="thumb"><IcClients /></span><div><div className="nm">{r.tagname || r.mac}</div><div className="mt">{fmtMac(r.mac)}</div></div></div> },
    { key: 'mac', label: 'MAC 地址', sort: (r) => r.mac, render: (r) => <span className="num">{fmtMac(r.mac)}</span> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const waclCols: Column<WirelessAclRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcWifi /></span><div><div className="nm">{r.tagname || `规则 ${r.id}`}</div><div className="mt">{r.comment || '无线访问控制'}</div></div></div> },
    { key: 'mode', label: '模式', render: (r) => <span className={`pill ${Number(r.mode) === 1 ? 'green' : 'red'}`}>{Number(r.mode) === 1 ? '白名单' : '黑名单'}</span> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num">{r.lmac ? fmtMac(r.lmac) : '全部'}</span> },
    { key: 'ssid', label: 'SSID', render: (r) => <span className="num">{r.lssid || '全部'}</span> },
    { key: 'time', label: '时段', render: (r) => <span className="muted">{r.time || '全天'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const srouteCols: Column<SecondaryRoute>[] = [
    { key: 'name', label: '规则', render: (r) => nameCell('二级路由管控', `检测段 ${r.nol2rt_ip || '全部'}`, Number(r.nol2rt) === 1) },
    { key: 'block', label: '阻断二级路由', render: (r) => <span className={`pill ${Number(r.nol2rt) === 1 ? 'red' : 'gray'}`}>{Number(r.nol2rt) === 1 ? '已开启' : '未开启'}</span> },
    { key: 'ip', label: '检测网段', render: (r) => <span className="num">{r.nol2rt_ip || '全部'}</span> },
    { key: 'ttl', label: 'TTL 阈值', align: 'right', render: (r) => <span className="num">{r.ttl_num ?? '—'}</span> },
    { key: 'time', label: '时段', render: (r) => <span className="muted">{timeLabel(r.time)}</span> },
  ]

  const table = () => {
    switch (cat) {
      case 'mac': return <DataTable rows={filt(mac.data?.data ?? [], (r) => r.mac + r.termname)} columns={macCols} rowKey={(r) => r.id} defaultSort="name" empty="无 MAC 访问控制规则" />
      case 'domain': return <DataTable rows={filt(domain.data?.data ?? [], (r) => r.domain_group)} columns={domainCols} rowKey={(r) => r.id} defaultSort="name" empty="无域名黑名单规则" />
      case 'url': return <DataTable rows={filt(url.data?.data ?? [], (r) => asText(r.domain))} columns={urlCols} rowKey={(r) => r.id} defaultSort="name" empty="无 URL 黑名单规则" />
      case 'peerconn': return <DataTable rows={filt(peer.data?.data ?? [], (r) => r.protocol)} columns={peerCols} rowKey={(r) => r.id} defaultSort="lim" defaultDir="desc" empty="无连接数限制规则" />
      case 'acl': return <DataTable rows={filt(acl.data?.data ?? [], (r) => `${r.action} ${asText(r.src_addr)} ${asText(r.dst_addr)}`)} columns={aclCols} rowKey={(r) => r.id} defaultSort="act" empty="无 ACL 策略" />
      case 'l7': return <DataTable rows={filt(l7.data?.data ?? [], (r) => `${r.action} ${flat(r.app_proto)}`)} columns={l7Cols} rowKey={(r) => r.id} defaultSort="name" empty="无应用协议管控策略" />
      case 'urlkw': return <DataTable rows={filt(ukw.data?.data ?? [], (r) => `${r.src_url} ${r.ori_keyword}`)} columns={ukwCols} rowKey={(r) => r.id} defaultSort="hit" defaultDir="desc" empty="无网址关键字策略" />
      case 'urlrd': return <DataTable rows={filt(urd.data?.data ?? [], (r) => `${r.src_url} ${r.dst_url}`)} columns={urdCols} rowKey={(r) => r.id} defaultSort="hit" defaultDir="desc" empty="无 URL 跳转策略" />
      case 'urlrp': return <DataTable rows={filt(urp.data?.data ?? [], (r) => `${r.src_url} ${r.param_keyword}`)} columns={urpCols} rowKey={(r) => r.id} defaultSort="hit" defaultDir="desc" empty="无 URL 参数替换策略" />
      case 'adv': return <DataTable rows={advRows.filter((r) => !onlyOn || r.on)} columns={advCols} rowKey={(r) => r.name} defaultSort="st" defaultDir="desc" empty="无高级防护配置" />
      case 'terms': return <DataTable rows={(terms.data?.data ?? []).filter((r) => !q || `${r.tagname ?? ''} ${r.comment ?? ''} ${r.mac}`.toLowerCase().includes(q.toLowerCase()))} columns={termCols} rowKey={(r) => r.id} defaultSort="name" empty="无终端备注" />
      case 'wacl': return <DataTable rows={filt(wacl.data?.data ?? [], (r) => `${r.lmac} ${r.lssid}`)} columns={waclCols} rowKey={(r) => r.id} defaultSort="name" empty="无无线访问控制规则" />
      case 'sroute': return <DataTable rows={(sroute.data?.data ?? [])} columns={srouteCols} rowKey={(r) => r.id} empty="无二级路由管控配置" />
    }
  }

  const cur = CATS.find((c) => c.key === cat)!
  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索规则…" /></div>
        <div className="fb-scroll">
          {GROUPS.map((g) => (
            <div className="fb-sec" key={g}>
              <div className="fb-cap">{g}</div>
              {CATS.filter((c) => c.group === g).map((c) => (
                <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
                  <span className="fb-ic"><IcSecurity /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="fb-sec">
          <button className={`fb-item ${onlyOn ? 'active' : ''}`} onClick={() => setOnlyOn((v) => !v)}>
            <span className="sdot2 on" /><span className="fl">仅启用</span><span className="fc">{enabledCount[cat]}</span>
          </button>
        </div>
        <button className="fb-clear" onClick={() => { setQ(''); setOnlyOn(false) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">安全 · {cur.label}{cat === 'mac' && macModeLabel ? <span className="pill gray" style={{ marginLeft: 8 }}>{macModeLabel}</span> : null}</div><div className="lc">{counts[cat]} 条 · 启用 {enabledCount[cat]}</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
