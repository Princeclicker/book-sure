import Link from 'next/link'
import { ArrowLeft, FileText, DollarSign, Send, CheckCircle } from 'lucide-react'
import { getInvoice } from '@/app/actions/invoices'
import { getProfessionConfig, type ProfessionId } from '@/lib/profession'
import { InvoicePdfActions } from '@/components/invoice-pdf-actions'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const invoice = await getInvoice(parseInt(id))

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Invoice Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">The invoice you are looking for does not exist.</p>
          <Link href="/dashboard/invoices" className="text-sm text-primary hover:underline">Back to Invoices</Link>
        </div>
      </div>
    )
  }

  const totalPaid = (invoice.payments || []).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  const balanceDue = invoice.total - totalPaid

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Invoices
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" /> {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[invoice.status || 'draft'] || ''}`}>
                {invoice.status || 'draft'}
              </span>
            </p>
          </div>
          <InvoicePdfActions invoiceId={invoice.id} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 mb-6">
          <div className="grid grid-cols-2 gap-6 mb-6 pb-6 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
              <p className="text-sm font-semibold text-foreground">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <p className="text-sm font-semibold text-foreground capitalize">{invoice.status || 'draft'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm text-foreground">{new Date(invoice.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due Date</p>
              <p className="text-sm text-foreground">
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
              </p>
            </div>
            {invoice.paidAt && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Paid At</p>
                <p className="text-sm text-foreground">{new Date(invoice.paidAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <h3 className="text-sm font-semibold text-foreground mb-3">Line Items</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground pb-2">Description</th>
                  <th className="text-right text-xs font-medium text-muted-foreground pb-2 w-20">Qty</th>
                  <th className="text-right text-xs font-medium text-muted-foreground pb-2 w-28">Unit Price</th>
                  <th className="text-right text-xs font-medium text-muted-foreground pb-2 w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item: { description: string; quantity: number; unitPrice: number; amount: number }, idx: number) => (
                  <tr key={idx} className="border-b border-border last:border-b-0">
                    <td className="py-2 text-sm text-foreground">{item.description}</td>
                    <td className="py-2 text-sm text-foreground text-right">{item.quantity}</td>
                    <td className="py-2 text-sm text-foreground text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-sm font-medium text-foreground text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Paid</span>
                    <span>-{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-foreground pt-1 border-t border-border">
                    <span>Balance Due</span>
                    <span>{formatCurrency(balanceDue)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {(invoice.payments || []).length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Payment History
            </h3>
            <div className="space-y-3">
              {(invoice.payments || []).map((payment: { id: number; amount: number; paymentMethod: string | null; reference: string | null; paidAt: Date; notes: string | null }, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.paymentMethod || 'Manual'} {payment.reference && `&middot; ${payment.reference}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(payment.paidAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
