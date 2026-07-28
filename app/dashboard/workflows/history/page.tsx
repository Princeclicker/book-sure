'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Clock, CheckCircle, XCircle, Mail, Smartphone, Bell, Settings, Users, FileText, CheckSquare, AlertCircle } from 'lucide-react'
import { getWorkflowHistory } from '@/app/actions/workflows'

interface WorkflowLog {
  id: number
  workflowId: number
  userId: string
  appointmentId: number | null
  trigger: string
  actionType: string
  customerName: string | null
  customerEmail: string | null
  status: string
  errorMessage: string | null
  executedAt: Date
}

const ACTION_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: Smartphone,
  internal_notification: Bell,
  update_status: Settings,
  assign_team: Users,
  add_note: FileText,
  create_task: CheckSquare,
}

const TRIGGER_LABELS: Record<string, string> = {
  booking_confirmed: 'Appointment Booked',
  appointment_cancelled: 'Cancelled',
  appointment_rescheduled: 'Rescheduled',
  appointment_completed: 'Completed',
  appointment_no_show: 'No-Show',
  before_appointment: 'Before Appointment',
  after_appointment: 'After Appointment',
}

function formatDateTime(d: Date | string) {
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function WorkflowHistoryPage() {
  const [logs, setLogs] = useState<WorkflowLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWorkflowHistory().then(l => { setLogs(l as WorkflowLog[]); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard/workflows" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Workflows
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5" /> Workflow History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Execution log for all workflow actions.</p>
        </div>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No History Yet</h3>
            <p className="text-sm text-muted-foreground">Workflow executions will appear here once actions are triggered.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trigger</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date & Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const Icon = ACTION_ICONS[log.actionType] || Settings
                    const isSuccess = log.status === 'success'
                    return (
                      <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          {isSuccess
                            ? <CheckCircle className="w-4 h-4 text-green-600" />
                            : <XCircle className="w-4 h-4 text-red-500" />
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            {log.actionType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {TRIGGER_LABELS[log.trigger] || log.trigger}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs">
                            <span className="font-medium">{log.customerName || '—'}</span>
                            {log.customerEmail && <span className="text-muted-foreground block">{log.customerEmail}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.executedAt)}
                        </td>
                        <td className="px-4 py-3">
                          {log.errorMessage && (
                            <span className="text-xs text-red-500 max-w-[200px] truncate block" title={log.errorMessage}>
                              {log.errorMessage}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
