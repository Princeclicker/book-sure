export interface AIProviderConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIProviderResponse {
  content: string
  tokens?: number
  model?: string
}

export interface AIProvider {
  name: string
  id: string
  generateResponse(prompt: string, config: AIProviderConfig): Promise<AIProviderResponse>
  generateInsights(context: BusinessContext): Promise<string>
  chat(message: string, context: BusinessContext, history?: ChatMessage[]): Promise<AIProviderResponse>
}

export interface BusinessContext {
  profession: string
  businessName: string
  contactCount: number
  appointmentCount: number
  revenue: number
  outstandingInvoices: number
  openOpportunities: number
  pendingTasks: number
  recentActivity: Array<{
    type: string
    title: string
    date: string
  }>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function createAIProvider(type: string, config: AIProviderConfig): AIProvider | null {
  switch (type) {
    case 'openai':
      return new OpenAIProvider(config)
    case 'anthropic':
      return new AnthropicProvider(config)
    default:
      return null
  }
}

class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  id = 'openai'
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateResponse(prompt: string): Promise<AIProviderResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0]?.message?.content || '',
      tokens: data.usage?.total_tokens,
      model: data.model,
    }
  }

  async generateInsights(context: BusinessContext): Promise<string> {
    const prompt = `You are a business intelligence assistant for a ${context.profession} business called "${context.businessName}".

Current business data:
- Contacts: ${context.contactCount}
- Appointments: ${context.appointmentCount}
- Revenue: $${(context.revenue / 100).toFixed(2)}
- Outstanding invoices: $${(context.outstandingInvoices / 100).toFixed(2)}
- Open opportunities: ${context.openOpportunities}
- Pending tasks: ${context.pendingTasks}

Recent activity:
${context.recentActivity.map(a => `- ${a.type}: ${a.title} (${a.date})`).join('\n')}

Provide 3-5 actionable business insights in a concise, professional manner. Focus on the most important items that need attention.`

    const response = await this.generateResponse(prompt)
    return response.content
  }

  async chat(message: string, context: BusinessContext, history: ChatMessage[] = []): Promise<AIProviderResponse> {
    const systemMessage = `You are an AI business assistant for a ${context.profession} business called "${context.businessName}". You have access to the following business data:
- ${context.contactCount} contacts
- ${context.appointmentCount} appointments
- $${(context.revenue / 100).toFixed(2)} revenue
- $${(context.outstandingInvoices / 100).toFixed(2)} in outstanding invoices
- ${context.openOpportunities} open opportunities
- ${context.pendingTasks} pending tasks

Provide helpful, actionable business advice. Be concise and professional.`

    const messages = [
      { role: 'system' as const, content: systemMessage },
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.choices[0]?.message?.content || '',
      tokens: data.usage?.total_tokens,
      model: data.model,
    }
  }
}

class AnthropicProvider implements AIProvider {
  name = 'Claude'
  id = 'anthropic'
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateResponse(prompt: string): Promise<AIProviderResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.content?.[0]?.text || '',
      tokens: data.usage?.input_tokens + data.usage?.output_tokens,
      model: data.model,
    }
  }

  async generateInsights(context: BusinessContext): Promise<string> {
    const prompt = `You are a business intelligence assistant for a ${context.profession} business called "${context.businessName}".

Current business data:
- Contacts: ${context.contactCount}
- Appointments: ${context.appointmentCount}
- Revenue: $${(context.revenue / 100).toFixed(2)}
- Outstanding invoices: $${(context.outstandingInvoices / 100).toFixed(2)}
- Open opportunities: ${context.openOpportunities}
- Pending tasks: ${context.pendingTasks}

Recent activity:
${context.recentActivity.map(a => `- ${a.type}: ${a.title} (${a.date})`).join('\n')}

Provide 3-5 actionable business insights in a concise, professional manner.`

    const response = await this.generateResponse(prompt)
    return response.content
  }

  async chat(message: string, context: BusinessContext, history: ChatMessage[] = []): Promise<AIProviderResponse> {
    const systemMessage = `You are an AI business assistant for a ${context.profession} business called "${context.businessName}". You have access to the following business data:
- ${context.contactCount} contacts
- ${context.appointmentCount} appointments
- $${(context.revenue / 100).toFixed(2)} revenue
- $${(context.outstandingInvoices / 100).toFixed(2)} in outstanding invoices
- ${context.openOpportunities} open opportunities
- ${context.pendingTasks} pending tasks

Provide helpful, actionable business advice. Be concise and professional.`

    const messages = [
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: this.config.maxTokens || 1000,
        system: systemMessage,
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      content: data.content?.[0]?.text || '',
      tokens: data.usage?.input_tokens + data.usage?.output_tokens,
      model: data.model,
    }
  }
}
