'use client'

import { useState } from 'react'
import { createOrUpdateBusiness, updateCalendarSettings } from '@/app/actions/business'
import { Button } from '@/components/ui/button'

interface Business {
  businessName: string
  businessSlug: string | null
  logoUrl?: string | null
  brandColor?: string | null
  [key: string]: any
}

interface Calendar {
  id?: number
  calendarId: string
  timezone: string | null
  workingHoursStart: number | null
  workingHoursEnd: number | null
  workingDays: string | null
  bufferMinutes: number | null
  lunchBreakStart: number | null
  lunchBreakEnd: number | null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function SettingsForm({
  initialBusiness,
  initialCalendar,
}: {
  initialBusiness: Business
  initialCalendar?: Calendar
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(initialBusiness)

  const defaultDays: number[] = (() => { try { return JSON.parse(initialCalendar?.workingDays || '[1,2,3,4,5]') } catch { return [1, 2, 3, 4, 5] } })()
  const [whStart, setWhStart] = useState(initialCalendar?.workingHoursStart ?? 9)
  const [whEnd, setWhEnd] = useState(initialCalendar?.workingHoursEnd ?? 17)
  const [buffer, setBuffer] = useState(initialCalendar?.bufferMinutes ?? 15)
  const [lunchStart, setLunchStart] = useState(initialCalendar?.lunchBreakStart ?? 12)
  const [lunchEnd, setLunchEnd] = useState(initialCalendar?.lunchBreakEnd ?? 13)
  const [workingDays, setWorkingDays] = useState<number[]>(defaultDays)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createOrUpdateBusiness({
        businessName: formData.businessName,
        businessSlug: formData.businessSlug || '',
        ...(formData.logoUrl ? { logoUrl: formData.logoUrl } : {}),
        ...(formData.brandColor ? { brandColor: formData.brandColor } : {}),
      })

      if (initialCalendar) {
        await updateCalendarSettings({
          workingHoursStart: whStart,
          workingHoursEnd: whEnd,
          workingDays,
          bufferMinutes: buffer,
          lunchBreakStart: lunchStart,
          lunchBreakEnd: lunchEnd,
        })
      }

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-foreground mb-2">
          Business Name
        </label>
        <input
          type="text"
          id="businessName"
          required
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          placeholder="Your Business Name"
          className="w-full px-4 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="businessSlug" className="block text-sm font-medium text-foreground mb-2">
          Booking Page URL Slug
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/
          </span>
          <input
            type="text"
            id="businessSlug"
            required
            value={formData.businessSlug || ''}
            onChange={(e) => setFormData({ ...formData, businessSlug: e.target.value })}
            placeholder="your-business"
            className="flex-1 px-4 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          This will be your unique booking URL
        </p>
      </div>

      <div>
        <label htmlFor="brandColor" className="block text-sm font-medium text-foreground mb-2">
          Brand Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="brandColor"
            value={formData.brandColor || '#000000'}
            onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
            className="w-12 h-12 rounded-md border border-border cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">{formData.brandColor}</span>
        </div>
      </div>

      {initialCalendar && (
        <>
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Working Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="whStart" className="block text-xs font-medium text-muted-foreground mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  id="whStart"
                  value={`${String(whStart).padStart(2, '0')}:00`}
                  onChange={(e) => setWhStart(parseInt(e.target.value.split(':')[0]) || 9)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="whEnd" className="block text-xs font-medium text-muted-foreground mb-1">
                  End time
                </label>
                <input
                  type="time"
                  id="whEnd"
                  value={`${String(whEnd).padStart(2, '0')}:00`}
                  onChange={(e) => setWhEnd(parseInt(e.target.value.split(':')[0]) || 17)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Working Days</h3>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    workingDays.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Additional Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="buffer" className="block text-xs font-medium text-muted-foreground mb-1">
                  Buffer (min)
                </label>
                <input
                  type="number"
                  id="buffer"
                  min={0}
                  max={60}
                  value={buffer}
                  onChange={(e) => setBuffer(parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="lunchStart" className="block text-xs font-medium text-muted-foreground mb-1">
                  Lunch start
                </label>
                <input
                  type="number"
                  id="lunchStart"
                  min={0}
                  max={23}
                  value={lunchStart}
                  onChange={(e) => setLunchStart(parseInt(e.target.value) || 12)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="lunchEnd" className="block text-xs font-medium text-muted-foreground mb-1">
                  Lunch end
                </label>
                <input
                  type="number"
                  id="lunchEnd"
                  min={0}
                  max={23}
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(parseInt(e.target.value) || 13)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  )
}
