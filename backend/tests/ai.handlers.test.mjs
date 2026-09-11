import { vi, describe, test, expect, beforeEach } from 'vitest';

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: class { send = sendMock; },
  ConverseCommand: class { constructor(input) { this.input = input; } },
}));

process.env.DEFAULT_MODEL = 'eu.anthropic.claude-haiku-4-5-20251001-v1:0';
process.env.ALLOWED_MODELS = 'eu.anthropic.claude-haiku-4-5-20251001-v1:0,eu.anthropic.claude-sonnet-4-5';

const { handler: chat, toConverseInput, resolveModel, LIMITS } = await import('../src/ai/chat.mjs');
const { handler: tags } = await import('../src/ai/tags.mjs');

function makeEvent(alias, body) {
  return {
    requestContext: { authorizer: { lambda: alias ? { alias } : {} } },
    headers: {},
    body: body === undefined ? null : (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

const okReply = (text = 'hello') => ({
  output: { message: { role: 'assistant', content: [{ text }] } },
  stopReason: 'end_turn',
  usage: { inputTokens: 10, outputTokens: 5 },
});

const userMsg = (content = 'Improve my STAR') => ({ role: 'user', content });

beforeEach(() => sendMock.mockReset());

describe('resolveModel', () => {
  test('accepts an allowlisted model', () => {
    expect(resolveModel('eu.anthropic.claude-sonnet-4-5')).toBe('eu.anthropic.claude-sonnet-4-5');
  });
  test('falls back to the default for unknown or missing models', () => {
    expect(resolveModel('llama3')).toBe(process.env.DEFAULT_MODEL);
    expect(resolveModel(undefined)).toBe(process.env.DEFAULT_MODEL);
  });
});

describe('toConverseInput', () => {
  test('splits system messages and merges consecutive same-role turns', () => {
    const r = toConverseInput([
      { role: 'system', content: 'S1' },
      { role: 'system', content: 'S2' },
      userMsg('a'),
      userMsg('b'),
      { role: 'assistant', content: 'c' },
      userMsg('d'),
    ]);
    expect(r.response).toBeUndefined();
    expect(r.system).toEqual([{ text: 'S1' }, { text: 'S2' }]);
    expect(r.messages).toEqual([
      { role: 'user', content: [{ text: 'a' }, { text: 'b' }] },
      { role: 'assistant', content: [{ text: 'c' }] },
      { role: 'user', content: [{ text: 'd' }] },
    ]);
  });
  test('rejects empty, oversized and malformed input', () => {
    expect(toConverseInput([]).response.statusCode).toBe(400);
    expect(toConverseInput('nope').response.statusCode).toBe(400);
    expect(toConverseInput([{ role: 'user', content: 42 }]).response.statusCode).toBe(400);
    expect(toConverseInput([{ role: 'tool', content: 'x' }]).response.statusCode).toBe(400);
    expect(toConverseInput([userMsg('x'.repeat(LIMITS.maxMessageChars + 1))]).response.statusCode).toBe(400);
    const many = Array.from({ length: LIMITS.maxMessages + 1 }, () => userMsg('x'));
    expect(toConverseInput(many).response.statusCode).toBe(400);
  });
  test('requires the conversation to start and end with the user', () => {
    expect(toConverseInput([{ role: 'assistant', content: 'hi' }]).response.statusCode).toBe(400);
    expect(toConverseInput([userMsg(), { role: 'assistant', content: 'hi' }]).response.statusCode).toBe(400);
  });
});

describe('POST /ai/chat', () => {
  test('returns 401 without an alias and never calls Bedrock', async () => {
    const r = await chat(makeEvent(null, { messages: [userMsg()] }));
    expect(r.statusCode).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('returns 400 on invalid JSON', async () => {
    const r = await chat(makeEvent('alice', '{not json'));
    expect(r.statusCode).toBe(400);
  });

  test('calls Bedrock Converse with the resolved model and returns an Ollama-shaped reply', async () => {
    sendMock.mockResolvedValueOnce(okReply('Better STAR'));
    const r = await chat(makeEvent('alice', {
      model: 'llama3',
      stream: true,
      messages: [{ role: 'system', content: 'coach' }, userMsg('draft')],
    }));
    expect(r.statusCode).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.message).toEqual({ role: 'assistant', content: 'Better STAR' });
    expect(body.model).toBe(process.env.DEFAULT_MODEL);

    const cmd = sendMock.mock.calls[0][0];
    expect(cmd.input.modelId).toBe(process.env.DEFAULT_MODEL);
    expect(cmd.input.system).toEqual([{ text: 'coach' }]);
    expect(cmd.input.messages).toEqual([{ role: 'user', content: [{ text: 'draft' }] }]);
    expect(cmd.input.inferenceConfig.maxTokens).toBe(LIMITS.maxOutputTokens);
  });

  test('omits the system field when no system message is present', async () => {
    sendMock.mockResolvedValueOnce(okReply());
    await chat(makeEvent('alice', { messages: [userMsg()] }));
    expect(sendMock.mock.calls[0][0].input.system).toBeUndefined();
  });

  test('maps Bedrock throttling to 429', async () => {
    const err = new Error('rate exceeded'); err.name = 'ThrottlingException';
    sendMock.mockRejectedValueOnce(err);
    const r = await chat(makeEvent('alice', { messages: [userMsg()] }));
    expect(r.statusCode).toBe(429);
  });

  test('does not leak Bedrock error details', async () => {
    sendMock.mockRejectedValueOnce(new Error('AccessDeniedException: arn:aws:bedrock:eu-west-1:123:inference-profile/x'));
    const r = await chat(makeEvent('alice', { messages: [userMsg()] }));
    expect(r.statusCode).toBe(500);
    expect(r.body).not.toContain('AccessDenied');
    expect(r.body).not.toContain('inference-profile');
  });
});

describe('GET /ai/tags', () => {
  test('requires auth', async () => {
    expect((await tags(makeEvent(null))).statusCode).toBe(401);
  });
  test('lists the allowlisted models in Ollama format', async () => {
    const r = await tags(makeEvent('alice'));
    expect(JSON.parse(r.body)).toEqual({
      models: [
        { name: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0' },
        { name: 'eu.anthropic.claude-sonnet-4-5' },
      ],
    });
  });
});
