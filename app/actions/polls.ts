'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { meetingPolls, pollVotes } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getPolls() {
  const userId = await getUserId()
  return db.select().from(meetingPolls).where(eq(meetingPolls.userId, userId)).orderBy(eq(meetingPolls.createdAt, meetingPolls.createdAt))
}

export async function createPoll(data: {
  title: string
  description?: string
  duration?: number
  proposedDates: string[]
  timeStart?: number
  timeEnd?: number
}) {
  const userId = await getUserId()
  const shareToken = randomBytes(16).toString('hex')
  const result = await db.insert(meetingPolls).values({
    userId,
    title: data.title,
    description: data.description || null,
    duration: data.duration || 30,
    proposedDates: data.proposedDates,
    timeStart: data.timeStart || 9,
    timeEnd: data.timeEnd || 17,
    shareToken,
  }).returning()
  revalidatePath('/dashboard/polls')
  return result[0]
}

export async function closePoll(id: number) {
  const userId = await getUserId()
  await db.update(meetingPolls).set({ status: 'closed', updatedAt: new Date() }).where(eq(meetingPolls.id, id))
  revalidatePath('/dashboard/polls')
}

export async function deletePoll(id: number) {
  const userId = await getUserId()
  await db.delete(meetingPolls).where(eq(meetingPolls.id, id))
  revalidatePath('/dashboard/polls')
}

export async function getPollByToken(token: string) {
  const poll = await db.select().from(meetingPolls).where(eq(meetingPolls.shareToken, token)).limit(1)
  if (!poll.length) return null

  const votes = await db.select().from(pollVotes).where(eq(pollVotes.pollId, poll[0].id))
  return { ...poll[0], votes }
}

export async function submitVote(data: {
  token: string
  voterName: string
  voterEmail?: string
  selectedSlots: string[]
  notes?: string
}) {
  const poll = await db.select().from(meetingPolls).where(eq(meetingPolls.shareToken, data.token)).limit(1)
  if (!poll.length) throw new Error('Poll not found')
  if (poll[0].status === 'closed') throw new Error('Poll is closed')

  await db.insert(pollVotes).values({
    pollId: poll[0].id,
    voterName: data.voterName,
    voterEmail: data.voterEmail || null,
    selectedSlots: data.selectedSlots,
    notes: data.notes || null,
  })

  revalidatePath(`/poll/${data.token}`)
}
