import { devFullSchema } from './sqlite'
import * as pgSchema from './schema'

const isDev = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL

const t = isDev ? devFullSchema : (pgSchema as typeof devFullSchema)

export const user = t.user
export const session = t.session
export const account = t.account
export const verification = t.verification
export const googleCalendars = t.googleCalendars
export const appointments = t.appointments
export const manualBlocks = t.manualBlocks
export const businesses = t.businesses
export const emailVerificationCodes = t.emailVerificationCodes
export const teams = t.teams
export const teamMembers = t.teamMembers
export const meetingPolls = t.meetingPolls
export const pollVotes = t.pollVotes
export const workflows = t.workflows
export const workflowActions = t.workflowActions
export const workflowLogs = t.workflowLogs
export const routingForms = t.routingForms
export const formSubmissions = t.formSubmissions
export const emailLog = t.emailLog
export const businessProfiles = t.businessProfiles
export const contacts = t.contacts
export const contactTimeline = t.contactTimeline
export const tasks = t.tasks
export const opportunities = t.opportunities
export const invoices = t.invoices
export const invoiceItems = t.invoiceItems
export const payments = t.payments
export const aiProviders = t.aiProviders
export const aiInsights = t.aiInsights
