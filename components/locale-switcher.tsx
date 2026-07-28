'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'
import { supportedLocales, localeNames, getTranslations, getLocale, type Locale, type TranslationKey } from '@/lib/i18n'

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return getLocale(localStorage.getItem('booksure-locale') || 'en')
    }
    return 'en'
  })

  const setAndSaveLocale = (l: Locale) => {
    setLocale(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem('booksure-locale', l)
    }
    window.location.reload()
  }

  return { locale, setLocale: setAndSaveLocale, t: getTranslations(locale) }
}

export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return getLocale(localStorage.getItem('booksure-locale') || 'en')
    }
    return 'en'
  })

  function switchLocale(l: Locale) {
    localStorage.setItem('booksure-locale', l)
    window.location.reload()
  }

  return (
    <div className={`relative ${className}`}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <Globe className="w-4 h-4" />
        <span>{localeNames[locale]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-40 rounded-lg border border-border bg-card shadow-lg z-20">
            <div className="p-1">
              {supportedLocales.map(l => (
                <button key={l} onClick={() => switchLocale(l)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                    locale === l ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}>
                  {localeNames[l]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
