'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users, Search, Plus, Phone, Mail, ArrowLeft, Loader2, X, CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getContacts, createContact } from '@/app/actions/contacts'

interface Contact {
  id: number
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string | null
  lastContactAt: Date | null
  createdAt: Date
}

const STATUS_FILTERS = ['all', 'lead', 'active', 'inactive', 'vip'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const STATUS_STYLES: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  vip: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

export default function ContactsPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formCompany, setFormCompany] = useState('')

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getContacts({
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      })
      setContacts(result.contacts as Contact[])
      setTotal(result.total)
    } catch {
      setError('Failed to load contacts')
    }
    setLoading(false)
  }, [search, statusFilter])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadContacts() }, [loadContacts])

  useEffect(() => {
    const timer = setTimeout(() => { loadContacts() }, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter, loadContacts])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!formName.trim()) { setError('Name is required'); return }
    try {
      await createContact({
        name: formName,
        email: formEmail || undefined,
        phone: formPhone || undefined,
        company: formCompany || undefined,
      })
      setShowForm(false)
      setFormName('')
      setFormEmail('')
      setFormPhone('')
      setFormCompany('')
      await loadContacts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" /> Contacts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{total} total contacts</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Contact
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            {error}
          </div>
        )}

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts by name, email, phone, or company..."
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto">
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">New Contact</h2>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <Input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Company</label>
                <Input
                  type="text"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="cursor-pointer">Create Contact</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="cursor-pointer">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {contacts.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Contacts Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'No contacts match your search.' : 'Add your first contact to get started.'}
            </p>
            {!search && (
              <Button onClick={() => setShowForm(true)} className="cursor-pointer">
                <Plus className="w-4 h-4 mr-1" /> Add Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contacts.map(contact => (
              <Link
                key={contact.id}
                href={`/dashboard/contacts/${contact.id}`}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {contact.name}
                      </h3>
                      {contact.status && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_STYLES[contact.status] || 'bg-muted text-muted-foreground'}`}>
                          {contact.status}
                        </span>
                      )}
                    </div>
                    {contact.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {contact.email}
                      </p>
                    )}
                    {contact.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                        <Phone className="w-3 h-3 shrink-0" /> {contact.phone}
                      </p>
                    )}
                    {contact.lastContactAt && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-2">
                        <CalendarDays className="w-3 h-3 shrink-0" />
                        Last contact {new Date(contact.lastContactAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
