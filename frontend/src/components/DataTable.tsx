import { useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  sort?: (row: T) => number | string     // sortable when provided
  align?: 'right'
  width?: number
}

/** Generic sortable table with the UniFi list look. */
export function DataTable<T>({
  rows, columns, rowKey, defaultSort, defaultDir = 'asc', empty, onRowClick,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string | number
  defaultSort?: string
  defaultDir?: 'asc' | 'desc'
  empty?: ReactNode
  onRowClick?: (row: T) => void
}) {
  const [sortKey, setSortKey] = useState(defaultSort ?? columns[0].key)
  const [dir, setDir] = useState<'asc' | 'desc'>(defaultDir)

  const col = columns.find((c) => c.key === sortKey)
  const sorted = col?.sort
    ? [...rows].sort((a, b) => {
      const av = col.sort!(a), bv = col.sort!(b)
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv : String(av).localeCompare(String(bv), 'zh')
      return dir === 'asc' ? cmp : -cmp
    })
    : rows

  const onSort = (k: string, sortable: boolean) => {
    if (!sortable) return
    if (k === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(k); setDir('asc') }
  }

  return (
    <table className="dtable">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={c.align === 'right' ? 'r' : ''}
              style={{ cursor: c.sort ? 'pointer' : 'default', width: c.width }}
              onClick={() => onSort(c.key, !!c.sort)}>
              {c.label}
              {c.sort && sortKey === c.key && <span className="sar">{dir === 'asc' ? '▲' : '▼'}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0
          ? <tr><td className="dt-empty" colSpan={columns.length}>{empty ?? '无数据'}</td></tr>
          : sorted.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}>
              {columns.map((c) => <td key={c.key} className={c.align === 'right' ? 'r' : ''}>{c.render(r)}</td>)}
            </tr>
          ))}
      </tbody>
    </table>
  )
}
