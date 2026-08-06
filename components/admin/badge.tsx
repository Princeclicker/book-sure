import { cn } from '@/lib/utils'

const tones: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  gray: 'bg-muted text-muted-foreground',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
}

export function Badge({
  tone = 'gray',
  children,
  className,
}: {
  tone?: keyof typeof tones
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusTone(status: string): keyof typeof tones {
  const s = status.toLowerCase()
  if (['active', 'confirmed', 'paid', 'completed', 'success', 'enabled', 'verified', 'online', 'ok', 'ready', 'pro', 'business'].includes(s)) return 'green'
  if (['suspended', 'cancelled', 'failed', 'error', 'blocked', 'expired', 'overdue', 'offline', 'denied', 'archived'].includes(s)) return 'red'
  if (['pending', 'trial', 'warning', 'disabled', 'draft', 'processing'].includes(s)) return 'amber'
  if (s === 'admin') return 'purple'
  if (['user', 'lead', 'no-show'].includes(s)) return 'blue'
  return 'gray'
}
