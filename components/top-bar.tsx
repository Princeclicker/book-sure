'use client'

import { Search, Bell, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface TopBarProps {
  userName: string
}

export function TopBar({ userName }: TopBarProps) {
  const pathname = usePathname()

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname.includes('/contacts')) return 'Contacts'
    if (pathname.includes('/appointments')) return 'Appointments'
    if (pathname.includes('/tasks')) return 'Tasks'
    if (pathname.includes('/opportunities')) return 'Opportunities'
    if (pathname.includes('/invoices')) return 'Invoices'
    if (pathname.includes('/workflows')) return 'Workflows'
    if (pathname.includes('/settings')) return 'Settings'
    if (pathname.includes('/branding')) return 'Branding'
    if (pathname.includes('/polls')) return 'Polls'
    if (pathname.includes('/routing-forms')) return 'Routing Forms'
    if (pathname.includes('/teams')) return 'Teams'
    if (pathname.includes('/smart-followup')) return 'Smart Follow-up'
    return 'Dashboard'
  }

  return (
    <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 w-48 pl-8 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <button className="relative p-1.5 rounded-md hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </button>

        <Link href="/settings" className="flex items-center gap-2 hover:bg-muted rounded-md px-2 py-1 transition-colors">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">{userName.split(' ')[0]}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
        </Link>
      </div>
    </div>
  )
}