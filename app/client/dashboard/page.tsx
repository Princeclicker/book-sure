import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ClientDashboardRootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Access Required</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Please use the link from your confirmation email to access your appointments.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Your unique access link looks like: <code className="text-xs bg-muted px-1 py-0.5 rounded">/client/dashboard/your-business/abc123</code>
        </p>
        <div className="space-y-3">
          <Link href="/" className="inline-block text-sm text-primary hover:underline">
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
