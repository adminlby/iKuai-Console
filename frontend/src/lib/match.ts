// Helpers for iKuai's nested rule "matcher" fields, shared by routing & security
// rules. A matcher is { custom: string[]|object, object: {gp_name,gid}[] }; time
// matchers carry { custom: [{weekdays,start_time,end_time}], object: [...] }.

/** Flatten a matcher (address / proto / port / object-group ref) to readable text. */
export function flat(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(flat).filter(Boolean).join(', ')
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('gp_name' in o || 'gid' in o) return String(o.gp_name || o.gid || '')
    const parts: string[] = []
    if ('object' in o) parts.push(flat(o.object))
    if ('custom' in o) parts.push(flat(o.custom))
    return parts.filter(Boolean).join(', ')
  }
  return ''
}

/** Compact time-window label from a `time` matcher. */
export function timeLabel(t: unknown): string {
  const o = t as { custom?: unknown; object?: unknown } | null
  if (o && o.object) { const g = flat(o.object); if (g) return g }
  const arr = o && Array.isArray(o.custom) ? (o.custom as Array<Record<string, string>>) : []
  if (!arr.length) return '全天'
  const c = arr[0]
  if (c.weekdays === '1234567' && c.start_time === '00:00' && (c.end_time === '23:59' || c.end_time === '24:00')) return '全天'
  return `${c.start_time}-${c.end_time}${arr.length > 1 ? ` +${arr.length - 1}` : ''}`
}
