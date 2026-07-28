'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Calendar, TrendingUp, CheckSquare, DollarSign,
  Zap, Settings, ChevronLeft, ChevronRight, Home, Building2, Briefcase,
  FileText, Clock, Shield, Heart, Scale, Stethoscope, Scissors, Dumbbell,
  Camera, Calculator, Megaphone, PawPrint, Smile, GraduationCap, Car, Hammer,
  HardHat, UserPlus, BookOpen, Image, Send, AlertCircle, Bell, Menu, X
} from 'lucide-react'
import type { ProfessionId } from '@/lib/profession'
import { getNavItems, getProfessionConfig } from '@/lib/profession'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, Calendar, TrendingUp, CheckSquare, DollarSign,
  Zap, Settings, Home, Building2, Briefcase, FileText, Clock, Shield,
  Heart, Scale, Stethoscope, Scissors, Dumbbell, Camera, Calculator,
  Megaphone, PawPrint, Smile, GraduationCap, Car, Hammer, HardHat,
  UserPlus, BookOpen, Image, Send, AlertCircle, Bell,
}

interface SidebarProps {
  profession: ProfessionId
  businessName?: string
}

export function Sidebar({ profession, businessName }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getNavItems(profession)
  const config = getProfessionConfig(profession)

  const primaryItems = navItems.filter(i => i.group === 'primary')
  const secondaryItems = navItems.filter(i => i.group === 'secondary')
  const toolItems = navItems.filter(i => i.group === 'tools')

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const renderNavGroup = (items: typeof navItems) => (
    <div className="space-y-0.5">
      {items.map(item => {
        const Icon = iconMap[item.icon] || LayoutDashboard
        const active = isActive(item.href)
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              active
                ? 'bg-sidebar-accent text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
            } ${collapsed ? 'justify-center px-2' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </div>
  )

  const sidebar = (
    <div className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200 ${
      collapsed ? 'w-16' : 'w-60'
    }`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-sidebar-border ${collapsed ? 'justify-center px-2' : ''}`}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.name.charAt(0)}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{businessName || config.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{config.name} OS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {primaryItems.length > 0 && (
          <div>
            {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Main</p>}
            {renderNavGroup(primaryItems)}
          </div>
        )}
        {secondaryItems.length > 0 && (
          <div>
            {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Business</p>}
            {renderNavGroup(secondaryItems)}
          </div>
        )}
        {toolItems.length > 0 && (
          <div>
            {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">Tools</p>}
            {renderNavGroup(toolItems)}
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2 hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-sidebar border border-sidebar-border rounded-lg p-2 shadow-sm"
      >
        <Menu className="w-5 h-5 text-sidebar-foreground" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-60 h-full">
            {sidebar}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        {sidebar}
      </div>
    </>
  )
}
