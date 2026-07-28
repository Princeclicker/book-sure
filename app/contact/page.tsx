import Link from 'next/link'
import { Mail, MessageCircle, MapPin, Phone, ArrowLeft, Globe } from 'lucide-react'

const offices = [
  { region: 'Rwanda (HQ)', flag: '🇷🇼', phone: '+250 780 000 000', email: 'support@booksure.rw', address: 'KG 123 Ave, Downtown, Kigali' },
  { region: 'North America', flag: '🇺🇸', phone: '+1 (347) 632-2241', email: 'na@booksure.rw', address: 'New York, USA' },
  { region: 'Europe', flag: '🇪🇺', phone: '+1 (516) 856-6499', email: 'eu@booksure.rw', address: 'London, UK' },
  { region: 'Middle East', flag: '🇦🇪', phone: '+971 50 384 7684', email: 'me@booksure.rw', address: 'Dubai, UAE' },
  { region: 'India & Asia', flag: '🇮🇳', phone: '+91 8000 334444', email: 'asia@booksure.rw', address: 'Mumbai, India' },
  { region: 'Africa', flag: '🌍', phone: '+250 780 000 000', email: 'africa@booksure.rw', address: 'Multiple locations' },
]

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-3 h-3" /> Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">We&apos;re here to help. Reach out to our team or find your nearest office.</p>
        </div>

        {/* Quick Contact */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground mb-1">Email Us</h2>
            <p className="text-xs text-muted-foreground mb-3">Our team responds within 24 hours</p>
            <a href="mailto:support@booksure.rw" className="text-sm text-primary hover:underline font-medium">support@booksure.rw</a>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground mb-1">WhatsApp</h2>
            <p className="text-xs text-muted-foreground mb-3">Chat with us for quick support</p>
            <a href="https://wa.me/250780000000" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">+250 780 000 000</a>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Phone className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground mb-1">Call Us</h2>
            <p className="text-xs text-muted-foreground mb-3">Mon-Fri 9AM-6PM</p>
            <a href="tel:+13476322241" className="text-sm text-primary hover:underline font-medium">+1 (347) 632-2241</a>
          </div>
        </div>

        {/* Global Offices */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Our Global Offices</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offices.map(office => (
              <div key={office.region} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{office.flag}</span>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{office.region}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{office.phone}</p>
                    <p className="text-xs text-muted-foreground">{office.email}</p>
                    <p className="text-xs text-muted-foreground">{office.address}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-6">Send Us a Message</h2>
          <form className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input type="text" id="name" required className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Your name" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input type="email" id="email" required className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="your@email.com" />
              </div>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
              <input type="text" id="subject" required className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="How can we help?" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">Message</label>
              <textarea id="message" required rows={4} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Your message..." />
            </div>
            <button type="submit" className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer">
              Send Message
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link href="/faq" className="text-primary hover:underline">Check our FAQ</Link> for quick answers to common questions.
        </div>
      </div>
    </div>
  )
}
