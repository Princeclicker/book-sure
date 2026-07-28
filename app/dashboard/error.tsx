'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Dashboard Error</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong loading your dashboard. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
