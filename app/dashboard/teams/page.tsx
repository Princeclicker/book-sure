'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Users, UserPlus, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { getTeams, createTeam, deleteTeam, getTeamMembers, addTeamMember, removeTeamMember, toggleTeamMemberActive } from '@/app/actions/teams'

interface Team { id: number; teamName: string; teamColor: string | null; description: string | null }
interface Member { id: number; teamId: number; memberName: string; memberEmail: string; memberPhone: string | null; isActive: boolean | null }

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<Record<number, Member[]>>({})
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState<number | null>(null)
  const [form, setForm] = useState({ teamName: '', teamColor: '#3b82f6', description: '' })
  const [memberForm, setMemberForm] = useState({ memberName: '', memberEmail: '', memberPhone: '' })
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const t = await getTeams()
    setTeams(t)
    const m: Record<number, Member[]> = {}
    await Promise.all(t.map(async team => {
      m[team.id] = await getTeamMembers(team.id)
    }))
    setMembers(m)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createTeam(form)
      setShowCreate(false)
      setForm({ teamName: '', teamColor: '#3b82f6', description: '' })
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to create team') }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!showAddMember) return
    setError('')
    try {
      await addTeamMember({ teamId: showAddMember, ...memberForm })
      setShowAddMember(null)
      setMemberForm({ memberName: '', memberEmail: '', memberPhone: '' })
      await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add member') }
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
              <Users className="w-5 h-5" /> Team Scheduling
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your team members and pooled availability.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
            <Plus className="w-4 h-4" /> Create Team
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 text-sm text-red-800 dark:text-red-200">{error}</div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-foreground">New Team</h2>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Team Name</label>
              <input type="text" required value={form.teamName} onChange={e => setForm({ ...form, teamName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" placeholder="Sales Team" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Color</label>
              <input type="color" value={form.teamColor} onChange={e => setForm({ ...form, teamColor: e.target.value })}
                className="w-12 h-12 rounded border border-border cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm resize-none" rows={2} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground cursor-pointer">Cancel</button>
            </div>
          </form>
        )}

        {teams.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No Teams Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first team to start managing pooled availability.</p>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium cursor-pointer">
              Create Team
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map(team => (
              <div key={team.id} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: team.teamColor || '#3b82f6' }} />
                    <div>
                      <h3 className="font-semibold text-foreground">{team.teamName}</h3>
                      {team.description && <p className="text-xs text-muted-foreground">{team.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAddMember(team.id)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer" title="Add Member">
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button onClick={async () => { await deleteTeam(team.id); await loadData() }} className="p-2 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors cursor-pointer" title="Delete Team">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showAddMember === team.id && (
                  <form onSubmit={handleAddMember} className="mb-4 p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                    <h4 className="text-sm font-medium text-foreground">Add Team Member</h4>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <input type="text" required placeholder="Full Name" value={memberForm.memberName}
                        onChange={e => setMemberForm({ ...memberForm, memberName: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                      <input type="email" required placeholder="Email" value={memberForm.memberEmail}
                        onChange={e => setMemberForm({ ...memberForm, memberEmail: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                      <input type="tel" placeholder="Phone (optional)" value={memberForm.memberPhone}
                        onChange={e => setMemberForm({ ...memberForm, memberPhone: e.target.value })}
                        className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium cursor-pointer">Add</button>
                      <button type="button" onClick={() => setShowAddMember(null)} className="px-3 py-1.5 border border-border rounded-lg text-xs text-muted-foreground cursor-pointer">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {(members[team.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No members yet. Add team members to get started.</p>
                  ) : (
                    (members[team.id] || []).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center gap-3">
                          <button onClick={async () => { await toggleTeamMemberActive(m.id, !m.isActive); await loadData() }} className="cursor-pointer" title={m.isActive ? 'Deactivate' : 'Activate'}>
                            {m.isActive ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.memberName}</p>
                            <p className="text-xs text-muted-foreground">{m.memberEmail}{m.memberPhone ? ` | ${m.memberPhone}` : ''}</p>
                          </div>
                        </div>
                        <button onClick={async () => { await removeTeamMember(m.id); await loadData() }} className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-muted transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
