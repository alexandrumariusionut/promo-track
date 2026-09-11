import { AI_API_URL, AI_DEFAULT_MODEL } from '../config';
import { apiFetch } from './apiFetch';

export type AIProvider = 'ollama' | 'bedrock' | 'remote';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  endpoint: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaModel {
  name: string;
}

interface OllamaTagsResponse {
  models?: OllamaModel[];
}

interface ChatResponse {
  message?: { content?: string };
}

const CONFIG_KEY = 'promo-track-ai-config';

const DEFAULT_CONFIG: AIConfig = {
  provider: 'bedrock',
  model: AI_DEFAULT_MODEL,
  endpoint: AI_API_URL,
};

/**
 * Endpoints a user may point the AI client at.
 * Remote endpoints are restricted to the one baked in at build time; the only
 * user-selectable alternatives are local development targets. This prevents a
 * tampered localStorage value from redirecting STAR narratives and the Midway
 * Bearer token (the AI route sits behind the same authorizer as the rest of
 * the API) to an arbitrary host.
 */
const ALLOWED_ENDPOINTS: RegExp[] = [
  /^\/api\//,                              // Vite dev proxy
  /^https?:\/\/localhost(:\d+)?\//,        // localhost
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//,     // loopback
];

export function isEndpointAllowed(endpoint: string): boolean {
  if (endpoint === AI_API_URL) return true;
  return ALLOWED_ENDPOINTS.some(re => re.test(endpoint));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getAIConfig(): AIConfig {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (!saved) return DEFAULT_CONFIG;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) throw new Error('not an object');
    const merged: AIConfig = {
      provider: (parsed.provider as AIProvider) || DEFAULT_CONFIG.provider,
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : DEFAULT_CONFIG.model,
      endpoint: typeof parsed.endpoint === 'string' && parsed.endpoint ? parsed.endpoint : DEFAULT_CONFIG.endpoint,
    };
    if (!isEndpointAllowed(merged.endpoint)) throw new Error('endpoint not allowed');
    return merged;
  } catch {
    localStorage.removeItem(CONFIG_KEY);
    return DEFAULT_CONFIG;
  }
}

export function saveAIConfig(config: Partial<AIConfig>): void {
  if (config.endpoint && !isEndpointAllowed(config.endpoint)) {
    throw new Error('Endpoint not allowed. Permitted: the configured PromoTrack AI service, localhost, or /api/*');
  }
  const current = getAIConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

export async function checkConnection(): Promise<{ ok: boolean; models: string[] }> {
  try {
    const config = getAIConfig();
    const res = await apiFetch(`${config.endpoint}/tags`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { ok: false, models: [] };
    const data: OllamaTagsResponse = await res.json();
    return { ok: true, models: data.models?.map((m) => m.name) || [] };
  } catch {
    return { ok: false, models: [] };
  }
}

let lastChatTime = 0;
const MIN_CHAT_INTERVAL_MS = 2000; // 2 seconds between requests

function throttle(): void {
  const now = Date.now();
  if (now - lastChatTime < MIN_CHAT_INTERVAL_MS) {
    throw new Error('Please wait a moment before sending another request');
  }
  lastChatTime = now;
}

function friendlyStatus(status: number): string {
  if (status === 401 || status === 403) return 'AI request was not authorised. Please reload to sign in again.';
  if (status === 429) return 'The AI service is busy. Please try again in a moment.';
  return `AI request failed: ${status}`;
}

function extractContent(data: unknown): string {
  if (!isRecord(data)) return '';
  const message = (data as ChatResponse).message;
  return typeof message?.content === 'string' ? message.content : '';
}

/**
 * Send a full message array (multi-turn) and return the assistant reply.
 */
export async function chatMessages(messages: ChatMessage[]): Promise<string> {
  throttle();
  const config = getAIConfig();
  if (!isEndpointAllowed(config.endpoint)) throw new Error('AI endpoint not allowed');

  const res = await apiFetch(`${config.endpoint}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages, stream: false }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(friendlyStatus(res.status));
  return extractContent(await res.json());
}

/**
 * Single-turn chat with optional streaming.
 */
export async function chat(
  systemPrompt: string,
  userMessage: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];
  if (!onChunk) return chatMessages(messages);

  throttle();
  const config = getAIConfig();
  if (!isEndpointAllowed(config.endpoint)) throw new Error('AI endpoint not allowed');

  // Local Ollama streams NDJSON; the Midway-protected Bedrock route answers
  // with a single JSON line. Both are handled by the line reader below.
  const res = await apiFetch(`${config.endpoint}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages, stream: true }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(friendlyStatus(res.status));

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  let full = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const text = extractContent(JSON.parse(line));
        if (text) { full += text; onChunk(full); }
      } catch { /* skip malformed lines */ }
    }
  }
  return full;
}
