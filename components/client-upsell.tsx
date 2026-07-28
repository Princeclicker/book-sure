import { getContrastText } from '@/lib/brand-utils'

interface ClientUpsellProps {
  brandColor?: string
}

export function ClientUpsell({ brandColor = '#3b82f6' }: ClientUpsellProps) {
  const textColor = getContrastText(brandColor)

  return (
    <div
      className="rounded-xl p-6 sm:p-8 text-center mt-10"
      style={{ backgroundColor: brandColor }}
    >
      <h2 className="text-lg font-bold mb-2" style={{ color: textColor }}>
        Own a business?
      </h2>
      <p className="text-sm mb-4 opacity-90" style={{ color: textColor }}>
        Create your own booking page, send SMS reminders, and manage appointments effortlessly.
      </p>
      <a
        href="/signup?ref=client_portal"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:brightness-90"
        style={{
          backgroundColor: textColor,
          color: brandColor,
        }}
      >
        Get Started Free
      </a>
    </div>
  )
}
