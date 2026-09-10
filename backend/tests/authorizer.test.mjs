import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock aws-jwt-verify before importing the handler
const { verifyMock, createMock } = vi.hoisted(() => {
  const verifyMock = vi.fn();
  const createMock = vi.fn(() => ({ verify: verifyMock }));
  return { verifyMock, createMock };
});

vi.mock('aws-jwt-verify', () => ({
  JwtRsaVerifier: { create: createMock },
}));

vi.mock('aws-jwt-verify/jwk', () => ({
  SimpleJwksCache: class {
    addJwks() {}
    async getJwks() { return { keys: [] }; }
  },
}));

const { handler, stageWildcardArn } = await import('../src/authorizer.mjs');

function makeEvent(authHeader) {
  return {
    routeArn: 'arn:aws:execute-api:eu-west-1:123:api/prod/GET/userdata',
    headers: { authorization: authHeader || '' },
  };
}

describe('Midway JWT Authorizer', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  test('valid token → Allow with alias in context', async () => {
    verifyMock.mockResolvedValueOnce({ sub: 'testuser', iat: 1700000000 });
    const result = await handler(makeEvent('Bearer eyJ.eyJ.sig'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
    expect(result.principalId).toBe('testuser');
    expect(result.context.alias).toBe('testuser');
    expect(result.context.tokenIat).toBe('1700000000');
  });

  test('missing Authorization header → Deny', async () => {
    const result = await handler(makeEvent(''));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(result.principalId).toBe('anonymous');
    expect(verifyMock).not.toHaveBeenCalled();
  });

  test('wrong scheme (Basic) → Deny', async () => {
    const result = await handler(makeEvent('Basic dXNlcjpwYXNz'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(verifyMock).not.toHaveBeenCalled();
  });

  test('malformed JWT (not 3 parts) → Deny', async () => {
    const result = await handler(makeEvent('Bearer not-a-jwt'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
    expect(verifyMock).not.toHaveBeenCalled();
  });

  test('wrong audience → Deny', async () => {
    verifyMock.mockRejectedValueOnce(new Error('JwtInvalidClaimError: audience'));
    const result = await handler(makeEvent('Bearer eyJ.eyJ.sig'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('expired token → Deny', async () => {
    verifyMock.mockRejectedValueOnce(new Error('JwtExpiredError: token expired'));
    const result = await handler(makeEvent('Bearer eyJ.eyJ.sig'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('wrong issuer → Deny', async () => {
    verifyMock.mockRejectedValueOnce(new Error('JwtInvalidIssuerError'));
    const result = await handler(makeEvent('Bearer eyJ.eyJ.sig'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('alg=none rejected (customJwtCheck failure) → Deny', async () => {
    verifyMock.mockRejectedValueOnce(new Error('Forbidden alg: none'));
    const result = await handler(makeEvent('Bearer eyJ.eyJ.sig'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('token with no sub claim → Deny', async () => {
    verifyMock.mockResolvedValueOnce({ iss: 'https://midway-auth.amazon.com', iat: 123 });
    const result = await handler(makeEvent('Bearer eyJ.eyJ.sig'));
    expect(result.policyDocument.Statement[0].Effect).toBe('Deny');
  });

  test('verifier is constructed with correct config', () => {
    expect(createMock).toHaveBeenCalledTimes(1);
    const [config] = createMock.mock.calls[0];
    expect(config.issuer).toBe('https://midway-auth.amazon.com');
    expect(config.jwksUri).toBe('https://midway-auth.amazon.com/jwks.json');
    expect(config.audience).toContain('promo-track.harmony.a2z.com');
    expect(config.audience).toContain('promo-track.beta.harmony.a2z.com');
  });

  test('policy resource covers the whole stage so cached policies work across routes', async () => {
    verifyMock.mockResolvedValueOnce({ sub: 'u', iat: 1 });
    const result = await handler({ routeArn: 'arn:aws:execute-api:eu-west-1:123:abc/prod/GET/userdata/u', headers: { authorization: 'Bearer eyJ.eyJ.sig' } });
    expect(result.policyDocument.Statement[0].Resource).toBe('arn:aws:execute-api:eu-west-1:123:abc/prod/*');
    expect(stageWildcardArn('*')).toBe('*');
    expect(stageWildcardArn(undefined)).toBe('*');
  });
});
