// In-memory stand-in for @aws-sdk/client-bedrock-runtime used by local-server.mjs.
// Echoes a deterministic reply so the AI UI can be exercised without AWS credentials.
// Set LOCAL_BEDROCK=real to bypass the fake and call Bedrock with local credentials.
export class ConverseCommand {
  constructor(input) { this.input = input; }
}

export class BedrockRuntimeClient {
  async send(command) {
    const { modelId, messages = [] } = command.input;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const text = lastUser?.content?.map((c) => c.text || '').join('') || '';
    const reply = `[local fake ${modelId}] ${text.slice(0, 200)}`;
    return {
      output: { message: { role: 'assistant', content: [{ text: reply }] } },
      stopReason: 'end_turn',
      usage: { inputTokens: text.length, outputTokens: reply.length },
    };
  }
}
