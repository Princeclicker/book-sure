import Link from 'next/link'
import { ArrowLeft, Handshake, Users, Globe, Award, CheckCircle2 } from 'lucide-react'

const benefits = [
  { icon: Users, title: 'Dedicated Support', desc: 'Get priority support and dedicated account management.' },
  { icon: Globe, title: 'Global Network', desc: 'Join a global network of partners across 30+ countries.' },
  { icon: Award, title: 'Co-Branding', desc: 'Co-branded marketing materials and joint webinars.' },
]

export default function PartnerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        <div className="text-center mb-12">
          <Handshake className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Become a BookSure Partner</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Join our partner program and refer businesses to BookSure.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {benefits.map(b => (
            <div key={b.title} className="rounded-xl border border-border bg-card p-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-4">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-6 mb-6">
            {[
              { step: '1', title: 'Apply', desc: 'Fill out the partner application form.' },
              { step: '2', title: 'Get Approved', desc: 'We review and approve your application within 48 hours.' },
              { step: '3', title: 'Earn Commissions', desc: 'Refer businesses and earn monthly commissions.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-3">{item.step}</div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/contact" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity">Apply Now</Link>
        </div>
      </div>
    </div>
  )
}
