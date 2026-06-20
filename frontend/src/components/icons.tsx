// Inline SVG icons (UniFi-flavored line icons). Stroke inherits `currentColor`.
import type { CSSProperties } from 'react'

type P = { size?: number; style?: CSSProperties; className?: string }
const base = (size = 18): CSSProperties => ({ width: size, height: size })
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const IcDashboard = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="3" width="8" height="8" rx="1.6" /><rect x="13" y="3" width="8" height="5" rx="1.6" />
    <rect x="13" y="10" width="8" height="11" rx="1.6" /><rect x="3" y="13" width="8" height="8" rx="1.6" />
  </svg>
)
export const IcTopology = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <circle cx="12" cy="5" r="2.2" /><circle cx="5" cy="18" r="2.2" /><circle cx="19" cy="18" r="2.2" />
    <path d="M12 7v4M12 11l-5 5M12 11l5 5" />
  </svg>
)
export const IcDevices = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
)
export const IcClients = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.4 3.1-6 7-6s7 2.6 7 6" />
  </svg>
)
export const IcInsights = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M3 17l5-5 4 3 6-8" /><path d="M3 21h18" />
  </svg>
)
export const IcWifi = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M12 18.5h.01" />
  </svg>
)
export const IcNetworks = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="9" width="18" height="6" rx="2" /><path d="M7 12h.01M11 12h.01" />
  </svg>
)
export const IcSecurity = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" />
  </svg>
)
export const IcInternet = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
)
export const IcSettings = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.3l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.2-1.3L14 3h-4l-.4 2.2A7 7 0 0 0 7.4 6.5l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .9.1 1.3l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.2 1.3L10 21h4l.4-2.2a7 7 0 0 0 2.2-1.3l2.3 1 2-3.4-2-1.5c.1-.4.1-.9.1-1.3z" />
  </svg>
)
export const IcSearch = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
  </svg>
)
export const IcRefresh = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M4 12a8 8 0 0 1 14-5.3L21 9M20 12a8 8 0 0 1-14 5.3L3 15" /><path d="M21 5v4h-4M3 19v-4h4" />
  </svg>
)
export const IcBell = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
)
export const IcHelp = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5M12 18h.01" />
  </svg>
)
export const IcChevron = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 14), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)
export const IcArrowUp = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 12), ...style }} className={className} {...S} strokeWidth={3}>
    <path d="M6 15l6-6 6 6" />
  </svg>
)
export const IcGateway = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 12h.01M11 12h.01M15 15h2" />
  </svg>
)
export const IcSwitch = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="9" width="18" height="6" rx="1.5" /><path d="M6 12h.01M9 12h.01M12 12h.01M15 12h.01" />
  </svg>
)
export const IcWired = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="4" y="5" width="16" height="11" rx="1.6" /><path d="M8 20h8M12 16v4" />
  </svg>
)
export const IcLogo = ({ size = 20, style }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} fill="none">
    <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="12" r="3.4" fill="#fff" />
  </svg>
)
export const IcChevronDown = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 16), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)
export const IcGear = IcSettings
export const IcMenu = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 20), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)
export const IcCollapse = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 16), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M15 6l-6 6 6 6" /><path d="M5 5v14" />
  </svg>
)
export const IcMoon = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z" />
  </svg>
)
export const IcSun = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </svg>
)
export const IcCamera = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="6" width="18" height="13" rx="2" /><circle cx="12" cy="12.5" r="3.2" /><path d="M8 6l1.4-2h5.2L16 6" />
  </svg>
)
export const IcDoor = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M14 12h.01" />
  </svg>
)
export const IcDisplay = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="4" width="18" height="12" rx="2" /><path d="M9 20h6M12 16v4" />
  </svg>
)
// thin rackmount device glyph for the device-card thumbnail
export const IcRack = ({ size, style, className }: P) => (
  <svg viewBox="0 0 48 28" style={{ width: size ?? 46, height: (size ?? 46) * 28 / 48, ...style }} className={className}
    fill="none" stroke="#9fb0c4" strokeWidth="1.4" strokeLinecap="round">
    <rect x="2" y="6" width="44" height="16" rx="2.5" stroke="#7d8da0" />
    <circle cx="9" cy="14" r="2.4" stroke="#5fd08a" />
    <path d="M16 14h4M23 14h4M30 14h2" stroke="#6f7e92" />
    <rect x="36" y="11" width="6" height="6" rx="1" stroke="#6f7e92" />
  </svg>
)
export const IcSpeed = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <path d="M5 18a8 8 0 1 1 14 0" /><path d="M12 14l4-4" /><path d="M12 14h.01" />
  </svg>
)
export const IcDown = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 14), ...style }} className={className} {...S} strokeWidth={2.4}>
    <path d="M12 5v13M6 13l6 6 6-6" />
  </svg>
)
export const IcUp = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 14), ...style }} className={className} {...S} strokeWidth={2.4}>
    <path d="M12 19V6M6 11l6-6 6 6" />
  </svg>
)
export const IcCheck = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size ?? 14), ...style }} className={className} {...S} strokeWidth={3}>
    <path d="M5 12l5 5L20 6" />
  </svg>
)
export const IcReports = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
)
export const IcSupport = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.4" />
    <path d="M14.5 9.5L18 6M9.5 14.5L6 18M14.5 14.5L18 18M9.5 9.5L6 6" />
  </svg>
)
export const IcBolt = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
  </svg>
)
export const IcPhone = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 13l1 5v1a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
)
export const IcLaptop = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="4" y="5" width="16" height="11" rx="1.6" /><path d="M2 20h20" />
  </svg>
)
export const IcTv = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8" />
  </svg>
)
export const IcGame = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="2" y="8" width="20" height="9" rx="4.5" /><path d="M7 12h3M8.5 10.5v3" /><circle cx="16" cy="11.5" r=".6" /><circle cx="18" cy="13.5" r=".6" />
  </svg>
)
export const IcWifiOff = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M5 12.5a10 10 0 0 1 6-2.4M8 15.5a6 6 0 0 1 4-1.4M12 18.5h.01M16 16a6 6 0 0 0-1.5-1M19 12.5a10 10 0 0 0-3-2" />
    <path d="M3 3l18 18" />
  </svg>
)
export const IcInfo = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S} strokeWidth={2}>
    <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
  </svg>
)
export const IcAp = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="4" y="14" width="16" height="6" rx="1.6" /><path d="M8 17h.01" /><path d="M7 9a7 7 0 0 1 10 0M9.5 11.5a3.5 3.5 0 0 1 5 0" />
  </svg>
)
export const IcObjects = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <path d="M12 3l8 4-8 4-8-4 8-4z" /><path d="M4 12l8 4 8-4" /><path d="M4 16.5l8 4 8-4" />
  </svg>
)
export const IcAuth = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <circle cx="10" cy="8" r="3.2" /><path d="M4 20c0-3.3 2.7-6 6-6 1.2 0 2.3.3 3.2.9" /><path d="M14.5 16.5l1.8 1.8 3.2-3.6" />
  </svg>
)
export const IcVpn = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="4" y="10.5" width="16" height="9.5" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /><path d="M12 14v2.5" />
  </svg>
)
export const IcNas = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7v10M13 7h2M13 11h2" />
  </svg>
)
export const IcService = ({ size, style, className }: P) => (
  <svg viewBox="0 0 24 24" style={{ ...base(size), ...style }} className={className} {...S}>
    <rect x="3" y="4" width="18" height="6" rx="1.6" /><rect x="3" y="14" width="18" height="6" rx="1.6" />
    <path d="M7 7h.01M7 17h.01" />
  </svg>
)
