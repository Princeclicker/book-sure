'use client'

import { useRouter } from 'next/navigation'
import { Badge, statusTone } from '@/components/admin/badge'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  rowHref,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowHref?: (row: T) => string
  empty?: { title: string; description?: string }
}) {
  const router = useRouter()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`p-3 text-left font-medium text-muted-foreground ${c.className ?? ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-muted-foreground">
                {empty?.title ?? 'No records'}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-border ${
                rowHref ? 'cursor-pointer hover:bg-muted/30' : ''
              }`}
              onClick={rowHref ? () => router.push(rowHref(row)) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={`p-3 ${c.className ?? ''}`}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TableStatus({ value }: { value: string | null | undefined }) {
  return <Badge tone={statusTone(value ?? '')}>{value ?? '—'}</Badge>
}
