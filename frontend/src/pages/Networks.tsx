import { useState } from 'react'
import { ikuai } from '../lib/api'
import type {
  DhcpService, DhcpStatic, DhcpClient, Vlan, PhysicalNic,
  NatRule, DnatRule, DmzRule, DnsProxyRule, MultiDnsRule, DnsStat, DhcpAccessRule, Dhcp6Client, WirelessVlanRule,
  WanVlanCfg, IfaceV6, Dhcp6AccessRule, ClientIp6Online, ClientIp6Offline, Camera,
} from '../lib/api'
import { usePoll } from '../lib/usePoll'
import {
  mockWanConfig, mockLanConfig, mockDhcpServices, mockDhcpStatic, mockDhcpClients, mockVlans,
  mockPhysicalPorts, mockNatRules, mockDnatRules, mockDmzRules, mockDnsConfig, mockDnsProxyRules,
  mockMultiDnsRules, mockDnsStats, mockPppoeServer, mockDhcpAccessRules, mockDhcp6Clients, mockWirelessVlanRules,
  mockWanVlanConfig, mockIfaceTrafficV6, mockDhcp6AccessRules, mockClientsIp6Online, mockClientsIp6Offline, mockCameras,
} from '../lib/mock'
import { fmtUptime, fmtMac, fmtBytes, fmtRateStr, fmtDateTime } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcGateway, IcWired, IcNetworks, IcInternet, IcCamera } from '../components/icons'

type Cat =
  | 'phys' | 'iface' | 'wanvlan' | 'vlan'
  | 'dhcp' | 'static' | 'lease' | 'dhcpacl' | 'dhcp6' | 'dhcp6acl'
  | 'dnat' | 'nat' | 'dmz'
  | 'dns' | 'dnsproxy' | 'multidns' | 'dnsstat'
  | 'pppoe' | 'wvlan'
  | 'ifv6' | 'ip6on' | 'ip6off' | 'cam'
const CATS: { key: Cat; label: string; src: string; group: string }[] = [
  { key: 'phys', label: '物理网口', src: 'interfaces/physical', group: '接口与端口' },
  { key: 'iface', label: '接口', src: 'interfaces/wan-config + lan-config', group: '接口与端口' },
  { key: 'wanvlan', label: 'WAN 多拨', src: 'interfaces/wan-vlan-config', group: '接口与端口' },
  { key: 'vlan', label: 'VLAN', src: 'network/vlan', group: '接口与端口' },
  { key: 'dhcp', label: 'DHCP 策略', src: 'network/dhcp/services', group: '地址分配' },
  { key: 'static', label: '静态分配', src: 'network/dhcp/static', group: '地址分配' },
  { key: 'lease', label: '租约', src: 'network/dhcp/clients', group: '地址分配' },
  { key: 'dhcpacl', label: 'DHCP 访问控制', src: 'network/dhcp/access-control/rules', group: '地址分配' },
  { key: 'dhcp6', label: 'DHCPv6 租约', src: 'network/dhcp6/clients', group: '地址分配' },
  { key: 'dhcp6acl', label: 'DHCPv6 访问控制', src: 'network/dhcp6/access-control/rules', group: '地址分配' },
  { key: 'dnat', label: '端口映射', src: 'network/dnat/rules', group: '转发与 NAT' },
  { key: 'nat', label: 'NAT 规则', src: 'network/nat/rules', group: '转发与 NAT' },
  { key: 'dmz', label: 'DMZ 主机', src: 'network/dmz/rules', group: '转发与 NAT' },
  { key: 'dns', label: 'DNS 设置', src: 'network/dns/config', group: 'DNS' },
  { key: 'dnsproxy', label: 'DNS 分流', src: 'network/dns/proxy/rules', group: 'DNS' },
  { key: 'multidns', label: '多 DNS', src: 'network/multi-dns/rules', group: 'DNS' },
  { key: 'dnsstat', label: 'DNS 缓存', src: 'network/dns/stats', group: 'DNS' },
  { key: 'pppoe', label: 'PPPoE 服务端', src: 'network/pppoe/services', group: '拨号与无线' },
  { key: 'wvlan', label: '无线 VLAN', src: 'wireless/vlan/rules', group: '拨号与无线' },
  { key: 'ifv6', label: 'IPv6 线路', src: 'monitoring/interfaces-traffic-v6', group: 'IPv6 与监控' },
  { key: 'ip6on', label: 'IPv6 在线终端', src: 'monitoring/clients-ip6-online', group: 'IPv6 与监控' },
  { key: 'ip6off', label: 'IPv6 离线终端', src: 'monitoring/clients-ip6-offline', group: 'IPv6 与监控' },
  { key: 'cam', label: '摄像头', src: 'monitoring/cameras', group: 'IPv6 与监控' },
]
const GROUPS = [...new Set(CATS.map((c) => c.group))]

const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off'
const Status = ({ e }: { e?: string }) => <span className={`pill ${enabled(e) ? 'green' : 'gray'}`}><span className="pdot" />{enabled(e) ? '启用' : '停用'}</span>
const txt = (v?: string) => (v && v !== '0.0.0.0' ? v : '—')
const speedLabel = (s?: number) => (s ? (s >= 1000 ? `${s / 1000}G` : `${s}M`) : '—')

function wanDial(w: { internet: number; username: string; ip_mask: string }): string {
  if (w.username) return 'PPPoE'
  if (w.ip_mask) return '静态 IP'
  if (w.internet === 2) return 'PPPoE'
  if (w.internet === 3) return '静态 IP'
  return 'DHCP'
}
function dur(sec: number): string {
  if (!sec || sec <= 0) return '—'
  if (sec < 3600) return `${Math.round(sec / 60)} 分`
  if (sec % 3600 === 0) return `${sec / 3600} 小时`
  return `${(sec / 3600).toFixed(1)} 小时`
}
function remain(endSec: number): string {
  if (!endSec) return '永久'
  const s = endSec - Math.floor(Date.now() / 1000)
  if (s <= 0) return '已过期'
  if (s < 3600) return `${Math.ceil(s / 60)} 分钟`
  return `${(s / 3600).toFixed(1)} 小时`
}

interface IfaceRow {
  key: string; role: 'wan' | 'lan'; name: string; comment: string; mac: string
  link: string; conn: string; ip: string; gateway: string; band: string; dhcp: boolean | null
}
interface PortRow { eth: string; nic: PhysicalNic }
interface KV { k: string; v: string; on?: boolean | null }

export function Networks() {
  const wan = usePoll(ikuai.wanConfig, mockWanConfig, 30000)
  const lan = usePoll(ikuai.lanConfig, mockLanConfig, 30000)
  const dhcp = usePoll(ikuai.dhcpServices, mockDhcpServices, 30000)
  const stat = usePoll(ikuai.dhcpStatic, mockDhcpStatic, 30000)
  const lease = usePoll(ikuai.dhcpClients, mockDhcpClients, 15000)
  const vlan = usePoll(ikuai.vlans, mockVlans, 30000)
  const phys = usePoll(ikuai.physicalPorts, mockPhysicalPorts, 15000)
  const dhcpacl = usePoll(ikuai.dhcpAccessRules, mockDhcpAccessRules, 30000)
  const dhcp6 = usePoll(ikuai.dhcp6Clients, mockDhcp6Clients, 15000)
  const dnat = usePoll(ikuai.dnatRules, mockDnatRules, 30000)
  const nat = usePoll(ikuai.natRules, mockNatRules, 30000)
  const dmz = usePoll(ikuai.dmzRules, mockDmzRules, 30000)
  const dnsCfg = usePoll(ikuai.dnsConfig, mockDnsConfig, 60000)
  const dnsProxy = usePoll(ikuai.dnsProxyRules, mockDnsProxyRules, 30000)
  const multiDns = usePoll(ikuai.multiDnsRules, mockMultiDnsRules, 30000)
  const dnsStat = usePoll(ikuai.dnsStats, mockDnsStats, 30000)
  const pppoe = usePoll(ikuai.pppoeServer, mockPppoeServer, 60000)
  const wvlan = usePoll(ikuai.wirelessVlanRules, mockWirelessVlanRules, 30000)
  const wanvlan = usePoll(ikuai.wanVlanConfig, mockWanVlanConfig, 30000)
  const dhcp6acl = usePoll(ikuai.dhcp6AccessRules, mockDhcp6AccessRules, 30000)
  const ifv6 = usePoll(ikuai.ifaceTrafficV6, mockIfaceTrafficV6, 15000)
  const ip6on = usePoll(ikuai.clientsIp6Online, mockClientsIp6Online, 15000)
  const ip6off = usePoll(ikuai.clientsIp6Offline, mockClientsIp6Offline, 30000)
  const cam = usePoll(ikuai.cameras, mockCameras, 30000)

  const [cat, setCat] = useState<Cat>('phys')
  const [q, setQ] = useState('')
  const [onlyOn, setOnlyOn] = useState(false)

  // ---- merged interface list ----
  const ifaces: IfaceRow[] = []
  for (const w of wan.data?.data ?? []) {
    ifaces.push({
      key: `w-${w.id}`, role: 'wan', name: w.tagname || w.name, comment: w.comment, mac: w.mac,
      link: speedLabel(w.speed), conn: wanDial(w), ip: txt(w.ip_mask) === '—' ? '动态' : w.ip_mask,
      gateway: txt(w.gateway), band: w.download ? `↓${w.download} / ↑${w.upload || 0} Mbps` : '—', dhcp: null,
    })
  }
  for (const l of lan.data?.data ?? []) {
    ifaces.push({
      key: `l-${l.id}`, role: 'lan', name: l.tagname || l.name, comment: l.comment, mac: l.mac,
      link: speedLabel(l.speed), conn: '内网', ip: txt(l.ip_mask), gateway: '—', band: '—', dhcp: l.dhcp_server === 1,
    })
  }
  const ports: PortRow[] = Object.entries(phys.data?.ether_info ?? {}).map(([eth, nic]) => ({ eth, nic }))

  // ---- DNS config / PPPoE config → KV rows ----
  const dc = dnsCfg.data?.data?.[0]
  const dnsRows: KV[] = dc ? [
    { k: 'DNS 代理', v: '', on: enabled(dc.enabled) },
    { k: '查询方式', v: dc.query || '—' },
    { k: '首选 DNS', v: txt(dc.dns1) },
    { k: '备用 DNS', v: txt(dc.dns2) },
    { k: '出口线路', v: dc.network || '自动' },
    { k: '缓存 TTL', v: dc.cache_ttl ? `${dc.cache_ttl} 秒` : '—' },
    { k: 'DNS 防护', v: '', on: !!Number(dc.defense) },
    { k: '禁用 IPv6 解析', v: '', on: !!Number(dc.forbid_dns_4a) },
  ] : []
  const pc = pppoe.data?.data?.[0]
  const pppoeRows: KV[] = pc ? [
    { k: 'PPPoE 服务端', v: '', on: enabled(pc.enabled) },
    { k: '服务名称', v: pc.server_name || '—' },
    { k: '认证方式', v: String(pc.authmode ?? '—') },
    { k: '地址池', v: pc.addr_pool || '—' },
    { k: '服务地址', v: txt(pc.server_ip) },
    { k: '监听接口', v: pc.interface || '—' },
    { k: 'DNS', v: [pc.dns1, pc.dns2].filter(Boolean).join(', ') || '—' },
    { k: 'MTU', v: String(pc.mtu ?? '—') },
  ] : []

  const counts: Record<Cat, number> = {
    phys: ports.length, iface: ifaces.length, vlan: vlan.data?.total ?? vlan.data?.data?.length ?? 0,
    dhcp: dhcp.data?.total ?? dhcp.data?.data?.length ?? 0,
    static: stat.data?.static_total ?? stat.data?.static_data?.length ?? 0,
    lease: lease.data?.total ?? lease.data?.data?.length ?? 0,
    dhcpacl: dhcpacl.data?.total ?? dhcpacl.data?.data?.length ?? 0,
    dhcp6: dhcp6.data?.client_total ?? dhcp6.data?.client_data?.length ?? 0,
    dnat: dnat.data?.total ?? dnat.data?.data?.length ?? 0,
    nat: nat.data?.total ?? nat.data?.data?.length ?? 0,
    dmz: dmz.data?.total ?? dmz.data?.data?.length ?? 0,
    dns: dnsRows.length, dnsproxy: dnsProxy.data?.total ?? dnsProxy.data?.data?.length ?? 0,
    multidns: multiDns.data?.total ?? multiDns.data?.data?.length ?? 0,
    dnsstat: dnsStat.data?.total ?? dnsStat.data?.data?.length ?? 0,
    pppoe: pppoeRows.length, wvlan: wvlan.data?.total ?? wvlan.data?.data?.length ?? 0,
    wanvlan: wanvlan.data?.vlan_data?.length ?? 0,
    dhcp6acl: dhcp6acl.data?.total ?? dhcp6acl.data?.data?.length ?? 0,
    ifv6: ifv6.data?.total ?? ifv6.data?.data?.length ?? 0,
    ip6on: ip6on.data?.total ?? ip6on.data?.data?.length ?? 0,
    ip6off: ip6off.data?.total ?? ip6off.data?.offline_data?.length ?? 0,
    cam: cam.data?.total ?? cam.data?.data?.length ?? 0,
  }
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())
  const noStatus = ['phys', 'iface', 'lease', 'dhcp6', 'dns', 'dnsstat', 'pppoe', 'ifv6', 'ip6on', 'ip6off']
  const hasStatus = !noStatus.includes(cat)

  // ---- columns ----
  const kvCols: Column<KV>[] = [
    { key: 'k', label: '项目', width: 180, render: (r) => <span className="muted">{r.k}</span> },
    { key: 'v', label: '值 / 状态', render: (r) => r.on != null ? <span className={`pill ${r.on ? 'green' : 'gray'}`}><span className="pdot" />{r.on ? '已开启' : '未开启'}</span> : <span className="num">{r.v}</span> },
  ]
  const portCols: Column<PortRow>[] = [
    { key: 'eth', label: '网口', sort: (r) => r.eth, width: 200, render: (r) => <div className="dev"><span className="thumb"><IcWired /></span><div><div className="nm">{r.eth}</div><div className="mt">{r.nic.model || '物理网口'}</div></div></div> },
    { key: 'if', label: '绑定接口', render: (r) => r.nic.interface ? <span className="pill blue">{r.nic.interface}</span> : <span className="muted">未绑定</span> },
    { key: 'link', label: '连接', sort: (r) => r.nic.link ?? 0, render: (r) => <span className={`pill ${r.nic.link ? 'green' : 'gray'}`}><span className="pdot" />{r.nic.link ? '已连接' : '未连接'}</span> },
    { key: 'speed', label: '速率', align: 'right', sort: (r) => r.nic.speed ?? 0, render: (r) => <span className="num">{r.nic.link && r.nic.speed ? speedLabel(r.nic.speed) : '—'}</span> },
    { key: 'duplex', label: '双工', render: (r) => <span className="muted">{r.nic.link ? (r.nic.duplex ? '全双工' : '半双工') : '—'}</span> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num muted">{fmtMac(r.nic.mac || '')}</span> },
  ]
  const ifaceCols: Column<IfaceRow>[] = [
    { key: 'name', label: '接口', sort: (r) => r.name, width: 220, render: (r) => <div className="dev"><span className="thumb">{r.role === 'wan' ? <IcGateway /> : <IcWired />}</span><div><div className="nm">{r.name}</div><div className="mt">{r.comment || (r.role === 'wan' ? '外网接口' : '内网接口')}</div></div></div> },
    { key: 'role', label: '类型', sort: (r) => r.role, render: (r) => <span className={`pill ${r.role === 'wan' ? 'blue' : 'gray'}`}>{r.role.toUpperCase()}</span> },
    { key: 'conn', label: '接入方式', render: (r) => <span className="muted">{r.conn}</span> },
    { key: 'ip', label: 'IP / 掩码', render: (r) => <span className="num">{r.ip}</span> },
    { key: 'gw', label: '网关', render: (r) => <span className="num">{r.gateway}</span> },
    { key: 'link', label: '速率', align: 'right', render: (r) => <span className="num">{r.link}</span> },
    { key: 'band', label: '带宽', align: 'right', render: (r) => <span className="num muted">{r.band}</span> },
    { key: 'dhcp', label: 'DHCP', render: (r) => r.dhcp == null ? <span className="muted">—</span> : <span className={`pill ${r.dhcp ? 'green' : 'gray'}`}>{r.dhcp ? '开' : '关'}</span> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num muted">{fmtMac(r.mac)}</span> },
  ]
  const dhcpCols: Column<DhcpService>[] = [
    { key: 'name', label: '策略', sort: (r) => r.tagname, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcNetworks /></span><div><div className="nm">{r.tagname || `策略 ${r.id}`}</div><div className="mt">{r.interface}</div></div></div> },
    { key: 'pool', label: '地址池', render: (r) => <span className="num">{txt(r.addr_pool)}</span> },
    { key: 'gw', label: '网关', render: (r) => <span className="num">{txt(r.gateway)}</span> },
    { key: 'dns', label: 'DNS', render: (r) => <span className="num muted">{[r.dns1, r.dns2].filter(Boolean).join(', ') || '—'}</span> },
    { key: 'lease', label: '租期', align: 'right', sort: (r) => r.lease, render: (r) => <span className="num">{dur(r.lease)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const staticCols: Column<DhcpStatic>[] = [
    { key: 'name', label: '主机', sort: (r) => r.tagname || r.hostname, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcWired /></span><div><div className="nm">{r.tagname || r.hostname || r.comment || r.mac}</div><div className="mt">{fmtMac(r.mac)}</div></div></div> },
    { key: 'ip', label: '绑定 IP', sort: (r) => r.ip_addr, render: (r) => <span className="num" style={{ fontWeight: 600 }}>{r.ip_addr}</span> },
    { key: 'intf', label: '接口', render: (r) => <span className="num">{r.interface || '—'}</span> },
    { key: 'gw', label: '网关 / DNS', render: (r) => <span className="num muted">{[r.gateway, r.dns1].filter(Boolean).join(' · ') || '继承策略'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const leaseCols: Column<DhcpClient>[] = [
    { key: 'name', label: '主机', sort: (r) => r.termname || r.hostname, render: (r) => <div className="dev"><span className={`sdot2 ${r.status ? 'on' : 'off'}`} /><span className="thumb"><IcWired /></span><div><div className="nm">{r.termname || r.hostname || r.mac}</div><div className="mt">{fmtMac(r.mac)}</div></div></div> },
    { key: 'ip', label: 'IP 地址', sort: (r) => r.ip_addr, render: (r) => <span className="num" style={{ fontWeight: 600 }}>{r.ip_addr}</span> },
    { key: 'intf', label: '接口', render: (r) => <span className="num">{r.interface || '—'}</span> },
    { key: 'remain', label: '剩余租期', align: 'right', sort: (r) => r.end_time, render: (r) => <span className="num">{remain(r.end_time)}</span> },
    { key: 'dur', label: '已租用', align: 'right', sort: (r) => r.start_time, render: (r) => <span className="num muted">{r.start_time ? fmtUptime(Math.floor(Date.now() / 1000) - r.start_time) : '—'}</span> },
  ]
  const dhcpAclCols: Column<DhcpAccessRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcNetworks /></span><div><div className="nm">{r.tagname || `规则 ${r.id}`}</div><div className="mt">{fmtMac(r.mac || '')}</div></div></div> },
    { key: 'type', label: '类型', render: (r) => <span className="pill gray">{r.ip_type || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const dhcp6Cols: Column<Dhcp6Client>[] = [
    { key: 'name', label: '主机', sort: (r) => r.termname || r.hostname || '', render: (r) => <div className="dev"><span className="thumb"><IcWired /></span><div><div className="nm">{r.termname || r.hostname || r.mac}</div><div className="mt">{fmtMac(r.mac || '')}</div></div></div> },
    { key: 'ip', label: 'IPv6 地址', sort: (r) => r.ipv6_addr || '', render: (r) => <span className="num" style={{ fontWeight: 600 }}>{r.ipv6_addr || '—'}</span> },
    { key: 'intf', label: '接口', render: (r) => <span className="num">{r.interface || '—'}</span> },
    { key: 'remain', label: '剩余租期', align: 'right', sort: (r) => r.expires ?? 0, render: (r) => <span className="num">{remain(r.expires ?? 0)}</span> },
  ]
  const dnatCols: Column<DnatRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcInternet /></span><div><div className="nm">{r.tagname || `映射 ${r.id}`}</div><div className="mt">{r.comment || '端口映射'}</div></div></div> },
    { key: 'proto', label: '协议', render: (r) => <span className="pill gray">{(r.protocol || 'all').toUpperCase()}</span> },
    { key: 'wan', label: '外网端口', render: (r) => <span className="num">{r.interface || 'wan'} : {r.wan_port || '—'}</span> },
    { key: 'lan', label: '映射到', render: (r) => <span className="num" style={{ fontWeight: 600 }}>{r.lan_addr || '—'}{r.lan_port ? ` : ${r.lan_port}` : ''}</span> },
    { key: 'src', label: '源限制', render: (r) => <span className="num muted">{r.src_addr || '全部'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const natCols: Column<NatRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcInternet /></span><div><div className="nm">{r.tagname || `NAT ${r.id}`}</div><div className="mt">{r.comment || 'NAT 转换'}</div></div></div> },
    { key: 'act', label: '动作', render: (r) => <span className="pill blue">{r.action || 'NAT'}</span> },
    { key: 'inout', label: '入 / 出接口', render: (r) => <span className="num">{[r.iinterface, r.ointerface].filter(Boolean).join(' → ') || '—'}</span> },
    { key: 'src', label: '源地址', render: (r) => <span className="num">{r.src_addr || '全部'}</span> },
    { key: 'nat', label: 'NAT 地址', render: (r) => <span className="num">{r.nat_addr || '—'}{r.nat_port ? ` : ${r.nat_port}` : ''}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const dmzCols: Column<DmzRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcInternet /></span><div><div className="nm">{r.tagname || `DMZ ${r.id}`}</div><div className="mt">{r.comment || 'DMZ 主机'}</div></div></div> },
    { key: 'if', label: '外网接口', render: (r) => <span className="pill blue">{r.interface || 'wan'}</span> },
    { key: 'host', label: 'DMZ 主机', render: (r) => <span className="num" style={{ fontWeight: 600 }}>{r.lan_addr || '—'}</span> },
    { key: 'excl', label: '排除端口', render: (r) => <span className="num muted">{r.excl_port || '无'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const dnsProxyCols: Column<DnsProxyRule>[] = [
    { key: 'domain', label: '域名', sort: (r) => r.domain || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcInternet /></span><div className="nm">{r.domain || '—'}</div></div> },
    { key: 'dns', label: '指定 DNS', render: (r) => <span className="num" style={{ fontWeight: 600 }}>{r.dns_addr || '—'}</span> },
    { key: 'src', label: '源地址', render: (r) => <span className="num muted">{r.src_addr || '全部'}</span> },
    { key: 'type', label: '解析', render: (r) => <span className="pill gray">{r.parse_type || (Number(r.is_ipv6) ? 'IPv6' : 'IPv4')}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const multiDnsCols: Column<MultiDnsRule>[] = [
    { key: 'if', label: '线路', sort: (r) => r.interface || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcGateway /></span><div><div className="nm">{r.tagname || r.interface || `规则 ${r.id}`}</div><div className="mt">{r.interface || '—'}</div></div></div> },
    { key: 'dns1', label: '首选 DNS', render: (r) => <span className="num">{txt(r.dns1)}</span> },
    { key: 'dns2', label: '备用 DNS', render: (r) => <span className="num muted">{txt(r.dns2)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const dnsStatCols: Column<DnsStat>[] = [
    { key: 'date', label: '日期', sort: (r) => r.date || '', render: (r) => <span className="num">{r.date || '今日'}</span> },
    { key: 'req', label: '请求数', align: 'right', sort: (r) => r.request ?? 0, render: (r) => <span className="num">{(r.request ?? 0).toLocaleString()}</span> },
    { key: 'hit', label: '命中', align: 'right', sort: (r) => r.hit ?? 0, render: (r) => <span className="num" style={{ color: 'var(--green)' }}>{(r.hit ?? 0).toLocaleString()}</span> },
    { key: 'miss', label: '未命中', align: 'right', sort: (r) => r.miss ?? 0, render: (r) => <span className="num muted">{(r.miss ?? 0).toLocaleString()}</span> },
    { key: 'rate', label: '命中率', align: 'right', render: (r) => { const t = (r.hit ?? 0) + (r.miss ?? 0); return <span className="num" style={{ fontWeight: 700 }}>{t ? `${((r.hit ?? 0) / t * 100).toFixed(1)}%` : '—'}</span> } },
  ]
  const wvlanCols: Column<WirelessVlanRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcNetworks /></span><div><div className="nm">{r.tagname || `规则 ${r.id}`}</div><div className="mt">{r.comment || '无线 VLAN'}</div></div></div> },
    { key: 'vlan', label: 'VLAN', render: (r) => <span className="pill blue">VLAN {r.vlanid ?? '—'}</span> },
    { key: 'ssid', label: 'SSID', render: (r) => <span className="num">{r.lssid || '全部'}</span> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num muted">{r.lmac ? fmtMac(r.lmac) : '全部'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]

  const wanVlanCols: Column<WanVlanCfg>[] = [
    { key: 'name', label: '名称', sort: (r) => r.vlan_name, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcGateway /></span><div><div className="nm">{r.vlan_name || `多拨 ${r.id}`}</div><div className="mt">{r.comment || `${r.interface}.${r.vlan_id}`}</div></div></div> },
    { key: 'if', label: '物理接口', render: (r) => <span className="pill blue">{r.interface}</span> },
    { key: 'vid', label: 'VLAN ID', align: 'right', sort: (r) => Number(r.vlan_id) || 0, render: (r) => <span className="num">{r.vlan_id || '—'}</span> },
    { key: 'conn', label: '接入方式', render: (r) => <span className="muted">{r.username ? 'PPPoE' : r.ip_mask ? '静态 IP' : r.vlan_internet === 2 ? 'PPPoE' : 'DHCP'}</span> },
    { key: 'gw', label: '网关', render: (r) => <span className="num">{txt(r.gateway)}</span> },
    { key: 'band', label: '带宽', align: 'right', render: (r) => <span className="num muted">{r.download ? `↓${r.download} / ↑${r.upload || 0} Mbps` : '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
  ]
  const dhcp6AclCols: Column<Dhcp6AccessRule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcNetworks /></span><div><div className="nm">{r.tagname || `规则 ${r.id}`}</div><div className="mt">{fmtMac(r.mac || '')}</div></div></div> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num">{fmtMac(r.mac || '')}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]
  const ifv6Cols: Column<IfaceV6>[] = [
    { key: 'if', label: '接口', sort: (r) => r.interface, render: (r) => <div className="dev"><span className="thumb"><IcGateway /></span><div className="nm">{r.interface}</div></div> },
    { key: 'conn', label: '连接数', align: 'right', sort: (r) => r.conn, render: (r) => <span className="num">{r.conn?.toLocaleString() ?? 0}</span> },
    { key: 'dl', label: '下行速率', align: 'right', sort: (r) => r.download, render: (r) => <span className="num" style={{ color: '#2b7fff' }}>↓ {fmtRateStr(r.download || 0)}</span> },
    { key: 'ul', label: '上行速率', align: 'right', sort: (r) => r.upload, render: (r) => <span className="num" style={{ color: '#7c6fd6' }}>↑ {fmtRateStr(r.upload || 0)}</span> },
    { key: 'td', label: '累计下行', align: 'right', render: (r) => <span className="num muted">{r.total_download || '—'}</span> },
    { key: 'tu', label: '累计上行', align: 'right', render: (r) => <span className="num muted">{r.total_upload || '—'}</span> },
  ]
  const ip6OnCols: Column<ClientIp6Online>[] = [
    { key: 'name', label: '终端', sort: (r) => r.termname || '', width: 200, render: (r) => <div className="dev"><span className="sdot2 on" /><span className="thumb"><IcWired /></span><div><div className="nm">{r.termname || r.mac}</div><div className="mt">{fmtMac(r.mac)}</div></div></div> },
    { key: 'ip', label: 'IPv6 地址', sort: (r) => r.ip_addr, render: (r) => <span className="num">{r.ip_addr || '—'}</span> },
    { key: 'intf', label: '接口', render: (r) => <span className="num">{r.interface || '—'}</span> },
    { key: 'vendor', label: '厂商', render: (r) => <span className="muted">{r.client_vendor || '—'}</span> },
    { key: 'up', label: '上行', align: 'right', sort: (r) => r.total_up, render: (r) => <span className="num">{fmtBytes(r.total_up || 0)}</span> },
    { key: 'dn', label: '下行', align: 'right', sort: (r) => r.total_down, render: (r) => <span className="num">{fmtBytes(r.total_down || 0)}</span> },
    { key: 'today', label: '今日', align: 'right', sort: (r) => r.today_total, render: (r) => <span className="num muted">{fmtBytes(r.today_total || 0)}</span> },
  ]
  const ip6OffCols: Column<ClientIp6Offline>[] = [
    { key: 'name', label: '终端', sort: (r) => r.termname || '', width: 200, render: (r) => <div className="dev"><span className="sdot2 off" /><span className="thumb"><IcWired /></span><div><div className="nm">{r.termname || r.mac}</div><div className="mt">{fmtMac(r.mac)}</div></div></div> },
    { key: 'ip', label: 'IPv6 地址', sort: (r) => r.ip_addr, render: (r) => <span className="num">{r.ip_addr || '—'}</span> },
    { key: 'out', label: '离线时间', align: 'right', sort: (r) => r.logout_time, render: (r) => <span className="num muted">{r.logout_time ? fmtDateTime(r.logout_time) : '—'}</span> },
    { key: 'up', label: '上行', align: 'right', sort: (r) => r.total_up, render: (r) => <span className="num">{fmtBytes(r.total_up || 0)}</span> },
    { key: 'dn', label: '下行', align: 'right', sort: (r) => r.total_down, render: (r) => <span className="num">{fmtBytes(r.total_down || 0)}</span> },
  ]
  const camCols: Column<Camera>[] = [
    { key: 'name', label: '摄像头', sort: (r) => r.tagname || r.name, width: 200, render: (r) => <div className="dev"><span className={`sdot2 ${r.status ? 'on' : 'off'}`} /><span className="thumb"><IcCamera /></span><div><div className="nm">{r.tagname || r.name || r.ip_addr}</div><div className="mt">{r.vendor || '摄像头'}</div></div></div> },
    { key: 'st', label: '状态', sort: (r) => r.status, render: (r) => <span className={`pill ${r.status ? 'green' : 'gray'}`}><span className="pdot" />{r.status ? '在线' : '离线'}</span> },
    { key: 'ip', label: 'IP : 端口', sort: (r) => r.ip_addr, render: (r) => <span className="num">{r.ip_addr}{r.port ? ` : ${r.port}` : ''}</span> },
    { key: 'mac', label: 'MAC', render: (r) => <span className="num muted">{fmtMac(r.mac || '')}</span> },
    { key: 'sn', label: '序列号', render: (r) => <span className="num muted">{r.serialno || '—'}</span> },
    { key: 'nvr', label: 'NVR', render: (r) => <span className="muted">{r.nvr || '—'}</span> },
  ]

  const onFilt = <T extends { enabled?: string }>(arr: T[]) => arr.filter((r) => !onlyOn || enabled(r.enabled))

  const table = () => {
    switch (cat) {
      case 'phys': return <DataTable rows={ports.filter((r) => match(`${r.eth} ${r.nic.interface} ${r.nic.model} ${r.nic.mac}`))} columns={portCols} rowKey={(r) => r.eth} defaultSort="eth" empty="无物理网口数据" />
      case 'iface': return <DataTable rows={ifaces.filter((r) => match(`${r.name} ${r.comment} ${r.ip} ${r.mac}`))} columns={ifaceCols} rowKey={(r) => r.key} defaultSort="name" empty="无接口配置" />
      case 'vlan': return <DataTable rows={onFilt(vlan.data?.data ?? []).filter((r) => match(`${r.vlan_name} ${r.vlan_id} ${r.comment}`))} columns={vlanColsRef} rowKey={(r) => r.id} defaultSort="name" empty="无 VLAN 接口" />
      case 'dhcp': return <DataTable rows={onFilt(dhcp.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.interface} ${r.addr_pool}`))} columns={dhcpCols} rowKey={(r) => r.id} defaultSort="name" empty="无 DHCP 策略" />
      case 'static': return <DataTable rows={onFilt(stat.data?.static_data ?? []).filter((r) => match(`${r.tagname} ${r.hostname} ${r.comment} ${r.mac} ${r.ip_addr}`))} columns={staticCols} rowKey={(r) => r.id} defaultSort="ip" empty="无静态分配规则" />
      case 'lease': return <DataTable rows={(lease.data?.data ?? []).filter((r) => match(`${r.termname} ${r.hostname} ${r.mac} ${r.ip_addr}`))} columns={leaseCols} rowKey={(r) => r.id} defaultSort="ip" empty="暂无在线租约" />
      case 'dhcpacl': return <DataTable rows={onFilt(dhcpacl.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.mac} ${r.comment}`))} columns={dhcpAclCols} rowKey={(r) => r.id} defaultSort="name" empty="无 DHCP 访问控制规则" />
      case 'dhcp6': return <DataTable rows={(dhcp6.data?.client_data ?? []).filter((r) => match(`${r.termname} ${r.hostname} ${r.mac} ${r.ipv6_addr}`))} columns={dhcp6Cols} rowKey={(r) => r.id} defaultSort="ip" empty="暂无 DHCPv6 租约" />
      case 'dnat': return <DataTable rows={onFilt(dnat.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.lan_addr} ${r.wan_port} ${r.comment}`))} columns={dnatCols} rowKey={(r) => r.id} defaultSort="name" empty="无端口映射规则" />
      case 'nat': return <DataTable rows={onFilt(nat.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.src_addr} ${r.nat_addr} ${r.comment}`))} columns={natCols} rowKey={(r) => r.id} defaultSort="name" empty="无 NAT 规则" />
      case 'dmz': return <DataTable rows={onFilt(dmz.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.lan_addr} ${r.comment}`))} columns={dmzCols} rowKey={(r) => r.id} defaultSort="name" empty="无 DMZ 主机" />
      case 'dns': return <DataTable rows={dnsRows.filter((r) => match(r.k))} columns={kvCols} rowKey={(r) => r.k} empty="无 DNS 配置" />
      case 'dnsproxy': return <DataTable rows={onFilt(dnsProxy.data?.data ?? []).filter((r) => match(`${r.domain} ${r.dns_addr} ${r.comment}`))} columns={dnsProxyCols} rowKey={(r) => r.id} defaultSort="domain" empty="无 DNS 分流规则" />
      case 'multidns': return <DataTable rows={onFilt(multiDns.data?.data ?? []).filter((r) => match(`${r.interface} ${r.tagname} ${r.dns1} ${r.comment}`))} columns={multiDnsCols} rowKey={(r) => r.id} defaultSort="if" empty="无多 DNS 规则" />
      case 'dnsstat': return <DataTable rows={(dnsStat.data?.data ?? []).filter((r) => match(r.date || ''))} columns={dnsStatCols} rowKey={(r) => r.id} defaultSort="date" defaultDir="desc" empty="无 DNS 缓存统计" />
      case 'pppoe': return <DataTable rows={pppoeRows.filter((r) => match(r.k))} columns={kvCols} rowKey={(r) => r.k} empty="无 PPPoE 服务端配置" />
      case 'wvlan': return <DataTable rows={onFilt(wvlan.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.lssid} ${r.comment}`))} columns={wvlanCols} rowKey={(r) => r.id} defaultSort="name" empty="无无线 VLAN 规则" />
      case 'wanvlan': return <DataTable rows={onFilt(wanvlan.data?.vlan_data ?? []).filter((r) => match(`${r.vlan_name} ${r.vlan_id} ${r.interface} ${r.comment}`))} columns={wanVlanCols} rowKey={(r) => r.id} defaultSort="name" empty="无 WAN 多拨配置" />
      case 'dhcp6acl': return <DataTable rows={onFilt(dhcp6acl.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.mac} ${r.comment}`))} columns={dhcp6AclCols} rowKey={(r) => r.id} defaultSort="name" empty="无 DHCPv6 访问控制规则" />
      case 'ifv6': return <DataTable rows={(ifv6.data?.data ?? []).filter((r) => match(r.interface))} columns={ifv6Cols} rowKey={(r) => r.id} defaultSort="if" empty="无 IPv6 线路数据" />
      case 'ip6on': return <DataTable rows={(ip6on.data?.data ?? []).filter((r) => match(`${r.termname} ${r.mac} ${r.ip_addr}`))} columns={ip6OnCols} rowKey={(r) => r.id} defaultSort="dn" defaultDir="desc" empty="暂无 IPv6 在线终端" />
      case 'ip6off': return <DataTable rows={(ip6off.data?.offline_data ?? []).filter((r) => match(`${r.termname} ${r.mac} ${r.ip_addr}`))} columns={ip6OffCols} rowKey={(r) => r.id} defaultSort="out" defaultDir="desc" empty="暂无 IPv6 离线终端" />
      case 'cam': return <DataTable rows={onFilt(cam.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.name} ${r.ip_addr} ${r.vendor} ${r.mac}`))} columns={camCols} rowKey={(r) => r.id} defaultSort="st" defaultDir="desc" empty="未发现摄像头" />
    }
  }

  const vlanColsRef: Column<Vlan>[] = [
    { key: 'name', label: 'VLAN', sort: (r) => Number(r.vlan_id) || 0, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcNetworks /></span><div><div className="nm">{r.vlan_name || `vlan${r.vlan_id}`}</div><div className="mt">VLAN {r.vlan_id} · {r.interface}</div></div></div> },
    { key: 'ip', label: 'IP / 掩码', render: (r) => <span className="num">{txt(r.ip_mask || r.ip_addr)}</span> },
    { key: 'intf', label: '父接口', render: (r) => <span className="num">{r.interface || '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status e={r.enabled} /> },
    { key: 'c', label: '备注', render: (r) => <span className="muted">{r.comment || '—'}</span> },
  ]

  const cur = CATS.find((c) => c.key === cat)!
  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索…" /></div>
        <div className="fb-scroll">
          {GROUPS.map((g) => (
            <div className="fb-sec" key={g}>
              <div className="fb-cap">{g}</div>
              {CATS.filter((c) => c.group === g).map((c) => (
                <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
                  <span className="fb-ic"><IcNetworks /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        {hasStatus && (
          <div className="fb-sec">
            <button className={`fb-item ${onlyOn ? 'active' : ''}`} onClick={() => setOnlyOn((v) => !v)}>
              <span className="sdot2 on" /><span className="fl">仅启用</span>
            </button>
          </div>
        )}
        <button className="fb-clear" onClick={() => { setQ(''); setOnlyOn(false) }}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">网络 · {cur.label}</div><div className="lc">{counts[cat]} 项</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
