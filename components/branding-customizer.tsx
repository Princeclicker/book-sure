'use client'

import { useState } from 'react'
import { updateBusinessBranding } from '@/app/actions/branding'

interface BrandingCustomizerProps {
  initialBrandColor?: string
  initialLogoUrl?: string
}

export function BrandingCustomizer({
  initialBrandColor = '#3b82f6',
  initialLogoUrl = '',
}: BrandingCustomizerProps) {
  const [brandColor, setBrandColor] = useState(initialBrandColor)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    setSuccess(false)

    try {
      await updateBusinessBranding({
        brandColor,
        logoUrl,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save branding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const presetColors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' },
  ]

  return (
    <div className="space-y-6">
      {/* Brand Color */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-4">
          Brand Color
        </label>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-16 h-16 rounded cursor-pointer border-2 border-border"
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Color</p>
              <p className="font-mono text-sm font-semibold text-foreground">{brandColor}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Preset Colors</p>
            <div className="flex flex-wrap gap-3">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setBrandColor(color.value)}
                  className={`w-12 h-12 rounded-lg border-2 transition-all ${
                    brandColor === color.value ? 'border-foreground' : 'border-border'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="border-t border-border pt-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          Business Logo
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Upload a logo to display on your public booking page
        </p>

        <div className="space-y-4">
          {logoUrl && (
            <div className="relative w-32 h-32 border border-border rounded-lg overflow-hidden bg-background p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Business Logo"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => setLogoUrl('')}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
              >
                ×
              </button>
            </div>
          )}

          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Enter logo image URL"
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Recommended: 200x200px PNG or JPG
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="border-t border-border pt-6">
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-800 dark:text-green-200">
              Branding updated successfully!
            </p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Branding Settings'}
        </button>
      </div>

      {/* Preview */}
      <div className="border-t border-border pt-6">
        <p className="text-sm font-medium text-foreground mb-3">Preview</p>
        <div className="p-4 border border-border rounded-lg bg-background">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Button Style</p>
              <button
                style={{ backgroundColor: brandColor }}
                className="px-4 py-2 text-white rounded-lg font-semibold text-sm"
              >
                Book Appointment
              </button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Link Color</p>
              <a href="#" style={{ color: brandColor }} className="text-sm font-semibold hover:opacity-80">
                View Schedule
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
