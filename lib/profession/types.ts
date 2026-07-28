export type ProfessionId =
  | 'realtor'
  | 'doctor'
  | 'lawyer'
  | 'freelancer'
  | 'consultant'
  | 'salon'
  | 'gym'
  | 'contractor'
  | 'car_dealer'
  | 'teacher'
  | 'photographer'
  | 'accountant'
  | 'marketing_agency'
  | 'veterinary'
  | 'dentist'
  | 'insurance_agent'

export interface ProfessionTerminology {
  customer: string
  customerPlural: string
  appointment: string
  appointmentPlural: string
  project: string
  projectPlural: string
  invoice: string
  invoicePlural: string
  quote: string
  quotePlural: string
  product: string
  productPlural: string
  deal: string
  dealPlural: string
  revenue: string
  note: string
  notePlural: string
  task: string
  taskPlural: string
  file: string
  filePlural: string
  followUp: string
  consultation: string
  proposal: string
  payment: string
  paymentPlural: string
  staff: string
  staffPlural: string
  service: string
  servicePlural: string
}

export interface PipelineStage {
  id: string
  label: string
  color: string
  probability: number
}

export interface NavItem {
  id: string
  label: string
  icon: string
  href: string
  badge?: string
  priority: number
  group: 'primary' | 'secondary' | 'tools'
}

export interface KPIDefinition {
  id: string
  label: string
  icon: string
  description: string
  format: 'number' | 'currency' | 'percentage'
  query: string
}

export interface DashboardWidget {
  id: string
  label: string
  type: 'stat' | 'list' | 'chart' | 'ai' | 'quick-actions' | 'calendar' | 'pipeline' | 'revenue'
  size: 'sm' | 'md' | 'lg' | 'full'
  priority: number
  query: string
}

export interface DefaultWorkflow {
  name: string
  description: string
  trigger: string
  triggerMinutes?: number
  actionType: string
  subject?: string
  message: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export interface ProfessionConfig {
  id: ProfessionId
  name: string
  description: string
  icon: string
  color: string
  terminology: ProfessionTerminology
  navItems: NavItem[]
  kpis: KPIDefinition[]
  dashboardWidgets: DashboardWidget[]
  pipelineStages: PipelineStage[]
  defaultWorkflows: DefaultWorkflow[]
  enabledModules: string[]
  hiddenModules: string[]
}
