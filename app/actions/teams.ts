'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { teams, teamMembers } from '@/lib/db/tables'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getTeams() {
  const userId = await getUserId()
  return db.select().from(teams).where(eq(teams.userId, userId))
}

export async function createTeam(data: { teamName: string; teamColor?: string; description?: string }) {
  const userId = await getUserId()
  const result = await db.insert(teams).values({ userId, ...data }).returning()
  revalidatePath('/dashboard/teams')
  return result[0]
}

export async function updateTeam(id: number, data: { teamName?: string; teamColor?: string; description?: string }) {
  const userId = await getUserId()
  await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id))
  revalidatePath('/dashboard/teams')
}

export async function deleteTeam(id: number) {
  const userId = await getUserId()
  await db.delete(teams).where(eq(teams.id, id))
  revalidatePath('/dashboard/teams')
}

export async function getTeamMembers(teamId: number) {
  return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId))
}

export async function addTeamMember(data: { teamId: number; memberName: string; memberEmail: string; memberPhone?: string }) {
  const result = await db.insert(teamMembers).values(data).returning()
  revalidatePath('/dashboard/teams')
  return result[0]
}

export async function removeTeamMember(id: number) {
  await db.delete(teamMembers).where(eq(teamMembers.id, id))
  revalidatePath('/dashboard/teams')
}

export async function toggleTeamMemberActive(id: number, isActive: boolean) {
  await db.update(teamMembers).set({ isActive, updatedAt: new Date() }).where(eq(teamMembers.id, id))
  revalidatePath('/dashboard/teams')
}
