'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText, Plus, DollarSign, Send, CheckCircle, ArrowLeft, Loader2, X, AlertCircle, Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInvoices, createInvoice, recordPayment } from '@/app/actions/invoices'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

interface Invoice {
  id: number
  invoiceNumber: string
  contactId: number | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  status: string | null
  dueDate: Date | null
  paidAt: Date | null
  createdAt: Date
}

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const [formContactName, setFormContactName] = useState('')
  const [formItems, setFormItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])
  const [formTaxRate, setFormTaxRate] = useState('')
  const [formDueDate, setFormDueDate] = useState('')
  const [formNotes, setFormNotes] = useState('')

  useEffect(() => { loadInvoices() }, [statusFilter])

  async function loadInvoices() {
    setLoading(true)
    try {
      const result = await getInvoices({
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setInvoices(result.invoices as Invoice[])
      setTotal(result.total)
    } catch {
      setError('Failed to load invoices')
    }
    setLoading(false)
  }

  function resetForm() {
    setFormContactName('')
    setFormItems([{ description: '', quantity: 1, unitPrice: 0 }])
    setFormTaxRate('')
    setFormDueDate('')
    setFormNotes('')
    setShowForm(false)
    setError('')
  }

  function addItem() {
    setFormItems([...formItems, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function removeItem(idx: number) {
    if (formItems.length <= 1) return
    setFormItems(formItems.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...formItems]
    updated[idx] = { ...updated[idx], [field]: value }
    setFormItems(updated)
  }

  function getSubtotal() {
    return formItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  function getTaxAmount() {
    const rate = parseFloat(formTaxRate) || 0
    return Math.round(getSubtotal() * rate / 100)
  }

  function getTotal() {
    return getSubtotal() + getTaxAmount()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (formItems.some(i => !i.description.trim())) { setError('All items need a description'); return }
    if (getSubtotal() <= 0) { setError('Total must be greater than zero'); return }

    try {
      await createInvoice({
        items: formItems.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        taxRate: parseFloat(formTaxRate) || undefined,
        dueDate: formDueDate ? new Date(formDueDate) : undefined,
        notes: formNotes || undefined,
      })
      resetForm()
      await loadInvoices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5" /> Invoices
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{total} total invoices</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto">
          {STATUS_FILTERS.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">New Invoice</h2>
              <button type="button" onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1">Contact Name</Label>
                <Input
                  type="text"
                  value={formContactName}
                  onChange={e => setFormContactName(e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div>
                <Label className="mb-1">Due Date</Label>
                <Input
                  type="date"
                  value={formDueDate}
                  onChange={e => setFormDueDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <button type="button" onClick={addItem} className="text-xs text-primary hover:underline cursor-pointer">+ Add Item</button>
              </div>
              <div className="space-y-2">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity || ''}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="Qty"
                      className="w-20"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice ? (item.unitPrice / 100).toFixed(2) : ''}
                      onChange={e => updateItem(idx, 'unitPrice', Math.round(parseFloat(e.target.value) * 100) || 0)}
                      placeholder="Price"
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground w-24 text-right shrink-0">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                    {formItems.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="p-1 text-muted-foreground hover:text-red-500 cursor-pointer shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="sm:col-span-2">
                <Label className="mb-1">Notes</Label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none"
                  rows={2}
                  placeholder="Payment terms, thank you note..."
                />
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="mb-1">Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formTaxRate}
                    onChange={e => setFormTaxRate(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCurrency(getSubtotal())}</span>
                  </div>
                  {parseFloat(formTaxRate) > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tax ({formTaxRate}%)</span>
                      <span>{formatCurrency(getTaxAmount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold text-foreground pt-1 border-t border-border">
                    <span>Total</span>
                    <span>{formatCurrency(getTotal())}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="cursor-pointer">Create Invoice</Button>
              <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer">Cancel</Button>
            </div>
          </form>
        )}

        {invoices.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Invoices Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first invoice to start billing.</p>
            <Button onClick={() => setShowForm(true)} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1" /> Create Invoice
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Invoice</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Total</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Due Date</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="font-medium text-sm text-foreground hover:text-primary transition-colors"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[inv.status || 'draft'] || ''}`}>
                          {inv.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-sm font-semibold text-foreground flex items-center justify-end gap-1">
                          <DollarSign className="w-3 h-3" />
                          {formatCurrency(inv.total)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
