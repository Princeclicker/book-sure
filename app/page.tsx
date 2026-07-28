import Link from 'next/link'
import { CalendarClock, Smartphone, Globe, Palette, ShieldCheck, Users, Clock, BarChart3, Zap, Mail, Phone, MapPin, ChevronDown } from 'lucide-react'
import { LocaleSwitcher } from '@/components/locale-switcher'

const industries = [
  { name: 'Sales', desc: 'Streamline client meetings and demos', icon: '💰' },
  { name: 'Marketing', desc: 'Schedule campaigns and reviews', icon: '📢' },
  { name: 'Healthcare', desc: 'Manage patient appointments', icon: '🏥' },
  { name: 'Recruiting', desc: 'Coordinate candidate interviews', icon: '👥' },
  { name: 'Education', desc: 'Book parent-teacher conferences', icon: '📚' },
  { name: 'Real Estate', desc: 'Schedule property viewings', icon: '🏠' },
]

const coreFeatures = [
  {
    icon: CalendarClock,
    title: 'My Calendar',
    desc: 'Seamlessly integrate your schedule with Google Calendar. Spend less time planning and more time accomplishing tasks.',
  },
  {
    icon: Clock,
    title: 'Availability Preference',
    desc: 'Full control over your schedule with granular availability tools, scheduling rules, and buffers.',
  },
  {
    icon: Users,
    title: 'Team Schedule',
    desc: 'Maximize team efficiency with pooled scheduling availability. Offer diverse time slots.',
  },
  {
    icon: Globe,
    title: 'Calendar Connection',
    desc: 'Sync up to 6 calendars per user. Keep all appointments in harmony across personal and professional calendars.',
  },
  {
    icon: Zap,
    title: 'Workflows & Automation',
    desc: 'Automate personalized communication. Send customised emails and texts before and after meetings.',
  },
  {
    icon: BarChart3,
    title: 'Routing Forms',
    desc: 'Capture information from leads and route them effectively based on their responses.',
  },
  {
    icon: Palette,
    title: 'Personal Branding',
    desc: 'Showcase your brand with custom colours, logo, and profile picture on your booking page.',
  },
  {
    icon: Smartphone,
    title: 'Smart Reminders',
    desc: 'Never miss an appointment with SMS and email reminders. Always stay on top of your schedule.',
  },
  {
    icon: ShieldCheck,
    title: 'Data Security',
    desc: 'Prioritize secured management of all data through rigorous encryption protocols.',
  },
]

const regions = [
  { name: 'North America', phone: '+1 (347) 632-2241', flag: '🇺🇸' },
  { name: 'Europe', phone: '+1 (516) 856-6499', flag: '🇪🇺' },
  { name: 'United Kingdom', phone: '+44 (757) 663-399', flag: '🇬🇧' },
  { name: 'Middle East', phone: '+971 50 384 7684', flag: '🇦🇪' },
  { name: 'Africa', phone: '+250 780 000 000', flag: '🇷🇼' },
  { name: 'Asia Pacific', phone: '+91 8000 334444', flag: '🇮🇳' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">BookSure</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                Solutions <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none group-hover:pointer-events-auto">
                <div className="p-2 space-y-1">
                  {industries.map(ind => (
                    <Link key={ind.name} href={`/solutions/${ind.name.toLowerCase().replace(/\s+/g, '-')}`} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                      {ind.icon} {ind.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/partner" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Partner</Link>
            <Link href="/brand-ambassador" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ambassador</Link>
            <Link href="/digital-card" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Digital Card</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Sign In</Link>
            <Link href="/sign-up" className="text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">Get Started Free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center relative">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6 leading-tight">
            Scheduling Made{' '}
            <span className="text-primary">Simple</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            The 7-in-1 booking platform. Simplify your calendar and easily schedule events
            without the need for back-and-forth emails to find the perfect time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up" className="px-8 py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
              Start Free Trial
            </Link>
            <Link href="#how-it-works" className="px-8 py-3.5 border border-border text-foreground rounded-lg font-semibold text-base hover:bg-muted transition-colors">
              See How It Works
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">Get started in minutes. It&apos;s free.</p>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {[
              { label: 'Appointments Scheduled', value: '10K+' },
              { label: 'Active Businesses', value: '500+' },
              { label: 'SMS Sent', value: '50K+' },
              { label: 'Countries Reached', value: '30+' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions by Industry */}
      <section className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Solutions</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Automated Scheduling For Every Industry</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A smart way to plan ahead, stay ahead, and achieve more. Experience seamless integration
              with Google Calendar and more.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map(ind => (
              <Link key={ind.name} href={`/solutions/${ind.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-md transition-all group">
                <span className="text-3xl mb-3 block">{ind.icon}</span>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{ind.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{ind.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete suite of tools to manage your appointments, team, and clients.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreFeatures.map(feature => (
              <div key={feature.title} className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-4">How It Works</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">Get started in minutes, not hours.</p>
          <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up in 30 seconds. Set your working hours and connect Google Calendar.' },
              { step: '02', title: 'Share Your Link', desc: 'Share your unique booking link on WhatsApp, social media, or embed it on your website.' },
              { step: '03', title: 'Get Booked', desc: 'Customers book online automatically. You get SMS confirmations and calendar sync.' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mx-auto mb-4">{item.step}</div>
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Offices */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Global</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Our Offices Worldwide</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Serving businesses across the globe with local support.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {regions.map(region => (
              <div key={region.name} className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
                <span className="text-3xl">{region.flag}</span>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{region.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{region.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready to Stop Missing Appointments?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join hundreds of businesses using BookSure to automate bookings and grow their business.
          </p>
          <Link href="/sign-up" className="inline-block px-8 py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CalendarClock className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-foreground">BookSure</span>
              </div>
              <p className="text-sm text-muted-foreground">Smart appointment booking for businesses everywhere. Automate scheduling and never miss a booking.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3 text-sm">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link href="/partner" className="hover:text-foreground transition-colors">Partner Program</Link></li>
                <li><Link href="/brand-ambassador" className="hover:text-foreground transition-colors">Ambassador</Link></li>
                <li><Link href="/digital-card" className="hover:text-foreground transition-colors">Digital Card</Link></li>
                <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3 text-sm">Solutions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {industries.slice(0, 6).map(ind => (
                  <li key={ind.name}><Link href={`/solutions/${ind.name.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-foreground transition-colors">{ind.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3 text-sm">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> support@booksure.rw</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +1 (347) 632-2241</li>
                <li className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Kigali, Rwanda</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BookSure. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
