'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Search, ArrowLeft } from 'lucide-react'

const faqs = [
  {
    category: 'Getting Started',
    items: [
      { q: 'How do I create an account?', a: 'Click the "Get Started Free" button on our homepage. Fill in your details and you\'ll be up and running in under 30 seconds.' },
      { q: 'Is there a free trial?', a: 'Yes! BookSure is free to get started. Sign up and start booking in under 30 seconds.' },
      { q: 'How do I set up my booking page?', a: 'After signing up, go to Settings > Business Information. Set your business name, choose a unique URL slug, and customize your branding.' },
    ],
  },
  {
    category: 'Calendar & Availability',
    items: [
      { q: 'How do I connect Google Calendar?', a: 'Go to Settings > Calendar Integration and click "Connect Google Calendar". You\'ll be redirected to Google to authorize access.' },
      { q: 'Can I set different working hours?', a: 'Yes. In Settings, you can set your start/end time, working days, buffer between appointments, and lunch break.' },
      { q: 'How many calendars can I sync?', a: 'You can connect one primary Google Calendar per account. Team plan users can have individual calendars.' },
    ],
  },
  {
    category: 'Appointments & Booking',
    items: [
      { q: 'How do customers book appointments?', a: 'Share your unique booking link (e.g., booksure.rw/book/your-business). Customers click the link, pick a time, and fill in their details.' },
      { q: 'Can I cancel or reschedule appointments?', a: 'Yes. From your dashboard, click on any appointment to manage it. You can cancel or reschedule as needed.' },
      { q: 'Do customers get reminders?', a: 'Yes. Customers receive an SMS confirmation immediately and a reminder 1 hour before the appointment.' },
    ],
  },
  {
    category: 'SMS & Notifications',
    items: [
      { q: 'Which SMS providers are supported?', a: 'We support Twilio, MTN, and Airtel for SMS delivery. Configure your preferred provider in Settings.' },
      { q: 'Can I customize SMS messages?', a: 'With the Workflows feature, you can customize confirmation and reminder messages.' },
    ],
  },
  {
    category: 'Team & Collaboration',
    items: [
      { q: 'Can I add team members?', a: 'Yes. You can add team members and manage pooled availability for team scheduling.' },
      { q: 'How does team scheduling work?', a: 'Team members can set their individual availability. BookSure pools all availability and shows combined slots to customers.' },
    ],
  },
]

export default function FAQPage() {
  const [search, setSearch] = useState('')
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const filteredFaqs = faqs.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">Quick answers to common questions about BookSure.</p>

        <div className="relative mb-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-8">
          {filteredFaqs.map(cat => (
            <div key={cat.category}>
              <h2 className="text-lg font-semibold text-foreground mb-4">{cat.category}</h2>
              <div className="space-y-2">
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`
                  const isOpen = openItems.has(key)
                  return (
                    <div key={key} className="rounded-xl border border-border bg-card overflow-hidden">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4">
                          <p className="text-sm text-muted-foreground">{item.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No results found for &quot;{search}&quot;</p>
            <button onClick={() => setSearch('')} className="text-sm text-primary hover:underline cursor-pointer">Clear search</button>
          </div>
        )}

        <div className="mt-12 p-6 rounded-xl bg-muted/50 border border-border text-center">
          <p className="text-sm text-muted-foreground">
            Still have questions? <Link href="/contact" className="text-primary hover:underline">Contact our support team</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
