'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { workflows, workflowActions, workflowLogs } from '@/lib/db/tables'
import { eq, and, desc } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getWorkflowStats } from '@/lib/workflow/engine'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getWorkflows() {
  const userId = await getUserId()
  return db.select().from(workflows).where(eq(workflows.userId, userId))
}

export async function getWorkflowWithActions(workflowId: number) {
  const userId = await getUserId()
  const wf = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)))
    .limit(1)

  if (!wf.length) throw new Error('Workflow not found')

  const actions = await db
    .select()
    .from(workflowActions)
    .where(eq(workflowActions.workflowId, workflowId))
    .orderBy(workflowActions.sortOrder)

  return { ...wf[0], actions }
}

export async function createWorkflow(data: {
  name: string
  description?: string
  trigger: string
  triggerMinutes?: number
  actions: Array<{
    actionType: string
    subject?: string
    message: string
    config?: Record<string, unknown>
    sortOrder?: number
  }>
}) {
  const userId = await getUserId()
  const now = new Date()

  const firstAction = data.actions[0]
  const result = await db.insert(workflows).values({
    userId,
    name: data.name,
    description: data.description || null,
    trigger: data.trigger,
    triggerMinutes: data.triggerMinutes ?? 0,
    actionType: firstAction?.actionType || 'email',
    subject: firstAction?.subject || null,
    message: firstAction?.message || '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).returning()

  const workflow = result[0]

  for (let i = 0; i < data.actions.length; i++) {
    const a = data.actions[i]
    await db.insert(workflowActions).values({
      workflowId: workflow.id,
      actionType: a.actionType,
      subject: a.subject || null,
      message: a.message,
      config: a.config ? JSON.stringify(a.config) : '{}',
      sortOrder: a.sortOrder ?? i,
      createdAt: now,
    })
  }

  revalidatePath('/dashboard/workflows')
  return workflow
}

export async function updateWorkflow(id: number, data: {
  name?: string
  description?: string
  trigger?: string
  triggerMinutes?: number
  isActive?: boolean
  actions?: Array<{
    id?: number
    actionType: string
    subject?: string
    message: string
    config?: Record<string, unknown>
    sortOrder?: number
  }>
}) {
  const userId = await getUserId()
  const now = new Date()

  const updateData: Record<string, unknown> = { updatedAt: now }
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.trigger !== undefined) updateData.trigger = data.trigger
  if (data.triggerMinutes !== undefined) updateData.triggerMinutes = data.triggerMinutes
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  if (data.actions && data.actions.length > 0) {
    updateData.actionType = data.actions[0].actionType
    updateData.subject = data.actions[0].subject || null
    updateData.message = data.actions[0].message
  }

  await db.update(workflows).set(updateData).where(
    and(eq(workflows.id, id), eq(workflows.userId, userId))
  )

  if (data.actions) {
    await db.delete(workflowActions).where(eq(workflowActions.workflowId, id))
    const nowDate = new Date()
    for (let i = 0; i < data.actions.length; i++) {
      const a = data.actions[i]
      await db.insert(workflowActions).values({
        workflowId: id,
        actionType: a.actionType,
        subject: a.subject || null,
        message: a.message,
        config: a.config ? JSON.stringify(a.config) : '{}',
        sortOrder: a.sortOrder ?? i,
        createdAt: nowDate,
      })
    }
  }

  revalidatePath('/dashboard/workflows')
}

export async function toggleWorkflow(id: number, isActive: boolean) {
  const userId = await getUserId()
  await db.update(workflows).set({ isActive, updatedAt: new Date() }).where(
    and(eq(workflows.id, id), eq(workflows.userId, userId))
  )
  revalidatePath('/dashboard/workflows')
}

export async function deleteWorkflow(id: number) {
  const userId = await getUserId()
  await db.delete(workflows).where(
    and(eq(workflows.id, id), eq(workflows.userId, userId))
  )
  revalidatePath('/dashboard/workflows')
}

export async function getWorkflowHistory() {
  const userId = await getUserId()
  return db
    .select()
    .from(workflowLogs)
    .where(eq(workflowLogs.userId, userId))
    .orderBy(desc(workflowLogs.executedAt))
    .limit(200)
}

export async function getWorkflowStatsAction() {
  const userId = await getUserId()
  return getWorkflowStats(userId)
}
