import { useState } from 'react'
import { ikuai } from '../lib/api'
import type { FtpUser, SambaUser, HttpUser } from '../lib/api'
import { usePoll } from '../lib/usePoll'
import {
  mockFtpConfig, mockFtpUsers, mockSambaConfig, mockSambaUsers, mockSnmpdConfig, mockHttpUsers,
} from '../lib/mock'
import { DataTable, type Column } from '../components/DataTable'
import { IcSearch, IcService, IcInfo } from '../components/icons'

type Cat = 'ftp' | 'ftpusers' | 'samba' | 'sambausers' | 'snmp' | 'http'
const CATS: { key: Cat; label: string; src: string }[] = [
  { key: 'ftp', label: 'FTP 服务', src: 'advanced-service/ftp-config' },
  { key: 'ftpusers', label: 'FTP 用户', src: 'advanced-service/ftp-users' },
  { key: 'samba', label: 'Samba 服务', src: 'advanced-service/samba-config' },
  { key: 'sambausers', label: 'Samba 共享', src: 'advanced-service/samba-users' },
  { key: 'snmp', label: 'SNMP', src: 'advanced-service/snmpd-config' },
  { key: 'http', label: 'HTTP 服务', src: 'advanced-service/http-users' },
]
const enabled = (e?: string | number) => e !== undefined && e !== 'no' && e !== '0' && e !== 0 && e !== 'off'
const Status = ({ on, on1 = '启用', off1 = '停用' }: { on: boolean; on1?: string; off1?: string }) => <span className={`pill ${on ? 'green' : 'gray'}`}><span className="pdot" />{on ? on1 : off1}</span>
const speed = (kbs?: number | string) => { const n = Number(kbs); if (!n) return '不限'; return n >= 1024 ? `${(n / 1024).toFixed(0)} MB/s` : `${n} KB/s` }

interface KV { k: string; v: string; on?: boolean | null }

export function Services() {
  const ftp = usePoll(ikuai.ftpConfig, mockFtpConfig, 60000)
  const ftpu = usePoll(ikuai.ftpUsers, mockFtpUsers, 60000)
  const samba = usePoll(ikuai.sambaConfig, mockSambaConfig, 60000)
  const sambau = usePoll(ikuai.sambaUsers, mockSambaUsers, 60000)
  const snmp = usePoll(ikuai.snmpdConfig, mockSnmpdConfig, 60000)
  const http = usePoll(ikuai.httpUsers, mockHttpUsers, 60000)

  const [cat, setCat] = useState<Cat>('ftp')
  const [q, setQ] = useState('')

  const fc = ftp.data
  const ftpRows: KV[] = fc ? [
    { k: 'FTP 服务', v: '', on: !!fc.open_ftp },
    { k: '监听端口', v: String(fc.ftp_port ?? '—') },
    { k: '外网访问', v: '', on: !!fc.ftp_access },
  ] : []
  const sc = samba.data?.data?.[0]
  const sambaRows: KV[] = sc ? [
    { k: 'Samba 服务', v: '', on: enabled(sc.enabled) },
    { k: '工作组', v: sc.workgroup || '—' },
    { k: 'WSDD2 发现', v: '', on: !!Number(sc.wsdd2) },
    { k: '监听接口', v: sc.interface || '—' },
    { k: '访问控制', v: sc.access || '—' },
  ] : []
  const np = snmp.data?.data?.[0]
  const snmpRows: KV[] = np ? [
    { k: 'SNMP 服务', v: '', on: enabled(np.enabled) },
    { k: '监听端口', v: String(np.listen_port ?? '—') },
    { k: '版本', v: np.version || '—' },
    { k: 'Community', v: np.community || '—' },
    { k: '权限', v: String(np.rw ?? '—') },
    { k: '允许来源', v: np.source || '不限' },
    { k: '位置', v: np.syslocation || '—' },
    { k: '联系人', v: np.syscontact || '—' },
  ] : []

  const counts: Record<Cat, number> = {
    ftp: ftpRows.length,
    ftpusers: ftpu.data?.total ?? ftpu.data?.data?.length ?? 0,
    samba: sambaRows.length,
    sambausers: sambau.data?.dir_total ?? sambau.data?.dir_data?.length ?? 0,
    snmp: snmpRows.length,
    http: http.data?.total ?? http.data?.data?.length ?? 0,
  }
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())

  const kvCols: Column<KV>[] = [
    { key: 'k', label: '项目', width: 200, render: (r) => <div className="dev"><span className="thumb"><IcService /></span><div className="nm">{r.k}</div></div> },
    { key: 'v', label: '值 / 状态', render: (r) => r.on != null ? <Status on={r.on} on1="已开启" off1="未开启" /> : <span className="num">{r.v}</span> },
  ]
  const ftpUserCols: Column<FtpUser>[] = [
    { key: 'name', label: '用户名', sort: (r) => r.username || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcService /></span><div><div className="nm">{r.username || `用户 ${r.id}`}</div><div className="mt">{r.tagname || '—'}</div></div></div> },
    { key: 'perm', label: '权限', render: (r) => <span className="pill gray">{r.permission || '—'}</span> },
    { key: 'dir', label: '目录', render: (r) => <span className="num">{r.home_dir || '/'}</span> },
    { key: 'dl', label: '下载限速', align: 'right', render: (r) => <span className="num">{speed(r.download)}</span> },
    { key: 'ul', label: '上传限速', align: 'right', render: (r) => <span className="num muted">{speed(r.upload)}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status on={enabled(r.enabled)} /> },
  ]
  const sambaUserCols: Column<SambaUser>[] = [
    { key: 'name', label: '共享', sort: (r) => r.name || r.username || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcService /></span><div><div className="nm">{r.name || r.tagname || r.username}</div><div className="mt">{r.username || '—'}</div></div></div> },
    { key: 'perm', label: '权限', render: (r) => <span className="pill gray">{r.perm || '—'}</span> },
    { key: 'dir', label: '共享目录', render: (r) => <span className="num">{r.home_dir || '/'}</span> },
    { key: 'guest', label: '匿名', render: (r) => <span className="muted">{Number(r.guest) ? '允许' : '禁止'}</span> },
    { key: 'browse', label: '可见', render: (r) => <span className="muted">{Number(r.browseable) ? '是' : '否'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status on={enabled(r.enabled)} /> },
  ]
  const httpCols: Column<HttpUser>[] = [
    { key: 'name', label: '站点', sort: (r) => r.server_name || r.tagname || '', render: (r) => <div className="dev"><span className={`sdot2 ${enabled(r.enabled) ? 'on' : 'off'}`} /><span className="thumb"><IcService /></span><div><div className="nm">{r.tagname || r.server_name || `站点 ${r.id}`}</div><div className="mt">{r.server_name || '—'}</div></div></div> },
    { key: 'port', label: '端口', render: (r) => <span className="num">{r.http_port ?? '—'}</span> },
    { key: 'ssl', label: 'HTTPS', render: (r) => <span className="muted">{Number(r.ssl_on) ? '是' : '否'}</span> },
    { key: 'idx', label: '目录索引', render: (r) => <span className="muted">{Number(r.autoindex) ? '开' : '关'}</span> },
    { key: 'dir', label: '根目录', render: (r) => <span className="num">{r.home_dir || '/'}</span> },
    { key: 'st', label: '状态', sort: (r) => (enabled(r.enabled) ? 1 : 0), render: (r) => <Status on={enabled(r.enabled)} /> },
  ]

  const table = () => {
    switch (cat) {
      case 'ftp': return <DataTable rows={ftpRows.filter((r) => match(r.k))} columns={kvCols} rowKey={(r) => r.k} empty="无 FTP 配置" />
      case 'ftpusers': return <DataTable rows={(ftpu.data?.data ?? []).filter((r) => match(`${r.username} ${r.tagname}`))} columns={ftpUserCols} rowKey={(r) => r.id} defaultSort="name" empty="无 FTP 用户" />
      case 'samba': return <DataTable rows={sambaRows.filter((r) => match(r.k))} columns={kvCols} rowKey={(r) => r.k} empty="无 Samba 配置" />
      case 'sambausers': return <DataTable rows={(sambau.data?.dir_data ?? []).filter((r) => match(`${r.name} ${r.username} ${r.home_dir}`))} columns={sambaUserCols} rowKey={(r) => r.id} defaultSort="name" empty="无 Samba 共享" />
      case 'snmp': return <DataTable rows={snmpRows.filter((r) => match(r.k))} columns={kvCols} rowKey={(r) => r.k} empty="无 SNMP 配置" />
      case 'http': return <DataTable rows={(http.data?.data ?? []).filter((r) => match(`${r.tagname} ${r.server_name}`))} columns={httpCols} rowKey={(r) => r.id} defaultSort="name" empty="无 HTTP 服务" />
    }
  }

  const cur = CATS.find((c) => c.key === cat)!
  return (
    <>
      <aside className="filterbar">
        <div className="fb-search"><IcSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索…" /></div>
        <div className="fb-sec">
          <div className="fb-cap">应用服务</div>
          {CATS.map((c) => (
            <button key={c.key} className={`fb-item ${cat === c.key ? 'active' : ''}`} onClick={() => setCat(c.key)}>
              <span className="fb-ic"><IcService /></span><span className="fl">{c.label}</span><span className="fc">{counts[c.key]}</span>
            </button>
          ))}
        </div>
        <div className="fb-note"><IcInfo style={{ width: 13, height: 13, verticalAlign: '-2px', marginRight: 4 }} />应用服务为只读总览;启停与账号管理等写操作未开放。</div>
        <button className="fb-clear" onClick={() => setQ('')}>清除筛选条件</button>
      </aside>

      <main className="umain listmain">
        <div className="list-head"><div className="lt">服务 · {cur.label}</div><div className="lc">{counts[cat]} 项</div></div>
        <div className="mcard" style={{ overflow: 'hidden' }}>{table()}</div>
        <div className="foot">数据来源:{cur.src}(只读)</div>
      </main>
    </>
  )
}
