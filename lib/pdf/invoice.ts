import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib'
import type { ProfessionId } from '@/lib/profession'
import { getTerminology } from '@/lib/profession'

export interface InvoicePDFData {
  invoiceNumber: string
  status: string
  createdAt: Date
  dueDate: Date | null
  paidAt: Date | null
  notes: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  currency: string
  lineItems: Array<{
    description: string
    quantity: number
    unitPrice: number
    amount: number
  }>
  payments: Array<{
    amount: number
    paymentMethod: string
    reference: string | null
    paidAt: Date
  }>
}

export interface InvoicePDFBusiness {
  name: string
  slug: string
  brandColor?: string
  logoUrl?: string
  location?: string
}

export interface InvoicePDFContact {
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

function formatCurrency(amount: number, currency: string = 'USD'): string {
  const formatted = (amount / 100).toFixed(2)
  switch (currency) {
    case 'USD': return `$${formatted}`
    case 'EUR': return `\u20AC${formatted}`
    case 'GBP': return `\u00A3${formatted}`
    case 'RWF': return `RWF ${formatted}`
    default: return `${currency} ${formatted}`
  }
}

function getStatusColor(status: string): ReturnType<typeof rgb> {
  switch (status) {
    case 'paid': return rgb(0.06, 0.73, 0.51) // green
    case 'partial': return rgb(0.96, 0.62, 0.04) // amber
    case 'sent': return rgb(0.24, 0.52, 0.96) // blue
    case 'overdue': return rgb(0.96, 0.26, 0.21) // red
    case 'draft': return rgb(0.55, 0.55, 0.55) // gray
    default: return rgb(0.55, 0.55, 0.55)
  }
}

export async function generateInvoicePDF(
  invoice: InvoicePDFData,
  business: InvoicePDFBusiness,
  contact: InvoicePDFContact,
  profession: ProfessionId
): Promise<Uint8Array> {
  const terms = getTerminology(profession)
  const doc = await PDFDocument.create()
  const page = doc.addPage(PageSizes.A4)
  const { width, height } = page.getSize()

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)

  const margin = 50
  const contentWidth = width - margin * 2
  let y = height - margin

  const brandColor = business.brandColor
    ? hexToRgb(business.brandColor)
    : rgb(0.24, 0.52, 0.96)

  // --- Header: Business Name + Invoice Title ---
  page.drawText(business.name, {
    x: margin,
    y,
    size: 22,
    font: fontBold,
    color: brandColor,
  })

  const titleText = terms.invoice.toUpperCase()
  const titleWidth = fontBold.widthOfTextAtSize(titleText, 14)
  page.drawText(titleText, {
    x: width - margin - titleWidth,
    y,
    size: 14,
    font: fontBold,
    color: brandColor,
  })

  y -= 8
  page.drawRectangle({
    x: margin,
    y,
    width: contentWidth,
    height: 2,
    color: brandColor,
  })
  y -= 25

  // --- Invoice Details + Status ---
  const statusText = invoice.status.toUpperCase()
  const statusWidth = fontBold.widthOfTextAtSize(statusText, 10)
  const statusBgWidth = statusWidth + 16
  const statusBgX = width - margin - statusBgWidth

  page.drawRectangle({
    x: statusBgX,
    y: y - 4,
    width: statusBgWidth,
    height: 18,
    color: getStatusColor(invoice.status),
    opacity: 0.15,
  })
  page.drawText(statusText, {
    x: statusBgX + 8,
    y,
    size: 10,
    font: fontBold,
    color: getStatusColor(invoice.status),
  })

  const labelSize = 9
  const valueSize = 10
  const detailX = margin
  const detailY = y

  page.drawText(`${terms.invoice} #:`, { x: detailX, y: detailY, size: labelSize, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(invoice.invoiceNumber, { x: detailX, y: detailY - 14, size: valueSize, font: fontBold })

  page.drawText('Date:', { x: detailX + 120, y: detailY, size: labelSize, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
  page.drawText(formatDate(invoice.createdAt), { x: detailX + 120, y: detailY - 14, size: valueSize, font })

  if (invoice.dueDate) {
    page.drawText('Due:', { x: detailX + 240, y: detailY, size: labelSize, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
    page.drawText(formatDate(invoice.dueDate), { x: detailX + 240, y: detailY - 14, size: valueSize, font })
  }

  y -= 50

  // --- From / To ---
  const colWidth = contentWidth / 2

  page.drawText('From:', { x: margin, y, size: labelSize, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
  y -= 14
  page.drawText(business.name, { x: margin, y, size: valueSize, font: fontBold })
  if (business.location) {
    y -= 14
    page.drawText(business.location, { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) })
  }

  let toY = y + 14 + (business.location ? 14 : 0)
  page.drawText(`Bill To:`, { x: margin + colWidth, y: toY, size: labelSize, font: fontItalic, color: rgb(0.4, 0.4, 0.4) })
  toY -= 14
  page.drawText(contact.name, { x: margin + colWidth, y: toY, size: valueSize, font: fontBold })
  if (contact.company) {
    toY -= 14
    page.drawText(contact.company, { x: margin + colWidth, y: toY, size: 9, font })
  }
  if (contact.email) {
    toY -= 14
    page.drawText(contact.email, { x: margin + colWidth, y: toY, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
  }
  if (contact.phone) {
    toY -= 14
    page.drawText(contact.phone, { x: margin + colWidth, y: toY, size: 9, font, color: rgb(0.4, 0.4, 0.4) })
  }

  y = Math.min(y, toY) - 30

  // --- Line Items Table ---
  const tableHeaders = ['Description', 'Qty', 'Unit Price', 'Amount']
  const colPositions = [
    margin,
    margin + contentWidth * 0.55,
    margin + contentWidth * 0.7,
    margin + contentWidth * 0.85,
  ]

  // Table header background
  page.drawRectangle({
    x: margin,
    y: y - 4,
    width: contentWidth,
    height: 20,
    color: brandColor,
    opacity: 0.1,
  })

  tableHeaders.forEach((header, i) => {
    page.drawText(header, {
      x: colPositions[i],
      y,
      size: 9,
      font: fontBold,
      color: brandColor,
    })
  })

  y -= 20
  page.drawRectangle({
    x: margin,
    y,
    width: contentWidth,
    height: 1,
    color: rgb(0.85, 0.85, 0.85),
  })
  y -= 4

  // Table rows
  for (const item of invoice.lineItems) {
    y -= 16

    const descLines = wrapText(item.description, font, 9, colPositions[1] - margin - 10)
    for (const line of descLines) {
      page.drawText(line, { x: colPositions[0], y, size: 9, font })
      y -= 12
    }
    y += 12 // compensate for last extra line

    page.drawText(item.quantity.toString(), { x: colPositions[1], y, size: 9, font })
    page.drawText(formatCurrency(item.unitPrice, invoice.currency), { x: colPositions[2], y, size: 9, font })
    page.drawText(formatCurrency(item.amount, invoice.currency), { x: colPositions[3], y, size: 9, font: fontBold })

    y -= 4
    page.drawRectangle({
      x: margin,
      y,
      width: contentWidth,
      height: 0.5,
      color: rgb(0.92, 0.92, 0.92),
    })
  }

  y -= 20

  // --- Totals ---
  const totalsX = margin + contentWidth * 0.65
  const totalsValueX = margin + contentWidth * 0.85

  page.drawText('Subtotal:', { x: totalsX, y, size: 9, font })
  page.drawText(formatCurrency(invoice.subtotal, invoice.currency), { x: totalsValueX, y, size: 9, font })

  if (invoice.taxRate > 0) {
    y -= 16
    page.drawText(`Tax (${invoice.taxRate}%):`, { x: totalsX, y, size: 9, font })
    page.drawText(formatCurrency(invoice.taxAmount, invoice.currency), { x: totalsValueX, y, size: 9, font })
  }

  y -= 20
  page.drawRectangle({
    x: totalsX,
    y,
    width: contentWidth - (totalsX - margin),
    height: 1.5,
    color: brandColor,
  })
  y -= 18

  page.drawText('Total:', { x: totalsX, y, size: 11, font: fontBold, color: brandColor })
  page.drawText(formatCurrency(invoice.total, invoice.currency), { x: totalsValueX, y, size: 11, font: fontBold, color: brandColor })

  y -= 30

  // --- Payment History ---
  if (invoice.payments.length > 0) {
    page.drawText(`${terms.paymentPlural} Received`, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: brandColor,
    })
    y -= 16

    for (const payment of invoice.payments) {
      page.drawText(formatDate(payment.paidAt), { x: margin, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) })
      page.drawText(formatCurrency(payment.amount, invoice.currency), { x: margin + 100, y, size: 8, font: fontBold })
      page.drawText(payment.paymentMethod.replace('_', ' '), { x: margin + 200, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) })
      if (payment.reference) {
        page.drawText(`Ref: ${payment.reference}`, { x: margin + 320, y, size: 8, font: fontItalic, color: rgb(0.5, 0.5, 0.5) })
      }
      y -= 14
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = invoice.total - totalPaid

    if (remaining > 0) {
      y -= 4
      page.drawText(`Balance Due:`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.96, 0.26, 0.21) })
      page.drawText(formatCurrency(remaining, invoice.currency), { x: margin + 100, y, size: 9, font: fontBold, color: rgb(0.96, 0.26, 0.21) })
    } else {
      y -= 4
      page.drawText(`Paid in Full`, { x: margin, y, size: 9, font: fontBold, color: rgb(0.06, 0.73, 0.51) })
    }

    y -= 20
  }

  // --- Notes ---
  if (invoice.notes) {
    y -= 10
    page.drawText('Notes:', { x: margin, y, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) })
    y -= 14
    const noteLines = wrapText(invoice.notes, font, 9, contentWidth)
    for (const line of noteLines) {
      page.drawText(line, { x: margin, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) })
      y -= 12
    }
  }

  // --- Footer ---
  page.drawRectangle({
    x: margin,
    y: margin + 20,
    width: contentWidth,
    height: 1,
    color: rgb(0.88, 0.88, 0.88),
  })

  const footerText = `${business.name} | ${terms.invoice}: ${invoice.invoiceNumber}`
  const footerWidth = font.widthOfTextAtSize(footerText, 8)
  page.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: margin + 8,
    size: 8,
    font: fontItalic,
    color: rgb(0.6, 0.6, 0.6),
  })

  return doc.save()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function wrapText(text: string, font: typeof StandardFonts.Helvetica extends never ? any : any, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, size)

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines.length > 0 ? lines : [text]
}

function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return rgb(0.24, 0.52, 0.96)
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  )
}
