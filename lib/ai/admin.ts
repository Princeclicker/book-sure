export type ProviderType = 'openai' | 'anthropic' | 'gemini'

export const PROVIDER_TYPES: ProviderType[] = ['openai', 'anthropic', 'gemini']

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Google Gemini',
}

export const DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
}

export interface ProviderConfig {
  name?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export function parseProviderConfig(value: unknown): ProviderConfig {
  let obj: unknown = value
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj)
    } catch {
      obj = null
    }
  }
  const c =
    typeof obj === 'object' && obj !== null ? (obj as Record<string, unknown>) : {}
  const num = (v: unknown, fb: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fb
  }
  return {
    name: typeof c.name === 'string' && c.name ? c.name : undefined,
    model: typeof c.model === 'string' && c.model ? c.model : undefined,
    temperature: num(c.temperature, 0.7),
    maxTokens: num(c.maxTokens, 1000),
  }
}

export function buildProviderConfig(config: Partial<ProviderConfig>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (config.name) out.name = config.name
  if (config.model) out.model = config.model
  if (config.temperature != null) out.temperature = config.temperature
  if (config.maxTokens != null) out.maxTokens = config.maxTokens
  return out
}

export async function testProviderConnection(
  type: string,
  apiKey: string,
  model?: string
): Promise<{ ok: boolean; message: string }> {
  const t = (type || '').toLowerCase()
  if (!apiKey) return { ok: false, message: 'API key is required' }
  try {
    if (t === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) return { ok: false, message: `OpenAI error ${res.status}: ${res.statusText}` }
      return { ok: true, message: 'Connected to OpenAI' }
    }
    if (t === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        return { ok: false, message: `Anthropic error ${res.status}: ${detail.slice(0, 200) || res.statusText}` }
      }
      return { ok: true, message: 'Connected to Anthropic Claude' }
    }
    if (t === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(10000) }
      )
      if (!res.ok) return { ok: false, message: `Gemini error ${res.status}: ${res.statusText}` }
      return { ok: true, message: 'Connected to Google Gemini' }
    }
    return { ok: false, message: `Unknown provider type: ${type || '(empty)'}` }
  } catch (e: any) {
    const msg =
      e?.name === 'TimeoutError' || e?.name === 'AbortError'
        ? 'Connection timed out after 10s'
        : e?.message || 'Connection failed'
    return { ok: false, message: msg }
  }
}
