'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, Globe, MapPin } from 'lucide-react'
import QRCode from 'qrcode'

interface DigitalCardProps {
  name: string
  title: string
  email: string
  phone: string
  website: string
  address: string
  city: string
  logo: string
  linkedin: string
  twitter: string
  instagram: string
  youtube: string
  compact?: boolean
  qrUrl?: string
}

export function DigitalCard({ name, title, email, phone, website, address, city, logo, linkedin, twitter, instagram, youtube, compact, qrUrl }: DigitalCardProps) {
  const [logoFailed, setLogoFailed] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const initial = name ? name.charAt(0).toUpperCase() : '?'

  useEffect(() => {
    const url = qrUrl || (typeof window !== 'undefined' ? window.location.href : '')
    if (url && url.trim()) {
      QRCode.toDataURL(url, { width: 128, margin: 1, color: { dark: '#1a1a2e', light: '#ffffff' } })
        .then(setQrDataUrl)
        .catch(() => {})
    }
  }, [qrUrl])

  const socialLinks = [
    { url: linkedin, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
    { url: twitter, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { url: instagram, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg> },
    { url: youtube, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
  ].filter(s => s.url)

  const scale = compact ? 'scale-90 origin-top' : ''

  return (
    <div className={`${compact ? '' : 'min-h-screen '}bg-[#1a1a2e] relative overflow-hidden`}>
      {!compact && (
        <>
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#00b4d8]/20 blur-sm" />
          <div className="absolute top-40 -right-16 w-56 h-56 rounded-full bg-[#ff6b35]/15 blur-sm" />
          <div className="absolute bottom-20 -left-10 w-40 h-40 rounded-full bg-[#00b4d8]/10 blur-sm" />
        </>
      )}

      <div className={`relative z-10 ${compact ? 'p-6' : 'min-h-screen flex items-center justify-center p-6'}`}>
        <div className={`${compact ? 'w-full' : 'w-full max-w-sm'} rounded-3xl bg-[#16213e]/80 backdrop-blur-sm border border-white/10 p-6 ${scale}`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#00b4d8]/20 flex items-center justify-center overflow-hidden border-2 border-[#00b4d8]/40">
                {logo && !logoFailed ? (
                  <img src={logo} alt="Avatar" className="w-full h-full object-cover"
                    onError={() => setLogoFailed(true)} />
                ) : (
                  <span className="text-xl font-bold text-[#00b4d8]">{initial}</span>
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">{name || 'Your Name'}</h1>
                {title && <p className="text-sm text-[#00b4d8] font-medium">{title}</p>}
              </div>
            </div>
            {logo && !logoFailed && (
              <img src={logo} alt="Company Logo" className="w-10 h-10 rounded-lg object-contain border border-white/10"
                onError={() => setLogoFailed(true)} />
            )}
          </div>

          <div className="space-y-3 mb-5">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-[#00b4d8] shrink-0" /> {phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-3 text-sm text-white/80 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-[#00b4d8] shrink-0" /> {email}
              </a>
            )}
            {address && (
              <div className="flex items-start gap-3 text-sm text-white/80">
                <MapPin className="w-4 h-4 text-[#00b4d8] shrink-0 mt-0.5" />
                <div>
                  <div>{address}</div>
                  {city && <div className="text-white/60">{city}</div>}
                </div>
              </div>
            )}
          </div>

          {website && (
            <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-[#ff6b35] hover:text-[#ff8c5a] transition-colors mb-4">
              <Globe className="w-4 h-4 shrink-0" /> {website.replace(/^https?:\/\//, '')}
            </a>
          )}

          {socialLinks.length > 0 && (
            <div className="flex items-center gap-3 mb-5">
              {socialLinks.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-[#00b4d8]/30 hover:text-[#00b4d8] transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 pt-3 border-t border-white/10">
            <a href={website?.startsWith('http') ? website : website ? `https://${website}` : '#'}
              download={name ? `${name.replace(/\s+/g, '_')}_contact.vcf` : undefined}
              onClick={(e) => {
                e.preventDefault()
                const vcard = [
                  'BEGIN:VCARD',
                  'VERSION:3.0',
                  `FN:${name}`,
                  title ? `TITLE:${title}` : '',
                  phone ? `TEL:${phone}` : '',
                  email ? `EMAIL:${email}` : '',
                  address ? `ADR:;;${address}${city ? ';' + city : ''};;` : '',
                  website ? `URL:${website}` : '',
                  'END:VCARD',
                ].filter(Boolean).join('\n')
                const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${(name || 'contact').replace(/\s+/g, '_')}_contact.vcf`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00b4d8] text-white rounded-xl text-sm font-medium hover:bg-[#00b4d8]/80 transition-colors">
              Save Contact
            </a>
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shrink-0">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="w-16 h-16" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
