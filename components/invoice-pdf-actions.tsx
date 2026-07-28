'use client'

import { useState } from 'react'
import { Download, Printer, Loader2 } from 'lucide-react'
import { generateInvoicePdf } from '@/app/actions/invoices'

export function InvoicePdfActions({ invoiceId }: { invoiceId: number }) {
  const [generating, setGenerating] = useState(false)

  async function handleDownload() {
    setGenerating(true)
    try {
      const { pdf, filename } = await generateInvoicePdf(invoiceId)
      const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
    }
    setGenerating(false)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleDownload}
        disabled={generating}
        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
      >
        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {generating ? 'Generating...' : 'Download PDF'}
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <Printer className="w-4 h-4" /> Print
      </button>
    </div>
  )
}
