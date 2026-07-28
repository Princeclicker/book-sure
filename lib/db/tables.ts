import * as pgSchema from './schema'

const isDev = process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL

let _t: typeof pgSchema | null = null
function getTables() {
  if (_t) return _t
  if (isDev) {
    const sqlite = require('./sqlite') as typeof import('./sqlite')
    _t = sqlite.devFullSchema as unknown as typeof pgSchema
  } else {
    _t = pgSchema as typeof pgSchema
  }
  return _t
}

export const user = getTables().user
export const session = getTables().session
export const account = getTables().account
export const verification = getTables().verification
export const googleCalendars = getTables().googleCalendars
export const appointments = getTables().appointments
export const manualBlocks = getTables().manualBlocks
export const businesses = getTables().businesses
export const emailVerificationCodes = getTables().emailVerificationCodes
export const teams = getTables().teams
export const teamMembers = getTables().teamMembers
export const meetingPolls = getTables().meetingPolls
export const pollVotes = getTables().pollVotes
export const workflows = getTables().workflows
export const workflowActions = getTables().workflowActions
export const workflowLogs = getTables().workflowLogs
export const routingForms = getTables().routingForms
export const formSubmissions = getTables().formSubmissions
export const emailLog = getTables().emailLog
export const businessProfiles = getTables().businessProfiles
export const contacts = getTables().contacts
export const contactTimeline = getTables().contactTimeline
export const tasks = getTables().tasks
export const opportunities = getTables().opportunities
export const invoices = getTables().invoices
export const invoiceItems = getTables().invoiceItems
export const payments = getTables().payments
export const aiProviders = getTables().aiProviders
export const aiInsights = getTables().aiInsights
