'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckSquare, Plus, Calendar, AlertCircle, Clock, ArrowLeft, Loader2, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getTasks, createTask, updateTask } from '@/app/actions/tasks'

interface Task {
  id: number
  title: string
  description: string | null
  priority: string | null
  status: string | null
  dueDate: Date | null
  contactId: number | null
  createdAt: Date
}

const STATUS_FILTERS = ['all', 'todo', 'in_progress', 'done'] as const
type StatusFilter = typeof STATUS_FILTERS[number]

const PRIORITY_FILTERS = ['all', 'low', 'medium', 'high', 'urgent'] as const
type PriorityFilter = typeof PRIORITY_FILTERS[number]

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPriority, setFormPriority] = useState('medium')
  const [formDueDate, setFormDueDate] = useState('')
  const [formStatus, setFormStatus] = useState('todo')

  useEffect(() => { loadTasks() }, [statusFilter, priorityFilter])

  async function loadTasks() {
    setLoading(true)
    try {
      const result = await getTasks({
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
      })
      setTasks(result.tasks as Task[])
      setTotal(result.total)
    } catch {
      setError('Failed to load tasks')
    }
    setLoading(false)
  }

  function resetForm() {
    setFormTitle('')
    setFormDescription('')
    setFormPriority('medium')
    setFormDueDate('')
    setFormStatus('todo')
    setShowForm(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!formTitle.trim()) { setError('Title is required'); return }

    try {
      await createTask({
        title: formTitle,
        description: formDescription || undefined,
        priority: formPriority,
        dueDate: formDueDate ? new Date(formDueDate) : undefined,
      })
      resetForm()
      await loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    }
  }

  async function handleToggleDone(task: Task) {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await updateTask(task.id, { status: newStatus })
    await loadTasks()
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
              <CheckSquare className="w-5 h-5" /> Tasks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{total} total tasks</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Task
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto">
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
              {status === 'all' ? 'All' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto">
          {PRIORITY_FILTERS.map(priority => (
            <button
              key={priority}
              onClick={() => setPriorityFilter(priority)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize whitespace-nowrap ${
                priorityFilter === priority
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {priority}
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">New Task</h2>
              <button type="button" onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="mb-1">Title *</Label>
                <Input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Follow up with client"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="mb-1">Description</Label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none"
                  rows={3}
                  placeholder="Task details..."
                />
              </div>
              <div>
                <Label className="mb-1">Priority</Label>
                <select
                  value={formPriority}
                  onChange={e => setFormPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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
            <div className="flex gap-3">
              <Button type="submit" className="cursor-pointer">Create Task</Button>
              <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer">Cancel</Button>
            </div>
          </form>
        )}

        {tasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Tasks Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first task to stay organized.</p>
            <Button onClick={() => setShowForm(true)} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div
                key={task.id}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleDone(task)}
                    className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      task.status === 'done'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground hover:border-primary'
                    }`}
                  >
                    {task.status === 'done' && <CheckSquare className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold text-foreground ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </h3>
                      {task.priority && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_STYLES[task.priority] || ''}`}>
                          {task.priority}
                        </span>
                      )}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {STATUS_LABELS[task.status || 'todo']}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {task.dueDate && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    {expandedId === task.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedId === task.id && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <EditTaskInline task={task} onSave={loadTasks} onClose={() => setExpandedId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EditTaskInline({ task, onSave, onClose }: { task: Task; onSave: () => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState(task.priority || 'medium')
  const [status, setStatus] = useState(task.status || 'todo')
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await updateTask(task.id, {
      title,
      description: description || undefined,
      priority,
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    await onSave()
    onClose()
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label className="mb-1">Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1">Description</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none"
            rows={2}
          />
        </div>
        <div>
          <Label className="mb-1">Priority</Label>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <Label className="mb-1">Status</Label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm">
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <Label className="mb-1">Due Date</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancel</Button>
      </div>
    </div>
  )
}
