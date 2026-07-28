import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarClock, Smartphone, Globe, Palette, ShieldCheck, Users, Clock, BarChart3, Zap } from 'lucide-react'

const industryData: Record<string, { name: string; icon: string; desc: string; features: string[]; benefits: string[] }> = {
  sales: {
    name: 'Sales',
    icon: '💰',
    desc: 'Streamline client meetings, demos, and follow-ups. Close deals faster with automated scheduling.',
    features: ['Client meeting booking', 'Demo scheduling', 'Automated follow-ups', 'Team round-robin', 'CRM integrations'],
    benefits: ['Reduce no-shows by 80%', 'Close deals 2x faster', 'Never miss a follow-up', 'Professional branding'],
  },
  marketing: {
    name: 'Marketing',
    icon: '📢',
    desc: 'Schedule campaign meetings, content reviews, and client presentations effortlessly.',
    features: ['Campaign scheduling', 'Client presentations', 'Team coordination', 'Branded booking pages', 'Workflow automation'],
    benefits: ['Streamlined campaign planning', 'Professional client experience', 'Automated reminders', 'Team availability pooling'],
  },
  healthcare: {
    name: 'Healthcare',
    icon: '🏥',
    desc: 'Manage patient appointments, reduce no-shows, and streamline your practice.',
    features: ['Patient booking', 'SMS reminders', 'Calendar sync', 'Buffer times', 'Multi-provider scheduling'],
    benefits: ['Reduce no-shows by 80%', 'Save admin time', 'HIPAA-compliant', 'Better patient experience'],
  },
  recruiting: {
    name: 'Recruiting',
    icon: '👥',
    desc: 'Coordinate candidate interviews and screening calls with ease.',
    features: ['Interview scheduling', 'Candidate self-booking', 'Team availability', 'Automated reminders', 'Feedback collection'],
    benefits: ['Faster hiring process', 'Better candidate experience', 'Less admin work', 'Team coordination'],
  },
  education: {
    name: 'Education',
    icon: '📚',
    desc: 'Schedule parent-teacher conferences, tutoring sessions, and academic meetings.',
    features: ['Parent-teacher conferences', 'Tutoring sessions', 'Academic advising', 'Group sessions', 'Automated reminders'],
    benefits: ['Better parent engagement', 'Organized scheduling', 'Reduced admin burden', 'Professional image'],
  },
  'real-estate': {
    name: 'Real Estate',
    icon: '🏠',
    desc: 'Schedule property viewings, client meetings, and open houses effortlessly.',
    features: ['Property viewing booking', 'Open house scheduling', 'Client consultations', 'Automated follow-ups', 'Team calendar'],
    benefits: ['Never miss a showing', 'Professional branding', 'Automated reminders', 'Team coordination'],
  },
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const industry = industryData[slug]

  if (!industry) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        <div className="text-center mb-12">
          <span className="text-5xl mb-4 block">{industry.icon}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Solutions for {industry.name}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{industry.desc}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-8 mb-12">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Key Features</h2>
            <ul className="space-y-3">
              {industry.features.map(f => (
                <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Benefits</h2>
            <ul className="space-y-3">
              {industry.benefits.map(b => (
                <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-primary/5 border border-primary/20 p-8 text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Ready to Transform Your {industry.name} Workflow?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Start for free today.</p>
          <Link href="/sign-up" className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:opacity-90 transition-opacity">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  )
}
