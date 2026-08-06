import { redirect } from 'next/navigation'
import { getAdminUser, getSetting } from '@/lib/admin'
import { integrationStatus } from '@/lib/admin-catalog'
import { Badge, statusTone } from '@/components/admin/badge'
import { PageHeader, Card } from '@/components/admin/page'
import { Plug, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

const KIND_LABEL: Record<string, string> = {
  calendar: 'Calendar',
  email: 'Email',
  sms: 'SMS',
  payments: 'Payments',
  ai: 'AI',
  webhook: 'Webhook',
}

export default async function AdminIntegrationsPage() {
  const admin = await getAdminUser()
  if (!admin) redirect('/sign-in')

  const settings: Record<string, unknown> = {
    stripe: await getSetting('stripeEnabled', false),
    paypal: await getSetting('paypalEnabled', false),
    flutterwave: await getSetting('flutterwaveEnabled', false),
    paystack: await getSetting('paystackEnabled', false),
    webhooks: await getSetting('webhooksEnabled', false),
  }

  const integrations = integrationStatus(settings)
  const configuredCount = integrations.filter((i) => i.configured).length

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connectivity between BookSure and external services."
        actions={
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Plug className="h-4 w-4" /> {configuredCount}/{integrations.length} configured
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((i) => (
          <Card key={i.key} title={i.label}>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <Badge tone="blue">{KIND_LABEL[i.kind] ?? i.kind}</Badge>
                {i.configured ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Not configured
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{i.description}</p>
              {!i.configured && (
                <p className="text-xs text-muted-foreground">
                  Configure via environment variables in the hosting provider (e.g. Vercel).
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Card title="Notes">
          <div className="p-4 text-sm text-muted-foreground space-y-2">
            <p>
              Credentials for Google Calendar, SMTP, Twilio and AI providers are read from environment
              variables. Gateway switches (Stripe, PayPal, Flutterwave, Paystack, Webhooks) can be flipped
              in <a href="/admin/settings" className="text-primary hover:underline">Settings</a>.
            </p>
            <p className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Twilio is enabled when <code className="text-xs bg-muted px-1 rounded">TWILIO_ACCOUNT_SID</code>,
              <code className="text-xs bg-muted px-1 rounded">TWILIO_AUTH_TOKEN</code> and
              <code className="text-xs bg-muted px-1 rounded">TWILIO_PHONE_NUMBER</code> are present.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
