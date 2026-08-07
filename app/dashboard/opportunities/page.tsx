'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  TrendingUp, Plus, DollarSign, ArrowRight, ArrowLeft, Loader2, X, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getOpportunities, createOpportunity, updateOpportunity } from '@/app/actions/opportunities'
import { getPipelineStages, type ProfessionId } from '@/lib/profession'

interface Opportunity {
  id: number
  title: string
  description: string | null
  value: number | null
  currency: string | null
  stage: string | null
  probability: number | null
  contactId: number | null
  createdAt: Date
}

interface PipelineStage {
  id: string
  label: string
  color: string
  probability: number
}

export default function OpportunitiesPage({ params }: { params: Promise<{ profession?: string }> }) {
  const [profession, setProfession] = useState<ProfessionId>('freelancer')
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const [formTitle, setFormTitle] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formStage, setFormStage] = useState('')
  const [formProbability, setFormProbability] = useState('')
  const [formContactName, setFormContactName] = useState('')
  const [movingId, setMovingId] = useState<number | null>(null)

  useEffect(() => {
    params.then(p => {
      if (p.profession) setProfession(p.profession as ProfessionId)
    })
  }, [params])

  useEffect(() => {
    const pipelineStages = getPipelineStages(profession)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStages(pipelineStages)
    if (pipelineStages.length > 0 && !formStage) {
      setFormStage(pipelineStages[0].id)
    }
  }, [profession, formStage])

  useEffect(() => { loadOpportunities() }, [profession])

  async function loadOpportunities() {
    setLoading(true)
    try {
      const result = await getOpportunities()
      setOpportunities(result.opportunities as Opportunity[])
    } catch {
      setError('Failed to load opportunities')
    }
    setLoading(false)
  }

  function resetForm() {
    setFormTitle('')
    setFormValue('')
    setFormStage(stages[0]?.id || '')
    setFormProbability('')
    setFormContactName('')
    setShowForm(false)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!formTitle.trim()) { setError('Title is required'); return }

    try {
      await createOpportunity({
        title: formTitle,
        value: formValue ? Math.round(parseFloat(formValue) * 100) : undefined,
        stage: formStage || undefined,
        probability: formProbability ? parseInt(formProbability) : undefined,
      })
      resetForm()
      await loadOpportunities()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity')
    }
  }

  async function handleMoveStage(oppId: number, newStage: string) {
    setMovingId(oppId)
    const stage = stages.find(s => s.id === newStage)
    await updateOpportunity(oppId, {
      stage: newStage,
      probability: stage?.probability,
    })
    await loadOpportunities()
    setMovingId(null)
  }

  function formatCurrency(cents: number | null) {
    if (!cents) return '$0'
    return `$${(cents / 100).toLocaleString()}`
  }

  function getStageOpportunities(stageId: string) {
    return opportunities.filter(o => o.stage === stageId)
  }

  function getStageTotal(stageId: string) {
    return getStageOpportunities(stageId).reduce((sum, o) => sum + (o.value || 0), 0)
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3 h-3" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Pipeline
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {opportunities.length} opportunities &middot; {formatCurrency(opportunities.reduce((s, o) => s + (o.value || 0), 0))} total value
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Opportunity
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">New Opportunity</h2>
              <button type="button" onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <Label className="mb-1">Title *</Label>
                <Input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Website redesign project"
                />
              </div>
              <div>
                <Label className="mb-1">Value ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formValue}
                  onChange={e => setFormValue(e.target.value)}
                  placeholder="5000"
                />
              </div>
              <div>
                <Label className="mb-1">Stage</Label>
                <select
                  value={formStage}
                  onChange={e => setFormStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                >
                  {stages.filter(s => s.id !== 'won' && s.id !== 'lost').map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1">Probability (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formProbability}
                  onChange={e => setFormProbability(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="sm:col-span-3">
                <Label className="mb-1">Contact Name</Label>
                <Input
                  type="text"
                  value={formContactName}
                  onChange={e => setFormContactName(e.target.value)}
                  placeholder="Search contact..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="cursor-pointer">Create Opportunity</Button>
              <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer">Cancel</Button>
            </div>
          </form>
        )}

        {opportunities.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Opportunities Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first opportunity to start tracking your pipeline.</p>
            <Button onClick={() => setShowForm(true)} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1" /> Add Opportunity
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map(stage => {
              const stageOpps = getStageOpportunities(stage.id)
              const stageTotal = getStageTotal(stage.id)
              return (
                <div key={stage.id} className="min-w-[280px] flex-shrink-0">
                  <div className="rounded-xl border border-border bg-card">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <h3 className="font-semibold text-foreground text-sm">{stage.label}</h3>
                        <span className="ml-auto text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {stageOpps.length}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> {formatCurrency(stageTotal)}
                      </p>
                    </div>
                    <div className="p-3 space-y-2 min-h-[120px]">
                      {stageOpps.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4 opacity-60">No items</p>
                      ) : (
                        stageOpps.map(opp => (
                          <div
                            key={opp.id}
                            className={`rounded-lg border border-border bg-background p-3 ${movingId === opp.id ? 'opacity-50' : ''}`}
                          >
                            <h4 className="font-medium text-foreground text-sm">{opp.title}</h4>
                            {opp.value ? (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <DollarSign className="w-3 h-3" /> {formatCurrency(opp.value)}
                              </p>
                            ) : null}
                            {opp.probability != null && (
                              <p className="text-[10px] text-muted-foreground mt-1">{opp.probability}% probability</p>
                            )}
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                              {stage.id !== 'won' && stage.id !== 'lost' && (
                                <>
                                  {stages.filter(s => s.id !== stage.id).map(targetStage => (
                                    <button
                                      key={targetStage.id}
                                      onClick={() => handleMoveStage(opp.id, targetStage.id)}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                      title={`Move to ${targetStage.label}`}
                                    >
                                      <ArrowRight className="w-2.5 h-2.5 inline" /> {targetStage.label.slice(0, 8)}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
