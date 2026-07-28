'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, ArrowRight, ArrowLeft, Check, Building2, MapPin, Globe, DollarSign, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createOrUpdateBusinessProfile, completeOnboarding } from '@/app/actions/business-profiles'
import { getAllProfessions, type ProfessionId } from '@/lib/profession'

const professions = getAllProfessions()

const ICON_MAP: Record<string, string> = {
  Home: '🏠', Stethoscope: '🏥', Scale: '⚖️', Briefcase: '💼',
  'Presentation': '📊', Scissors: '✂️', Dumbbell: '💪', Wrench: '🔧',
  Car: '🚗', BookOpen: '📚', Camera: '📷', Calculator: '🧮',
  Megaphone: '📢', PawPrint: '🐾', Smile: '😁', Shield: '🛡️',
}

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland',
]

const CURRENCIES = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CAD', label: 'CAD ($)' },
  { code: 'AUD', label: 'AUD ($)' },
]

const STEPS = ['Select Profession', 'Business Details', 'Team Size', 'Preview']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [selectedProfession, setSelectedProfession] = useState<ProfessionId | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [businessDescription, setBusinessDescription] = useState('')
  const [location, setLocation] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [currency, setCurrency] = useState('USD')
  const [teamSize, setTeamSize] = useState(1)

  const selectedProf = professions.find(p => p.id === selectedProfession)
  const progress = ((step + 1) / STEPS.length) * 100

  function canNext() {
    if (step === 0) return !!selectedProfession
    if (step === 1) return !!businessName.trim()
    if (step === 2) return teamSize > 0
    return true
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  function handleBack() {
    if (step > 0) setStep(step - 1)
  }

  async function handleComplete() {
    if (!selectedProfession) return
    setLoading(true)
    setError('')
    try {
      await completeOnboarding({
        profession: selectedProfession,
        businessDescription: businessDescription || undefined,
        location: location || undefined,
        timezone,
        currency,
        teamSize,
      })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Welcome to your workspace</h1>
            <span className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {STEPS.map((label, i) => (
              <span key={i} className={`text-[10px] ${i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">What best describes your business?</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose your profession to customize your workspace.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {professions.map(prof => (
                <button
                  key={prof.id}
                  onClick={() => setSelectedProfession(prof.id)}
                  className={`rounded-xl border p-5 text-left transition-all cursor-pointer ${
                    selectedProfession === prof.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${prof.color}15` }}
                    >
                      {ICON_MAP[prof.icon] || prof.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{prof.name}</h3>
                        {selectedProfession === prof.id && (
                          <Check className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{prof.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Business Details</h2>
            <p className="text-sm text-muted-foreground mb-6">Tell us about your business.</p>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <Label className="mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Business Name *</Label>
                <Input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label className="mb-1">Description</Label>
                <textarea
                  value={businessDescription}
                  onChange={e => setBusinessDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none"
                  rows={3}
                  placeholder="What does your business do?"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</Label>
                  <Input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="New York, NY"
                  />
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Timezone</Label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                  >
                    {TIMEZONES.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Currency</Label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Team Size</h2>
            <p className="text-sm text-muted-foreground mb-6">How many people will use this workspace?</p>
            <div className="rounded-xl border border-border bg-card p-6">
              <Label className="mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Number of team members</Label>
              <Input
                type="number"
                min="1"
                max="999"
                value={teamSize}
                onChange={e => setTeamSize(parseInt(e.target.value) || 1)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground mt-2">You can always change this later in settings.</p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Your Workspace Preview</h2>
            <p className="text-sm text-muted-foreground mb-6">Here is what your dashboard will look like.</p>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: selectedProf ? `${professions.find(p => p.id === selectedProfession)?.color}15` : '#f3f4f6' }}
                >
                  {selectedProf ? ICON_MAP[selectedProf.icon] || selectedProf.icon : ''}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{businessName || 'My Business'}</h3>
                  <p className="text-xs text-muted-foreground">{selectedProf?.name} &middot; {location || 'No location set'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">0</p>
                  <p className="text-[10px] text-muted-foreground">Contacts</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">0</p>
                  <p className="text-[10px] text-muted-foreground">Appointments</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">0</p>
                  <p className="text-[10px] text-muted-foreground">Tasks</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">$0</p>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Modules enabled:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['contacts', 'appointments', 'tasks', 'invoices', 'workflows'].map(m => (
                    <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
            className="cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canNext()}
              className="cursor-pointer"
            >
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
