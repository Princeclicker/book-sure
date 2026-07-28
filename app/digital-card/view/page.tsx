'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CalendarClock, Loader2 } from 'lucide-react'
import { DigitalCard } from '@/components/digital-card'

function CardView() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') || ''
  const title = searchParams.get('title') || ''
  const email = searchParams.get('email') || ''
  const phone = searchParams.get('phone') || ''
  const website = searchParams.get('website') || ''
  const address = searchParams.get('address') || ''
  const city = searchParams.get('city') || ''
  const logo = searchParams.get('logo') || ''
  const linkedin = searchParams.get('linkedin') || ''
  const twitter = searchParams.get('twitter') || ''
  const instagram = searchParams.get('instagram') || ''
  const youtube = searchParams.get('youtube') || ''

  if (!name) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
        <div className="text-center">
          <CalendarClock className="w-10 h-10 text-white/40 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white mb-2">No Card Found</h1>
          <p className="text-sm text-white/50 mb-6">This link does not contain valid card information.</p>
          <Link href="/digital-card" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00b4d8] text-white rounded-lg font-medium text-sm hover:bg-[#00b4d8]/80 transition-opacity">
            Create Your Card
          </Link>
        </div>
      </div>
    )
  }

  const qrUrl = typeof window !== 'undefined' ? window.location.href : ''

  return <DigitalCard name={name} title={title} email={email} phone={phone} website={website} address={address} city={city} logo={logo} linkedin={linkedin} twitter={twitter} instagram={instagram} youtube={youtube} qrUrl={qrUrl} />
}

export default function DigitalCardViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    }>
      <CardView />
    </Suspense>
  )
}
