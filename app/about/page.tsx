import Link from 'next/link'
import { ArrowLeft, CalendarClock, Target, Eye, HeartHandshake } from 'lucide-react'

const values = [
  { icon: Target, title: 'Our Mission', desc: 'To simplify scheduling for businesses worldwide by providing an intuitive, reliable, and accessible booking platform.' },
  { icon: Eye, title: 'Our Vision', desc: 'A world where no appointment is missed, no time is wasted, and every business can manage bookings effortlessly.' },
  { icon: HeartHandshake, title: 'Our Values', desc: 'Reliability, simplicity, and customer-first approach in everything we build.' },
]

const team = [
  { name: 'Jean-Pierre Habimana', role: 'CEO & Founder', bio: 'Former engineer with 10+ years in SaaS. Built BookSure to solve real scheduling problems.' },
  { name: 'Alice Mukamana', role: 'CTO', bio: 'Full-stack developer passionate about building scalable solutions for African businesses.' },
  { name: 'David Ngabo', role: 'Head of Product', bio: 'Product strategist focused on creating intuitive user experiences.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CalendarClock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">About BookSure</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We&apos;re on a mission to make appointment scheduling effortless for businesses of all sizes.
            Born in Rwanda, serving the world.
          </p>
        </div>

        {/* Story */}
        <div className="rounded-xl border border-border bg-card p-8 mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our Story</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              BookSure was founded in 2024 with a simple observation: businesses in Africa were struggling
              with missed appointments and inefficient scheduling. Existing solutions were either too expensive,
              too complex, or didn&apos;t support local needs like mobile money and SMS.
            </p>
            <p>
              We built BookSure to bridge this gap. Starting with support for MTN and Airtel SMS, we grew
              to offer Google Calendar integration, custom branding, and team scheduling. Today, BookSure
              serves hundreds of businesses across 30+ countries.
            </p>
            <p>
              Our commitment remains the same: build simple, reliable tools that help businesses grow.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {values.map(v => (
            <div key={v.title} className="rounded-xl border border-border bg-card p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{v.title}</h3>
              <p className="text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>

        {/* Team */}
        <div className="rounded-xl border border-border bg-card p-8 mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Our Team</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {team.map(m => (
              <div key={m.name} className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">{m.name.charAt(0)}</span>
                </div>
                <h3 className="font-semibold text-foreground">{m.name}</h3>
                <p className="text-xs text-primary font-medium mb-2">{m.role}</p>
                <p className="text-xs text-muted-foreground">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-8 rounded-xl bg-muted/50 border border-border">
          <h2 className="text-xl font-bold text-foreground mb-2">Want to be part of our story?</h2>
          <p className="text-sm text-muted-foreground mb-4">We&apos;re always looking for talented people.</p>
          <Link href="/contact" className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  )
}
