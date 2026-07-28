import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { user, businesses, appointments } from '@/lib/db/tables'
import { eq, desc, and, gte } from 'drizzle-orm'
import Link from 'next/link'
import { Users, Building2, CalendarCheck } from 'lucide-react'

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Check for admin role (set via DB or email pattern)
  const currentUser = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
    .then(r => r[0] || null)

  const isAdmin = currentUser?.role === 'admin' || session.user.email?.includes('admin') || false

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You do not have admin privileges.</p>
          <Link href="/dashboard" className="text-primary hover:underline text-sm">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const allUsers = await db.select().from(user).orderBy(desc(user.createdAt))
  const allBusinesses = await db.select().from(businesses).orderBy(desc(businesses.createdAt))
  const allAppointments = await db.select().from(appointments).orderBy(desc(appointments.createdAt))

  const totalUsers = allUsers.length
  const totalBusinesses = allBusinesses.length
  const totalAppointments = allAppointments.length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-foreground">BookSure</Link>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</Link>
            <span className="text-xs text-muted-foreground">{session.user.email}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all businesses and users</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <AdminStat icon={<Users className="w-4 h-4" />} label="Total Users" value={totalUsers} />
          <AdminStat icon={<Building2 className="w-4 h-4" />} label="Businesses" value={totalBusinesses} />
          <AdminStat icon={<CalendarCheck className="w-4 h-4" />} label="Appointments" value={totalAppointments} />
        </div>

        {/* Users Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden mb-8">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">All Users ({totalUsers})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Email</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Business</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Role</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => {
                  const biz = allBusinesses.find(b => b.userId === u.id)
                  const aptCount = allAppointments.filter(a => a.userId === u.id).length
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{u.name}</td>
                      <td className="p-3 text-muted-foreground">{u.email}</td>
                      <td className="p-3">{biz ? <span className="text-foreground">{biz.businessName}</span> : <span className="text-muted-foreground italic">—</span>}</td>
                      <td className="p-3 text-muted-foreground">
                        {u.role === 'admin' ? (
                          <span className="text-xs font-medium text-amber-600">Admin</span>
                        ) : (
                          <span className="text-xs">User</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {u.createdAt.toLocaleDateString()}
                        <span className="ml-2 text-muted-foreground/60">{aptCount} appts</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Appointments ({totalAppointments})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Phone</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Business</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Date & Time</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">SMS</th>
                </tr>
              </thead>
              <tbody>
                {allAppointments.slice(0, 20).map(apt => {
                  const biz = allBusinesses.find(b => b.userId === apt.userId)
                  return (
                    <tr key={apt.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{apt.customerName}</td>
                      <td className="p-3 text-muted-foreground">{apt.customerPhone}</td>
                      <td className="p-3 text-muted-foreground">{biz?.businessName || '—'}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {apt.eventStart.toLocaleDateString()} {apt.eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          apt.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                          apt.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {apt.confirmationSent ? '✓ Sent' : apt.cancelledViaSms ? '📱 Cancel' : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

function AdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}
