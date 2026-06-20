// ---------------------------------------------------------------------------
// iKuai v4.0 REST API client.
//
// The browser calls /api/v4.0/... on the Vite dev server, which proxies to the
// real device (see vite.config.ts) — so there is no CORS / mixed-content issue.
// Every request carries `Authorization: Bearer <token>`.
// ---------------------------------------------------------------------------

const TOKEN = import.meta.env.VITE_IKUAI_TOKEN
const API = '/api/v4.0'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/** iKuai response envelope: { code?, message, results } */
interface Envelope<T> {
  code?: number
  message?: string
  results?: T
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<T> {
  const qs = new URLSearchParams()
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    }
  }
  const url = `${API}${path}${qs.toString() ? `?${qs}` : ''}`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(0, '无法连接到设备（检查 VITE_IKUAI_BASE 与网络）')
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const j = await res.json()
      if (j?.message) msg = j.message
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg)
  }

  const json = (await res.json()) as Envelope<T>
  if (json && typeof json === 'object' && 'results' in json) {
    return json.results as T
  }
  return json as unknown as T
}

// ============================ Types ========================================

export interface SystemInfo {
  cpu: string[]            // per-core "12.78%", [0] = avg
  cputemp: number[]        // °C
  freq: string[]           // MHz strings
  gwid: string
  hostname: string
  ip_addr: string
  link_status: number
  memory: {
    total: number; available: number; free: number
    cached: number; buffers: number; used: string   // "48%"
  }
  online_user: {
    count: number; count_2g: number; count_5g: number
    count_wired: number; count_wireless: number
  }
  stream: {
    connect_num: number; tcp_connect_num: number; udp_connect_num: number
    icmp_connect_num: number
    upload: number; download: number          // B/s
    total_up: number; total_down: number      // bytes
  }
  uptime: number           // seconds
  verinfo: {
    modelname: string; verstring: string; version: string
    build_date: number; arch: string; sysbit: string
  }
}

export interface IfaceStream {
  interface: string; comment: string; ip_addr: string
  connect_num: string                         // "--" | "1"
  upload: number; download: number            // B/s
  total_up: number; total_down: number        // bytes
  updropped: number; downdropped: number
  uppacked: number; downpacked: number
}
export interface IfaceCheck {
  id: number; interface: string; parent_interface: string
  ip_addr: string; gateway: string
  internet: string                            // DHCP | PPPoE | Static | --
  updatetime: string; auto_switch: string
  result: string                              // success | failed
  errmsg: string; comment: string
}
export interface InterfacesStatus {
  iface_check: IfaceCheck[]
  iface_stream: IfaceStream[]
}

export interface OnlineClient {
  id: number; mac: string; ip_addr: string; ssid: string
  uplink_dev: string; uplink_addr: string; connect_num: number
  total_up: number; total_down: number
  upload: number; download: number; today_total: number
  apname: string; termname: string
  client_vendor: string; client_model: string; client_type: string
  interface: string; signal: string; vlan_id: number
  uptime: string; frequencies: string; comment: string
}
export interface ClientsOnline {
  total: number
  data: OnlineClient[]
}

export interface OfflineClient {
  id: number; mac: string; ip_addr: string; logout_time: number
  total_up: number; total_down: number; today_total: number
  client_type: string; termname: string; comment: string; username: string
  client_vendor: string; client_model: string; vlan_id: number
}
export interface ClientsOffline { total: number; offline_data: OfflineClient[] }

export interface SwitchDev {
  id: number; name: string; tagname: string; oemname: string; mac: string
  ip_addr: string; version: string; device: string; connect_time: number; status: number
}
export interface DownstreamDev {
  id: number; name: string; tagname: string; ip_addr: string; mac: string
  device: string; status: number; last_time: number
}

export interface TrafficTerminal {
  id: number; mac: string; ip_addr: string; username: string
  comment: string; icon: string
  sum_total: number; sum_total_up: number; sum_total_down: number
}
export interface TrafficSummary {
  terminal: TrafficTerminal[]
  terminal_total: number
  terminal_total_flow: number
}

export interface AppTraffic {
  id: number; appid: number; appname: string
  appname_level1: string; appname_level2: string
  total: number; total_up: number; total_down: number
}
export interface AppTrafficSummary {
  proto3_day: AppTraffic[]
  proto3_day_total: number
  proto3_day_total_flow: number
}

// ---- Wireless / AC (only meaningful when the AC controller is enabled) ----

export interface AcServices { ac_status: number }   // 0 = off, 1 = on

export interface WirelessScore {
  total_count_net_status: {
    score_active_user: number   // 用户活跃度
    score_chutil_load: number   // 空口健康度
    score_channf_load: number   // 信道负载
    score_conn_sta: number      // 关联稳定度
    delay: number               // 延迟 ms
    coverage: number            // 信号覆盖度
    dropptk: number             // 丢包率 (%)
  }
}

export interface WirelessStatistics {
  ap_status: { ap_count: number; ap_online: number; ap_offline: number; ap_perfer_5g: number; ap_roaming: number }
  clt_status: { clt_count: number; clt_count_2g: number; clt_count_5g: number; clt_max_online: number; clt_active: number; clt_inactive: number }
}

export interface ApConfig {
  id: number; tagname: string; comment: string; mac: string
  ap_model: string; version: string
  connected: number; status: number; online: number; online_5g: number
  on_channel: string; on_channel_5g: string
  signal_str: number; signal_str_5g: number; min_signal: number
  channel_width_2g: number; channel_width_5g: number
  beacon_txpower: number; beacon_txpower_5g: number
  ssid1: string; ssid3: string
  ip_addr: string; link_speed: number; uptime: number; support_5g: number
  upload: string; download: string   // realtime rate (B/s) as strings
}
export interface ApConfigList { total: number; data: ApConfig[] }

export interface ChannelClient { timestamp: number; channel: number; online: number; apnum: number }
export interface ChannelClients { channel_sta_history: ChannelClient[] }

export interface SsidClient { timestamp: number; ssid: string; total: number }
export interface SsidClients { ssid_sta_history: SsidClient[] }
export interface WirelessFlow { timestamp: number; upload: number; download: number; count5m_up: number; count5m_down: number }
export interface WirelessTraffic { total_count_flow: WirelessFlow[] }

/** Per-interface (and "all") 24h traffic history. Rates are KB/s strings. */
export interface WanStat {
  id: number; timestamp: number; interface: string
  avg_upload: string; max_upload: string; avg_download: string; max_download: string
  drop_rate: string; avg_rtt: number; min_rtt: number; max_rtt: number
}
export interface InterfacesTraffic { wans_stat_history: WanStat[] }

// ---- Security rule lists (read-only overview) ----
export interface SecList<T> { total: number; data: T[] }
export interface AclRule { id: number; action: string; dir: string; iinterface: string; ointerface: string; src_addr?: unknown; dst_addr?: unknown; enabled?: string; comment?: string }
export interface MacRule { id: number; mac: string; enabled: string; tagname: string; comment: string; expires: number; termname: string }
export interface DomainRule { id: number; enabled: string; tagname: string; comment: string; domain_group: string }
export interface UrlRule { id: number; enabled: string; tagname: string; comment: string; mode: number; domain?: unknown }
export interface PeerconnRule { id: number; enabled: string; tagname: string; comment: string; protocol: string; dst_port?: unknown; limits: number }

// ---- Networks: interfaces / DHCP / VLAN (read-only) ----

/** WAN interface config (/interfaces/wan-config). Only the fields we surface. */
export interface WanConfig {
  id: number; name: string; tagname: string; comment: string
  mac: string; speed: number; duplex: number
  internet: number                          // dial-mode code
  username: string; ip_mask: string; gateway: string
  upload: number; download: number          // configured bandwidth caps
  mtu: number; enable_ipv6: number
}
/** LAN interface config (/interfaces/lan-config). */
export interface LanConfig {
  id: number; name: string; tagname: string; comment: string
  mac: string; speed: number; duplex: number
  ip_mask: string; vlan: string; dhcp_server: number
}

export interface DhcpService {
  id: number; enabled: string; tagname: string; interface: string
  addr_pool: string; exclude_pool: string; netmask: string; gateway: string
  dns1: string; dns2: string; domain: string; lease: number
}
export interface DhcpServices { total: number; data: DhcpService[] }

export interface DhcpStatic {
  id: number; enabled: string; mac: string; ip_addr: string
  interface: string; gateway: string; dns1: string; dns2: string
  comment: string; tagname: string; hostname: string
}
export interface DhcpStaticList { static_total: number; static_data: DhcpStatic[] }

export interface DhcpClient {
  id: number; mac: string; ip_addr: string; interface: string
  hostname: string; termname: string
  start_time: number; end_time: number; timeout: number; status: number
}
export interface DhcpClientList { total: number; data: DhcpClient[] }

export interface Vlan {
  id: number; vlan_id: string; vlan_name: string; interface: string
  mac: string; ip_addr: string; netmask: string; ip_mask: string
  enabled: string; comment: string
}
export interface VlanList { total: number; data: Vlan[] }

// ---- Routing: shunting / load-balance / static routes (read-only) ----
// Stream rules nest matchers as { custom: string[]|object, object: {gp_name,gid}[] };
// the page flattens these with a `flat()` helper, so they stay loosely typed.
export type RuleMatch = unknown

export interface StaticRoute {
  id: number; enabled: string; tagname: string; comment: string
  interface: string; dst_addr: string; netmask: string; gateway: string
  prio: number; ip_type: string
}
export interface LoadBalanceRule {
  id: number; enabled: string; tagname: string; comment: string
  interface: string; weight: string; mode: number; isp_name: string
}
export interface StreamDomainRule {
  id: number; enabled: string; tagname: string; comment: string
  interface: string; prio: number; domain: RuleMatch; time: RuleMatch; src_addr: RuleMatch
}
export interface FiveTupleRule {
  id: number; enabled: string; tagname: string; comment: string
  interface: string; mode: number; prio: number
  src_addr: RuleMatch; dst_addr: RuleMatch; protocol: string
  src_port: RuleMatch; dst_port: RuleMatch; area_code: string; time: RuleMatch
}
export interface AppProtoRule {
  id: number; enabled: string; tagname: string; comment: string
  interface: string; mode: number; prio: number
  src_addr: RuleMatch; app_proto: RuleMatch; time: RuleMatch
}
export interface UpDownRule {
  id: number; enabled: string; tagname: string; comment: string
  upiface: string; downiface: string
  src_addr: RuleMatch; dst_addr: RuleMatch; protocol: string; src_port: RuleMatch; dst_port: RuleMatch
}

// ---- VPN: clients / WireGuard / server configs (read-only) ----
// One loose client shape covers all 5 protocols (fields vary per protocol;
// only the ones the page renders are typed).
export interface VpnClient {
  id: number; enabled: string; name: string; comment: string; interface: string
  server?: string; remote_addr?: string; server_port?: number; remote_port?: number
  username?: string; ip_addr?: string; tunnel_ip?: string; status?: number
  leftsubnet?: string; rightsubnet?: string; gateway?: string; proto?: string
}
export interface VpnClientList { total: number; data: VpnClient[] }

export interface WgInterface {
  id: number; enabled: string; name: string; interface: string
  local_publickey: string; local_address: string; local_listenport: number; mtu: number
}
export interface WgList { iface_total: number; iface_data: WgInterface[] }

/** Loose server-config shape spanning IKEv2 / L2TP / OpenVPN / PPTP. */
export interface VpnServerCfg {
  id?: number; enabled?: string; name?: string
  server_ip?: string; server_port?: number; port?: string
  addr_pool?: string; addrpool?: string; subnet?: string; mask?: string
  dns1?: string; dns2?: string; proto?: string
}
export interface VpnServerList { total?: number; data: VpnServerCfg[] }

// ---- Logs (read-only) — one loose row type spans all 13 log kinds ----
export interface LogRow {
  id: number; timestamp: number
  content?: string; message?: string; level?: string; module?: string; process?: string
  username?: string; ip_addr?: string; macip?: string; mac?: string; ppptype?: string
  result?: string; event?: string; interface?: string
  msgtype?: string; domain?: string; status?: string | number
  title?: string; type?: string | number; detail?: string
  function?: string; host?: string; uri?: string; appname?: string
  termname?: string; online_time?: number; total_up?: number; total_down?: number
  action?: string; apmac?: string; apmac_comment?: string; ssid?: string; signal?: number; errmsg?: string
}
export interface LogList { total?: number; data: LogRow[] }

// ---- Auth / captive-portal (read-only) ----
export interface AuthOnlineUser {
  id: number; username: string; ppptype: string; ip_addr: string; mac: string
  upload: number; download: number; expires: number; packname: string
  phone: string; name: string; comment: string; interface: string; auth_time: number
}
export interface AuthUser {
  id: number; enabled: string; username: string; comment: string; name: string
  ppptype: string; expires: number; upload: number; download: number
  packages: number; phone: string; last_conntime: number; duration: number; tagname: string
}
export interface AuthPackage {
  id: number; packname: string; tagname: string; packtime: string
  price: number; up_speed: number; down_speed: number; comment: string
}
/** WEB-auth service config — huge; loose-typed so the page reads method flags dynamically. */
export interface WebAuthCfg {
  id: number; enabled?: string; interface?: string; max_time?: number; idle_time?: number
  [k: string]: unknown
}
export interface WebAuthList { data: WebAuthCfg[]; interface?: string[]; template?: number }

// ---- Object library (read-only) — 7 kinds share one group shape ----
export interface ObjMember {
  ip?: string; ipv6?: string; mac?: string; domain?: string; port?: string; proto?: string
  type?: string; weekdays?: string; start_time?: string; end_time?: string; comment?: string
}
export interface ObjGroup {
  id: number; group_name: string; group_value: ObjMember[]
  enabled?: string; created_time?: string; updated_time?: string
}
/** Wrapper keys vary per kind (ip_data/ip_total, mac_data/…); page picks the *_data key. */
export type ObjGroupResp = Record<string, ObjGroup[] | number | undefined>

// ---- Security: extra rule lists (read-only) ----
export interface AclL7Rule {
  id: number; enabled: string; tagname: string; comment: string; prio: number
  action: string; app_proto: RuleMatch; src_addr: RuleMatch; dst_addr: RuleMatch
  time: RuleMatch; name: string; mac: string; expires: number
}
export interface UrlKeywordRule {
  id: number; prio: number; enabled: string; tagname: string; src_addr: RuleMatch
  src_url: string; ori_keyword: string; rep_keyword: string; mode: string
  excluded: string; hit_rate: number; time: RuleMatch
}
export interface UrlRedirectRule {
  id: number; prio: number; enabled: string; tagname: string; src_addr: RuleMatch
  src_url: string; dst_url: string; mode: string; excluded: string; hit_rate: number; time: RuleMatch
}
export interface UrlReplaceRule {
  id: number; prio: number; enabled: string; tagname: string; src_addr: RuleMatch
  src_url: string; param_keyword: string; rep_keyword: string; mode: string
  excluded: string; hit_rate: number; time: RuleMatch
}
export interface SecAdvancedCfg {
  id: number; noping_lan: number; noping_wan: number; notracert: number; hijack_ping: number
  invalid: number; dos_lan: number; dos_lan_num: number; tcp_mss: number; tcp_mss_num: number
}
export interface SecAdvancedList { data: SecAdvancedCfg[] }

// ---- System management (read-only) ----
export interface SysBasicCfg { id: number; hostname: string; time_zone_full?: string; switch_ntp?: number; ntpserver_list?: string; [k: string]: unknown }
export interface SysUpgrade {
  system_ver?: string; build_date?: string; version_type?: string
  libproto_ver?: string; libaudit_ver?: string; libdomain_ver?: string
  new_system_ver?: string; new_build_date?: string; update_content?: string; [k: string]: unknown
}
export interface AdminAccount { id: number; username: string; enabled: string; comment: string; group_id: number; sesstimeout: number }
export interface AdminGroup { id: number; group_name: string; perm_config: string; ip_addr: string }
export interface RebootSchedule { id: number; enabled: string; tagname: string; event: string; strategy: string; cycle_time: string; time: string; comment: string }
export interface BackupInfo { id: number; timestamp: number; filename: string; backtype: number; version: string; filesize: number }
export interface DiskPartition { name: string; type: string; filesys: string; size: number; mounted: string }
export interface DiskInfo { type: string; disk: string; model: string; size: number; system: number; partition: DiskPartition[] }
export interface RemoteAccessCfg {
  id: number; open_telnetd: number; open_wanweb: number; open_sshd: number; sshd_port: number
  open_ftp: number; ftp_port: number; http_port: number; https_port: number; force_https: number
}
export interface VrrpCfg { enabled: string; type: number; prio: number; gateway: string; ifnames: string; virtual_ips: string; interfaces: string; remote_addr: string }

export interface TimePoint { timestamp: number }
export interface CpuPoint extends TimePoint { cpu: number }
export interface MemPoint extends TimePoint { memory: number; memory_use: number }
export interface NetPoint extends TimePoint {
  max_upload: number; max_download: number   // B/s
  rx_packages: number; tx_packages: number
}
export interface DiskPoint extends TimePoint { disk_space_use: number; disk_space_used: number }
export interface TermPoint extends TimePoint { on_terminal: number }
export interface ConnPoint extends TimePoint { conn_num: number }

export interface FlowSpan { llb_cnt: number; port_cnt: number; proto_cnt: number; domain_cnt: number; conn_cnt: number }
export interface FlowShunting { data: { today: FlowSpan; yesterday: FlowSpan; week: FlowSpan } }

type LoadParams = {
  datetype?: 'hour' | 'day' | 'week' | 'month'
  start_time?: number; end_time?: number
  math?: 'avg' | 'max'
}

// ====================== Additional read-only modules =======================
// (NAT / forwarding / DNS / QoS / advanced-service / audit / system extras)

// ---- Networks: physical ports / NAT / forwarding / DNS / DHCP extras ----
export interface PhysicalNic {
  driver?: string; type?: string; mac?: string; link?: number
  speed?: number; duplex?: number; model?: string; interface?: string
  lock?: number; bindmod?: number
}
export interface PhysicalPorts { ether_info: Record<string, PhysicalNic> }

export interface NatRule {
  id: number; tagname?: string; enabled: string; action?: string
  iinterface?: string; ointerface?: string; src_addr?: string; dst_addr?: string
  nat_addr?: string; nat_port?: string; protocol?: string; comment?: string
  src_port?: string; dst_port?: string
}
export interface DnatRule {
  id: number; tagname?: string; enabled: string; lan_addr?: string; lan_port?: string
  protocol?: string; interface?: string; wan_port?: string; src_addr?: string; comment?: string
}
export interface DmzRule {
  id: number; tagname?: string; enabled: string; interface?: string; lan_addr?: string
  protocol?: string; excl_port?: string; comment?: string
}
export interface DnsConfig {
  id: number; enabled?: string; cache_ttl?: number | string; cachemode?: number | string
  query?: string; dns1?: string; dns2?: string; network?: string; defense?: number | string
  forbid_dns_4a?: number | string; proxy_force?: number | string
}
export interface DnsProxyRule {
  id: number; domain?: string; dns_addr?: string; enabled: string; comment?: string
  src_addr?: string; is_ipv6?: number | string; parse_type?: string
}
export interface MultiDnsRule {
  id: number; interface?: string; tagname?: string; dns1?: string; dns2?: string
  enabled: string; comment?: string
}
export interface DnsStat { id: number; request?: number; hit?: number; miss?: number; date?: string; save_time?: number }
export interface PppoeServer {
  id: number; enabled?: string; server_name?: string; server_ip?: string
  dns1?: string; dns2?: string; authmode?: string | number; addr_pool?: string
  interface?: string; comment?: string; mtu?: number
}
export interface DhcpAccessRule { id: number; enabled: string; mac?: string; ip_type?: string; tagname?: string; comment?: string }
export interface Dhcp6Client {
  id: number; mac?: string; ipv6_addr?: string; link_addr?: string; interface?: string
  duid?: string; hostname?: string; termname?: string; start_time?: number; expires?: number; timeout?: number
}
export interface Dhcp6ClientList { client_total?: number; client_data: Dhcp6Client[] }

// ---- WAN multi-dial / IPv6 / cameras / temperature (read-only) ----
export interface WanVlanCfg {
  id: number; interface: string; vlan_name: string; vlan_id: string; vlan_internet: number
  enabled: string; comment: string; mac: string; username: string; ip_mask: string; gateway: string
  upload: number; download: number; mtu: number
}
export interface WanVlanList { vlan_data: WanVlanCfg[] }
export interface IfaceV6 { id: number; interface: string; conn: number; upload: number; download: number; total_upload: string; total_download: string }
export interface Dhcp6AccessRule { id: number; enabled: string; mac: string; tagname: string; comment: string }
export interface ClientIp6Online {
  id: number; mac: string; ip_addr: string; termname: string; comment: string; interface: string
  upload: number; download: number; total_up: number; total_down: number; today_total: number
  signal: number; client_vendor: string; connect_num: number; uptime: string; vlan_id: number; ppptype: string
}
export interface ClientIp6Offline {
  id: number; mac: string; ip_addr: string; logout_time: number; total_up: number; total_down: number
  today_total: number; termname: string; comment: string; client_vendor: string; vlan_id: number
}
export interface Camera {
  id: number; enabled: string; tagname: string; name: string; vendor: string; ip_addr: string
  port: number; mac: string; status: number; serialno: string; last_time: number; comment: string
  version: string; nvr: string; camera_count: number
}
export interface CpuTempPoint { cputemp1: number; timestamp: number }
/** /ref reference-lookup result is firmware-shaped & loose. */
export type ObjRefResult = Record<string, unknown>

// ---- Routing / QoS: bandwidth limits + custom protocols ----
export interface QosRule {
  id: number; enabled: string; tagname?: string; comment?: string
  ip_addr?: string; mac_addr?: string; type?: string | number; interface?: string
  protocol?: string; src_port?: string; dst_port?: string
  upload?: number | string; download?: number | string; time?: unknown; attr?: string | number
}
export interface CustomProtoRule {
  id: number; enabled: string; comment?: string; name?: string
  src_addr?: string; dst_addr?: string; protocol?: string; src_port?: string; dst_port?: string
  class?: string; appid?: number | string
}
export interface AdvProtoRule {
  id: number; enabled: string; comment?: string; name?: string
  class?: string; appid?: number | string; rule?: string
}

// ---- Advanced service: FTP / Samba / SNMP / HTTP servers ----
export interface FtpConfig { open_ftp?: number; ftp_port?: number; ftp_access?: number }
export interface FtpUser {
  id: number; enabled: string; username?: string; tagname?: string
  permission?: string; home_dir?: string; upload?: number | string; download?: number | string
}
export interface SambaConfig { id: number; enabled?: string; workgroup?: string; wsdd2?: number | string; interface?: string; access?: string }
export interface SambaUser {
  id: number; enabled: string; username?: string; name?: string; tagname?: string
  perm?: string; guest?: number | string; browseable?: number | string; home_dir?: string
}
export interface SambaUserList { dir_total?: number; dir_data: SambaUser[] }
export interface SnmpdConfig {
  id: number; enabled?: string; listen_port?: number; syslocation?: string; syscontact?: string
  sysname?: string; version?: string; community?: string; source?: string; rw?: string | number; username?: string
}
export interface HttpUser {
  id: number; enabled: string; tagname?: string; http_port?: number; server_name?: string
  ssl_on?: number | string; autoindex?: number | string; home_dir?: string; access?: string
}

// ---- Security extras: terminal aliases / secondary-route / wireless ACL ----
export interface SecTerminal { id: number; mac: string; tagname?: string; comment?: string }
export interface SecondaryRoute { id: number; nol2rt?: number | string; nol2rt_ip?: string; ttl_num?: number; time?: unknown }
export interface MacMode { acl_mac: number }   // 0 = blacklist, 1 = whitelist
export interface WirelessAclRule {
  id: number; enabled: string; tagname?: string; mode?: number | string
  lmac?: string; lssid?: string; lap?: string; week?: string; time?: string; comment?: string
}
export interface WirelessVlanRule { id: number; enabled: string; tagname?: string; vlanid?: string | number; lmac?: string; lssid?: string; comment?: string }

// ---- System extras: ALG / auto-backup / CPU freq / files / kernel ----
export interface AlgConfig {
  id: number; support_ftp?: number | string; support_tftp?: number | string; support_sip?: number | string
  support_h323?: number | string; ftp_ports?: string; sip_ports?: string; tftp_ports?: string
}
export interface BackupAuto { id: number; enabled?: string; strategy?: string; time?: string; cycle_time?: string; valid_days?: number | string }
export interface CpuFreqMode {
  cpufreq_support?: number; current_cpufreq?: string; current_turbo?: number
  cpufreq_list?: string[]; turbo_support?: number
}
export interface SysFile { f_name: string; st_mtime?: number; st_type?: string | number; st_size?: number; st_inode?: number }
export interface KernelParams {
  id: number; bbr?: number | string; syn_recv_timeout?: number; syn_send_timeout?: number
  established_timeout?: number; fin_wait_timeout?: number; last_ack_timeout?: number
  close_wait_timeout?: number; time_wait_timeout?: number; close_timeout?: number
  udp_timeout?: number; udp_stream_timeout?: number; icmp_timeout?: number
}

// ---- Monitoring extras: behaviour audit + protocol ranking ----
export interface AuditRow { mac: string; comment?: string; sum_total_down: number; sum_total_up: number }
export interface AuditTerminals { daytime: AuditRow[]; daytime_total?: number }
export interface AuditAccounts { daytime_vpn: AuditRow[]; daytime_vpn_total?: number }
export interface ProtocolStat { proto: string; proto_name?: string; total: number }
export interface ProtocolStats { data: ProtocolStat[] }

// ============================ Endpoints ====================================

export const ikuai = {
  system: (signal?: AbortSignal) =>
    apiGet<{ sysinfo: SystemInfo }>('/monitoring/system', undefined, signal),

  interfacesStatus: (signal?: AbortSignal) =>
    apiGet<InterfacesStatus>('/monitoring/interfaces-status', undefined, signal),

  /** Per-interface 24h traffic history (interface = all|wan1|lan1|...). */
  interfacesTraffic: (signal?: AbortSignal) =>
    apiGet<InterfacesTraffic>('/monitoring/interfaces-traffic', undefined, signal),

  clientsOnline: (
    opts: { page?: number; limit?: number; order_by?: string; order?: 'asc' | 'desc' } = {},
    signal?: AbortSignal,
  ) =>
    apiGet<ClientsOnline>('/monitoring/clients-online', {
      page: opts.page ?? 1,
      limit: opts.limit ?? 50,
      order_by: opts.order_by ?? 'download',
      order: opts.order ?? 'desc',
    }, signal),

  clientsOffline: (opts: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiGet<ClientsOffline>('/monitoring/clients-offline', {
      page: opts.page ?? 1, limit: opts.limit ?? 200,
    }, signal),

  switches: (signal?: AbortSignal) =>
    apiGet<{ total: number; data: SwitchDev[] }>('/monitoring/switch', undefined, signal),

  downstream: (signal?: AbortSignal) =>
    apiGet<{ total: number; data: DownstreamDev[] }>('/monitoring/downstream', undefined, signal),

  trafficSummary: (opts: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiGet<TrafficSummary>('/monitoring/clients-traffic-summary', {
      page: opts.page ?? 1,
      limit: opts.limit ?? 8,
    }, signal),

  appTraffic: (signal?: AbortSignal) =>
    apiGet<AppTrafficSummary>('/monitoring/app-traffic-summary', undefined, signal),

  // ---- Networks: interfaces / DHCP / VLAN (read-only) ----
  wanConfig: (signal?: AbortSignal) =>
    apiGet<{ data: WanConfig[] }>('/interfaces/wan-config', undefined, signal),
  lanConfig: (signal?: AbortSignal) =>
    apiGet<{ data: LanConfig[] }>('/interfaces/lan-config', undefined, signal),
  dhcpServices: (signal?: AbortSignal) =>
    apiGet<DhcpServices>('/network/dhcp/services', { page: 1, limit: 200 }, signal),
  dhcpStatic: (signal?: AbortSignal) =>
    apiGet<DhcpStaticList>('/network/dhcp/static', { page: 1, limit: 500 }, signal),
  dhcpClients: (signal?: AbortSignal) =>
    apiGet<DhcpClientList>('/network/dhcp/clients', { page: 1, limit: 500, order_by: 'ip_addr_int', order: 'asc' }, signal),
  vlans: (signal?: AbortSignal) =>
    apiGet<VlanList>('/network/vlan', { page: 1, limit: 200 }, signal),

  // ---- Routing: shunting / load-balance / static routes (read-only) ----
  staticRoutes: (signal?: AbortSignal) =>
    apiGet<SecList<StaticRoute>>('/routing/static-routes', { page: 1, limit: 500 }, signal),
  loadBalanceRules: (signal?: AbortSignal) =>
    apiGet<SecList<LoadBalanceRule>>('/routing/load-balance-rules', { page: 1, limit: 500 }, signal),
  streamDomainRules: (signal?: AbortSignal) =>
    apiGet<SecList<StreamDomainRule>>('/routing/domain-rules', { page: 1, limit: 500 }, signal),
  fiveTupleRules: (signal?: AbortSignal) =>
    apiGet<SecList<FiveTupleRule>>('/routing/five-tuple-rules', { page: 1, limit: 500 }, signal),
  appProtoRules: (signal?: AbortSignal) =>
    apiGet<SecList<AppProtoRule>>('/routing/app-protocols', { page: 1, limit: 500 }, signal),
  updownRules: (signal?: AbortSignal) =>
    apiGet<SecList<UpDownRule>>('/routing/updown', { page: 1, limit: 500 }, signal),

  // ---- VPN: clients / WireGuard / server configs (read-only) ----
  vpnIpsecClients: (signal?: AbortSignal) =>
    apiGet<VpnClientList>('/vpn/ipsec/clients', { page: 1, limit: 200 }, signal),
  vpnOpenvpnClients: (signal?: AbortSignal) =>
    apiGet<VpnClientList>('/vpn/openvpn/clients', { page: 1, limit: 200 }, signal),
  vpnL2tpClients: (signal?: AbortSignal) =>
    apiGet<VpnClientList>('/vpn/l2tp/clients', { page: 1, limit: 200 }, signal),
  vpnPptpClients: (signal?: AbortSignal) =>
    apiGet<VpnClientList>('/vpn/pptp/clients', { page: 1, limit: 200 }, signal),
  vpnIkev2Clients: (signal?: AbortSignal) =>
    apiGet<VpnClientList>('/vpn/ikev2/clients', { page: 1, limit: 200 }, signal),
  vpnWireguard: (signal?: AbortSignal) =>
    apiGet<WgList>('/vpn/wireguard', { page: 1, limit: 200 }, signal),
  vpnIkev2Server: (signal?: AbortSignal) =>
    apiGet<VpnServerList>('/vpn/ikev2/services', undefined, signal),
  vpnL2tpServer: (signal?: AbortSignal) =>
    apiGet<VpnServerList>('/vpn/l2tp/services', undefined, signal),
  vpnOpenvpnServer: (signal?: AbortSignal) =>
    apiGet<VpnServerList>('/vpn/openvpn/services', undefined, signal),
  vpnPptpServer: (signal?: AbortSignal) =>
    apiGet<VpnServerList>('/vpn/pptp/services', undefined, signal),

  // ---- Logs (read-only) ----
  logSystem: (s?: AbortSignal) => apiGet<LogList>('/log/system', { page: 1, limit: 100 }, s),
  logWebActivity: (s?: AbortSignal) => apiGet<LogList>('/log/web_activity', { page: 1, limit: 100 }, s),
  logAuth: (s?: AbortSignal) => apiGet<LogList>('/log/auth', { page: 1, limit: 100 }, s),
  logDhcp: (s?: AbortSignal) => apiGet<LogList>('/log/dhcp', { page: 1, limit: 100 }, s),
  logPppoe: (s?: AbortSignal) => apiGet<LogList>('/log/pppoe', { page: 1, limit: 100 }, s),
  logTerminalPresence: (s?: AbortSignal) => apiGet<LogList>('/log/terminal-presence', { page: 1, limit: 100 }, s),
  logUrlVisits: (s?: AbortSignal) => apiGet<LogList>('/log/url-visits', { page: 1, limit: 100 }, s),
  logWireless: (s?: AbortSignal) => apiGet<LogList>('/log/wireless', { page: 1, limit: 100 }, s),
  logArp: (s?: AbortSignal) => apiGet<LogList>('/log/arp', { page: 1, limit: 100 }, s),
  logDdns: (s?: AbortSignal) => apiGet<LogList>('/log/ddns', { page: 1, limit: 100 }, s),
  logNotice: (s?: AbortSignal) => apiGet<LogList>('/log/notice', { page: 1, limit: 100 }, s),
  logWarnings: (s?: AbortSignal) => apiGet<LogList>('/log/warnings', { page: 1, limit: 100 }, s),
  logMessageCenter: (s?: AbortSignal) => apiGet<LogList>('/log/message-center', { page: 1, limit: 100 }, s),

  // ---- Auth / captive-portal (read-only) ----
  authOnlineUsers: (s?: AbortSignal) => apiGet<SecList<AuthOnlineUser>>('/auth/online-users', { page: 1, limit: 500 }, s),
  authUsers: (s?: AbortSignal) => apiGet<SecList<AuthUser>>('/auth/users', { page: 1, limit: 500 }, s),
  authPackages: (s?: AbortSignal) => apiGet<SecList<AuthPackage>>('/auth/packages', { page: 1, limit: 200 }, s),
  authWebConfig: (s?: AbortSignal) => apiGet<WebAuthList>('/auth/web/services', undefined, s),

  // ---- Object library (read-only) ----
  objIp: (s?: AbortSignal) => apiGet<ObjGroupResp>('/ip-objects', { page: 1, limit: 500 }, s),
  objIp6: (s?: AbortSignal) => apiGet<ObjGroupResp>('/ip6-objects', { page: 1, limit: 500 }, s),
  objMac: (s?: AbortSignal) => apiGet<ObjGroupResp>('/mac-objects', { page: 1, limit: 500 }, s),
  objDomain: (s?: AbortSignal) => apiGet<ObjGroupResp>('/domain-objects', { page: 1, limit: 500 }, s),
  objPort: (s?: AbortSignal) => apiGet<ObjGroupResp>('/port-objects', { page: 1, limit: 500 }, s),
  objProto: (s?: AbortSignal) => apiGet<ObjGroupResp>('/proto-objects', { page: 1, limit: 500 }, s),
  objTime: (s?: AbortSignal) => apiGet<ObjGroupResp>('/time-objects', { page: 1, limit: 500 }, s),

  // ---- Security rule lists ----
  aclRules: (signal?: AbortSignal) =>
    apiGet<SecList<AclRule>>('/security/acl-rules', { page: 1, limit: 200 }, signal),
  macRules: (signal?: AbortSignal) =>
    apiGet<SecList<MacRule>>('/security/mac-rules', { page: 1, limit: 200 }, signal),
  domainBlacklist: (signal?: AbortSignal) =>
    apiGet<SecList<DomainRule>>('/security/domain-blacklist/rules', { page: 1, limit: 200 }, signal),
  urlBlacklist: (signal?: AbortSignal) =>
    apiGet<SecList<UrlRule>>('/security/url-black/rules', { page: 1, limit: 200 }, signal),
  peerconnRules: (signal?: AbortSignal) =>
    apiGet<SecList<PeerconnRule>>('/security/peerconn/rules', { page: 1, limit: 200 }, signal),
  aclL7Rules: (signal?: AbortSignal) =>
    apiGet<SecList<AclL7Rule>>('/security/app-protocols/professional/rules', { page: 1, limit: 200 }, signal),
  urlKeywordRules: (signal?: AbortSignal) =>
    apiGet<SecList<UrlKeywordRule>>('/security/url-keywords/rules', { page: 1, limit: 200 }, signal),
  urlRedirectRules: (signal?: AbortSignal) =>
    apiGet<SecList<UrlRedirectRule>>('/security/url-redirect/rules', { page: 1, limit: 200 }, signal),
  urlReplaceRules: (signal?: AbortSignal) =>
    apiGet<SecList<UrlReplaceRule>>('/security/url-replace/rules', { page: 1, limit: 200 }, signal),
  securityAdvanced: (signal?: AbortSignal) =>
    apiGet<SecAdvancedList>('/security/advanced/config', undefined, signal),

  // ---- System management (read-only) ----
  sysBasic: (s?: AbortSignal) => apiGet<{ total?: number; data: SysBasicCfg[] }>('/system/basic/config', undefined, s),
  sysUpgrade: (s?: AbortSignal) => apiGet<{ data: SysUpgrade }>('/system/upgrade', undefined, s),
  adminAccounts: (s?: AbortSignal) => apiGet<{ accounts_total?: number; accounts_data: AdminAccount[] }>('/system/web-admin/accounts', { page: 1, limit: 200 }, s),
  adminGroups: (s?: AbortSignal) => apiGet<{ groups_total?: number; groups_data: AdminGroup[] }>('/system/web-admin/groups', { page: 1, limit: 200 }, s),
  rebootSchedules: (s?: AbortSignal) => apiGet<SecList<RebootSchedule>>('/system/reboot-schedules', { page: 1, limit: 200 }, s),
  sysBackup: (s?: AbortSignal) => apiGet<{ backup_info: BackupInfo[] }>('/system/backup', { page: 1, limit: 200 }, s),
  sysDisks: (s?: AbortSignal) => apiGet<{ data: DiskInfo[] }>('/system/disks', undefined, s),
  remoteAccess: (s?: AbortSignal) => apiGet<{ data: RemoteAccessCfg[] }>('/system/remote-access', undefined, s),
  vrrpConfig: (s?: AbortSignal) => apiGet<{ total?: number; data: VrrpCfg[] }>('/system/vrrp/config', undefined, s),

  cpuHistory: (p: LoadParams, signal?: AbortSignal) =>
    apiGet<{ cpu: CpuPoint[] }>('/monitoring/cpu', p as Record<string, string | number>, signal),

  memHistory: (p: LoadParams, signal?: AbortSignal) =>
    apiGet<{ memory: MemPoint[] }>('/monitoring/memory', p as Record<string, string | number>, signal),

  /** WAN/total throughput history — real time-series for the activity chart. */
  networkLoad: (p: LoadParams, signal?: AbortSignal) =>
    apiGet<{ rate_stat: NetPoint[] }>('/monitoring/network', p as Record<string, string | number>, signal),

  diskHistory: (p: LoadParams, signal?: AbortSignal) =>
    apiGet<{ disk_space_used: DiskPoint[] }>('/monitoring/disk', p as Record<string, string | number>, signal),
  terminalsHistory: (p: LoadParams, signal?: AbortSignal) =>
    apiGet<{ on_terminal: TermPoint[] }>('/monitoring/terminals', p as Record<string, string | number>, signal),
  connectionsHistory: (p: LoadParams, signal?: AbortSignal) =>
    apiGet<{ conn_num: ConnPoint[] }>('/monitoring/connections', p as Record<string, string | number>, signal),
  flowShunting: (signal?: AbortSignal) =>
    apiGet<FlowShunting>('/monitoring/flow-shunting', undefined, signal),

  // ---- AC / wireless controller ----
  acServices: (signal?: AbortSignal) =>
    apiGet<AcServices>('/network/ac/services', undefined, signal),

  wirelessScore: (signal?: AbortSignal) =>
    apiGet<WirelessScore>('/monitoring/wireless-score', undefined, signal),

  wirelessStatistics: (signal?: AbortSignal) =>
    apiGet<WirelessStatistics>('/monitoring/wireless-statistics', undefined, signal),

  apConfig: (opts: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiGet<ApConfigList>('/network/ac/ap-config', { page: opts.page ?? 1, limit: opts.limit ?? 100 }, signal),

  channelClients: (signal?: AbortSignal) =>
    apiGet<ChannelClients>('/monitoring/channel-clients', undefined, signal),

  ssidClients: (signal?: AbortSignal) =>
    apiGet<SsidClients>('/monitoring/ssid-clients', undefined, signal),
  wirelessTraffic: (signal?: AbortSignal) =>
    apiGet<WirelessTraffic>('/monitoring/wireless-traffic', undefined, signal),

  // ---- Networks extras: physical ports / NAT / forwarding / DNS / DHCP ----
  physicalPorts: (s?: AbortSignal) => apiGet<PhysicalPorts>('/interfaces/physical', undefined, s),
  natRules: (s?: AbortSignal) => apiGet<SecList<NatRule>>('/network/nat/rules', { page: 1, limit: 500 }, s),
  dnatRules: (s?: AbortSignal) => apiGet<SecList<DnatRule>>('/network/dnat/rules', { page: 1, limit: 500 }, s),
  dmzRules: (s?: AbortSignal) => apiGet<SecList<DmzRule>>('/network/dmz/rules', { page: 1, limit: 500 }, s),
  dnsConfig: (s?: AbortSignal) => apiGet<{ data: DnsConfig[] }>('/network/dns/config', undefined, s),
  dnsProxyRules: (s?: AbortSignal) => apiGet<SecList<DnsProxyRule>>('/network/dns/proxy/rules', { page: 1, limit: 500 }, s),
  multiDnsRules: (s?: AbortSignal) => apiGet<SecList<MultiDnsRule>>('/network/multi-dns/rules', { page: 1, limit: 500 }, s),
  dnsStats: (s?: AbortSignal) => apiGet<SecList<DnsStat>>('/network/dns/stats', undefined, s),
  pppoeServer: (s?: AbortSignal) => apiGet<{ data: PppoeServer[] }>('/network/pppoe/services', undefined, s),
  dhcpAccessRules: (s?: AbortSignal) => apiGet<SecList<DhcpAccessRule>>('/network/dhcp/access-control/rules', { page: 1, limit: 500 }, s),
  dhcp6Clients: (s?: AbortSignal) => apiGet<Dhcp6ClientList>('/network/dhcp6/clients', { page: 1, limit: 500 }, s),

  // ---- Routing / QoS: bandwidth limits + custom protocols ----
  qosIp: (s?: AbortSignal) => apiGet<SecList<QosRule>>('/network/qos/ip', { page: 1, limit: 500 }, s),
  qosMac: (s?: AbortSignal) => apiGet<SecList<QosRule>>('/network/qos/mac', { page: 1, limit: 500 }, s),
  customProtoRules: (s?: AbortSignal) => apiGet<SecList<CustomProtoRule>>('/network/app-protocols/custom/rules', { page: 1, limit: 500 }, s),
  advProtoRules: (s?: AbortSignal) => apiGet<SecList<AdvProtoRule>>('/network/app-protocols/advanced/rules', { page: 1, limit: 500 }, s),

  // ---- Advanced service: FTP / Samba / SNMP / HTTP servers ----
  ftpConfig: (s?: AbortSignal) => apiGet<FtpConfig>('/advanced-service/ftp-config', undefined, s),
  ftpUsers: (s?: AbortSignal) => apiGet<SecList<FtpUser>>('/advanced-service/ftp-users', { page: 1, limit: 200 }, s),
  sambaConfig: (s?: AbortSignal) => apiGet<{ data: SambaConfig[] }>('/advanced-service/samba-config', undefined, s),
  sambaUsers: (s?: AbortSignal) => apiGet<SambaUserList>('/advanced-service/samba-users', { page: 1, limit: 200 }, s),
  snmpdConfig: (s?: AbortSignal) => apiGet<{ data: SnmpdConfig[] }>('/advanced-service/snmpd-config', undefined, s),
  httpUsers: (s?: AbortSignal) => apiGet<SecList<HttpUser>>('/advanced-service/http-users', { page: 1, limit: 200 }, s),

  // ---- Security extras ----
  secTerminals: (s?: AbortSignal) => apiGet<SecList<SecTerminal>>('/security/terminals', { page: 1, limit: 500 }, s),
  secondaryRoute: (s?: AbortSignal) => apiGet<SecList<SecondaryRoute>>('/security/secondary-route/config', undefined, s),
  macMode: (s?: AbortSignal) => apiGet<MacMode>('/security/mac-mode', undefined, s),
  wirelessAclRules: (s?: AbortSignal) => apiGet<SecList<WirelessAclRule>>('/wireless/access-control/rules', { page: 1, limit: 500 }, s),
  wirelessVlanRules: (s?: AbortSignal) => apiGet<SecList<WirelessVlanRule>>('/wireless/vlan/rules', { page: 1, limit: 500 }, s),

  // ---- System extras ----
  sysAlg: (s?: AbortSignal) => apiGet<{ data: AlgConfig[] }>('/system/alg', undefined, s),
  sysBackupAuto: (s?: AbortSignal) => apiGet<{ data: BackupAuto[] }>('/system/backup-auto', undefined, s),
  sysCpuFreq: (s?: AbortSignal) => apiGet<CpuFreqMode>('/system/cpufreq/mode', undefined, s),
  sysFiles: (s?: AbortSignal) => apiGet<{ data: SysFile[] }>('/system/files', { path: '/' }, s),
  sysKernel: (s?: AbortSignal) => apiGet<{ data: KernelParams[] }>('/system/kernel-params', undefined, s),

  // ---- Monitoring extras: behaviour audit + protocol ranking ----
  auditTerminals: (s?: AbortSignal) => apiGet<AuditTerminals>('/monitoring/traffic-audit/terminals', undefined, s),
  auditAccounts: (s?: AbortSignal) => apiGet<AuditAccounts>('/monitoring/traffic-audit/accounts', undefined, s),
  protocols: (s?: AbortSignal) => apiGet<ProtocolStats>('/monitoring/protocols', undefined, s),

  // ---- WAN multi-dial / IPv6 / cameras / temperature (read-only) ----
  wanVlanConfig: (s?: AbortSignal) => apiGet<WanVlanList>('/interfaces/wan-vlan-config', undefined, s),
  ifaceTrafficV6: (s?: AbortSignal) => apiGet<SecList<IfaceV6>>('/monitoring/interfaces-traffic-v6', undefined, s),
  dhcp6AccessRules: (s?: AbortSignal) => apiGet<SecList<Dhcp6AccessRule>>('/network/dhcp6/access-control/rules', { page: 1, limit: 500 }, s),
  dhcp6AccessMode: (s?: AbortSignal) => apiGet<{ mode: number }>('/network/dhcp6/access-control/mode', undefined, s),
  clientsIp6Online: (s?: AbortSignal) => apiGet<{ total?: number; data: ClientIp6Online[] }>('/monitoring/clients-ip6-online', { page: 1, limit: 500 }, s),
  clientsIp6Offline: (s?: AbortSignal) => apiGet<{ total?: number; offline_data: ClientIp6Offline[] }>('/monitoring/clients-ip6-offline', { page: 1, limit: 500 }, s),
  cameras: (s?: AbortSignal) => apiGet<SecList<Camera>>('/monitoring/cameras', { page: 1, limit: 200 }, s),
  cpuTemp: (s?: AbortSignal) => apiGet<{ cputemp1: CpuTempPoint[] }>('/monitoring/cputemp', undefined, s),

  // ---- Generic single-item (/{id}) + object reference (/ref) lookups ----
  /** Fetch one record: byId('/security/acl-rules', 12) → GET /security/acl-rules/12. Covers all 53 /{id} GETs. */
  byId: (basePath: string, id: number | string, s?: AbortSignal) => apiGet<unknown>(`${basePath}/${id}`, undefined, s),
  /** Which rules reference an object group: objRef('ip', 3) → GET /ip-objects/ref?id=3. */
  objRef: (kind: 'ip' | 'ip6' | 'mac' | 'domain' | 'port' | 'proto' | 'time', id?: number | string, s?: AbortSignal) =>
    apiGet<ObjRefResult>(`/${kind}-objects/ref`, id != null ? { id } : undefined, s),
}
