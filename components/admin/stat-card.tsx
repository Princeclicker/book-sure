import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
  className,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  tone?: 'default' | 'positive' | 'warning' | 'danger' | 'accent'
  className?: string
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    positive: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
    accent: 'text-primary',
  }
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('mt-1 truncate text-2xl font-bold tracking-tight', tones[tone])}>
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
    </div>
  )
}
