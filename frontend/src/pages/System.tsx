import { useState } from 'react'
import { ikuai } from '../lib/api'
import type {
  AdminAccount, AdminGroup, RebootSchedule, BackupInfo, DiskInfo, RemoteAccessCfg, VrrpCfg, SysFile,
} from '../lib/api'
import { usePoll } from '../lib/usePoll'
import {
  mockSysBasic, mockSysUpgrade, mockAdminAccounts, mockAdminGroups, mockRebootSchedules,
  mockSysBackup, mockSysDisks, mockRemoteAccess, mockVrrpConfig,
  mockSysAlg, mockSysBackupAuto, mockSysCpuFreq, mockSysFiles, mockSysKernel, mockCpuTemp,
} from '../lib/mock'
import { fmtBytes, fmtUptime, fmtDateTime } from '../lib/format'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcSettings, IcInfo, IcReports } from '../components/icons'

type Cat = 'info' | 'admins' | 'groups' | 'reboot' | 'backup' | 'bauto' | 'disks' | 'files' | 'remote' | 'vrrp' | 'alg' | 'cpufreq' | 'cputemp' | 'kernel'
const CATS: { key: Cat; label: string; src: string; group: string }[] = [
  { key: 'info', label: '系统信息', src: 'system/basic/config + upgrade', group: '系统' },
  { key: 'admins', label: '管理员账号', src: 'system/web-admin/accounts', group: '系统' },
  { key: 'groups', label: '管理员分组', src: 'system/web-admin/groups', group: '系统' },
  { key: 'reboot', label: '定时重启', src: 'system/reboot-schedules', group: '维护与备份' },
  { key: 'backup', label: '备份记录', src: 'system/backup', group: '维护与备份' },
  { key: 'bauto', label: '自动备份', src: 'system/backup-auto', group: '维护与备份' },
  { key: 'files', label: '文件管理', src: 'system/files', group: '维护与备份' },
  { key: 'disks', label: '磁盘', src: 'system/disks', group: '维护与备份' },
  { key: 'remote', label: '远程访问', src: 'system/remote-access', group: '性能与服务' },
  { key: 'vrrp', label: 'VRRP 热备', src: 'system/vrrp/config', group: '性能与服务' },
  { key: 'alg', label: 'ALG', src: 'system/alg', group: '性能与服务' },
  { key: 'cpufreq', label: 'CPU 性能', src: 'system/cpufreq/mode', group: '性能与服务' },
  { key: 'cputemp', label: 'CPU 温度', src: 'monitoring/cputemp', group: '性能与服务' },
  { key: 'kernel', label: '内核参数', src: 'system/kernel-params', group: '性能与服务' },
]
const GROUPS = [...new Set(CATS.map((c) => c.group))]
const enabled = (e?: string) => e !== 'no' && e !== '0' && e !== 'off'
const OnPill = ({ on, on1 = '开启', off1 = '关闭' }: { on: boolean; on1?: string; off1?: string }) => <span className={`pill ${on ? 'green' : 'gray'}`}><span className="pdot" />{on ? on1 : off1}</span>

interface KV { k: string; v: string; hi?: boolean; on?: boolean | null }
interface RemoteRow { name: string; detail: string; on: boolean | null }

export function System() {
  const basic = usePoll(ikuai.sysBasic, mockSysBasic, 60000)
  const upg = usePoll(ikuai.sysUpgrade, mockSysUpgrade, 60000)
  const accounts = usePoll(ikuai.adminAccounts, mockAdminAccounts, 60000)
  const groups = usePoll(ikuai.adminGroups, mockAdminGroups, 60000)
  const reboot = usePoll(ikuai.rebootSchedules, mockRebootSchedules, 60000)
  const backup = usePoll(ikuai.sysBackup, mockSysBackup, 60000)
  const disks = usePoll(ikuai.sysDisks, mockSysDisks, 60000)
  const remote = usePoll(ikuai.remoteAccess, mockRemoteAccess, 60000)
  const vrrp = usePoll(ikuai.vrrpConfig, mockVrrpConfig, 60000)
  const bauto = usePoll(ikuai.sysBackupAuto, mockSysBackupAuto, 60000)
  const files = usePoll(ikuai.sysFiles, mockSysFiles, 30000)
  const alg = usePoll(ikuai.sysAlg, mockSysAlg, 60000)
  const cpufreq = usePoll(ikuai.sysCpuFreq, mockSysCpuFreq, 30000)
  const kernel = usePoll(ikuai.sysKernel, mockSysKernel, 60000)
  const ctemp = usePoll(ikuai.cpuTemp, mockCpuTemp, 15000)

  const [cat, setCat] = useState<Cat>('info')
  const [q, setQ] = useState('')

  const bc = basic.data?.data?.[0]
  const up = upg.data?.data
  const newer = up?.new_system_ver && up.new_system_ver !== up.system_ver
  // device returns compact strings: tz "0800", build "202605191449"
  const tz = (() => { const t = bc?.time_zone_full || ''; return /^\d{3,4}$/.test(t) ? `GMT+${t.padStart(4, '0').slice(0, 2)}:${t.slice(-2)}` : t || '—' })()
  const build = (() => { const b = up?.build_date || ''; const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(b); return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : (b || '—') })()
  const infoRows: KV[] = [
    { k: '主机名', v: bc?.hostname || '—' },
    { k: '系统版本', v: [up?.system_ver, up?.version_type].filter(Boolean).join(' · ') || '—' },
    { k: '编译日期', v: build },
    { k: '协议库', v: up?.libproto_ver || '—' },
    { k: '应用审计库', v: up?.libaudit_ver || '—' },
    { k: '域名库', v: up?.libdomain_ver || '—' },
    { k: '时区', v: tz },
    { k: 'NTP 同步', v: bc?.switch_ntp ? `已开启 · ${bc?.ntpserver_list || ''}` : '关闭' },
    { k: '版本状态', v: newer ? `发现新版本 ${up?.new_system_ver}` : '已是最新版本', hi: !!newer },
  ]

  const rc = remote.data?.data?.[0]
  const remoteRows: RemoteRow[] = rc ? [
    { name: 'SSH 访问', on: !!rc.open_sshd, detail: `端口 ${rc.sshd_port}` },
    { name: 'Telnet 访问', on: !!rc.open_telnetd, detail: '' },
    { name: '外网 Web 管理', on: !!rc.open_wanweb, detail: '' },
    { name: 'FTP 访问', on: !!rc.open_ftp, detail: `端口 ${rc.ftp_port}` },
    { name: '强制 HTTPS', on: !!rc.force_https, detail: '' },
    { name: 'HTTP 端口', on: null, detail: String(rc.http_port) },
    { name: 'HTTPS 端口', on: null, detail: String(rc.https_port) },
  ] : []

  // ---- single-config categories → settings rows ----
  const ag = alg.data?.data?.[0]
  const algRows: KV[] = ag ? [
    { k: 'FTP ALG', v: ag.ftp_ports ? `端口 ${ag.ftp_ports}` : '', on: !!Number(ag.support_ftp) },
    { k: 'TFTP ALG', v: ag.tftp_ports ? `端口 ${ag.tftp_ports}` : '', on: !!Number(ag.support_tftp) },
    { k: 'SIP ALG', v: ag.sip_ports ? `端口 ${ag.sip_ports}` : '', on: !!Number(ag.support_sip) },
    { k: 'H.323 ALG', v: '', on: !!Number(ag.support_h323) },
  ] : []
  const ba = bauto.data?.data?.[0]
  const baRows: KV[] = ba ? [
    { k: '自动备份', v: '', on: enabled(ba.enabled) },
    { k: '备份周期', v: [ba.strategy, ba.cycle_time].filter(Boolean).join(' · ') || '—' },
    { k: '备份时间', v: ba.time || '—' },
    { k: '保留天数', v: ba.valid_days ? `${ba.valid_days} 天` : '—' },
  ] : []
  const cf = cpufreq.data
  const cfRows: KV[] = cf ? [
    { k: '变频支持', v: '', on: !!cf.cpufreq_support },
    { k: '当前模式', v: cf.current_cpufreq || '—' },
    { k: '睿频加速', v: '', on: !!cf.current_turbo },
    { k: '可选模式', v: (cf.cpufreq_list ?? []).join(', ') || '—' },
  ] : []
  const kp = kernel.data?.data?.[0]
  const kpRows: KV[] = kp ? [
    { k: 'BBR 拥塞控制', v: '', on: !!Number(kp.bbr) },
    { k: 'TCP 连接超时', v: kp.established_timeout ? `${kp.established_timeout} 秒` : '—' },
    { k: 'TCP TIME_WAIT', v: kp.time_wait_timeout ? `${kp.time_wait_timeout} 秒` : '—' },
    { k: 'TCP FIN_WAIT', v: kp.fin_wait_timeout ? `${kp.fin_wait_timeout} 秒` : '—' },
    { k: 'UDP 超时', v: kp.udp_timeout ? `${kp.udp_timeout} 秒` : '—' },
    { k: 'UDP 流超时', v: kp.udp_stream_timeout ? `${kp.udp_stream_timeout} 秒` : '—' },
    { k: 'ICMP 超时', v: kp.icmp_timeout ? `${kp.icmp_timeout} 秒` : '—' },
  ] : []

  const temps = (ctemp.data?.cputemp1 ?? []).map((p) => p.cputemp1).filter((n) => Number.isFinite(n))
  const tempRows: KV[] = temps.length ? [
    { k: '当前温度', v: `${temps[temps.length - 1]} °C`, hi: temps[temps.length - 1] >= 80 },
    { k: '最高温度', v: `${Math.max(...temps)} °C` },
    { k: '最低温度', v: `${Math.min(...temps)} °C` },
    { k: '平均温度', v: `${Math.round(temps.reduce((a, b) => a + b, 0) / temps.length)} °C` },
    { k: '采样点数', v: `${temps.length} (近 ${temps.length} 次)` },
  ] : []

  const groupName = (id: number) => (id === 0 ? '超级管理员' : groups.data?.groups_data?.find((g) => g.id === id)?.group_name || `组 ${id}`)
  const counts: Record<Cat, number> = {
    info: infoRows.length, admins: accounts.data?.accounts_total ?? accounts.data?.accounts_data?.length ?? 0,
    groups: groups.data?.groups_total ?? groups.data?.groups_data?.length ?? 0,
    reboot: reboot.data?.total ?? reboot.data?.data?.length ?? 0,
    backup: backup.data?.backup_info?.length ?? 0, disks: disks.data?.data?.length ?? 0,
    remote: remoteRows.length, vrrp: vrrp.data?.total ?? vrrp.data?.data?.length ?? 0,
    bauto: baRows.length, files: files.data?.data?.length ?? 0,
    alg: algRows.length, cpufreq: cfRows.length, kernel: kpRows.length, cputemp: tempRows.length,
  }
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())

  const kvCols: Column<KV>[] = [
    { key: 'k', label: '项目', width: 180, render: (r) => <span className="muted">{r.k}</span> },
    { key: 'v', label: '值', render: (r) => (
      <span className="num" style={r.hi ? { color: 'var(--orange)', fontWeight: 700 } : undefined}>
        {r.on != null && <OnPill on={r.on} on1="已开启" off1="未开启" />}
        {r.on != null && r.v ? ' ' : ''}{r.v}
      </span>
    ) },
  ]
  const fileCols: Column<SysFile>[] = [
    { key: 'name', label: '名称', sort: (r) => r.f_name, render: (r) => <div className="dev"><span className="thumb"><IcReports /></span><div className="nm">{r.f_name}</div></div> },
    { key: 'type', label: '类型', render: (r) => <span className="pill gray">{String(r.st_type) === 'dir' || r.st_type === 2 ? '目录' : '文件'}</span> },
    { key: 'size', label: '大小', align: 'right', sort: (r) => r.st_size ?? 0, render: (r) => <span className="num">{fmtBytes(r.st_size ?? 0)}</span> },
    { key: 'time', label: '修改时间', align: 'right', sort: (r) => r.st_mtime ?? 0, render: (r) => <span className="num muted">{fmtDateTime(r.st_mtime ?? 0)}</span> },
  ]
  const remoteCols: Column<RemoteRow>[] = [
    { key: 'name', label: '项目', render: (r) => <div className="dev"><span className="thumb"><IcSettings /></span><div className="nm">{r.name}</div></div> },
    { key: 'detail', label: '参数', render: (r) => <span className="num muted">{r.detail || '—'}</span> },
    { key: 'st', label: '状态', render: (r) => r.on == null ? <span className="muted">—</span> : <OnPill on={r.on} /> },
  ]
  const adminCols: Column<AdminAccount>[] = [
    { key: 'name', label: '账号', sort: (r) => r.username, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcSettings /></span><div><div className="nm">{r.username}</div><div className="mt">{r.comment || '—'}</div></div></div> },
    { key: 'group', label: '分组', render: (r) => <span className="pill gray">{groupName(r.group_id)}</span> },
    { key: 'sess', label: '会话超时', align: 'right', sort: (r) => r.sesstimeout, render: (r) => <span className="num">{r.sesstimeout ? fmtUptime(r.sesstimeout) : '—'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <OnPill on={enabled(r.enabled)} on1="启用" off1="停用" /> },
  ]
  const groupCols: Column<AdminGroup>[] = [
    { key: 'name', label: '组名', sort: (r) => r.group_name, render: (r) => <div className="dev"><span className="thumb"><IcSettings /></span><div className="nm">{r.group_name}</div></div> },
    { key: 'perm', label: '权限', render: (r) => (r.perm_config || '').split(',').filter(Boolean).map((p, i) => <span className="pill gray" key={i} style={{ marginRight: 4 }}>{p}</span>) },
    { key: 'ip', label: '管理地址', render: (r) => <span className="num">{r.ip_addr || '不限'}</span> },
  ]
  const rebootCols: Column<RebootSchedule>[] = [
    { key: 'name', label: '名称', sort: (r) => r.tagname, render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcSettings /></span><div><div className="nm">{r.tagname || `计划 ${r.id}`}</div><div className="mt">{r.comment || '—'}</div></div></div> },
    { key: 'cycle', label: '周期', render: (r) => <span className="num">{[r.strategy, r.cycle_time, r.time].filter(Boolean).join(' · ')}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <OnPill on={enabled(r.enabled)} on1="启用" off1="停用" /> },
  ]
  const backupCols: Column<BackupInfo>[] = [
    { key: 'name', label: '文件名', sort: (r) => r.filename, render: (r) => <div className="dev"><span className="thumb"><IcSettings /></span><div className="nm">{r.filename}</div></div> },
    { key: 'type', label: '类型', render: (r) => <span className="pill gray">{r.backtype === 2 ? '自动' : '手动'}</span> },
    { key: 'ver', label: '版本', render: (r) => <span className="num">{r.version || '—'}</span> },
    { key: 'size', label: '大小', align: 'right', sort: (r) => r.filesize, render: (r) => <span className="num">{fmtBytes(r.filesize || 0)}</span> },
    { key: 'time', label: '时间', align: 'right', sort: (r) => r.timestamp, render: (r) => <span className="num muted">{fmtDateTime(r.timestamp)}</span> },
  ]
  const diskCols: Column<DiskInfo>[] = [
    { key: 'name', label: '磁盘', sort: (r) => r.disk, render: (r) => <div className="dev"><span className="thumb"><IcSettings /></span><div><div className="nm">{r.disk || r.model}</div><div className="mt">{r.model || r.type}</div></div></div> },
    { key: 'type', label: '类型', render: (r) => <span className="pill gray">{r.type || '—'}</span> },
    { key: 'size', label: '容量', align: 'right', sort: (r) => r.size, render: (r) => <span className="num">{fmtBytes(r.size || 0)}</span> },
    { key: 'part', label: '分区', render: (r) => <span className="num muted">{(r.partition ?? []).map((p) => `${p.mounted || p.name}(${p.filesys})`).join(', ') || '—'}</span> },
  ]
  const vrrpCols: Column<VrrpCfg>[] = [
    { key: 'role', label: '角色', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcSettings /></span><div className="nm">{r.type === 1 ? '备机' : '主机'}</div></div> },
    { key: 'prio', label: '优先级', align: 'right', render: (r) => <span className="num">{r.prio}</span> },
    { key: 'vip', label: '虚拟 IP', render: (r) => <span className="num">{r.virtual_ips || '—'}</span> },
    { key: 'if', label: '接口', render: (r) => <span className="num">{r.interfaces || r.ifnames || '—'}</span> },
    { key: 'peer', label: '对端', render: (r) => <span className="num muted">{r.remote_addr || '—'}</span> },
    { key: 'st', label: '状态', render: (r) => <OnPill on={enabled(r.enabled)} on1="已启用" off1="未启用" /> },
  ]

  const table = () => {
    switch (cat) {
      case 'info': return <DataTable rows={infoRows.filter((r) => match(`${r.k} ${r.v}`))} columns={kvCols} rowKey={(r) => r.k} empty="无系统信息" />
      case 'admins': return <DataTable rows={(accounts.data?.accounts_data ?? []).filter((r) => match(`${r.username} ${r.comment}`))} columns={adminCols} rowKey={(r) => r.id} defaultSort="name" empty="无管理员账号" />
      case 'groups': return <DataTable rows={(groups.data?.groups_data ?? []).filter((r) => match(`${r.group_name} ${r.perm_config}`))} columns={groupCols} rowKey={(r) => r.id} defaultSort="name" empty="无管理员分组" />
      case 'reboot': return <DataTable rows={(reboot.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.comment}`))} columns={rebootCols} rowKey={(r) => r.id} defaultSort="name" empty="无定时重启计划" />
      case 'backup': return <DataTable rows={(backup.data?.backup_info ?? []).filter((r) => match(r.filename))} columns={backupCols} rowKey={(r) => r.id} defaultSort="time" defaultDir="desc" empty="无备份记录" />
      case 'disks': return <DataTable rows={(disks.data?.data ?? []).filter((r) => match(`${r.disk} ${r.model}`))} columns={diskCols} rowKey={(r) => r.disk || r.model} defaultSort="name" empty="无磁盘信息" />
      case 'remote': return <DataTable rows={remoteRows.filter((r) => match(r.name))} columns={remoteCols} rowKey={(r) => r.name} empty="无远程访问配置" />
      case 'vrrp': return <DataTable rows={(vrrp.data?.data ?? []).filter((r) => match(`${r.virtual_ips} ${r.interfaces}`))} columns={vrrpCols} rowKey={(r, ) => r.virtual_ips || r.interfaces || 'vrrp'} defaultSort="role" empty="未配置 VRRP 热备" />
      case 'bauto': return <DataTable rows={baRows.filter((r) => match(`${r.k} ${r.v}`))} columns={kvCols} rowKey={(r) => r.k} empty="无自动备份配置" />
      case 'files': return <DataTable rows={(files.data?.data ?? []).filter((r) => match(r.f_name))} columns={fileCols} rowKey={(r) => r.f_name} defaultSort="name" empty="无文件" />
      case 'alg': return <DataTable rows={algRows.filter((r) => match(`${r.k} ${r.v}`))} columns={kvCols} rowKey={(r) => r.k} empty="无 ALG 配置" />
      case 'cpufreq': return <DataTable rows={cfRows.filter((r) => match(`${r.k} ${r.v}`))} columns={kvCols} rowKey={(r) => r.k} empty="无 CPU 性能配置" />
      case 'cputemp': return <DataTable rows={tempRows.filter((r) => match(`${r.k} ${r.v}`))} columns={kvCols} rowKey={(r) => r.k} empty="无温度数据" />
      case 'kernel': return <DataTable rows={kpRows.filter((r) => match(`${r.k} ${r.v}`))} columns={kvCols} rowKey={(r) => r.k} empty="无内核参数" />
    }
  }

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
                  <span className="fb-ic"><IcSettings /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="fb-note"><IcInfo style={{ width: 13, height: 13, verticalAlign: '-2px', marginRight: 4 }} />系统管理为只读总览;重启、升级、备份恢复等写操作未开放。</div>
        <button className="fb-clear" onClick={() => setQ('')}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">系统 · {cur.label}</div><div className="lc">{counts[cat]} 项</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
