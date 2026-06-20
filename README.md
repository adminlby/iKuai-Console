# iKuai Console

UniFi Network「Site Overview」风格的爱快(iKuai)控制台。仓库分为两个独立工程:

```
frontend/   Vite + React + TypeScript,轮询爱快 v4.0 REST API
backend/    Node.js ISP 连通性探测服务,数据存 MySQL
openapi/    爱快 v4.0 规范(98 份,字段依据)
```

前后端各自有独立的 `package.json` 与 `.env`,可分别安装、运行、部署。

> ⚠️ **关于定位:为了防止不必要的问题,当前版本设置为「只读看板」** —— 所有页面只做数据展示(监控、统计、状态总览),**不提供任何写入/修改设备配置的操作**。
> 后续会逐步加入可写功能,请留意后续更新。

## 运行截图

> 截图取自真机(爱快 4.0.222),界面为 UniFi Network 风格,支持浅色 / 深色主题,右上角 `LIVE` 表示实时轮询中。

### 总览与拓扑

<table>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_125848_643.png" alt="总览"><br><sub><b>总览</b> · 全网健康度 / WiFi / 互联网流量 / ISP 延迟 / AP 负载</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_125914_252.png" alt="拓扑"><br><sub><b>拓扑</b> · 网络拓扑图 + 线路实时监控</sub></td>
</tr>
</table>

### 设备与客户端

<table>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_125923_962.png" alt="设备"><br><sub><b>设备</b> · 网关 / 周边设备列表与状态</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130001_601.png" alt="客户端"><br><sub><b>客户端</b> · 在线终端、接口、实时上下行</sub></td>
</tr>
</table>

### 网络

<table>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130016_914.png" alt="物理网口"><br><sub><b>物理网口</b> · 网口连接 / 速率 / 双工</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130023_093.png" alt="接口"><br><sub><b>接口</b> · WAN / LAN 配置总览</sub></td>
</tr>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130032_399.png" alt="DHCP 策略"><br><sub><b>DHCP 策略</b> · 地址池 / 网关 / DNS / 租期</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130044_030.png" alt="静态分配"><br><sub><b>静态分配</b> · IP-MAC 绑定</sub></td>
</tr>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130059_900.png" alt="DHCP 租约"><br><sub><b>DHCP 租约</b> · 当前已分配地址</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130141_611.png" alt="DNS 设置"><br><sub><b>DNS 设置</b> · 代理 / 缓存 / 防护状态</sub></td>
</tr>
</table>

### 路由 · VPN · 认证 · 对象

<table>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130224_498.png" alt="负载分流"><br><sub><b>路由</b> · 负载分流 / 域名分流 / QoS / 静态路由</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130229_415.png" alt="VPN"><br><sub><b>VPN</b> · WireGuard / IPSec / OpenVPN / L2TP 等</sub></td>
</tr>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130233_674.png" alt="认证"><br><sub><b>认证</b> · 在线认证用户 / 账号 / 套餐 / WEB 认证</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130237_897.png" alt="对象库"><br><sub><b>对象库</b> · IP / MAC / 域名 / 端口 / 时间对象</sub></td>
</tr>
</table>

### 洞察(Insights)

<table>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130247_857.png" alt="流量"><br><sub><b>流量</b> · 应用 / 终端流量 TOP 排行</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130252_815.png" alt="射频"><br><sub><b>射频</b> · AP 射频 / 信道在用终端统计</sub></td>
</tr>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130258_259.png" alt="负载"><br><sub><b>负载</b> · 性能 / 网络 / 在线终端 / 收发包趋势</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130312_177.png" alt="审计"><br><sub><b>审计</b> · 行为审计、协议占比与终端排行</sub></td>
</tr>
</table>

### 服务 · 安全 · 日志 · 系统

<table>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130319_635.png" alt="服务"><br><sub><b>服务</b> · FTP / Samba / SNMP / HTTP 服务总览</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130330_891.png" alt="安全·访问控制"><br><sub><b>安全</b> · MAC / 域名 / URL 访问控制、ACL</sub></td>
</tr>
<tr>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130336_141.png" alt="安全·高级防护"><br><sub><b>安全</b> · 高级防护(禁 PING / DoS / TCP MSS 等)</sub></td>
<td width="50%"><img src="images/ScreenShot_2026-06-20_130343_041.png" alt="系统信息"><br><sub><b>系统</b> · 系统信息、版本、维护与性能</sub></td>
</tr>
</table>

> 截图中部分敏感字段(客户端名称、MAC、DNS、公网地址等)已做打码处理。

## 快速开始

```bash
# 1) 安装依赖(两个工程)
npm run install:all        # 等价于在 frontend/ 与 backend/ 各 npm install

# 2) 准备数据库(见下方「MySQL」)并填好 backend/.env

# 3) 启动(两个终端)
npm run backend            # 终端 A:ISP 探测后端 (:5274)
npm run frontend           # 终端 B:前端 (http://localhost:5273)
```

也可直接进入子目录运行:`cd frontend && npm run dev` / `cd backend && npm start`。
> 只跑前端也能用:ISP 卡片/性能条会显示「后端未运行」,其余真实数据照常。

## 配置

前端 `frontend/.env`:

| 变量 | 说明 |
|---|---|
| `VITE_IKUAI_TOKEN` | API 密钥,作为 `Authorization: Bearer <token>` 发送 |
| `VITE_IKUAI_BASE`  | 爱快设备地址(Vite 把 `/api` 代理到这里) |
| `VITE_POLL_MS`     | 轮询间隔(毫秒),默认 2000 |
| `VITE_ALLOW_MOCK`  | `1` 时设备不可达回落模拟数据;`0` 只用真机 |
| `SVC_PORT`         | 后端端口,Vite 把 `/svc` 代理到这里 |

后端 `backend/.env`:

| 变量 | 说明 |
|---|---|
| `IKUAI_BASE` / `IKUAI_TOKEN` | 爱快设备地址与密钥(用于读取 WAN 网关做 ISP 延迟探测) |
| `SVC_PORT` | 后端监听端口,默认 `5274` |
| `PROBE_INTERVAL_MS` | 探测间隔,默认 `300000`(5 分钟) |
| `ISP_LOOKUP_URL` | 解析当前 ISP 名称的 geo-IP 服务(默认 ip-api.com) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL 连接 |

> `secure:false` 的 Vite 代理兼容自签名证书;浏览器只与 Vite 同源通信,无 CORS/混合内容。
> ISP 名称解析会把路由器公网 IP 发送给第三方(ip-api.com),可通过 `ISP_LOOKUP_URL` 更换或自建。

## MySQL

后端用 **MySQL**(`mysql2`)持久化探测历史,已弃用 SQLite。

```bash
# 初始化数据库与表(MySQL 5.7+ / 8.x)
mysql -u root -p < backend/sql/init.sql
```

`backend/sql/init.sql` 会创建 `ikuai_console` 库与 `probes` 表(脚本里附带可选的最小权限账号)。
若 `backend/.env` 中的账号具备建库权限,后端**启动时也会自动建库建表**;连不上时会重试并照常对外服务。

`probes` 表:每个探测周期一行 —— `ts`(unix 秒,主键)、`online`、`isp`、`ip`、以及到
运营商/Cloudflare/Google/GitHub/Microsoft 的延迟(ms)。

## 后端接口

- `GET /svc/isp/summary` — 当前 ISP 名称、公网 IP、各目标延迟、24h/7d 在线率
- `GET /svc/isp/history?buckets=60&hours=24` — 分段在线率(驱动「ISP 性能」长条)

零运行时依赖之外仅 `mysql2`:`node:http` + `node:net` + 系统 `ping`。

## Docker 部署(两容器:host 探测 + 1panel-network 托管)

同一个镜像跑两个角色(`ROLE`),通过 MySQL 解耦:

| 服务 | 网络 | 职责 |
|---|---|---|
| `probe` | `network_mode: host` | ISP 检测 + 延迟探测(走宿主网卡,延迟准、能 ICMP、能到 WAN 网关),写 MySQL |
| `web` | `1panel-network` | 托管前端 + 反代 `/api` + 提供 `/svc`,读 MySQL;映射 `60001:5274` |

```bash
# 复用 backend/.env;1panel-network 必须已存在(external)
docker compose up -d --build
# 浏览器访问 http://<宿主机>:60001
```

- **iKuai token 由 web 后端注入**(`IKUAI_TOKEN`),不进前端包。
- `probe` 加了 `cap_add: NET_RAW`,运营商(网关)延迟才不为空。
- **MySQL 解析**:`web` 在桥接网里解析不了 `Rasp-Mysql` 这种主机名 —— 把 `backend/.env`
  的 `DB_HOST` 改成 MySQL 的 **IP**(对两个容器都最省事),或在 `web` 用 `extra_hosts` 映射。
- `1panel-network` 需先存在(由 1Panel 创建);compose 里声明为 `external: true`。

> 单进程模式:不设 `ROLE`(默认 `all`)即 probe+web 合一;再设 `FRONTEND_DIR=<dist 路径>`
> 就能一个进程托管前端 + 反代 `/api` + 探测(适合不分网络的简单部署)。

## 功能(全部真实数据)

- **总览** UniFi 风格:顶栏 + 左侧设备/ISP 面板 + 主健康区;浅色主题,右上角切换深色。
- **ISP 卡片** — 真实 ISP 名称 + 到运营商/Cloudflare/Google/GitHub/Microsoft 的真实延迟。
- **ISP 性能** — 后端 MySQL 历史在线率。
- **无线 / AC** — 先查 `GET /network/ac/services` 的 `ac_status`;**未开启 AC 显示「未开启 AC 功能」**,
  开启后按 `wireless-score` / `wireless-statistics` / `ac/ap-config` 真实渲染。

## 结构

```
frontend/
  src/lib/        api.ts(iKuai 端点) svc.ts(后端客户端) format.ts usePoll.ts mock.ts
  src/components/  Header Sidebar DevicePanel charts(纯SVG) ui icons
  src/pages/      Dashboard.tsx
  vite.config.ts  tsconfig*.json  index.html  .env
backend/
  src/index.mjs   HTTP 接口 + 探测调度
  src/lib/        env.mjs db.mjs(mysql2) ikuai.mjs probe.mjs
  sql/init.sql    建库建表脚本
  .env
```
