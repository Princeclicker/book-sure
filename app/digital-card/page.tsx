'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarClock, CheckCircle2, Copy, Edit } from 'lucide-react'
import { DigitalCard } from '@/components/digital-card'

export default function DigitalBusinessCardPage() {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [twitter, setTwitter] = useState('')
  const [instagram, setInstagram] = useState('')
  const [youtube, setYoutube] = useState('')
  const [useLogo, setUseLogo] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [logoLoading, setLogoLoading] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cardUrl, setCardUrl] = useState('')
  const urlRef = useRef<HTMLInputElement>(null)

  function getFaviconUrl(url: string) {
    try {
      const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch {
      return ''
    }
  }

  function handleWebsiteChange(value: string) {
    setWebsite(value)
    setLogoError(false)
    if (useLogo && value.trim()) {
      setLogoLoading(true)
      setLogoUrl(getFaviconUrl(value))
    } else {
      setLogoUrl('')
    }
  }

  function handleUseLogoToggle() {
    const next = !useLogo
    setUseLogo(next)
    setLogoError(false)
    if (next && website.trim()) {
      setLogoLoading(true)
      setLogoUrl(getFaviconUrl(website))
    } else {
      setLogoUrl('')
    }
  }

  function handleGenerate() {
    if (!name.trim()) return
    const params = new URLSearchParams({ name, title, email, phone, website, address, city, linkedin, twitter, instagram, youtube })
    if (useLogo && logoUrl && !logoError) {
      params.set('logo', logoUrl)
    }
    setCardUrl(`${window.location.origin}/digital-card/view?${params.toString()}`)
    setShowCard(true)
  }

  function copyLink() {
    if (!cardUrl) return
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cardUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => fallbackCopy())
    } else {
      fallbackCopy()
    }
  }

  function fallbackCopy() {
    if (urlRef.current) {
      urlRef.current.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <CalendarClock className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Digital Business Card</h1>
          <p className="text-muted-foreground">Create a professional digital business card to share with anyone.</p>
        </div>

        {!showCard && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Job Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="CEO" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="+1 234 567 890" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Street Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="123 Main Street" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City & Postal Code</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Kigali, 00000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website</label>
              <input type="url" value={website} onChange={e => handleWebsiteChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="https://..." />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <button type="button" onClick={handleUseLogoToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${useLogo ? 'bg-primary' : 'bg-input'}`}>
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${useLogo ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Use website logo</p>
                <p className="text-xs text-muted-foreground">Auto-fetch favicon from your website URL</p>
              </div>
              {useLogo && logoLoading && !logoError && (
                <div className="w-6 h-6 rounded border border-border bg-background flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
              {useLogo && logoUrl && !logoError && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded"
                  onLoad={() => setLogoLoading(false)}
                  onError={() => { setLogoLoading(false); setLogoError(true) }} />
              )}
              {useLogo && logoError && (
                <span className="text-xs text-muted-foreground">No logo found</span>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground mb-3">Social Media Links</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">LinkedIn</label>
                  <input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="https://linkedin.com/in/..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">X / Twitter</label>
                  <input type="url" value={twitter} onChange={e => setTwitter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="https://x.com/..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Instagram</label>
                  <input type="url" value={instagram} onChange={e => setInstagram(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">YouTube</label>
                  <input type="url" value={youtube} onChange={e => setYoutube(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="https://youtube.com/..." />
                </div>
              </div>
            </div>

            <button type="button" onClick={handleGenerate} disabled={!name.trim()}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
              Generate Card
            </button>
          </div>
        )}

        {showCard && (
          <div className="space-y-6">
            <div className="rounded-xl overflow-hidden border border-border">
              <DigitalCard
                name={name} title={title} email={email} phone={phone}
                website={website} address={address} city={city}
                logo={logoUrl && !logoError ? logoUrl : ''}
                linkedin={linkedin} twitter={twitter} instagram={instagram} youtube={youtube}
                compact
                qrUrl={cardUrl}
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <label className="block text-xs font-medium text-muted-foreground mb-2">Your Shareable Link</label>
                <div className="flex gap-2">
                  <input ref={urlRef} readOnly value={cardUrl}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-muted text-foreground text-xs font-mono" />
                  <button type="button" onClick={copyLink}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer">
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Share this link with anyone to show your digital business card.</p>
              </div>

              <div className="flex gap-3">
                {cardUrl && (
                  <a href={cardUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg font-medium text-sm text-foreground hover:bg-accent transition-colors">
                    Preview Card
                  </a>
                )}
                <button type="button" onClick={() => setShowCard(false)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg font-medium text-sm text-foreground hover:bg-accent transition-colors cursor-pointer">
                  <Edit className="w-4 h-4" /> Edit Card
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
