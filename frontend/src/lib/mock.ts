// Mock data that mirrors the real iKuai response schemas, so the UI renders
// identically whether the source is LIVE or MOCK. Only used when a request
// fails AND VITE_ALLOW_MOCK !== '0'.

import type {
  SystemInfo, InterfacesStatus, ClientsOnline, TrafficSummary,
  AcServices, WirelessScore, WirelessStatistics, ApConfigList, ChannelClients, NetPoint, WanStat,
  ClientsOffline, SwitchDev, DownstreamDev,
  SecList, AclRule, MacRule, DomainRule, UrlRule, PeerconnRule,
  WanConfig, LanConfig, DhcpServices, DhcpStaticList, DhcpClientList, VlanList,
  StaticRoute, LoadBalanceRule, StreamDomainRule, FiveTupleRule, AppProtoRule, UpDownRule,
  VpnClientList, WgList, VpnServerList, LogList,
  AuthOnlineUser, AuthUser, AuthPackage, WebAuthList,
  ObjGroupResp,
  AclL7Rule, UrlKeywordRule, UrlRedirectRule, UrlReplaceRule, SecAdvancedList,
  SysBasicCfg, SysUpgrade, AdminAccount, AdminGroup, RebootSchedule, BackupInfo, DiskInfo, RemoteAccessCfg, VrrpCfg,
  PhysicalPorts, NatRule, DnatRule, DmzRule, DnsConfig, DnsProxyRule, MultiDnsRule, DnsStat, PppoeServer, DhcpAccessRule, Dhcp6ClientList,
  QosRule, CustomProtoRule, AdvProtoRule,
  FtpConfig, FtpUser, SambaConfig, SambaUserList, SnmpdConfig, HttpUser,
  SecTerminal, SecondaryRoute, MacMode, WirelessAclRule, WirelessVlanRule,
  AlgConfig, BackupAuto, CpuFreqMode, SysFile, KernelParams,
  AuditTerminals, AuditAccounts, ProtocolStats,
  WanVlanList, IfaceV6, Dhcp6AccessRule, ClientIp6Online, ClientIp6Offline, Camera, CpuTempPoint,
} from './api'
import type { IspSummary, IspHistory } from './svc'

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const ri = (a: number, b: number) => Math.round(rnd(a, b))

let upBase = 11_000_000  // ~88 Mbps
let dlBase = 39_000_000  // ~312 Mbps
let totalUp = 52_160_182_000
let totalDown = 198_655_160_000

export function mockSystem(): { sysinfo: SystemInfo } {
  upBase = Math.max(2e6, Math.min(20e6, upBase + rnd(-2e6, 2e6)))
  dlBase = Math.max(8e6, Math.min(60e6, dlBase + rnd(-6e6, 6e6)))
  totalUp += upBase * 2
  totalDown += dlBase * 2
  const cpuAvg = ri(8, 42)
  return {
    sysinfo: {
      cpu: [`${cpuAvg}.${ri(0, 99)}%`, ...Array.from({ length: 4 }, () => `${ri(2, 50)}.${ri(0, 9)}%`)],
      cputemp: [ri(48, 63)],
      freq: Array.from({ length: 4 }, () => '2000'),
      gwid: 'mock-gw',
      hostname: 'iKuai',
      ip_addr: '172.16.0.1',
      link_status: 1,
      memory: {
        total: 8123456, available: 4200000, free: 3800000,
        cached: 900000, buffers: 200000, used: `${ri(42, 64)}%`,
      },
      online_user: {
        count: ri(140, 156), count_2g: ri(18, 28), count_5g: ri(70, 92),
        count_wired: ri(34, 44), count_wireless: ri(100, 116),
      },
      stream: {
        connect_num: ri(2600, 4200), tcp_connect_num: ri(1800, 2800),
        udp_connect_num: ri(600, 1200), icmp_connect_num: ri(0, 12),
        upload: Math.round(upBase), download: Math.round(dlBase),
        total_up: Math.round(totalUp), total_down: Math.round(totalDown),
      },
      uptime: 2_469_837 + Math.floor(Date.now() / 1000) % 1000,
      verinfo: {
        modelname: 'iKuai RG-EG3250', verstring: '4.0.111 Build202603131338',
        version: '4.0.111', build_date: 202603131338, arch: 'x86', sysbit: 'x64',
      },
    },
  }
}

const ifaceNames = ['wan1', 'wan2']
export function mockInterfacesStatus(): InterfacesStatus {
  return {
    iface_check: [
      { id: 1, interface: 'wan1', parent_interface: '', ip_addr: '116.25.43.118', gateway: '116.25.43.1', internet: 'PPPoE', updatetime: String(Math.floor(Date.now() / 1000)), auto_switch: '已启用', result: 'success', errmsg: '', comment: '电信1000M' },
      { id: 2, interface: 'wan2', parent_interface: '', ip_addr: '10.20.30.41', gateway: '10.20.30.1', internet: 'DHCP', updatetime: String(Math.floor(Date.now() / 1000)), auto_switch: '已启用', result: 'success', errmsg: '', comment: '联通500M' },
    ],
    iface_stream: ifaceNames.map((n, i) => ({
      interface: n, comment: i === 0 ? '电信1000M' : '联通500M',
      ip_addr: i === 0 ? '116.25.43.118' : '10.20.30.41',
      connect_num: String(ri(400, 2200)),
      upload: ri(2e6, 9e6), download: ri(8e6, 34e6),
      total_up: ri(20e9, 60e9), total_down: ri(120e9, 260e9),
      updropped: 0, downdropped: 0, uppacked: ri(1e6, 9e6), downpacked: ri(1e6, 9e6),
    })),
  }
}

const names = ['MacBook-Pro-Joe', 'Synology-NAS', 'iPhone-15-Pro', 'Desktop-Design', 'AppleTV-会议室', 'PS5-客厅', 'Redmi-AX6000', '小米电视', 'iPad-前台', 'Ubuntu-测试机']
const vendors = ['Apple', 'Synology', 'Apple', 'Intel', 'Apple', 'Sony', 'Xiaomi', 'Xiaomi', 'Apple', 'Dell']
const ifaces = ['lan1', 'lan1', 'vlan10', 'lan1', 'vlan20', 'vlan20', 'lan1', 'vlan20', 'lan1', 'vlan5']
export function mockClientsOnline(): ClientsOnline {
  const data = names.map((nm, i) => ({
    id: i + 1,
    mac: `08:9b:4b:${String(ri(10, 99))}:${String(ri(10, 99))}:${String(ri(10, 99))}`,
    ip_addr: `172.16.${ri(0, 4)}.${ri(2, 250)}`, ssid: i % 3 === 1 ? '' : 'iKuai-Corp',
    uplink_dev: 'AP-Office', uplink_addr: '00:e2:69:00:89:e6',
    connect_num: ri(3, 180),
    total_up: ri(1e8, 4e9), total_down: ri(5e8, 9e9),
    upload: ri(0, 3e6), download: ri(0, 9e6), today_total: ri(5e8, 7e9),
    apname: 'AP-Office', termname: nm,
    client_vendor: vendors[i], client_model: '', client_type: 'iKuaiOS',
    interface: ifaces[i], signal: i % 3 === 1 ? '' : String(ri(2, 4)), vlan_id: 0,
    uptime: '2026-06-19 09:1' + i + ':00', frequencies: i % 2 ? '5G' : '2.4G', comment: '',
  }))
  return { total: 148, data }
}

// ---- Network throughput history (drives the activity chart) ----
export function mockNetworkLoad(span: 'RT' | '1H' | '1D' | '1W' = '1D'): { rate_stat: NetPoint[] } {
  const cfg = { 'RT': { n: 60, step: 5 }, '1H': { n: 60, step: 60 }, '1D': { n: 96, step: 900 }, '1W': { n: 84, step: 7200 } }[span]
  const now = Math.floor(Date.now() / 1000)
  let dl = rnd(12e6, 30e6), ul = rnd(3e6, 8e6)
  const rate_stat: NetPoint[] = []
  for (let i = cfg.n - 1; i >= 0; i--) {
    dl = Math.max(2e6, Math.min(48e6, dl + rnd(-6e6, 6e6)))
    ul = Math.max(5e5, Math.min(14e6, ul + rnd(-2e6, 2e6)))
    rate_stat.push({
      timestamp: now - i * cfg.step,
      max_download: Math.round(dl), max_upload: Math.round(ul),
      rx_packages: ri(800, 4000), tx_packages: ri(400, 2200),
    })
  }
  return { rate_stat }
}

// ---- Load-monitor history (cpu/mem/disk/terminals/connections) ----
function tsRange(span: '1H' | '24H'): number[] {
  const n = span === '1H' ? 60 : 96, step = span === '1H' ? 60 : 900
  const now = Math.floor(Date.now() / 1000)
  return Array.from({ length: n }, (_, i) => now - (n - 1 - i) * step)
}
function walk(ts: number[], lo: number, hi: number, jitter: number) {
  let v = rnd(lo, hi)
  return ts.map((t) => { v = Math.max(lo, Math.min(hi, v + rnd(-jitter, jitter))); return { t, v: Math.round(v) } })
}
export function mockCpuHistory(span: '1H' | '24H' = '1H') { return { cpu: walk(tsRange(span), 8, 65, 22).map(({ t, v }) => ({ timestamp: t, cpu: v })) } }
export function mockMemHistory(span: '1H' | '24H' = '1H') { return { memory: walk(tsRange(span), 40, 70, 6).map(({ t, v }) => ({ timestamp: t, memory: v, memory_use: v })) } }
export function mockDiskHistory(span: '1H' | '24H' = '1H') { return { disk_space_used: tsRange(span).map((t, i) => ({ timestamp: t, disk_space_use: 28 + Math.round(i / 20), disk_space_used: 28000 })) } }
export function mockTerminalsHistory(span: '1H' | '24H' = '1H') { return { on_terminal: walk(tsRange(span), 8, 14, 2).map(({ t, v }) => ({ timestamp: t, on_terminal: v })) } }
export function mockConnectionsHistory(span: '1H' | '24H' = '1H') { return { conn_num: walk(tsRange(span), 1800, 4200, 800).map(({ t, v }) => ({ timestamp: t, conn_num: v })) } }
export function mockFlowShunting() {
  const span = (base: number) => ({ llb_cnt: 0, port_cnt: 0, proto_cnt: 0, domain_cnt: 0, conn_cnt: base })
  return { data: { today: span(179483), yesterday: span(249070), week: span(1472924) } }
}

// ---- Per-interface 24h traffic history (KB/s strings) ----
export function mockInterfacesTraffic(): { wans_stat_history: WanStat[] } {
  const N = 96, step = 900, now = Math.floor(Date.now() / 1000)
  const ifaces: { name: string; dl: number; ul: number }[] = [
    { name: 'wan1', dl: 2200, ul: 600 },
    { name: 'wan2', dl: 900, ul: 280 },
    { name: 'lan1', dl: 3400, ul: 1500 },
  ]
  const state: Record<string, { dl: number; ul: number }> = {}
  for (const f of ifaces) state[f.name] = { dl: f.dl, ul: f.ul }
  const rows: WanStat[] = []
  let id = 1
  for (let i = N - 1; i >= 0; i--) {
    const ts = now - i * step
    let aDl = 0, aUl = 0
    for (const f of ifaces) {
      const s = state[f.name]
      s.dl = Math.max(50, s.dl + rnd(-f.dl * 0.4, f.dl * 0.4))
      s.ul = Math.max(20, s.ul + rnd(-f.ul * 0.4, f.ul * 0.4))
      aDl += s.dl; aUl += s.ul
      rows.push(mkStat(id++, ts, f.name, s.dl, s.ul))
    }
    rows.push(mkStat(id++, ts, 'all', aDl, aUl))
  }
  return { wans_stat_history: rows }
}
function mkStat(id: number, ts: number, iface: string, dl: number, ul: number): WanStat {
  const rtt = rnd(4, 30)
  return {
    id, timestamp: ts, interface: iface,
    avg_download: (dl * 0.8).toFixed(2), max_download: dl.toFixed(2),
    avg_upload: (ul * 0.8).toFixed(2), max_upload: ul.toFixed(2),
    drop_rate: '0.00', avg_rtt: Math.round(rtt), min_rtt: Math.round(rtt * 0.8), max_rtt: Math.round(rtt * 1.3),
  }
}

// ---- Wireless / AC mocks (MOCK mode shows AC *enabled* w/ realistic APs) ----

export function mockAcServices(): AcServices { return { ac_status: 1 } }

export function mockWirelessScore(): WirelessScore {
  return {
    total_count_net_status: {
      score_active_user: ri(82, 96), score_chutil_load: ri(74, 92),
      score_channf_load: ri(70, 90), score_conn_sta: ri(86, 98),
      delay: ri(3, 18), coverage: ri(80, 95), dropptk: ri(0, 4),
    },
  }
}

export function mockWirelessStatistics(): WirelessStatistics {
  return {
    ap_status: { ap_count: 5, ap_online: 5, ap_offline: 0, ap_perfer_5g: 3, ap_roaming: 5 },
    clt_status: { clt_count: ri(96, 118), clt_count_2g: ri(20, 30), clt_count_5g: ri(70, 90), clt_max_online: 132, clt_active: ri(60, 90), clt_inactive: ri(10, 30) },
  }
}

const apModels = ['iK-AP520', 'iK-AP360', 'iK-AP520', 'iK-AP360-Lite', 'iK-AP720']
const apNames = ['前台-AP', '办公区-AP', '会议室-AP', '茶水间-AP', '仓库-AP']
export function mockApConfig(): ApConfigList {
  const data = apNames.map((nm, i) => ({
    id: i + 1, tagname: nm, comment: nm, mac: `00:e2:69:00:8${i}:e6`,
    ap_model: apModels[i], version: '1.4.2',
    connected: 1, status: 1, online: ri(6, 22), online_5g: ri(10, 34),
    on_channel: String([1, 6, 11][i % 3]), on_channel_5g: String([149, 157, 36][i % 3]),
    signal_str: -ri(38, 66), signal_str_5g: -ri(40, 70), min_signal: -75,
    ip_addr: `172.16.0.${20 + i}`, link_speed: 1000, uptime: ri(50000, 900000), support_5g: 1,
    channel_width_2g: 20, channel_width_5g: [40, 80, 80, 40, 80][i],
    beacon_txpower: ri(60, 100), beacon_txpower_5g: ri(70, 100),
    ssid1: 'iKuai-Corp', ssid3: 'iKuai-Corp-5G',
    upload: String(ri(2e5, 4e6)), download: String(ri(1e6, 2e7)),
  }))
  return { total: data.length, data }
}

export function mockSsidClients(): import('./api').SsidClients {
  const ts = Math.floor(Date.now() / 1000)
  const ssids: [string, number][] = [['iKuai-Corp', 38], ['iKuai-Corp-5G', 26], ['iKuai-Guest', 9], ['iKuai-IoT', 21], ['Office-WiFi', 14]]
  return { ssid_sta_history: ssids.map(([ssid, total]) => ({ timestamp: ts, ssid, total })) }
}
export function mockWirelessTraffic(): import('./api').WirelessTraffic {
  const now = Math.floor(Date.now() / 1000)
  let dl = 8e6, ul = 2e6
  const total_count_flow = Array.from({ length: 60 }, (_, i) => {
    dl = Math.max(5e5, Math.min(40e6, dl + rnd(-5e6, 5e6))); ul = Math.max(2e5, Math.min(12e6, ul + rnd(-2e6, 2e6)))
    return { id: i + 1, timestamp: now - (59 - i) * 60, upload: Math.round(ul), download: Math.round(dl), count5m_up: ri(1e7, 9e7), count5m_down: ri(5e7, 5e8) } as any
  })
  return { total_count_flow }
}

export function mockChannelClients(): ChannelClients {
  const chans = [1, 6, 11, 36, 149, 157]
  const ts = Math.floor(Date.now() / 1000)
  return {
    channel_sta_history: chans.map((channel, i) => ({
      timestamp: ts, channel, online: ri(4, 26), apnum: ri(1, 3) + (i > 2 ? 1 : 0),
    })),
  }
}

// ---- ISP backend mocks (used only if the backend itself is unreachable) ----

export function mockIspSummary(): IspSummary {
  return {
    isp: '中国电信 CHINANET', ip: '116.25.43.118', online: true,
    latencies: { isp: ri(2, 9), cloudflare: ri(40, 90), google: ri(20, 60), github: ri(50, 120), microsoft: ri(20, 70) },
    uptime24h: 99.7, uptime7d: 99.9, updatedAt: Date.now(), intervalMs: 300000,
  }
}

export function mockIspHistory(): IspHistory {
  const now = Math.floor(Date.now() / 1000)
  const buckets_data = Array.from({ length: 60 }, (_, i) => {
    const bad = i === 18 || i === 19 || i === 47
    return { t0: now - (60 - i) * 1440, ratio: bad ? 0.5 : 1, online: bad ? 1 : 2, n: 2, avgLat: ri(20, 80) }
  })
  return { hours: 24, buckets: 60, uptime: 98.9, buckets_data }
}

export function mockClientsOffline(): ClientsOffline {
  const names = ['iPhone-访客', 'Switch-OG客厅', 'Roborock-S7', 'Kindle-卧室', 'HP-LaserJet']
  const vendors = ['Apple', 'Nintendo', 'Roborock', 'Amazon', 'HP']
  const now = Math.floor(Date.now() / 1000)
  const offline_data = names.map((nm, i) => ({
    id: i + 1, mac: `7c:2a:31:${String(10 + i)}:ab:${String(20 + i)}`, ip_addr: `172.16.0.${180 + i}`,
    logout_time: now - ri(600, 86400), total_up: ri(1e7, 9e8), total_down: ri(5e7, 3e9), today_total: ri(1e7, 5e8),
    client_type: 'iKuaiOS', termname: nm, comment: '', username: '',
    client_vendor: vendors[i], client_model: '', vlan_id: 0,
  }))
  return { total: offline_data.length, offline_data }
}

export function mockSwitches(): { total: number; data: SwitchDev[] } {
  const data = [
    { id: 1, name: 'SW-核心', tagname: 'SW-核心', oemname: '', mac: '00:e2:69:11:22:33', ip_addr: '172.16.0.2', version: '1.2.0', device: 'iKuai-SW2310', connect_time: Math.floor(Date.now() / 1000) - 900000, status: 1 },
    { id: 2, name: 'SW-办公', tagname: 'SW-办公', oemname: '', mac: '00:e2:69:11:22:44', ip_addr: '172.16.0.3', version: '1.2.0', device: 'iKuai-SW1810', connect_time: Math.floor(Date.now() / 1000) - 400000, status: 1 },
  ]
  return { total: data.length, data }
}

export function mockDownstream(): { total: number; data: DownstreamDev[] } {
  const data = [
    { id: 1, name: 'NVR-监控', tagname: 'NVR-监控', ip_addr: '172.16.0.9', mac: '08:9b:4b:aa:bb:cc', device: 'NVR', status: 1, last_time: 0 },
  ]
  return { total: data.length, data }
}

export function mockAppTraffic(): { proto3_day: import('./api').AppTraffic[]; proto3_day_total: number; proto3_day_total_flow: number } {
  const apps: [string, string][] = [
    ['SSL/TLS', '基础协议'], ['HTTP 文件传输', '文件传输'], ['iCloud', '云服务'],
    ['微信', '即时通讯'], ['抖音', '视频'], ['哔哩哔哩', '视频'], ['YouTube', '视频'],
    ['Steam', '游戏'], ['QUIC', '基础协议'], ['STUN', '基础协议'], ['苹果更新', '系统更新'],
    ['Windows Update', '系统更新'], ['网盘下载', '文件传输'], ['Netflix', '视频'],
  ]
  const proto3_day = apps.map(([appname, lvl1], i) => {
    const down = ri(2e8, 9e10), up = ri(5e7, 8e9)
    return { id: i + 1, appid: 1000 + i, appname, appname_level1: lvl1, appname_level2: lvl1, total: down + up, total_up: up, total_down: down }
  }).sort((a, b) => b.total - a.total)
  return { proto3_day, proto3_day_total: proto3_day.length, proto3_day_total_flow: proto3_day.reduce((s, a) => s + a.total, 0) }
}

export function mockAclRules(): SecList<AclRule> {
  const data: AclRule[] = [
    { id: 1, action: '拒绝', dir: 'forward', iinterface: 'lan1', ointerface: 'wan1', src_addr: '172.16.5.0/24', dst_addr: 'any', enabled: 'yes', comment: 'IoT 禁止外网' },
    { id: 2, action: '允许', dir: 'forward', iinterface: 'lan1', ointerface: 'wan1', src_addr: 'any', dst_addr: 'any', enabled: 'yes', comment: '默认放行' },
    { id: 3, action: '拒绝', dir: 'input', iinterface: 'wan1', ointerface: '', src_addr: 'any', dst_addr: '172.16.0.1', enabled: 'no', comment: '禁止外网管理' },
  ]
  return { total: data.length, data }
}
export function mockMacRules(): SecList<MacRule> {
  const data: MacRule[] = [
    { id: 1, mac: '08:9b:4b:01:7e:70', enabled: 'yes', tagname: '访客手机', comment: '限时', expires: Math.floor(Date.now() / 1000) + 7200, termname: 'iPhone-访客' },
    { id: 2, mac: 'a4:83:e7:11:22:33', enabled: 'yes', tagname: '黑名单设备', comment: '', expires: 0, termname: '未知设备' },
  ]
  return { total: data.length, data }
}
export function mockDomainBlacklist(): SecList<DomainRule> {
  const data: DomainRule[] = [
    { id: 1, enabled: 'yes', tagname: '广告拦截', comment: '全网', domain_group: '广告联盟,统计追踪' },
    { id: 2, enabled: 'yes', tagname: '成人内容', comment: '儿童设备', domain_group: '成人内容' },
    { id: 3, enabled: 'no', tagname: '游戏限制', comment: '工作时段', domain_group: '游戏娱乐' },
  ]
  return { total: data.length, data }
}
export function mockUrlBlacklist(): SecList<UrlRule> {
  const data: UrlRule[] = [
    { id: 1, enabled: 'yes', tagname: '下载站拦截', comment: '', mode: 0, domain: 'thunder://,*.torrent' },
    { id: 2, enabled: 'yes', tagname: '视频网站', comment: '上班时段', mode: 0, domain: '*.youku.com,*.iqiyi.com' },
  ]
  return { total: data.length, data }
}
export function mockPeerconnRules(): SecList<PeerconnRule> {
  const data: PeerconnRule[] = [
    { id: 1, enabled: 'yes', tagname: 'P2P 限制', comment: '防滥用', protocol: 'tcp', dst_port: 'any', limits: 200 },
    { id: 2, enabled: 'yes', tagname: '单机连接数', comment: '', protocol: 'all', dst_port: 'any', limits: 5000 },
  ]
  return { total: data.length, data }
}

// ---- Networks: interfaces / DHCP / VLAN mocks ----

export function mockWanConfig(): { data: WanConfig[] } {
  const data: WanConfig[] = [
    { id: 1, name: 'wan1', tagname: 'wan1', comment: '电信1000M', mac: '08:9b:4b:01:7e:7c', speed: 1000, duplex: 1, internet: 2, username: '0755xxxx@163.gd', ip_mask: '', gateway: '116.25.43.1', upload: 30, download: 1000, mtu: 1492, enable_ipv6: 1 },
    { id: 2, name: 'wan2', tagname: 'wan2', comment: '联通500M', mac: '08:9b:4b:01:7e:7d', speed: 1000, duplex: 1, internet: 1, username: '', ip_mask: '', gateway: '10.20.30.1', upload: 30, download: 500, mtu: 1500, enable_ipv6: 0 },
  ]
  return { data }
}
export function mockLanConfig(): { data: LanConfig[] } {
  const data: LanConfig[] = [
    { id: 1, name: 'lan1', tagname: 'lan1', comment: '办公内网', mac: '08:9b:4b:01:7e:7e', speed: 1000, duplex: 1, ip_mask: '172.16.0.1/22', vlan: '', dhcp_server: 1 },
    { id: 2, name: 'lan2', tagname: 'lan2', comment: 'IoT 隔离', mac: '08:9b:4b:01:7e:7f', speed: 1000, duplex: 1, ip_mask: '192.168.50.1/24', vlan: '', dhcp_server: 1 },
  ]
  return { data }
}
export function mockDhcpServices(): DhcpServices {
  const data = [
    { id: 1, enabled: 'yes', tagname: '办公内网', interface: 'lan1', addr_pool: '172.16.0.100-172.16.3.250', exclude_pool: '172.16.0.1-172.16.0.99', netmask: '255.255.252.0', gateway: '172.16.0.1', dns1: '223.5.5.5', dns2: '119.29.29.29', domain: '', lease: 7200 },
    { id: 2, enabled: 'yes', tagname: 'IoT', interface: 'lan2', addr_pool: '192.168.50.50-192.168.50.250', exclude_pool: '', netmask: '255.255.255.0', gateway: '192.168.50.1', dns1: '192.168.50.1', dns2: '', domain: '', lease: 3600 },
    { id: 3, enabled: 'no', tagname: '访客VLAN', interface: 'vlan10', addr_pool: '10.10.10.10-10.10.10.200', exclude_pool: '', netmask: '255.255.255.0', gateway: '10.10.10.1', dns1: '223.5.5.5', dns2: '', domain: '', lease: 1800 },
  ]
  return { total: data.length, data }
}
export function mockDhcpStatic(): DhcpStaticList {
  const static_data = [
    { id: 1, enabled: 'yes', mac: '00:11:32:aa:bb:cc', ip_addr: '172.16.0.9', interface: 'lan1', gateway: '172.16.0.1', dns1: '223.5.5.5', dns2: '', comment: '群晖 NAS', tagname: 'Synology-NAS', hostname: 'DiskStation' },
    { id: 2, enabled: 'yes', mac: '08:9b:4b:aa:bb:cc', ip_addr: '172.16.0.8', interface: 'lan1', gateway: '172.16.0.1', dns1: '223.5.5.5', dns2: '', comment: 'NVR 监控', tagname: 'NVR-监控', hostname: 'NVR' },
    { id: 3, enabled: 'no', mac: 'a4:83:e7:11:22:33', ip_addr: '172.16.0.20', interface: 'lan1', gateway: '', dns1: '', dns2: '', comment: '前台打印机', tagname: 'HP-LaserJet', hostname: 'HP-Printer' },
  ]
  return { static_total: static_data.length, static_data }
}
export function mockDhcpClients(): DhcpClientList {
  const now = Math.floor(Date.now() / 1000)
  const rows: [string, string, string][] = [
    ['MacBook-Pro-Joe', '172.16.0.112', 'lan1'], ['iPhone-15-Pro', '172.16.1.45', 'lan1'],
    ['Desktop-Design', '172.16.0.130', 'lan1'], ['小米电视', '192.168.50.66', 'lan2'],
    ['PS5-客厅', '172.16.2.18', 'lan1'], ['Ubuntu-测试机', '172.16.0.151', 'lan1'],
  ]
  const data = rows.map(([nm, ip, intf], i) => ({
    id: i + 1, mac: `08:9b:4b:${String(10 + i)}:7e:${String(70 + i)}`, ip_addr: ip,
    interface: intf, hostname: nm, termname: nm,
    start_time: now - ri(600, 6000), end_time: now + ri(600, 7200), timeout: 7200, status: 1,
  }))
  return { total: data.length, data }
}
export function mockVlans(): VlanList {
  const data = [
    { id: 1, vlan_id: '10', vlan_name: 'vlan10', interface: 'lan1', mac: '08:9b:4b:01:7e:7e', ip_addr: '10.10.10.1', netmask: '255.255.255.0', ip_mask: '10.10.10.1/24', enabled: 'yes', comment: '访客网络' },
    { id: 2, vlan_id: '20', vlan_name: 'vlan20', interface: 'lan1', mac: '08:9b:4b:01:7e:7e', ip_addr: '10.10.20.1', netmask: '255.255.255.0', ip_mask: '10.10.20.1/24', enabled: 'yes', comment: '无线办公' },
    { id: 3, vlan_id: '5', vlan_name: 'vlan5', interface: 'lan1', mac: '08:9b:4b:01:7e:7e', ip_addr: '10.10.5.1', netmask: '255.255.255.0', ip_mask: '10.10.5.1/24', enabled: 'no', comment: '测试段' },
  ]
  return { total: data.length, data }
}

// ---- Routing: shunting / load-balance / static routes mocks ----
const allDay = { object: {}, custom: [{ type: 'weekly', weekdays: '1234567', start_time: '00:00', end_time: '23:59', comment: '' }] }
const grp = (name: string) => ({ object: [{ type: 1, gp_name: name, gid: '1' }], custom: [] as string[] })

export function mockStaticRoutes(): SecList<StaticRoute> {
  const data: StaticRoute[] = [
    { id: 1, enabled: 'yes', tagname: '内网回程', comment: '到分支机构', interface: 'lan1', dst_addr: '192.168.100.0', netmask: '255.255.255.0', gateway: '172.16.0.254', prio: 30, ip_type: 'ipv4' },
    { id: 2, enabled: 'yes', tagname: '专线路由', comment: '', interface: 'wan2', dst_addr: '10.8.0.0', netmask: '255.255.0.0', gateway: '10.20.30.1', prio: 31, ip_type: 'ipv4' },
    { id: 3, enabled: 'no', tagname: '测试', comment: '临时', interface: 'wan1', dst_addr: '203.0.113.0', netmask: '255.255.255.0', gateway: '116.25.43.1', prio: 32, ip_type: 'ipv4' },
  ]
  return { total: data.length, data }
}
export function mockLoadBalanceRules(): SecList<LoadBalanceRule> {
  const data: LoadBalanceRule[] = [
    { id: 1, enabled: 'yes', tagname: '默认均衡', comment: '电信+联通', interface: 'wan1,wan2', weight: '2:1', mode: 0, isp_name: '' },
    { id: 2, enabled: 'yes', tagname: '电信优先', comment: '游戏走电信', interface: 'wan1', weight: '1', mode: 1, isp_name: '电信' },
    { id: 3, enabled: 'no', tagname: '联通备份', comment: '', interface: 'wan2', weight: '1', mode: 1, isp_name: '联通' },
  ]
  return { total: data.length, data }
}
export function mockStreamDomainRules(): SecList<StreamDomainRule> {
  const data: StreamDomainRule[] = [
    { id: 1, enabled: 'yes', tagname: '视频走联通', comment: '', interface: 'wan2', prio: 31, domain: { object: {}, custom: ['*.bilibili.com', '*.youku.com'] }, time: allDay, src_addr: { object: {}, custom: {} } },
    { id: 2, enabled: 'yes', tagname: '办公走电信', comment: 'SaaS', interface: 'wan1', prio: 32, domain: { object: {}, custom: ['*.feishu.cn', '*.dingtalk.com'] }, time: allDay, src_addr: grp('办公网段') },
  ]
  return { total: data.length, data }
}
export function mockFiveTupleRules(): SecList<FiveTupleRule> {
  const data: FiveTupleRule[] = [
    { id: 1, enabled: 'yes', tagname: 'Web 走电信', comment: '', interface: 'wan1', mode: 0, prio: 31, src_addr: { object: {}, custom: ['172.16.0.0/22'] }, dst_addr: { object: {}, custom: [] }, protocol: 'tcp', src_port: {}, dst_port: { object: {}, custom: ['80', '443'] }, area_code: '', time: allDay },
    { id: 2, enabled: 'yes', tagname: '游戏低延迟', comment: 'UDP', interface: 'wan1', mode: 1, prio: 32, src_addr: grp('游戏机'), dst_addr: { object: {}, custom: [] }, protocol: 'udp', src_port: {}, dst_port: { object: {}, custom: ['10000-20000'] }, area_code: '', time: allDay },
  ]
  return { total: data.length, data }
}
export function mockAppProtoRules(): SecList<AppProtoRule> {
  const data: AppProtoRule[] = [
    { id: 1, enabled: 'yes', tagname: '迅雷限速线路', comment: '', interface: 'wan2', mode: 0, prio: 31, src_addr: { object: {}, custom: [] }, app_proto: { object: {}, custom: ['迅雷下载', 'BT'] }, time: allDay },
    { id: 2, enabled: 'no', tagname: '视频会议保障', comment: 'Zoom/Teams', interface: 'wan1', mode: 1, prio: 32, src_addr: grp('会议室'), app_proto: { object: {}, custom: ['Zoom', 'Teams'] }, time: allDay },
  ]
  return { total: data.length, data }
}
export function mockUpDownRules(): SecList<UpDownRule> {
  const data: UpDownRule[] = [
    { id: 1, enabled: 'yes', tagname: '上联通下电信', comment: '非对称', upiface: 'wan2', downiface: 'wan1', src_addr: { object: {}, custom: ['172.16.0.0/22'] }, dst_addr: { object: {}, custom: [] }, protocol: 'all', src_port: {}, dst_port: {} },
  ]
  return { total: data.length, data }
}

// ---- VPN mocks ----
export function mockVpnIpsecClients(): VpnClientList {
  return { total: 2, data: [
    { id: 1, enabled: 'yes', name: '总部-IPSec', comment: '到上海总部', interface: 'wan1', remote_addr: '203.0.113.10', leftsubnet: '172.16.0.0/22', rightsubnet: '10.1.0.0/16', status: 1 },
    { id: 2, enabled: 'no', name: '灾备站点', comment: '', interface: 'wan1', remote_addr: '198.51.100.7', leftsubnet: '172.16.0.0/22', rightsubnet: '10.2.0.0/16', status: 0 },
  ] }
}
export function mockVpnOpenvpnClients(): VpnClientList {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', name: '出差-OpenVPN', comment: 'UDP 1194', interface: 'wan1', remote_addr: 'vpn.corp.com', remote_port: 1194, username: 'mobile01', proto: 'udp', tunnel_ip: '10.8.0.6' },
  ] }
}
export function mockVpnL2tpClients(): VpnClientList {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', name: '分支-L2TP', comment: '', interface: 'wan1', server: '203.0.113.20', server_port: 1701, username: 'branch-gz', ip_addr: '192.168.200.6', gateway: '192.168.200.1' },
  ] }
}
export function mockVpnPptpClients(): VpnClientList {
  return { total: 1, data: [
    { id: 1, enabled: 'no', name: '老旧-PPTP', comment: '兼容', interface: 'wan2', server: '198.51.100.30', server_port: 1723, username: 'legacy', ip_addr: '', gateway: '' },
  ] }
}
export function mockVpnIkev2Clients(): VpnClientList {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', name: '云主机-IKEv2', comment: '阿里云', interface: 'wan1', remote_addr: '47.96.0.1', username: 'ecs01', ip_addr: '10.10.99.6' },
  ] }
}
export function mockVpnWireguard(): WgList {
  return { iface_total: 2, iface_data: [
    { id: 1, enabled: 'yes', name: 'wg0', interface: 'wg0', local_publickey: 'aB3xKp9QyR2sT1uVwX4yZ6cD8eF0gH2iJ4kL6mN8oP=', local_address: '10.99.0.1/24', local_listenport: 51820, mtu: 1420 },
    { id: 2, enabled: 'no', name: 'wg1-测试', interface: 'wg1', local_publickey: 'Qr5sT7uV9wX1yZ3aB5cD7eF9gH1iJ3kL5mN7oP9qR=', local_address: '10.99.1.1/24', local_listenport: 51821, mtu: 1420 },
  ] }
}
export function mockVpnIkev2Server(): VpnServerList {
  return { data: [{ id: 1, enabled: 'yes', name: 'IKEv2-Server', addrpool: '10.20.0.10-10.20.0.200', dns1: '223.5.5.5', dns2: '' }] }
}
export function mockVpnL2tpServer(): VpnServerList {
  return { data: [{ id: 1, enabled: 'yes', server_ip: '172.16.0.1', server_port: 1701, addr_pool: '192.168.99.10-192.168.99.200', dns1: '223.5.5.5', dns2: '' }] }
}
export function mockVpnOpenvpnServer(): VpnServerList {
  return { total: 1, data: [{ enabled: 'yes', proto: 'udp', port: '1194', subnet: '10.8.0.0', mask: '255.255.255.0' }] }
}
export function mockVpnPptpServer(): VpnServerList {
  return { data: [{ id: 1, enabled: 'no', server_ip: '172.16.0.1', server_port: 1723, addr_pool: '192.168.98.10-192.168.98.100', dns1: '223.5.5.5', dns2: '' }] }
}

// ---- Logs mocks (compact, a few rows each) ----
const lt = (i: number) => Math.floor(Date.now() / 1000) - i * 137   // descending timestamps
const wrap = (data: Record<string, unknown>[]): LogList => ({ total: data.length, data: data.map((d, i) => ({ id: i + 1, timestamp: lt(i), ...d })) as LogList['data'] })

export function mockLogSystem(): LogList { return wrap([
  { level: 'info', module: 'system', message: '系统启动完成,版本 4.0.222', process: 'init' },
  { level: 'warn', module: 'network', message: 'wan1 链路抖动,已自动恢复', process: 'netd' },
  { level: 'error', module: 'dhcp', message: 'lan1 地址池接近耗尽 (95%)', process: 'dhcpd' },
]) }
export function mockLogWebActivity(): LogList { return wrap([
  { username: 'admin', ip_addr: '172.16.0.112', function: '行为管理', event: '修改 URL 黑名单规则' },
  { username: 'admin', ip_addr: '172.16.0.112', function: '系统设置', event: '登录管理后台' },
]) }
export function mockLogAuth(): LogList { return wrap([
  { username: 'guest01', ip_addr: '172.16.1.45', ppptype: 'Web认证', result: '成功', event: '上线' },
  { username: 'guest02', ip_addr: '172.16.1.46', ppptype: 'Web认证', result: '失败', event: '密码错误' },
]) }
export function mockLogDhcp(): LogList { return wrap([
  { msgtype: 'DHCPACK', event: '分配地址', interface: 'lan1', ip_addr: '172.16.0.130', mac: '08:9b:4b:11:22:33' },
  { msgtype: 'DHCPREQUEST', event: '续租', interface: 'lan1', ip_addr: '172.16.0.112', mac: '08:9b:4b:44:55:66' },
]) }
export function mockLogPppoe(): LogList { return wrap([
  { interface: 'wan1', content: 'PPPoE 拨号成功,获取 IP 116.25.43.118' },
  { interface: 'wan1', content: 'PPPoE 链路中断,正在重拨' },
]) }
export function mockLogTerminalPresence(): LogList { return wrap([
  { termname: 'iPhone-15-Pro', mac: '08:9b:4b:10:7e:70', ip_addr: '172.16.1.45', online_time: 7240, total_up: 220000000, total_down: 1900000000, event: '上线' },
  { termname: 'PS5-客厅', mac: '08:9b:4b:11:7e:71', ip_addr: '172.16.2.18', online_time: 0, total_up: 50000000, total_down: 800000000, event: '下线' },
]) }
export function mockLogUrlVisits(): LogList { return wrap([
  { ip_addr: '172.16.0.112', mac: '08:9b:4b:10:7e:70', host: 'www.bilibili.com', uri: '/video/BV1xx', appname: '哔哩哔哩' },
  { ip_addr: '172.16.1.45', mac: '08:9b:4b:11:7e:71', host: 'github.com', uri: '/anthropics', appname: 'GitHub' },
]) }
export function mockLogWireless(): LogList { return wrap([
  { action: '关联', mac: '08:9b:4b:10:7e:70', apmac_comment: '办公区-AP', ssid: 'iKuai-Corp', signal: -52, errmsg: '' },
  { action: '断开', mac: '08:9b:4b:11:7e:71', apmac_comment: '会议室-AP', ssid: 'iKuai-Corp-5G', signal: -71, errmsg: '信号过弱' },
]) }
export function mockLogArp(): LogList { return wrap([
  { content: '检测到 IP 冲突 172.16.0.50 (08:9b:4b:aa:bb:cc / a4:83:e7:11:22:33)' },
  { content: 'ARP 绑定生效:172.16.0.9 ↔ 00:11:32:aa:bb:cc' },
]) }
export function mockLogDdns(): LogList { return wrap([
  { domain: 'home.example.com', status: '成功', ip_addr: '116.25.43.118', message: '更新成功' },
  { domain: 'nas.example.com', status: '失败', ip_addr: '116.25.43.118', message: '认证失败' },
]) }
export function mockLogNotice(): LogList { return wrap([
  { type: '微信', ip_addr: '172.16.0.1', event: 'WAN1 掉线告警已推送' },
]) }
export function mockLogWarnings(): LogList { return wrap([
  { level: 3, title: 'CPU 占用过高', event: 'cpu_high', detail: 'CPU 持续 5 分钟超过 90%' },
  { level: 1, title: '新设备接入', event: 'new_device', detail: '172.16.0.155 首次接入网络' },
]) }
export function mockLogMessageCenter(): LogList { return wrap([
  { title: '固件更新可用', type: 2, detail: '检测到新版本 4.0.223,建议升级' },
  { title: '欢迎使用 iKuai', type: 0, detail: '设备已激活' },
]) }

// ---- Auth mocks ----
export function mockAuthOnlineUsers(): SecList<AuthOnlineUser> {
  const now = Math.floor(Date.now() / 1000)
  const data: AuthOnlineUser[] = [
    { id: 1, username: 'guest01', ppptype: 'Web认证', ip_addr: '172.16.1.45', mac: '08:9b:4b:10:7e:70', upload: 220000000, download: 1900000000, expires: now + 3600, packname: '访客1小时', phone: '138****8888', name: '张三', comment: '', interface: 'lan1', auth_time: now - 1800 },
    { id: 2, username: 'pppoe-201', ppptype: 'PPPoE', ip_addr: '10.10.20.6', mac: 'a4:83:e7:11:22:33', upload: 80000000, download: 600000000, expires: now + 2592000, packname: '包月套餐', phone: '', name: '202室', comment: '', interface: 'lan2', auth_time: now - 86400 },
  ]
  return { total: data.length, data }
}
export function mockAuthUsers(): SecList<AuthUser> {
  const now = Math.floor(Date.now() / 1000)
  const data: AuthUser[] = [
    { id: 1, enabled: 'yes', username: 'pppoe-201', comment: '202室住户', name: '202室', ppptype: 'PPPoE', expires: now + 2592000, upload: 2560, download: 25600, packages: 1, phone: '13800138000', last_conntime: now - 86400, duration: 86400, tagname: '' },
    { id: 2, enabled: 'no', username: 'guest', comment: '通用访客', name: '访客', ppptype: 'Web认证', expires: 0, upload: 1280, download: 10240, packages: 2, phone: '', last_conntime: 0, duration: 0, tagname: '' },
  ]
  return { total: data.length, data }
}
export function mockAuthPackages(): SecList<AuthPackage> {
  const data: AuthPackage[] = [
    { id: 1, packname: '包月套餐', tagname: '包月套餐', packtime: '30天', price: 5000, up_speed: 5120, down_speed: 51200, comment: '50M 宽带' },
    { id: 2, packname: '访客1小时', tagname: '访客1小时', packtime: '1小时', price: 0, up_speed: 1024, down_speed: 10240, comment: '免费访客' },
  ]
  return { total: data.length, data }
}
export function mockAuthWebConfig(): WebAuthList {
  return {
    data: [{
      id: 1, enabled: 'yes', interface: 'lan1', max_time: 3600, idle_time: 600,
      user_auth: 1, nopasswd: 1, phone_auth: 1, weixin: 1, qq_auth: 0, static_pwd: 0,
      allow_tryout: 1, ldap_auth: 0,
      phone_up: 2048, phone_down: 20480, nopasswd_up: 1024, nopasswd_down: 10240,
      weixin_up: 2048, weixin_down: 20480, tryout_up: 512, tryout_down: 5120,
      user_max_time: 0, phone_max_time: 7200, nopasswd_max_time: 1800,
    }],
    interface: ['lan1'], template: 1,
  }
}

// ---- Object library mocks ----
const upd = '2026-06-18 14:30:00'
export function mockObjIp(): ObjGroupResp {
  return { ip_total: 2, ip_data: [
    { id: 1, group_name: '办公网段', enabled: 'yes', updated_time: upd, group_value: [{ ip: '172.16.0.0/22', comment: '主网段' }, { ip: '172.16.4.0/24', comment: '财务' }] },
    { id: 2, group_name: '服务器', enabled: 'yes', updated_time: upd, group_value: [{ ip: '172.16.0.8', comment: 'NVR' }, { ip: '172.16.0.9', comment: 'NAS' }, { ip: '172.16.0.10', comment: 'Web' }] },
  ] }
}
export function mockObjIp6(): ObjGroupResp {
  return { ip6_total: 1, ip6_data: [{ id: 1, group_name: 'IPv6 内网', group_value: [{ ipv6: 'fd00::/64', comment: 'ULA' }] }] }
}
export function mockObjMac(): ObjGroupResp {
  return { mac_total: 1, mac_data: [{ id: 1, group_name: '受信设备', enabled: 'yes', updated_time: upd, group_value: [{ mac: '00:11:32:aa:bb:cc', comment: 'NAS' }, { mac: '08:9b:4b:aa:bb:cc', comment: 'NVR' }] }] }
}
export function mockObjDomain(): ObjGroupResp {
  return { domain_total: 2, domain_data: [
    { id: 1, group_name: '视频网站', group_value: [{ domain: '*.bilibili.com', comment: '' }, { domain: '*.youku.com', comment: '' }, { domain: '*.iqiyi.com', comment: '' }] },
    { id: 2, group_name: '办公 SaaS', group_value: [{ domain: '*.feishu.cn', comment: '' }, { domain: '*.dingtalk.com', comment: '' }] },
  ] }
}
export function mockObjPort(): ObjGroupResp {
  return { port_total: 1, port_data: [{ id: 1, group_name: 'Web 端口', group_value: [{ port: '80', comment: 'HTTP' }, { port: '443', comment: 'HTTPS' }, { port: '8080', comment: '' }] }] }
}
export function mockObjProto(): ObjGroupResp {
  return { proto_total: 1, proto_data: [{ id: 1, group_name: '视频应用', group_value: [{ proto: '哔哩哔哩', comment: '' }, { proto: '抖音', comment: '' }, { proto: 'YouTube', comment: '' }] }] }
}
export function mockObjTime(): ObjGroupResp {
  return { time_total: 2, time_data: [
    { id: 1, group_name: '工作时间', enabled: 'yes', updated_time: upd, group_value: [{ type: 'weekly', weekdays: '12345', start_time: '09:00', end_time: '18:00', comment: '' }] },
    { id: 2, group_name: '休息时段', enabled: 'yes', updated_time: upd, group_value: [{ type: 'weekly', weekdays: '67', start_time: '00:00', end_time: '23:59', comment: '周末' }] },
  ] }
}

// ---- Security extra mocks (reuse allDay/grp from routing block) ----
export function mockAclL7Rules(): SecList<AclL7Rule> {
  const data: AclL7Rule[] = [
    { id: 1, enabled: 'yes', tagname: '禁止P2P下载', comment: '全网', prio: 31, action: '拒绝', app_proto: { object: {}, custom: ['BT下载', '迅雷'] }, src_addr: { object: {}, custom: [] }, dst_addr: { object: {}, custom: [] }, time: allDay, name: '', mac: '', expires: 0 },
    { id: 2, enabled: 'yes', tagname: '工作时段禁游戏', comment: '', prio: 32, action: '拒绝', app_proto: { object: {}, custom: ['王者荣耀', 'Steam'] }, src_addr: grp('办公网段'), dst_addr: { object: {}, custom: [] }, time: { object: {}, custom: [{ type: 'weekly', weekdays: '12345', start_time: '09:00', end_time: '18:00', comment: '' }] }, name: '', mac: '', expires: 0 },
  ]
  return { total: data.length, data }
}
export function mockUrlKeywordRules(): SecList<UrlKeywordRule> {
  const data: UrlKeywordRule[] = [
    { id: 1, prio: 31, enabled: 'yes', tagname: '搜索词过滤', src_addr: { object: {}, custom: [] }, src_url: 'www.baidu.com', ori_keyword: '赌博', rep_keyword: '***', mode: '替换', excluded: '', hit_rate: 128, time: allDay },
  ]
  return { total: data.length, data }
}
export function mockUrlRedirectRules(): SecList<UrlRedirectRule> {
  const data: UrlRedirectRule[] = [
    { id: 1, prio: 31, enabled: 'yes', tagname: '旧站跳转', src_addr: { object: {}, custom: [] }, src_url: 'old.corp.com', dst_url: 'https://new.corp.com', mode: '302', excluded: '', hit_rate: 56, time: allDay },
    { id: 2, prio: 32, enabled: 'no', tagname: '认证跳转', src_addr: grp('访客网段'), src_url: '*', dst_url: 'http://portal.corp.com', mode: '302', excluded: '', hit_rate: 0, time: allDay },
  ]
  return { total: data.length, data }
}
export function mockUrlReplaceRules(): SecList<UrlReplaceRule> {
  const data: UrlReplaceRule[] = [
    { id: 1, prio: 31, enabled: 'yes', tagname: '去广告参数', src_addr: { object: {}, custom: [] }, src_url: '*.taobao.com', param_keyword: 'spm', rep_keyword: '', mode: '删除', excluded: '', hit_rate: 902, time: allDay },
  ]
  return { total: data.length, data }
}
export function mockSecurityAdvanced(): SecAdvancedList {
  return { data: [{ id: 1, noping_lan: 0, noping_wan: 1, notracert: 1, hijack_ping: 0, invalid: 1, dos_lan: 1, dos_lan_num: 1000, tcp_mss: 1, tcp_mss_num: 1400 }] }
}

// ---- System management mocks ----
export function mockSysBasic(): { total: number; data: SysBasicCfg[] } {
  return { total: 1, data: [{ id: 1, hostname: 'iKuai', time_zone_full: '(GMT+08:00) 北京', switch_ntp: 1, ntpserver_list: 'ntp.aliyun.com,cn.pool.ntp.org' }] }
}
export function mockSysUpgrade(): { data: SysUpgrade } {
  return { data: { system_ver: '4.0.222', build_date: '2026-03-13 13:38', version_type: '正式版', libproto_ver: '3.0.20', libaudit_ver: '2.4.8', libdomain_ver: '1.9.2', new_system_ver: '4.0.222', new_build_date: '', update_content: '' } }
}
export function mockAdminAccounts(): { accounts_total: number; accounts_data: AdminAccount[] } {
  return { accounts_total: 2, accounts_data: [
    { id: 1, username: 'admin', enabled: 'yes', comment: '超级管理员', group_id: 0, sesstimeout: 3600 },
    { id: 2, username: 'viewer', enabled: 'yes', comment: '只读运维', group_id: 1, sesstimeout: 1800 },
  ] }
}
export function mockAdminGroups(): { groups_total: number; groups_data: AdminGroup[] } {
  return { groups_total: 1, groups_data: [{ id: 1, group_name: '只读组', perm_config: '监控,流量', ip_addr: '172.16.0.0/22' }] }
}
export function mockRebootSchedules(): SecList<RebootSchedule> {
  return { total: 1, data: [{ id: 1, enabled: 'yes', tagname: '每周重启', event: 'reboot', strategy: 'week', cycle_time: '7', time: '04:00', comment: '凌晨维护' }] }
}
export function mockSysBackup(): { backup_info: BackupInfo[] } {
  const now = Math.floor(Date.now() / 1000)
  return { backup_info: [
    { id: 1, timestamp: now - 86400, filename: 'ikuai_20260618.conf', backtype: 2, version: '4.0.222', filesize: 184320 },
    { id: 2, timestamp: now - 7 * 86400, filename: 'ikuai_manual.conf', backtype: 1, version: '4.0.221', filesize: 182100 },
  ] }
}
export function mockSysDisks(): { data: DiskInfo[] } {
  return { data: [{ type: 'eMMC', disk: 'mmcblk0', model: 'iKuai-Storage', size: 8 * 1024 * 1024 * 1024, system: 1, partition: [{ name: 'mmcblk0p1', type: 'system', filesys: 'ext4', size: 2 * 1024 * 1024 * 1024, mounted: '/' }, { name: 'mmcblk0p2', type: 'data', filesys: 'ext4', size: 6 * 1024 * 1024 * 1024, mounted: '/data' }] }] }
}
export function mockRemoteAccess(): { data: RemoteAccessCfg[] } {
  return { data: [{ id: 1, open_telnetd: 0, open_wanweb: 0, open_sshd: 1, sshd_port: 22, open_ftp: 0, ftp_port: 21, http_port: 80, https_port: 443, force_https: 1 }] }
}
export function mockVrrpConfig(): { total: number; data: VrrpCfg[] } {
  return { total: 1, data: [{ enabled: 'no', type: 0, prio: 100, gateway: '172.16.0.254', ifnames: 'lan1', virtual_ips: '172.16.0.1', interfaces: 'lan1', remote_addr: '172.16.0.252' }] }
}

// ---- WAN multi-dial / IPv6 / cameras / temperature mocks ----
export function mockWanVlanConfig(): WanVlanList {
  return { vlan_data: [
    { id: 1, interface: 'wan1', vlan_name: 'wan1_v41', vlan_id: '41', vlan_internet: 2, enabled: 'yes', comment: '电信IPTV', mac: '08:9b:4b:01:7e:7c', username: 'iptv@telecom', ip_mask: '', gateway: '100.64.0.1', upload: 30, download: 200, mtu: 1492 },
    { id: 2, interface: 'wan1', vlan_name: 'wan1_v85', vlan_id: '85', vlan_internet: 2, enabled: 'yes', comment: '电信组播', mac: '08:9b:4b:01:7e:7c', username: '0755xxxx@163.gd', ip_mask: '', gateway: '116.25.43.1', upload: 30, download: 1000, mtu: 1492 },
  ] }
}
export function mockIfaceTrafficV6(): SecList<IfaceV6> {
  const data: IfaceV6[] = [
    { id: 1, interface: 'wan1', conn: ri(20, 120), upload: ri(1e5, 2e6), download: ri(2e6, 2e7), total_upload: '12.4 GB', total_download: '88.2 GB' },
    { id: 2, interface: 'lan1', conn: ri(40, 200), upload: ri(2e6, 9e6), download: ri(8e6, 3e7), total_upload: '40.1 GB', total_download: '210 GB' },
  ]
  return { total: data.length, data }
}
export function mockDhcp6AccessRules(): SecList<Dhcp6AccessRule> {
  const data: Dhcp6AccessRule[] = [
    { id: 1, enabled: 'yes', mac: '00:11:32:aa:bb:cc', tagname: '群晖 NAS', comment: '允许' },
    { id: 2, enabled: 'no', mac: 'a4:83:e7:11:22:33', tagname: '未知设备', comment: '拒绝' },
  ]
  return { total: data.length, data }
}
export function mockClientsIp6Online(): { total: number; data: ClientIp6Online[] } {
  const data: ClientIp6Online[] = [
    { id: 1, mac: '08:9b:4b:10:7e:70', ip_addr: '240e:3b7:xxxx::1a2b', termname: 'MacBook-Pro-Joe', comment: '', interface: 'lan1', upload: ri(0, 2e6), download: ri(0, 9e6), total_up: 2.2e8, total_down: 1.9e9, today_total: 6e8, signal: -52, client_vendor: 'Apple', connect_num: ri(20, 120), uptime: '2026-06-19 09:10:00', vlan_id: 0, ppptype: '' },
    { id: 2, mac: '00:11:32:aa:bb:cc', ip_addr: '240e:3b7:xxxx::99', termname: '群晖 NAS', comment: '', interface: 'lan1', upload: ri(0, 1e6), download: ri(0, 4e6), total_up: 8e8, total_down: 9e9, today_total: 4.1e7, signal: 0, client_vendor: 'Synology', connect_num: ri(10, 60), uptime: '2026-06-01 00:00:00', vlan_id: 0, ppptype: '' },
  ]
  return { total: data.length, data }
}
export function mockClientsIp6Offline(): { total: number; offline_data: ClientIp6Offline[] } {
  const now = Math.floor(Date.now() / 1000)
  const offline_data: ClientIp6Offline[] = [
    { id: 1, mac: '7c:2a:31:10:ab:20', ip_addr: '240e:3b7:xxxx::55', logout_time: now - 3600, total_up: 1e7, total_down: 5e8, today_total: 2e7, termname: 'iPhone-访客', comment: '', client_vendor: 'Apple', vlan_id: 0 },
  ]
  return { total: offline_data.length, offline_data }
}
export function mockCameras(): SecList<Camera> {
  const now = Math.floor(Date.now() / 1000)
  const data: Camera[] = [
    { id: 1, enabled: 'yes', tagname: '大门-球机', name: '大门-球机', vendor: '海康威视', ip_addr: '172.16.0.61', port: 8000, mac: 'bc:ad:28:11:22:33', status: 1, serialno: 'DS-2CD1234', last_time: now - 30, comment: '', version: 'V5.7', nvr: 'NVR-监控', camera_count: 0 },
    { id: 2, enabled: 'yes', tagname: '仓库-枪机', name: '仓库-枪机', vendor: '大华', ip_addr: '172.16.0.62', port: 37777, mac: 'bc:ad:28:11:22:44', status: 0, serialno: 'DH-IPC-HFW', last_time: now - 7200, comment: '离线排查', version: 'V2.8', nvr: '', camera_count: 0 },
  ]
  return { total: data.length, data }
}
export function mockCpuTemp(): { cputemp1: CpuTempPoint[] } {
  const now = Math.floor(Date.now() / 1000)
  let t = 52
  const cputemp1: CpuTempPoint[] = Array.from({ length: 60 }, (_, i) => {
    t = Math.max(42, Math.min(72, t + rnd(-2, 2)))
    return { cputemp1: Math.round(t), timestamp: now - (59 - i) * 60 }
  })
  return { cputemp1 }
}

export function mockTrafficSummary(): TrafficSummary {
  const terminal = names.slice(0, 8).map((nm, i) => {
    const up = ri(2e8, 4e9), down = ri(5e8, 9e9)
    return {
      id: i + 1, mac: `08:9b:4b:01:7e:${70 + i}`, ip_addr: `172.16.0.${100 + i}`,
      username: '', comment: nm, icon: '1_107',
      sum_total: up + down, sum_total_up: up, sum_total_down: down,
    }
  }).sort((a, b) => b.sum_total - a.sum_total)
  return {
    terminal,
    terminal_total: 148,
    terminal_total_flow: terminal.reduce((s, t) => s + t.sum_total, 0),
  }
}

// ---- Networks extras: physical ports / NAT / forwarding / DNS / DHCP ----
export function mockPhysicalPorts(): PhysicalPorts {
  return { ether_info: {
    eth0: { driver: 'igb', type: 'TP', mac: '08:9b:4b:01:7e:7c', link: 1, speed: 1000, duplex: 1, model: 'Intel I211 Gigabit', interface: 'wan1', lock: 0, bindmod: 0 },
    eth1: { driver: 'igb', type: 'TP', mac: '08:9b:4b:01:7e:7d', link: 1, speed: 1000, duplex: 1, model: 'Intel I211 Gigabit', interface: 'wan2', lock: 0, bindmod: 0 },
    eth2: { driver: 'igb', type: 'TP', mac: '08:9b:4b:01:7e:7e', link: 1, speed: 1000, duplex: 1, model: 'Intel I211 Gigabit', interface: 'lan1', lock: 0, bindmod: 0 },
    eth3: { driver: 'igb', type: 'TP', mac: '08:9b:4b:01:7e:7f', link: 0, speed: 0, duplex: 0, model: 'Intel I211 Gigabit', interface: '', lock: 0, bindmod: 0 },
    eth4: { driver: 'ixgbe', type: 'Fiber', mac: '08:9b:4b:01:7e:80', link: 1, speed: 10000, duplex: 1, model: 'Intel X550 10G', interface: 'lan2', lock: 0, bindmod: 0 },
  } }
}
export function mockNatRules(): SecList<NatRule> {
  return { total: 1, data: [
    { id: 1, tagname: '源 NAT', enabled: 'yes', action: 'SNAT', iinterface: 'lan1', ointerface: 'wan1', src_addr: '172.16.0.0/22', dst_addr: '', nat_addr: '116.25.43.118', nat_port: '', protocol: 'all', comment: '内网共享出口' },
  ] }
}
export function mockDnatRules(): SecList<DnatRule> {
  return { total: 2, data: [
    { id: 1, tagname: 'NAS 远程', enabled: 'yes', lan_addr: '172.16.0.9', lan_port: '5000', protocol: 'tcp', interface: 'wan1', wan_port: '5000', src_addr: '', comment: '群晖 DSM' },
    { id: 2, tagname: '监控回看', enabled: 'no', lan_addr: '172.16.0.8', lan_port: '8000', protocol: 'tcp', interface: 'wan1', wan_port: '18000', src_addr: '', comment: 'NVR' },
  ] }
}
export function mockDmzRules(): SecList<DmzRule> {
  return { total: 1, data: [
    { id: 1, tagname: 'DMZ 主机', enabled: 'no', interface: 'wan1', lan_addr: '172.16.0.50', protocol: 'all', excl_port: '22,80', comment: '测试服务器' },
  ] }
}
export function mockDnsConfig(): { data: DnsConfig[] } {
  return { data: [{ id: 1, enabled: 'yes', cache_ttl: 3600, cachemode: 1, query: '并发查询', dns1: '223.5.5.5', dns2: '119.29.29.29', network: 'wan1', defense: 1, forbid_dns_4a: 0, proxy_force: 1 }] }
}
export function mockDnsProxyRules(): SecList<DnsProxyRule> {
  return { total: 2, data: [
    { id: 1, domain: '*.cn', dns_addr: '223.5.5.5', enabled: 'yes', comment: '国内域名走阿里', src_addr: '', is_ipv6: 0, parse_type: '指定' },
    { id: 2, domain: '*.google.com', dns_addr: '8.8.8.8', enabled: 'no', comment: '', src_addr: '', is_ipv6: 0, parse_type: '指定' },
  ] }
}
export function mockMultiDnsRules(): SecList<MultiDnsRule> {
  return { total: 1, data: [
    { id: 1, interface: 'wan2', tagname: '联通线路 DNS', dns1: '119.29.29.29', dns2: '182.254.116.116', enabled: 'yes', comment: '' },
  ] }
}
export function mockDnsStats(): SecList<DnsStat> {
  return { total: 1, data: [{ id: 1, request: 184302, hit: 168240, miss: 16062, date: '2026-06-19', save_time: Math.floor(Date.now() / 1000) }] }
}
export function mockPppoeServer(): { data: PppoeServer[] } {
  return { data: [{ id: 1, enabled: 'no', server_name: 'iKuai-PPPoE', server_ip: '10.30.0.1', dns1: '223.5.5.5', dns2: '', authmode: '本地认证', addr_pool: '10.30.0.10-10.30.0.250', interface: 'lan2', comment: '楼宇拨号', mtu: 1492 }] }
}
export function mockDhcpAccessRules(): SecList<DhcpAccessRule> {
  return { total: 1, data: [{ id: 1, enabled: 'yes', mac: 'a4:83:e7:11:22:33', ip_type: '黑名单', tagname: '禁止获取地址', comment: '未授权设备' }] }
}
export function mockDhcp6Clients(): Dhcp6ClientList {
  const now = Math.floor(Date.now() / 1000)
  return { client_total: 1, client_data: [
    { id: 1, mac: '08:9b:4b:10:7e:70', ipv6_addr: '2408:8240:e::1a3', link_addr: 'fe80::a9b:4bff:fe10:7e70', interface: 'lan1', duid: '00:01:00:01:2b:9e', hostname: 'MacBook-Pro-Joe', termname: 'MacBook-Pro-Joe', start_time: now - 3600, expires: now + 3600, timeout: 7200 },
  ] }
}

// ---- QoS + custom protocols ----
export function mockQosIp(): SecList<QosRule> {
  return { total: 2, data: [
    { id: 1, enabled: 'yes', tagname: '访客限速', comment: 'VLAN10', ip_addr: '10.10.10.0/24', type: '共享', interface: 'wan1', protocol: 'all', src_port: '', dst_port: '', upload: 1024, download: 5120, time: allDay, attr: 1 },
    { id: 2, enabled: 'yes', tagname: 'NAS 保障', comment: '', ip_addr: '172.16.0.9', type: '独享', interface: 'wan1', protocol: 'all', src_port: '', dst_port: '', upload: 10240, download: 51200, time: allDay, attr: 0 },
  ] }
}
export function mockQosMac(): SecList<QosRule> {
  return { total: 1, data: [
    { id: 1, enabled: 'no', tagname: '手机限速', comment: '', mac_addr: '08:9b:4b:10:7e:70', type: '独享', ip_type: 'ipv4', interface: 'wan1', upload: 2048, download: 20480, time: allDay, attr: 0 } as QosRule,
  ] }
}
export function mockCustomProtoRules(): SecList<CustomProtoRule> {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', comment: '内网 ERP', name: 'ERP-8080', src_addr: '', dst_addr: '172.16.0.20', protocol: 'tcp', src_port: '', dst_port: '8080', class: '办公', appid: 60001 },
  ] }
}
export function mockAdvProtoRules(): SecList<AdvProtoRule> {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', comment: '识别私有协议', name: 'CustomVoIP', class: '语音', appid: 60010, rule: 'udp && payload[0]==0x80' },
  ] }
}

// ---- Advanced service: FTP / Samba / SNMP / HTTP ----
export function mockFtpConfig(): FtpConfig { return { open_ftp: 1, ftp_port: 21, ftp_access: 0 } }
export function mockFtpUsers(): SecList<FtpUser> {
  return { total: 2, data: [
    { id: 1, enabled: 'yes', username: 'admin', tagname: '管理员', permission: '读写', home_dir: '/data', upload: 0, download: 0 },
    { id: 2, enabled: 'yes', username: 'guest', tagname: '只读', permission: '只读', home_dir: '/data/share', upload: 1024, download: 5120 },
  ] }
}
export function mockSambaConfig(): { data: SambaConfig[] } {
  return { data: [{ id: 1, enabled: 'yes', workgroup: 'WORKGROUP', wsdd2: 1, interface: 'lan1', access: '允许' }] }
}
export function mockSambaUsers(): SambaUserList {
  return { dir_total: 2, dir_data: [
    { id: 1, enabled: 'yes', username: 'public', name: '公共共享', tagname: 'public', perm: '读写', guest: 1, browseable: 1, home_dir: '/data/public' },
    { id: 2, enabled: 'yes', username: 'design', name: '设计部', tagname: 'design', perm: '读写', guest: 0, browseable: 0, home_dir: '/data/design' },
  ] }
}
export function mockSnmpdConfig(): { data: SnmpdConfig[] } {
  return { data: [{ id: 1, enabled: 'no', listen_port: 161, syslocation: '机房', syscontact: 'admin@corp.com', sysname: 'iKuai-GW', version: 'v2c', community: 'public', source: '172.16.0.0/22', rw: '只读', username: '' }] }
}
export function mockHttpUsers(): SecList<HttpUser> {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', tagname: '内网文件站', http_port: 8088, server_name: 'files.corp', ssl_on: 0, autoindex: 1, home_dir: '/data/www', access: '内网' },
  ] }
}

// ---- Security extras ----
export function mockSecTerminals(): SecList<SecTerminal> {
  return { total: 3, data: [
    { id: 1, mac: '08:9b:4b:10:7e:70', tagname: 'MacBook-Pro-Joe', comment: '研发' },
    { id: 2, mac: '00:11:32:aa:bb:cc', tagname: 'Synology-NAS', comment: '存储' },
    { id: 3, mac: 'a4:83:e7:11:22:33', tagname: '未知设备', comment: '黑名单' },
  ] }
}
export function mockSecondaryRoute(): SecList<SecondaryRoute> {
  return { total: 1, data: [{ id: 1, nol2rt: 1, nol2rt_ip: '172.16.0.0/22', ttl_num: 1, time: allDay }] }
}
export function mockMacMode(): MacMode { return { acl_mac: 0 } }
export function mockWirelessAclRules(): SecList<WirelessAclRule> {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', tagname: '黑名单设备', mode: 0, lmac: 'a4:83:e7:11:22:33', lssid: 'iKuai-Corp', lap: '全部', week: '1234567', time: '00:00-23:59', comment: '禁止接入' },
  ] }
}
export function mockWirelessVlanRules(): SecList<WirelessVlanRule> {
  return { total: 1, data: [
    { id: 1, enabled: 'yes', tagname: '访客隔离', vlanid: 10, lmac: '', lssid: 'iKuai-Guest', comment: '访客 SSID → VLAN10' },
  ] }
}

// ---- System extras ----
export function mockSysAlg(): { data: AlgConfig[] } {
  return { data: [{ id: 1, support_ftp: 1, support_tftp: 1, support_sip: 1, support_h323: 0, ftp_ports: '21', sip_ports: '5060', tftp_ports: '69' }] }
}
export function mockSysBackupAuto(): { data: BackupAuto[] } {
  return { data: [{ id: 1, enabled: 'yes', strategy: 'week', time: '04:00', cycle_time: '7', valid_days: 30 }] }
}
export function mockSysCpuFreq(): CpuFreqMode {
  return { cpufreq_support: 1, current_cpufreq: 'performance', current_turbo: 1, cpufreq_list: ['powersave', 'ondemand', 'performance'], turbo_support: 1 }
}
export function mockSysFiles(): { data: SysFile[] } {
  const now = Math.floor(Date.now() / 1000)
  return { data: [
    { f_name: 'data', st_mtime: now - 86400, st_type: 'dir', st_size: 4096, st_inode: 2 },
    { f_name: 'ikuai_20260618.conf', st_mtime: now - 86400, st_type: 'file', st_size: 184320, st_inode: 14 },
    { f_name: 'syslog.tar.gz', st_mtime: now - 3600, st_type: 'file', st_size: 920480, st_inode: 18 },
  ] }
}
export function mockSysKernel(): { data: KernelParams[] } {
  return { data: [{ id: 1, bbr: 1, syn_recv_timeout: 60, syn_send_timeout: 120, established_timeout: 7440, fin_wait_timeout: 120, last_ack_timeout: 30, close_wait_timeout: 60, time_wait_timeout: 120, close_timeout: 10, udp_timeout: 30, udp_stream_timeout: 180, icmp_timeout: 30 }] }
}

// ---- Monitoring extras: behaviour audit + protocols ----
export function mockAuditTerminals(): AuditTerminals {
  const data = names.slice(0, 8).map((nm, i) => ({ mac: `08:9b:4b:01:7e:${70 + i}`, comment: nm, sum_total_down: ri(5e8, 9e9), sum_total_up: ri(2e8, 4e9) })).sort((a, b) => (b.sum_total_down + b.sum_total_up) - (a.sum_total_down + a.sum_total_up))
  return { daytime: data, daytime_total: data.length }
}
export function mockAuditAccounts(): AuditAccounts {
  const data = [
    { mac: 'pppoe-201', comment: '202室', sum_total_down: ri(2e9, 6e9), sum_total_up: ri(5e8, 2e9) },
    { mac: 'guest01', comment: '访客-张三', sum_total_down: ri(2e8, 1e9), sum_total_up: ri(5e7, 3e8) },
  ].sort((a, b) => (b.sum_total_down + b.sum_total_up) - (a.sum_total_down + a.sum_total_up))
  return { daytime_vpn: data, daytime_vpn_total: data.length }
}
export function mockProtocols(): ProtocolStats {
  const protos: [string, string][] = [['https', 'HTTPS'], ['quic', 'QUIC'], ['http', 'HTTP'], ['dns', 'DNS'], ['stun', 'STUN'], ['ssh', 'SSH'], ['ntp', 'NTP'], ['smb', 'SMB']]
  const data = protos.map(([proto, proto_name]) => ({ proto, proto_name, total: ri(2e8, 8e10) })).sort((a, b) => b.total - a.total)
  return { data }
}
