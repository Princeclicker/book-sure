'use client'

import { useState } from 'react'
import { getAllProfessions, type ProfessionId } from '@/lib/profession'
import { createOrUpdateBusinessProfile } from '@/app/actions/business-profiles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Home, Stethoscope, Scale, Laptop, Briefcase, Scissors, Dumbbell,
  Hammer, Car, GraduationCap, Camera, Calculator, Megaphone, PawPrint,
  Smile, Shield, CheckCircle
} from 'lucide-react'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Stethoscope, Scale, Laptop, Briefcase, Scissors, Dumbbell,
  Hammer, Car, GraduationCap, Camera, Calculator, Megaphone, PawPrint,
  Smile, Shield,
}

interface ProfessionSettingsProps {
  initialProfession: string
  initialDescription: string
  initialLocation: string
  initialTimezone: string
  initialCurrency: string
}

export function ProfessionSettings({
  initialProfession,
  initialDescription,
  initialLocation,
  initialTimezone,
  initialCurrency,
}: ProfessionSettingsProps) {
  const professions = getAllProfessions()
  const [profession, setProfession] = useState(initialProfession)
  const [description, setDescription] = useState(initialDescription)
  const [location, setLocation] = useState(initialLocation)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [currency, setCurrency] = useState(initialCurrency)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await createOrUpdateBusinessProfile({
      profession,
      businessDescription: description,
      location,
      timezone,
      currency,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Profession Grid */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Select your profession</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {professions.map(p => {
            const Icon = iconMap[p.icon] || Briefcase
            const isSelected = profession === p.id
            return (
              <button
                key={p.id}
                onClick={() => setProfession(p.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: p.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-foreground">{p.name}</span>
                {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Business Details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Business Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What does your business do?"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="City, Country"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Europe/Berlin">Berlin</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Asia/Shanghai">Shanghai</option>
            <option value="Asia/Dubai">Dubai</option>
            <option value="Africa/Nairobi">Nairobi</option>
            <option value="Africa/Lagos">Lagos</option>
            <option value="Australia/Sydney">Sydney</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="CAD">CAD - Canadian Dollar</option>
            <option value="AUD">AUD - Australian Dollar</option>
            <option value="KES">KES - Kenyan Shilling</option>
            <option value="NGN">NGN - Nigerian Naira</option>
            <option value="RWF">RWF - Rwandan Franc</option>
            <option value="ZAR">ZAR - South African Rand</option>
            <option value="INR">INR - Indian Rupee</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Changes saved successfully
          </span>
        )}
      </div>
    </div>
  )
}
