export type AIProvider = 'ollama' | 'bedrock' | 'remote';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  endpoint: string;
}

interface OllamaModel { 
  name: string;
}

interface OllamaTagsResponse { 
  models?: OllamaModel[];
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'bedrock',
  model: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
  endpoint: 'https://706rf9fx5c.execute-api.eu-west-1.amazonaws.com',
};

const ALLOWED_ENDPOINTS = [
  /^\/api\//,                              // local proxy
  /^https?:\/\/localhost(:\d+)?\//,        // localhost
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//,    // loopback
  /^https:\/\/[^/]*\.amazonaws\.com/,     // AWS services
];

export function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.some(re => re.test(endpoint));
}

export function getAIConfig(): AIConfig {
  const saved = localStorage.getItem('promo-track-ai-config');
  if (saved) {
    const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    if (!isEndpointAllowed(parsed.endpoint) || parsed.endpoint.includes('3.249.190.229')) {
      localStorage.removeItem('promo-track-ai-config');
      return DEFAULT_CONFIG;
    }
    return parsed;
  }
  return DEFAULT_CONFIG;
}

export function saveAIConfig(config: Partial<AIConfig>) {
  if (config.endpoint && !isEndpointAllowed(config.endpoint)) {
    throw new Error(`Endpoint not allowed. Permitted: localhost, /api/*, *.amazonaws.com`);
  }
  const current = getAIConfig();
  localStorage.setItem('promo-track-ai-config', JSON.stringify({ ...current, ...config }));
}

export async function checkConnection(): Promise<{ ok: boolean; models: string[] }> {
  try {
    const config = getAIConfig();
    const res = await fetch(`${config.endpoint}/tags`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, models: [] };
    const data: OllamaTagsResponse = await res.json();
    return { ok: true, models: data.models?.map((m) => m.name) || [] };
  } catch (e) {
    return { ok: false, models: [] };
  }
}

let lastChatTime = 0;
const MIN_CHAT_INTERVAL_MS = 2000; // 2 seconds between requests

export async function chat(
  systemPrompt: string,
  userMessage: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const now = Date.now();
  if (now - lastChatTime < MIN_CHAT_INTERVAL_MS) {
    throw new Error('Please wait a moment before sending another request');
  }
  lastChatTime = now;

  const config = getAIConfig();
  if (!isEndpointAllowed(config.endpoint)) throw new Error('AI endpoint not allowed');

  const res = await fetch(`${config.endpoint}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: !!onChunk,
    }),
  });

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`);

  if (!onChunk) {
    const data = await res.json();
    return data.message?.content || '';
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const json = JSON.parse(line);
        const text = json.message?.content || '';
        if (text) { full += text; onChunk(full); }
      } catch { /* skip malformed lines */ }
    }
  }
  return full;
}
