'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { routingForms, formSubmissions } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getRoutingForms() {
  const userId = await getUserId()
  return db.select().from(routingForms).where(eq(routingForms.userId, userId))
}

export async function createRoutingForm(data: {
  title: string
  fields: { label: string; type: string; required: boolean }[]
  teamId?: number
  redirectUrl?: string
}) {
  const userId = await getUserId()
  const shareToken = randomBytes(12).toString('hex')
  const result = await db.insert(routingForms).values({
    userId,
    title: data.title,
    fields: data.fields,
    teamId: data.teamId || null,
    redirectUrl: data.redirectUrl || null,
    shareToken,
  }).returning()
  revalidatePath('/dashboard/routing-forms')
  return result[0]
}

export async function deleteRoutingForm(id: number) {
  const userId = await getUserId()
  await db.delete(routingForms).where(eq(routingForms.id, id))
  revalidatePath('/dashboard/routing-forms')
}

export async function submitForm(token: string, data: Record<string, string>) {
  const form = await db.select().from(routingForms).where(eq(routingForms.shareToken, token)).limit(1)
  if (!form.length) throw new Error('Form not found')

  await db.insert(formSubmissions).values({
    formId: form[0].id,
    data,
  })

  return form[0].redirectUrl
}

export async function getFormByToken(token: string) {
  const form = await db.select().from(routingForms).where(eq(routingForms.shareToken, token)).limit(1)
  return form[0] || null
}
