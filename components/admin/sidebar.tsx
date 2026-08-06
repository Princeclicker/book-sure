'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { NAV_SECTIONS } from '@/lib/admin-catalog'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth-client'
import {
  LayoutDashboard, Building2, Users, Sparkles, Brain, CalendarDays, Contact,
  DollarSign, TrendingUp, Plug, Grid2X2, Flag, Bell, FileText, ListTree,
  Shield, Code2, Settings,
} from 'lucide-react'

const ICONS: Record<string, React.ReactNode> = {
  layout: <LayoutDashboard className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  brain: <Brain className="h-4 w-4" />,
  calendar: <CalendarDays className="h-4 w-4" />,
  contact: <Contact className="h-4 w-4" />,
  dollar: <DollarSign className="h-4 w-4" />,
  trend: <TrendingUp className="h-4 w-4" />,
  plug: <Plug className="h-4 w-4" />,
  grid: <Grid2X2 className="h-4 w-4" />,
  flag: <Flag className="h-4 w-4" />,
  bell: <Bell className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
  list: <ListTree className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  code: <Code2 className="h-4 w-4" />,
  gear: <Settings className="h-4 w-4" />,
}

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/')
    router.refresh()
  }

  const content = (
    <div className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-none">BookSure</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Platform Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {NAV_SECTIONS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive(item.href)
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {ICONS[item.icon]}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <p className="truncate px-1 text-xs text-muted-foreground">{email}</p>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Sign out
        </button>
        <Link
          href="/dashboard"
          className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Back to my dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden lg:block">{content}</aside>
      {/* Mobile toggle */}
      <div className="lg:hidden">
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
        )}
        <aside className={`fixed inset-y-0 left-0 z-50 transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {content}
        </aside>
        <button
          onClick={() => setOpen(!open)}
          className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground lg:hidden"
          aria-label="Toggle admin menu"
        >
          <LayoutDashboard className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
