const FAKE_DOC = new URL('./fake-dynamo.mjs', import.meta.url).href;
const FAKE_CLIENT = new URL('./fake-dynamo-client.mjs', import.meta.url).href;
const FAKE_BEDROCK = new URL('./fake-bedrock.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@aws-sdk/lib-dynamodb') return { url: FAKE_DOC, shortCircuit: true };
  if (specifier === '@aws-sdk/client-dynamodb') return { url: FAKE_CLIENT, shortCircuit: true };
  if (specifier === '@aws-sdk/client-bedrock-runtime' && process.env.LOCAL_BEDROCK !== 'real') {
    return { url: FAKE_BEDROCK, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
