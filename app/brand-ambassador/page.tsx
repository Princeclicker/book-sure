import Link from 'next/link'
import { ArrowLeft, Star, Users, Share2, Megaphone, CheckCircle2 } from 'lucide-react'

export default function BrandAmbassadorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        <div className="text-center mb-12">
          <Star className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Brand Ambassador Program</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Love BookSure? Become a brand ambassador and earn rewards while spreading the word.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Share2, title: 'Share Your Link', desc: 'Get a unique referral link to share with your network.' },
            { icon: Megaphone, title: 'Exclusive Access', desc: 'Early access to new features and beta programs.' },
          ].map(b => (
            <div key={b.title} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <b.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-6">Join our brand ambassador program today and start earning.</p>
          <Link href="/contact" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">Apply as Ambassador</Link>
        </div>
      </div>
    </div>
  )
}
