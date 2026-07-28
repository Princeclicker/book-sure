'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { invoices, invoiceItems, payments, contacts, businesses, businessProfiles } from '@/lib/db/tables'
import { eq, and, sql, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { generateInvoicePDF } from '@/lib/pdf/invoice'
import { getTerminology } from '@/lib/profession'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getInvoices(opts?: { status?: string }) {
  const userId = await getUserId()
  const where = opts?.status
    ? and(eq(invoices.userId, userId), eq(invoices.status, opts.status))
    : eq(invoices.userId, userId)

  const rows = await db
    .select()
    .from(invoices)
    .where(where)
    .orderBy(desc(invoices.createdAt))

  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(invoices)
    .where(where)

  return { invoices: rows, total: count }
}

export async function getInvoice(id: number) {
  const userId = await getUserId()

  const invoice = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)

  if (!invoice) return null

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))

  const paymentList = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .orderBy(payments.paidAt)

  return { ...invoice, items, payments: paymentList }
}

type InvoiceItemInput = { description: string; quantity: number; unitPrice: number }

type CreateInvoiceData = {
  items: InvoiceItemInput[]
  taxRate?: number
  dueDate?: Date
  notes?: string
}

export async function createInvoice(data: CreateInvoiceData) {
  const userId = await getUserId()

  const subtotal = data.items.reduce((sum: number, item: InvoiceItemInput) => sum + item.quantity * item.unitPrice, 0)
  const taxRate = data.taxRate || 0
  const taxAmount = Math.round(subtotal * taxRate / 100)
  const total = subtotal + taxAmount

  const existingInvoices = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1)

  let nextNum = 1
  if (existingInvoices.length > 0) {
    const lastNum = parseInt(existingInvoices[0].invoiceNumber.replace('INV-', ''), 10)
    if (!isNaN(lastNum)) nextNum = lastNum + 1
  }
  const invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`

  const result = await db
    .insert(invoices)
    .values({
      userId,
      invoiceNumber,
      status: 'draft',
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency: 'USD',
      dueDate: data.dueDate || null,
      notes: data.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  const invoice = result[0]

  for (const item of data.items) {
    await db.insert(invoiceItems).values({
      invoiceId: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
      createdAt: new Date(),
    })
  }

  return invoice
}

type RecordPaymentData = {
  amount: number
  paymentMethod?: string
  reference?: string
  notes?: string
}

export async function recordPayment(invoiceId: number, data: RecordPaymentData) {
  const userId = await getUserId()

  const invoice = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)

  if (!invoice) throw new Error('Invoice not found')

  await db.insert(payments).values({
    userId,
    invoiceId,
    amount: data.amount,
    paymentMethod: data.paymentMethod || 'manual',
    reference: data.reference || null,
    notes: data.notes || null,
    paidAt: new Date(),
    createdAt: new Date(),
  })

  const [{ totalPaid }] = await db
    .select({ totalPaid: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))

  const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial'
  await db
    .update(invoices)
    .set({
      status: newStatus,
      paidAt: newStatus === 'paid' ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))

  return { totalPaid, newStatus }
}

export async function generateInvoicePdf(invoiceId: number): Promise<{
  pdf: number[]
  filename: string
}> {
  const userId = await getUserId()

  const invoice = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
    .limit(1)
    .then(r => r[0] || null)

  if (!invoice) throw new Error('Invoice not found')

  const lineItems = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId))
    .then(r => r as any[])

  const paymentRecords = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(payments.paidAt)
    .then(r => r as any[])

  const contact = invoice.contactId
    ? await db.select().from(contacts).where(eq(contacts.id, invoice.contactId)).limit(1).then(r => r[0] || null)
    : null

  const biz = await db.select().from(businesses).where(eq(businesses.userId, userId)).limit(1).then(r => r[0] || null)

  const profile = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1).then(r => r[0] || null)

  const profession = (profile?.profession || 'freelancer') as ProfessionId

  const pdfBytes = await generateInvoicePDF(
    {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status || 'draft',
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      notes: invoice.notes,
      subtotal: invoice.subtotal || 0,
      taxRate: invoice.taxRate || 0,
      taxAmount: invoice.taxAmount || 0,
      total: invoice.total || 0,
      currency: invoice.currency || 'USD',
      lineItems: lineItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || 0,
      })),
      payments: paymentRecords.map((p: any) => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod || 'manual',
        reference: p.reference,
        paidAt: p.paidAt,
      })),
    },
    {
      name: biz?.businessName || 'Business',
      slug: biz?.businessSlug || 'business',
      brandColor: biz?.brandColor || '#3b82f6',
      logoUrl: biz?.logoUrl,
      location: profile?.location,
    },
    {
      name: contact?.name || (invoice.contactId ? 'Customer' : ''),
      email: contact?.email,
      phone: contact?.phone,
      company: contact?.company,
    },
    profession
  )

  return {
    pdf: Array.from(pdfBytes),
    filename: `${invoice.invoiceNumber}.pdf`,
  }
}
