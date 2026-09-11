/**
 * POST /ai/chat — Bedrock chat behind the Midway authorizer.
 *
 * Speaks the same wire format as Ollama's /api/chat (request:
 * { model, messages, stream }, response: { message: { role, content } }) so
 * the frontend client works unchanged against local Ollama, the Vite proxy
 * and this function. Streaming is not supported through API Gateway HTTP API;
 * `stream: true` is accepted and answered with a single JSON line, which the
 * client's line-based reader handles.
 *
 * Guardrails:
 * - caller must be authenticated (alias from authorizer context)
 * - model must be on the allowlist (ALLOWED_MODELS env, comma-separated); an
 *   unknown model falls back to DEFAULT_MODEL rather than failing
 * - message count / size are capped before anything reaches Bedrock
 * - errors are generic; details go to structured logs with the caller alias
 */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { respond, error, serverError, callerAlias, parseJsonBody } from '../lib/http.mjs';

const bedrock = new BedrockRuntimeClient();

export const LIMITS = Object.freeze({
  maxMessages: 40,
  maxMessageChars: 24_000,
  maxTotalChars: 60_000,
  maxOutputTokens: 1_500,
});

function allowedModels() {
  return (process.env.ALLOWED_MODELS || process.env.DEFAULT_MODEL || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

export function resolveModel(requested) {
  const allowed = allowedModels();
  const fallback = process.env.DEFAULT_MODEL || allowed[0];
  if (typeof requested === 'string' && allowed.includes(requested)) return requested;
  return fallback;
}

/**
 * Validate and split Ollama-style messages into Bedrock Converse input.
 * Returns { system, messages } or { response } with a 400.
 */
export function toConverseInput(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return { response: error(400, 'messages must be a non-empty array') };
  if (messages.length > LIMITS.maxMessages) return { response: error(400, `Too many messages (max ${LIMITS.maxMessages})`) };

  const system = [];
  const turns = [];
  let total = 0;

  for (const m of messages) {
    if (!m || typeof m !== 'object' || typeof m.content !== 'string') return { response: error(400, 'Each message needs a string content') };
    if (m.content.length > LIMITS.maxMessageChars) return { response: error(400, `Message too long (max ${LIMITS.maxMessageChars} chars)`) };
    total += m.content.length;
    if (total > LIMITS.maxTotalChars) return { response: error(400, `Conversation too long (max ${LIMITS.maxTotalChars} chars)`) };

    if (m.role === 'system') {
      system.push({ text: m.content });
    } else if (m.role === 'user' || m.role === 'assistant') {
      const last = turns[turns.length - 1];
      // Converse requires alternating roles; merge consecutive same-role turns.
      if (last && last.role === m.role) last.content.push({ text: m.content });
      else turns.push({ role: m.role, content: [{ text: m.content }] });
    } else {
      return { response: error(400, 'Unsupported message role') };
    }
  }

  if (turns.length === 0 || turns[0].role !== 'user') return { response: error(400, 'Conversation must start with a user message') };
  if (turns[turns.length - 1].role !== 'user') return { response: error(400, 'Conversation must end with a user message') };

  return { system, messages: turns };
}

function extractText(output) {
  const blocks = output?.output?.message?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks.map((b) => (typeof b?.text === 'string' ? b.text : '')).join('');
}

export const handler = async (event) => {
  const alias = callerAlias(event);
  try {
    if (!alias) return error(401, 'Unauthorized');

    const { body, response } = parseJsonBody(event);
    if (response) return response;

    const converse = toConverseInput(body?.messages);
    if (converse.response) return converse.response;

    const modelId = resolveModel(body?.model);
    if (!modelId) return serverError(new Error('No model configured'), { handler: 'ai/chat', alias });

    const started = Date.now();
    const out = await bedrock.send(new ConverseCommand({
      modelId,
      system: converse.system.length ? converse.system : undefined,
      messages: converse.messages,
      inferenceConfig: { maxTokens: LIMITS.maxOutputTokens, temperature: 0.3 },
    }));

    console.log(JSON.stringify({
      level: 'info', handler: 'ai/chat', alias, modelId,
      inputTokens: out?.usage?.inputTokens, outputTokens: out?.usage?.outputTokens,
      stopReason: out?.stopReason, latencyMs: Date.now() - started,
    }));

    return respond(200, {
      model: modelId,
      message: { role: 'assistant', content: extractText(out) },
      done: true,
    });
  } catch (e) {
    if (e?.name === 'ThrottlingException') return error(429, 'AI service is busy, please retry shortly');
    return serverError(e, { handler: 'ai/chat', alias });
  }
};
